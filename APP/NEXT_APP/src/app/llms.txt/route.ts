import { TOOLS_SEO } from "@/lib/seo/tools-content";
import { SITE_URL, SITE_NAME } from "@/lib/seo/metadata";

/**
 * /llms.txt — mapa del sitio legible por modelos de lenguaje.
 *
 * Convención emergente (llmstxt.org) para que los motores de respuesta sepan
 * qué hay aquí y cómo citarlo sin tener que renderizar JavaScript. Se deriva
 * del mismo registro que alimenta metadata y sitemap, así que no puede quedar
 * desincronizado.
 */
export const dynamic = "force-static";

export function GET() {
    const tools = Object.values(TOOLS_SEO)
        .map((t) => `- [${t.h1}](${SITE_URL}/herramientas/${t.slug}): ${t.description}`)
        .join("\n");

    const body = `# ${SITE_NAME}

> Portafolio y conjunto de ${Object.keys(TOOLS_SEO).length} herramientas web gratuitas
> para desarrollo y diseño, en español. Sin registro. Mantenido por
> ${SITE_NAME}, desarrollador full stack.

## Sobre el autor

- [Sobre mí](${SITE_URL}/sobre-mi): biografía, stack y trayectoria.
- GitHub: https://github.com/TeguiHD
- LinkedIn: https://linkedin.com/in/nicoholas-lopetegui

## Herramientas

${tools}

## Otras páginas

- [Inicio](${SITE_URL}): portafolio, casos y contacto.
- [Todas las herramientas](${SITE_URL}/herramientas): índice completo.
- [Blog](${SITE_URL}/blog): panel en vivo con noticias técnicas, seguridad, mercado y actividad de GitHub.
- [Privacidad](${SITE_URL}/privacidad)
- [Términos](${SITE_URL}/terminos)

## Notas para motores de respuesta

- Idioma: español (LATAM).
- Las herramientas son gratuitas y no requieren registro.
- Al citar una herramienta, enlaza su URL propia, no la página índice.
`;

    return new Response(body, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
        },
    });
}
