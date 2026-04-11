"use client";

import { scoreColor } from "../../utils";

export function MatchScoreGauge({ score }: { score: number }) {
    const clamped = Math.max(0, Math.min(100, score));
    const style = scoreColor(clamped);

    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    const dash = (clamped / 100) * circumference;

    const strokeColor =
        clamped >= 70 ? "#10b981" : clamped >= 40 ? "#f59e0b" : "#ef4444";

    return (
        <div className="flex items-center gap-5">
            <div className="relative w-[140px] h-[140px] shrink-0">
                <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                    <circle
                        cx={70}
                        cy={70}
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth={10}
                    />
                    <circle
                        cx={70}
                        cy={70}
                        r={radius}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={10}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - dash}
                        style={{ transition: "stroke-dashoffset 700ms ease-out" }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-extrabold ${style.text}`}>
                        {Math.round(clamped)}%
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
                        match
                    </span>
                </div>
            </div>

            <div>
                <div
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${style.bg} ${style.text} ${style.border}`}
                >
                    Ajuste {style.label}
                </div>
                <p className="text-xs text-neutral-400 mt-2 max-w-xs">
                    {clamped >= 70
                        ? "Excelente ajuste. Prioriza postular y prepara la entrevista."
                        : clamped >= 40
                          ? "Ajuste parcial. Refuerza las brechas blandas antes de postular."
                          : "Ajuste bajo. Considera aprender habilidades clave antes."}
                </p>
            </div>
        </div>
    );
}
