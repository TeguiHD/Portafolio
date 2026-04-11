"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
    X,
    Building2,
    ExternalLink,
    Clock,
    Sparkles,
    FileText,
    GitCompareArrows,
    MessageSquarePlus,
    CheckCircle2,
    ArrowRight,
} from "lucide-react";
import { ScoreBadge } from "../../components/ScoreBadge";
import { formatDate } from "../../utils";
import { STATUS_LABELS } from "../../types";
import type { ApplicationItem, ApplicationStatus } from "../../types";
import { addApplicationNoteAction } from "../actions";

const STATUS_STYLE: Record<ApplicationStatus, string> = {
    PENDING: "text-blue-300",
    CV_ADAPTED: "text-purple-300",
    CV_SENT: "text-sky-300",
    INTERVIEW: "text-amber-300",
    ACCEPTED: "text-emerald-300",
    REJECTED: "text-red-300",
    CLOSED: "text-neutral-400",
};

export function ApplicationDetailModal({
    application,
    onClose,
}: {
    application: ApplicationItem;
    onClose: () => void;
}) {
    const [noteText, setNoteText] = useState("");
    const [pending, startTransition] = useTransition();

    function handleAddNote() {
        if (!noteText.trim()) {
            toast.error("La nota no puede estar vacia");
            return;
        }

        startTransition(async () => {
            const result = await addApplicationNoteAction(application.id, noteText);
            if ("error" in result) {
                toast.error(result.error);
                return;
            }
            toast.success("Nota agregada");
            setNoteText("");
        });
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-start justify-center overflow-y-auto p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-900 border border-white/10 rounded-3xl max-w-3xl w-full my-8 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between p-6 border-b border-white/5">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <span
                                    className={`text-[10px] uppercase font-bold tracking-wider ${STATUS_STYLE[application.status]}`}
                                >
                                    {STATUS_LABELS[application.status]}
                                </span>
                                {application.analysis && (
                                    <ScoreBadge
                                        score={application.analysis.matchScore}
                                        size="xs"
                                        showLabel
                                    />
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-white">
                                {application.roleTitle || application.vacancy.title}
                            </h2>
                            <p className="text-sm text-neutral-400 mt-1 flex items-center gap-1">
                                <Building2 className="w-4 h-4" />
                                {application.company || application.vacancy.company}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                            aria-label="Cerrar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                        {/* Meta info */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                            {application.cvVersion && (
                                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                    <div className="flex items-center gap-1 text-neutral-500 mb-1">
                                        <FileText className="w-3 h-3" />
                                        CV usado
                                    </div>
                                    <div className="text-neutral-200 font-medium truncate">
                                        {application.cvVersion.name}
                                    </div>
                                </div>
                            )}
                            {application.adaptation && (
                                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                    <div className="flex items-center gap-1 text-neutral-500 mb-1">
                                        <Sparkles className="w-3 h-3" />
                                        Adaptacion
                                    </div>
                                    <div className="text-neutral-200 font-medium">
                                        {application.adaptation.mode === "AUTO" ? "Automatica" : "Asistida"}
                                    </div>
                                </div>
                            )}
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                <div className="flex items-center gap-1 text-neutral-500 mb-1">
                                    <Clock className="w-3 h-3" />
                                    Ultimo cambio
                                </div>
                                <div className="text-neutral-200 font-medium">
                                    {formatDate(application.lastStatusAt)}
                                </div>
                            </div>
                        </div>

                        {/* Quick links */}
                        <div className="flex flex-wrap gap-2">
                            {application.vacancy.sourceUrl && (
                                <a
                                    href={application.vacancy.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-neutral-300 border border-white/10 text-xs hover:bg-white/10 transition-colors"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    Ver vacante original
                                </a>
                            )}
                            <a
                                href={`/admin/jobs/analysis?vacancyId=${application.vacancy.id}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-1/15 text-accent-1 border border-accent-1/25 text-xs hover:bg-accent-1/25 transition-colors"
                            >
                                <GitCompareArrows className="w-3 h-3" />
                                Ver analisis
                            </a>
                        </div>

                        {/* Missing skills */}
                        {application.analysis && application.analysis.missingSkills.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-white mb-2">
                                    Skills faltantes identificadas
                                </h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {application.analysis.missingSkills.map((skill) => (
                                        <span
                                            key={skill}
                                            className="text-xs px-2 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {application.notes && (
                            <div>
                                <h3 className="text-sm font-semibold text-white mb-2">Notas</h3>
                                <p className="text-sm text-neutral-300 bg-white/[0.02] border border-white/5 rounded-xl p-3 whitespace-pre-wrap">
                                    {application.notes}
                                </p>
                            </div>
                        )}

                        {/* Add note */}
                        <div>
                            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                                <MessageSquarePlus className="w-4 h-4" />
                                Agregar nota al historial
                            </h3>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    placeholder="Ej: Respondieron, agendada entrevista para el jueves"
                                    maxLength={500}
                                    className="flex-1 rounded-xl bg-[#0f172a] border border-white/10 px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-accent-1/40 focus:outline-none"
                                />
                                <button
                                    onClick={handleAddNote}
                                    disabled={pending || !noteText.trim()}
                                    className="px-4 py-2 rounded-xl bg-accent-1/20 text-accent-1 border border-accent-1/30 text-sm font-semibold hover:bg-accent-1/30 transition-colors disabled:opacity-50"
                                >
                                    {pending ? "..." : "Agregar"}
                                </button>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div>
                            <h3 className="text-sm font-semibold text-white mb-3">Timeline</h3>
                            <div className="space-y-2">
                                {application.events.length === 0 && (
                                    <p className="text-xs text-neutral-500">Sin eventos registrados</p>
                                )}
                                {application.events.map((event) => (
                                    <div
                                        key={event.id}
                                        className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5"
                                    >
                                        <CheckCircle2 className="w-4 h-4 text-accent-1 mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 text-xs">
                                                {event.fromStatus ? (
                                                    <>
                                                        <span className="text-neutral-500">
                                                            {STATUS_LABELS[event.fromStatus]}
                                                        </span>
                                                        <ArrowRight className="w-3 h-3 text-neutral-600" />
                                                    </>
                                                ) : (
                                                    <span className="text-neutral-500">Inicio</span>
                                                )}
                                                <span
                                                    className={`font-semibold ${STATUS_STYLE[event.toStatus]}`}
                                                >
                                                    {STATUS_LABELS[event.toStatus]}
                                                </span>
                                                <span className="text-neutral-600 ml-auto">
                                                    {formatDate(event.createdAt)}
                                                </span>
                                            </div>
                                            {event.note && (
                                                <p className="text-xs text-neutral-300 mt-1">{event.note}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
