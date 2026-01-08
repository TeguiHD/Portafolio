"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    generateLatexWithDesign,
    downloadLatex,
    copyToClipboard,
    type CvData,
} from "../utils/latex-templates-enhanced";
import { type CvDesignConfig, CV_THEMES } from "../utils/cv-design";
import { useToast } from "@/components/ui/Toast";

interface LatexPreviewEnhancedProps {
    data: CvData;
    designConfig: CvDesignConfig;
}

export function LatexPreviewEnhanced({ data, designConfig }: LatexPreviewEnhancedProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeView, setActiveView] = useState<"latex" | "info">("latex");
    const { success, error } = useToast();

    // Generate LaTeX with current design config
    const latexContent = useMemo(
        () => generateLatexWithDesign(data, designConfig),
        [data, designConfig]
    );

    // Calculate document stats
    const stats = useMemo(() => {
        const lines = latexContent.split("\n").length;
        const chars = latexContent.length;
        const sections = designConfig.sections.filter((s) => s.visible).length;
        const experienceCount = data.experience.length;
        const educationCount = data.education.length;
        const skillCategories = data.skills.length;
        const projectCount = data.projects.length;
        const certCount = data.certifications?.length || 0;
        const langCount = data.languages?.length || 0;

        return {
            lines,
            chars,
            sections,
            experienceCount,
            educationCount,
            skillCategories,
            projectCount,
            certCount,
            langCount,
        };
    }, [latexContent, designConfig.sections, data]);

    const handleCopy = async () => {
        const result = await copyToClipboard(latexContent);
        if (result) {
            success("Código LaTeX copiado al portapapeles");
        } else {
            error("Error al copiar");
        }
    };

    const handleDownload = () => {
        const safeName = data.personalInfo.name.replace(/\s+/g, "_").toLowerCase();
        const filename = `cv_${safeName}_${designConfig.theme}.tex`;
        downloadLatex(latexContent, filename);
        success(`Archivo ${filename} descargado`);
    };

    const handleOpenOverleaf = () => {
        // Encode LaTeX for Overleaf URL
        const encoded = encodeURIComponent(latexContent);
        const overleafUrl = `https://www.overleaf.com/docs?snip_uri=data:text/x-tex;base64,${btoa(unescape(encodeURIComponent(latexContent)))}`;
        window.open(overleafUrl, "_blank");
        success("Abriendo en Overleaf...");
    };

    return (
        <div className="space-y-6">
            {/* Export Options Panel */}
            <div className="glass-panel rounded-2xl border border-accent-1/20 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            Exportar CV
                            <span className="px-2 py-0.5 rounded-full bg-accent-1/20 text-accent-1 text-xs">
                                {CV_THEMES[designConfig.theme].name}
                            </span>
                        </h3>
                        <p className="text-sm text-neutral-400 mt-1">
                            Descarga el código LaTeX para compilar tu CV profesional
                        </p>
                    </div>
                </div>

                {/* Export Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleDownload}
                        className="flex flex-col items-center gap-3 p-4 rounded-xl bg-accent-1/10 border border-accent-1/30 hover:bg-accent-1/20 transition-colors"
                    >
                        <div className="w-12 h-12 rounded-xl bg-accent-1/20 flex items-center justify-center text-accent-1">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <p className="font-medium text-white">Descargar .tex</p>
                            <p className="text-xs text-neutral-400">Archivo LaTeX completo</p>
                        </div>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCopy}
                        className="flex flex-col items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <p className="font-medium text-white">Copiar código</p>
                            <p className="text-xs text-neutral-400">Al portapapeles</p>
                        </div>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleOpenOverleaf}
                        className="flex flex-col items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 transition-colors"
                    >
                        <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <p className="font-medium text-white">Abrir en Overleaf</p>
                            <p className="text-xs text-neutral-400">Compilar online</p>
                        </div>
                    </motion.button>
                </div>

                {/* Document Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-white/5">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-white">{stats.lines}</p>
                        <p className="text-xs text-neutral-400">Líneas</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-white">{stats.sections}</p>
                        <p className="text-xs text-neutral-400">Secciones</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-white">{stats.experienceCount + stats.projectCount}</p>
                        <p className="text-xs text-neutral-400">Entradas</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-white">{(stats.chars / 1000).toFixed(1)}K</p>
                        <p className="text-xs text-neutral-400">Caracteres</p>
                    </div>
                </div>
            </div>

            {/* Code Preview */}
            <div className="glass-panel rounded-2xl border border-accent-1/20 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setActiveView("latex")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeView === "latex"
                                    ? "bg-accent-1/20 text-accent-1"
                                    : "text-neutral-400 hover:text-white"
                            }`}
                        >
                            Código LaTeX
                        </button>
                        <button
                            onClick={() => setActiveView("info")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeView === "info"
                                    ? "bg-accent-1/20 text-accent-1"
                                    : "text-neutral-400 hover:text-white"
                            }`}
                        >
                            Información
                        </button>
                    </div>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-sm text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                        {isExpanded ? "Colapsar" : "Expandir"}
                        <svg
                            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>

                {activeView === "latex" ? (
                    <div className="relative">
                        <div
                            className={`bg-[#1e1e1e] rounded-xl border border-white/10 overflow-hidden transition-all duration-300 ${
                                isExpanded ? "max-h-none" : "max-h-96"
                            }`}
                        >
                            {/* Code Header */}
                            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                                    <span className="ml-2 text-xs text-neutral-400">
                                        cv_{data.personalInfo.name.replace(/\s+/g, "_").toLowerCase()}.tex
                                    </span>
                                </div>
                                <span className="text-xs text-neutral-500">
                                    {stats.lines} líneas • {stats.chars.toLocaleString()} caracteres
                                </span>
                            </div>

                            {/* Code Content */}
                            <pre className="p-4 text-sm font-mono text-neutral-300 overflow-x-auto whitespace-pre">
                                <code>{latexContent}</code>
                            </pre>

                            {/* Gradient overlay when collapsed */}
                            {!isExpanded && (
                                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#1e1e1e] to-transparent pointer-events-none" />
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Compilation Instructions */}
                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <h4 className="font-medium text-blue-400 mb-2">📝 Instrucciones de compilación</h4>
                            <ol className="text-sm text-neutral-300 space-y-2 list-decimal list-inside">
                                <li>Descarga el archivo .tex o cópialo</li>
                                <li>Abre el archivo en <strong>Overleaf</strong>, <strong>TeXShop</strong>, o tu editor LaTeX preferido</li>
                                <li>Asegúrate de tener instalados los paquetes: <code className="text-accent-1">fontawesome5</code>, <code className="text-accent-1">hyperref</code>, <code className="text-accent-1">geometry</code></li>
                                <li>Compila con <strong>pdflatex</strong> o <strong>xelatex</strong></li>
                            </ol>
                        </div>

                        {/* Required Packages */}
                        <div className="p-4 rounded-xl bg-white/5">
                            <h4 className="font-medium text-white mb-3">📦 Paquetes requeridos</h4>
                            <div className="flex flex-wrap gap-2">
                                {["inputenc", "fontenc", "babel", "geometry", "enumitem", "hyperref", "fontawesome5", "xcolor", "fancyhdr", "lastpage"].map(
                                    (pkg) => (
                                        <span
                                            key={pkg}
                                            className="px-2 py-1 rounded-lg bg-white/10 text-neutral-300 text-xs font-mono"
                                        >
                                            {pkg}
                                        </span>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Current Configuration */}
                        <div className="p-4 rounded-xl bg-white/5">
                            <h4 className="font-medium text-white mb-3">⚙️ Configuración actual</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-neutral-400">Tema:</span>{" "}
                                    <span className="text-white">{CV_THEMES[designConfig.theme].name}</span>
                                </div>
                                <div>
                                    <span className="text-neutral-400">Idioma:</span>{" "}
                                    <span className="text-white">{designConfig.language === "es" ? "Español" : "English"}</span>
                                </div>
                                <div>
                                    <span className="text-neutral-400">Tamaño:</span>{" "}
                                    <span className="text-white">{designConfig.page.size.toUpperCase()}</span>
                                </div>
                                <div>
                                    <span className="text-neutral-400">Formato fecha:</span>{" "}
                                    <span className="text-white capitalize">{designConfig.dateFormat}</span>
                                </div>
                            </div>
                        </div>

                        {/* Content Summary */}
                        <div className="p-4 rounded-xl bg-white/5">
                            <h4 className="font-medium text-white mb-3">📊 Contenido del CV</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-accent-1"></span>
                                    <span className="text-neutral-400">Experiencias:</span>
                                    <span className="text-white">{stats.experienceCount}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                                    <span className="text-neutral-400">Educación:</span>
                                    <span className="text-white">{stats.educationCount}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                                    <span className="text-neutral-400">Proyectos:</span>
                                    <span className="text-white">{stats.projectCount}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                                    <span className="text-neutral-400">Skills:</span>
                                    <span className="text-white">{stats.skillCategories} categorías</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                    <span className="text-neutral-400">Certificaciones:</span>
                                    <span className="text-white">{stats.certCount}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                    <span className="text-neutral-400">Idiomas:</span>
                                    <span className="text-white">{stats.langCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
