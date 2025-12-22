"use client";

import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724] px-6 text-center">
            {/* Glowing orb background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-r from-[#FF8A00]/10 to-[#00B8A9]/10 blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-md">
                {/* Error Code */}
                <div className="mb-6">
                    <span className="inline-block text-[140px] sm:text-[180px] font-black leading-none bg-gradient-to-br from-white/20 via-white/10 to-transparent bg-clip-text text-transparent select-none">
                        404
                    </span>
                </div>

                {/* Icon */}
                <div className="mb-6 flex justify-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF8A00]/20 to-[#FF8A00]/5 border border-[#FF8A00]/30 flex items-center justify-center">
                        <svg className="w-10 h-10 text-[#FF8A00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>

                {/* Text */}
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                    Página no encontrada
                </h1>
                <p className="text-neutral-400 mb-8">
                    El contenido que buscas no existe o fue movido a otra ubicación.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                        href="/"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#FF6A00] text-white font-semibold hover:opacity-90 transition-opacity"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Volver al inicio
                    </Link>
                    <button
                        onClick={() => typeof window !== "undefined" && window.history.back()}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-white hover:bg-white/5 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver atrás
                    </button>
                </div>
            </div>

            {/* Footer */}
            <p className="absolute bottom-6 text-xs text-neutral-600">
                Error 404 • nicoholas.dev
            </p>
        </div>
    );
}
