"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";
import { enteroSeguro } from "@/lib/tools/numeros";
import { posicionesSinRepetir } from "@/lib/tools/sorteo";
import { useCopiar } from "@/lib/tools/copiar";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useToolTracking } from "@/hooks/useDebounce";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";

type ModeType = "roulette" | "groups";

// Security: Max limits
const MAX_ITEMS = 1000;
const MAX_ITEM_LENGTH = 100;

// Security: Cryptographically secure random
const secureRandom = (max: number): number => enteroSeguro(max); // sin sesgo de módulo

// Shuffle array using Fisher-Yates with secure random
const shuffleArray = <T,>(array: T[]): T[] => {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = secureRandom(i + 1);
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
};

// Parse input text into array of names
const parseNames = (text: string): string[] => {
    return text
        .split(/[\n,;]+/)
        // React ya escapa al mostrar: escapar aquí convertía «O'Higgins» en «O&#x27;Higgins».
        .map((name) => name.trim().slice(0, MAX_ITEM_LENGTH))
        .filter((name) => name.length > 0)
        .slice(0, MAX_ITEMS);
};

// Generate wheel colors
const generateColors = (count: number): string[] => {
    const baseColors = [
        "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
        "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
        "#F8B500", "#00B894", "#E17055", "#0984E3", "#6C5CE7",
    ];
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
        colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
};

// Tamaño lógico de la ruleta en px CSS; el lienzo se multiplica por la densidad de pantalla para no verse borroso.
const WHEEL_SIZE = 300;

const prefiereSinMovimiento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function RandomPickerPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("aleatorio");
    const { trackImmediate } = useToolTracking("aleatorio", { trackViewOnMount: true, debounceMs: 2000 });

    const [mode, setMode] = useState<ModeType>("roulette");
    const [inputText, setInputText] = useState("");
    const [groupCount, setGroupCount] = useState(2);
    const [isSpinning, setIsSpinning] = useState(false);
    const [ganadores, setGanadores] = useState<string[]>([]);
    const [cantidadTexto, setCantidadTexto] = useState("1");
    const [groups, setGroups] = useState<string[][] | null>(null);
    const [history, setHistory] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const lastTrackRef = useRef<number>(0);
    const wheelRef = useRef<HTMLCanvasElement>(null);
    // El giro se aplica directo al estilo del lienzo: así React no vuelve a renderizar la página en cada cuadro.
    const rotacionRef = useRef(0);
    const animacionRef = useRef<number | null>(null);
    // Varios ganadores = un giro por cada uno. Los que ya salieron quedan apagados en la ruleta (posiciones en `fuera`).
    const [fuera, setFuera] = useState<number[]>([]);
    const [vuelta, setVuelta] = useState<{ actual: number; total: number } | null>(null);
    const sesionRef = useRef(0);
    const pausaRef = useRef<number | null>(null);
    const enCursoRef = useRef<{ orden: number[]; elegidos: string[] } | null>(null);
    const { copiado, fallo, copiar } = useCopiar();

    const names = useMemo(() => parseNames(inputText), [inputText]);
    const colors = useMemo(() => generateColors(names.length), [names.length]);
    const repetidos = useMemo(() => names.length - new Set(names).size, [names]);
    const cantidadPedida = Math.max(1, parseInt(cantidadTexto, 10) || 1);
    const cantidadEfectiva = Math.min(cantidadPedida, Math.max(1, names.length));

    const aplicarGiro = useCallback((grados: number) => {
        rotacionRef.current = grados;
        if (wheelRef.current) wheelRef.current.style.transform = `rotate(${grados}deg)`;
    }, []);

    /** Corta el sorteo animado en curso (bucle de animación y pausa entre giros). */
    const cortarGiros = useCallback(() => {
        sesionRef.current++;
        if (animacionRef.current !== null) cancelAnimationFrame(animacionRef.current);
        if (pausaRef.current !== null) clearTimeout(pausaRef.current);
        animacionRef.current = null; pausaRef.current = null; enCursoRef.current = null;
    }, []);

    // Si la página se cierra a mitad de un giro, se detiene el bucle de animación.
    useEffect(() => cortarGiros, [cortarGiros]);

    // Otra lista = otra ruleta: nada queda apagado y un sorteo a medias se cancela.
    useEffect(() => {
        cortarGiros();
        setFuera([]); setVuelta(null); setIsSpinning(false);
    }, [names, cortarGiros]);

    // Dibuja la ruleta solo cuando cambia la lista (o vuelve a montarse al cambiar de modo), no en cada cuadro del giro.
    useEffect(() => {
        const canvas = wheelRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        canvas.width = WHEEL_SIZE * dpr;
        canvas.height = WHEEL_SIZE * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        canvas.style.transform = `rotate(${rotacionRef.current}deg)`;
        if (names.length < 2) return;

        const size = WHEEL_SIZE;
        const center = size / 2;
        const radius = center - 10;
        const sliceAngle = (2 * Math.PI) / names.length;

        ctx.clearRect(0, 0, size, size);

        // Draw slices - NO rotation here, rotation is handled by CSS transform only
        const acento = getComputedStyle(canvas).getPropertyValue("--color-accent-1").trim() || "#2dd4bf";
        const salieron = new Map(fuera.map((posicion, k) => [posicion, k + 1]));

        names.forEach((name, i) => {
            const startAngle = i * sliceAngle - Math.PI / 2; // Start from top
            const endAngle = startAngle + sliceAngle;
            const turno = salieron.get(i);

            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.arc(center, center, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = turno ? "#334155" : colors[i];
            ctx.fill();
            ctx.strokeStyle = "#1E293B";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw text
            ctx.save();
            ctx.translate(center, center);
            ctx.rotate(startAngle + sliceAngle / 2);
            ctx.textAlign = "right";
            ctx.fillStyle = turno ? "#cbd5e1" : "#000";
            ctx.font = `bold ${Math.max(10, Math.min(14, 200 / names.length))}px system-ui`;
            ctx.fillText(turno ? `${turno}.º ${name.slice(0, 9)}` : name.slice(0, 12), radius - 15, 5);
            ctx.restore();
        });

        // Draw center circle
        ctx.beginPath();
        ctx.arc(center, center, 20, 0, 2 * Math.PI);
        ctx.fillStyle = "#1E293B";
        ctx.fill();
        ctx.strokeStyle = acento;
        ctx.lineWidth = 3;
        ctx.stroke();
    }, [names, colors, mode, fuera]);

    const anotarResultado = useCallback((elegidos: string[]) => {
        setGanadores(elegidos);
        setHistory((prev) => [elegidos.join(", "), ...prev.slice(0, 9)]);
    }, []);

    /** Cuánto girar (en sentido horario) para que la porción `indice` quede bajo el puntero, que está arriba (0°). */
    const giroHacia = useCallback((indice: number, total: number) => {
        // La ruleta termina en 360 − (N · porción + desfase); el desfase cae entre el 15 % y el 85 % de la porción.
        const porcion = 360 / total;
        const destino = indice * porcion + porcion * (0.15 + secureRandom(70) / 100);
        const inicio = ((rotacionRef.current % 360) + 360) % 360;
        return (360 - destino - inicio + 360) % 360;
    }, []);

    /** Muestra el sorteo completo ya: la ruleta queda en el último ganador y los demás, apagados. */
    const mostrarTodo = useCallback((orden: number[], elegidos: string[], total: number) => {
        aplicarGiro(rotacionRef.current + giroHacia(orden[orden.length - 1]!, total));
        setFuera(orden);
        setIsSpinning(false); setVuelta(null);
        anotarResultado(elegidos);
    }, [aplicarGiro, giroHacia, anotarResultado]);

    /**
     * Sortea `cantidadEfectiva` ganadores sin repetir: todos se eligen al empezar (cada orden posible es igual de
     * probable) y la ruleta gira una vez por cada uno, en orden; el que sale queda apagado antes del giro siguiente.
     * Con `animar = false` o «reducir movimiento» no gira: muestra el resultado completo al tiro.
     */
    const sortear = useCallback((animar: boolean) => {
        const lista = names;
        const orden = posicionesSinRepetir(lista.length, cantidadEfectiva);
        const elegidos = orden.map((i) => lista[i]!);
        if (!elegidos.length) return;
        cortarGiros();

        if (lista.length < 2) {
            setFuera([]);
            anotarResultado(elegidos);
            return;
        }
        if (!animar || prefiereSinMovimiento()) {
            mostrarTodo(orden, elegidos, lista.length);
            return;
        }

        const sesion = sesionRef.current;
        enCursoRef.current = { orden, elegidos };
        setIsSpinning(true);
        setGanadores([]);
        setFuera([]);
        const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

        const girar = (paso: number) => {
            if (sesion !== sesionRef.current) return;
            setVuelta({ actual: paso + 1, total: orden.length });
            // El primer giro es el largo (8 a 11 vueltas, 4,5 a 6 s); los siguientes, más cortos para no hacer esperar.
            const primero = paso === 0;
            const vueltas = primero ? 8 + secureRandom(4) : 4 + secureRandom(3);
            const duracion = primero ? 4500 + secureRandom(1500) : orden.length > 8 ? 1800 + secureRandom(400) : 2800 + secureRandom(800);
            const desde = rotacionRef.current;
            const recorrido = vueltas * 360 + giroHacia(orden[paso]!, lista.length);
            let inicio: number | null = null;

            const animar = (ahora: number) => {
                if (sesion !== sesionRef.current) return;
                inicio ??= ahora;
                const avance = Math.min((ahora - inicio) / duracion, 1);
                aplicarGiro(desde + recorrido * easeOutQuint(avance));
                if (avance < 1) {
                    animacionRef.current = requestAnimationFrame(animar);
                    return;
                }
                animacionRef.current = null;
                setFuera(orden.slice(0, paso + 1));
                if (paso + 1 < orden.length) {
                    setGanadores(elegidos.slice(0, paso + 1));
                    setVuelta({ actual: paso + 2, total: orden.length }); // el botón ya anuncia el giro que viene
                    // Una pausa corta para leer quién salió antes del giro siguiente.
                    pausaRef.current = window.setTimeout(() => { pausaRef.current = null; girar(paso + 1); }, 900);
                    return;
                }
                enCursoRef.current = null;
                setIsSpinning(false); setVuelta(null);
                anotarResultado(elegidos);
            };
            animacionRef.current = requestAnimationFrame(animar);
        };
        girar(0);
    }, [names, cantidadEfectiva, aplicarGiro, anotarResultado, cortarGiros, giroHacia, mostrarTodo]);

    /** «Terminar ya»: corta los giros que faltan y muestra a todos los ganadores. */
    const terminarYa = useCallback(() => {
        const enCurso = enCursoRef.current;
        if (!enCurso) return;
        cortarGiros();
        mostrarTodo(enCurso.orden, enCurso.elegidos, names.length);
    }, [cortarGiros, mostrarTodo, names.length]);

    // Spin the wheel
    const spinWheel = useCallback(() => {
        if (names.length < 2 || isSpinning) return;
        trackImmediate("use", { action: "spin", participants: names.length, winners: cantidadEfectiva });
        sortear(true);
    }, [names.length, isSpinning, cantidadEfectiva, sortear, trackImmediate]);

    // Generate groups - with spam protection
    const generateGroups = useCallback(() => {
        if (names.length < groupCount || isGenerating) return;

        // Visual cooldown to prevent spam
        setIsGenerating(true);
        setTimeout(() => setIsGenerating(false), 500);

        // Throttle tracking: max 1 request per 2 seconds
        const now = Date.now();
        if (now - lastTrackRef.current > 2000) {
            lastTrackRef.current = now;
            trackImmediate("use", { action: "groups", participants: names.length, groupCount });
        }

        const shuffled = shuffleArray(names);
        const result: string[][] = Array.from({ length: groupCount }, () => []);

        shuffled.forEach((name, i) => {
            result[i % groupCount].push(name);
        });

        setGroups(result);
    }, [names, groupCount, isGenerating, trackImmediate]);

    // Quick pick (just select one without animation) - with spam protection
    const quickPick = useCallback(() => {
        if (names.length < 1 || isSpinning || isGenerating) return;

        setIsGenerating(true);
        setTimeout(() => setIsGenerating(false), 300);

        sortear(false);

        // Throttle tracking
        const now = Date.now();
        if (now - lastTrackRef.current > 2000) {
            lastTrackRef.current = now;
            trackImmediate("use", { action: "quickpick", participants: names.length, winners: cantidadEfectiva });
        }
    }, [names.length, isSpinning, isGenerating, cantidadEfectiva, sortear, trackImmediate]);

    const textoGanadores = ganadores.length === 1 ? ganadores[0]! : ganadores.map((nombre, i) => `${i + 1}. ${nombre}`).join("\n");
    const textoGrupos = groups ? groups.map((grupo, i) => `Grupo ${i + 1}: ${grupo.join(", ")}`).join("\n") : "";
    const anuncio = isSpinning
        ? ganadores.length ? `${ganadores.length}.º ganador: ${ganadores[ganadores.length - 1]}. Gira por el siguiente…` : "Girando la ruleta…"
        : ganadores.length ? `${ganadores.length === 1 ? "Ganador" : "Ganadores"}: ${ganadores.join(", ")}` : "";
    const textoCopia = (clave: string) => copiado === clave ? "Copiado" : fallo === clave ? "No se pudo copiar" : "Copiar";

    // Show access feedback for loading, admin-only, or private tools
    // IMPORTANT: This must be AFTER all hooks to respect Rules of Hooks
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full motion-safe:animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Sorteos y ruleta"} />;
    }

    return (
        <div className="tool-page">
            <main className="tool-main pt-24 pb-12 sm:pt-28 sm:pb-16">
                {/* Header */}
                <ToolPageHeader slug="aleatorio" />

                {/* Mode Toggle */}
                <div className="flex gap-2 mb-6 p-1 rounded-xl bg-white/5 border border-white/10" role="group" aria-label="Modo">
                    <button
                        type="button"
                        aria-pressed={mode === "roulette"}
                        disabled={isSpinning}
                        onClick={() => { setMode("roulette"); setGroups(null); }}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === "roulette"
                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                            : "text-neutral-400 hover:text-white"
                            }`}
                    >
                        <span aria-hidden="true">🎡</span>
                        Ruleta
                    </button>
                    <button
                        type="button"
                        aria-pressed={mode === "groups"}
                        disabled={isSpinning}
                        onClick={() => { setMode("groups"); setGanadores([]); setFuera([]); }}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === "groups"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "text-neutral-400 hover:text-white"
                            }`}
                    >
                        <span aria-hidden="true">👥</span>
                        Grupos
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Input */}
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <label htmlFor="aleatorio-lista" className="text-sm text-neutral-400 mb-2 block">
                                Lista de participantes ({names.length})
                            </label>
                            <textarea
                                id="aleatorio-lista"
                                value={inputText}
                                readOnly={isSpinning}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder={"Ingresa nombres separados por comas o líneas nuevas:\n\nJuan\nMaría\nPedro\nAna"}
                                rows={8}
                                className="w-full px-4 py-3 rounded-xl bg-[#0F1724] border border-white/10 text-white text-sm focus:outline-none focus:border-[#FF8A00]/50 placeholder-neutral-500 resize-none font-mono"
                            />
                            {names.length >= MAX_ITEMS && (
                                <p className="text-xs text-yellow-400 mt-2">Máximo {MAX_ITEMS} participantes</p>
                            )}
                            {repetidos > 0 && (
                                <p className="text-xs text-neutral-500 mt-2">
                                    {repetidos === 1 ? "Hay 1 nombre repetido" : `Hay ${repetidos} nombres repetidos`}: cada línea cuenta como una entrada distinta.
                                </p>
                            )}
                        </div>

                        {mode === "roulette" && (
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                <label htmlFor="aleatorio-ganadores" className="text-sm text-neutral-400 mb-2 block">
                                    Cantidad de ganadores
                                </label>
                                <input
                                    id="aleatorio-ganadores"
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    max={Math.max(1, names.length)}
                                    value={cantidadTexto}
                                    disabled={isSpinning}
                                    onChange={(e) => setCantidadTexto(e.target.value)}
                                    onBlur={() => { if (String(cantidadPedida) !== cantidadTexto.trim()) setCantidadTexto(String(cantidadPedida)); }}
                                    aria-describedby="aleatorio-ganadores-ayuda"
                                    className="h-11 w-28 px-3 rounded-xl bg-[#0F1724] border border-white/10 text-white text-sm focus:outline-none focus:border-[#FF8A00]/50 disabled:opacity-50"
                                />
                                <p id="aleatorio-ganadores-ayuda" className="text-xs text-neutral-500 mt-2">
                                    Nadie sale dos veces.
                                    {cantidadEfectiva > 1 && ` La ruleta gira ${cantidadEfectiva} veces, una por ganador; el que sale queda apagado.`}
                                    {names.length > 0 && cantidadPedida > names.length && (names.length === 1 ? " Hay 1 participante: sale ese." : ` Hay ${names.length} participantes: salen todos.`)}
                                </p>
                            </div>
                        )}

                        {mode === "groups" && (
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                <p id="aleatorio-grupos" className="text-sm text-neutral-400 mb-3">
                                    Número de grupos
                                </p>
                                <div className="flex items-center gap-3" role="group" aria-labelledby="aleatorio-grupos">
                                    <button
                                        type="button"
                                        aria-label="Un grupo menos"
                                        onClick={() => setGroupCount(Math.max(2, groupCount - 1))}
                                        className="w-11 h-11 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center"
                                    >
                                        -
                                    </button>
                                    <span className="text-2xl font-bold text-white w-12 text-center" aria-live="polite">{groupCount}</span>
                                    <button
                                        type="button"
                                        aria-label="Un grupo más"
                                        onClick={() => setGroupCount(Math.max(2, Math.min(names.length, groupCount + 1)))}
                                        className="w-11 h-11 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center"
                                    >
                                        +
                                    </button>
                                </div>
                                {names.length > 0 && (
                                    <p className="text-xs text-neutral-500 mt-2">
                                        ~{Math.ceil(names.length / groupCount)} personas por grupo
                                    </p>
                                )}
                            </div>
                        )}

                        {/* History */}
                        {mode === "roulette" && history.length > 0 && (
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="text-xs text-neutral-500 mb-2">Historial</p>
                                <div className="flex flex-wrap gap-2">
                                    {history.map((name, i) => (
                                        <span key={i} className="px-2 py-1 rounded-lg bg-white/5 text-xs text-neutral-300">
                                            {name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Wheel / Results */}
                    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-6">
                        {mode === "roulette" ? (
                            <>
                                {/* Wheel */}
                                <div className="relative mx-auto mb-6 w-full max-w-[300px] overflow-hidden">
                                    {/* Pointer */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                                        <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-accent-1" />
                                    </div>

                                    <div className="flex justify-center">
                                        <canvas
                                            ref={wheelRef}
                                            width={WHEEL_SIZE}
                                            height={WHEEL_SIZE}
                                            role="img"
                                            aria-label={`Ruleta con ${names.length} participantes`}
                                            className="h-auto w-full"
                                        />
                                    </div>

                                    {names.length < 2 && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-[#0F1724]/80 rounded-full">
                                            <p className="text-neutral-400 text-sm text-center px-8">
                                                Ingresa al menos 2 participantes
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <p className="sr-only" aria-live="polite">{anuncio}</p>

                                {/* Winner Display */}
                                {ganadores.length > 0 && (
                                    <div className="mb-4 p-4 rounded-xl bg-accent-1/10 border border-accent-1/30">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <p className="text-xs text-accent-1">
                                                {isSpinning && vuelta
                                                    ? `Ganadores, en orden: ${ganadores.length} de ${vuelta.total}`
                                                    : ganadores.length === 1 ? "Ganador" : `${ganadores.length} ganadores, en orden`}
                                            </p>
                                            {!isSpinning && <button
                                                type="button"
                                                onClick={() => { void copiar(textoGanadores, "ganadores"); }}
                                                aria-label={ganadores.length === 1 ? "Copiar ganador" : "Copiar lista de ganadores"}
                                                className="min-h-11 px-3 rounded-lg bg-white/10 text-xs text-white hover:bg-white/20 transition-colors"
                                            >
                                                {textoCopia("ganadores")}
                                            </button>}
                                        </div>
                                        <span role="status" className="sr-only">{copiado === "ganadores" ? "Copiado" : fallo === "ganadores" ? "No se pudo copiar" : ""}</span>
                                        {ganadores.length === 1 && !(isSpinning && vuelta && vuelta.total > 1) ? (
                                            <p className="text-2xl font-bold text-white text-center break-words">{ganadores[0]}</p>
                                        ) : (
                                            <ol className="max-h-64 overflow-y-auto space-y-1">
                                                {ganadores.map((nombre, i) => (
                                                    <li key={i} className="flex gap-2 text-sm text-white">
                                                        <span className="w-8 shrink-0 text-right tabular-nums text-neutral-400">{i + 1}.</span>
                                                        <span className="font-semibold break-words min-w-0">{nombre}</span>
                                                    </li>
                                                ))}
                                            </ol>
                                        )}
                                    </div>
                                )}

                                {/* Buttons */}
                                <div className="flex gap-2">
                                    {/* Mientras gira queda aria-disabled y no disabled: un botón deshabilitado suelta el foco del teclado. */}
                                    <button
                                        type="button"
                                        onClick={spinWheel}
                                        disabled={names.length < 2}
                                        aria-disabled={isSpinning || undefined}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold disabled:opacity-50 aria-disabled:opacity-50 aria-disabled:cursor-default transition-all motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]"
                                    >
                                        {isSpinning ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full motion-safe:animate-spin" aria-hidden="true" />
                                                {vuelta && vuelta.total > 1 ? `Girando ${vuelta.actual} de ${vuelta.total}…` : "Girando…"}
                                            </>
                                        ) : (
                                            <>
                                                <span aria-hidden="true">🎡</span>
                                                Girar ruleta
                                            </>
                                        )}
                                    </button>
                                    {isSpinning && vuelta && vuelta.total > 1 ? (
                                        <button
                                            type="button"
                                            onClick={terminarYa}
                                            className="min-h-11 px-4 py-3 rounded-xl bg-white/10 text-sm font-medium text-white hover:bg-white/20 transition-all"
                                        >
                                            Terminar ya
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={quickPick}
                                            disabled={names.length < 1 || isSpinning}
                                            aria-label="Sortear sin animación"
                                            className="min-w-11 px-4 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 transition-all"
                                            title="Sortear sin animación"
                                        >
                                            <span aria-hidden="true">⚡</span>
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Groups Display */}
                                <div className="mb-4 flex items-center justify-between gap-2">
                                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                        <span aria-hidden="true">👥</span>
                                        Generador de Grupos
                                    </h2>
                                    {groups && (
                                        <button
                                            type="button"
                                            onClick={() => { void copiar(textoGrupos, "grupos"); }}
                                            aria-label="Copiar grupos"
                                            className="min-h-11 px-3 rounded-lg bg-white/10 text-xs text-white hover:bg-white/20 transition-colors"
                                        >
                                            {textoCopia("grupos")}
                                        </button>
                                    )}
                                </div>
                                <span role="status" className="sr-only">{copiado === "grupos" ? "Copiado" : fallo === "grupos" ? "No se pudo copiar" : ""}</span>

                                {groups ? (
                                    <div className="space-y-3 mb-4">
                                        {groups.map((group, i) => (
                                            <div
                                                key={i}
                                                className="p-3 rounded-xl border border-white/10 bg-white/5"
                                                style={{ borderLeftColor: colors[i], borderLeftWidth: 4 }}
                                            >
                                                <p className="text-xs text-neutral-500 mb-2">Grupo {i + 1}</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {group.map((name, j) => (
                                                        <span
                                                            key={j}
                                                            className="px-2 py-1 rounded-md text-xs text-white"
                                                            style={{ backgroundColor: `${colors[i]}30` }}
                                                        >
                                                            {name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center mb-4">
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                            <span className="text-3xl">👥</span>
                                        </div>
                                        <p className="text-neutral-400 text-sm">
                                            {names.length < groupCount
                                                ? `Necesitas al menos ${groupCount} participantes`
                                                : "Haz clic en \"Generar Grupos\""}
                                        </p>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={generateGroups}
                                    disabled={names.length < groupCount || isGenerating}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold disabled:opacity-50 transition-all motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]"
                                >
                                    <span aria-hidden="true">🎲</span>
                                    {groups ? "Regenerar Grupos" : "Generar Grupos"}
                                </button>
                            </>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}
