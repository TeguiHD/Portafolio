import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/metadata";

const PRIVATE_PATHS = ["/admin/", "/api/", "/acceso", "/portal/", "/aprobar", "/cotizacion/"];

/**
 * Crawlers de modelos de lenguaje y motores de respuesta.
 * Se permiten de forma explícita: es la vía por la que el sitio aparece
 * citado en ChatGPT, Claude, Perplexity y AI Overviews de Google.
 */
const AI_CRAWLERS = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-User",
    "anthropic-ai",
    "PerplexityBot",
    "Perplexity-User",
    "Google-Extended",
    "CCBot",
    "Applebot-Extended",
    "Amazonbot",
    "meta-externalagent",
    "Bytespider",
    "DuckAssistBot",
    "cohere-ai",
];

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: PRIVATE_PATHS,
            },
            ...AI_CRAWLERS.map((userAgent) => ({
                userAgent,
                allow: "/",
                disallow: PRIVATE_PATHS,
            })),
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
