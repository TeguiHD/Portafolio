"use client";

import { AlertTriangle, CheckCircle2, Eye } from "lucide-react";
import { LISTA, MARCA, SECCION, VACIO } from "./estilos";

export interface Insight {
    type: string;
    icon: string;
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
}

interface InsightsCardProps {
    insights: Insight[];
}

// El ícono y el color salen de la prioridad (siempre con su texto); el emoji que manda la API no se usa.
const IMPACTO = {
    high: { icono: AlertTriangle, color: "text-red-400", marca: "bg-red-500/10 text-red-400", texto: "Alta prioridad" },
    medium: { icono: Eye, color: "text-amber-400", marca: "bg-amber-500/10 text-amber-400", texto: "Revisar" },
    low: { icono: CheckCircle2, color: "text-emerald-400", marca: "bg-emerald-500/10 text-emerald-400", texto: "Positivo" },
};

export function InsightsCard({ insights }: InsightsCardProps) {
    return (
        <section aria-labelledby="fin-observaciones">
            <h2 id="fin-observaciones" className={`${SECCION} mb-3`}>Observaciones del mes</h2>
            {insights.length === 0 ? (
                <div className={VACIO}>
                    <p className="m-0">No hay observaciones este mes.</p>
                    <p className="m-0 mt-1 text-sm">Sigue registrando transacciones para obtener análisis.</p>
                </div>
            ) : (
                <ul className={`${LISTA} m-0 list-none p-0`}>
                    {insights.map((insight, index) => {
                        const estilo = IMPACTO[insight.impact] ?? IMPACTO.medium;
                        const Icono = estilo.icono;
                        return (
                            <li key={index} className="flex items-start gap-3 border-b border-[var(--linea)] px-1 py-3.5">
                                <Icono aria-hidden="true" className={`mt-0.5 size-[18px] shrink-0 ${estilo.color}`} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="m-0 text-[15px] font-medium text-[var(--txt)]">{insight.title}</h3>
                                        <span className={`${MARCA} ${estilo.marca}`}>{estilo.texto}</span>
                                    </div>
                                    <p className="m-0 mt-1 text-sm text-[var(--mut)]">{insight.description}</p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
