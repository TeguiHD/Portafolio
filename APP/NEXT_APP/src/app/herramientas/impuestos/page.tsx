"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useToolTracking } from "@/hooks/useDebounce";
import { useToolAccess } from "@/hooks/useToolAccess";
import { sanitizeInput } from "@/lib/security";

// Tax rate presets by country
const TAX_PRESETS = [
    { code: "CL", name: "Chile", rate: 19 },
    { code: "AR", name: "Argentina", rate: 21 },
    { code: "MX", name: "México", rate: 16 },
    { code: "ES", name: "España", rate: 21 },
    { code: "US", name: "USA (avg)", rate: 8 },
    { code: "CUSTOM", name: "Personalizado", rate: 0 },
] as const;

type CalculationMode = "add" | "remove";

// Security: Validate and sanitize numeric input
const validateAmount = (value: string): number | null => {
    // Remove formatting characters except digits, dots, and commas
    const cleaned = value.replace(/[^0-9.,-]/g, "").replace(",", ".");
    const num = parseFloat(cleaned);

    if (isNaN(num) || !isFinite(num) || num < 0 || num > 10_000_000_000) {
        return null;
    }
    return num;
};

// Security: Validate tax rate
const validateRate = (rate: number): number => {
    return Math.min(Math.max(rate, 0), 100);
};

// Format currency for display
const formatCurrency = (amount: number, decimals = 2): string => {
    return amount.toLocaleString("es-CL", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
};

import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";

export default function TaxCalculatorPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("impuestos");
    const { trackImmediate } = useToolTracking("impuestos", { trackViewOnMount: true, debounceMs: 2000 });

    const [amount, setAmount] = useState("");
    const [taxRate, setTaxRate] = useState(19);
    const [customRate, setCustomRate] = useState("19");
    const [selectedPreset, setSelectedPreset] = useState("CL");
    const [mode, setMode] = useState<CalculationMode>("add");
    const [copied, setCopied] = useState<string | null>(null);
    const [isCopying, setIsCopying] = useState(false);
    const lastTrackRef = useRef<number>(0);

    // Calculate results
    const results = useMemo(() => {
        const numAmount = validateAmount(amount);
        if (numAmount === null || numAmount === 0) {
            return null;
        }

        const safeRate = validateRate(taxRate);
        const taxMultiplier = safeRate / 100;

        if (mode === "add") {
            // Net to Gross: amount * (1 + rate)
            const tax = Math.round(numAmount * taxMultiplier * 100) / 100;
            const gross = Math.round((numAmount + tax) * 100) / 100;
            return {
                net: numAmount,
                tax,
                gross,
                effectiveRate: safeRate,
            };
        } else {
            // Gross to Net: amount / (1 + rate)
            const net = Math.round((numAmount / (1 + taxMultiplier)) * 100) / 100;
            const tax = Math.round((numAmount - net) * 100) / 100;
            return {
                net,
                tax,
                gross: numAmount,
                effectiveRate: safeRate,
            };
        }
    }, [amount, taxRate, mode]);

    // Handle preset selection
    const handlePresetChange = useCallback((code: string) => {
        setSelectedPreset(code);
        const preset = TAX_PRESETS.find((p) => p.code === code);
        if (preset && code !== "CUSTOM") {
            setTaxRate(preset.rate);
            setCustomRate(preset.rate.toString());
        }
    }, []);

    // Handle custom rate change
    const handleCustomRateChange = useCallback((value: string) => {
        setCustomRate(value);
        const num = parseFloat(value);
        if (!isNaN(num) && isFinite(num)) {
            setTaxRate(validateRate(num));
        }
    }, []);

    // Copy to clipboard with throttling
    const copyToClipboard = useCallback(async (value: string, label: string) => {
        if (isCopying) return;

        // Anti-spam cooldown
        setIsCopying(true);
        setTimeout(() => setIsCopying(false), 300);

        try {
            await navigator.clipboard.writeText(value);
            setCopied(label);

            // Throttle tracking: max 1 request per 2 seconds
            const now = Date.now();
            if (now - lastTrackRef.current > 2000) {
                lastTrackRef.current = now;
                trackImmediate("use", { action: "copy", label });
            }

            setTimeout(() => setCopied(null), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    }, [isCopying, trackImmediate]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Calculadora de Impuestos"} />;
    }

    const inputClass = "w-full px-4 py-3 rounded-xl bg-[#0F1724] border border-white/10 text-white text-lg focus:outline-none focus:border-[#FF8A00]/50 placeholder-neutral-500";

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-12 sm:pt-28 sm:pb-16">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30 flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Calculadora de IVA</h1>
                            <p className="text-sm text-neutral-400">Calcula impuestos: agrega o quita IVA de cualquier monto</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Input */}
                    <div className="space-y-4">
                        {/* Mode Toggle */}
                        <div className="p-1 rounded-xl bg-white/5 border border-white/10 flex">
                            <button
                                onClick={() => setMode("add")}
                                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === "add"
                                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                    : "text-neutral-400 hover:text-white"
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Agregar IVA
                            </button>
                            <button
                                onClick={() => setMode("remove")}
                                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === "remove"
                                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                    : "text-neutral-400 hover:text-white"
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                                Quitar IVA
                            </button>
                        </div>

                        {/* Amount Input */}
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <label className="text-sm text-neutral-400 mb-2 block">
                                {mode === "add" ? "Monto Neto (sin IVA)" : "Monto Bruto (con IVA)"}
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-lg">$</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={amount}
                                    onChange={(e) => setAmount(sanitizeInput(e.target.value))}
                                    placeholder="0"
                                    className={`${inputClass} pl-8 text-2xl font-semibold`}
                                />
                            </div>
                        </div>

                        {/* Tax Rate Selection */}
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <label className="text-sm text-neutral-400 mb-3 block">Tasa de Impuesto</label>

                            {/* Preset Pills */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {TAX_PRESETS.map((preset) => (
                                    <button
                                        key={preset.code}
                                        onClick={() => handlePresetChange(preset.code)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedPreset === preset.code
                                            ? "bg-[#FF8A00]/20 border border-[#FF8A00] text-white"
                                            : "bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10"
                                            }`}
                                    >
                                        {preset.code !== "CUSTOM" ? `${preset.name} (${preset.rate}%)` : preset.name}
                                    </button>
                                ))}
                            </div>

                            {/* Custom Rate Input */}
                            {selectedPreset === "CUSTOM" && (
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        value={customRate}
                                        onChange={(e) => handleCustomRateChange(e.target.value)}
                                        className="w-24 px-3 py-2 rounded-xl bg-[#0F1724] border border-white/10 text-white text-center focus:outline-none focus:border-[#FF8A00]/50"
                                    />
                                    <span className="text-neutral-400">%</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Results */}
                    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-[#FF8A00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Resultado
                        </h2>

                        {results ? (
                            <div className="space-y-4">
                                {/* Net Amount */}
                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase tracking-wide">Neto</p>
                                        <p className="text-2xl font-bold text-white">$ {formatCurrency(results.net)}</p>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(results.net.toString(), "net")}
                                        className={`p-2 rounded-lg transition-all ${copied === "net" ? "bg-green-500/20 text-green-400" : "text-neutral-400 hover:text-white hover:bg-white/10"
                                            }`}
                                    >
                                        {copied === "net" ? (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>

                                {/* Tax Amount */}
                                <div className="flex items-center justify-between p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
                                    <div>
                                        <p className="text-xs text-orange-400/70 uppercase tracking-wide">IVA ({results.effectiveRate}%)</p>
                                        <p className="text-xl font-semibold text-orange-400">+ $ {formatCurrency(results.tax)}</p>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(results.tax.toString(), "tax")}
                                        className={`p-2 rounded-lg transition-all ${copied === "tax" ? "bg-green-500/20 text-green-400" : "text-neutral-400 hover:text-white hover:bg-white/10"
                                            }`}
                                    >
                                        {copied === "tax" ? (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>

                                {/* Gross Amount */}
                                <div className="flex items-center justify-between p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                                    <div>
                                        <p className="text-xs text-green-400/70 uppercase tracking-wide">Total Bruto</p>
                                        <p className="text-3xl font-bold text-green-400">$ {formatCurrency(results.gross)}</p>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(results.gross.toString(), "gross")}
                                        className={`p-2 rounded-lg transition-all ${copied === "gross" ? "bg-green-500/20 text-green-400" : "text-neutral-400 hover:text-white hover:bg-white/10"
                                            }`}
                                    >
                                        {copied === "gross" ? (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>

                                {/* Formula Display */}
                                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                                    <p className="text-xs text-neutral-500 text-center font-mono">
                                        {mode === "add"
                                            ? `${formatCurrency(results.net)} × ${results.effectiveRate}% = ${formatCurrency(results.tax)} → ${formatCurrency(results.gross)}`
                                            : `${formatCurrency(results.gross)} ÷ ${(1 + results.effectiveRate / 100).toFixed(2)} = ${formatCurrency(results.net)}`
                                        }
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <p className="text-neutral-400 text-sm">Ingresa un monto para calcular</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Cards */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                        <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Agregar IVA
                        </h3>
                        <p className="text-xs text-neutral-400">
                            Tienes el precio <strong>sin impuestos</strong> y quieres saber cuánto cobrará el cliente final.
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                        <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                            Quitar IVA
                        </h3>
                        <p className="text-xs text-neutral-400">
                            Tienes el precio <strong>con impuestos</strong> y quieres saber cuánto es el neto real.
                        </p>
                    </div>
                </div>

                {/* Back Link */}
                <div className="mt-8 text-center pb-8">
                    <Link
                        href="/herramientas"
                        className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver a herramientas
                    </Link>
                </div>
            </main>
        </div>
    );
}
