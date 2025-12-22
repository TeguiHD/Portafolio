import { useState, useEffect, useCallback } from "react";

interface Currency {
    id: string;
    code: string;
    name: string;
    symbol: string;
    decimals: number;
}

interface ConvertedAmount {
    original: number;
    converted: number;
    rate: number;
    fromCurrency: string;
    toCurrency: string;
}

interface UseCurrencyReturn {
    currencies: Currency[];
    loading: boolean;
    primaryCurrency: string;
    convert: (amount: number, from: string, to: string) => Promise<ConvertedAmount | null>;
    formatWithCurrency: (amount: number, currencyCode: string) => string;
    getCurrency: (code: string) => Currency | undefined;
}

export function useCurrency(): UseCurrencyReturn {
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [primaryCurrency, setPrimaryCurrency] = useState<string>("CLP");
    const [loading, setLoading] = useState(true);
    const [rateCache, setRateCache] = useState<Map<string, { rate: number; timestamp: number }>>(new Map());

    useEffect(() => {
        async function fetchCurrencies() {
            try {
                const res = await fetch("/api/finance/currencies");
                const data = await res.json();
                setCurrencies(data.data || []);
                if (data.primaryCurrency) {
                    setPrimaryCurrency(data.primaryCurrency);
                }
            } catch (error) {
                console.error("Error fetching currencies:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchCurrencies();
    }, []);

    const convert = useCallback(
        async (amount: number, from: string, to: string): Promise<ConvertedAmount | null> => {
            if (from === to) {
                return {
                    original: amount,
                    converted: amount,
                    rate: 1,
                    fromCurrency: from,
                    toCurrency: to,
                };
            }

            const cacheKey = `${from}-${to}`;
            const cached = rateCache.get(cacheKey);
            const cacheAge = cached ? Date.now() - cached.timestamp : Infinity;
            const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

            if (cached && cacheAge < CACHE_TTL) {
                return {
                    original: amount,
                    converted: amount * cached.rate,
                    rate: cached.rate,
                    fromCurrency: from,
                    toCurrency: to,
                };
            }

            try {
                const res = await fetch("/api/finance/exchange-rates/convert", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ amount, from, to }),
                });

                if (!res.ok) return null;

                const data = await res.json();

                // Update cache
                setRateCache((prev) => {
                    const newCache = new Map(prev);
                    newCache.set(cacheKey, { rate: data.rate, timestamp: Date.now() });
                    return newCache;
                });

                return {
                    original: amount,
                    converted: data.converted,
                    rate: data.rate,
                    fromCurrency: from,
                    toCurrency: to,
                };
            } catch (error) {
                console.error("Error converting currency:", error);
                return null;
            }
        },
        [rateCache]
    );

    const getCurrency = useCallback(
        (code: string): Currency | undefined => {
            return currencies.find((c) => c.code === code);
        },
        [currencies]
    );

    const formatWithCurrency = useCallback(
        (amount: number, currencyCode: string): string => {
            const currency = getCurrency(currencyCode);
            const symbol = currency?.symbol || "$";
            const decimals = currency?.decimals ?? 2;

            const formattedAmount = amount.toLocaleString("es-CL", {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
            });

            return `${symbol}${formattedAmount}`;
        },
        [getCurrency]
    );

    return {
        currencies,
        loading,
        primaryCurrency,
        convert,
        formatWithCurrency,
        getCurrency,
    };
}
