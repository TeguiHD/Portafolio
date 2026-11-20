"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { FOCO } from "./estilos";

interface BreadcrumbItem {
    label: string;
    href: string;
}

// Nombres de las rutas de Finanzas
const routeLabels: Record<string, string> = {
    "/admin/finance": "Finanzas",
    "/admin/finance/transactions": "Transacciones",
    "/admin/finance/transactions/new": "Nueva",
    "/admin/finance/transactions/batch": "Lote",
    "/admin/finance/budgets": "Presupuestos",
    "/admin/finance/budgets/new": "Nuevo",
    "/admin/finance/goals": "Metas",
    "/admin/finance/goals/new": "Nueva",
    "/admin/finance/accounts": "Cuentas",
    "/admin/finance/accounts/new": "Nueva",
    "/admin/finance/categories": "Categorías",
    "/admin/finance/categories/new": "Nueva",
    "/admin/finance/recurring": "Recurrentes",
    "/admin/finance/recurring/new": "Nuevo",
    "/admin/finance/reminders": "Recordatorios",
    "/admin/finance/reports": "Reportes",
    "/admin/finance/settings": "Configuración",
    "/admin/finance/ai": "Asistente",
};

interface FinanceBreadcrumbsProps {
    /** Additional items to append to the breadcrumb trail */
    extraItems?: BreadcrumbItem[];
    /** Whether to show the back button */
    showBackButton?: boolean;
    /** Custom back URL (defaults to parent path) */
    backUrl?: string;
}

/**
 * Enlace «volver» de las pantallas internas de Finanzas (nueva, editar, lote). En las pantallas de primer nivel no
 * pinta nada: ahí ya están las migas del armazón y la fila de secciones (NavFinanzas).
 */
export function FinanceBreadcrumbs({
    extraItems = [],
    showBackButton = true,
    backUrl
}: FinanceBreadcrumbsProps) {
    const pathname = usePathname() ?? "";

    const breadcrumbs: BreadcrumbItem[] = [];
    let currentPath = "";
    for (const path of pathname.split("/").filter(Boolean)) {
        currentPath += `/${path}`;
        // Los segmentos con id no tienen nombre propio
        if (path.startsWith("[") || /^[a-f0-9-]{36}$/i.test(path)) continue;
        const label = routeLabels[currentPath];
        if (label) breadcrumbs.push({ label, href: currentPath });
    }
    breadcrumbs.push(...extraItems);

    // Finanzas › Sección: primer nivel, sin enlace propio
    if (!showBackButton || breadcrumbs.length <= 2) {
        return null;
    }

    const parent = breadcrumbs[breadcrumbs.length - 2];
    const href = backUrl || parent.href;
    const label = backUrl ? "Volver" : `Volver a ${parent.label}`;

    return (
        <nav aria-label="Volver" className="mb-4">
            <Link
                href={href}
                className={`-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-[var(--mut)] transition-colors duration-150 hover:text-[var(--txt)] sm:min-h-10 ${FOCO}`}
            >
                <ChevronLeft aria-hidden="true" className="size-4" />
                {label}
            </Link>
        </nav>
    );
}
