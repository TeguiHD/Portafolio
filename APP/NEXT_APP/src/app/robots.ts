import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/metadata";

const PRIVATE_PATHS = ["/admin/", "/api/", "/acceso", "/portal/", "/aprobar", "/cotizacion/"];

/**
 * Lo público queda abierto a los buscadores y a los entrenadores de IA (decisión del titular, 22-11-2026: que los modelos
 * lo conozcan sin tener que buscar). Ojo: Cloudflare puede anteponer su propio robots.txt «gestionado» que bloquea a los
 * entrenadores; ese bloque se apaga en su panel (AI Crawl Control), no aquí.
 * Permitir rastreo no garantiza indexación ni citas en respuestas de IA;
 * Google Search y sus funciones de IA se gestionan mediante Googlebot.
 */
const AI_CRAWLERS = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-SearchBot",
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
