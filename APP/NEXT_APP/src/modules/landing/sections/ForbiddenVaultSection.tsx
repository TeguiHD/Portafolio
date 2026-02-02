"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { Lock, CreditCard, ShieldCheck, ChevronRight, TrendingUp, TrendingDown, FileText, Shield, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

const modules = [
    {
        id: "finance",
        title: "Control Financiero",
        subtitle: "Dashboard & Proyecciones",
        description: "Gestión de ingresos, egresos y previsión de flujo de caja con reportes en tiempo real.",
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
        subtitle: "Potenciado con IA",
        description: "Análisis y mejora automática de currículums para maximizar oportunidades laborales.",
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
        subtitle: "Logs & Control de Acceso",
        description: "Trazabilidad completa de acciones y control de acceso basado en roles granulares.",
        icon: ShieldCheck,
        color: "text-blue-500",
        colorRgb: "59, 130, 246",
        bg: "bg-blue-500/10",
        border: "hover:border-blue-500/50",
        glow: "hover:shadow-blue-500/20"
    }
];

// Finance Demo Component
function FinanceDemo({ isActive, isWide }: { isActive: boolean; isWide?: boolean }) {
    const [values, setValues] = useState([45, 65, 35, 80, 55, 70, 45]);
    const [currentView, setCurrentView] = useState(0); // 0: dashboard, 1: AI advice, 2: OCR scan
    const [scanProgress, setScanProgress] = useState(0);
    const [aiTyping, setAiTyping] = useState("");
    const [_isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const riskProfiles = ["Conservador", "Moderado", "Agresivo"];
    const [riskProfile] = useState(1); // Moderado

    const aiAdvices = [
        "📊 Tu ratio ahorro/gasto mejoró 12% este mes",
        "💡 Considera diversificar: 40% fijo, 60% variable",
        "⚠️ Alerta: Gastos en suscripciones +23%",
        "✨ Meta de ahorro al 78% - ¡Vas muy bien!",
    ];

    useEffect(() => {
        if (!isActive) {
            setCurrentView(0);
            setScanProgress(0);
            setAiTyping("");
            return;
        }

        // Rotate views - slower for better readability
        const viewInterval = setInterval(() => {
            setCurrentView(prev => (prev + 1) % 3);
        }, 6000);

        // Animate chart - gentler pace
        const chartInterval = setInterval(() => {
            setValues(prev => prev.map(() => Math.floor(Math.random() * 50) + 40));
        }, 2000);

        return () => {
            clearInterval(viewInterval);
            clearInterval(chartInterval);
        };
    }, [isActive]);

    // AI typing effect
    useEffect(() => {
        if (!isActive || currentView !== 1) return;
        const advice = aiAdvices[Math.floor(Math.random() * aiAdvices.length)];
        let i = 0;
        setAiTyping("");
        const typeInterval = setInterval(() => {
            if (i < advice.length) {
                setAiTyping(advice.slice(0, i + 1));
                i++;
            }
        }, 50);
        return () => clearInterval(typeInterval);
        // aiAdvices is a constant array defined above - no need to include in deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive, currentView]);

    // OCR scan animation
    useEffect(() => {
        if (!isActive || currentView !== 2) {
            setScanProgress(0);
            return;
        }
        const scanInterval = setInterval(() => {
            setScanProgress(prev => prev < 100 ? prev + 2 : 0);
        }, 120);
        return () => clearInterval(scanInterval);
    }, [isActive, currentView]);

    return (
        <div className="absolute inset-0 p-4 sm:p-5 flex flex-col">
            {/* Mini header with view tabs */}
            <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] sm:text-[11px] font-mono text-emerald-500/80 font-medium">EN VIVO</span>
                </div>
                <div className="flex gap-1">
                    {["📈", "🤖", "📷"].map((icon, i) => (
                        <motion.div
                            key={i}
                            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-[10px] sm:text-xs cursor-pointer transition-all ${currentView === i ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-white/5'
                                }`}
                            animate={{ scale: currentView === i ? 1.1 : 1 }}
                        >
                            {icon}
                        </motion.div>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {currentView === 0 && (
                    <motion.div
                        key="dashboard"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex-1 flex flex-col"
                    >
                        {/* Stats row */}
                        <div className={`flex gap-2 mb-2 sm:mb-3 ${isWide ? 'flex-row' : 'flex-col sm:flex-row'}`}>
                            <div className="flex-1 bg-emerald-500/10 rounded-lg p-2 border border-emerald-500/20">
                                <div className="flex items-center gap-1 mb-0.5">
                                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                                    <span className="text-[9px] sm:text-[10px] text-emerald-400 font-bold">+24.5%</span>
                                </div>
                                <div className="text-xs sm:text-sm font-bold text-white">$48.2K</div>
                                <div className="text-[7px] sm:text-[9px] text-gray-500">Ingresos</div>
                            </div>
                            <div className="flex-1 bg-red-500/10 rounded-lg p-2 border border-red-500/20">
                                <div className="flex items-center gap-1 mb-0.5">
                                    <TrendingDown className="w-3 h-3 text-red-400" />
                                    <span className="text-[9px] sm:text-[10px] text-red-400 font-bold">-8.2%</span>
                                </div>
                                <div className="text-xs sm:text-sm font-bold text-white">$12.1K</div>
                                <div className="text-[7px] sm:text-[9px] text-gray-500">Gastos</div>
                            </div>
                        </div>

                        {/* Chart bars */}
                        <div className="flex-1 flex items-end gap-1 bg-white/[0.02] rounded-lg p-2 border border-white/5">
                            {values.map((v, i) => (
                                <motion.div
                                    key={i}
                                    className="flex-1 bg-gradient-to-t from-emerald-500 to-emerald-400/60 rounded-t-sm"
                                    initial={{ height: "20%" }}
                                    animate={{ height: `${v}%` }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}

                {currentView === 1 && (
                    <motion.div
                        key="ai-advice"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex-1 flex flex-col"
                    >
                        {/* Risk Profile */}
                        <div className="bg-white/5 rounded-lg p-2 sm:p-3 mb-2 border border-white/10">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] sm:text-[10px] text-gray-400">Tu perfil de inversión</span>
                                <Sparkles className="w-3 h-3 text-amber-400" />
                            </div>
                            <div className="flex gap-1">
                                {riskProfiles.map((profile, i) => (
                                    <div
                                        key={profile}
                                        className={`flex-1 py-1 px-1.5 rounded text-center text-[8px] sm:text-[9px] font-medium transition-all ${i === riskProfile
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                            : 'bg-white/5 text-gray-500'
                                            }`}
                                    >
                                        {profile}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* AI Advice Box */}
                        <div className="flex-1 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-lg p-2 sm:p-3 border border-emerald-500/20">
                            <div className="flex items-center gap-1.5 mb-2">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                </motion.div>
                                <span className="text-[9px] sm:text-[10px] font-medium text-emerald-400">Consejo IA</span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-white/90 leading-relaxed min-h-[32px]">
                                {aiTyping}
                                <motion.span
                                    className="inline-block w-1 h-3 bg-emerald-400 ml-0.5"
                                    animate={{ opacity: [1, 0] }}
                                    transition={{ duration: 0.5, repeat: Infinity }}
                                />
                            </p>
                        </div>
                    </motion.div>
                )}

                {currentView === 2 && (
                    <motion.div
                        key="ocr-scan"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex-1 flex flex-col"
                    >
                        {/* OCR Scanner */}
                        <div className="flex-1 bg-black/40 rounded-lg p-2 sm:p-3 border border-white/10 relative overflow-hidden">
                            {/* Scan area */}
                            <div className="relative h-full bg-white/5 rounded border border-dashed border-white/20 flex flex-col items-center justify-center">
                                {/* Scan line */}
                                <motion.div
                                    className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
                                    style={{ top: `${scanProgress}%` }}
                                />

                                {/* Receipt icon */}
                                <div className="relative">
                                    <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-gray-600" />
                                    <motion.div
                                        className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center"
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                    >
                                        <Sparkles className="w-2.5 h-2.5 text-white" />
                                    </motion.div>
                                </div>

                                <span className="text-[9px] sm:text-[10px] text-gray-400 mt-2">Escaneando factura...</span>

                                {/* Progress */}
                                <div className="w-full max-w-[100px] mt-2 px-4">
                                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-emerald-500"
                                            style={{ width: `${scanProgress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* OCR Results preview */}
                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                            <div className="bg-emerald-500/10 rounded px-2 py-1 border border-emerald-500/20">
                                <span className="text-[7px] sm:text-[8px] text-gray-400 block">Detectado</span>
                                <span className="text-[9px] sm:text-[10px] text-emerald-400 font-medium">$1,250.00</span>
                            </div>
                            <div className="bg-blue-500/10 rounded px-2 py-1 border border-blue-500/20">
                                <span className="text-[7px] sm:text-[8px] text-gray-400 block">Categoría</span>
                                <span className="text-[9px] sm:text-[10px] text-blue-400 font-medium">Servicios</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// CV Optimizer Demo Component - Redesigned with document preview
function CVOptimizerDemo({ isActive, isWide }: { isActive: boolean; isWide?: boolean }) {
    const [phase, setPhase] = useState<'analyzing' | 'suggestions' | 'optimized'>('analyzing');
    const [analysisProgress, setAnalysisProgress] = useState(0);
    const [highlightedLine, setHighlightedLine] = useState(-1);
    const [overallScore, setOverallScore] = useState(42);
    const [_isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const documentLines = [
        { type: 'header', text: 'Nicoholas', suggestion: null },
        { type: 'contact', text: 'contact@nicoholas.dev • +56 9 1234 5678', suggestion: null },
        { type: 'section', text: 'EXPERIENCIA PROFESIONAL', suggestion: null },
        { type: 'job', text: 'Desarrollador en TechCorp', suggestion: '→ "Desarrollador Full Stack Senior"' },
        { type: 'desc', text: 'Trabajé en varios proyectos', suggestion: '→ "Lideré 12 proyectos con +40% ROI"' },
        { type: 'section', text: 'HABILIDADES', suggestion: null },
        { type: 'skills', text: 'JavaScript, React, Node', suggestion: '+ TypeScript, AWS, Docker' },
    ];

    const suggestions = [
        { icon: '🎯', text: 'Añadir métricas cuantificables', status: 'done' as const },
        { icon: '📝', text: 'Optimizar keywords para ATS', status: 'done' as const },
        { icon: '✨', text: 'Mejorar verbos de acción', status: 'current' as const },
        { icon: '📊', text: 'Ajustar formato estándar', status: 'pending' as const },
    ];

    useEffect(() => {
        if (!isActive) {
            setPhase('analyzing');
            setAnalysisProgress(0);
            setHighlightedLine(-1);
            setOverallScore(42);
            return;
        }

        // Slower cycle through phases
        const phaseInterval = setInterval(() => {
            setPhase(prev => {
                if (prev === 'analyzing') return 'suggestions';
                if (prev === 'suggestions') return 'optimized';
                return 'analyzing';
            });
        }, 5000);

        return () => clearInterval(phaseInterval);
    }, [isActive]);

    // Analysis progress animation
    useEffect(() => {
        if (!isActive || phase !== 'analyzing') {
            setAnalysisProgress(0);
            return;
        }
        const interval = setInterval(() => {
            setAnalysisProgress(prev => prev < 100 ? prev + 3 : 100);
        }, 150);
        return () => clearInterval(interval);
    }, [isActive, phase]);

    // Highlight lines during suggestions phase
    useEffect(() => {
        if (!isActive || phase !== 'suggestions') {
            setHighlightedLine(-1);
            return;
        }
        let line = 3; // Start at first improvable line
        const interval = setInterval(() => {
            setHighlightedLine(line);
            line = line === 3 ? 4 : line === 4 ? 6 : 3;
        }, 1800);
        return () => clearInterval(interval);
    }, [isActive, phase]);

    // Score animation
    useEffect(() => {
        if (phase === 'optimized') {
            const interval = setInterval(() => {
                setOverallScore(prev => prev < 98 ? prev + 2 : 98);
            }, 80);
            return () => clearInterval(interval);
        } else if (phase === 'analyzing') {
            setOverallScore(42);
        }
    }, [phase]);

    return (
        <div className="absolute inset-0 p-3 sm:p-4 flex flex-col">
            {/* Header with score */}
            <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2">
                    <motion.div
                        animate={phase === 'analyzing' ? { rotate: 360 } : { rotate: 0 }}
                        transition={{ duration: 2, repeat: phase === 'analyzing' ? Infinity : 0, ease: "linear" }}
                    >
                        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
                    </motion.div>
                    <span className="text-[9px] sm:text-[11px] font-medium text-purple-400">
                        {phase === 'analyzing' ? 'Analizando CV...' : phase === 'suggestions' ? 'Sugerencias IA' : 'CV Optimizado'}
                    </span>
                </div>
                <motion.div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full border"
                    style={{
                        backgroundColor: phase === 'optimized' ? 'rgba(34,197,94,0.15)' : 'rgba(168,85,247,0.15)',
                        borderColor: phase === 'optimized' ? 'rgba(34,197,94,0.3)' : 'rgba(168,85,247,0.3)',
                    }}
                >
                    <motion.span
                        className={`text-xs sm:text-sm font-bold ${phase === 'optimized' ? 'text-green-400' : 'text-purple-400'}`}
                        key={overallScore}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                    >
                        {overallScore}%
                    </motion.span>
                </motion.div>
            </div>

            <div className={`flex-1 flex ${isWide ? 'flex-row gap-3' : 'flex-col gap-2'}`}>
                {/* Mini Document Preview */}
                <div className={`${isWide ? 'flex-1' : 'flex-1'} bg-white/[0.03] rounded-lg p-2 sm:p-3 border border-white/10 overflow-hidden`}>
                    <div className="space-y-1">
                        {documentLines.map((line, i) => (
                            <motion.div
                                key={i}
                                className={`relative rounded px-1.5 py-0.5 transition-all duration-300 ${highlightedLine === i ? 'bg-purple-500/20 border-l-2 border-purple-500' : ''
                                    }`}
                            >
                                <div className={`text-[7px] sm:text-[9px] font-mono ${line.type === 'header' ? 'text-white font-bold text-[9px] sm:text-[11px]' :
                                    line.type === 'section' ? 'text-purple-400 font-semibold mt-1' :
                                        'text-gray-400'
                                    }`}>
                                    {line.text}
                                </div>
                                {highlightedLine === i && line.suggestion && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-[6px] sm:text-[8px] text-green-400 mt-0.5 flex items-center gap-1"
                                    >
                                        <Sparkles className="w-2 h-2" />
                                        {line.suggestion}
                                    </motion.div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Right panel - Progress or Suggestions */}
                <div className={`${isWide ? 'w-32' : ''} flex flex-col gap-1.5`}>
                    {phase === 'analyzing' ? (
                        <div className="flex-1 flex flex-col items-center justify-center bg-purple-500/10 rounded-lg p-2 border border-purple-500/20">
                            <div className="relative w-12 h-12 sm:w-14 sm:h-14 mb-2">
                                <svg className="w-full h-full -rotate-90">
                                    <circle cx="50%" cy="50%" r="45%" fill="none" stroke="rgba(168,85,247,0.2)" strokeWidth="3" />
                                    <motion.circle
                                        cx="50%" cy="50%" r="45%" fill="none" stroke="rgb(168,85,247)" strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeDasharray={`${analysisProgress * 2.83} 283`}
                                    />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-bold text-purple-400">
                                    {analysisProgress}%
                                </span>
                            </div>
                            <span className="text-[8px] sm:text-[10px] text-purple-400/80 text-center">Escaneando documento</span>
                        </div>
                    ) : (
                        suggestions.map((sug, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.15 }}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[7px] sm:text-[9px] ${sug.status === 'done' ? 'bg-green-500/10 text-green-400' :
                                    sug.status === 'current' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                        'bg-white/5 text-gray-500'
                                    }`}
                            >
                                <span>{sug.icon}</span>
                                <span className="flex-1 truncate">{sug.text}</span>
                                {sug.status === 'done' && <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />}
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// Security Demo Component  
function SecurityDemo({ isActive }: { isActive: boolean }) {
    const [logs, setLogs] = useState<string[]>([]);
    const [_isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const logTemplates = [
        "[AUTH] Inicio sesión: admin@corp.com",
        "[RBAC] Permiso concedido: LECTURA",
        "[SCAN] Análisis vulnerabilidades: OK",
        "[LOG] Sesión #8847 iniciada",
        "[AUTH] Verificación 2FA: ÉXITO",
        "[RBAC] Rol asignado: ADMIN",
        "[SCAN] Puerto 443: SEGURO",
        "[LOG] API /v1/users: 200 OK",
    ];

    useEffect(() => {
        if (!isActive) {
            setLogs([]);
            return;
        }
        const interval = setInterval(() => {
            setLogs(prev => {
                const newLog = logTemplates[Math.floor(Math.random() * logTemplates.length)];
                const updated = [...prev, newLog];
                return updated.slice(-5);
            });
        }, 1500);
        return () => clearInterval(interval);
        // logTemplates is a constant array defined in component scope
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive]);

    return (
        <div className="absolute inset-0 p-4 sm:p-5 flex flex-col">
            {/* Terminal header */}
            <div className="flex items-center gap-2 mb-3 bg-black/40 rounded-t-xl px-3 py-2 border border-white/5">
                <div className="flex gap-1.5">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500" />
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-yellow-500" />
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500" />
                </div>
                <span className="text-[9px] sm:text-[11px] font-mono text-gray-400 ml-2">~/auditoria-seguridad.log</span>
            </div>

            {/* Terminal content */}
            <div className="flex-1 bg-black/60 rounded-b-xl p-3 overflow-hidden font-mono border border-t-0 border-white/5">
                <AnimatePresence mode="popLayout">
                    {logs.map((log, i) => (
                        <motion.div
                            key={`${log}-${i}-${Date.now()}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0.3 }}
                            className="text-[8px] sm:text-[10px] text-blue-400 leading-loose"
                        >
                            <span className="text-green-500">$</span> {log}
                        </motion.div>
                    ))}
                </AnimatePresence>
                <div className="flex items-center mt-1">
                    <span className="text-green-500 text-[8px] sm:text-[10px]">$</span>
                    <motion.span
                        className="inline-block w-1.5 sm:w-2 h-3 sm:h-4 bg-blue-400 ml-1"
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                    />
                </div>
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between mt-3 px-1">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] sm:text-xs text-green-400 font-medium">Sistema Protegido</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                    <Shield className="w-3 h-3 text-green-400" />
                    <span className="text-[8px] sm:text-[10px] text-green-400 font-mono">0 amenazas</span>
                </div>
            </div>
        </div>
    );
}

// Subtle Restricted Overlay - Always visible but doesn't block view
function RestrictedOverlay({ color: _color, colorRgb }: { color: string; colorRgb: string }) {
    const [scanLine, setScanLine] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setScanLine(prev => (prev + 1) % 120);
        }, 100);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            {/* Very subtle scan line - like security camera */}
            <motion.div
                className="absolute left-0 right-0 h-[1px] pointer-events-none z-20 opacity-30"
                style={{
                    top: `${scanLine}%`,
                    background: `linear-gradient(90deg, transparent, rgba(${colorRgb}, 0.6), transparent)`,
                }}
            />

            {/* Subtle CRT/monitor effect lines */}
            <div
                className="absolute inset-0 pointer-events-none z-10 opacity-[0.03]"
                style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
                }}
            />
        </>
    );
}

// Floating Lock Badge - Indicates restricted access subtly
function RestrictedBadge({ color, colorRgb, isHovered }: { color: string; colorRgb: string; isHovered: boolean }) {
    return (
        <motion.div
            className="absolute top-3 right-3 z-30"
            initial={{ scale: 1 }}
            animate={{ scale: isHovered ? 1.1 : 1 }}
        >
            <motion.div
                className="relative flex items-center gap-1.5 px-2 py-1 rounded-full border backdrop-blur-sm"
                style={{
                    backgroundColor: `rgba(0, 0, 0, 0.6)`,
                    borderColor: `rgba(${colorRgb}, 0.3)`,
                }}
                animate={{
                    borderColor: isHovered
                        ? `rgba(${colorRgb}, 0.6)`
                        : `rgba(${colorRgb}, 0.3)`,
                }}
            >
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <Lock className={`w-3 h-3 ${color}`} />
                </motion.div>
                <AnimatePresence>
                    {isHovered && (
                        <motion.span
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 'auto', opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className={`text-[9px] sm:text-[10px] font-medium ${color} whitespace-nowrap overflow-hidden`}
                        >
                            Solo clientes
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}

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
            {/* Demo always running in background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[#0a0a0a]" />
                {mod.id === "cv" ? (
                    <CVOptimizerDemo isActive={true} isWide={isWide} />
                ) : mod.id === "finance" ? (
                    <FinanceDemo isActive={true} isWide={isWide} />
                ) : (
                    <SecurityDemo isActive={true} />
                )}
            </div>

            {/* Subtle security overlay effect */}
            <RestrictedOverlay color={mod.color} colorRgb={mod.colorRgb} />

            {/* Floating badge */}
            <RestrictedBadge color={mod.color} colorRgb={mod.colorRgb} isHovered={isHovered} />

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
                        animate={{ opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
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
                            Zona Restringida
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
                            Infraestructura <span className="text-amber-500">Privada</span>
                        </h2>
                        <p className="text-base sm:text-lg text-gray-400 max-w-xl">
                            Módulos de alto rendimiento para gestión crítica. Solo clientes activos.
                        </p>
                    </div>

                    <Link href="#contact">
                        <Button
                            variant="outline"
                            className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10 inline-flex items-center gap-2 whitespace-nowrap"
                        >
                            <span className="whitespace-nowrap">Solicitar Acceso</span>
                            <ChevronRight className="w-4 h-4 shrink-0" />
                        </Button>
                    </Link>
                </div>

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
