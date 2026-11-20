"use client";

import {
    Building2,
    Send,
    CalendarClock,
    CircleCheck,
    CircleX,
    Sparkles,
    ExternalLink,
    Eye,
    Trash2,
    Check,
    FileText,
} from "lucide-react";
import { ScoreBadge } from "../../components/ScoreBadge";
import { SourceBadge } from "../../components/SourceBadge";
import { timeAgo } from "../../utils";
import { STATUS_LABELS } from "../../types";
import type { ApplicationItem, ApplicationStatus } from "../../types";
import { BOTON_ICONO, BOTON_PELIGRO, BOTON_SEC, CHIP } from "../../estilos";

type StepperStage = { id: ApplicationStatus; label: string };

const STEPPER: StepperStage[] = [
    { id: "CV_ADAPTED", label: "CV adaptado" },
    { id: "CV_SENT", label: "Enviado" },
    { id: "INTERVIEW", label: "Entrevista" },
    { id: "ACCEPTED", label: "Aceptado" },
];

// Paso del avance que corresponde a cada estado (-1 = antes del primero, -2 = cerrada sin éxito)
const STATUS_IDX: Record<ApplicationStatus, number> = {
    PENDING: -1,
    CV_ADAPTED: 0,
    CV_SENT: 1,
    INTERVIEW: 2,
    ACCEPTED: 3,
    REJECTED: -2,
    CLOSED: -2,
};

type NextAction = { label: string; icon: React.ReactNode };

const NEXT_ACTIONS: Partial<Record<ApplicationStatus, NextAction>> = {
    PENDING: { label: "Marcar CV adaptado", icon: <Sparkles className="size-4" aria-hidden="true" /> },
    CV_ADAPTED: { label: "Marcar CV enviado", icon: <Send className="size-4" aria-hidden="true" /> },
    CV_SENT: { label: "Pasar a entrevista", icon: <CalendarClock className="size-4" aria-hidden="true" /> },
    INTERVIEW: { label: "Marcar oferta aceptada", icon: <CircleCheck className="size-4" aria-hidden="true" /> },
};

/** Una postulación como fila: datos, avance por pasos y acciones. */
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
    const titulo = application.roleTitle || application.vacancy.title;

    return (
        <li
            aria-busy={pending || undefined}
            className={`grid grid-cols-1 gap-5 border-b border-[var(--linea)] px-0.5 py-5 transition-opacity duration-150 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto] md:items-center ${
                pending ? "pointer-events-none opacity-50" : ""
            }`}
        >
            <div className="min-w-0 space-y-1.5">
                <h4 className="m-0 text-base font-semibold leading-snug text-[var(--txt)]">{titulo}</h4>
                <p className="flex items-center gap-1.5 text-sm text-[var(--mut)]">
                    <Building2 className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{application.company || application.vacancy.company}</span>
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                    <SourceBadge source={application.vacancy.source} />
                    {application.adaptation && <span className={CHIP}>Adaptado con IA</span>}
                    {application.analysis && <ScoreBadge score={application.analysis.matchScore} size="xs" />}
                </div>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--mut)]">
                    <time dateTime={application.lastStatusAt} className="font-mono">
                        {timeAgo(application.lastStatusAt)}
                    </time>
                    {application.cvVersion && (
                        <span className="inline-flex min-w-0 items-center gap-1">
                            <FileText className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{application.cvVersion.name}</span>
                        </span>
                    )}
                </p>
            </div>

            <div className="min-w-0">
                <p className="sr-only">Estado: {STATUS_LABELS[status]}</p>
                <ol aria-hidden="true" className="grid grid-cols-4">
                    {STEPPER.map((stage, idx) => {
                        const isLastNode = idx === STEPPER.length - 1;
                        const failed = isRejected && isLastNode;
                        const done = !isRejected && idx <= stepIdx;
                        const lineDone = !isRejected && idx < stepIdx;

                        let circulo = "border-[var(--linea-2)] text-[var(--mut)]";
                        let etiqueta = "text-[var(--mut)]";
                        let icono: React.ReactNode = <span className="size-1.5 rounded-full bg-[var(--linea-2)]" />;
                        if (failed) {
                            circulo = "border-red-400 text-red-400";
                            etiqueta = "text-red-400";
                            icono = <CircleX className="size-3.5" />;
                        } else if (isAccepted && isLastNode) {
                            circulo = "border-emerald-400 text-emerald-400";
                            etiqueta = "text-emerald-400";
                            icono = <CircleCheck className="size-3.5" />;
                        } else if (done) {
                            circulo = "border-[var(--acento)] text-[var(--acento)]";
                            etiqueta = "text-[var(--txt)]";
                            icono = <Check className="size-3.5" />;
                        }

                        return (
                            <li key={stage.id} className="relative flex flex-col items-center gap-1.5 text-center">
                                {!isLastNode && (
                                    <span
                                        className={`absolute left-1/2 top-3.5 h-px w-full ${lineDone ? "bg-[var(--acento)]" : "bg-[var(--linea-2)]"}`}
                                    />
                                )}
                                <span className={`relative z-[1] flex size-7 items-center justify-center rounded-full border-2 bg-[var(--fondo)] ${circulo}`}>
                                    {icono}
                                </span>
                                <span className={`px-1 text-xs leading-tight ${etiqueta}`}>
                                    {failed ? STATUS_LABELS[status] : stage.label}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:w-52 md:flex-col md:items-stretch">
                {!isTerminal && nextAction && (
                    <button
                        type="button"
                        onClick={() => onMoveNext(application)}
                        disabled={pending}
                        className={`${BOTON_SEC} flex-1 md:flex-none`}
                    >
                        {nextAction.icon}
                        {nextAction.label}
                    </button>
                )}
                <div className="flex flex-1 gap-2 md:flex-none">
                    <button type="button" onClick={() => onOpenDetail(application)} className={`${BOTON_SEC} flex-1`}>
                        <Eye className="size-4" aria-hidden="true" />
                        Detalle
                        <span className="sr-only">: {titulo}</span>
                    </button>
                    {application.vacancy.sourceUrl && (
                        <a
                            href={application.vacancy.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Ver la oferta original de ${titulo} (se abre en otra pestaña)`}
                            className={BOTON_ICONO}
                        >
                            <ExternalLink className="size-4" aria-hidden="true" />
                        </a>
                    )}
                </div>
                {/* Una aceptada ya no puede pasar a rechazada (el servidor no lo permite): el botón solo va en curso. */}
                {!isTerminal && (
                    <button type="button" onClick={() => onReject(application)} disabled={pending} className={BOTON_PELIGRO}>
                        <CircleX className="size-4" aria-hidden="true" />
                        Marcar rechazada
                    </button>
                )}
                {isTerminal && (
                    <button type="button" onClick={() => onDelete(application)} disabled={pending} className={BOTON_PELIGRO}>
                        <Trash2 className="size-4" aria-hidden="true" />
                        Eliminar
                        <span className="sr-only">: {titulo}</span>
                    </button>
                )}
            </div>
        </li>
    );
}
