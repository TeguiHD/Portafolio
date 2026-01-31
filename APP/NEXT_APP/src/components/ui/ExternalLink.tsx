"use client";

import { useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink as ExternalLinkIcon, X, AlertTriangle } from "lucide-react";

interface ExternalLinkProps {
    href: string;
    children: ReactNode;
    className?: string;
}

export function ExternalLink({ href, children, className }: ExternalLinkProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsOpen(true);
    }, []);

    const handleConfirm = useCallback(() => {
        window.open(href, "_blank", "noopener,noreferrer");
        setIsOpen(false);
    }, [href]);

    const handleClose = useCallback(() => {
        setIsOpen(false);
    }, []);

    // Format URL for display - show full URL, handle special protocols
    const formatUrlForDisplay = (url: string): { displayUrl: string; type: string } => {
        // Handle mailto: links
        if (url.startsWith('mailto:')) {
            const email = url.replace('mailto:', '').split('?')[0];
            return { displayUrl: email, type: 'Email' };
        }

        // Handle tel: links
        if (url.startsWith('tel:')) {
            return { displayUrl: url.replace('tel:', ''), type: 'Teléfono' };
        }

        // Handle regular URLs
        try {
            const urlObj = new URL(url);
            // Show full URL but truncate if too long
            const fullUrl = urlObj.href;
            return {
                displayUrl: fullUrl.length > 60 ? fullUrl.substring(0, 57) + '...' : fullUrl,
                type: 'Sitio web'
            };
        } catch {
            return { displayUrl: url, type: 'Link' };
        }
    };

    const { displayUrl, type } = formatUrlForDisplay(href);

    return (
        <>
            <a
                href={href}
                onClick={handleClick}
                className={className}
                role="button"
            >
                {children}
            </a>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                            onClick={handleClose}
                        />

                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2 }}
                            className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2"
                        >
                            <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl overflow-hidden">
                                {/* Header */}
                                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold text-white">
                                                Link Externo
                                            </h3>
                                            <p className="text-xs text-neutral-500">
                                                Serás redirigido a: {type}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleClose}
                                        className="p-2 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="px-5 py-4">
                                    <p className="text-sm text-neutral-300 mb-4">
                                        Estás a punto de salir de este sitio web y visitar:
                                    </p>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                                        <ExternalLinkIcon className="w-4 h-4 text-neutral-500 shrink-0" />
                                        <span className="text-sm text-white font-mono break-all">
                                            {displayUrl}
                                        </span>
                                    </div>
                                    <p className="text-xs text-neutral-500 mt-3">
                                        Asegúrate de confiar en este destino antes de continuar.
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 px-5 py-4 border-t border-white/5 bg-white/[0.02]">
                                    <button
                                        onClick={handleClose}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        Continuar
                                        <ExternalLinkIcon size={14} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
