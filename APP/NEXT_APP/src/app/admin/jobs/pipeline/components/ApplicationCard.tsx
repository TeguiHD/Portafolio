"use client";

import {
    Building2,
    Send,
    Calendar,
    CheckCircle2,
    XCircle,
    Sparkles,
    ExternalLink,
    Eye,
    Trash2,
    Clock,
    Check,
    BrainCircuit,
    FileText,
} from "lucide-react";
import { ScoreBadge } from "../../components/ScoreBadge";
import { SourceBadge } from "../../components/SourceBadge";
import { timeAgo } from "../../utils";
import type { ApplicationItem, ApplicationStatus } from "../../types";

type StepperStage = { id: ApplicationStatus; label: string };

const STEPPER: StepperStage[] = [
    { id: "CV_ADAPTED", label: "CV Adaptado" },
    { id: "CV_SENT", label: "Enviado" },
    { id: "INTERVIEW", label: "Entrevista" },
    { id: "ACCEPTED", label: "Aceptado" },
];

// Which index in the stepper each status maps to (-1 = before first step, -2 = terminal failure)
const STATUS_IDX: Record<ApplicationStatus, number> = {
    PENDING: -1,
    CV_ADAPTED: 0,
    CV_SENT: 1,
    INTERVIEW: 2,
    ACCEPTED: 3,
    REJECTED: -2,
    CLOSED: -2,
};

type NextAction = {
    label: string;
    icon: React.ReactNode;
    colorClass: string;
};

const NEXT_ACTIONS: Partial<Record<ApplicationStatus, NextAction>> = {
    PENDING: {
        label: "Marcar Adaptado",
        icon: <Sparkles className="w-3 h-3" />,
        colorClass:
            "bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/30",
    },
    CV_ADAPTED: {
        label: "CV Enviado",
        icon: <Send className="w-3 h-3" />,
        colorClass:
            "bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/30",
    },
    CV_SENT: {
        label: "En Entrevista",
        icon: <Calendar className="w-3 h-3" />,
        colorClass:
            "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/30",
    },
    INTERVIEW: {
        label: "¡Oferta Aceptada!",
        icon: <CheckCircle2 className="w-3 h-3" />,
        colorClass:
            "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30",
    },
};

export function ApplicationCard({
    application,
    onMoveNext,
    onReject,
    onDelete,
    onOpenDetail,
    pending,
}: {
    application: ApplicationItem;
    onMoveNext: (app: ApplicationItem) => void;
    onReject: (app: ApplicationItem) => void;
    onDelete: (app: ApplicationItem) => void;
    onOpenDetail: (app: ApplicationItem) => void;
    pending?: boolean;
}) {
    const { status } = application;
    const stepIdx = STATUS_IDX[status] ?? -1;
    const isRejected = status === "REJECTED" || status === "CLOSED";
    const isAccepted = status === "ACCEPTED";
    const isTerminal = isRejected || isAccepted;
    const nextAction = NEXT_ACTIONS[status];

    return (
        <div
            className={`border rounded-xl p-5 backdrop-blur-md transition-all duration-300
                ${isRejected ? "opacity-60 grayscale bg-white/[0.02] border-white/5" : ""}
                ${isAccepted ? "border-emerald-500/20 bg-emerald-950/10" : ""}
                ${!isRejected && !isAccepted ? "bg-white/5 hover:bg-white/[0.08] border-white/10 hover:border-white/20" : ""}
                ${pending ? "opacity-50 pointer-events-none" : ""}
            `}
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">

                {/* Left — job info */}
                <div className="md:w-56 shrink-0 space-y-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <SourceBadge source={application.vacancy.source} />
                        {application.adaptation && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-purple-500/10 text-purple-300 border-purple-500/30">
                                <BrainCircuit className="w-3 h-3" />
                                IA
                            </span>
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">
                            {application.roleTitle || application.vacancy.title}
                        </h3>
                        <p className="text-xs text-neutral-400 font-medium mt-0.5 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">
                                {application.company || application.vacancy.company}
                            </span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {application.analysis && (
                            <ScoreBadge score={application.analysis.matchScore} size="xs" />
                        )}
                        <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(application.lastStatusAt)}
                        </span>
                    </div>
                    {application.cvVersion && (
                        <p className="text-[10px] text-neutral-600 flex items-center gap-1 truncate">
                            <FileText className="w-3 h-3 shrink-0" />
                            {application.cvVersion.name}
                        </p>
                    )}
                </div>

                {/* Center — visual stepper */}
                <div className="flex-1 w-full min-w-0 py-3">
                    <div className="relative flex items-center justify-between px-3">
                        {/* Background line */}
                        <div className="absolute left-7 right-7 top-4 h-0.5 bg-white/10 z-0" />
                        {/* Active progress line */}
                        {!isRejected && stepIdx > 0 && (
                            <div
                                className="absolute left-7 top-4 h-0.5 bg-cyan-500/70 z-0 transition-all duration-700"
                                style={{
                                    width: `calc(${(stepIdx / (STEPPER.length - 1)) * 100}% - 3.5rem)`,
                                }}
                            />
                        )}

                        {STEPPER.map((stage, idx) => {
                            const isCompleted = !isRejected && idx <= stepIdx;
                            const isCurrent = !isRejected && idx === stepIdx;
                            const isLastNode = idx === STEPPER.length - 1;

                            let circleClass =
                                "w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 relative transition-all duration-300 bg-[#0a0f1c] shrink-0";
                            let stageIcon: React.ReactNode = (
                                <div className="w-2 h-2 rounded-full bg-slate-700" />
                            );
                            let labelClass =
                                "absolute top-10 text-[9px] font-bold uppercase tracking-wide text-center left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none";

                            if (isRejected && isLastNode) {
                                circleClass += " border-red-500 text-red-400 bg-red-500/10";
                                stageIcon = <XCircle className="w-3.5 h-3.5" />;
                                labelClass += " text-red-400";
                            } else if (isAccepted && isLastNode) {
                                circleClass +=
                                    " border-emerald-500 text-emerald-400 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.4)]";
                                stageIcon = <CheckCircle2 className="w-3.5 h-3.5" />;
                                labelClass += " text-emerald-400";
                            } else if (isCompleted) {
                                circleClass += " border-cyan-500 text-cyan-400";
                                if (isCurrent) {
                                    circleClass +=
                                        " shadow-[0_0_12px_rgba(34,211,238,0.35)]";
                                }
                                stageIcon = <Check className="w-3.5 h-3.5" />;
                                labelClass += " text-cyan-400";
                            } else {
                                circleClass += " border-white/15 text-slate-600";
                                labelClass += " text-slate-600";
                            }

                            return (
                                <div
                                    key={stage.id}
                                    className="relative flex flex-col items-center"
                                    style={{ minWidth: "2rem" }}
                                >
                                    <div className={circleClass}>{stageIcon}</div>
                                    <span className={labelClass}>
                                        {isRejected && isLastNode
                                            ? "Rechazado"
                                            : stage.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right — actions */}
                <div className="md:w-40 shrink-0 flex flex-col gap-1.5">
                    {!isTerminal && nextAction && (
                        <button
                            onClick={() => onMoveNext(application)}
                            disabled={pending}
                            className={`w-full py-2 rounded-lg text-xs font-bold border transition-colors flex justify-center items-center gap-1.5 ${nextAction.colorClass}`}
                        >
                            {nextAction.icon}
                            {nextAction.label}
                        </button>
                    )}
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => onOpenDetail(application)}
                            className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                        >
                            <Eye className="w-3 h-3" /> Detalle
                        </button>
                        {application.vacancy.sourceUrl && (
                            <a
                                href={application.vacancy.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 border border-white/10 transition-colors"
                                title="Ver oferta original"
                            >
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>
                    {!isRejected && (
                        <button
                            onClick={() => onReject(application)}
                            disabled={pending}
                            className="w-full py-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 border border-transparent hover:border-red-500/20 transition-colors"
                        >
                            <XCircle className="w-3 h-3" /> Marcar Rechazado
                        </button>
                    )}
                    {isTerminal && (
                        <button
                            onClick={() => onDelete(application)}
                            disabled={pending}
                            className="w-full py-1.5 text-neutral-600 hover:text-red-300 hover:bg-red-500/5 rounded-lg text-[11px] flex items-center justify-center gap-1 border border-transparent hover:border-red-500/10 transition-colors"
                        >
                            <Trash2 className="w-3 h-3" /> Eliminar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
