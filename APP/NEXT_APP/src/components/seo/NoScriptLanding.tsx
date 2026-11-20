/**
 * Contenido de respaldo para la portada cuando no se ejecuta JavaScript.
 *
 * La portada ya sale del servidor con sus secciones (proyectos, herramientas, contacto),
 * pero las herramientas van como íconos en órbita: sin JavaScript no hay cómo llegar a cada una.
 * Googlebot ejecuta JS; GPTBot, ClaudeBot, PerplexityBot y CCBot no. Para ellos, y para quien
 * navega sin scripts, este bloque enlaza las herramientas una por una.
 *
 * Va dentro de <noscript>, así que no altera lo que ve un visitante normal, y su contenido sale
 * del mismo registro que alimenta metadata, sitemap y JSON-LD: no puede contradecir a la página.
 * Estilos en src/modules/esqueleto/esqueleto.css (.sin-js).
 */
import Link from "next/link";
import { TOOLS_SEO } from "@/lib/seo/tools-content";
import { SITE_NAME } from "@/lib/seo/metadata";
import { personSchema } from "@/lib/seo/schemas";

export function NoScriptLanding() {
    const tools = Object.values(TOOLS_SEO);
    const jobTitle = personSchema().jobTitle as string;

    return (
        <noscript>
            <div className="ancho sin-js" role="region" aria-label="Contenido del sitio sin JavaScript">
                <h2>{tools.length} herramientas gratuitas para desarrollo y diseño</h2>
                <p>Utilidades de uso diario, en español y sin registro. Cada una tiene su propia página con instrucciones.</p>
                <ul className="sin-js-lista">
                    {tools.map((tool) => (
                        <li key={tool.slug}>
                            <Link href={`/herramientas/${tool.slug}`}>{tool.h1}</Link>
                            <span>{tool.description}</span>
                        </li>
                    ))}
                </ul>

                <h2>Quién mantiene el sitio</h2>
                <p>{SITE_NAME} — {jobTitle}. <Link href="/sobre-mi">Sobre mí</Link>.</p>

                <h2>Más del sitio</h2>
                <ul>
                    <li><Link href="/herramientas">Índice de herramientas</Link></li>
                    <li><Link href="/blog">Blog</Link></li>
                </ul>
            </div>
        </noscript>
    );
}
