"use client";

import { useId, useState } from "react";
import { rotateClientCodeAction } from "../../../modules/admin/clients/actions";
import { RefreshCw, KeyRound, Eye, EyeOff, Copy } from "lucide-react";
import { toast } from "sonner";
import { copiarTexto } from "@/lib/tools/copiar";
import { BOTON, BOTON_ICONO, BOTON_SEC, CAMPO, FOCO } from "@/modules/quotations/estilos";

/**
 * Contraseña del portal de clientes (nicoholas.dev/cotizacion). El usuario es el slug del cliente.
 * Cambiarla cierra todas las sesiones abiertas del cliente y deja de valer la anterior.
 */
export default function ClientSecurityManager({ clientId, clientName, clientSlug }: { clientId: string; clientName: string; clientSlug: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [newCode, setNewCode] = useState("");
    const [ver, setVer] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Ya guardada pero sin copiar (el portapapeles falló): queda a la vista para copiarla a mano.
    const [guardada, setGuardada] = useState(false);
    const idClave = useId();

    const copiar = async (texto: string, aviso: string) => {
        if (await copiarTexto(texto)) { toast.success(aviso); return true; }
        toast.error("No se pudo copiar");
        return false;
    };

    const cerrarFormulario = () => { setIsOpen(false); setNewCode(""); setError(null); setVer(false); setGuardada(false); };

    const handleUpdate = async () => {
        setError(null);
        if (newCode.trim().length < 8) {
            setError("Usa al menos 8 caracteres.");
            return;
        }
        setLoading(true);
        const res = await rotateClientCodeAction(clientId, newCode.trim());
        setLoading(false);
        if (res.success) {
            const copiada = await copiar(
                `Portal de clientes: https://nicoholas.dev/cotizacion\nUsuario: ${clientSlug}\nContraseña: ${newCode.trim()}`,
                "Contraseña cambiada y copiada para enviarla al cliente"
            );
            if (copiada) {
                cerrarFormulario();
            } else {
                // Antes se cerraba igual y la contraseña nueva se perdía sin haberla copiado.
                setGuardada(true);
                setVer(true);
            }
        } else {
            setError(res.error ?? "No se pudo cambiar la contraseña");
        }
    };

    return (
        <div className="text-sm">
            <div className="flex items-center justify-between gap-2 py-1">
                <span className="flex items-center gap-2 text-[var(--mut)]"><KeyRound size={14} aria-hidden="true" /> Usuario del portal</span>
                <button type="button" onClick={() => copiar(clientSlug, "Usuario copiado")}
                    className={`inline-flex min-h-11 min-w-0 items-center gap-1 rounded-md px-1 font-mono text-xs text-[var(--txt)] transition-colors duration-150 hover:text-[var(--acento)] md:min-h-10 ${FOCO}`}
                    aria-label={`Copiar usuario del portal: ${clientSlug}`}>
                    <span className="truncate">{clientSlug}</span> <Copy size={12} aria-hidden="true" className="shrink-0" />
                </button>
            </div>

            {!isOpen ? (
                <button type="button" onClick={() => setIsOpen(true)}
                    className={`min-h-11 rounded-sm text-sm text-[var(--acento)] underline-offset-2 hover:underline md:min-h-10 ${FOCO}`}>
                    Cambiar contraseña del portal
                </button>
            ) : (
                <div className="mb-3 mt-1 rounded-lg border border-[var(--linea-2)] p-3">
                    <label htmlFor={idClave} className="mb-1.5 block text-sm font-medium text-[var(--txt)]">Nueva contraseña para {clientName}</label>
                    <div className="relative">
                        <input id={idClave} type={ver ? "text" : "password"} value={newCode} onChange={(e) => setNewCode(e.target.value)} readOnly={guardada}
                            autoComplete="new-password" placeholder="Mínimo 8 caracteres"
                            aria-invalid={error ? true : undefined}
                            aria-describedby={`${idClave}-nota${error ? ` ${idClave}-error` : ""}`}
                            className={`${CAMPO} pr-12`} />
                        <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={ver}
                            className={`${BOTON_ICONO} absolute right-0 top-1/2 -translate-y-1/2`}>
                            {ver ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                        </button>
                    </div>
                    {error && <p id={`${idClave}-error`} role="alert" className="mt-2 text-sm text-red-400">{error}</p>}
                    {guardada ? (
                        <>
                            <p role="status" className="mt-2 text-sm text-[var(--txt)]">Contraseña guardada. No se pudo copiar: cópiala a mano antes de cerrar.</p>
                            <div className="mt-3 flex gap-2">
                                <button type="button" onClick={cerrarFormulario} className={`${BOTON} flex-1`}>Listo</button>
                            </div>
                        </>
                    ) : (
                        <div className="mt-3 flex gap-2">
                            <button type="button" onClick={handleUpdate} disabled={loading || !newCode.trim()} className={`${BOTON} flex-1`}>
                                {loading && <RefreshCw size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />} Guardar
                            </button>
                            <button type="button" onClick={cerrarFormulario} className={BOTON_SEC}>
                                Cancelar
                            </button>
                        </div>
                    )}
                    <p id={`${idClave}-nota`} className="mt-2 text-xs text-amber-400">La anterior deja de servir y se cierran las sesiones abiertas del cliente.</p>
                </div>
            )}
        </div>
    );
}
