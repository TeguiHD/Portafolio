import type { MetadataRoute } from "next";
import { TOOLS_SEO } from "@/lib/seo/tools-content";
import { SITE_URL } from "@/lib/seo/metadata";
import { SERVICIOS } from "@/lib/servicios";
import { CATEGORIAS, EDICION, RUTA, categoriaPorId } from "@/lib/indice/datos";

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
        // El estudio detrás de cada parte del sitio (24-11-2026).
        { url: `${SITE_URL}/como-se-hizo`, lastModified: new Date("2026-11-24"), changeFrequency: "monthly", priority: 0.7 },
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

    // Índice de la Web Chilena (jugada 4): el informe, su método, el revisor, los rankings y una ficha por institución.
    const medicion = new Date(EDICION.medidoHasta ?? "2026-11-23");
    const indice: MetadataRoute.Sitemap = [
        { url: `${SITE_URL}${RUTA}`, lastModified: medicion, changeFrequency: "monthly", priority: 0.9 },
        { url: `${SITE_URL}${RUTA}/metodologia`, lastModified: medicion, changeFrequency: "yearly", priority: 0.5 },
        { url: `${SITE_URL}${RUTA}/revisa-tu-sitio`, lastModified: medicion, changeFrequency: "yearly", priority: 0.7 },
        ...CATEGORIAS.map((c) => ({ url: `${SITE_URL}${RUTA}/${c.ruta}`, lastModified: medicion, changeFrequency: "monthly" as const, priority: 0.7 })),
        ...EDICION.sitios.map((x) => ({ url: `${SITE_URL}${RUTA}/${categoriaPorId(x.categoria)!.ruta}/${x.slug}`, lastModified: medicion, changeFrequency: "monthly" as const, priority: 0.4 })),
    ];

    const legal: MetadataRoute.Sitemap = [
        { url: `${SITE_URL}/privacidad`, changeFrequency: "yearly", priority: 0.3 },
        { url: `${SITE_URL}/terminos`, changeFrequency: "yearly", priority: 0.3 },
    ];

    return [...core, ...servicios, ...indice, ...tools, ...legal];
}
