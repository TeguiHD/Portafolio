"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Secciones de Finanzas. El riel del panel solo tiene «Finanzas»; sin esta fila, Reportes, Recurrentes,
 * Configuración y el asistente quedaban sin enlace desde el resumen. En celular se desplaza dentro de su franja.
 */
const SECCIONES = [
    { nombre: "Resumen", href: "/admin/finance" },
    { nombre: "Transacciones", href: "/admin/finance/transactions" },
    { nombre: "Cuentas", href: "/admin/finance/accounts" },
    { nombre: "Categorías", href: "/admin/finance/categories" },
    { nombre: "Presupuestos", href: "/admin/finance/budgets" },
    { nombre: "Metas", href: "/admin/finance/goals" },
    { nombre: "Recurrentes", href: "/admin/finance/recurring" },
    { nombre: "Recordatorios", href: "/admin/finance/reminders" },
    { nombre: "Reportes", href: "/admin/finance/reports" },
    { nombre: "Asistente", href: "/admin/finance/ai" },
    { nombre: "Configuración", href: "/admin/finance/settings" },
];

function actual(href: string, ruta: string) {
    return href === "/admin/finance" ? ruta === href : ruta === href || ruta.startsWith(`${href}/`);
}

export function NavFinanzas() {
    const ruta = usePathname() ?? "";
    return (
        <nav aria-label="Secciones de Finanzas" className="-mt-2 mb-8 max-w-[1180px] border-b border-[var(--linea)]">
            <ul className="m-0 flex list-none gap-1 overflow-x-auto overscroll-x-contain p-0 [scrollbar-width:thin]">
                {SECCIONES.map((s) => {
                    const esta = actual(s.href, ruta);
                    return (
                        <li key={s.href} className="shrink-0">
                            <Link
                                href={s.href}
                                aria-current={esta ? "page" : undefined}
                                className={`relative inline-flex min-h-11 items-center px-3 text-sm whitespace-nowrap transition-colors duration-150 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--acento)] ${esta ? "font-semibold text-[var(--txt)] after:bg-[var(--acento)]" : "text-[var(--mut)] hover:text-[var(--txt)]"}`}
                            >
                                {s.nombre}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
