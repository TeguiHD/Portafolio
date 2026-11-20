import { scoreColor } from "../../utils";

export function MatchScoreGauge({ score }: { score: number }) {
    const clamped = Math.max(0, Math.min(100, score));
    const style = scoreColor(clamped);

    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    const dash = (clamped / 100) * circumference;

    // Colores del tema (cambian solos entre claro y oscuro): sube / aviso / baja.
    const strokeColor = clamped >= 70 ? "var(--sube)" : clamped >= 40 ? "#f59e0b" : "var(--baja)";

    return (
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative size-[132px] shrink-0">
                <svg viewBox="0 0 140 140" className="size-full -rotate-90" aria-hidden="true">
                    <circle cx={70} cy={70} r={radius} fill="none" stroke="var(--linea-2)" strokeWidth={10} />
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
                        className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
                    />
                </svg>
                <p className="absolute inset-0 m-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold tabular-nums tracking-[-0.03em] text-[var(--txt)]">
                        {Math.round(clamped)}%
                    </span>
                    <span className="text-xs text-[var(--mut)]">coincidencia</span>
                </p>
            </div>

            <div>
                <p className={`m-0 text-base font-semibold ${style.text}`}>Ajuste {style.label.toLowerCase()}</p>
                <p className="mt-1 max-w-sm text-sm text-[var(--mut)]">
                    {clamped >= 70
                        ? "Buen calce. Conviene postular y preparar la entrevista."
                        : clamped >= 40
                          ? "Calce parcial. Refuerza las brechas blandas antes de postular."
                          : "Calce bajo. Considera aprender las habilidades clave antes."}
                </p>
            </div>
        </div>
    );
}
