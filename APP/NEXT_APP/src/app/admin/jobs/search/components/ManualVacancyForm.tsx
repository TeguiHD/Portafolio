"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { FilePlus2, Loader2 } from "lucide-react";
import { parseJsonResponse } from "../../utils";

const INITIAL = { title: "", company: "", location: "", description: "" };

export function ManualVacancyForm({ onCreated }: { onCreated: () => void }) {
    const [form, setForm] = useState(INITIAL);
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (form.description.trim().length < 40) {
            toast.error("La descripcion debe tener al menos 40 caracteres");
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
            toast.success("Vacante creada correctamente");
            setForm(INITIAL);
            onCreated();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error creando vacante");
        } finally {
            setBusy(false);
        }
    }

    function updateField<K extends keyof typeof INITIAL>(key: K, value: string) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    return (
        <div className="glass-panel rounded-2xl border border-white/10 p-5 sm:p-6 bg-[#0a0f1c]/60 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <FilePlus2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-base font-semibold text-white">Crear manual</h2>
                    <p className="text-xs text-neutral-400">
                        Ingresa una vacante cuando no tienes la URL (ej. mensajes directos)
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-neutral-400 mb-1">Titulo del rol</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => updateField("title", e.target.value)}
                            placeholder="Full Stack Developer"
                            required
                            minLength={3}
                            className="w-full rounded-xl bg-[#0f172a] border border-white/10 px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-emerald-500/40 focus:outline-none"
                            disabled={busy}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-neutral-400 mb-1">Empresa</label>
                        <input
                            type="text"
                            value={form.company}
                            onChange={(e) => updateField("company", e.target.value)}
                            placeholder="ACME Corp"
                            required
                            minLength={2}
                            className="w-full rounded-xl bg-[#0f172a] border border-white/10 px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-emerald-500/40 focus:outline-none"
                            disabled={busy}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs text-neutral-400 mb-1">Ubicacion (opcional)</label>
                    <input
                        type="text"
                        value={form.location}
                        onChange={(e) => updateField("location", e.target.value)}
                        placeholder="Santiago, Chile"
                        className="w-full rounded-xl bg-[#0f172a] border border-white/10 px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-emerald-500/40 focus:outline-none"
                        disabled={busy}
                    />
                </div>

                <div>
                    <label className="block text-xs text-neutral-400 mb-1">
                        Descripcion{" "}
                        <span className="text-neutral-600">
                            ({form.description.trim().length}/40 minimo)
                        </span>
                    </label>
                    <textarea
                        value={form.description}
                        onChange={(e) => updateField("description", e.target.value)}
                        placeholder="Requisitos, responsabilidades, tecnologias..."
                        rows={4}
                        required
                        className="w-full rounded-xl bg-[#0f172a] border border-white/10 px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-emerald-500/40 focus:outline-none resize-none"
                        disabled={busy}
                    />
                </div>

                <button
                    type="submit"
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-sm font-semibold hover:bg-emerald-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {busy ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Creando...
                        </>
                    ) : (
                        <>
                            <FilePlus2 className="w-4 h-4" />
                            Crear vacante
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
