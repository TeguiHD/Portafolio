"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { ExternalLink, GitCompareArrows, ArrowRight, Loader2 } from "lucide-react";
import DialogoFormulario from "@/app/admin/gestion-comercial/dialogo-formulario";
import { ScoreBadge } from "../../components/ScoreBadge";
import { formatDate } from "../../utils";
import { STATUS_LABELS } from "../../types";
import type { ApplicationItem, ApplicationStatus } from "../../types";
import { addApplicationNoteAction } from "../actions";
import { BOTON, BOTON_SEC, CAMPO, TITULO } from "../../estilos";

const STATUS_STYLE: Record<ApplicationStatus, string> = {
    PENDING: "text-[var(--txt)]",
    CV_ADAPTED: "text-[var(--txt)]",
    CV_SENT: "text-[var(--txt)]",
    INTERVIEW: "text-amber-400",
    ACCEPTED: "text-emerald-400",
    REJECTED: "text-red-400",
    CLOSED: "text-[var(--mut)]",
};

/** Detalle de una postulación en un <dialog> nativo (Escape y el gesto atrás lo cierran). */
export function ApplicationDetailModal({
    application,
    onClose,
}: {
    application: ApplicationItem;
    onClose: () => void;
}) {
    return (
        <DialogoFormulario
            titulo={application.roleTitle || application.vacancy.title}
            descripcion={application.company || application.vacancy.company}
            alCerrar={onClose}
            ancho="max-w-3xl"
        >
            {(cerrar) => <Detalle application={application} cerrar={cerrar} />}
        </DialogoFormulario>
    );
}

function Detalle({ application, cerrar }: { application: ApplicationItem; cerrar: () => void }) {
    const [noteText, setNoteText] = useState("");
    const [pending, startTransition] = useTransition();
    const id = useId();

    function handleAddNote() {
        if (!noteText.trim()) {
            toast.error("La nota no puede estar vacía");
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
        <div className="space-y-7">
            <dl className="border-t border-[var(--linea)] text-sm">
                <Dato termino="Estado">
                    <span className={`font-semibold ${STATUS_STYLE[application.status]}`}>{STATUS_LABELS[application.status]}</span>
                    {application.analysis && (
                        <span className="ml-2">
                            <ScoreBadge score={application.analysis.matchScore} size="xs" showLabel />
                        </span>
                    )}
                </Dato>
                <Dato termino="Último cambio">{formatDate(application.lastStatusAt)}</Dato>
                {application.cvVersion && <Dato termino="CV usado">{application.cvVersion.name}</Dato>}
                {application.adaptation && (
                    <Dato termino="Adaptación">{application.adaptation.mode === "AUTO" ? "Automática" : "Asistida"}</Dato>
                )}
            </dl>

            <div className="flex flex-wrap gap-2">
                {application.vacancy.sourceUrl && (
                    <a
                        href={application.vacancy.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={BOTON_SEC}
                    >
                        <ExternalLink className="size-4" aria-hidden="true" />
                        Ver la oferta original
                        <span className="sr-only">(se abre en otra pestaña)</span>
                    </a>
                )}
                <a href={`/admin/jobs/analysis?vacancyId=${application.vacancy.id}`} className={BOTON_SEC}>
                    <GitCompareArrows className="size-4" aria-hidden="true" />
                    Ver análisis
                </a>
            </div>

            {application.analysis && application.analysis.missingSkills.length > 0 && (
                <section aria-labelledby={`${id}-faltan`}>
                    <h3 id={`${id}-faltan`} className={`${TITULO} mb-2`}>Habilidades que faltan</h3>
                    <ul className="flex flex-wrap gap-1.5">
                        {application.analysis.missingSkills.map((skill) => (
                            <li key={skill} className="rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-400">
                                {skill}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {application.notes && (
                <section aria-labelledby={`${id}-notas`}>
                    <h3 id={`${id}-notas`} className={`${TITULO} mb-2`}>Notas</h3>
                    <p className="whitespace-pre-wrap rounded-lg bg-[var(--fondo-2)] p-3 text-sm text-[var(--txt)]">
                        {application.notes}
                    </p>
                </section>
            )}

            <section aria-labelledby={`${id}-nueva`}>
                <h3 id={`${id}-nueva`} className={`${TITULO} mb-2`}>Agregar nota al historial</h3>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleAddNote();
                    }}
                    className="flex flex-col gap-2 sm:flex-row"
                >
                    <label htmlFor={`${id}-nota`} className="sr-only">Nota</label>
                    <input
                        id={`${id}-nota`}
                        type="text"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Ej.: respondieron, entrevista el jueves"
                        maxLength={500}
                        autoComplete="off"
                        className={`${CAMPO} flex-1`}
                    />
                    <button type="submit" disabled={pending || !noteText.trim()} className={BOTON}>
                        {pending && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                        {pending ? "Agregando…" : "Agregar"}
                    </button>
                </form>
            </section>

            <section aria-labelledby={`${id}-historial`}>
                <h3 id={`${id}-historial`} className={`${TITULO} mb-2`}>Historial</h3>
                {application.events.length === 0 ? (
                    <p className="border-t border-[var(--linea)] py-3 text-sm text-[var(--mut)]">Sin movimientos registrados.</p>
                ) : (
                    <ol className="border-t border-[var(--linea)]">
                        {application.events.map((event) => {
                            const esNota = event.fromStatus === event.toStatus;
                            return (
                                <li key={event.id} className="border-b border-[var(--linea)] py-3 text-sm">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                        {esNota ? (
                                            <span className="text-[var(--mut)]">Nota</span>
                                        ) : (
                                            <>
                                                <span className="text-[var(--mut)]">
                                                    {event.fromStatus ? STATUS_LABELS[event.fromStatus] : "Inicio"}
                                                </span>
                                                <ArrowRight className="size-3.5 text-[var(--mut)]" aria-hidden="true" />
                                                <span className="sr-only">a</span>
                                                <span className={`font-semibold ${STATUS_STYLE[event.toStatus]}`}>
                                                    {STATUS_LABELS[event.toStatus]}
                                                </span>
                                            </>
                                        )}
                                        <time dateTime={event.createdAt} className="ml-auto font-mono text-xs text-[var(--mut)]">
                                            {formatDate(event.createdAt)}
                                        </time>
                                    </div>
                                    {event.note && <p className="mt-1 text-[var(--txt)]">{event.note}</p>}
                                </li>
                            );
                        })}
                    </ol>
                )}
            </section>

            <div className="flex justify-end border-t border-[var(--linea)] pt-4">
                <button type="button" onClick={cerrar} className={BOTON_SEC}>
                    Cerrar
                </button>
            </div>
        </div>
    );
}

function Dato({ termino, children }: { termino: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[var(--linea)] py-3">
            <dt className="text-[var(--mut)]">{termino}</dt>
            <dd className="m-0 text-right text-[var(--txt)]">{children}</dd>
        </div>
    );
}
