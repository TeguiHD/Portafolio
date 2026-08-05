/**
 * Contenido de respaldo para la home cuando no se ejecuta JavaScript.
 *
 * La home renderiza el Hero en servidor y difiere 7 secciones a
 * `IntersectionObserver`, así que el HTML servido lleva ~700 caracteres de
 * texto. Googlebot ejecuta JS y ve la página completa, pero GPTBot, ClaudeBot,
 * PerplexityBot y CCBot no renderizan: para ellos la home estaba casi vacía y
 * sin un solo enlace interno a las 29 herramientas.
 *
 * Este bloque va dentro de <noscript>, así que no altera lo que ve un usuario
 * normal, y su contenido sale del mismo registro que alimenta metadata,
 * sitemap y JSON-LD — no puede contradecir a la página real.
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
            <section
                aria-label="Contenido del sitio sin JavaScript"
                className="mx-auto max-w-5xl px-4 py-16 sm:px-6"
            >
                <h2 className="text-2xl font-bold text-white">
                    {tools.length} herramientas gratuitas para desarrollo y diseño
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-400">
                    Utilidades de uso diario, en español y sin registro. Cada una tiene
                    su propia página con instrucciones.
                </p>

                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                    {tools.map((tool) => (
                        <li key={tool.slug}>
                            <Link
                                href={`/herramientas/${tool.slug}`}
                                className="font-medium text-[#00B8A9]"
                            >
                                {tool.h1}
                            </Link>
                            <span className="block text-xs leading-relaxed text-neutral-500">
                                {tool.description}
                            </span>
                        </li>
                    ))}
                </ul>

                <h2 className="mt-12 text-2xl font-bold text-white">Quién mantiene el sitio</h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-400">
                    {SITE_NAME} — {jobTitle}.{" "}
                    <Link href="/sobre-mi" className="text-[#00B8A9]">
                        Sobre mí
                    </Link>
                    .
                </p>

                <h2 className="mt-12 text-2xl font-bold text-white">Más del sitio</h2>
                <ul className="mt-3 space-y-1 text-sm text-neutral-400">
                    <li>
                        <Link href="/herramientas" className="text-[#00B8A9]">
                            Índice de herramientas
                        </Link>
                    </li>
                    <li>
                        <Link href="/blog" className="text-[#00B8A9]">
                            Blog
                        </Link>
                    </li>
                </ul>
            </section>
        </noscript>
    );
}
