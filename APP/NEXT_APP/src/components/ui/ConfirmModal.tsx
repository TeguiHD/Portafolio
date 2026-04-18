"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmModalProps {
    open: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "destructive" | "default";
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmModal({
    open,
    title,
    message,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    variant = "destructive",
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    const cancelRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        // Focus cancel by default (safer UX)
        cancelRef.current?.focus();

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
        };
        document.addEventListener("keydown", handleEsc);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", handleEsc);
            document.body.style.overflow = "unset";
        };
    }, [open, onCancel]);

    if (!open) return null;

    const isDestructive = variant === "destructive";

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-150"
            >
                <div className="p-6">
                    {/* Icon + Title */}
                    <div className="flex items-start gap-4 mb-4">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                            isDestructive ? "bg-red-500/15" : "bg-amber-500/15"
                        }`}>
                            {isDestructive
                                ? <Trash2 size={18} className="text-red-400" />
                                : <AlertTriangle size={18} className="text-amber-400" />
                            }
                        </div>
                        <div className="flex-1 min-w-0">
                            {title && (
                                <h3 id="confirm-title" className="text-base font-bold text-white mb-1">
                                    {title}
                                </h3>
                            )}
                            <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
                        </div>
                        <button
                            onClick={onCancel}
                            className="flex-shrink-0 text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
                            aria-label="Cerrar"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 justify-end">
                        <button
                            ref={cancelRef}
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                                isDestructive
                                    ? "bg-red-600 hover:bg-red-500 text-white"
                                    : "bg-amber-600 hover:bg-amber-500 text-white"
                            }`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

/**
 * Hook para manejar confirmaciones inline.
 * Uso:
 *   const { confirm, ConfirmDialog } = useConfirm();
 *   ...
 *   const ok = await confirm({ message: "¿Eliminar?" });
 *   if (!ok) return;
 */
import { useState, useCallback } from "react";

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "destructive" | "default";
}

export function useConfirm() {
    const [state, setState] = useState<{
        open: boolean;
        options: ConfirmOptions;
        resolve: (value: boolean) => void;
    } | null>(null);

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setState({ open: true, options, resolve });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        state?.resolve(true);
        setState(null);
    }, [state]);

    const handleCancel = useCallback(() => {
        state?.resolve(false);
        setState(null);
    }, [state]);

    const ConfirmDialog = state ? (
        <ConfirmModal
            open={state.open}
            title={state.options.title}
            message={state.options.message}
            confirmLabel={state.options.confirmLabel}
            cancelLabel={state.options.cancelLabel}
            variant={state.options.variant}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
        />
    ) : null;

    return { confirm, ConfirmDialog };
}
