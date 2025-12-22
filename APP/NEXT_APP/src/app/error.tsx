"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Application error:", error);
    }, [error]);

    return (
        <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724] px-6 text-center">
            {/* Glowing orb background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-r from-red-500/10 to-orange-500/10 blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-md">
                {/* Error Code */}
                <div className="mb-6">
                    <span className="inline-block text-[140px] sm:text-[180px] font-black leading-none bg-gradient-to-br from-white/20 via-white/10 to-transparent bg-clip-text text-transparent select-none">
                        500
                    </span>
                </div>

                {/* Icon */}
                <div className="mb-6 flex justify-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/30 flex items-center justify-center">
                        <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>
                </div>

                {/* Text */}
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                    Algo salió mal
                </h1>
                <p className="text-neutral-400 mb-8">
                    Ocurrió un error inesperado. Por favor intenta nuevamente.
                </p>

                {/* Error digest for debugging */}
                {error.digest && (
                    <p className="text-xs text-neutral-600 mb-4 font-mono">
                        ID: {error.digest}
                    </p>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                        onClick={reset}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#FF6A00] text-white font-semibold hover:opacity-90 transition-opacity"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Intentar de nuevo
                    </button>
                    <Link
                        href="/"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-white hover:bg-white/5 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Ir al inicio
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <p className="absolute bottom-6 text-xs text-neutral-600">
                Error 500 • nicoholas.dev
            </p>
        </div>
    );
}
