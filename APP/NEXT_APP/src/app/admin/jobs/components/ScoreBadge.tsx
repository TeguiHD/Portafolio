import { scoreColor } from "../utils";

export function ScoreBadge({
    score,
    size = "sm",
    showLabel = false,
}: {
    score: number | null | undefined;
    size?: "xs" | "sm" | "md";
    showLabel?: boolean;
}) {
    if (score === null || score === undefined) {
        return (
            <span className="inline-flex items-center rounded-md border border-[var(--linea)] px-2 py-0.5 text-xs text-[var(--mut)]">
                Sin análisis
            </span>
        );
    }

    const style = scoreColor(score);
    const sizeClasses = {
        xs: "text-xs px-1.5 py-0.5",
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-2.5 py-1",
    }[size];

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-md border font-semibold tabular-nums ${sizeClasses} ${style.bg} ${style.text} ${style.border}`}
        >
            <span>{Math.round(score)}%{showLabel ? "," : ""}</span>
            <span className={showLabel ? "font-medium" : "sr-only"}>
                {showLabel ? "ajuste " : "de coincidencia, ajuste "}
                {style.label.toLowerCase()}
            </span>
        </span>
    );
}
