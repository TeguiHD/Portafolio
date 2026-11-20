"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, GitCompareArrows, ListChecks } from "lucide-react";

const TABS = [
    { href: "/admin/jobs", label: "Resumen", icon: LayoutDashboard, exact: true },
    { href: "/admin/jobs/search", label: "Buscar vacantes", icon: Search, exact: false },
    { href: "/admin/jobs/analysis", label: "Análisis y adaptación", icon: GitCompareArrows, exact: false },
    { href: "/admin/jobs/pipeline", label: "Seguimiento", icon: ListChecks, exact: false },
];

function isActive(pathname: string, tab: (typeof TABS)[number]): boolean {
    return tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
}

export function JobsSubNav() {
    const pathname = usePathname();

    return (
        // Las pestañas se desplazan dentro de su franja en celular; la página nunca se mueve de lado.
        <nav aria-label="Secciones de postulaciones" className="overflow-x-auto border-b border-[var(--linea)] [scrollbar-width:thin]">
            <ul className="flex min-w-max items-stretch gap-1">
                {TABS.map((tab) => {
                    const active = isActive(pathname, tab);
                    const Icon = tab.icon;
                    return (
                        <li key={tab.href} className="flex">
                            <Link
                                href={tab.href}
                                aria-current={active ? "page" : undefined}
                                className="-mb-px inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 text-sm font-medium text-[var(--mut)] transition-colors duration-150 hover:text-[var(--txt)] aria-[current=page]:border-[var(--acento)] aria-[current=page]:text-[var(--txt)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--acento)]"
                            >
                                <Icon className="size-4" aria-hidden="true" />
                                {tab.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
