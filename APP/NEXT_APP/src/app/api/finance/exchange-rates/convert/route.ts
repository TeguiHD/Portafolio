import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permission-check";
import { Role } from '@/generated/prisma/client';
import { z } from "zod";
import { logger } from "@/lib/logger";
import { leerIndicadores } from "@/lib/chile/indicadores.server";
import { tasaConPesos, textoTasa } from "@/lib/finanzas/tasa-pesos";

const FRANKFURTER_API = "https://api.frankfurter.app";
const CACHE_TTL_HOURS = 4;

const convertSchema = z.object({
    amount: z.number().positive(),
    from: z.string().length(3).toUpperCase(),
    to: z.string().length(3).toUpperCase(),
    date: z.string().optional(), // For historical rates
});

// POST /api/finance/exchange-rates/convert - Convert amount between currencies
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canAccess = await hasPermission(session.user.id, session.user.role as Role, "finance.view");
        if (!canAccess) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const body = await request.json();
        const validation = convertSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Datos inválidos" },
                { status: 400 }
            );
        }

        const { amount, from, to, date } = validation.data;

        // Same currency - no conversion needed
        if (from === to) {
            return NextResponse.json({
                amount,
                from,
                to,
                rate: 1,
                converted: amount,
                timestamp: new Date().toISOString(),
            });
        }

        let rate: number;

        if (from === "CLP" || to === "CLP") {
            // Frankfurter no publica el peso chileno: dólar y euro del día de mindicador.cl, otras monedas vía el dólar.
            if (date) return NextResponse.json({ error: "Sin tasa histórica del peso chileno" }, { status: 400 });
            const ind = await indicadoresPesos();
            if (!ind) return NextResponse.json({ error: "No se pudo obtener el dólar del día: intenta de nuevo en un rato" }, { status: 502 });
            rate = (await tasaConPesos(from, to, ind, (m) => getCurrentRate("USD", m))) ?? 0;
        } else if (date) {
            // Historical rate - fetch directly from API
            rate = await getHistoricalRate(from, to, date);
        } else {
            // Current rate - use cache
            rate = await getCurrentRate(from, to);
        }

        if (!rate) {
            return NextResponse.json({ error: "No se pudo obtener la tasa de cambio" }, { status: 500 });
        }

        const converted = amount * rate;

        return NextResponse.json({
            amount,
            from,
            to,
            rate,
            converted,
            formattedRate: textoTasa(from, to, rate),
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        logger.error("[Convert POST] Error", error);
        return NextResponse.json({ error: "Error al convertir" }, { status: 500 });
    }
}

/**
 * Dólar y euro en pesos: los del día de mindicador.cl, que se guardan cada vez que cambian; si mindicador.cl no
 * responde, lo último guardado (el 24-11-2026 su HTTPS no respondía). Sin nada guardado, null. Se guardan con base CLP
 * (dólares y euros por un peso): las demás consultas de la tabla leen solo la base EUR de Frankfurter y no las ven.
 */
let guardado = "";
async function indicadoresPesos(): Promise<{ dolar: number; euro?: number } | null> {
    const ind = await leerIndicadores();
    if (ind) {
        const valores = { dolar: ind.dolar.valor, euro: ind.euro?.valor };
        const clave = `${valores.dolar}|${valores.euro ?? ""}`;
        if (clave !== guardado) {
            const filas: [string, number][] = [["USD", valores.dolar]];
            if (valores.euro) filas.push(["EUR", valores.euro]);
            await Promise.all(filas.map(([moneda, pesos]) => prisma.exchangeRateCache.upsert({
                where: { baseCurrency_targetCurrency: { baseCurrency: "CLP", targetCurrency: moneda } },
                update: { rate: 1 / pesos, fetchedAt: new Date() },
                create: { baseCurrency: "CLP", targetCurrency: moneda, rate: 1 / pesos },
            }))).then(() => { guardado = clave; }).catch((e) => logger.error("[Convert] No se guardó el dólar del día", e));
        }
        return valores;
    }
    const filas = await prisma.exchangeRateCache.findMany({ where: { baseCurrency: "CLP", targetCurrency: { in: ["USD", "EUR"] } } });
    const porPeso = (m: string) => filas.find((f) => f.targetCurrency === m)?.rate;
    const usd = porPeso("USD"), eur = porPeso("EUR");
    return usd ? { dolar: 1 / usd, ...(eur ? { euro: 1 / eur } : {}) } : null;
}

async function getCurrentRate(from: string, to: string): Promise<number> {
    const cacheExpiry = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000);

    // EUR is the base in Frankfurter
    if (from === "EUR") {
        // Direct lookup: EUR -> target
        const cached = await prisma.exchangeRateCache.findFirst({
            where: {
                baseCurrency: "EUR",
                targetCurrency: to,
                fetchedAt: { gte: cacheExpiry },
            },
        });

        if (cached) return cached.rate;

        // Fetch fresh
        return await fetchRate(from, to);
    }

    if (to === "EUR") {
        // Inverse: from -> EUR
        const cached = await prisma.exchangeRateCache.findFirst({
            where: {
                baseCurrency: "EUR",
                targetCurrency: from,
                fetchedAt: { gte: cacheExpiry },
            },
        });

        if (cached) return 1 / cached.rate;

        // Fetch fresh
        return await fetchRate(from, to);
    }

    // Cross rate: from -> EUR -> to
    const [fromToEur, eurToTarget] = await Promise.all([
        prisma.exchangeRateCache.findFirst({
            where: {
                baseCurrency: "EUR",
                targetCurrency: from,
                fetchedAt: { gte: cacheExpiry },
            },
        }),
        prisma.exchangeRateCache.findFirst({
            where: {
                baseCurrency: "EUR",
                targetCurrency: to,
                fetchedAt: { gte: cacheExpiry },
            },
        }),
    ]);

    if (fromToEur && eurToTarget) {
        return eurToTarget.rate / fromToEur.rate;
    }

    // Fetch fresh
    return await fetchRate(from, to);
}

async function fetchRate(from: string, to: string): Promise<number> {
    try {
        const response = await fetch(`${FRANKFURTER_API}/latest?from=${from}&to=${to}`);

        if (!response.ok) {
            throw new Error(`Frankfurter API error: ${response.status}`);
        }

        const data = await response.json();
        return data.rates[to];
    } catch (error) {
        console.error("[FetchRate] Error:", error);
        return 0;
    }
}

async function getHistoricalRate(from: string, to: string, date: string): Promise<number> {
    try {
        const response = await fetch(`${FRANKFURTER_API}/${date}?from=${from}&to=${to}`);

        if (!response.ok) {
            throw new Error(`Frankfurter API error: ${response.status}`);
        }

        const data = await response.json();
        return data.rates[to];
    } catch (error) {
        console.error("[GetHistoricalRate] Error:", error);
        return 0;
    }
}
