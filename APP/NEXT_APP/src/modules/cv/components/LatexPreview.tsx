"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { generateLatex, downloadLatex, copyToClipboard, type CvData } from "../utils/latex-templates";
import { useToast } from "@/components/ui/Toast";

interface LatexPreviewProps {
    data: CvData;
}

export function LatexPreview({ data }: LatexPreviewProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { success, error } = useToast();

    const latexContent = generateLatex(data);

    const handleCopy = async () => {
        const result = await copyToClipboard(latexContent);
        if (result) {
            success("Código LaTeX copiado al portapapeles");
        } else {
            error("Error al copiar");
        }
    };

    const handleDownload = () => {
        const filename = `cv_${data.personalInfo.name.replace(/\s+/g, "_").toLowerCase()}.tex`;
        downloadLatex(latexContent, filename);
        success(`Archivo ${filename} descargado`);
    };

    return (
        <div className="glass-panel rounded-2xl border border-accent-1/20 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-semibold text-white">Exportar LaTeX</h3>
                    <p className="text-sm text-neutral-400 mt-1">
                        Código LaTeX listo para compilar con pdflatex
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopy}
                        className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-medium flex items-center gap-2 hover:bg-white/20 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copiar
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleDownload}
                        className="px-4 py-2 rounded-xl bg-accent-1 text-black text-sm font-semibold flex items-center gap-2 hover:bg-accent-1/90 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Descargar .tex
                    </motion.button>
                </div>
            </div>

            {/* LaTeX Preview */}
            <div className="relative">
                <div
                    className={`bg-[#1e1e1e] rounded-xl border border-white/10 overflow-hidden transition-all duration-300 ${isExpanded ? "max-h-none" : "max-h-96"
                        }`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500/50" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                            <div className="w-3 h-3 rounded-full bg-green-500/50" />
                            <span className="ml-2 text-xs text-neutral-400">cv.tex</span>
                        </div>
                        <span className="text-xs text-neutral-500">
                            {latexContent.length.toLocaleString()} caracteres
                        </span>
                    </div>

                    {/* Code */}
                    <pre className="p-4 text-sm font-mono text-neutral-300 overflow-x-auto whitespace-pre">
                        <code>{latexContent}</code>
                    </pre>

                    {/* Gradient overlay when collapsed */}
                    {!isExpanded && (
                        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#1e1e1e] to-transparent pointer-events-none" />
                    )}
                </div>

                {/* Expand/Collapse button */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/10 text-neutral-300 text-xs font-medium hover:bg-white/20 transition-colors flex items-center gap-1"
                >
                    {isExpanded ? (
                        <>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            Colapsar
                        </>
                    ) : (
                        <>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            Expandir todo
                        </>
                    )}
                </button>
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm">
                        <p className="text-blue-400 font-medium mb-1">Cómo compilar</p>
                        <p className="text-neutral-400">
                            Descarga el archivo .tex y compílalo con <code className="px-1.5 py-0.5 rounded bg-white/10 text-blue-300">pdflatex cv.tex</code> o usa editores online como Overleaf.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
