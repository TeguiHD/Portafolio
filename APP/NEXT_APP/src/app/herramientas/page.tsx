import type { Metadata } from "next";
import Link from "next/link";
import { Herramientas } from "@/modules/landing/viva/Herramientas";
import { IndiceHerramientas } from "@/components/tools/IndiceHerramientas";
import "./catalogo.css";
import { getPublicTools } from "@/lib/public-tools.server";
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
 * El catálogo con el lenguaje de la portada: la esfera de herramientas como cabecera (la materia escribe la elegida) y,
 * debajo, todas en un índice por familia, sin tarjetas. Las migas y su JSON-LD se conservan para los buscadores.
 */
export default async function ToolsPage() {
    const herramientas = await getPublicTools();

    return (
        <main id="main-content" className="ht viva-portada">
            <JsonLd schema={breadcrumbSchema(TOOLS_HUB_TRAIL)} />
            <div className="ancho ht-migas"><Breadcrumbs trail={TOOLS_HUB_TRAIL} /></div>
            <Herramientas pagina />
            <IndiceHerramientas tools={herramientas} />
            <p className="ancho ht-cierre">¿Necesitas una herramienta a la medida de tu negocio? <Link className="enlace-ir" href="/#contacto">Hablemos ↗</Link></p>
        </main>
    );
}
