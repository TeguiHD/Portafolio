"use client";

import { useState, useEffect, useCallback, useId, useRef } from "react";
import { X, Share2, Copy, Check, Clock, Trash2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { confirmar } from "@/modules/admin/confirmar/confirmar";
import { copiarTexto } from "@/lib/tools/copiar";

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: {
        id: string;
        name: string;
    };
    // currentUserId removed as unused
}

interface SharedUser {
    userId: string;
    userName: string | null;
    permission: string;
    sharedAt: string;
}

/* Clases del tema (tokens de src/app/tokens.css): valen en claro y oscuro sin tema-panel.css. */
const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)]";
const SOBRE = "hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)]";
const BASE_BOTON = `inline-flex min-h-11 md:min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${FOCO}`;
const BOTON = `${BASE_BOTON} bg-[var(--acento)] font-semibold text-[var(--acento-tinta)] hover:bg-[color-mix(in_srgb,var(--acento)_86%,var(--txt))]`;
const BOTON_SUAVE = `${BASE_BOTON} text-[var(--mut)] hover:text-[var(--txt)] ${SOBRE}`;
const BOTON_ICONO = `inline-grid size-11 md:size-10 shrink-0 place-items-center rounded-lg text-[var(--mut)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] hover:text-[var(--txt)] disabled:cursor-not-allowed disabled:opacity-40 ${FOCO}`;

const HORAS = [1, 24, 168] as const;
const nombreHoras = (horas: number) => (horas === 1 ? "1 hora" : horas === 24 ? "24 horas" : "1 semana");

/**
 * Compartir un cliente con otro usuario del panel. <dialog> nativo abierto con showModal(): atrapa el foco,
 * deja inerte el resto, Escape o tocar fuera lo cierran y al cerrar el foco vuelve al botón que lo abrió.
 */
export default function ShareModal({ isOpen, onClose, client }: ShareModalProps) {
    const dialogo = useRef<HTMLDialogElement>(null);
    const id = useId();
    const [activeTab, setActiveTab] = useState<"invite" | "manage">("invite");

    // Invite State
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [expiration, setExpiration] = useState(24);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    // Manage State
    const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isRevoking, setIsRevoking] = useState<string | null>(null);

    const fetchSharingStats = useCallback(async () => {
        try {
            setIsLoadingUsers(true);
            const res = await fetch(`/api/clients/share?clientId=${client.id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.sharedWith) {
                    setSharedUsers(data.sharedWith);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingUsers(false);
        }
    }, [client.id]);

    useEffect(() => {
        if (isOpen) {
            fetchSharingStats();
            const d = dialogo.current;
            if (d && !d.open) d.showModal();
        } else {
            // Reset state on close
            setGeneratedCode(null);
            setActiveTab("invite");
        }
    }, [isOpen, fetchSharingStats]);

    // Tocar fuera cierra: nativo con closedby="any"; donde no existe (Safari), se mira el punto del clic.
    useEffect(() => {
        const d = dialogo.current;
        if (!isOpen || !d || "closedBy" in HTMLDialogElement.prototype) return;
        const fuera = (ev: MouseEvent) => {
            if (ev.target !== d) return;
            const r = d.getBoundingClientRect();
            if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) d.close();
        };
        d.addEventListener("click", fuera);
        return () => d.removeEventListener("click", fuera);
    }, [isOpen]);

    const cerrar = () => dialogo.current?.close();

    const handleGenerateCode = async () => {
        try {
            setIsGenerating(true);
            const res = await fetch("/api/clients/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId: client.id,
                    permission: "VIEW", // Default permission
                    expiresInHours: expiration,
                    maxUses: 1 // One-time use for security
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "No se pudo generar el código");

            setGeneratedCode(data.code);
            toast.success("Código generado");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo generar el código");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyCode = async () => {
        if (!generatedCode) return;
        if (await copiarTexto(generatedCode)) {
            setCopied(true);
            toast.success("Código copiado");
            setTimeout(() => setCopied(false), 2000);
        } else {
            toast.error("No se pudo copiar");
        }
    };

    const handleRevokeAccess = async (targetUserId: string) => {
        if (!(await confirmar({ titulo: "¿Quitarle el acceso a este usuario?", detalle: "Dejará de ver este cliente y sus propuestas.", accion: "Quitar acceso", peligro: true }))) return;

        try {
            setIsRevoking(targetUserId);
            const res = await fetch("/api/clients/share", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId: client.id,
                    action: "remove-access",
                    sharedWithUserId: targetUserId
                }),
            });

            if (!res.ok) throw new Error("No se pudo quitar el acceso");

            setSharedUsers(prev => prev.filter(u => u.userId !== targetUserId));
            toast.success("Acceso quitado");
        } catch {
            toast.error("No se pudo quitar el acceso");
        } finally {
            setIsRevoking(null);
        }
    };

    if (!isOpen) return null;

    const pestana = (activa: boolean) =>
        // El contorno de foco va hacia dentro: hacia fuera lo cortaría el borde del diálogo.
        `flex-1 min-h-11 border-b-2 px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--acento)] ${activa
            ? "border-[var(--acento)] text-[var(--txt)]"
            : "border-transparent text-[var(--mut)] hover:text-[var(--txt)]"}`;

    return (
        <dialog
            ref={dialogo}
            closedby="any"
            onClose={onClose}
            aria-labelledby={`${id}-t`}
            aria-describedby={`${id}-d`}
            className="m-auto w-[calc(100%-24px)] max-w-lg max-h-[min(85dvh,760px)] overflow-hidden rounded-2xl border border-[var(--linea-2)] bg-[var(--sup)] p-0 text-[var(--txt)] shadow-2xl overscroll-contain open:flex open:flex-col backdrop:bg-black/60 backdrop:overflow-hidden backdrop:overscroll-contain"
        >
            <div className="flex items-start gap-3 border-b border-[var(--linea)] p-5 pr-3 sm:p-6 sm:pr-4">
                <Share2 size={18} aria-hidden="true" className="mt-1 shrink-0 text-[var(--mut)]" />
                <div className="min-w-0 flex-1">
                    <h2 id={`${id}-t`} className="text-lg font-semibold">Compartir cliente</h2>
                    <p id={`${id}-d`} className="mt-0.5 text-sm text-[var(--mut)]">
                        Gestiona el acceso a <span className="font-medium text-[var(--txt)]">{client.name}</span>
                    </p>
                </div>
                <button type="button" onClick={cerrar} className={BOTON_ICONO} aria-label="Cerrar">
                    <X size={18} aria-hidden="true" />
                </button>
            </div>

            <div className="flex border-b border-[var(--linea)]" role="group" aria-label="Qué hacer">
                <button type="button" aria-pressed={activeTab === "invite"} onClick={() => setActiveTab("invite")} className={pestana(activeTab === "invite")}>
                    Generar invitación
                </button>
                <button type="button" aria-pressed={activeTab === "manage"} onClick={() => setActiveTab("manage")} className={pestana(activeTab === "manage")}>
                    Usuarios con acceso ({sharedUsers.length})
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
                {activeTab === "invite" ? (
                    <div className="space-y-5">
                        <p className="text-sm leading-relaxed text-[var(--mut)]">
                            El código sirve una sola vez, da acceso de solo lectura y vence solo. Compártelo solo con quien corresponda.
                        </p>

                        {!generatedCode ? (
                            <div className="space-y-5">
                                <fieldset>
                                    <legend className="mb-2 text-sm font-medium text-[var(--txt)]">Vence en</legend>
                                    <div className="grid grid-cols-3 gap-2">
                                        {HORAS.map((hours) => (
                                            <button
                                                key={hours}
                                                type="button"
                                                aria-pressed={expiration === hours}
                                                onClick={() => setExpiration(hours)}
                                                className={`min-h-11 md:min-h-10 rounded-lg border px-3 text-sm transition-colors duration-150 ${FOCO} ${expiration === hours
                                                    ? "border-[var(--acento)] bg-[color-mix(in_srgb,var(--acento)_13%,transparent)] font-medium text-[var(--txt)]"
                                                    : `border-[var(--linea-2)] text-[var(--mut)] hover:text-[var(--txt)] ${SOBRE}`
                                                    }`}
                                            >
                                                {nombreHoras(hours)}
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>

                                <button
                                    type="button"
                                    onClick={handleGenerateCode}
                                    disabled={isGenerating}
                                    className={`${BOTON} w-full`}
                                >
                                    {isGenerating ? (
                                        <>
                                            <RefreshCcw className="motion-safe:animate-spin" size={16} aria-hidden="true" />
                                            Generando…
                                        </>
                                    ) : (
                                        <>
                                            <Share2 size={16} aria-hidden="true" />
                                            Generar código de acceso
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <p className="mb-2 text-sm text-[var(--mut)]">Tu código de acceso:</p>
                                    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--linea-2)] bg-[var(--fondo-2)] py-2 pl-4 pr-2">
                                        <code className="min-w-0 break-all font-mono text-2xl font-bold tracking-[0.06em] text-[var(--txt)]">
                                            {generatedCode}
                                        </code>
                                        <button
                                            type="button"
                                            onClick={handleCopyCode}
                                            className={BOTON_ICONO}
                                            title="Copiar"
                                            aria-label={copied ? "Código copiado" : "Copiar código"}
                                        >
                                            {copied ? <Check className="text-emerald-400" size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
                                        </button>
                                    </div>
                                    <p className="mt-3 flex items-center gap-1.5 text-sm text-[var(--mut)]">
                                        <Clock size={14} aria-hidden="true" className="text-amber-400" />
                                        Vence en {nombreHoras(expiration)}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setGeneratedCode(null)}
                                    className={`${BOTON_SUAVE} w-full`}
                                >
                                    Generar otro código
                                </button>
                            </div>
                        )}
                    </div>
                ) : isLoadingUsers ? (
                    <p className="py-6 text-center text-sm text-[var(--mut)]" role="status">Cargando usuarios…</p>
                ) : sharedUsers.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[var(--mut)]">Nadie tiene acceso a este cliente aún.</p>
                ) : (
                    <ul className="border-t border-[var(--linea)]">
                        {sharedUsers.map((user) => (
                            <li key={user.userId} className="flex items-center gap-3 border-b border-[var(--linea)] px-1 py-3">
                                <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--acento)_14%,transparent)] font-mono text-xs font-semibold text-[var(--acento)]">
                                    {user.userName?.substring(0, 2).toUpperCase() || "U"}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-[var(--txt)]">{user.userName || "Usuario"}</p>
                                    <p className="text-xs text-[var(--mut)]">
                                        Desde el {new Date(user.sharedAt).toLocaleDateString("es-CL")}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleRevokeAccess(user.userId)}
                                    disabled={isRevoking === user.userId}
                                    className={`${BOTON_ICONO} hover:bg-red-500/10 hover:text-red-400`}
                                    title="Quitar acceso"
                                    aria-label={`Quitar acceso a ${user.userName || "este usuario"}`}
                                >
                                    {isRevoking === user.userId ? (
                                        <RefreshCcw className="motion-safe:animate-spin" size={16} aria-hidden="true" />
                                    ) : (
                                        <Trash2 size={16} aria-hidden="true" />
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </dialog>
    );
}
