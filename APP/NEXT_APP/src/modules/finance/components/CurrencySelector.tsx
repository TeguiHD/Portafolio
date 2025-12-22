"use client";

import { useState, useEffect } from "react";

interface Currency {
    id: string;
    code: string;
    name: string;
    symbol: string;
    decimals: number;
}

interface CurrencySelectorProps {
    value: string;
    onChange: (currencyId: string, currency: Currency | null) => void;
    label?: string;
    disabled?: boolean;
    showSymbol?: boolean;
    className?: string;
}

export function CurrencySelector({
    value,
    onChange,
    label = "Moneda",
    disabled = false,
    showSymbol = true,
    className = "",
}: CurrencySelectorProps) {
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCurrencies() {
            try {
                const res = await fetch("/api/finance/currencies?active=true");
                const data = await res.json();
                setCurrencies(data.data || []);
            } catch (error) {
                console.error("Error fetching currencies:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchCurrencies();
    }, []);

    const selectedCurrency = currencies.find((c) => c.id === value);

    const handleChange = (currencyId: string) => {
        const currency = currencies.find((c) => c.id === currencyId) || null;
        onChange(currencyId, currency);
    };

    if (loading) {
        return (
            <div className={`space-y-2 ${className}`}>
                {label && <label className="block text-sm font-medium text-gray-300">{label}</label>}
                <div className="h-12 bg-gray-800/50 rounded-xl animate-pulse" />
            </div>
        );
    }

    return (
        <div className={`space-y-2 ${className}`}>
            {label && <label className="block text-sm font-medium text-gray-300">{label}</label>}
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => handleChange(e.target.value)}
                    disabled={disabled}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl
                             text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50
                             disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                >
                    <option value="">Seleccionar moneda</option>
                    {currencies.map((currency) => (
                        <option key={currency.id} value={currency.id}>
                            {showSymbol ? `${currency.symbol} ` : ""}
                            {currency.code} - {currency.name}
                        </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    {selectedCurrency ? (
                        <span className="text-lg font-semibold text-blue-400">{selectedCurrency.symbol}</span>
                    ) : (
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    )}
                </div>
            </div>
        </div>
    );
}
