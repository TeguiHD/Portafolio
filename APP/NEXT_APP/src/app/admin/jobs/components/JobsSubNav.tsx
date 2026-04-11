"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Search,
    GitCompareArrows,
    Columns3,
} from "lucide-react";

const TABS = [
    {
        href: "/admin/jobs",
        label: "Dashboard",
        icon: LayoutDashboard,
        exact: true,
    },
    {
        href: "/admin/jobs/search",
        label: "Buscar Vacantes",
        icon: Search,
        exact: false,
    },
    {
        href: "/admin/jobs/analysis",
        label: "Analisis & Adaptacion",
        icon: GitCompareArrows,
        exact: false,
    },
    {
        href: "/admin/jobs/pipeline",
        label: "Pipeline",
        icon: Columns3,
        exact: false,
    },
];

function isActive(pathname: string, tab: (typeof TABS)[number]): boolean {
    if (tab.exact) {
        return pathname === tab.href;
    }
    return pathname.startsWith(tab.href);
}

export function JobsSubNav() {
    const pathname = usePathname();

    return (
        <nav
            aria-label="Navegacion de empleos"
            className="relative overflow-x-auto rounded-2xl border border-white/10 bg-[#0a0f1c]/60 backdrop-blur-xl p-1.5 shadow-lg"
        >
            <ul className="flex items-center gap-1 min-w-max">
                {TABS.map((tab) => {
                    const active = isActive(pathname, tab);
                    const Icon = tab.icon;
                    return (
                        <li key={tab.href}>
                            <Link
                                href={tab.href}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                                    active
                                        ? "bg-gradient-to-br from-accent-1/20 to-accent-2/10 text-white border border-accent-1/30 shadow-md"
                                        : "text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent"
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
