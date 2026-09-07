/**
 * Contenido editorial bajo el widget de una herramienta.
 *
 * Va debajo, no encima: quien llega viene a usar la herramienta, y el texto
 * está para quien se queda y para los buscadores. Antes de esto cada página
 * tenía ~10 palabras indexables, que es la definición de thin content.
 *
 * Devuelve null si la herramienta aún no tiene contenido escrito, de modo que
 * el despliegue pueda ser gradual sin dejar secciones vacías a la vista.
 */
import Link from "next/link";
import { BookOpen, ChevronDown } from "lucide-react";
import { getToolCopy } from "@/lib/seo/tools-copy";
import { getToolSeo } from "@/lib/seo/tools-content";

interface ToolSeoContentProps {
    slug: string;
}

export function ToolSeoContent({ slug }: ToolSeoContentProps) {
    const copy = getToolCopy(slug);
    if (!copy) return null;

    const entry = getToolSeo(slug);
    const related = entry.related
        .map((relatedSlug) => getToolSeo(relatedSlug))
        .filter(Boolean);

    return (
        <section
            aria-label={`Guía de ${entry.h1}`}
            className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-8"
        >
            <details className="tool-guide rounded-xl border border-white/10 bg-white/[0.02]">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-center gap-2 px-4 py-3 text-center text-sm font-medium text-white"><BookOpen size={16} aria-hidden="true" />Guía de uso y preguntas frecuentes<ChevronDown size={16} aria-hidden="true" className="shrink-0" /></summary>
            <div className="mx-auto max-w-3xl border-t border-white/[0.06] p-4 sm:p-6">
            <p className="text-sm leading-relaxed text-neutral-300">{copy.intro}</p>

            <h2 className="mt-8 text-lg font-semibold text-white">
                Cómo usar {entry.h1.toLowerCase()}
            </h2>
            <ol className="mt-4 space-y-4">
                {copy.steps.map((step, index) => (
                    <li key={step.title} className="flex gap-4">
                        <span
                            aria-hidden="true"
                            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-semibold text-neutral-400"
                        >
                            {index + 1}
                        </span>
                        <div>
                            <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                            <p className="mt-1 text-sm leading-relaxed text-neutral-400">
                                {step.body}
                            </p>
                        </div>
                    </li>
                ))}
            </ol>

            <h2 className="mt-8 text-lg font-semibold text-white">
                Para qué se usa
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {copy.useCases.map((useCase) => (
                    <div
                        key={useCase.title}
                        className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                    >
                        <h3 className="text-sm font-semibold text-white">{useCase.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">
                            {useCase.body}
                        </p>
                    </div>
                ))}
            </div>

            <h2 className="mt-8 text-lg font-semibold text-white">
                Preguntas frecuentes
            </h2>
            <dl className="mt-5 space-y-6">
                {copy.faq.map((item) => (
                    <div key={item.question}>
                        <dt className="text-sm font-semibold text-white">{item.question}</dt>
                        <dd className="mt-1.5 text-sm leading-relaxed text-neutral-400">
                            {item.answer}
                        </dd>
                    </div>
                ))}
            </dl>
            </div>
            </details>

            {slug === "qr" && <Link href="/ar" className="mt-5 flex min-h-11 items-center justify-between gap-4 rounded-xl border border-violet-300/20 bg-violet-300/5 p-4 text-sm text-violet-200"><span>QR con realidad aumentada: formatos, compatibilidad y ejemplo</span><span aria-hidden="true">→</span></Link>}

            {related.length > 0 && (
                <>
                    <h2 className="mt-8 text-lg font-semibold text-white">
                        Herramientas relacionadas
                    </h2>
                    <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                        {related.map((tool) => (
                            <li key={tool.slug}>
                                <Link
                                    href={`/herramientas/${tool.slug}`}
                                    className="block rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:border-[#00B8A9]/40"
                                >
                                    <span className="block text-sm font-semibold text-white">
                                        {tool.h1}
                                    </span>
                                    <span className="mt-1 block text-xs leading-relaxed text-neutral-500">
                                        {tool.primaryKeyword}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    );
}
