"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToolAccess } from "@/hooks/useToolAccess";

type UnitCategory = "length" | "weight" | "temperature" | "digital" | "speed" | "time";

// Category configuration with Spanish names, short names for mobile, and emojis for instant recognition
const CATEGORIES: { id: UnitCategory; name: string; short: string; emoji: string; color: string }[] = [
    { id: "length", name: "Longitud", short: "Long.", emoji: "📏", color: "#FF8A00" },
    { id: "weight", name: "Peso", short: "Peso", emoji: "⚖️", color: "#00B8A9" },
    { id: "temperature", name: "Temperatura", short: "Temp.", emoji: "🌡️", color: "#EF4444" },
    { id: "digital", name: "Datos", short: "Datos", emoji: "💾", color: "#6366F1" },
    { id: "speed", name: "Velocidad", short: "Veloc.", emoji: "⚡", color: "#F59E0B" },
    { id: "time", name: "Tiempo", short: "Tiempo", emoji: "⏱️", color: "#8B5CF6" },
];

const UNITS: Record<UnitCategory, { id: string; name: string; symbol: string; factor: number }[]> = {
    length: [
        { id: "m", name: "Metros", symbol: "m", factor: 1 },
        { id: "km", name: "Kilómetros", symbol: "km", factor: 1000 },
        { id: "cm", name: "Centímetros", symbol: "cm", factor: 0.01 },
        { id: "mm", name: "Milímetros", symbol: "mm", factor: 0.001 },
        { id: "in", name: "Pulgadas", symbol: "in", factor: 0.0254 },
        { id: "ft", name: "Pies", symbol: "ft", factor: 0.3048 },
        { id: "yd", name: "Yardas", symbol: "yd", factor: 0.9144 },
        { id: "mi", name: "Millas", symbol: "mi", factor: 1609.34 },
    ],
    weight: [
        { id: "kg", name: "Kilogramos", symbol: "kg", factor: 1 },
        { id: "g", name: "Gramos", symbol: "g", factor: 0.001 },
        { id: "mg", name: "Miligramos", symbol: "mg", factor: 0.000001 },
        { id: "lb", name: "Libras", symbol: "lb", factor: 0.453592 },
        { id: "oz", name: "Onzas", symbol: "oz", factor: 0.0283495 },
        { id: "t", name: "Toneladas", symbol: "t", factor: 1000 },
    ],
    temperature: [
        { id: "c", name: "Celsius", symbol: "°C", factor: 1 },
        { id: "f", name: "Fahrenheit", symbol: "°F", factor: 1 },
        { id: "k", name: "Kelvin", symbol: "K", factor: 1 },
    ],
    digital: [
        { id: "b", name: "Bytes", symbol: "B", factor: 1 },
        { id: "kb", name: "Kilobytes", symbol: "KB", factor: 1024 },
        { id: "mb", name: "Megabytes", symbol: "MB", factor: 1048576 },
        { id: "gb", name: "Gigabytes", symbol: "GB", factor: 1073741824 },
        { id: "tb", name: "Terabytes", symbol: "TB", factor: 1099511627776 },
        { id: "pb", name: "Petabytes", symbol: "PB", factor: 1125899906842624 },
    ],
    speed: [
        { id: "mps", name: "Metros/seg", symbol: "m/s", factor: 1 },
        { id: "kph", name: "Km/hora", symbol: "km/h", factor: 0.277778 },
        { id: "mph", name: "Millas/hora", symbol: "mph", factor: 0.44704 },
        { id: "kn", name: "Nudos", symbol: "kn", factor: 0.514444 },
    ],
    time: [
        { id: "s", name: "Segundos", symbol: "s", factor: 1 },
        { id: "min", name: "Minutos", symbol: "min", factor: 60 },
        { id: "h", name: "Horas", symbol: "h", factor: 3600 },
        { id: "d", name: "Días", symbol: "d", factor: 86400 },
        { id: "w", name: "Semanas", symbol: "sem", factor: 604800 },
        { id: "y", name: "Años", symbol: "año", factor: 31536000 },
    ],
};

export default function UnitConverterPage() {
    const { isLoading } = useToolAccess("unidades");
    const [category, setCategory] = useState<UnitCategory>("length");
    const [fromUnit, setFromUnit] = useState(UNITS.length[0].id);
    const [toUnit, setToUnit] = useState(UNITS.length[1].id);
    const [value, setValue] = useState<string>("");
    const [result, setResult] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);

    const activeCategory = CATEGORIES.find(c => c.id === category)!;

    useEffect(() => {
        setFromUnit(UNITS[category][0].id);
        setToUnit(UNITS[category][1].id);
        setValue("");
        setResult(null);
    }, [category]);

    useEffect(() => {
        if (value === "" || isNaN(Number(value))) {
            setResult(null);
            return;
        }

        const val = Number(value);
        let res = 0;

        if (category === "temperature") {
            if (fromUnit === "c" && toUnit === "f") res = (val * 9 / 5) + 32;
            else if (fromUnit === "c" && toUnit === "k") res = val + 273.15;
            else if (fromUnit === "f" && toUnit === "c") res = (val - 32) * 5 / 9;
            else if (fromUnit === "f" && toUnit === "k") res = (val - 32) * 5 / 9 + 273.15;
            else if (fromUnit === "k" && toUnit === "c") res = val - 273.15;
            else if (fromUnit === "k" && toUnit === "f") res = (val - 273.15) * 9 / 5 + 32;
            else res = val;
        } else {
            const fromFactor = UNITS[category].find(u => u.id === fromUnit)?.factor || 1;
            const toFactor = UNITS[category].find(u => u.id === toUnit)?.factor || 1;
            const baseValue = val * fromFactor;
            res = baseValue / toFactor;
        }

        setResult(res);
    }, [value, fromUnit, toUnit, category]);

    const handleCopy = () => {
        if (result !== null) {
            const toUnitData = UNITS[category].find(u => u.id === toUnit);
            navigator.clipboard.writeText(`${formatResult(result)} ${toUnitData?.symbol || ""}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleSwap = () => {
        const temp = fromUnit;
        setFromUnit(toUnit);
        setToUnit(temp);
    };

    const formatResult = (num: number): string => {
        if (Math.abs(num) >= 1e9 || (Math.abs(num) < 0.0001 && num !== 0)) {
            return num.toExponential(4);
        }
        return Number(num.toPrecision(8)).toString();
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
                {/* Header - Simplified */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        Conversor de Unidades
                    </h1>
                    <p className="text-neutral-400 text-sm sm:text-base">
                        Selecciona una categoría y convierte al instante
                    </p>
                </div>

                {/* Category Selection - Cards with emoji + text always visible */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-8">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setCategory(cat.id)}
                            className={`relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl transition-all duration-200 ${category === cat.id
                                ? "text-white scale-[1.02] ring-2"
                                : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white border border-white/10"
                                }`}
                            style={category === cat.id ? {
                                background: `linear-gradient(135deg, ${cat.color}20, ${cat.color}10)`,
                                borderColor: cat.color,
                                boxShadow: `0 4px 20px ${cat.color}25, 0 0 0 2px ${cat.color}`,
                            } as React.CSSProperties : {}}
                        >
                            {/* Emoji - Universal & Instantly Recognizable */}
                            <span className="text-2xl sm:text-3xl mb-1">{cat.emoji}</span>

                            {/* Short name on mobile, full on desktop */}
                            <span
                                className="text-xs font-medium sm:hidden"
                                style={category === cat.id ? { color: cat.color } : {}}
                            >
                                {cat.short}
                            </span>
                            <span
                                className="text-xs font-medium hidden sm:block"
                                style={category === cat.id ? { color: cat.color } : {}}
                            >
                                {cat.name}
                            </span>

                            {/* Selected indicator */}
                            {category === cat.id && (
                                <div
                                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full"
                                    style={{ background: cat.color }}
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* Active Category Indicator */}
                <div
                    className="flex items-center justify-center gap-2 mb-6 py-2 px-4 rounded-full mx-auto w-fit"
                    style={{
                        background: `${activeCategory.color}15`,
                        border: `1px solid ${activeCategory.color}30`,
                    }}
                >
                    <span className="text-lg">{activeCategory.emoji}</span>
                    <span
                        className="text-sm font-medium"
                        style={{ color: activeCategory.color }}
                    >
                        Convirtiendo {activeCategory.name}
                    </span>
                </div>

                {/* Converter Card */}
                <div
                    className="rounded-2xl p-5 sm:p-8 backdrop-blur-xl border"
                    style={{
                        background: `linear-gradient(135deg, ${activeCategory.color}08, transparent)`,
                        borderColor: `${activeCategory.color}25`,
                    }}
                >
                    {/* Conversion Flow - Vertical on mobile/tablet, Horizontal only on large desktop */}
                    <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[1fr,auto,1fr] lg:gap-4 xl:gap-6 lg:items-end">

                        {/* FROM Section */}
                        <div className="space-y-3 min-w-0">
                            <label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                                <span
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    style={{ background: `${activeCategory.color}25`, color: activeCategory.color }}
                                >
                                    1
                                </span>
                                Cantidad a convertir
                            </label>

                            {/* Input and unit selector - stacked on mobile, inline on sm+ */}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="number"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    placeholder="0"
                                    className="w-full sm:flex-1 sm:min-w-0 bg-[#0F1724]/80 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-medium focus:ring-2 focus:border-transparent outline-none transition-all placeholder:text-neutral-600"
                                    style={{ focusRingColor: activeCategory.color } as React.CSSProperties}
                                />
                                <select
                                    value={fromUnit}
                                    onChange={(e) => setFromUnit(e.target.value)}
                                    className="w-full sm:w-24 lg:w-28 bg-white/5 border border-white/15 rounded-xl px-3 py-3 text-white text-sm font-medium focus:ring-2 outline-none cursor-pointer hover:bg-white/10 transition-colors"
                                >
                                    {UNITS[category].map((u) => (
                                        <option key={u.id} value={u.id} className="bg-[#0F1724]">
                                            {u.symbol}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Unit full name */}
                            <p className="text-xs text-neutral-500 pl-1">
                                {UNITS[category].find(u => u.id === fromUnit)?.name}
                            </p>
                        </div>

                        {/* Swap Button - Centered with animated circular arrows */}
                        <div className="flex justify-center py-2 lg:pb-6 flex-shrink-0">
                            <button
                                onClick={(e) => {
                                    // Trigger SMIL animation
                                    const svg = e.currentTarget.querySelector('svg');
                                    if (svg) {
                                        const topCurve = svg.getElementById('topMorphToCurve');
                                        const bottomCurve = svg.getElementById('bottomMorphToCurve');
                                        const spin = svg.getElementById('spinAnim');
                                        const topStraight = svg.getElementById('topMorphToStraight');
                                        const bottomStraight = svg.getElementById('bottomMorphToStraight');

                                        // Phase 1: Morph to curves
                                        (topCurve as any)?.beginElement?.();
                                        (bottomCurve as any)?.beginElement?.();

                                        // Phase 2: Spin
                                        setTimeout(() => {
                                            (spin as any)?.beginElement?.();
                                        }, 50);

                                        // Phase 3: Return to straight
                                        setTimeout(() => {
                                            (topStraight as any)?.beginElement?.();
                                            (bottomStraight as any)?.beginElement?.();
                                        }, 800);
                                    }

                                    handleSwap();
                                }}
                                className="p-3 rounded-full bg-white/5 hover:bg-white/15 transition-all hover:scale-110 active:scale-95 border border-white/10 group"
                                title="Intercambiar unidades"
                            >
                                <svg
                                    viewBox="0 0 100 100"
                                    className="w-5 h-5 lg:w-6 lg:h-6"
                                >
                                    <defs>
                                        <marker
                                            id="arrowHead"
                                            markerWidth="3"
                                            markerHeight="3"
                                            refX="1.5"
                                            refY="1.5"
                                            orient="auto"
                                        >
                                            <path
                                                d="M0,0 L3,1.5 L0,3"
                                                className="fill-neutral-400 group-hover:fill-accent-1 transition-colors"
                                            />
                                        </marker>
                                    </defs>

                                    <g transform="translate(50, 50)">
                                        <g id="spinGroup">
                                            {/* Top Arrow */}
                                            <path
                                                id="pathTop"
                                                d="M -26 -12 C -15 -12 15 -12 26 -12"
                                                fill="none"
                                                className="stroke-neutral-400 group-hover:stroke-accent-1 transition-colors"
                                                strokeWidth="6"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                markerEnd="url(#arrowHead)"
                                            >
                                                <animate
                                                    id="topMorphToCurve"
                                                    attributeName="d"
                                                    begin="indefinite"
                                                    dur="0.4s"
                                                    fill="freeze"
                                                    calcMode="spline"
                                                    keySplines="0.4 0 0.2 1"
                                                    to="M -22 -12 C -13 -29 13 -29 22 -12"
                                                />
                                                <animate
                                                    id="topMorphToStraight"
                                                    attributeName="d"
                                                    begin="indefinite"
                                                    dur="0.5s"
                                                    fill="freeze"
                                                    calcMode="spline"
                                                    keySplines="0.4 0 0.2 1"
                                                    to="M -26 -12 C -15 -12 15 -12 26 -12"
                                                />
                                            </path>

                                            {/* Bottom Arrow */}
                                            <path
                                                id="pathBottom"
                                                d="M 26 12 C 15 12 -15 12 -26 12"
                                                fill="none"
                                                className="stroke-neutral-400 group-hover:stroke-accent-1 transition-colors"
                                                strokeWidth="6"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                markerEnd="url(#arrowHead)"
                                            >
                                                <animate
                                                    id="bottomMorphToCurve"
                                                    attributeName="d"
                                                    begin="indefinite"
                                                    dur="0.4s"
                                                    fill="freeze"
                                                    calcMode="spline"
                                                    keySplines="0.4 0 0.2 1"
                                                    to="M 22 12 C 13 29 -13 29 -22 12"
                                                />
                                                <animate
                                                    id="bottomMorphToStraight"
                                                    attributeName="d"
                                                    begin="indefinite"
                                                    dur="0.5s"
                                                    fill="freeze"
                                                    calcMode="spline"
                                                    keySplines="0.4 0 0.2 1"
                                                    to="M 26 12 C 15 12 -15 12 -26 12"
                                                />
                                            </path>

                                            {/* Rotation Animation */}
                                            <animateTransform
                                                id="spinAnim"
                                                attributeName="transform"
                                                type="rotate"
                                                begin="indefinite"
                                                dur="1s"
                                                keyTimes="0; 1"
                                                calcMode="spline"
                                                keySplines="0.4 0 0.2 1"
                                                values="0; 360"
                                                fill="freeze"
                                            />
                                        </g>
                                    </g>
                                </svg>
                            </button>
                        </div>

                        {/* TO Section - Result */}
                        <div className="space-y-3 min-w-0">
                            <label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                                <span
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    style={{ background: `${activeCategory.color}25`, color: activeCategory.color }}
                                >
                                    2
                                </span>
                                Resultado
                            </label>

                            {/* Result with unit selector - stacked on mobile, inline on sm+ */}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div
                                    className="w-full sm:flex-1 sm:min-w-0 rounded-xl px-4 py-3 flex items-center justify-between border overflow-hidden"
                                    style={{
                                        background: `linear-gradient(135deg, ${activeCategory.color}15, ${activeCategory.color}05)`,
                                        borderColor: `${activeCategory.color}30`,
                                    }}
                                >
                                    <span
                                        className="text-lg font-bold truncate"
                                        style={{ color: activeCategory.color }}
                                    >
                                        {result !== null ? formatResult(result) : "—"}
                                    </span>
                                    {result !== null && (
                                        <button
                                            onClick={handleCopy}
                                            className="ml-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                                            title="Copiar resultado"
                                        >
                                            {copied ? (
                                                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </button>
                                    )}
                                </div>
                                <select
                                    value={toUnit}
                                    onChange={(e) => setToUnit(e.target.value)}
                                    className="w-full sm:w-24 lg:w-28 bg-white/5 border border-white/15 rounded-xl px-3 py-3 text-white text-sm font-medium focus:ring-2 outline-none cursor-pointer hover:bg-white/10 transition-colors"
                                >
                                    {UNITS[category].map((u) => (
                                        <option key={u.id} value={u.id} className="bg-[#0F1724]">
                                            {u.symbol}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Unit full name */}
                            <p className="text-xs text-neutral-500 pl-1">
                                {UNITS[category].find(u => u.id === toUnit)?.name}
                            </p>
                        </div>
                    </div>

                    {/* Conversion Summary - Human readable */}
                    {result !== null && value && (
                        <div
                            className="mt-6 p-4 rounded-xl text-center"
                            style={{
                                background: `${activeCategory.color}08`,
                                border: `1px dashed ${activeCategory.color}30`,
                            }}
                        >
                            <p className="text-sm text-neutral-300">
                                <span className="font-semibold text-white">{value}</span>
                                {" "}{UNITS[category].find(u => u.id === fromUnit)?.name}{" "}
                                <span className="text-neutral-500">=</span>{" "}
                                <span
                                    className="font-bold text-lg"
                                    style={{ color: activeCategory.color }}
                                >
                                    {formatResult(result)}
                                </span>
                                {" "}{UNITS[category].find(u => u.id === toUnit)?.name}
                            </p>
                        </div>
                    )}
                </div>

                {/* Back Link */}
                <div className="mt-8 text-center">
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
