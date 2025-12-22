import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permission-check";
import { Role } from "@prisma/client";
import { z } from "zod";

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
                { error: "Datos inválidos", details: validation.error.issues },
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

        if (date) {
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
            formattedRate: `1 ${from} = ${rate.toFixed(4)} ${to}`,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("[Convert POST] Error:", error);
        return NextResponse.json({ error: "Error al convertir" }, { status: 500 });
    }
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
