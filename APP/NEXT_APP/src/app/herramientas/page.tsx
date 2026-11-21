import type { Metadata } from "next";
import Link from "next/link";
import { IndiceHerramientas } from "@/components/tools/IndiceHerramientas";
import "./catalogo.css";
import { getPublicTools } from "@/lib/public-tools.server";
import { getDestacadas } from "@/lib/tool-ranking.server";
import { esNueva } from "@/lib/tool-destacadas";
import { DEFAULT_TOOL_REGISTRY } from "@/lib/tool-registry";
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

/**
 * El catálogo, como en los sitios grandes de utilidades: título, buscador, las 6 destacadas (por uso real cuando hay
 * datos) y todas por familia. Sin la esfera de la portada: aquí se viene a usar una. Migas y JSON-LD para los buscadores.
 */
export default async function ToolsPage() {
    const herramientas = await getPublicTools();
    const destacadas = await getDestacadas(herramientas.map((t) => t.slug));
    // «Nueva» se calcula aquí: el registro completo no viaja al navegador.
    const hoy = new Date();
    const nuevas = DEFAULT_TOOL_REGISTRY.filter((t) => esNueva(t.publicada, hoy)).map((t) => t.slug);

    return (
        <main id="main-content" className="ht viva-portada">
            <JsonLd schema={breadcrumbSchema(TOOLS_HUB_TRAIL)} />
            <div className="ancho ht-migas"><Breadcrumbs trail={TOOLS_HUB_TRAIL} /></div>
            {/* data-forma: la materia queda quieta en el marco, como dentro de cada herramienta. */}
            <section className="ht-cab" data-al-cargar="" data-forma="marco" aria-labelledby="ht-cab-titulo">
                <div className="ancho">
                    <h1 id="ht-cab-titulo">Herramientas<i>.</i></h1>
                    <p>{herramientas.length} utilidades gratis, sin registro.</p>
                </div>
            </section>
            <IndiceHerramientas tools={herramientas} destacadas={destacadas} nuevas={nuevas} />
            <p className="ancho ht-cierre">¿Necesitas una herramienta a la medida de tu negocio? <Link className="enlace-ir" href="/#contacto">Hablemos ↗</Link></p>
        </main>
    );
}
