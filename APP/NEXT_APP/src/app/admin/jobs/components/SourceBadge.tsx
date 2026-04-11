import { SOURCE_LABELS } from "../types";

const SOURCE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    MANUAL: { bg: "bg-slate-500/10", text: "text-slate-300", border: "border-slate-500/30" },
    LINKEDIN: { bg: "bg-blue-500/10", text: "text-blue-300", border: "border-blue-500/30" },
    COMPUTRABAJO: { bg: "bg-orange-500/10", text: "text-orange-300", border: "border-orange-500/30" },
    LABORUM: { bg: "bg-purple-500/10", text: "text-purple-300", border: "border-purple-500/30" },
    FIRSTJOB: { bg: "bg-teal-500/10", text: "text-teal-300", border: "border-teal-500/30" },
    CHILE_EMPLEOS: { bg: "bg-red-500/10", text: "text-red-300", border: "border-red-500/30" },
    INDEED: { bg: "bg-indigo-500/10", text: "text-indigo-300", border: "border-indigo-500/30" },
    GETONBOARD: { bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/30" },
    TRABAJANDO: { bg: "bg-cyan-500/10", text: "text-cyan-300", border: "border-cyan-500/30" },
    CHILETRABAJOS: { bg: "bg-rose-500/10", text: "text-rose-300", border: "border-rose-500/30" },
    HIRELINE: { bg: "bg-violet-500/10", text: "text-violet-300", border: "border-violet-500/30" },
    TORRE: { bg: "bg-sky-500/10", text: "text-sky-300", border: "border-sky-500/30" },
    WORKANA: { bg: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/30" },
    TRABAJA_ESTADO: { bg: "bg-blue-600/10", text: "text-blue-300", border: "border-blue-600/30" },
    BNE: { bg: "bg-indigo-600/10", text: "text-indigo-300", border: "border-indigo-600/30" },
    OTHER: { bg: "bg-neutral-500/10", text: "text-neutral-300", border: "border-neutral-500/30" },
};

export function SourceBadge({ source }: { source: string }) {
    const style = SOURCE_STYLES[source] || SOURCE_STYLES.OTHER;
    const label = SOURCE_LABELS[source] || source;

    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}
        >
            {label}
        </span>
    );
}
