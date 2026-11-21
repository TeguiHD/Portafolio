"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

import { useState, useEffect, useMemo, type CSSProperties, type MouseEvent } from "react";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { useCopiar } from "@/lib/tools/copiar";
import {
    MAGNITUDES, MAGNITUD_POR_ID, type MagnitudId, type Magnitud, type Unidad,
    unidadDe, esLineal, convertir, bajoCeroAbsoluto, leerNumero, formatoCL,
} from "@/lib/tools/unidades";

/** Explicación de la equivalencia entre dos unidades: factor directo e inverso, o las fórmulas si no es lineal. */
function explicacion(m: Magnitud, de: Unidad, a: Unidad): string[] {
    const lineas: string[] = [];
    if (de.id === a.id) lineas.push("Es la misma unidad.");
    else if (esLineal(de) && esLineal(a)) {
        lineas.push(`1 ${de.simbolo} = ${formatoCL(de.factor / a.factor)} ${a.simbolo}`);
        lineas.push(`1 ${a.simbolo} = ${formatoCL(a.factor / de.factor)} ${de.simbolo}`);
    } else {
        for (const u of [de, a]) if (u.formula) lineas.push(u.formula);
    }
    if (m.nota) lineas.push(m.nota);
    for (const u of de.id === a.id ? [de] : [de, a]) if (u.nota) lineas.push(u.nota);
    return lineas;
}

function prefiereMenosMovimiento(): boolean {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function UnitConverterPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("unidades");
    const [category, setCategory] = useState<MagnitudId>("longitud");
    const [fromUnit, setFromUnit] = useState(MAGNITUDES[0].porDefecto[0]);
    const [toUnit, setToUnit] = useState(MAGNITUDES[0].porDefecto[1]);
    const [value, setValue] = useState<string>("");
    const [urlLeida, setUrlLeida] = useState(false);
    const { copiado, fallo, copiar } = useCopiar();

    const activeCategory = MAGNITUD_POR_ID.get(category) ?? MAGNITUDES[0];
    const desde = unidadDe(activeCategory, fromUnit) ?? activeCategory.unidades[0];
    const hacia = unidadDe(activeCategory, toUnit) ?? activeCategory.unidades[1];

    // Estado compartible: ?magnitud=longitud&de=km&a=mi&valor=5. Se lee una vez al montar.
    useEffect(() => {
        const q = new URLSearchParams(window.location.search);
        const m = MAGNITUD_POR_ID.get(q.get("magnitud") as MagnitudId);
        if (m) {
            setCategory(m.id);
            setFromUnit(unidadDe(m, q.get("de") ?? "")?.id ?? m.porDefecto[0]);
            setToUnit(unidadDe(m, q.get("a") ?? "")?.id ?? m.porDefecto[1]);
        }
        const v = q.get("valor");
        if (v) setValue(v.slice(0, 40));
        setUrlLeida(true);
    }, []);

    useEffect(() => {
        if (!urlLeida) return;
        const timer = window.setTimeout(() => {
            try {
                const url = new URL(window.location.href);
                url.searchParams.set("magnitud", category);
                url.searchParams.set("de", fromUnit);
                url.searchParams.set("a", toUnit);
                if (value.trim()) url.searchParams.set("valor", value.trim()); else url.searchParams.delete("valor");
                const inicial = MAGNITUDES[0];
                if (!value.trim() && category === inicial.id && fromUnit === inicial.porDefecto[0] && toUnit === inicial.porDefecto[1]) {
                    for (const clave of ["magnitud", "de", "a"]) url.searchParams.delete(clave);
                }
                // Solo se toca la URL si cambió: al cargar sin parámetros queda limpia.
                if (url.search !== window.location.search) window.history.replaceState(null, "", url);
            } catch {
                // Algunos navegadores limitan replaceState; la URL compartible es un extra, no debe romper nada.
            }
        }, 400);
        return () => window.clearTimeout(timer);
    }, [urlLeida, category, fromUnit, toUnit, value]);

    const numero = useMemo(() => leerNumero(value), [value]);
    const entradaInvalida = value.trim() !== "" && numero === null;
    const result = numero === null ? null : convertir(activeCategory, numero, desde.id, hacia.id);
    const bajoCero = numero !== null && bajoCeroAbsoluto(activeCategory, numero, desde.id);
    const base = numero ?? 1;
    const tabla = useMemo(
        () => activeCategory.unidades.map((u) => ({ unidad: u, valor: convertir(activeCategory, base, desde.id, u.id) })),
        [activeCategory, base, desde.id],
    );
    const pasos = useMemo(() => explicacion(activeCategory, desde, hacia), [activeCategory, desde, hacia]);

    const elegirMagnitud = (id: MagnitudId) => {
        const m = MAGNITUD_POR_ID.get(id);
        if (!m) return;
        // Se conserva la cantidad escrita: solo cambian las unidades.
        setCategory(id);
        setFromUnit(m.porDefecto[0]);
        setToUnit(m.porDefecto[1]);
    };

    const handleCopy = () => {
        if (result !== null) void copiar(`${formatoCL(result)} ${hacia.simbolo}`, "resultado");
    };

    const copiarTabla = () => {
        const filas = tabla.map(({ unidad, valor }) => `${valor === null ? "—" : formatoCL(valor)}\t${unidad.simbolo}\t${unidad.nombre}`);
        void copiar(filas.join("\n"), "tabla");
    };

    const handleSwap = (e: MouseEvent<HTMLButtonElement>) => {
        if (!prefiereMenosMovimiento()) {
            // Trigger SMIL animation
            const svg = e.currentTarget.querySelector("svg");
            if (svg) {
                const topCurve = svg.getElementById("topMorphToCurve");
                const bottomCurve = svg.getElementById("bottomMorphToCurve");
                const spin = svg.getElementById("spinAnim");
                const topStraight = svg.getElementById("topMorphToStraight");
                const bottomStraight = svg.getElementById("bottomMorphToStraight");

                // Phase 1: Morph to curves
                (topCurve as unknown as SVGAnimationElement)?.beginElement?.();
                (bottomCurve as unknown as SVGAnimationElement)?.beginElement?.();

                // Phase 2: Spin
                setTimeout(() => {
                    (spin as unknown as SVGAnimationElement)?.beginElement?.();
                }, 50);

                // Phase 3: Return to straight
                setTimeout(() => {
                    (topStraight as unknown as SVGAnimationElement)?.beginElement?.();
                    (bottomStraight as unknown as SVGAnimationElement)?.beginElement?.();
                }, 800);
            }
        }
        setFromUnit(toUnit);
        setToUnit(fromUnit);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Conversor de unidades"} />;
    }

    const color = activeCategory.color;
    const selectClass = "w-full sm:w-48 lg:w-40 xl:w-48 min-h-11 bg-white/5 border border-white/15 rounded-xl px-3 py-3 text-white text-sm font-medium focus:ring-2 outline-none cursor-pointer hover:bg-white/10 transition-colors";

    return (
        <div className="tool-page">
            <main className="tool-main pt-20 pb-12 sm:pt-24 sm:pb-16">
                {/* Header - Simplified */}
                <ToolPageHeader slug="unidades" />

                {/* Category Selection - Cards with emoji + text always visible */}
                <div role="group" aria-label="Magnitud" className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-3 mb-8">
                    {MAGNITUDES.map((cat) => (
                        <button
                            key={cat.id}
                            type="button"
                            aria-pressed={category === cat.id}
                            aria-label={cat.nombre}
                            onClick={() => elegirMagnitud(cat.id)}
                            className={`relative flex min-h-11 flex-col items-center justify-center p-2 sm:p-3 rounded-xl transition-all duration-200 motion-reduce:transition-none ${category === cat.id
                                ? "text-white motion-safe:scale-[1.02] ring-2"
                                : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white border border-white/10"
                                }`}
                            style={category === cat.id ? {
                                background: `linear-gradient(135deg, ${cat.color}20, ${cat.color}10)`,
                                borderColor: cat.color,
                                boxShadow: `0 4px 20px ${cat.color}25, 0 0 0 2px ${cat.color}`,
                            } as CSSProperties : {}}
                        >
                            {/* Emoji - Universal & Instantly Recognizable */}
                            <span className="text-xl sm:text-2xl mb-1" aria-hidden="true">{cat.emoji}</span>

                            {/* Short name on mobile, full on desktop */}
                            <span
                                className="text-[11px] font-medium sm:hidden"
                                style={category === cat.id ? { color: cat.color } : {}}
                                aria-hidden="true"
                            >
                                {cat.corto}
                            </span>
                            <span
                                className="text-xs font-medium hidden sm:block text-center leading-tight"
                                style={category === cat.id ? { color: cat.color } : {}}
                                aria-hidden="true"
                            >
                                {cat.id === "consumo" ? "Consumo" : cat.nombre}
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
                        background: `${color}15`,
                        border: `1px solid ${color}30`,
                    }}
                >
                    <span className="text-lg" aria-hidden="true">{activeCategory.emoji}</span>
                    <span className="text-sm font-medium" style={{ color }}>
                        Convirtiendo {activeCategory.nombre.toLowerCase()}
                    </span>
                </div>

                {/* Converter Card */}
                <div
                    className="rounded-2xl p-5 sm:p-8 backdrop-blur-xl border"
                    style={{
                        background: `linear-gradient(135deg, ${color}08, transparent)`,
                        borderColor: `${color}25`,
                    }}
                >
                    {/* Conversion Flow - Vertical on mobile/tablet, Horizontal only on large desktop */}
                    <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-4 xl:gap-6 lg:items-end">

                        {/* FROM Section */}
                        <div className="space-y-3 min-w-0">
                            <label htmlFor="unidades-valor" className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                                <span
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    style={{ background: `${color}25`, color }}
                                    aria-hidden="true"
                                >
                                    1
                                </span>
                                Cantidad a convertir
                            </label>

                            {/* Input and unit selector - stacked on mobile, inline on sm+ */}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    id="unidades-valor"
                                    type="text"
                                    inputMode={category === "temperatura" ? "text" : "decimal"}
                                    autoComplete="off"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    placeholder="0"
                                    aria-invalid={entradaInvalida}
                                    aria-describedby={entradaInvalida ? "unidades-error" : undefined}
                                    className="w-full sm:flex-1 sm:min-w-0 bg-[#0F1724]/80 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-medium focus:ring-2 focus:border-transparent outline-none transition-all placeholder:text-neutral-600"
                                />
                                <select
                                    aria-label="Unidad de origen"
                                    value={desde.id}
                                    onChange={(e) => setFromUnit(e.target.value)}
                                    className={selectClass}
                                >
                                    {activeCategory.unidades.map((u) => (
                                        <option key={u.id} value={u.id} className="bg-[#0F1724]">
                                            {u.simbolo} · {u.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Unit full name */}
                            <p className="text-xs text-neutral-500 pl-1">
                                {desde.nombre} · usa coma para los decimales (1,5)
                            </p>
                        </div>

                        {/* Swap Button - Centered with animated circular arrows */}
                        <div className="flex justify-center py-2 lg:pb-6 flex-shrink-0">
                            <button
                                type="button"
                                onClick={handleSwap}
                                className="flex min-h-11 min-w-11 items-center justify-center p-3 rounded-full bg-white/5 hover:bg-white/15 transition-all motion-safe:hover:scale-110 motion-safe:active:scale-95 border border-white/10 group"
                                aria-label="Intercambiar unidades"
                            >
                                <svg
                                    viewBox="0 0 100 100"
                                    className="w-5 h-5 lg:w-6 lg:h-6"
                                    aria-hidden="true"
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
                            <p className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                                <span
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    style={{ background: `${color}25`, color }}
                                    aria-hidden="true"
                                >
                                    2
                                </span>
                                Resultado
                            </p>

                            {/* Result with unit selector - stacked on mobile, inline on sm+ */}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div
                                    className="w-full sm:flex-1 sm:min-w-0 rounded-xl px-4 py-1.5 min-h-[52px] flex items-center justify-between border overflow-hidden"
                                    style={{
                                        background: `linear-gradient(135deg, ${color}15, ${color}05)`,
                                        borderColor: `${color}30`,
                                    }}
                                >
                                    <output
                                        htmlFor="unidades-valor"
                                        aria-live="polite"
                                        className="text-lg font-bold truncate"
                                        style={{ color }}
                                    >
                                        {result !== null ? formatoCL(result) : "—"}
                                    </output>
                                    {result !== null && (
                                        <button
                                            type="button"
                                            onClick={handleCopy}
                                            className="ml-2 flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                                            aria-label="Copiar resultado"
                                        >
                                            {copiado === "resultado" ? (
                                                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </button>
                                    )}
                                </div>
                                <select
                                    aria-label="Unidad de destino"
                                    value={hacia.id}
                                    onChange={(e) => setToUnit(e.target.value)}
                                    className={selectClass}
                                >
                                    {activeCategory.unidades.map((u) => (
                                        <option key={u.id} value={u.id} className="bg-[#0F1724]">
                                            {u.simbolo} · {u.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Unit full name */}
                            <p className="text-xs text-neutral-500 pl-1">
                                {hacia.nombre}
                            </p>
                        </div>
                    </div>

                    <p role="status" className="sr-only">{copiado === "resultado" ? "Resultado copiado" : copiado === "tabla" ? "Tabla copiada" : ""}</p>
                    {entradaInvalida && <p id="unidades-error" role="alert" className="mt-4 text-sm text-amber-300">No es un número. Escribe, por ejemplo, 1,5 o 1.200.</p>}
                    {bajoCero && <p role="alert" className="mt-4 text-sm text-amber-300">Esa temperatura está bajo el cero absoluto (0 K = −273,15 °C): no existe.</p>}
                    {(fallo === "resultado" || fallo === "tabla") && <p role="alert" className="mt-4 text-sm text-red-300">No se pudo copiar. Selecciona el texto y cópialo a mano.</p>}

                    {/* Conversion Summary - Human readable */}
                    {result !== null && numero !== null && (
                        <div
                            className="mt-6 p-4 rounded-xl text-center"
                            style={{
                                background: `${color}08`,
                                border: `1px dashed ${color}30`,
                            }}
                        >
                            <p className="text-sm text-neutral-300">
                                <span className="font-semibold text-white">{formatoCL(numero)}</span>
                                {" "}{desde.nombre.toLowerCase()}{" "}
                                <span className="text-neutral-500">=</span>{" "}
                                <span className="font-bold text-lg" style={{ color }}>
                                    {formatoCL(result)}
                                </span>
                                {" "}{hacia.nombre.toLowerCase()}
                            </p>
                        </div>
                    )}

                    {/* Explicación: de dónde sale la equivalencia */}
                    <div className="mt-6 space-y-1.5 text-sm text-neutral-400">
                        <h2 className="text-sm font-semibold text-white">Cómo se calcula</h2>
                        {pasos.map((linea) => <p key={linea} className="leading-relaxed">{linea}</p>)}
                    </div>
                </div>

                {/* Tabla de equivalencias */}
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-white">
                            Equivalencias de {formatoCL(base)} {desde.simbolo}
                        </h2>
                        <button
                            type="button"
                            onClick={copiarTabla}
                            className="min-h-11 rounded-lg border border-white/10 px-3 text-xs text-neutral-300 hover:bg-white/10 transition-colors"
                        >
                            {copiado === "tabla" ? "Tabla copiada" : "Copiar tabla"}
                        </button>
                    </div>
                    <table className="w-full text-sm">
                        <caption className="sr-only">Equivalencias de {formatoCL(base)} {desde.nombre.toLowerCase()} en todas las unidades de {activeCategory.nombre.toLowerCase()}</caption>
                        <thead>
                            <tr className="text-left text-xs text-neutral-500">
                                <th scope="col" className="py-2 pr-3 font-medium">Unidad</th>
                                <th scope="col" className="py-2 text-right font-medium">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tabla.map(({ unidad, valor }) => {
                                const destino = unidad.id === hacia.id;
                                return (
                                    <tr key={unidad.id} className="border-t border-white/[0.06]" style={destino ? { background: `${color}12` } : undefined}>
                                        <th scope="row" className="py-2 pr-3 text-left font-normal text-neutral-300">
                                            {unidad.nombre} <span className="text-neutral-500">({unidad.simbolo})</span>
                                            {destino && <span className="sr-only"> (unidad de destino)</span>}
                                        </th>
                                        <td className="py-2 text-right font-mono tabular-nums" style={destino ? { color } : undefined}>
                                            {valor === null ? "—" : formatoCL(valor)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <p className="mt-3 text-[11px] text-neutral-500">Hasta 12 cifras significativas. Los factores siguen las definiciones oficiales; las cifras con «≈», «unos» o «cerca de» en la explicación están redondeadas.</p>
                </div>

            </main>
        </div>
    );
}
