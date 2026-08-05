/**
 * Firma de autor al pie de una herramienta o artículo.
 *
 * Señal E-A-T: conecta cada página de utilidad con una persona identificable
 * y con la página que la respalda. No usa <h1> — la página ya tiene el suyo.
 */
import Link from "next/link";
import { SITE_NAME } from "@/lib/seo/metadata";
import { personSchema } from "@/lib/seo/schemas";

export function AuthorBio() {
    // Solo describe a la persona (nombre + rol de personSchema()). Ningún dato
    // aquí puede depender de qué herramienta esté renderizando este componente:
    // una afirmación de producto ("gratis", "sin registro", "sin marcas de
    // agua"...) puede ser falsa en alguna de las 29, así que no vive aquí. Eso
    // es responsabilidad del registro por herramienta (Fase 4).
    const jobTitle = personSchema().jobTitle as string;

    return (
        <aside
            data-testid="author-bio"
            className="mx-auto mt-16 w-full max-w-5xl px-4 pb-16 sm:px-6"
        >
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                    Quién mantiene esta herramienta
                </p>
                <p className="mt-3 text-base font-semibold text-white">{SITE_NAME}</p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{jobTitle}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <Link
                        href="/sobre-mi"
                        className="text-[#00B8A9] transition hover:text-white"
                    >
                        Más sobre mí
                    </Link>
                    <a
                        href="https://github.com/TeguiHD"
                        target="_blank"
                        rel="noopener noreferrer me"
                        className="text-neutral-400 transition hover:text-white"
                    >
                        GitHub
                    </a>
                    <a
                        href="https://linkedin.com/in/nicoholas-lopetegui"
                        target="_blank"
                        rel="noopener noreferrer me"
                        className="text-neutral-400 transition hover:text-white"
                    >
                        LinkedIn
                    </a>
                </div>
            </div>
        </aside>
    );
}
