"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Link2, Loader2, Sparkles } from "lucide-react";
import { parseJsonResponse } from "../../utils";

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

export function ImportForm({ onImported }: { onImported: () => void }) {
    const [url, setUrl] = useState("");
    const [busy, setBusy] = useState(false);

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
            toast.success("Vacante importada correctamente");
            setUrl("");
            onImported();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error importando");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="glass-panel rounded-2xl border border-white/10 p-5 sm:p-6 bg-[#0a0f1c]/60 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-accent-1/10 border border-accent-1/20">
                    <Sparkles className="w-4 h-4 text-accent-1" />
                </div>
                <div>
                    <h2 className="text-base font-semibold text-white">Importar desde URL</h2>
                    <p className="text-xs text-neutral-400">
                        Pega el link de una oferta para extraer los datos automaticamente
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                    <Link2 className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="url"
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                        placeholder="https://..."
                        className="w-full rounded-xl bg-[#0f172a] border border-white/10 pl-9 pr-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-accent-1/40 focus:outline-none transition-colors"
                        disabled={busy}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {SUPPORTED_SOURCES.map((source) => (
                        <span
                            key={source}
                            className="text-[10px] uppercase tracking-wider font-medium text-neutral-500 px-2 py-1 rounded-md bg-white/[0.03] border border-white/5"
                        >
                            {source}
                        </span>
                    ))}
                </div>

                <button
                    type="submit"
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-accent-1 to-accent-2 text-white text-sm font-semibold hover:shadow-lg hover:shadow-accent-1/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {busy ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Importando...
                        </>
                    ) : (
                        <>
                            <Link2 className="w-4 h-4" />
                            Importar vacante
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
