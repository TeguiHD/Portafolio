"use client";

import { useState } from "react";

interface Analysis {
    resumen: string;
    puntuacion: number;
    puntos_fuertes: string[];
    areas_mejora: string[];
    consejos: Array<{
        titulo: string;
        descripcion: string;
        prioridad: "alta" | "media" | "baja";
        categoria: "ahorro" | "gastos" | "ingresos" | "deuda";
    }>;
    alertas: string[];
    siguiente_paso: string;
}

interface AnalysisResponse {
    success: boolean;
    analysis?: Analysis;
    error?: string;
    latencyMs: number;
}

const PRIORITY_CONFIG = {
    alta: { bg: "bg-red-500/20", border: "border-red-500/30", text: "text-red-400", label: "Alta" },
    media: { bg: "bg-yellow-500/20", border: "border-yellow-500/30", text: "text-yellow-400", label: "Media" },
    baja: { bg: "bg-blue-500/20", border: "border-blue-500/30", text: "text-blue-400", label: "Baja" },
};

const CATEGORY_ICONS = {
    ahorro: "💰",
    gastos: "💸",
    ingresos: "📈",
    deuda: "📊",
};

export function AIAnalysis() {
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState<string | null>(null);
    const [askingQuestion, setAskingQuestion] = useState(false);

    const runAnalysis = async () => {
        setLoading(true);
        setError(null);
        setAnalysis(null);

        try {
            const res = await fetch("/api/finance/ai/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "analyze" }),
            });

            const data: AnalysisResponse = await res.json();

            if (!data.success) {
                throw new Error(data.error || "Error en el análisis");
            }

            setAnalysis(data.analysis!);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const askQuestion = async () => {
        if (!question.trim()) return;

        setAskingQuestion(true);
        setAnswer(null);

        try {
            const res = await fetch("/api/finance/ai/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "question", question }),
            });

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.error || "Error al responder");
            }

            setAnswer(data.answer);
        } catch {
            setAnswer("Lo siento, no pude procesar tu pregunta. Intenta de nuevo.");
        } finally {
            setAskingQuestion(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-400";
        if (score >= 60) return "text-yellow-400";
        if (score >= 40) return "text-orange-400";
        return "text-red-400";
    };

    const getScoreGradient = (score: number) => {
        if (score >= 80) return "from-green-500 to-emerald-500";
        if (score >= 60) return "from-yellow-500 to-amber-500";
        if (score >= 40) return "from-orange-500 to-amber-500";
        return "from-red-500 to-rose-500";
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">🤖</span>
                        Análisis con IA
                    </h2>
                    <p className="text-gray-400 mt-1">
                        Obtén consejos personalizados basados en tus datos financieros
                    </p>
                </div>
                <button
                    onClick={runAnalysis}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600
                             text-white font-medium rounded-xl hover:from-purple-500 hover:to-blue-500
                             disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Analizando...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            {analysis ? "Actualizar análisis" : "Analizar mis finanzas"}
                        </>
                    )}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">
                    {error}
                </div>
            )}

            {/* Analysis Results */}
            {analysis && (
                <div className="space-y-6">
                    {/* Score & Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6 text-center">
                            <p className="text-sm text-gray-400 mb-3">Puntuación Financiera</p>
                            <div className="relative w-24 h-24 mx-auto">
                                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                                    <circle
                                        cx="18"
                                        cy="18"
                                        r="16"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        className="text-gray-800"
                                    />
                                    <circle
                                        cx="18"
                                        cy="18"
                                        r="16"
                                        fill="none"
                                        stroke="url(#scoreGradient)"
                                        strokeWidth="3"
                                        strokeDasharray={`${analysis.puntuacion} 100`}
                                        strokeLinecap="round"
                                    />
                                    <defs>
                                        <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" className={`${getScoreGradient(analysis.puntuacion).split(" ")[0].replace("from-", "stop-")}`} />
                                            <stop offset="100%" className={`${getScoreGradient(analysis.puntuacion).split(" ")[1].replace("to-", "stop-")}`} />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className={`text-3xl font-bold ${getScoreColor(analysis.puntuacion)}`}>
                                        {analysis.puntuacion}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6">
                            <p className="text-sm text-gray-400 mb-2">Resumen</p>
                            <p className="text-white text-lg">{analysis.resumen}</p>
                            {analysis.siguiente_paso && (
                                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                                    <p className="text-sm text-blue-400 font-medium">📌 Siguiente paso:</p>
                                    <p className="text-gray-300 mt-1">{analysis.siguiente_paso}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Alerts */}
                    {analysis.alertas.length > 0 && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl space-y-2">
                            <h4 className="text-red-400 font-semibold flex items-center gap-2">
                                ⚠️ Alertas importantes
                            </h4>
                            {analysis.alertas.map((alerta, i) => (
                                <p key={i} className="text-gray-300 pl-6">• {alerta}</p>
                            ))}
                        </div>
                    )}

                    {/* Strengths & Improvements */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6">
                            <h4 className="text-green-400 font-semibold mb-4 flex items-center gap-2">
                                ✅ Puntos fuertes
                            </h4>
                            <ul className="space-y-2">
                                {analysis.puntos_fuertes.map((punto, i) => (
                                    <li key={i} className="text-gray-300 flex items-start gap-2">
                                        <span className="text-green-400 mt-1">•</span>
                                        {punto}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6">
                            <h4 className="text-yellow-400 font-semibold mb-4 flex items-center gap-2">
                                🔧 Áreas de mejora
                            </h4>
                            <ul className="space-y-2">
                                {analysis.areas_mejora.map((area, i) => (
                                    <li key={i} className="text-gray-300 flex items-start gap-2">
                                        <span className="text-yellow-400 mt-1">•</span>
                                        {area}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Consejos */}
                    <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6">
                        <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                            💡 Consejos personalizados
                        </h4>
                        <div className="grid gap-4">
                            {analysis.consejos.map((consejo, i) => {
                                const priority = PRIORITY_CONFIG[consejo.prioridad];
                                return (
                                    <div
                                        key={i}
                                        className={`p-4 rounded-xl border ${priority.bg} ${priority.border}`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3">
                                                <span className="text-2xl">{CATEGORY_ICONS[consejo.categoria]}</span>
                                                <div>
                                                    <h5 className="text-white font-medium">{consejo.titulo}</h5>
                                                    <p className="text-gray-300 text-sm mt-1">{consejo.descripcion}</p>
                                                </div>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full ${priority.bg} ${priority.text}`}>
                                                {priority.label}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Ask a Question */}
            <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                    💬 Pregunta sobre tus finanzas
                </h4>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && askQuestion()}
                        placeholder="Ej: ¿Cómo puedo ahorrar más este mes?"
                        className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl
                                 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <button
                        onClick={askQuestion}
                        disabled={askingQuestion || !question.trim()}
                        className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500
                                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {askingQuestion ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        )}
                    </button>
                </div>

                {answer && (
                    <div className="mt-4 p-4 bg-gray-800/50 rounded-xl">
                        <p className="text-gray-300 whitespace-pre-wrap">{answer}</p>
                    </div>
                )}

                {/* Quick Questions */}
                <div className="mt-4 flex flex-wrap gap-2">
                    {[
                        "¿Cómo puedo reducir mis gastos?",
                        "¿Estoy ahorrando lo suficiente?",
                        "¿Qué categoría debería recortar?",
                    ].map((q) => (
                        <button
                            key={q}
                            onClick={() => {
                                setQuestion(q);
                                askQuestion();
                            }}
                            className="text-sm px-3 py-1.5 bg-gray-800/50 text-gray-400 rounded-lg
                                     hover:text-white hover:bg-gray-700/50 transition-colors"
                        >
                            {q}
                        </button>
                    ))}
                </div>
            </div>

            {/* Empty State */}
            {!analysis && !loading && (
                <div className="text-center py-12 bg-gray-900/30 rounded-2xl border border-dashed border-gray-800">
                    <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">🧠</span>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Análisis Inteligente</h3>
                    <p className="text-gray-400 max-w-md mx-auto mb-6">
                        Nuestra IA analizará tus transacciones, presupuestos y metas para darte
                        consejos personalizados y ayudarte a mejorar tus finanzas.
                    </p>
                    <button
                        onClick={runAnalysis}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white
                                 font-medium rounded-xl hover:from-purple-500 hover:to-blue-500 transition-all"
                    >
                        Comenzar análisis
                    </button>
                </div>
            )}
        </div>
    );
}
