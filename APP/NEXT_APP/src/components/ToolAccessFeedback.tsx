"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { ToolAccessType } from "@/hooks/useToolAccess";

interface ToolAccessFeedbackProps {
    accessType: ToolAccessType;
    toolSlug: string;
}

export function ToolAccessFeedback({ accessType, toolSlug }: ToolAccessFeedbackProps) {
    if (accessType === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-950">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-accent-1/30 border-t-accent-1 animate-spin" />
                    <p className="text-neutral-400">Verificando acceso...</p>
                </motion.div>
            </div>
        );
    }

    if (accessType === "admin_only") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full text-center"
                >
                    {/* Lock icon animation */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 10, delay: 0.2 }}
                        className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center"
                    >
                        <motion.svg
                            className="w-12 h-12 text-amber-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1, delay: 0.5 }}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                        </motion.svg>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-2xl font-bold text-white mb-3"
                    >
                        Acceso Restringido
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-neutral-400 mb-6"
                    >
                        Esta herramienta requiere una cuenta con permisos especiales.
                        Solicita acceso para poder utilizarla.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-col sm:flex-row gap-3 justify-center"
                    >
                        <Link
                            href={`/acceso?redirect=${encodeURIComponent(`/herramientas/${toolSlug}`)}`}
                            className="px-6 py-3 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-colors"
                        >
                            Solicitar Acceso
                        </Link>
                        <Link
                            href="/herramientas"
                            className="px-6 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                        >
                            Ver otras herramientas
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    if (accessType === "private") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4 overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full text-center relative"
                >
                    {/* Animated background particles */}
                    <div className="absolute inset-0 -z-10">
                        {[...Array(6)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-3 h-3 rounded-full bg-teal-500/30"
                                style={{
                                    left: `${20 + Math.random() * 60}%`,
                                    top: `${20 + Math.random() * 60}%`,
                                }}
                                animate={{
                                    y: [0, -20, 0],
                                    opacity: [0.3, 0.6, 0.3],
                                    scale: [1, 1.2, 1],
                                }}
                                transition={{
                                    duration: 2 + Math.random(),
                                    repeat: Infinity,
                                    delay: Math.random() * 2,
                                }}
                            />
                        ))}
                    </div>

                    {/* Wrench + Gear animation */}
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", damping: 10, delay: 0.2 }}
                        className="w-28 h-28 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30 flex items-center justify-center relative"
                    >
                        {/* Gear spinning */}
                        <motion.svg
                            className="w-10 h-10 text-teal-400 absolute"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        >
                            <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                        </motion.svg>
                        {/* Wrench */}
                        <motion.svg
                            className="w-8 h-8 text-emerald-400 absolute top-3 right-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            animate={{ rotate: [-10, 10, -10] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                        </motion.svg>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-2xl font-bold text-white mb-3"
                    >
                        ¡Estamos Mejorando! 🚀
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-neutral-400 mb-2"
                    >
                        Esta herramienta está en mantenimiento.
                    </motion.p>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-neutral-500 text-sm mb-6"
                    >
                        Estamos trabajando para traerte algo increíble. ¡Vuelve pronto!
                    </motion.p>

                    {/* Progress bar animation */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-6"
                    >
                        <motion.div
                            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                            initial={{ width: "0%" }}
                            animate={{ width: "75%" }}
                            transition={{ duration: 2, delay: 0.8, ease: "easeOut" }}
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                    >
                        <Link
                            href="/herramientas"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-500/20 text-teal-300 font-medium hover:bg-teal-500/30 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Explorar otras herramientas
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    if (accessType === "blocked") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full text-center"
                >
                    {/* Stop icon */}
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", damping: 10, delay: 0.2 }}
                        className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/30 flex items-center justify-center"
                    >
                        <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-2xl font-bold text-white mb-3"
                    >
                        Acceso Bloqueado
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-neutral-400 mb-6"
                    >
                        Tu acceso a esta herramienta ha sido restringido por razones de seguridad.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <Link
                            href="/herramientas"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Volver a herramientas
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    if (accessType === "error") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full text-center"
                >
                    {/* Shield warning icon */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 10, delay: 0.2 }}
                        className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 flex items-center justify-center"
                    >
                        <svg className="w-12 h-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-2xl font-bold text-white mb-3"
                    >
                        Error de Verificación
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-neutral-400 mb-6"
                    >
                        No pudimos verificar tu acceso a esta herramienta. Por seguridad, el acceso ha sido bloqueado temporalmente.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-col sm:flex-row gap-3 justify-center"
                    >
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 rounded-xl bg-yellow-500/20 text-yellow-300 font-medium hover:bg-yellow-500/30 transition-colors"
                        >
                            Reintentar
                        </button>
                        <Link
                            href="/herramientas"
                            className="px-6 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                        >
                            Ver otras herramientas
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    // Default: authorized - don't render anything, let the tool render
    return null;
}

