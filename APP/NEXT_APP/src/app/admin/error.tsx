"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log to error monitoring service if available
        console.error("[Admin Error]", error);
    }, [error]);

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <AlertTriangle size={32} className="text-red-400" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-xl font-bold text-white">Algo salió mal</h2>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Ocurrió un error al cargar esta sección. Puedes intentar de nuevo o volver al panel principal.
                    </p>
                    {error.digest && (
                        <p className="text-xs text-slate-600 font-mono">
                            Código: {error.digest}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={reset}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <RefreshCw size={16} />
                        Reintentar
                    </button>
                    <Link
                        href="/admin"
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Home size={16} />
                        Ir al panel
                    </Link>
                </div>
            </div>
        </div>
    );
}
