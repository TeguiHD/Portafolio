"use client";

import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface UseUnsavedChangesOptions {
    isDirty: boolean;
    onSaveDraft?: () => Promise<void>;
}

interface UnsavedChangesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDiscard: () => void;
    onSaveDraft: () => void;
    isSaving?: boolean;
}

export function UnsavedChangesModal({
    isOpen,
    onClose,
    onDiscard,
    onSaveDraft,
    isSaving = false,
}: UnsavedChangesModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
                    />

                    {/* Modal Container - Flexbox centering */}
                    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm p-6 
                                       bg-gradient-to-b from-neutral-800 to-neutral-900 
                                       rounded-2xl border border-orange-500/20 
                                       shadow-2xl shadow-orange-500/10
                                       max-h-[90vh] overflow-y-auto"
                        >
                            {/* Icon */}
                            <div className="flex justify-center mb-4">
                                <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Content */}
                            <h2 className="text-xl font-bold text-white text-center mb-2">
                                ¿Salir sin guardar?
                            </h2>
                            <p className="text-neutral-400 text-center text-sm mb-6">
                                Tienes cambios sin guardar en tu cotización.
                                Si sales ahora, perderás todo el progreso.
                            </p>

                            {/* Actions */}
                            <div className="flex flex-col gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onSaveDraft}
                                    disabled={isSaving}
                                    className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-accent-1 to-emerald-400 text-black font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                            </svg>
                                            Guardar como borrador
                                        </>
                                    )}
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onDiscard}
                                    disabled={isSaving}
                                    className="w-full px-4 py-3 rounded-xl bg-red-500/20 text-red-400 font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50"
                                >
                                    Descartar cambios
                                </motion.button>

                                <button
                                    onClick={onClose}
                                    disabled={isSaving}
                                    className="w-full px-4 py-2 text-neutral-400 hover:text-white text-sm transition-colors disabled:opacity-50"
                                >
                                    Seguir editando
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}

// Hook to handle unsaved changes
export function useUnsavedChanges({ isDirty, onSaveDraft }: UseUnsavedChangesOptions) {
    const [showModal, setShowModal] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Handle browser back/refresh
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = "";
                return "";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    // Intercept link clicks
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (!isDirty) return;

            const target = e.target as HTMLElement;
            const link = target.closest("a");

            if (link && link.href && !link.href.startsWith("javascript:")) {
                const url = new URL(link.href);
                const currentUrl = new URL(window.location.href);

                // Only intercept internal navigation
                if (url.origin === currentUrl.origin && url.pathname !== currentUrl.pathname) {
                    e.preventDefault();
                    e.stopPropagation();
                    setPendingNavigation(url.pathname);
                    setShowModal(true);
                }
            }
        };

        document.addEventListener("click", handleClick, true);
        return () => document.removeEventListener("click", handleClick, true);
    }, [isDirty]);

    const handleClose = useCallback(() => {
        setShowModal(false);
        setPendingNavigation(null);
    }, []);

    const handleDiscard = useCallback(() => {
        setShowModal(false);
        if (pendingNavigation) {
            window.location.href = pendingNavigation;
        }
    }, [pendingNavigation]);

    const handleSaveDraft = useCallback(async () => {
        if (onSaveDraft) {
            setIsSaving(true);
            try {
                await onSaveDraft();
                setShowModal(false);
                if (pendingNavigation) {
                    window.location.href = pendingNavigation;
                }
            } catch (error) {
                console.error("Error saving draft:", error);
            } finally {
                setIsSaving(false);
            }
        }
    }, [onSaveDraft, pendingNavigation]);

    return {
        showModal,
        setShowModal,
        handleClose,
        handleDiscard,
        handleSaveDraft,
        isSaving,
    };
}
