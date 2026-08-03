import type { Metadata } from "next";
import { getToolSeo } from "./tools-content";

export const SITE_URL = "https://nicoholas.dev";
export const SITE_NAME = "Nicoholas Lopetegui";

export function buildToolMetadata(slug: string): Metadata {
    const entry = getToolSeo(slug);
    const path = `/herramientas/${entry.slug}`;

    return {
        // absolute evita que el template "%s | Nicoholas Lopetegui" del root
        // empuje el title fuera del rango de 50-60 caracteres.
        title: { absolute: entry.title },
        description: entry.description,
        keywords: [entry.primaryKeyword, ...entry.secondaryKeywords],
        alternates: { canonical: path },
        openGraph: {
            type: "website",
            locale: "es_CL",
            url: `${SITE_URL}${path}`,
            siteName: SITE_NAME,
            title: entry.title,
            description: entry.description,
        },
        twitter: {
            card: "summary_large_image",
            title: entry.title,
            description: entry.description,
        },
        robots: { index: true, follow: true },
    };
}
