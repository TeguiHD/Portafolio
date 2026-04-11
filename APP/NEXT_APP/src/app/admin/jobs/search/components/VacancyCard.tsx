"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink, BarChart3, GitCompareArrows, FileText, MapPin, Building2 } from "lucide-react";
import { SourceBadge } from "../../components/SourceBadge";
import { ScoreBadge } from "../../components/ScoreBadge";
import { timeAgo } from "../../utils";
import type { VacancyItem } from "../../types";

export function VacancyCard({ vacancy }: { vacancy: VacancyItem }) {
    const latest = vacancy.analyses[0];
    const matchScore = latest?.matchScore ?? null;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative p-5 rounded-2xl bg-[#111827]/80 hover:bg-[#1f2937]/90 border border-white/5 hover:border-white/20 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 backdrop-blur-md"
        >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-1/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="relative z-10 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <SourceBadge source={vacancy.source} />
                        <h3 className="text-base font-semibold text-white leading-tight line-clamp-2 group-hover:text-accent-1 transition-colors">
                            {vacancy.title}
                        </h3>
                    </div>
                    <ScoreBadge score={matchScore} />
                </div>

                {/* Company & location */}
                <div className="space-y-1.5">
                    <p className="text-xs text-neutral-400 flex items-center gap-1.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        {vacancy.company}
                    </p>
                    {vacancy.location && (
                        <p className="text-xs text-neutral-500 flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                            {vacancy.location}
                        </p>
                    )}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 text-[11px] text-neutral-500 pt-1 border-t border-white/5">
                    <span className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        {vacancy._count.analyses} analisis
                    </span>
                    <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {vacancy._count.applications} postulaciones
                    </span>
                    <span className="ml-auto">{timeAgo(vacancy.updatedAt)}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                    <Link
                        href={`/admin/jobs/analysis?vacancyId=${vacancy.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-accent-1/15 text-accent-1 border border-accent-1/25 text-xs font-semibold hover:bg-accent-1/25 transition-colors"
                    >
                        <GitCompareArrows className="w-3.5 h-3.5" />
                        Analizar
                    </Link>
                    {vacancy.sourceUrl && (
                        <a
                            href={vacancy.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center p-2 rounded-lg bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
                            title="Ver original"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
