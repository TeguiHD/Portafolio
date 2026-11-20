"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Campo, Esperando } from "@/modules/portal/PaginaAcceso";

const MINIMO = 8;

/** Cuánto aguanta la clave, dicho en palabras (la barra acompaña; el color nunca va solo). */
function fuerza(clave: string): { texto: string; color: string; ancho: number } {
    let puntos = 0;
    if (clave.length >= MINIMO) puntos += 1;
    if (clave.length >= 14) puntos += 1;
    if (/[a-z]/.test(clave) && /[A-Z]/.test(clave)) puntos += 1;
    if (/\d/.test(clave)) puntos += 1;
    if (/[^\w\s]/.test(clave)) puntos += 1;
    if (clave.length >= 20) puntos += 1;
    if (puntos <= 2) return { texto: "débil", color: "var(--error)", ancho: 33 };
    if (puntos <= 4) return { texto: "razonable", color: "#d97706", ancho: 66 };
    return { texto: "fuerte", color: "var(--sube)", ancho: 100 };
}

export function FormularioCambioClave({ obligatorio, usuarioCorreo }: { obligatorio: boolean; usuarioCorreo: string }) {
    const router = useRouter();
    const [actual, setActual] = useState("");
    const [nueva, setNueva] = useState("");
    const [repetir, setRepetir] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);
    const [listo, setListo] = useState(false);

    const medida = fuerza(nueva);
    const coincide = nueva.length > 0 && nueva === repetir;
    // Las mismas reglas que revisa el servidor, dichas antes de enviar: cada envío rechazado gasta uno de los cinco intentos.
    const problema = nueva.length > 0 && actual.length > 0 && nueva === actual
        ? "La nueva clave no puede ser la misma que la actual."
        : usuarioCorreo.length > 3 && nueva.toLowerCase().includes(usuarioCorreo)
            ? "La clave no puede contener tu correo."
            : null;
    const puede = actual.length > 0 && nueva.length >= MINIMO && coincide && !problema && !enviando;
    // «No son iguales» recién cuando ya se escribió lo suficiente: antes aparecía con la primera letra.
    const noCoincide = repetir.length > 0 && !coincide && (repetir.length >= nueva.length || !nueva.startsWith(repetir));

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

    if (listo) return <p className="pa-hecho" role="status">Clave cambiada. Entrando al panel…</p>;

    return (
        <>
            <form onSubmit={enviar} className="pa-form">
                <Campo etiqueta={obligatorio ? "Clave temporal" : "Clave actual"} name="actual" clave valor={actual} alCambiar={setActual} autoComplete="current-password" required autoFocus />
                <div>
                    <Campo etiqueta="Clave nueva" name="nueva" clave valor={nueva} alCambiar={setNueva} autoComplete="new-password" minLength={MINIMO} required />
                    <div className="pa-fuerza" style={{ "--w": `${nueva ? medida.ancho : 0}%`, "--c": nueva ? medida.color : undefined } as CSSProperties}>
                        <span aria-hidden="true"><i /></span>
                        {nueva ? <b>{medida.texto}</b> : <small>mínimo {MINIMO} caracteres</small>}
                    </div>
                    {problema ? <p className="pa-error" style={{ marginTop: 10 }}>{problema}</p> : null}
                </div>
                <div>
                    <Campo etiqueta="Repite la clave nueva" name="repetir" clave valor={repetir} alCambiar={setRepetir} autoComplete="new-password" required />
                    {noCoincide ? <p className="pa-error" style={{ marginTop: 10 }}>Las dos claves no son iguales.</p> : null}
                </div>
                {error ? <p role="alert" className="pa-error">{error}</p> : null}
                <button type="submit" className="boton lleno" disabled={!puede} aria-busy={enviando}>
                    {enviando ? <>Cambiando <Esperando /></> : "Cambiar clave"}
                </button>
            </form>
            <div className="pa-pie">
                <p>Con {MINIMO} caracteres cumple, pero tres palabras sin relación entre sí aguantan mucho más que una palabra con números al final, y se recuerdan mejor.</p>
                {/* Con la clave temporal no hay otra salida que cambiarla: en un equipo prestado, cerrar la pestaña dejaba
                    la sesión abierta. */}
                {obligatorio ? <button type="button" className="pa-alterno" onClick={() => void signOut({ callbackUrl: "/acceso" })}>Salir sin cambiarla</button> : null}
            </div>
        </>
    );
}
