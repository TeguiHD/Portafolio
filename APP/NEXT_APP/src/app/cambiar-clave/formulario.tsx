"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MINIMO = 8;

/** Cuánto aguanta la clave, dicho en palabras y no en una barra de colores sin sentido. */
function fuerza(clave: string): { texto: string; tono: string; ancho: number } {
    let puntos = 0;
    if (clave.length >= MINIMO) puntos += 1;
    if (clave.length >= 14) puntos += 1;
    if (/[a-z]/.test(clave) && /[A-Z]/.test(clave)) puntos += 1;
    if (/\d/.test(clave)) puntos += 1;
    if (/[^\w\s]/.test(clave)) puntos += 1;
    if (clave.length >= 20) puntos += 1;
    if (puntos <= 2) return { texto: "débil", tono: "text-red-400", ancho: 33 };
    if (puntos <= 4) return { texto: "razonable", tono: "text-amber-400", ancho: 66 };
    return { texto: "fuerte", tono: "text-emerald-400", ancho: 100 };
}

export function FormularioCambioClave({ obligatorio }: { obligatorio: boolean }) {
    const router = useRouter();
    const [actual, setActual] = useState("");
    const [nueva, setNueva] = useState("");
    const [repetir, setRepetir] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);
    const [listo, setListo] = useState(false);

    const medida = fuerza(nueva);
    const coincide = nueva.length > 0 && nueva === repetir;
    const puede = actual.length > 0 && nueva.length >= MINIMO && coincide && !enviando;

    async function enviar(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setEnviando(true);
        try {
            const r = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ actual, nueva }),
            });
            const datos = await r.json().catch(() => ({}));
            if (!r.ok) {
                setError(datos.error || "No se pudo cambiar la clave.");
                return;
            }
            setListo(true);
            // La sesión sigue válida: solo se recarga para que el panel deje de mandarnos acá.
            setTimeout(() => router.replace("/admin"), 1200);
        } catch {
            setError("No se pudo conectar. Revisa tu conexión.");
        } finally {
            setEnviando(false);
        }
    }

    if (listo) {
        return (
            <p className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                Clave cambiada. Entrando al panel…
            </p>
        );
    }

    return (
        <form onSubmit={enviar} className="mt-8 space-y-5">
            <div>
                <label htmlFor="actual" className="block text-sm font-medium text-neutral-300">
                    {obligatorio ? "Clave temporal" : "Clave actual"}
                </label>
                <input
                    id="actual"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={actual}
                    onChange={(e) => setActual(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-neutral-100 outline-none transition focus:border-accent-1/60 focus:ring-2 focus:ring-accent-1/20"
                />
            </div>

            <div>
                <label htmlFor="nueva" className="block text-sm font-medium text-neutral-300">
                    Clave nueva
                </label>
                <input
                    id="nueva"
                    type="password"
                    autoComplete="new-password"
                    minLength={MINIMO}
                    required
                    value={nueva}
                    onChange={(e) => setNueva(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-neutral-100 outline-none transition focus:border-accent-1/60 focus:ring-2 focus:ring-accent-1/20"
                />
                <div className="mt-2 flex items-center gap-3">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ${medida.ancho === 100 ? "bg-emerald-400" : medida.ancho === 66 ? "bg-amber-400" : "bg-red-400"
                                }`}
                            style={{ width: `${nueva ? medida.ancho : 0}%` }}
                        />
                    </div>
                    <span className={`text-xs ${nueva ? medida.tono : "text-neutral-500"}`}>
                        {nueva ? medida.texto : `mínimo ${MINIMO} caracteres`}
                    </span>
                </div>
            </div>

            <div>
                <label htmlFor="repetir" className="block text-sm font-medium text-neutral-300">
                    Repite la clave nueva
                </label>
                <input
                    id="repetir"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={repetir}
                    onChange={(e) => setRepetir(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-neutral-100 outline-none transition focus:border-accent-1/60 focus:ring-2 focus:ring-accent-1/20"
                />
                {repetir.length > 0 && !coincide && (
                    <p className="mt-2 text-xs text-red-400">Las dos claves no son iguales.</p>
                )}
            </div>

            {error && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={!puede}
                className="w-full rounded-xl bg-accent-1 px-4 py-2.5 font-medium text-neutral-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
                {enviando ? "Cambiando…" : "Cambiar clave"}
            </button>

            <p className="text-xs leading-relaxed text-neutral-500">
                Con {MINIMO} caracteres cumple, pero tres palabras sin relación entre sí
                aguantan mucho más que una palabra con números al final, y se recuerdan mejor.
            </p>
        </form>
    );
}
