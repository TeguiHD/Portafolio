"use client";

import Link from "next/link";

export default function ForbiddenPage() {
    return (
        <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724] px-6 text-center">
            {/* Glowing orb background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-r from-yellow-500/10 to-orange-500/10 blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-md">
                {/* Error Code */}
                <div className="mb-6">
                    <span className="inline-block text-[140px] sm:text-[180px] font-black leading-none bg-gradient-to-br from-white/20 via-white/10 to-transparent bg-clip-text text-transparent select-none">
                        403
                    </span>
                </div>

                {/* Icon */}
                <div className="mb-6 flex justify-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border border-yellow-500/30 flex items-center justify-center">
                        <svg className="w-10 h-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                    </div>
                </div>

                {/* Text */}
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                    Acceso denegado
                </h1>
                <p className="text-neutral-400 mb-8">
                    No tienes permisos para acceder a este recurso. Contacta al administrador si crees que esto es un error.
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
                    <Link
                        href="/login"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-white hover:bg-white/5 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Iniciar sesión
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <p className="absolute bottom-6 text-xs text-neutral-600">
                Error 403 • nicoholas.dev
            </p>
        </div>
    );
}
