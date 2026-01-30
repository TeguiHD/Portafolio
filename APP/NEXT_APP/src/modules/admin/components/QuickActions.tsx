"use client";

import Link from "next/link";
import { motion } from "framer-motion";

// Define actions with their required permissions
const actions = [
    {
        title: "Nueva Cotización",
        description: "Crear una propuesta para un cliente",
        href: "/admin/cotizaciones",
        requiredPermission: "quotations.create",
        icon: (
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
        ),
        color: "accent-1",
        bgColor: "bg-accent-1/10",
        borderColor: "border-accent-1/20",
        textColor: "text-accent-1",
    },
    {
        title: "Editar CV",
        description: "Actualizar tu curriculum vitae",
        href: "/admin/cv-editor",
        requiredPermission: "cv.own.view",
        icon: (
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
        ),
        color: "accent-2",
        bgColor: "bg-teal-500/10",
        borderColor: "border-teal-500/20",
        textColor: "text-teal-400",
    },
    {
        title: "Ver Analytics",
        description: "Revisar métricas del portafolio",
        href: "/admin/analytics",
        requiredPermission: "analytics.view",
        icon: (
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
        color: "blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
        textColor: "text-blue-400",
    },
];

interface QuickActionsProps {
    permissions: string[];
}

export function QuickActions({ permissions }: QuickActionsProps) {
    // Convert to Set for efficient lookups
    const permissionSet = new Set(permissions);

    // Filter actions based on user permissions
    const filteredActions = actions.filter(action =>
        permissionSet.has(action.requiredPermission)
    );

    // Don't render if no actions available
    if (filteredActions.length === 0) {
        return null;
    }

    return (
        <div>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
                Acciones rápidas
            </h2>
            <div className={`grid grid-cols-1 ${filteredActions.length === 1 ? 'sm:grid-cols-1 max-w-sm' : filteredActions.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3 sm:gap-4`}>
                {filteredActions.map((action, idx) => (
                    <motion.div
                        key={action.title}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + idx * 0.1 }}
                    >
                        <Link
                            href={action.href as any}
                            className="group block glass-panel rounded-xl sm:rounded-2xl border border-accent-1/20 p-4 sm:p-6 hover:border-accent-1/40 transition-all active:scale-[0.98]"
                        >
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl ${action.bgColor} border ${action.borderColor} flex items-center justify-center ${action.textColor} mb-3 sm:mb-4 group-hover:scale-110 transition-transform`}>
                                {action.icon}
                            </div>
                            <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-accent-1 transition-colors">
                                {action.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-neutral-400 mt-1 line-clamp-2">
                                {action.description}
                            </p>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

