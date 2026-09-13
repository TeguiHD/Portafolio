import type { Metadata } from "next";
import Link from "next/link";
import { ToolWorkflows } from "@/components/tools/ToolWorkflows";
import { getPublicTools } from "@/lib/public-tools.server";
import { Layers3 } from "lucide-react";
import ToolsGrid from "@/components/tools/ToolsGrid";
import { TOOL_SEO_SLUGS } from "@/lib/seo/tools-content";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { breadcrumbSchema, TOOLS_HUB_TRAIL } from "@/lib/seo/schemas";

export const revalidate = 10; // Revalidate every 10 seconds for faster updates

// Derivado del registro para que agregar/quitar una herramienta actualice
// el title y la description sin necesidad de tocar este archivo.
const TOOL_COUNT = TOOL_SEO_SLUGS.length;

export const metadata: Metadata = {
    title: { absolute: `${TOOL_COUNT} Herramientas Online Gratis para Desarrolladores` },
    description:
        `Colección de ${TOOL_COUNT} herramientas gratuitas para desarrollo y diseño: QR, contraseñas, Base64, JSON, JWT, subredes, imágenes y más. Sin registro ni marcas de agua.`,
    alternates: { canonical: "/herramientas" },
};

export default async function ToolsPage() {
    const combinedTools = await getPublicTools();

    return (
        <div className="tool-page">
            <JsonLd schema={breadcrumbSchema(TOOLS_HUB_TRAIL)} />
            <Breadcrumbs trail={TOOLS_HUB_TRAIL} />
            <main className="tool-main max-w-7xl mx-auto px-4 sm:px-8 pb-12">
                <header className="tools-hub-heading mb-7 flex flex-wrap items-end justify-between gap-5">
                    <div>
                        <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-300"><span className="h-1.5 w-1.5 rounded-full bg-teal-300" />TU CAJA DE HERRAMIENTAS</p>
                        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[44px] sm:leading-tight">Hazlo. <span className="text-slate-400">Y sigue creando.</span></h1>
                        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">Imágenes, código y utilidades. Sin registro ni marcas de agua.</p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs text-slate-400"><Layers3 size={14} aria-hidden="true" />{combinedTools.length} herramientas</span>
                </header>
                {/* Tools Grid */}
                <ToolsGrid tools={combinedTools} />
                <div className="mt-12"><ToolWorkflows tools={combinedTools} /></div>
                <section aria-labelledby="tools-author" className="mt-12 flex flex-col gap-5 rounded-2xl border border-teal-400/20 bg-teal-400/5 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-lg">
                        <h2 id="tools-author" className="text-lg font-semibold text-white">¿Necesitas una solución para tu negocio?</h2>
                        <p className="mt-2 text-sm leading-relaxed text-neutral-300">Soy Nicoholas, el desarrollador de estas herramientas. También construyo tiendas online y sistemas internos a medida.</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                        <Link href="/#contact" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-300 px-5 text-sm font-semibold text-slate-950 hover:bg-teal-200 focus-visible:outline-2 focus-visible:outline-white">Hablemos de tu proyecto</Link>
                        <Link href="/sobre-mi" className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm text-neutral-200 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-teal-300">Conoce mi trabajo</Link>
                    </div>
                </section>
            </main>
        </div>
    );
}
