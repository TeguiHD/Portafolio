/**
 * LaTeX PDF Preview Component
 * Renders LaTeX code as HTML using latex.js (client-side, no API)
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LatexPdfPreviewProps {
    latexCode: string;
    className?: string;
}

export function LatexPdfPreview({ latexCode, className = "" }: LatexPdfPreviewProps) {
    const [htmlContent, setHtmlContent] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);

    const renderLatex = useCallback(async (code: string) => {
        if (!code.trim()) {
            setHtmlContent("");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Dynamically import latex.js (only on client)
            const { parse, HtmlGenerator } = await import("latex.js");

            // Parse LaTeX and generate HTML
            const generator = new HtmlGenerator({ hyphenate: false });
            const doc = parse(code, { generator });

            // Get the HTML output
            const html = doc.htmlDocument().documentElement.outerHTML;
            setHtmlContent(html);
        } catch (err) {
            console.error("LaTeX parsing error:", err);
            setError(
                err instanceof Error
                    ? `Error de LaTeX: ${err.message}`
                    : "Error al procesar el código LaTeX"
            );
            setHtmlContent("");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Debounced render
    useEffect(() => {
        const timer = setTimeout(() => {
            renderLatex(latexCode);
        }, 500);

        return () => clearTimeout(timer);
    }, [latexCode, renderLatex]);

    const handleZoomIn = () => setScale((s) => Math.min(s + 0.1, 2));
    const handleZoomOut = () => setScale((s) => Math.max(s - 0.1, 0.5));
    const handleResetZoom = () => setScale(1);

    return (
        <div className={`flex flex-col ${className}`}>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-white/5 border border-accent-1/10">
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <svg className="w-4 h-4 text-accent-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Vista previa en tiempo real</span>
                    {isLoading && (
                        <div className="w-4 h-4 border-2 border-neutral-500 border-t-accent-1 rounded-full animate-spin ml-2" />
                    )}
                </div>

                {/* Zoom controls */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleZoomOut}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                        title="Alejar"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                        </svg>
                    </button>
                    <button
                        onClick={handleResetZoom}
                        className="px-2 py-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors text-xs"
                        title="Restablecer zoom"
                    >
                        {Math.round(scale * 100)}%
                    </button>
                    <button
                        onClick={handleZoomIn}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                        title="Acercar"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Preview container */}
            <div
                ref={containerRef}
                className="flex-1 overflow-auto rounded-xl bg-gray-100 border border-neutral-200 shadow-inner"
                style={{ minHeight: "500px" }}
            >
                <AnimatePresence mode="wait">
                    {error ? (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center h-full p-8 text-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <p className="text-red-600 font-medium mb-2">Error al renderizar</p>
                            <p className="text-neutral-500 text-sm max-w-md">{error}</p>
                            <p className="text-neutral-400 text-xs mt-4">
                                Nota: latex.js soporta un subconjunto de LaTeX. Algunos comandos avanzados pueden no renderizarse.
                            </p>
                        </motion.div>
                    ) : !htmlContent && !isLoading ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center h-full p-8 text-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-neutral-500">Ingresa contenido para ver la vista previa</p>
                        </motion.div>
                    ) : isLoading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center h-full p-8"
                        >
                            <div className="w-12 h-12 border-4 border-neutral-300 border-t-accent-1 rounded-full animate-spin mb-4" />
                            <p className="text-neutral-500">Renderizando LaTeX...</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="origin-top-left p-4"
                            style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
                        >
                            <div
                                className="bg-white shadow-lg mx-auto"
                                style={{
                                    width: "210mm",
                                    minHeight: "297mm",
                                    padding: "20mm",
                                }}
                                dangerouslySetInnerHTML={{ __html: htmlContent }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Info footer */}
            <div className="mt-3 text-xs text-neutral-500 text-center">
                Vista previa renderizada con latex.js • Algunos comandos LaTeX avanzados pueden no mostrarse
            </div>
        </div>
    );
}
