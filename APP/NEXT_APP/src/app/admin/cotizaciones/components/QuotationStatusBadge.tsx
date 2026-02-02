"use client";

import { FileEdit, Clock, CheckCircle, XCircle, RefreshCw, Trophy } from "lucide-react";

type QuotationStatus = "DRAFT" | "PENDING" | "REVISION" | "APPROVED" | "REJECTED" | "COMPLETED";

interface QuotationStatusBadgeProps {
    status: QuotationStatus | string;
    size?: "sm" | "md" | "lg";
    showIcon?: boolean;
}

const STATUS_CONFIG: Record<QuotationStatus, {
    label: string;
    bg: string;
    text: string;
    icon: typeof FileEdit;
}> = {
    DRAFT: {
        label: "Borrador",
        bg: "bg-slate-500/20",
        text: "text-slate-400",
        icon: FileEdit,
    },
    PENDING: {
        label: "Pendiente",
        bg: "bg-amber-500/20",
        text: "text-amber-400",
        icon: Clock,
    },
    REVISION: {
        label: "En Revisión",
        bg: "bg-blue-500/20",
        text: "text-blue-400",
        icon: RefreshCw,
    },
    APPROVED: {
        label: "Aprobada",
        bg: "bg-emerald-500/20",
        text: "text-emerald-400",
        icon: CheckCircle,
    },
    REJECTED: {
        label: "Rechazada",
        bg: "bg-red-500/20",
        text: "text-red-400",
        icon: XCircle,
    },
    COMPLETED: {
        label: "Completada",
        bg: "bg-purple-500/20",
        text: "text-purple-400",
        icon: Trophy,
    },
};

export default function QuotationStatusBadge({
    status,
    size = "md",
    showIcon = true
}: QuotationStatusBadgeProps) {
    const config = STATUS_CONFIG[status as QuotationStatus] || STATUS_CONFIG.DRAFT;
    const Icon = config.icon;

    const sizeClasses = {
        sm: "text-xs px-2 py-0.5",
        md: "text-xs px-2.5 py-1",
        lg: "text-sm px-3 py-1.5",
    };

    const iconSizes = {
        sm: 10,
        md: 12,
        lg: 14,
    };

    return (
        <span className={`
            inline-flex items-center gap-1.5 rounded-full font-medium
            ${config.bg} ${config.text} ${sizeClasses[size]}
        `}>
            {showIcon && <Icon size={iconSizes[size]} />}
            {config.label}
        </span>
    );
}

/**
 * Get available transitions for a given status
 */
export function getAvailableTransitions(currentStatus: QuotationStatus): QuotationStatus[] {
    const transitions: Record<QuotationStatus, QuotationStatus[]> = {
        DRAFT: ["PENDING"],
        PENDING: ["APPROVED", "REJECTED", "REVISION"],
        REVISION: ["PENDING"],
        APPROVED: ["COMPLETED"],
        REJECTED: [],
        COMPLETED: [],
    };
    return transitions[currentStatus] || [];
}

/**
 * Check if a status transition is valid
 */
export function isValidTransition(from: QuotationStatus, to: QuotationStatus): boolean {
    return getAvailableTransitions(from).includes(to);
}

export { STATUS_CONFIG };
export type { QuotationStatus };
