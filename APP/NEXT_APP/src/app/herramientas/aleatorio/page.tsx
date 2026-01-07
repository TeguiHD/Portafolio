"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useToolTracking } from "@/hooks/useDebounce";
import { useToolAccess } from "@/hooks/useToolAccess";
import { sanitizeInput } from "@/lib/security";

type ModeType = "roulette" | "groups";

// Security: Max limits
const MAX_ITEMS = 1000;
const MAX_ITEM_LENGTH = 100;

// Security: Cryptographically secure random
const secureRandom = (max: number): number => {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
};

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
        .map((name) => sanitizeInput(name.trim()).slice(0, MAX_ITEM_LENGTH))
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

export default function RandomPickerPage() {
    const { isLoading } = useToolAccess("aleatorio");
    const { trackImmediate } = useToolTracking("aleatorio", { trackViewOnMount: true, debounceMs: 2000 });

    const [mode, setMode] = useState<ModeType>("roulette");
    const [inputText, setInputText] = useState("");
    const [groupCount, setGroupCount] = useState(2);
    const [isSpinning, setIsSpinning] = useState(false);
    const [winner, setWinner] = useState<string | null>(null);
    const [groups, setGroups] = useState<string[][] | null>(null);
    const [history, setHistory] = useState<string[]>([]);
    const [rotation, setRotation] = useState(0);
    const [isMounted, setIsMounted] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false); // Cooldown for button spam protection
    const lastTrackRef = useRef<number>(0); // Throttle tracking requests

    // Fix hydration: only apply rotation after mount
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const wheelRef = useRef<HTMLCanvasElement>(null);
    const names = parseNames(inputText);
    const colors = generateColors(names.length);

    // Draw wheel on canvas
    useEffect(() => {
        const canvas = wheelRef.current;
        if (!canvas || names.length < 2) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const size = canvas.width;
        const center = size / 2;
        const radius = center - 10;
        const sliceAngle = (2 * Math.PI) / names.length;

        ctx.clearRect(0, 0, size, size);

        // Draw slices - NO rotation here, rotation is handled by CSS transform only
        names.forEach((name, i) => {
            const startAngle = i * sliceAngle - Math.PI / 2; // Start from top
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.arc(center, center, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = colors[i];
            ctx.fill();
            ctx.strokeStyle = "#1E293B";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw text
            ctx.save();
            ctx.translate(center, center);
            ctx.rotate(startAngle + sliceAngle / 2);
            ctx.textAlign = "right";
            ctx.fillStyle = "#000";
            ctx.font = `bold ${Math.max(10, Math.min(14, 200 / names.length))}px system-ui`;
            ctx.fillText(name.slice(0, 12), radius - 15, 5);
            ctx.restore();
        });

        // Draw center circle
        ctx.beginPath();
        ctx.arc(center, center, 20, 0, 2 * Math.PI);
        ctx.fillStyle = "#1E293B";
        ctx.fill();
        ctx.strokeStyle = "#FF8A00";
        ctx.lineWidth = 3;
        ctx.stroke();
    }, [names, colors]); // Remove rotation from dependency - slices are static

    // Spin the wheel
    const spinWheel = useCallback(() => {
        if (names.length < 2 || isSpinning) return;

        setIsSpinning(true);
        setWinner(null);
        trackImmediate("use", { action: "spin", participants: names.length });

        // Calculate winning index using secure random
        const winningIndex = secureRandom(names.length);
        const sliceAngle = 360 / names.length;

        // Calculate target rotation (multiple full rotations + landing on winner)
        const fullRotations = 8 + secureRandom(5); // 8-12 full rotations for more suspense

        // The pointer is at TOP (0° position)
        // Slice 0 center starts at 0° (top), slice 1 at sliceAngle°, etc.
        // To land slice N under the pointer at TOP:
        // - We need to rotate the wheel so slice N's center reaches the top
        // - Slice N center is at (N * sliceAngle) from initial position
        // - Rotation is clockwise, so we rotate by -(N * sliceAngle) equivalent
        // - In CSS positive = clockwise, so to move slice N to top we need:
        //   rotation = 360 - (N * sliceAngle + offset) to land there

        // SUSPENSE: Random offset within the slice (not always center)
        // Range from 15% to 85% of slice to stay safely within bounds but add drama
        const randomOffset = 0.15 + (secureRandom(70) / 100); // 0.15 to 0.85
        const offsetInSlice = sliceAngle * randomOffset;
        const targetSliceAngle = winningIndex * sliceAngle + offsetInSlice;

        // Normalize current rotation to 0-360 range to avoid accumulated huge values
        const normalizedStart = rotation % 360;

        // Calculate final position (where the wheel should stop)
        const finalPosition = 360 - targetSliceAngle;

        // Total spin = full rotations + distance to final position
        // This guarantees the wheel always spins a lot regardless of starting position
        const totalSpin = fullRotations * 360 + finalPosition + (360 - normalizedStart);

        const startTime = Date.now();
        const duration = 5000 + secureRandom(2000); // 5-7 seconds

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // IMPROVED EASING: Guaranteed fast start
            // Phase 1 (0-20%): Linear fast spin
            // Phase 2 (20-100%): Exponential decay slowdown
            let easeValue: number;
            if (progress < 0.2) {
                // Fast linear phase - constant high speed
                easeValue = progress * 2.5; // Reaches 0.5 at 20% time
            } else {
                // Exponential decay phase for dramatic slowdown
                const decayProgress = (progress - 0.2) / 0.8; // Normalize to 0-1
                const decayValue = 1 - Math.exp(-4 * decayProgress);
                easeValue = 0.5 + 0.5 * decayValue; // Continues from 0.5 to 1.0
            }

            const newRotation = normalizedStart + totalSpin * easeValue;

            setRotation(newRotation);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setIsSpinning(false);
                setWinner(names[winningIndex]);
                setHistory((prev) => [names[winningIndex], ...prev.slice(0, 9)]);
            }
        };

        requestAnimationFrame(animate);
    }, [names, isSpinning, rotation, trackImmediate]);

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

        const winnerIndex = secureRandom(names.length);
        setWinner(names[winnerIndex]);
        setHistory((prev) => [names[winnerIndex], ...prev.slice(0, 9)]);

        // Throttle tracking
        const now = Date.now();
        if (now - lastTrackRef.current > 2000) {
            lastTrackRef.current = now;
            trackImmediate("use", { action: "quickpick", participants: names.length });
        }
    }, [names, isSpinning, isGenerating, trackImmediate]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-12 sm:pt-28 sm:pb-16">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/30 flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Sorteos y Ruleta</h1>
                            <p className="text-sm text-neutral-400">Elige ganadores al azar o crea grupos aleatorios</p>
                        </div>
                    </div>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-2 mb-6 p-1 rounded-xl bg-white/5 border border-white/10">
                    <button
                        onClick={() => { setMode("roulette"); setGroups(null); }}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === "roulette"
                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                            : "text-neutral-400 hover:text-white"
                            }`}
                    >
                        <span>🎡</span>
                        Ruleta
                    </button>
                    <button
                        onClick={() => { setMode("groups"); setWinner(null); }}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === "groups"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "text-neutral-400 hover:text-white"
                            }`}
                    >
                        <span>👥</span>
                        Grupos
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Input */}
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <label className="text-sm text-neutral-400 mb-2 block">
                                Lista de participantes ({names.length})
                            </label>
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder={"Ingresa nombres separados por comas o líneas nuevas:\n\nJuan\nMaría\nPedro\nAna"}
                                rows={8}
                                className="w-full px-4 py-3 rounded-xl bg-[#0F1724] border border-white/10 text-white text-sm focus:outline-none focus:border-[#FF8A00]/50 placeholder-neutral-500 resize-none font-mono"
                            />
                            {names.length >= MAX_ITEMS && (
                                <p className="text-xs text-yellow-400 mt-2">Máximo {MAX_ITEMS} participantes</p>
                            )}
                        </div>

                        {mode === "groups" && (
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                <label className="text-sm text-neutral-400 mb-3 block">
                                    Número de grupos
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setGroupCount(Math.max(2, groupCount - 1))}
                                        className="w-10 h-10 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center"
                                    >
                                        -
                                    </button>
                                    <span className="text-2xl font-bold text-white w-12 text-center">{groupCount}</span>
                                    <button
                                        onClick={() => setGroupCount(Math.min(names.length, groupCount + 1))}
                                        className="w-10 h-10 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center"
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
                                <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wide">Historial</p>
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
                                <div className="relative mb-6">
                                    {/* Pointer */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                                        <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-[#FF8A00]" />
                                    </div>

                                    <div className="flex justify-center">
                                        <canvas
                                            ref={wheelRef}
                                            width={300}
                                            height={300}
                                            className="max-w-full"
                                            style={{ transform: isMounted ? `rotate(${rotation}deg)` : undefined }}
                                        />
                                    </div>

                                    {names.length < 2 && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-[#0F1724]/80 rounded-full mx-auto w-[300px]">
                                            <p className="text-neutral-400 text-sm text-center px-8">
                                                Ingresa al menos 2 participantes
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Winner Display */}
                                {winner && !isSpinning && (
                                    <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-[#FF8A00]/20 to-yellow-500/20 border border-[#FF8A00]/30 text-center animate-pulse">
                                        <p className="text-xs text-[#FF8A00] uppercase tracking-wide mb-1">🎉 Ganador</p>
                                        <p className="text-2xl font-bold text-white">{winner}</p>
                                    </div>
                                )}

                                {/* Buttons */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={spinWheel}
                                        disabled={names.length < 2 || isSpinning}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {isSpinning ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Girando...
                                            </>
                                        ) : (
                                            <>
                                                <span>🎡</span>
                                                Girar Ruleta
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={quickPick}
                                        disabled={names.length < 1 || isSpinning}
                                        className="px-4 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 transition-all"
                                        title="Elegir al azar sin animación"
                                    >
                                        ⚡
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Groups Display */}
                                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <span>👥</span>
                                    Generador de Grupos
                                </h2>

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
                                    onClick={generateGroups}
                                    disabled={names.length < groupCount || isGenerating}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <span>🎲</span>
                                    {groups ? "Regenerar Grupos" : "Generar Grupos"}
                                </button>
                            </>
                        )}
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
