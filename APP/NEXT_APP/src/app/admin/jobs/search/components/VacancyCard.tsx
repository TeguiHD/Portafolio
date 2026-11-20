import Link from "next/link";
import { Building2, MapPin, ExternalLink, ChevronRight } from "lucide-react";
import { SourceBadge } from "../../components/SourceBadge";
import { scoreColor, timeAgo } from "../../utils";
import { WORK_MODE_LABELS } from "../../types";
import type { VacancyItem } from "../../types";
import { BOTON_ICONO, BOTON_SEC, CHIP } from "../../estilos";

function MatchScore({ score }: { score: number | null }) {
    if (score === null) {
        return (
            <p className="m-0 text-right">
                <span className="block font-mono text-lg font-semibold text-[var(--mut)]" aria-hidden="true">—</span>
                <span className="text-xs text-[var(--mut)]">Sin análisis</span>
            </p>
        );
    }
    const style = scoreColor(score);
    return (
        <p className="m-0 text-right">
            <span className={`block text-xl font-bold tabular-nums ${style.text}`}>{score}%</span>
            <span className="text-xs text-[var(--mut)]">Coincidencia · ajuste {style.label.toLowerCase()}</span>
        </p>
    );
}

/** Una vacante como fila de la lista de búsqueda. */
export function VacancyCard({ vacancy }: { vacancy: VacancyItem }) {
    const latest = vacancy.analyses[0];
    const matchScore = latest?.matchScore ?? null;
    const workMode = vacancy.workMode ?? "UNSPECIFIED";

    return (
        <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 border-b border-[var(--linea)] px-0.5 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
            <div className="min-w-0">
                <h3 className="m-0 text-base font-semibold leading-snug text-[var(--txt)]">{vacancy.title}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--mut)]">
                    <Building2 className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{vacancy.company}</span>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <SourceBadge source={vacancy.source} />
                    {workMode !== "UNSPECIFIED" && (
                        <span className={CHIP}>{WORK_MODE_LABELS[workMode]}</span>
                    )}
                    {vacancy.location && (
                        <span className={`${CHIP} max-w-[16rem]`}>
                            <MapPin className="size-3 shrink-0" aria-hidden="true" />
                            <span className="truncate">{vacancy.location}</span>
                        </span>
                    )}
                    {vacancy._count.analyses > 0 && <span className={CHIP}>Analizada</span>}
                    <time dateTime={vacancy.updatedAt} className="font-mono text-xs text-[var(--mut)]">
                        {timeAgo(vacancy.updatedAt)}
                    </time>
                </div>
            </div>

            <MatchScore score={matchScore} />

            <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                <Link
                    href={`/admin/jobs/analysis?vacancyId=${vacancy.id}`}
                    className={`${BOTON_SEC} flex-1 sm:flex-none`}
                >
                    Analizar y adaptar CV
                    <ChevronRight className="size-4" aria-hidden="true" />
                    <span className="sr-only">: {vacancy.title}</span>
                </Link>
                {vacancy.sourceUrl && (
                    <a
                        href={vacancy.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Ver la oferta original de ${vacancy.title} (se abre en otra pestaña)`}
                        className={BOTON_ICONO}
                    >
                        <ExternalLink className="size-4" aria-hidden="true" />
                    </a>
                )}
            </div>
        </li>
    );
}
