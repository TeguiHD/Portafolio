"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { Lock, CreditCard, ShieldCheck, ChevronRight, Sparkles } from "lucide-react";
import { useMotionActivity } from "../motion/LandingMotionProvider";

const modules = [
    {
        id: "finance",
        title: "Control Financiero",
        subtitle: "Ingresos, gastos y planificación",
        description: "Centraliza movimientos y consulta proyecciones para entender cómo cambia tu flujo de caja.",
        icon: CreditCard,
        color: "text-emerald-500",
        colorRgb: "16, 185, 129",
        bg: "bg-emerald-500/10",
        border: "hover:border-emerald-500/50",
        glow: "hover:shadow-emerald-500/20"
    },
    {
        id: "cv",
        title: "Optimizador CV",
        subtitle: "Revisión y estructura del documento",
        description: "Revisa la estructura y claridad del currículum con sugerencias que puedes evaluar antes de aplicarlas.",
        icon: Sparkles,
        color: "text-purple-500",
        colorRgb: "168, 85, 247",
        bg: "bg-purple-500/10",
        border: "hover:border-purple-500/50",
        glow: "hover:shadow-purple-500/20"
    },
    {
        id: "audit",
        title: "Auditoría de Seguridad",
        subtitle: "Roles, sesiones y registro de actividad",
        description: "Consulta eventos y organiza permisos por rol para revisar quién puede acceder a cada área.",
        icon: ShieldCheck,
        color: "text-blue-500",
        colorRgb: "59, 130, 246",
        bg: "bg-blue-500/10",
        border: "hover:border-blue-500/50",
        glow: "hover:shadow-blue-500/20"
    }
];

import { FinanceDemo, CVOptimizerDemo, SecurityDemo, RestrictedOverlay, RestrictedBadge } from "./vault-demos";

// Info Panel - Appears on hover/tap over the demo
function InfoPanel({ mod, isVisible, isMobile: _isMobile }: { mod: typeof modules[0]; isVisible: boolean; isMobile: boolean }) {
    return (
        <motion.div
            className="absolute bottom-0 left-0 right-0 z-25 pointer-events-none"
            initial={{ y: 20, opacity: 0 }}
            animate={{
                y: isVisible ? 0 : 20,
                opacity: isVisible ? 1 : 0
            }}
            transition={{ duration: 0.3 }}
        >
            <div
                className="p-3 sm:p-4 backdrop-blur-md border-t"
                style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.8))',
                    borderColor: `rgba(${mod.colorRgb}, 0.2)`,
                }}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-white mb-1">{mod.title}</h4>
                        <p className="text-[10px] sm:text-xs text-gray-400 line-clamp-2">{mod.description}</p>
                    </div>
                    <Link
                        href="#contact"
                        className="pointer-events-auto shrink-0"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <motion.div
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[9px] sm:text-[10px] font-semibold border"
                            style={{
                                borderColor: `rgba(${mod.colorRgb}, 0.5)`,
                                color: `rgb(${mod.colorRgb})`,
                                backgroundColor: `rgba(${mod.colorRgb}, 0.1)`,
                            }}
                            whileHover={{ scale: 1.05, backgroundColor: `rgba(${mod.colorRgb}, 0.2)` }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Lock className="w-3 h-3" />
                            <span className="hidden sm:inline">Solicitar</span>
                        </motion.div>
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}

// Module Card Component - Redesigned with always-visible demos
function ModuleCard({ mod, index, layout }: { mod: typeof modules[0]; index: number; layout: 'pillar' | 'wide' | 'normal' }) {
    const { ref, active: isActive } = useMotionActivity();
    const [isHovered, setIsHovered] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [_isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleInteraction = useCallback(() => {
        if (isMobile) {
            setIsHovered(prev => !prev);
        }
    }, [isMobile]);

    const isPillar = layout === 'pillar';
    const isWide = layout === 'wide';

    return (
        <motion.div
            ref={ref}
            data-motion-active={isActive}
            data-demo={mod.id}
            tabIndex={0}
            onFocus={() => setIsHovered(true)}
            onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsHovered(false); }}
            onKeyDown={(event) => { if (event.key === "Escape") setIsHovered(false); }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: true }}
            className={`group relative bg-[#0a0a0a] border border-white/5 rounded-2xl sm:rounded-3xl transition-all duration-500 cursor-pointer overflow-hidden ${mod.border} ${mod.glow} hover:shadow-xl`}
            style={{
                minHeight: isMobile
                    ? (isPillar ? '200px' : isWide ? '180px' : '320px')
                    : '320px'
            }}
            onMouseEnter={() => !isMobile && setIsHovered(true)}
            onMouseLeave={() => !isMobile && setIsHovered(false)}
            onClick={handleInteraction}
        >
            {/* Demo runs only when visible and motion is allowed */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[#0a0a0a]" />
                {mod.id === "cv" ? (
                    <CVOptimizerDemo isActive={isActive} isWide={isWide} />
                ) : mod.id === "finance" ? (
                    <FinanceDemo isActive={isActive} isWide={isWide} />
                ) : (
                    <SecurityDemo isActive={isActive} />
                )}
            </div>

            {/* Subtle security overlay effect */}
            <RestrictedOverlay colorRgb={mod.colorRgb} isActive={isActive} />

            {/* Floating badge */}
            <RestrictedBadge color={mod.color} colorRgb={mod.colorRgb} isHovered={isHovered} isActive={isActive} />

            {/* Blur overlay on hover/tap for readability */}
            <motion.div
                className="absolute inset-0 z-15 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                style={{
                    backdropFilter: isHovered ? 'blur(4px)' : 'blur(0px)',
                    WebkitBackdropFilter: isHovered ? 'blur(4px)' : 'blur(0px)',
                    background: `linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 50%, rgba(${mod.colorRgb},0.1) 100%)`,
                }}
            />

            {/* Title overlay at top - full width gradient */}
            <div
                className="absolute top-0 left-0 right-0 z-20 p-3 sm:p-4"
                style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)',
                }}
            >
                <div className="flex items-center gap-2 mb-1 pr-10">
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg ${mod.bg} ${mod.color} flex items-center justify-center shrink-0`}>
                        <mod.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="min-w-0">
                        <h3 className={`${isPillar ? 'text-xs' : 'text-sm sm:text-base'} font-bold text-white leading-tight`}>
                            {mod.title}
                        </h3>
                        <p className={`${isPillar ? 'text-[8px]' : 'text-[9px] sm:text-[11px]'} text-gray-400`}>
                            {mod.subtitle}
                        </p>
                    </div>
                </div>
            </div>

            {/* Info panel on hover */}
            <InfoPanel mod={mod} isVisible={isHovered} isMobile={isMobile} />

            {/* Mobile tap hint - subtle */}
            {isMobile && !isHovered && (
                <div className="absolute bottom-2 left-0 right-0 z-20 flex justify-center">
                    <motion.div
                        className="inline-flex items-center justify-center px-2 py-1 bg-black/60 rounded-full"
                        animate={{ opacity: isActive ? [0.5, 0.8, 0.5] : 0.8 }}
                        transition={{ duration: isActive ? 2 : 0, repeat: isActive ? Infinity : 0 }}
                    >
                        <span className="text-[8px] text-gray-400 text-center leading-none">Toca para más info</span>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}

export function ForbiddenVaultSection() {
    return (
        <section id="vault" className="relative py-24 sm:py-32 px-4 sm:px-6">

            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.15),transparent_70%)] -z-10 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]" />

            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-6">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-950/30 border border-amber-500/20 text-amber-500 rounded-full text-xs font-bold tracking-wider uppercase">
                            <Lock className="w-3 h-3" />
                            Software de uso interno
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
                            Infraestructura <span className="text-amber-500">Privada</span>
                        </h2>
                        <p className="text-base sm:text-lg text-gray-400 max-w-xl">
                            El trabajo que ocurre detrás de una plataforma: organizar la operación, preparar documentos y administrar accesos desde un entorno propio.
                        </p>
                    </div>

                    <Link href="#contact" className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-amber-500/30 px-6 py-3 text-amber-400 hover:bg-amber-500/10">
                            <span className="whitespace-nowrap">Conversar sobre un sistema</span>
                            <ChevronRight className="w-4 h-4 shrink-0" />
                    </Link>
                </div>

                <p className="mb-4 text-xs leading-relaxed text-slate-400"><span className="font-medium text-amber-300">Vistas de demostración.</span> Los movimientos, documentos, puntuaciones y eventos que ves a continuación son simulados. El acceso a los sistemas reales es privado.</p>

                {/* Desktop Grid - 3 columns */}
                <div className="hidden sm:grid sm:grid-cols-3 gap-6">
                    {modules.map((mod, i) => (
                        <ModuleCard key={mod.id} mod={mod} index={i} layout="normal" />
                    ))}
                </div>

                {/* Mobile Grid - 2 pillars top + 1 wide bottom */}
                <div className="sm:hidden flex flex-col gap-3">
                    {/* Top row: 2 pillars */}
                    <div className="grid grid-cols-2 gap-3">
                        <ModuleCard mod={modules[0]} index={0} layout="pillar" />
                        <ModuleCard mod={modules[1]} index={1} layout="pillar" />
                    </div>
                    {/* Bottom: wide card */}
                    <ModuleCard mod={modules[2]} index={2} layout="wide" />
                </div>

            </div>
        </section>
    );
}
