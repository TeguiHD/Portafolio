"use client";

import { useId, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Sparkles, Wrench } from "lucide-react";
import { CabeceraFinanzas } from "./Piezas";
import { BOTON, CAMPO, ERROR, GIRA, LISTA, MARCA, OPCION, OPCION_NO, SECCION, SUAVE, TARJETA, VACIO } from "./estilos";

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

const PRIORIDAD = {
    alta: { marca: "bg-red-500/10 text-red-400", texto: "Prioridad alta" },
    media: { marca: "bg-amber-500/10 text-amber-400", texto: "Prioridad media" },
    baja: { marca: "bg-[var(--fondo-2)] text-[var(--mut)]", texto: "Prioridad baja" },
};

const CATEGORIA = {
    ahorro: "Ahorro",
    gastos: "Gastos",
    ingresos: "Ingresos",
    deuda: "Deuda",
};

const PREGUNTAS = [
    "¿Cómo puedo reducir mis gastos?",
    "¿Estoy ahorrando lo suficiente?",
    "¿Qué categoría debería recortar?",
];

/** Lectura de la puntuación (0 a 100) con los mismos cortes que pintaban el anillo: siempre con texto. */
function nivel(score: number) {
    if (score >= 80) return { texto: "Sólida", color: "text-emerald-400", barra: "bg-emerald-500" };
    if (score >= 60) return { texto: "Aceptable", color: "text-amber-400", barra: "bg-amber-500" };
    if (score >= 40) return { texto: "Mejorable", color: "text-amber-400", barra: "bg-amber-500" };
    return { texto: "Débil", color: "text-red-400", barra: "bg-red-500" };
}

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

    // Recibe el texto: los atajos llamaban con el estado anterior (setQuestion aún no se aplicaba) y mandaban la
    // pregunta vieja o ninguna.
    const askQuestion = async (texto: string = question) => {
        if (!texto.trim()) return;

        setAskingQuestion(true);
        setAnswer(null);

        try {
            const res = await fetch("/api/finance/ai/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "question", question: texto }),
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

    const idPregunta = useId();
    const nivelActual = analysis ? nivel(analysis.puntuacion) : null;

    return (
        <div className="max-w-[1180px] space-y-12 pb-8">
            <CabeceraFinanzas titulo="Análisis con IA" bajada="Consejos a partir de tus transacciones, presupuestos y metas.">
                <button type="button" onClick={runAnalysis} disabled={loading} className={BOTON}>
                    {loading ? <span aria-hidden="true" className={GIRA} /> : <Sparkles aria-hidden="true" className="size-4" />}
                    {loading ? "Analizando…" : analysis ? "Actualizar análisis" : "Analizar mis finanzas"}
                </button>
            </CabeceraFinanzas>

            <div aria-live="polite" className="space-y-12">
                {error && <p role="alert" className={ERROR}>{error}</p>}

                {!analysis && !loading && !error && (
                    <p className={VACIO}>
                        Pulsa «Analizar mis finanzas»: la IA revisa tus transacciones, presupuestos y metas y te propone consejos.
                    </p>
                )}

                {analysis && nivelActual && (
                    <>
                        {/* Puntuación y resumen */}
                        <section aria-labelledby="ia-resumen" className="grid items-start gap-8 md:grid-cols-[220px_minmax(0,1fr)] md:gap-12">
                            <div>
                                <p className="m-0 text-sm text-[var(--mut)]">Puntuación financiera</p>
                                <p className="m-0 mt-1 flex items-baseline gap-2">
                                    <span className="text-5xl font-extrabold tracking-[-0.04em] text-[var(--txt)] tabular-nums">{analysis.puntuacion}</span>
                                    <span className="text-sm text-[var(--mut)]">de 100</span>
                                </p>
                                <div
                                    className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--linea-2)]"
                                    role="progressbar"
                                    aria-label="Puntuación financiera"
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={analysis.puntuacion}
                                >
                                    <div className={`h-full rounded-full ${nivelActual.barra}`} style={{ width: `${Math.min(Math.max(analysis.puntuacion, 0), 100)}%` }} />
                                </div>
                                <p className={`m-0 mt-2 text-sm font-medium ${nivelActual.color}`}>{nivelActual.texto}</p>
                            </div>
                            <div>
                                <h2 id="ia-resumen" className={`${SECCION} mb-2`}>Resumen</h2>
                                <p className="m-0 text-lg text-[var(--txt)]">{analysis.resumen}</p>
                                {analysis.siguiente_paso && (
                                    <div className="mt-5 flex items-start gap-3 border-t border-[var(--linea)] pt-4">
                                        <ArrowRight aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 text-[var(--acento)]" />
                                        <p className="m-0 text-[var(--txt)]">
                                            <span className="font-semibold">Siguiente paso: </span>
                                            {analysis.siguiente_paso}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Alertas */}
                        {analysis.alertas.length > 0 && (
                            <section aria-labelledby="ia-alertas">
                                <h2 id="ia-alertas" className={`${SECCION} mb-2`}>Alertas importantes</h2>
                                <ul className={`${LISTA} m-0 list-none p-0`}>
                                    {analysis.alertas.map((alerta, i) => (
                                        <li key={i} className="flex items-start gap-3 border-b border-[var(--linea)] px-1 py-3">
                                            <AlertTriangle aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 text-red-400" />
                                            <span className="text-[var(--txt)]">{alerta}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {/* Puntos fuertes y áreas de mejora */}
                        <div className="grid items-start gap-12 md:grid-cols-2">
                            <section aria-labelledby="ia-fuertes">
                                <h2 id="ia-fuertes" className={`${SECCION} mb-2`}>Puntos fuertes</h2>
                                <ul className={`${LISTA} m-0 list-none p-0`}>
                                    {analysis.puntos_fuertes.map((punto, i) => (
                                        <li key={i} className="flex items-start gap-3 border-b border-[var(--linea)] px-1 py-3">
                                            <CheckCircle2 aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 text-emerald-400" />
                                            <span className="text-[var(--txt)]">{punto}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                            <section aria-labelledby="ia-mejora">
                                <h2 id="ia-mejora" className={`${SECCION} mb-2`}>Áreas de mejora</h2>
                                <ul className={`${LISTA} m-0 list-none p-0`}>
                                    {analysis.areas_mejora.map((area, i) => (
                                        <li key={i} className="flex items-start gap-3 border-b border-[var(--linea)] px-1 py-3">
                                            <Wrench aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 text-amber-400" />
                                            <span className="text-[var(--txt)]">{area}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        </div>

                        {/* Consejos */}
                        <section aria-labelledby="ia-consejos">
                            <h2 id="ia-consejos" className={`${SECCION} mb-2`}>Consejos personalizados</h2>
                            <ul className={`${LISTA} m-0 list-none p-0`}>
                                {analysis.consejos.map((consejo, i) => {
                                    const prioridad = PRIORIDAD[consejo.prioridad] ?? PRIORIDAD.media;
                                    return (
                                        <li key={i} className="border-b border-[var(--linea)] px-1 py-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="m-0 mr-auto text-[15px] font-semibold text-[var(--txt)]">{consejo.titulo}</h3>
                                                <span className={`${MARCA} bg-[var(--fondo-2)] text-[var(--mut)]`}>{CATEGORIA[consejo.categoria] ?? consejo.categoria}</span>
                                                <span className={`${MARCA} ${prioridad.marca}`}>{prioridad.texto}</span>
                                            </div>
                                            <p className={`${SUAVE} m-0 mt-1.5`}>{consejo.descripcion}</p>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    </>
                )}
            </div>

            {/* Pregunta libre */}
            <section aria-labelledby={`${idPregunta}-t`} className={`${TARJETA} p-5 sm:p-6`}>
                <h2 id={`${idPregunta}-t`} className="m-0 text-base font-semibold text-[var(--txt)]">Pregunta sobre tus finanzas</h2>
                <form
                    className="mt-4 flex flex-col gap-3 sm:flex-row"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void askQuestion();
                    }}
                >
                    <label htmlFor={idPregunta} className="sr-only">Tu pregunta</label>
                    <input
                        id={idPregunta}
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ej: ¿Cómo puedo ahorrar más este mes?"
                        className={`${CAMPO} sm:flex-1`}
                    />
                    <button type="submit" disabled={askingQuestion || !question.trim()} className={BOTON}>
                        {askingQuestion ? <span aria-hidden="true" className={GIRA} /> : <ArrowRight aria-hidden="true" className="size-4" />}
                        {askingQuestion ? "Pensando…" : "Preguntar"}
                    </button>
                </form>

                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Preguntas frecuentes">
                    {PREGUNTAS.map((q) => (
                        <button
                            key={q}
                            type="button"
                            disabled={askingQuestion}
                            onClick={() => {
                                setQuestion(q);
                                void askQuestion(q);
                            }}
                            className={`${OPCION} ${OPCION_NO} disabled:opacity-50`}
                        >
                            {q}
                        </button>
                    ))}
                </div>

                <div aria-live="polite">
                    {answer && (
                        <p className="m-0 mt-5 border-t border-[var(--linea)] pt-4 whitespace-pre-wrap text-[var(--txt)]">{answer}</p>
                    )}
                </div>
            </section>
        </div>
    );
}
