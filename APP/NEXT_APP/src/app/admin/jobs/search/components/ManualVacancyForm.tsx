"use client";

import { FormEvent, useId, useState } from "react";
import { toast } from "sonner";
import { FilePlus2, Loader2 } from "lucide-react";
import { parseJsonResponse } from "../../utils";
import { BOTON, BOTON_SEC, CAMPO, ETIQUETA } from "../../estilos";

const INITIAL = { title: "", company: "", location: "", description: "" };

/** Formulario de vacante manual; va dentro del diálogo de la búsqueda, que pone el título. */
export function ManualVacancyForm({ onCreated, onCancel }: { onCreated: () => void; onCancel?: () => void }) {
    const [form, setForm] = useState(INITIAL);
    const [busy, setBusy] = useState(false);
    const id = useId();
    const largo = form.description.trim().length;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (largo < 40) {
            toast.error("La descripción debe tener al menos 40 caracteres");
            return;
        }

        setBusy(true);
        try {
            const response = await fetch("/api/jobs/vacancies", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source: "MANUAL",
                    title: form.title,
                    company: form.company,
                    location: form.location || undefined,
                    description: form.description,
                }),
            });
            const payload = await parseJsonResponse<{ error?: string }>(response);
            if (!response.ok) {
                throw new Error(payload.error || "No se pudo crear la vacante");
            }
            toast.success("Vacante creada");
            setForm(INITIAL);
            onCreated();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al crear la vacante");
        } finally {
            setBusy(false);
        }
    }

    function updateField<K extends keyof typeof INITIAL>(key: K, value: string) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor={`${id}-titulo`} className={ETIQUETA}>Cargo</label>
                    <input
                        id={`${id}-titulo`}
                        type="text"
                        autoFocus
                        value={form.title}
                        onChange={(e) => updateField("title", e.target.value)}
                        placeholder="Desarrollador full stack"
                        required
                        minLength={3}
                        className={CAMPO}
                        disabled={busy}
                    />
                </div>
                <div>
                    <label htmlFor={`${id}-empresa`} className={ETIQUETA}>Empresa</label>
                    <input
                        id={`${id}-empresa`}
                        type="text"
                        value={form.company}
                        onChange={(e) => updateField("company", e.target.value)}
                        placeholder="Nombre de la empresa"
                        required
                        minLength={2}
                        className={CAMPO}
                        disabled={busy}
                    />
                </div>
            </div>

            <div>
                <label htmlFor={`${id}-lugar`} className={ETIQUETA}>Ubicación (opcional)</label>
                <input
                    id={`${id}-lugar`}
                    type="text"
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="Santiago, Chile"
                    className={CAMPO}
                    disabled={busy}
                />
            </div>

            <div>
                <label htmlFor={`${id}-desc`} className={ETIQUETA}>Descripción</label>
                <textarea
                    id={`${id}-desc`}
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Requisitos, responsabilidades, tecnologías…"
                    rows={5}
                    required
                    aria-describedby={`${id}-cuenta`}
                    className={`${CAMPO} resize-y`}
                    disabled={busy}
                />
                <p id={`${id}-cuenta`} className={`mt-1.5 font-mono text-xs tabular-nums ${largo >= 40 ? "text-[var(--mut)]" : "text-amber-400"}`}>
                    {largo} de 40 caracteres como mínimo
                </p>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {onCancel && (
                    <button type="button" onClick={onCancel} className={BOTON_SEC}>
                        Cancelar
                    </button>
                )}
                <button type="submit" disabled={busy} className={BOTON}>
                    {busy ? (
                        <>
                            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                            Creando…
                        </>
                    ) : (
                        <>
                            <FilePlus2 className="size-4" aria-hidden="true" />
                            Crear vacante
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
