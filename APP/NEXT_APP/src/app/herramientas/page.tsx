import type { Metadata } from "next";
import Link from "next/link";
import { ToolWorkflows } from "@/components/tools/ToolWorkflows";
import { getPublicTools } from "@/lib/public-tools.server";
import { ArrowUpRight, Box, Layers3, ScanLine } from "lucide-react";
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
                <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
                    <div>
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300">CREA · TRANSFORMA · RESUELVE</p>
                        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Tu espacio de herramientas.</h1>
                        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">Un lugar para pasar de la idea al resultado. Utilidades de diseño y desarrollo, sin registro ni marcas de agua.</p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs text-slate-400"><Layers3 size={14} aria-hidden="true" />{combinedTools.length} herramientas</span>
                </header>
                <section aria-label="Herramienta destacada" className="mb-9 grid overflow-hidden rounded-2xl border border-violet-300/20 bg-[#141828] sm:grid-cols-[1fr_240px]">
                    <div className="p-6 sm:p-7">
                        <span className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-violet-300"><Box size={15} aria-hidden="true" />QR + REALIDAD AUMENTADA</span>
                        <h2 className="text-2xl font-semibold tracking-tight text-white">Haz que tu producto salga de la pantalla.</h2>
                        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">Crea un QR para explorar un objeto 3D y abrirlo en el espacio real desde un móvil compatible. Ideal para productos, cartas y catálogos.</p>
                        <Link href="/herramientas/qr?tipo=ar" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-violet-200 px-4 text-sm font-semibold text-violet-950 transition-colors hover:bg-violet-100">Crear una experiencia AR<ArrowUpRight size={16} aria-hidden="true" /></Link>
                    </div>
                    <div aria-hidden="true" className="relative hidden items-center justify-center overflow-hidden border-l border-white/5 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.18),transparent_70%)] sm:flex">
                        <div className="absolute h-40 w-40 rounded-full border border-violet-300/10" />
                        <div className="absolute h-56 w-56 rounded-full border border-violet-300/10" />
                        <Box className="h-24 w-24 text-violet-200" strokeWidth={0.8} />
                        <ScanLine className="absolute bottom-5 right-5 h-8 w-8 text-violet-300/50" strokeWidth={1} />
                    </div>
                </section>

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
