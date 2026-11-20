"use client";

import { useState } from "react";
import { Key, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Ventana from "@/modules/quotations/components/Ventana";
import { AYUDA, BOTON, CAMPO, ETIQUETA } from "@/modules/quotations/estilos";

interface RedeemCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function RedeemCodeModal({ isOpen, onClose }: RedeemCodeModalProps) {
    if (!isOpen) return null;
    // Se monta al abrir: el código y el error parten vacíos cada vez.
    return <Formulario onClose={onClose} />;
}

function Formulario({ onClose }: { onClose: () => void }) {
    const [code, setCode] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;
        setError(null);

        try {
            setIsSubmitting(true);
            const res = await fetch("/api/clients/share/redeem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: code.trim() }),
            });

            const data = await res.json();

            if (!res.ok) {
                // Prioritize server error message
                const errorMessage = data?.error || "Código inválido o expirado";
                throw new Error(errorMessage);
            }

            toast.success("Cliente vinculado", {
                description: "Ya tienes acceso al cliente compartido."
            });

            onClose();
            router.refresh(); // Refresh to show new client
        } catch (error) {
            console.error("Redeem error:", error);
            setError(error instanceof Error ? error.message : "No se pudo vincular el cliente");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Ventana
            titulo="Vincular un cliente compartido"
            descripcion="Escribe el código que te compartieron para acceder al cliente."
            icono={<Key size={18} />}
            alCerrar={onClose}
            ancho="max-w-md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="redeem-code-input" className={ETIQUETA}>
                        Código de vinculación
                    </label>
                    <input
                        id="redeem-code-input"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Ej.: WEB-2024-X9Y2"
                        className={`${CAMPO} text-center font-mono`}
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? "redeem-code-error" : undefined}
                        data-autofocus
                    />
                    {error && <p id="redeem-code-error" role="alert" className="mt-2 text-sm text-red-400">{error}</p>}
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || !code.trim()}
                    className={`${BOTON} w-full`}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="animate-spin motion-reduce:animate-none" size={16} aria-hidden="true" />
                            Verificando…
                        </>
                    ) : (
                        <>
                            Vincular cliente
                            <ArrowRight size={16} aria-hidden="true" />
                        </>
                    )}
                </button>

                <p className={`${AYUDA} text-center`}>
                    ¿No funciona? Pide un código nuevo a quien te lo compartió.
                </p>
            </form>
        </Ventana>
    );
}
