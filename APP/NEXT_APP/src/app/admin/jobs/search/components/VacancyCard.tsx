"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Briefcase, MapPin, ExternalLink, ChevronRight, BrainCircuit } from "lucide-react";
import { SourceBadge } from "../../components/SourceBadge";
import { timeAgo } from "../../utils";
import { WORK_MODE_LABELS } from "../../types";
import type { VacancyItem } from "../../types";

const WORK_MODE_STYLE: Record<string, string> = {
    REMOTE:    "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    HYBRID:    "text-amber-300  bg-amber-500/10  border-amber-500/20",
    ONSITE:    "text-sky-300    bg-sky-500/10    border-sky-500/20",
    UNSPECIFIED: "text-neutral-400 bg-white/[0.03] border-white/10",
};

function MatchScore({ score }: { score: number | null }) {
    if (score === null) {
        return (
            <div className="text-right shrink-0">
                <div className="text-lg font-bold text-neutral-600">—</div>
                <div className="text-[9px] text-neutral-700 uppercase tracking-wider">Match</div>
            </div>
        );
    }
    const color = score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";
    return (
        <div className="text-right shrink-0">
            <div className={`text-xl font-bold ${color}`}>{score}%</div>
            <div className="text-[9px] text-neutral-500 uppercase tracking-wider">Match Score</div>
        </div>
    );
}

export function VacancyCard({ vacancy }: { vacancy: VacancyItem }) {
    const latest = vacancy.analyses[0];
    const matchScore = latest?.matchScore ?? null;
    const workMode = vacancy.workMode ?? "UNSPECIFIED";

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative flex flex-col h-full bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-cyan-500/30 rounded-xl p-5 backdrop-blur-md transition-all duration-200 cursor-default"
        >
            {/* Top row: status badge + match score */}
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded text-[10px] font-bold tracking-widest uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        NUEVA
                    </span>
                    {vacancy._count.analyses > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                            <BrainCircuit className="w-2.5 h-2.5" />
                            Analizada
                        </span>
                    )}
                </div>
                <MatchScore score={matchScore} />
            </div>

            {/* Title */}
            <h3 className="text-base font-bold text-white leading-snug line-clamp-2 mb-1 group-hover:text-cyan-200 transition-colors">
                {vacancy.title}
            </h3>

            {/* Company */}
            <p className="text-sm text-neutral-400 font-medium flex items-center gap-2 mb-4">
                <Briefcase className="w-3.5 h-3.5 shrink-0" />
                {vacancy.company}
            </p>

            {/* Tags row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-auto">
                <SourceBadge source={vacancy.source} />
                {workMode !== "UNSPECIFIED" && (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${WORK_MODE_STYLE[workMode]}`}>
                        <MapPin className="w-2.5 h-2.5" />
                        {WORK_MODE_LABELS[workMode]}
                    </span>
                )}
                {vacancy.location && (
                    <span className="text-[10px] text-neutral-500 bg-black/20 px-2 py-0.5 rounded border border-white/5 truncate max-w-[120px]">
                        {vacancy.location}
                    </span>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.06]">
                <Link
                    href={`/admin/jobs/analysis?vacancyId=${vacancy.id}`}
                    className="flex-1 py-2 flex items-center justify-center gap-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors"
                >
                    Analizar y Adaptar CV <ChevronRight className="w-3.5 h-3.5" />
                </Link>
                {vacancy.sourceUrl && (
                    <a
                        href={vacancy.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ver oferta original"
                        className="p-2 rounded-lg bg-white/[0.04] text-neutral-400 border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                )}
            </div>

            {/* Age */}
            <p className="text-[10px] text-neutral-700 mt-2 text-right">{timeAgo(vacancy.updatedAt)}</p>
        </motion.div>
    );
}
