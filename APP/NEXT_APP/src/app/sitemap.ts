import type { MetadataRoute } from "next";
import { TOOLS_SEO } from "@/lib/seo/tools-content";
import { SITE_URL } from "@/lib/seo/metadata";

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();

    const core: MetadataRoute.Sitemap = [
        { url: SITE_URL, lastModified: now, changeFrequency: "monthly", priority: 1.0 },
        {
            url: `${SITE_URL}/herramientas`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.9,
        },
        { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
        { url: `${SITE_URL}/ar`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
        {
            url: `${SITE_URL}/sobre-mi`,
            lastModified: now,
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

    const legal: MetadataRoute.Sitemap = [
        { url: `${SITE_URL}/privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
        { url: `${SITE_URL}/terminos`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    ];

    return [...core, ...tools, ...legal];
}
