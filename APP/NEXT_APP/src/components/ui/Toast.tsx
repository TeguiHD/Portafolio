"use client"

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

// Toast types
type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
    id: string
    type: ToastType
    title: string
    message?: string
    duration?: number
}

// Internal state for animation tracking
interface ToastInternal extends Toast {
    exiting?: boolean
}

/** Solo funciones, estables: el valor no cambia nunca. Con la lista adentro, cada aviso daba un valor nuevo y las
 * páginas que tienen `toast` en las dependencias de un efecto volvían a pedir datos; si el pedido fallaba, otro aviso, y
 * así en bucle (Mensajes hacía ~100 pedidos por segundo con la API caída; 24-11-2026). */
interface ToastContextType {
    addToast: (toast: Omit<Toast, 'id'>) => void
    removeToast: (id: string) => void
    success: (title: string, message?: string) => void
    error: (title: string, message?: string) => void
    warning: (title: string, message?: string) => void
    info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

// Hook to use toast
export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

// Íconos y color de cada tipo. El aviso vive en el layout raíz, fuera de .panel: tema-panel.css no lo alcanza, así
// que los colores salen de los tokens del sitio (cambian solos con el tema) o llevan su variante para tema claro.
// Las clases van completas: Tailwind solo genera las que lee tal cual en el código.
const toastConfig: Record<ToastType, { icon: typeof CheckCircle; iconColor: string; barColor: string }> = {
    success: {
        icon: CheckCircle,
        iconColor: 'text-[var(--sube)]',
        barColor: 'bg-[var(--sube)]',
    },
    error: {
        icon: AlertCircle,
        iconColor: 'text-[var(--error)]',
        barColor: 'bg-[var(--error)]',
    },
    warning: {
        icon: AlertTriangle,
        iconColor: 'text-amber-400 [:root[data-tema=claro]_&]:text-amber-700',
        barColor: 'bg-amber-400 [:root[data-tema=claro]_&]:bg-amber-600',
    },
    info: {
        icon: Info,
        iconColor: 'text-[var(--cerca)]',
        barColor: 'bg-[var(--cerca)]',
    },
}

// Individual Toast component — pure CSS, no framer-motion
function ToastItem({ toast, onRemove, exiting }: { toast: Toast; onRemove: () => void; exiting?: boolean }) {
    const config = toastConfig[toast.type]
    const Icon = config.icon
    const progressRef = useRef<HTMLDivElement>(null)

    // Trigger the progress bar shrink after mount
    useEffect(() => {
        const el = progressRef.current
        if (!el) return
        // Force reflow so the transition kicks in
        el.getBoundingClientRect()
        el.style.transform = 'scaleX(0)'
    }, [])

    return (
        <div
            className={`relative flex items-start gap-3 overflow-hidden rounded-xl border border-[var(--linea-2)] bg-[var(--sup)] p-4 pr-12 text-[var(--txt)] shadow-[0_24px_50px_-24px_rgb(0_0_0/0.45)] transition-opacity duration-200 starting:opacity-0 motion-reduce:transition-none ${exiting ? 'opacity-0' : 'opacity-100'}`}
        >
            {/* Icon */}
            <Icon size={18} aria-hidden="true" className={`mt-0.5 shrink-0 ${config.iconColor}`} />

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--txt)]">{toast.title}</p>
                {toast.message && (
                    <p className="mt-1 text-sm text-[var(--mut)]">{toast.message}</p>
                )}
            </div>

            {/* Close button */}
            <button
                type="button"
                onClick={onRemove}
                aria-label="Cerrar aviso"
                className="absolute right-1 top-1 inline-grid size-11 place-items-center rounded-lg text-[var(--mut)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] hover:text-[var(--txt)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--acento)] sm:size-9"
            >
                <X size={16} aria-hidden="true" />
            </button>

            {/* Tiempo que le queda: barra que se vacía (sin barra si se pide menos movimiento) */}
            <div
                ref={progressRef}
                aria-hidden="true"
                style={{
                    transform: 'scaleX(1)',
                    transitionProperty: 'transform',
                    transitionDuration: `${(toast.duration || 5000)}ms`,
                    transitionTimingFunction: 'linear',
                }}
                className={`absolute bottom-0 left-0 right-0 h-0.5 origin-left motion-reduce:hidden ${config.barColor}`}
            />
        </div>
    )
}

// Toast Provider
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastInternal[]>([])

    const removeToast = useCallback((id: string) => {
        // Mark as exiting first for animation
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
        // Remove from DOM after exit animation completes
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 300)
    }, [])

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9)
        const duration = toast.duration || 5000

        setToasts(prev => [...prev, { ...toast, id }])

        // Auto-remove after duration
        setTimeout(() => {
            removeToast(id)
        }, duration)
    }, [removeToast])

    const success = useCallback((title: string, message?: string) => {
        addToast({ type: 'success', title, message })
    }, [addToast])

    const error = useCallback((title: string, message?: string) => {
        addToast({ type: 'error', title, message })
    }, [addToast])

    const warning = useCallback((title: string, message?: string) => {
        addToast({ type: 'warning', title, message })
    }, [addToast])

    const info = useCallback((title: string, message?: string) => {
        addToast({ type: 'info', title, message })
    }, [addToast])

    const valor = useMemo(() => ({ addToast, removeToast, success, error, warning, info }), [addToast, removeToast, success, error, warning, info])

    return (
        <ToastContext.Provider value={valor}>
            {children}

            {/* Toast container - highest z-index. Está desde la carga para que los lectores de pantalla anuncien lo que entra. */}
            <div role="region" aria-label="Avisos" aria-live="polite" className="fixed top-4 right-4 z-[99999] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastItem toast={toast} onRemove={() => removeToast(toast.id)} exiting={toast.exiting} />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}
