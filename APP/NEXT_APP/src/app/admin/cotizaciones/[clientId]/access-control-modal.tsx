"use client";

import { useState, useTransition } from "react";
import { Globe, Lock, Loader2, Check, Copy, AlertTriangle } from "lucide-react";
import { updateQuotationAccessAction } from "./actions";
import { toast } from "sonner";
import { copiarTexto } from "@/lib/tools/copiar";
import Ventana from "@/modules/quotations/components/Ventana";
import { AYUDA, BOTON, BOTON_ICONO, BOTON_SEC, CAMPO, ETIQUETA, OPCION } from "@/modules/quotations/estilos";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    quotationId: string;
    currentMode: "public" | "code";
    expiresAt: Date | null;
    /** Tras cambiar el acceso: la tarjeta muestra el modo y el vencimiento nuevos. */
    onChanged?: () => void;
}

export default function AccessControlModal({ isOpen, ...props }: Props) {
    if (!isOpen) return null;
    // Se monta al abrir: el código nuevo se ve una sola vez y no queda guardado al volver a abrir.
    return <Contenido {...props} />;
}

function Contenido({ onClose, quotationId, currentMode, onChanged }: Omit<Props, "isOpen">) {
    const [mode, setMode] = useState<"public" | "code">(currentMode);
    const [duration, setDuration] = useState<string>("15d");
    const [isPending, startTransition] = useTransition();
    const [newCode, setNewCode] = useState<string | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = () => {
        // If switching to private or refreshing code, show confirmation first
        if (mode === "code" && !showConfirmation && !newCode) {
            setShowConfirmation(true);
            return;
        }

        // If switching to public, direct save
        if (mode === "public") {
            performUpdate();
            return;
        }

        // If confirmed private update
        if (showConfirmation) {
            performUpdate();
        }
    };

    const performUpdate = () => {
        setError(null);
        startTransition(async () => {
            const res = await updateQuotationAccessAction(quotationId, mode, mode === "code" ? duration : undefined);
            if (res.success) {
                onChanged?.();
                if (mode === "public") {
                    toast.success("La propuesta ahora es pública");
                    onClose();
                } else {
                    toast.success("Código de acceso generado");
                    if (res.code) {
                        setNewCode(res.code);
                        setShowConfirmation(false);
                    }
                }
            } else {
                setError(res.error || "No se pudo cambiar el acceso");
            }
        });
    };

    const copyCode = async () => {
        if (!newCode) return;
        if (await copiarTexto(newCode)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } else {
            setError("No se pudo copiar: selecciona el código y cópialo a mano.");
        }
    };

    return (
        <Ventana
            titulo={newCode ? "Código nuevo" : "Acceso a la propuesta"}
            icono={newCode ? <Check size={18} className="text-emerald-400" /> : <Lock size={18} />}
            alCerrar={onClose}
            ancho="max-w-md"
        >
            {(cerrar) => newCode ? (
                <div className="space-y-5">
                    <div className="text-center">
                        <p className="text-sm text-[var(--mut)]">Compártelo con el cliente ahora:</p>
                        <div className="mt-3 flex items-center justify-center gap-2">
                            <code className="select-all font-mono text-3xl font-bold tabular-nums text-[var(--txt)]">{newCode}</code>
                            <button type="button" onClick={copyCode} aria-label={copied ? "Código copiado" : "Copiar código"} className={BOTON_ICONO}>
                                {copied ? <Check size={18} aria-hidden="true" className="text-emerald-400" /> : <Copy size={18} aria-hidden="true" />}
                            </button>
                        </div>
                    </div>
                    <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-[var(--txt)]">
                        <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-amber-400" />
                        <span>Se muestra una sola vez: solo guardamos una versión cifrada.</span>
                    </p>
                    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
                    <button type="button" onClick={cerrar} className={`${BOTON} w-full`} data-autofocus>
                        Listo, cerrar
                    </button>
                </div>
            ) : showConfirmation ? (
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <AlertTriangle size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-amber-400" />
                        <div>
                            <h3 className="font-semibold text-[var(--txt)]">¿Generar un código nuevo?</h3>
                            <p className="mt-1 text-sm text-[var(--mut)]">
                                El código anterior deja de funcionar al instante y quien lo use pierde el acceso.
                            </p>
                        </div>
                    </div>
                    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
                    <div className="flex gap-2 pt-1">
                        <button type="button" onClick={() => setShowConfirmation(false)} className={`${BOTON_SEC} flex-1`} data-autofocus>
                            Cancelar
                        </button>
                        <button type="button" onClick={performUpdate} disabled={isPending} className={`${BOTON} flex-1`}>
                            {isPending ? <><Loader2 className="animate-spin motion-reduce:animate-none" size={16} aria-hidden="true" /> Generando…</> : "Sí, generar"}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-5">
                    <div role="group" aria-label="Quién puede verla" className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => setMode("public")} aria-pressed={mode === "public"} className={`${OPCION} p-4`}>
                            <Globe size={18} aria-hidden="true" className={`mb-2 ${mode === "public" ? "text-[var(--acento)]" : "text-[var(--mut)]"}`} />
                            <span className="block text-sm font-semibold text-[var(--txt)]">Pública</span>
                            <span className="mt-0.5 block text-xs text-[var(--mut)]">Basta el enlace</span>
                        </button>
                        <button type="button" onClick={() => setMode("code")} aria-pressed={mode === "code"} className={`${OPCION} p-4`}>
                            <Lock size={18} aria-hidden="true" className={`mb-2 ${mode === "code" ? "text-[var(--acento)]" : "text-[var(--mut)]"}`} />
                            <span className="block text-sm font-semibold text-[var(--txt)]">Privada</span>
                            <span className="mt-0.5 block text-xs text-[var(--mut)]">Pide un código</span>
                        </button>
                    </div>

                    {mode === "code" && (
                        <div>
                            <label htmlFor={`validez-${quotationId}`} className={ETIQUETA}>Validez del código</label>
                            <select
                                id={`validez-${quotationId}`}
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className={CAMPO}
                            >
                                <option value="7d">1 semana (7 días)</option>
                                <option value="15d">15 días</option>
                                <option value="30d">1 mes (30 días)</option>
                                <option value="indefinite">Sin vencimiento</option>
                            </select>
                            <p className={AYUDA}>Pasado ese plazo tendrás que generar otro.</p>
                        </div>
                    )}

                    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isPending || (mode === currentMode && mode === "public")}
                        className={`${BOTON} w-full`}
                    >
                        {isPending ? (
                            <><Loader2 className="animate-spin motion-reduce:animate-none" size={16} aria-hidden="true" /> Guardando…</>
                        ) : (
                            mode === "code" ? (currentMode === "code" ? "Generar código nuevo" : "Proteger con código") : "Hacer pública"
                        )}
                    </button>
                </div>
            )}
        </Ventana>
    );
}
