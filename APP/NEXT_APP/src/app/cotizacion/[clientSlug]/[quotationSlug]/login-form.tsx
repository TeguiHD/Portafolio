"use client";

import { useState, useTransition } from "react";
import { verifyQuotationAccessAction } from "./actions";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, AlertCircle, Loader2 } from "lucide-react";

interface LoginFormProps {
    clientSlug: string;
    quotationSlug: string;
    clientName: string;
    projectName: string;
}

export default function QuotationLoginForm({
    clientSlug,
    quotationSlug,
    clientName,
    projectName
}: LoginFormProps) {
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;

        setError("");
        startTransition(async () => {
            const result = await verifyQuotationAccessAction(clientSlug, quotationSlug, code);
            if (result.success) {
                router.refresh();
            } else {
                setError(result.error || "Error de acceso");
            }
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Brand */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                        <Lock className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Acceso a Cotización</h1>
                    <p className="text-slate-400 text-sm">{clientName}</p>
                </div>

                {/* Card */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
                    <div className="mb-6">
                        <p className="text-slate-300 text-sm mb-1">Documento:</p>
                        <p className="text-white font-semibold">{projectName}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">
                                Código de Acceso
                            </label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="Ingresa el código..."
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                autoFocus
                                disabled={isPending}
                            />
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isPending || !code.trim()}
                            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Verificando...
                                </>
                            ) : (
                                <>
                                    Acceder
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-600 text-xs mt-6">
                    El código fue enviado por el proveedor del servicio.
                    <br />
                    Si no lo tienes, contacta a quien te envió este enlace.
                </p>
            </div>
        </div>
    );
}
