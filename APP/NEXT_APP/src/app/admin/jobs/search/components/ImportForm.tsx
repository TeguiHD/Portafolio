"use client";

import { FormEvent, useId, useState } from "react";
import { toast } from "sonner";
import { Link2, Loader2 } from "lucide-react";
import { parseJsonResponse } from "../../utils";
import { BOTON, BOTON_SEC, CAMPO, ETIQUETA } from "../../estilos";

const SUPPORTED_SOURCES = [
    "LinkedIn",
    "Computrabajo",
    "Laborum",
    "Get on Board",
    "Trabajando",
    "Chiletrabajos",
    "FirstJob",
    "Hireline",
    "Torre",
    "Indeed",
    "Workana",
    "Chile Empleos",
    "Trabaja en el Estado",
    "BNE",
];

/** Formulario de importación; va dentro del diálogo de la búsqueda, que pone el título. */
export function ImportForm({ onImported, onCancel }: { onImported: () => void; onCancel?: () => void }) {
    const [url, setUrl] = useState("");
    const [busy, setBusy] = useState(false);
    const id = useId();

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const trimmed = url.trim();
        if (!trimmed) {
            toast.error("Debes ingresar una URL");
            return;
        }

        setBusy(true);
        try {
            const response = await fetch("/api/jobs/vacancies/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: trimmed }),
            });
            const payload = await parseJsonResponse<{ error?: string }>(response);
            if (!response.ok) {
                throw new Error(payload.error || "No se pudo importar la vacante");
            }
            toast.success("Vacante importada");
            setUrl("");
            onImported();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al importar");
        } finally {
            setBusy(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor={`${id}-url`} className={ETIQUETA}>URL de la oferta</label>
                <input
                    id={`${id}-url`}
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    autoFocus
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://…"
                    aria-describedby={`${id}-portales`}
                    className={CAMPO}
                    disabled={busy}
                />
                <p id={`${id}-portales`} className="mt-2 text-xs leading-relaxed text-[var(--mut)]">
                    Funciona con {SUPPORTED_SOURCES.slice(0, -1).join(", ")} y {SUPPORTED_SOURCES[SUPPORTED_SOURCES.length - 1]}.
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
                            Importando…
                        </>
                    ) : (
                        <>
                            <Link2 className="size-4" aria-hidden="true" />
                            Importar vacante
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
