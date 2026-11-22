import type { MetadataRoute } from "next";
import { TOOLS_SEO } from "@/lib/seo/tools-content";
import { SITE_URL } from "@/lib/seo/metadata";
import { SERVICIOS } from "@/lib/servicios";

export default function sitemap(): MetadataRoute.Sitemap {
    // Use editorial dates only when a significant content update is known.
    const publicRefresh = new Date("2026-09-06");

    const core: MetadataRoute.Sitemap = [
        { url: SITE_URL, lastModified: publicRefresh, changeFrequency: "monthly", priority: 1.0 },
        {
            url: `${SITE_URL}/herramientas`,
            changeFrequency: "weekly",
            priority: 0.9,
        },
        { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.6 },
        { url: `${SITE_URL}/ar`, lastModified: publicRefresh, changeFrequency: "monthly", priority: 0.6 },
        {
            url: `${SITE_URL}/sobre-mi`,
            changeFrequency: "monthly",
            priority: 0.7,
        },
    ];

    const tools: MetadataRoute.Sitemap = Object.values(TOOLS_SEO).map((entry) => ({
        url: `${SITE_URL}/herramientas/${entry.slug}`,
        lastModified: new Date(entry.lastModified),
        changeFrequency: "monthly" as const,
        priority: 0.8,
    }));

    // Páginas de servicio (22-11-2026): responden la pregunta de quien busca contratar.
    const servicios: MetadataRoute.Sitemap = [
        { url: `${SITE_URL}/servicios`, lastModified: new Date("2026-11-22"), changeFrequency: "monthly", priority: 0.8 },
        ...SERVICIOS.map((s) => ({ url: `${SITE_URL}/servicios/${s.slug}`, lastModified: new Date("2026-11-22"), changeFrequency: "monthly" as const, priority: 0.9 })),
    ];

    const legal: MetadataRoute.Sitemap = [
        { url: `${SITE_URL}/privacidad`, changeFrequency: "yearly", priority: 0.3 },
        { url: `${SITE_URL}/terminos`, changeFrequency: "yearly", priority: 0.3 },
    ];

    return [...core, ...servicios, ...tools, ...legal];
}
