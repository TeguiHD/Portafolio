/**
 * Migas de pan visibles. El JSON-LD pareado lo emite quien renderiza este
 * componente, usando la MISMA ruta — si divergen, Google trata el schema
 * como engañoso.
 * Los colores salen del tema (--mut, --txt): con los grises fijos de Tailwind el enlace quedaba en 4,2:1 sobre el fondo
 * oscuro y la página actual casi no se veía en el tema claro (auditoría del 25-11-2026).
 */
import Link from "next/link";
import type { BreadcrumbTrail } from "@/lib/seo/schemas";

interface BreadcrumbsProps {
    trail: BreadcrumbTrail;
}

export function Breadcrumbs({ trail }: BreadcrumbsProps) {
    return (
        <nav
            aria-label="Ruta de navegación"
            className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6"
        >
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--mut)]">
                {trail.map((crumb, index) => {
                    const isLast = index === trail.length - 1;
                    return (
                        <li key={crumb.path} className="flex items-center gap-2">
                            {isLast ? (
                                // La página actual no se enlaza a sí misma.
                                <span aria-current="page" className="text-[var(--txt)]">
                                    {crumb.name}
                                </span>
                            ) : (
                                <Link
                                    href={crumb.path === "" ? "/" : crumb.path}
                                    className="transition hover:text-[var(--txt)]"
                                >
                                    {crumb.name}
                                </Link>
                            )}
                            {!isLast && (
                                <span aria-hidden="true" className="text-[var(--linea-2)]">
                                    /
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
