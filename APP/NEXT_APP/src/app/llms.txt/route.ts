import { TOOLS_SEO } from "@/lib/seo/tools-content";
import { SITE_URL, SITE_NAME } from "@/lib/seo/metadata";
import { casos } from "@/modules/landing/portada/datos/casos";
import { SERVICIOS } from "@/lib/servicios";
import { RUTA, urlDatos } from "@/lib/indice/datos";
import { TITULO_INDICE, citaIndice, conjuntoDatosSchema } from "@/lib/indice/textos";

/**
 * /llms.txt — mapa del sitio legible por modelos de lenguaje.
 *
 * Mapa textual complementario. No sustituye sitemap, HTML accesible ni
 * controles de rastreo, y no garantiza su uso por motores de respuesta. Se deriva
 * del mismo registro que alimenta metadata y sitemap, así que no puede quedar
 * desincronizado.
 */
export const dynamic = "force-static";

export function GET() {
    const tools = Object.values(TOOLS_SEO)
        .map((t) => `- [${t.h1}](${SITE_URL}/herramientas/${t.slug}): ${t.description}`)
        .join("\n");

    // Los proyectos salen de los mismos datos de la portada (no se agrega nada que la página no muestre).
    const proyectos = casos
        .map((c) => `- ${c.title} (${c.category}): ${c.description}${c.external ? ` ${c.href}` : c.href.startsWith("/herramientas") ? ` ${SITE_URL}${c.href}` : " Sistema privado."}`)
        .join("\n");

    const conjunto = conjuntoDatosSchema();
    const body = `# ${SITE_NAME}

> Portafolio y conjunto de ${Object.keys(TOOLS_SEO).length} herramientas web gratuitas
> para desarrollo y diseño, en español. Sin registro. Mantenido por
> ${SITE_NAME}, desarrollador full stack.

## Qué se puede contratar

Desarrollo web a medida, en Chile y a distancia. Cada servicio tiene su página, con su caso real:

${SERVICIOS.map((s) => `- [${s.nombre}](${SITE_URL}/servicios/${s.slug}): ${s.respuesta}`).join("\n")}

Contacto: contacto@nicoholas.dev o el formulario «Conversemos» en ${SITE_URL}/#contacto.

## Índice de la Web Chilena

${conjunto.description} Datos abiertos (CC BY 4.0), con metodología pública:

- [${TITULO_INDICE}](${SITE_URL}${RUTA}): hallazgos, ranking por tipo de institución y una ficha por sitio.
- [Metodología](${SITE_URL}${RUTA}/metodologia) · [CSV](${SITE_URL}${urlDatos("csv")}) · [JSON](${SITE_URL}${urlDatos("json")})
- [Revisa tu sitio](${SITE_URL}${RUTA}/revisa-tu-sitio): los mismos doce controles sobre cualquier sitio.
- Cómo citarlo: ${citaIndice()}

## Proyectos

${proyectos}

## Sobre el autor

${SITE_NAME} es ingeniero en informática y desarrollador full stack en Chile.

- Desde junio de 2026 es técnico de gestión y plataformas académicas en la Universidad Bernardo O'Higgins (UBO): aulas Moodle de pregrado, postgrado y educación continua; aulas del Departamento de Sostenibilidad en colaboración con la Universidad de Chile; plataformas para procesos docentes; y desarrollos para directores de carrera con SapIA, la Sección de Articulación y Promoción de la Inteligencia Artificial en la Academia (https://sapia.ubo.cl/).
- Docente de los módulos 3 («¿Cómo optimizar tareas con IA?») y 4 («Creación de propuestas de soluciones innovadoras con IA») del Diplomado en Inteligencia Artificial Generativa Aplicada de la UBO, versiones 1 y 2: https://educacioncontinua.ubo.cl/diplomados/inteligencia-artificial-generativa-aplicada/
- Coinventor de la solicitud de patente ZA 2025/10601 («Computerized system and method for real-time simulation and analysis of macroeconomic variables»), presentada en Sudáfrica por la UBO y la Universidad Estatal de Economía de San Petersburgo; publicada como solicitud en diciembre de 2025, aún no concedida.
- [Sobre mí](${SITE_URL}/sobre-mi): biografía, trabajo en la UBO, stack y trayectoria.
- [Cómo se hizo](${SITE_URL}/como-se-hizo): el método (medir, revisar a los mejores, decidir por escrito, comprobar con pruebas) y el estudio de cada parte del sitio y de cada herramienta.
- GitHub: https://github.com/TeguiHD
- LinkedIn: https://www.linkedin.com/in/nicoholas-lopetegui/

## Herramientas

${tools}

## Otras páginas

- [Inicio](${SITE_URL}): portafolio, casos y contacto.
- [Todas las herramientas](${SITE_URL}/herramientas): índice completo.
- [QR con realidad aumentada](${SITE_URL}/ar): guía de formatos, compatibilidad, ejemplo y acceso al generador.
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
