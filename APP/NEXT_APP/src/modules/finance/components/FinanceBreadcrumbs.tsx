"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
    label: string;
    href: string;
    icon?: string;
}

// Map of routes to labels
const routeLabels: Record<string, { label: string; icon: string }> = {
    "/admin/finance": { label: "Finanzas", icon: "💰" },
    "/admin/finance/transactions": { label: "Transacciones", icon: "📝" },
    "/admin/finance/transactions/new": { label: "Nueva", icon: "➕" },
    "/admin/finance/transactions/batch": { label: "Lote", icon: "📦" },
    "/admin/finance/budgets": { label: "Presupuestos", icon: "📋" },
    "/admin/finance/budgets/new": { label: "Nuevo", icon: "➕" },
    "/admin/finance/goals": { label: "Metas", icon: "🎯" },
    "/admin/finance/goals/new": { label: "Nueva", icon: "➕" },
    "/admin/finance/accounts": { label: "Cuentas", icon: "🏦" },
    "/admin/finance/accounts/new": { label: "Nueva", icon: "➕" },
    "/admin/finance/categories": { label: "Categorías", icon: "📊" },
    "/admin/finance/categories/new": { label: "Nueva", icon: "➕" },
    "/admin/finance/recurring": { label: "Recurrentes", icon: "🔄" },
    "/admin/finance/recurring/new": { label: "Nuevo", icon: "➕" },
    "/admin/finance/reminders": { label: "Recordatorios", icon: "🔔" },
    "/admin/finance/reports": { label: "Reportes", icon: "📈" },
    "/admin/finance/settings": { label: "Configuración", icon: "⚙️" },
    "/admin/finance/ai": { label: "Asistente IA", icon: "🤖" },
};

interface FinanceBreadcrumbsProps {
    /** Additional items to append to the breadcrumb trail */
    extraItems?: BreadcrumbItem[];
    /** Whether to show the back button */
    showBackButton?: boolean;
    /** Custom back URL (defaults to parent path) */
    backUrl?: string;
}

export function FinanceBreadcrumbs({ 
    extraItems = [], 
    showBackButton = true,
    backUrl 
}: FinanceBreadcrumbsProps) {
    const pathname = usePathname();
    
    // Generate breadcrumbs from current path
    const generateBreadcrumbs = (): BreadcrumbItem[] => {
        const paths = pathname.split("/").filter(Boolean);
        const breadcrumbs: BreadcrumbItem[] = [];
        
        let currentPath = "";
        for (const path of paths) {
            currentPath += `/${path}`;
            
            // Skip dynamic segments like [id]
            if (path.startsWith("[") || /^[a-f0-9-]{36}$/i.test(path)) {
                continue;
            }
            
            const routeInfo = routeLabels[currentPath];
            if (routeInfo) {
                breadcrumbs.push({
                    label: routeInfo.label,
                    href: currentPath,
                    icon: routeInfo.icon,
                });
            }
        }
        
        return breadcrumbs;
    };
    
    const breadcrumbs = [...generateBreadcrumbs(), ...extraItems];
    
    // Determine back URL
    const parentPath = breadcrumbs.length > 1 
        ? breadcrumbs[breadcrumbs.length - 2].href 
        : "/admin/finance";
    const actualBackUrl = backUrl || parentPath;
    
    if (breadcrumbs.length <= 1) {
        return null; // Don't show breadcrumbs on main finance page
    }

    // Note: Since this component is conditionally rendered and depends on pathname,
    // we use a simple approach - the animation only triggers after initial render
    return (
        <motion.nav
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-6"
        >
            {/* Back Button */}
            {showBackButton && (
                <a
                    href={actualBackUrl}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-neutral-400 hover:text-white bg-neutral-800/50 hover:bg-neutral-800 rounded-lg transition-all mr-2"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Volver</span>
                </a>
            )}
            
            {/* Breadcrumb Trail */}
            <div className="flex items-center gap-1 text-sm overflow-x-auto">
                {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    
                    return (
                        <div key={crumb.href} className="flex items-center">
                            {index > 0 && (
                                <ChevronRight className="w-4 h-4 text-neutral-600 mx-1 flex-shrink-0" />
                            )}
                            
                            {isLast ? (
                                <span className="flex items-center gap-1.5 text-white font-medium px-2 py-1">
                                    {crumb.icon && <span className="text-base">{crumb.icon}</span>}
                                    <span className="truncate max-w-[150px]">{crumb.label}</span>
                                </span>
                            ) : (
                                <a
                                    href={crumb.href}
                                    className="flex items-center gap-1.5 text-neutral-400 hover:text-white px-2 py-1 rounded-md hover:bg-neutral-800/50 transition-colors"
                                >
                                    {crumb.icon && <span className="text-base">{crumb.icon}</span>}
                                    <span className="truncate max-w-[100px]">{crumb.label}</span>
                                </a>
                            )}
                        </div>
                    );
                })}
            </div>
        </motion.nav>
    );
}

/**
 * Simplified back button component for pages that just need a back link
 */
export function FinanceBackButton({ 
    href, 
    label = "Volver" 
}: { 
    href: string; 
    label?: string;
}) {
    return (
        <a
            href={href}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors mb-4"
        >
            <ChevronLeft className="w-4 h-4" />
            {label}
        </a>
    );
}
