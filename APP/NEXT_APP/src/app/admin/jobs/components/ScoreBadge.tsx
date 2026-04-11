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
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold text-neutral-500 bg-white/5 border border-white/10">
                Sin analisis
            </span>
        );
    }

    const style = scoreColor(score);
    const sizeClasses = {
        xs: "text-[10px] px-1.5 py-0.5",
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-2.5 py-1",
    }[size];

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-md font-bold border ${sizeClasses} ${style.bg} ${style.text} ${style.border}`}
        >
            <span>{Math.round(score)}%</span>
            {showLabel && <span className="font-medium opacity-80">· {style.label}</span>}
        </span>
    );
}
