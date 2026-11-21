"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";
import { numeroCL } from "@/lib/tools/numeros";
import { useCopiar } from "@/lib/tools/copiar";

import { useState, useCallback, useMemo, useRef } from "react";
import { useToolTracking } from "@/hooks/useDebounce";
import { useToolAccess } from "@/hooks/useToolAccess";

// Tax rate presets by country
const TAX_PRESETS = [
    { code: "CL", name: "Chile", rate: 19 },
    { code: "AR", name: "Argentina", rate: 21 },
    { code: "MX", name: "México", rate: 16 },
    { code: "ES", name: "España", rate: 21 },
    { code: "US", name: "EE. UU.", rate: 8 },
    { code: "CUSTOM", name: "Personalizado", rate: 0 },
] as const;

type CalculationMode = "add" | "remove";

const MONTO_MAXIMO = 10_000_000_000;

// Security: Validate and sanitize numeric input
const validateAmount = (value: string): number | null => {
    // A la chilena: «1.190.000» es un millón ciento noventa mil (antes se leía 1,19).
    const num = numeroCL(value);
    if (num === null) return null;

    if (isNaN(num) || !isFinite(num) || num < 0 || num > MONTO_MAXIMO) {
        return null;
    }
    return num;
};

/** Por qué no se puede calcular lo escrito, o null si está bien (o vacío). */
const errorMonto = (value: string): string | null => {
    if (!value.trim()) return null;
    const num = numeroCL(value);
    if (num === null || !/\d/.test(value)) return "No es un monto. Escribe, por ejemplo, 1.190.000 o 19,5.";
    if (num < 0) return "El monto no puede ser negativo.";
    if (num > MONTO_MAXIMO) return "El monto máximo es 10.000.000.000.";
    return null;
};

/** Redondea al entero sin el ruido de coma flotante (1,005 × 100 = 100,49999… debe dar 101). */
const redondear = (n: number): number => Math.round(Number(n.toPrecision(15)));

const formatoTasa = (tasa: number): string => tasa.toLocaleString("es-CL", { maximumFractionDigits: 2 });

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

    // Abre con un monto de ejemplo y su cálculo a la vista (como las calculadoras grandes): se entiende sin tocar nada.
    const [amount, setAmount] = useState("10.000");
    const recienEnfocado = useRef(false);
    const [taxRate, setTaxRate] = useState(19);
    const [customRate, setCustomRate] = useState("19");
    const [selectedPreset, setSelectedPreset] = useState("CL");
    const [mode, setMode] = useState<CalculationMode>("add");
    const { copiado, fallo, copiar } = useCopiar(2000);
    const lastTrackRef = useRef<number>(0);

    // En pesos chilenos no se usan centavos: se muestra y se copia al peso. Otros países, con 2 decimales.
    const decimales = selectedPreset === "CL" ? 0 : 2;
    const fmt = (n: number) => formatCurrency(n, decimales);
    const nombreImpuesto = selectedPreset === "US" ? "Impuesto" : "IVA";
    const avisoMonto = errorMonto(amount);

    /**
     * Se calcula en la unidad que se muestra (pesos en Chile, centavos en el resto), como en una boleta:
     * agregar → impuesto = neto × tasa redondeado y total = neto + impuesto;
     * quitar → neto = total ÷ (1 + tasa) redondeado e impuesto = total − neto.
     * Así neto + impuesto da siempre el total que se ve (antes, con $47 salía neto $40 + IVA $8).
     */
    const results = useMemo(() => {
        const numAmount = validateAmount(amount);
        if (numAmount === null || numAmount === 0) {
            return null;
        }

        const safeRate = validateRate(taxRate);
        const unidad = 10 ** decimales;
        const monto = redondear(numAmount * unidad);

        if (mode === "add") {
            const tax = redondear((monto * safeRate) / 100);
            return {
                net: monto / unidad,
                tax: tax / unidad,
                gross: (monto + tax) / unidad,
                effectiveRate: safeRate,
            };
        } else {
            const net = redondear((monto * 100) / (100 + safeRate));
            return {
                net: net / unidad,
                tax: (monto - net) / unidad,
                gross: monto / unidad,
                effectiveRate: safeRate,
            };
        }
    }, [amount, taxRate, mode, decimales]);

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

    // Copia y registra el uso (como mucho una vez cada 2 s).
    const copyToClipboard = useCallback(async (value: string, label: string) => {
        if (!(await copiar(value, label))) return;
        const now = Date.now();
        if (now - lastTrackRef.current > 2000) {
            lastTrackRef.current = now;
            trackImmediate("use", { action: "copy", label });
        }
    }, [copiar, trackImmediate]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Calculadora de IVA"} />;
    }

    const inputClass = "w-full px-4 py-3 rounded-xl bg-[#0F1724] border border-white/10 text-white text-lg focus:outline-none focus:border-[color-mix(in_srgb,var(--acento)_50%,transparent)] placeholder-neutral-500";

    return (
        <div className="tool-page">
            <main className="tool-main pt-24 pb-12 sm:pt-28 sm:pb-16">
                {/* Header */}
                <ToolPageHeader slug="impuestos" />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Input */}
                    <div className="space-y-4">
                        {/* Mode Toggle */}
                        <div className="p-1 rounded-xl bg-white/5 border border-white/10 flex" role="group" aria-label="Operación">
                            <button
                                type="button"
                                aria-pressed={mode === "add"}
                                onClick={() => setMode("add")}
                                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === "add"
                                    ? "bg-[color-mix(in_srgb,var(--acento)_14%,transparent)] text-[var(--txt)] border border-[color-mix(in_srgb,var(--acento)_45%,transparent)]"
                                    : "text-neutral-400 hover:text-white"
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Agregar IVA
                            </button>
                            <button
                                type="button"
                                aria-pressed={mode === "remove"}
                                onClick={() => setMode("remove")}
                                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === "remove"
                                    ? "bg-[color-mix(in_srgb,var(--acento)_14%,transparent)] text-[var(--txt)] border border-[color-mix(in_srgb,var(--acento)_45%,transparent)]"
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
                            <label htmlFor="impuestos-monto" className="text-sm text-neutral-400 mb-2 block">
                                {mode === "add" ? `Monto neto (sin ${nombreImpuesto})` : `Monto bruto (con ${nombreImpuesto})`}
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-lg" aria-hidden="true">$</span>
                                <input
                                    id="impuestos-monto"
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value.slice(0, 32))}
                                    // Lo que se escribe reemplaza el ejemplo (10.000): al enfocar queda todo seleccionado.
                                    // El mouseup del mismo clic deshacía la selección; se ignora solo ese.
                                    onFocus={(e) => { e.currentTarget.select(); recienEnfocado.current = true; }}
                                    onMouseUp={(e) => { if (recienEnfocado.current) { e.preventDefault(); recienEnfocado.current = false; } }}
                                    placeholder="0"
                                    aria-invalid={!!avisoMonto}
                                    aria-describedby={avisoMonto ? "impuestos-monto-error" : undefined}
                                    className={`${inputClass} pl-8 text-2xl font-semibold`}
                                />
                            </div>
                            {avisoMonto && <p id="impuestos-monto-error" role="alert" className="mt-2 text-xs text-amber-300">{avisoMonto}</p>}
                        </div>

                        {/* Tax Rate Selection */}
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <p id="impuestos-tasa" className="text-sm text-neutral-400 mb-3">Tasa de impuesto</p>

                            {/* Preset Pills */}
                            <div className="flex flex-wrap gap-2 mb-4" role="group" aria-labelledby="impuestos-tasa">
                                {TAX_PRESETS.map((preset) => (
                                    <button
                                        key={preset.code}
                                        type="button"
                                        aria-pressed={selectedPreset === preset.code}
                                        aria-describedby={preset.code === "US" && selectedPreset === "US" ? "impuestos-nota-us" : undefined}
                                        onClick={() => handlePresetChange(preset.code)}
                                        className={`min-h-11 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedPreset === preset.code
                                            ? "bg-[color-mix(in_srgb,var(--acento)_14%,transparent)] border border-[color-mix(in_srgb,var(--acento)_55%,transparent)] text-white"
                                            : "bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10"
                                            }`}
                                    >
                                        {preset.code !== "CUSTOM" ? `${preset.name} (${preset.rate}%)` : preset.name}
                                    </button>
                                ))}
                            </div>
                            {/* La aclaración va a la vista al elegirla (en un botón de dos líneas desarmaba la fila). */}
                            {selectedPreset === "US" && <p id="impuestos-nota-us" className="mb-3 text-xs text-neutral-400">En EE. UU. es el impuesto a las ventas: varía por estado y ciudad; el 8 % es un promedio aproximado.</p>}

                            {/* Custom Rate Input */}
                            {selectedPreset === "CUSTOM" && (
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        value={customRate}
                                        aria-label="Tasa personalizada en porcentaje"
                                        onChange={(e) => handleCustomRateChange(e.target.value)}
                                        className="w-24 min-h-11 px-3 py-2 rounded-xl bg-[#0F1724] border border-white/10 text-white text-center focus:outline-none focus:border-[color-mix(in_srgb,var(--acento)_50%,transparent)]"
                                    />
                                    <span className="text-neutral-400" aria-hidden="true">%</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Results */}
                    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-[var(--acento)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Resultado
                        </h2>

                        {results ? (
                            <div className="space-y-4">
                                {([
                                    { clave: "net", rotulo: "Neto", valor: `$ ${fmt(results.net)}`, copia: fmt(results.net), caja: "bg-white/5 border border-white/10", rotuloClase: "text-neutral-500", valorClase: "text-2xl font-bold text-white" },
                                    { clave: "tax", rotulo: `${nombreImpuesto} (${formatoTasa(results.effectiveRate)}%)`, valor: `+ $ ${fmt(results.tax)}`, copia: fmt(results.tax), caja: "bg-white/5 border border-white/10", rotuloClase: "text-neutral-500", valorClase: "text-xl font-semibold text-white" },
                                    { clave: "gross", rotulo: "Total bruto", valor: `$ ${fmt(results.gross)}`, copia: fmt(results.gross), caja: "bg-[color-mix(in_srgb,var(--acento)_10%,transparent)] border border-[color-mix(in_srgb,var(--acento)_40%,transparent)]", rotuloClase: "text-[var(--mut)]", valorClase: "text-3xl font-bold text-[var(--txt)]" },
                                ] as const).map((fila) => (
                                    <div key={fila.clave} className={`flex items-center justify-between gap-2 p-4 rounded-xl ${fila.caja}`}>
                                        <div className="min-w-0">
                                            <p className={`text-xs ${fila.rotuloClase}`}>{fila.rotulo}</p>
                                            <p className={`${fila.valorClase} break-words`}>{fila.valor}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { void copyToClipboard(fila.copia, fila.clave); }}
                                            aria-label={`Copiar ${fila.clave === "tax" ? nombreImpuesto : fila.rotulo.toLowerCase()}`}
                                            className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg transition-all ${copiado === fila.clave ? "bg-green-500/20 text-green-400" : "text-neutral-400 hover:text-white hover:bg-white/10"}`}
                                        >
                                            {copiado === fila.clave ? (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                ))}
                                <p role="status" className="min-h-4 text-xs text-teal-200">
                                    {copiado ? "Copiado." : fallo ? "No se pudo copiar. Selecciona la cifra y cópiala a mano." : ""}
                                </p>
                                <p className="sr-only" aria-live="polite">
                                    {`Neto $ ${fmt(results.net)}, ${nombreImpuesto} $ ${fmt(results.tax)}, total $ ${fmt(results.gross)}.`}
                                </p>

                                {/* Formula Display */}
                                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                                    <p className="text-xs text-neutral-500 text-center font-mono">
                                        {mode === "add"
                                            ? `${fmt(results.net)} × ${formatoTasa(results.effectiveRate)}% = ${fmt(results.tax)} → ${fmt(results.gross)}`
                                            : `${fmt(results.gross)} ÷ ${(1 + results.effectiveRate / 100).toLocaleString("es-CL", { maximumFractionDigits: 4 })} = ${fmt(results.net)}`
                                        }
                                    </p>
                                    {decimales === 0 && <p className="mt-1 text-[11px] text-neutral-500 text-center">Al peso, como en la boleta: neto + IVA da siempre el total.</p>}
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
                            <svg className="w-4 h-4 text-[var(--mut)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                            Quitar IVA
                        </h3>
                        <p className="text-xs text-neutral-400">
                            Tienes el precio <strong>con impuestos</strong> y quieres saber cuánto es el neto real.
                        </p>
                    </div>
                </div>

            </main>
        </div>
    );
}
