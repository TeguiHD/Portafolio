"use client";

import { useId } from "react";
import { ShieldCheck } from "lucide-react";
import { TITULO } from "../../estilos";

export function LearningPlanCard({
    learningPlan,
    recommendations,
}: {
    learningPlan: string[];
    recommendations: string[];
}) {
    const id = useId();
    return (
        <div className="space-y-10">
            <p className="flex max-w-[70ch] items-start gap-2.5 text-sm text-[var(--mut)]">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--acento)]" aria-hidden="true" />
                <span>
                    <strong className="font-semibold text-[var(--txt)]">Sin inventos.</strong> Las brechas duras quedan como
                    sugerencia de aprendizaje: nunca se agregan al CV como experiencia, certificación ni conocimiento.
                </span>
            </p>

            {learningPlan.length > 0 && (
                <section aria-labelledby={`${id}-plan`}>
                    <h3 id={`${id}-plan`} className={`${TITULO} mb-2`}>Plan de aprendizaje sugerido</h3>
                    <ol className="border-t border-[var(--linea)]">
                        {learningPlan.map((item, index) => (
                            <li
                                key={`${item}-${index}`}
                                className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2 border-b border-[var(--linea)] py-3 text-sm text-[var(--txt)]"
                            >
                                <span className="font-mono text-xs tabular-nums leading-5 text-[var(--mut)]">{index + 1}.</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ol>
                </section>
            )}

            {recommendations.length > 0 && (
                <section aria-labelledby={`${id}-recom`}>
                    <h3 id={`${id}-recom`} className={`${TITULO} mb-2`}>Recomendaciones</h3>
                    <ul className="border-t border-[var(--linea)]">
                        {recommendations.map((item, index) => (
                            <li key={`${item}-${index}`} className="border-b border-[var(--linea)] py-3 text-sm text-[var(--txt)]">
                                {item}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
