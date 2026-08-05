/**
 * Migas de pan visibles. El JSON-LD pareado lo emite quien renderiza este
 * componente, usando la MISMA ruta — si divergen, Google trata el schema
 * como engañoso.
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
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                {trail.map((crumb, index) => {
                    const isLast = index === trail.length - 1;
                    return (
                        <li key={crumb.path} className="flex items-center gap-2">
                            {isLast ? (
                                // La página actual no se enlaza a sí misma.
                                <span aria-current="page" className="text-neutral-300">
                                    {crumb.name}
                                </span>
                            ) : (
                                <Link
                                    href={crumb.path === "" ? "/" : crumb.path}
                                    className="transition hover:text-white"
                                >
                                    {crumb.name}
                                </Link>
                            )}
                            {!isLast && (
                                <span aria-hidden="true" className="text-neutral-700">
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
