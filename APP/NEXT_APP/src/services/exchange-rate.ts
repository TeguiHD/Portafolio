/**
 * Exchange Rate Service
 * 
 * Uses Frankfurter API (free, open source, no API key required)
 * Base currency: EUR (Frankfurter limitation)
 * 
 * Caching strategy:
 * 1. Primary: Redis (4 hour TTL)
 * 2. Fallback: PostgreSQL (ExchangeRateCache table)
 * 
 * @see https://www.frankfurter.app/docs/
 */

import { prisma } from '@/lib/prisma';
import { 
    getCached, 
    setCached, 
    CACHE_KEYS, 
    CACHE_TTL,
    isRedisAvailable 
} from '@/lib/redis';

const FRANKFURTER_API = 'https://api.frankfurter.app';

// Supported currencies (subset for performance)
export const SUPPORTED_CURRENCIES = [
    'CLP', 'USD', 'EUR', 'BRL', 'ARS', 'MXN', 'PEN', 'COP', 'GBP', 'JPY'
] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

interface FrankfurterResponse {
    amount: number;
    base: string;
    date: string;
    rates: Record<string, number>;
}

interface ExchangeRates {
    base: string;
    date: string;
    rates: Record<string, number>;
    fetchedAt: Date;
}

/**
 * Fetch latest exchange rates from Frankfurter API
 * Always returns EUR as base (API limitation)
 */
async function fetchFromFrankfurter(): Promise<ExchangeRates | null> {
    try {
        const currencies = SUPPORTED_CURRENCIES.filter(c => c !== 'EUR').join(',');
        const url = `${FRANKFURTER_API}/latest?to=${currencies}`;
        
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
            },
            // 10 second timeout
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            console.error(`[ExchangeRate] Frankfurter API error: ${response.status}`);
            return null;
        }

        const data: FrankfurterResponse = await response.json();
        
        return {
            base: data.base,
            date: data.date,
            rates: { EUR: 1, ...data.rates },
            fetchedAt: new Date(),
        };
    } catch (error) {
        console.error('[ExchangeRate] Failed to fetch from Frankfurter:', error);
        return null;
    }
}

/**
 * Save rates to PostgreSQL as fallback cache
 */
async function saveToDatabase(rates: ExchangeRates): Promise<void> {
    try {
        const operations = Object.entries(rates.rates).map(([currency, rate]) => 
            prisma.exchangeRateCache.upsert({
                where: {
                    baseCurrency_targetCurrency: {
                        baseCurrency: 'EUR',
                        targetCurrency: currency,
                    },
                },
                update: {
                    rate,
                    fetchedAt: rates.fetchedAt,
                },
                create: {
                    baseCurrency: 'EUR',
                    targetCurrency: currency,
                    rate,
                    fetchedAt: rates.fetchedAt,
                },
            })
        );

        await prisma.$transaction(operations);
        console.log(`[ExchangeRate] Saved ${operations.length} rates to database`);
    } catch (error) {
        console.error('[ExchangeRate] Failed to save to database:', error);
    }
}

/**
 * Load rates from PostgreSQL fallback
 */
async function loadFromDatabase(): Promise<ExchangeRates | null> {
    try {
        const cachedRates = await prisma.exchangeRateCache.findMany({
            where: {
                baseCurrency: 'EUR',
            },
            orderBy: {
                fetchedAt: 'desc',
            },
        });

        if (cachedRates.length === 0) return null;

        const rates: Record<string, number> = {};
        let latestDate: Date | null = null;

        for (const cached of cachedRates) {
            rates[cached.targetCurrency] = cached.rate;
            if (!latestDate || cached.fetchedAt > latestDate) {
                latestDate = cached.fetchedAt;
            }
        }

        return {
            base: 'EUR',
            date: latestDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
            rates,
            fetchedAt: latestDate || new Date(),
        };
    } catch (error) {
        console.error('[ExchangeRate] Failed to load from database:', error);
        return null;
    }
}

/**
 * Get exchange rates with caching strategy:
 * 1. Check Redis cache
 * 2. Fetch from Frankfurter API
 * 3. Fallback to PostgreSQL
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
    const cacheKey = `${CACHE_KEYS.EXCHANGE_RATE}:latest`;

    // 1. Try Redis cache
    if (await isRedisAvailable()) {
        const cached = await getCached<ExchangeRates>(cacheKey);
        if (cached) {
            console.log('[ExchangeRate] Served from Redis cache');
            return cached;
        }
    }

    // 2. Fetch from API
    const fresh = await fetchFromFrankfurter();
    if (fresh) {
        // Save to Redis
        if (await isRedisAvailable()) {
            await setCached(cacheKey, fresh, CACHE_TTL.EXCHANGE_RATE);
        }
        // Save to PostgreSQL as fallback
        await saveToDatabase(fresh);
        console.log('[ExchangeRate] Fetched fresh rates from Frankfurter');
        return fresh;
    }

    // 3. Fallback to PostgreSQL
    const fallback = await loadFromDatabase();
    if (fallback) {
        console.log('[ExchangeRate] Served from PostgreSQL fallback');
        // Try to cache in Redis for next request
        if (await isRedisAvailable()) {
            await setCached(cacheKey, fallback, CACHE_TTL.EXCHANGE_RATE);
        }
        return fallback;
    }

    // 4. Last resort: return default rates
    console.warn('[ExchangeRate] Using hardcoded default rates');
    return {
        base: 'EUR',
        date: new Date().toISOString().split('T')[0],
        rates: {
            EUR: 1,
            USD: 1.08,
            CLP: 1020,
            BRL: 5.90,
            ARS: 980,
            MXN: 18.50,
            PEN: 4.05,
            COP: 4300,
            GBP: 0.86,
            JPY: 162,
        },
        fetchedAt: new Date(),
    };
}

/**
 * Convert amount between currencies
 * All conversions go through EUR as intermediate
 * 
 * @param amount - Amount to convert
 * @param from - Source currency code
 * @param to - Target currency code
 * @returns Converted amount
 */
export async function convertCurrency(
    amount: number,
    from: SupportedCurrency,
    to: SupportedCurrency
): Promise<number> {
    if (from === to) return amount;

    const rates = await getExchangeRates();

    // Convert to EUR first, then to target currency
    // EUR rate is always 1
    const fromRate = rates.rates[from] || 1;
    const toRate = rates.rates[to] || 1;

    // amount in FROM -> EUR -> TO
    const amountInEur = amount / fromRate;
    const amountInTarget = amountInEur * toRate;

    return amountInTarget;
}

/**
 * Get exchange rate between two currencies
 */
export async function getExchangeRate(
    from: SupportedCurrency,
    to: SupportedCurrency
): Promise<number> {
    if (from === to) return 1;

    const rates = await getExchangeRates();

    const fromRate = rates.rates[from] || 1;
    const toRate = rates.rates[to] || 1;

    return toRate / fromRate;
}

/**
 * Format currency amount with proper symbol and decimals
 */
export function formatCurrency(
    amount: number,
    currencyCode: SupportedCurrency,
    locale: string = 'es-CL'
): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: currencyCode === 'CLP' || currencyCode === 'JPY' || currencyCode === 'COP' ? 0 : 2,
        maximumFractionDigits: currencyCode === 'CLP' || currencyCode === 'JPY' || currencyCode === 'COP' ? 0 : 2,
    }).format(amount);
}

/**
 * Get all rates relative to a specific base currency
 * Useful for displaying rates in user's preferred currency
 */
export async function getRatesForBase(baseCurrency: SupportedCurrency): Promise<Record<string, number>> {
    const rates = await getExchangeRates();
    const result: Record<string, number> = {};

    const baseRate = rates.rates[baseCurrency] || 1;

    for (const [currency, rate] of Object.entries(rates.rates)) {
        // Calculate rate relative to the requested base
        result[currency] = rate / baseRate;
    }

    return result;
}
