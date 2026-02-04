
"use client";

import { useState, useEffect } from "react";
import { X, Key, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

interface RedeemCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function RedeemCodeModal({ isOpen, onClose }: RedeemCodeModalProps) {
    const [mounted, setMounted] = useState(false);
    const [code, setCode] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // Auto-focus input on open
            setTimeout(() => {
                document.getElementById('redeem-code-input')?.focus();
            }, 100);
        } else {
            document.body.style.overflow = 'unset';
            setCode("");
        }

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEsc);

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener("keydown", handleEsc);
        };
    }, [isOpen, onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;

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

            toast.success("¡Cliente vinculado con éxito!", {
                description: "Ahora tienes acceso al cliente compartido."
            });

            onClose();
            router.refresh(); // Refresh to show new client
        } catch (error) {
            console.error("Redeem error:", error);
            const msg = error instanceof Error ? error.message : "Error al vincular cliente";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-[#111] border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-2xl" />

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-stone-500 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="mb-6">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
                        <Key size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Vincular Cliente Compartido</h2>
                    <p className="text-stone-400 mt-1 text-sm">
                        Ingresa el código que te compartieron para acceder al cliente.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="redeem-code-input" className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">
                            Código de Vinculación
                        </label>
                        <input
                            id="redeem-code-input"
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="Ej: WEB-2024-X9Y2"
                            className="w-full bg-stone-900/50 border border-stone-800 rounded-xl p-3 text-white placeholder-stone-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-center text-lg tracking-widest uppercase"
                            autoComplete="off"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !code.trim()}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Verificando...
                            </>
                        ) : (
                            <>
                                <span>Vincular Cliente</span>
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-stone-800/50 text-center">
                    <p className="text-xs text-stone-500">
                        ¿Tienes problemas? Contacta al administrador del proyecto.
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
}
