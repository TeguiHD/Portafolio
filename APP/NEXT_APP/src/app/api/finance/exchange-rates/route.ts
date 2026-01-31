import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permission-check";
import { Role } from "@prisma/client";

const FRANKFURTER_API = "https://api.frankfurter.app";
const CACHE_TTL_HOURS = 4;

interface ExchangeRates {
    [currency: string]: number;
}

// GET /api/finance/exchange-rates - Get exchange rates
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canAccess = await hasPermission(session.user.id, session.user.role as Role, "finance.view");
        if (!canAccess) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const baseCurrency = searchParams.get("base")?.toUpperCase() || "EUR";
        const targetCurrency = searchParams.get("target")?.toUpperCase();
        const amount = parseFloat(searchParams.get("amount") || "1");

        // Check cache first
        const cacheExpiry = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000);
        const cachedRates = await prisma.exchangeRateCache.findMany({
            where: {
                baseCurrency: "EUR", // Frankfurter always uses EUR as base
                fetchedAt: { gte: cacheExpiry },
            },
        });

        let rates: ExchangeRates = {};

        if (cachedRates.length > 0) {
            // Use cached rates
            cachedRates.forEach((r) => {
                rates[r.targetCurrency] = r.rate;
            });
        } else {
            // Fetch fresh rates from Frankfurter API
            rates = await fetchFreshRates();
        }

        // Add EUR with rate 1 (it's the base)
        rates["EUR"] = 1;

        // Convert if base is not EUR
        if (baseCurrency !== "EUR") {
            const baseRate = rates[baseCurrency];
            if (!baseRate) {
                return NextResponse.json({ error: `Moneda base ${baseCurrency} no disponible` }, { status: 400 });
            }

            // Convert all rates relative to new base
            const convertedRates: ExchangeRates = {};
            for (const [currency, rate] of Object.entries(rates)) {
                convertedRates[currency] = rate / baseRate;
            }
            rates = convertedRates;
        }

        // If specific target requested
        if (targetCurrency) {
            const targetRate = rates[targetCurrency];
            if (!targetRate) {
                return NextResponse.json({ error: `Moneda destino ${targetCurrency} no disponible` }, { status: 400 });
            }

            return NextResponse.json({
                base: baseCurrency,
                target: targetCurrency,
                rate: targetRate,
                amount: amount,
                converted: amount * targetRate,
                timestamp: new Date().toISOString(),
            });
        }

        // Return all rates
        return NextResponse.json({
            base: baseCurrency,
            rates,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("[Exchange Rates GET] Error:", error);
        return NextResponse.json({ error: "Error al obtener tasas de cambio" }, { status: 500 });
    }
}

// POST /api/finance/exchange-rates/refresh - Force refresh rates
export async function POST(_request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canManage = await hasPermission(session.user.id, session.user.role as Role, "finance.manage");
        if (!canManage) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const rates = await fetchFreshRates();

        return NextResponse.json({
            success: true,
            ratesUpdated: Object.keys(rates).length,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("[Exchange Rates POST] Error:", error);
        return NextResponse.json({ error: "Error al actualizar tasas" }, { status: 500 });
    }
}

async function fetchFreshRates(): Promise<ExchangeRates> {
    try {
        const response = await fetch(`${FRANKFURTER_API}/latest`, {
            next: { revalidate: CACHE_TTL_HOURS * 60 * 60 },
        });

        if (!response.ok) {
            throw new Error(`Frankfurter API error: ${response.status}`);
        }

        const data = await response.json();
        const rates = data.rates as ExchangeRates;

        // Update cache in database
        const upsertOperations = Object.entries(rates).map(([currency, rate]) =>
            prisma.exchangeRateCache.upsert({
                where: {
                    baseCurrency_targetCurrency: {
                        baseCurrency: "EUR",
                        targetCurrency: currency,
                    },
                },
                update: {
                    rate,
                    fetchedAt: new Date(),
                },
                create: {
                    baseCurrency: "EUR",
                    targetCurrency: currency,
                    rate,
                },
            })
        );

        await Promise.all(upsertOperations);

        return rates;
    } catch (error) {
        console.error("[FetchFreshRates] Error:", error);

        // Fall back to cached rates if API fails
        const fallbackRates = await prisma.exchangeRateCache.findMany({
            where: { baseCurrency: "EUR" },
        });

        const rates: ExchangeRates = {};
        fallbackRates.forEach((r) => {
            rates[r.targetCurrency] = r.rate;
        });

        return rates;
    }
}
