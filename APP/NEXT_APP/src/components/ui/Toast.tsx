"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
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

interface ToastContextType {
    toasts: Toast[]
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

// Toast icons and colors
const toastConfig: Record<ToastType, { icon: typeof CheckCircle; bgColor: string; borderColor: string; iconColor: string }> = {
    success: {
        icon: CheckCircle,
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        iconColor: 'text-emerald-400',
    },
    error: {
        icon: AlertCircle,
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        iconColor: 'text-red-400',
    },
    warning: {
        icon: AlertTriangle,
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        iconColor: 'text-amber-400',
    },
    info: {
        icon: Info,
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        iconColor: 'text-blue-400',
    },
}

// Individual Toast component — pure CSS animations, no framer-motion
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
            className={`
                relative flex items-start gap-3 p-4 pr-10 rounded-xl 
                backdrop-blur-xl border shadow-2xl
                ${config.bgColor} ${config.borderColor}
                transition-all duration-300 ease-out
                ${exiting
                    ? 'opacity-0 translate-x-24 scale-95'
                    : 'animate-[toast-in_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards]'
                }
            `}
        >
            {/* Icon */}
            <Icon className={`w-5 h-5 mt-0.5 ${config.iconColor} flex-shrink-0`} />

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm">{toast.title}</p>
                {toast.message && (
                    <p className="text-neutral-300 text-sm mt-1">{toast.message}</p>
                )}
            </div>

            {/* Close button */}
            <button
                onClick={onRemove}
                className="absolute right-2 top-2 p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
            >
                <X className="w-4 h-4" />
            </button>

            {/* Progress bar — CSS transition instead of motion.div */}
            <div
                ref={progressRef}
                style={{
                    transform: 'scaleX(1)',
                    transitionProperty: 'transform',
                    transitionDuration: `${(toast.duration || 5000)}ms`,
                    transitionTimingFunction: 'linear',
                }}
                className={`absolute bottom-0 left-0 right-0 h-1 origin-left rounded-b-xl ${config.iconColor.replace('text-', 'bg-')}`}
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

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
            {children}

            {/* Toast container - highest z-index */}
            <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastItem toast={toast} onRemove={() => removeToast(toast.id)} exiting={toast.exiting} />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}
