"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/currency";

interface Currency {
    id: string;
    code: string;
    name: string;
    symbol: string;
    decimals: number;
}

interface ConversionResult {
    amount: number;
    from: string;
    to: string;
    rate: number;
    converted: number;
    formattedRate: string;
}

export function CurrencyConverter() {
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [loading, setLoading] = useState(true);
    const [converting, setConverting] = useState(false);
    const [amount, setAmount] = useState<number>(1000);
    const [fromCurrency, setFromCurrency] = useState<string>("CLP");
    const [toCurrency, setToCurrency] = useState<string>("USD");
    const [result, setResult] = useState<ConversionResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchCurrencies() {
            try {
                const res = await fetch("/api/finance/currencies?active=true");
                const data = await res.json();
                setCurrencies(data.data || []);
            } catch (err) {
                console.error("Error fetching currencies:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchCurrencies();
    }, []);

    const convert = useCallback(async () => {
        if (!amount || !fromCurrency || !toCurrency) return;

        setConverting(true);
        setError(null);

        try {
            const res = await fetch("/api/finance/exchange-rates/convert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount,
                    from: fromCurrency,
                    to: toCurrency,
                }),
            });

            if (!res.ok) throw new Error("Error en la conversión");

            const data = await res.json();
            setResult(data);
        } catch (err) {
            setError((err as Error).message);
            setResult(null);
        } finally {
            setConverting(false);
        }
    }, [amount, fromCurrency, toCurrency]);

    // Auto-convert when values change
    useEffect(() => {
        const timer = setTimeout(() => {
            if (amount && fromCurrency && toCurrency) {
                convert();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [amount, fromCurrency, toCurrency, convert]);

    const swapCurrencies = () => {
        setFromCurrency(toCurrency);
        setToCurrency(fromCurrency);
    };

    const fromCurrencyObj = currencies.find((c) => c.code === fromCurrency);
    const toCurrencyObj = currencies.find((c) => c.code === toCurrency);

    if (loading) {
        return (
            <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-800 rounded w-1/3" />
                    <div className="h-14 bg-gray-800 rounded" />
                    <div className="h-14 bg-gray-800 rounded" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Convertidor de Moneda</h3>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <span>Actualizado cada 4h</span>
                </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Cantidad</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                        {fromCurrencyObj?.symbol || "$"}
                    </span>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                        className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-700/50 rounded-xl
                                 text-white text-xl font-semibold placeholder-gray-500 focus:outline-none
                                 focus:ring-2 focus:ring-blue-500/50"
                        min="0"
                        step="0.01"
                    />
                </div>
            </div>

            {/* Currency Selection */}
            <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-end">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">De</label>
                    <select
                        value={fromCurrency}
                        onChange={(e) => setFromCurrency(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl
                                 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
                    >
                        {currencies.map((c) => (
                            <option key={c.code} value={c.code}>
                                {c.code} - {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={swapCurrencies}
                    className="p-3 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30
                             transition-colors mb-0.5"
                    title="Intercambiar monedas"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                        />
                    </svg>
                </button>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">A</label>
                    <select
                        value={toCurrency}
                        onChange={(e) => setToCurrency(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl
                                 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
                    >
                        {currencies.map((c) => (
                            <option key={c.code} value={c.code}>
                                {c.code} - {c.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Result */}
            {converting ? (
                <div className="flex items-center justify-center py-6">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : result ? (
                <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-5 space-y-3">
                    <div className="flex items-baseline justify-between">
                        <span className="text-gray-400">
                            {fromCurrencyObj?.symbol}
                            {formatCurrency(result.amount).replace("$", "")} {result.from}
                        </span>
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </div>
                    <div className="text-3xl font-bold text-white">
                        {toCurrencyObj?.symbol}
                        {result.converted.toLocaleString("es-CL", {
                            minimumFractionDigits: toCurrencyObj?.decimals || 2,
                            maximumFractionDigits: toCurrencyObj?.decimals || 2,
                        })}{" "}
                        <span className="text-xl text-gray-400">{result.to}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                        Tasa: {result.formattedRate}
                    </div>
                </div>
            ) : error ? (
                <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                    {error}
                </div>
            ) : null}

            {/* Popular Conversions */}
            <div className="pt-4 border-t border-gray-800/50">
                <p className="text-sm text-gray-400 mb-3">Conversiones populares</p>
                <div className="flex flex-wrap gap-2">
                    {[
                        { from: "CLP", to: "USD" },
                        { from: "CLP", to: "EUR" },
                        { from: "USD", to: "CLP" },
                        { from: "EUR", to: "CLP" },
                        { from: "USD", to: "EUR" },
                    ].map(({ from, to }) => (
                        <button
                            key={`${from}-${to}`}
                            onClick={() => {
                                setFromCurrency(from);
                                setToCurrency(to);
                            }}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors
                                      ${fromCurrency === from && toCurrency === to
                                          ? "bg-blue-500/30 text-blue-400"
                                          : "bg-gray-800/50 text-gray-400 hover:text-white"
                                      }`}
                        >
                            {from} → {to}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
