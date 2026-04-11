"use client";

import { BookOpen, Lightbulb, ShieldCheck } from "lucide-react";

export function LearningPlanCard({
    learningPlan,
    recommendations,
}: {
    learningPlan: string[];
    recommendations: string[];
}) {
    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-cyan-300 shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-sm font-bold text-cyan-300 mb-1">Politica de integridad</h3>
                    <p className="text-xs text-cyan-100/80">
                        Las brechas duras quedan como sugerencia de aprendizaje. Nunca se agregan al CV como
                        experiencia real: no se inventa experiencia, certificaciones ni conocimientos.
                    </p>
                </div>
            </div>

            {learningPlan.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-[#0a0f1c]/60 backdrop-blur-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <BookOpen className="w-4 h-4 text-accent-1" />
                        <h3 className="text-sm font-bold text-white">Plan de aprendizaje sugerido</h3>
                    </div>
                    <ul className="space-y-2">
                        {learningPlan.map((item, index) => (
                            <li
                                key={`${item}-${index}`}
                                className="flex items-start gap-2 text-sm text-neutral-300"
                            >
                                <span className="w-5 h-5 shrink-0 rounded-md border border-white/10 text-[10px] font-bold text-neutral-500 flex items-center justify-center">
                                    {index + 1}
                                </span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {recommendations.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-[#0a0f1c]/60 backdrop-blur-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-4 h-4 text-amber-300" />
                        <h3 className="text-sm font-bold text-white">Recomendaciones</h3>
                    </div>
                    <ul className="space-y-2">
                        {recommendations.map((item, index) => (
                            <li
                                key={`${item}-${index}`}
                                className="flex items-start gap-2 text-sm text-neutral-300"
                            >
                                <span className="text-amber-300 shrink-0">&bull;</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
