import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { ToolSeoContent } from "@/components/seo/ToolSeoContent";
import { JsonLd } from "@/components/seo/JsonLd";
import { ToolAccessProvider } from "@/components/tools/ToolAccessProvider";
import { resolveToolAccess } from "@/lib/tool-access.server";
import { leerIndicadores } from "@/lib/chile/indicadores.server";
import { breadcrumbSchema, faqPageSchema, type BreadcrumbTrail, type JsonLdObject } from "@/lib/seo/schemas";
import { IndicadoresProvider } from "./IndicadoresContext";

/**
 * El layout de las herramientas chilenas: el mismo de las demás (JSON-LD, migas, acceso decidido en el servidor, guía y
 * preguntas) y, si la herramienta los usa, los indicadores del día traídos en el servidor: así van en el HTML.
 */
export async function LayoutChileno({ slug, trail, aplicacion, conIndicadores = false, children }: {
    slug: string;
    /** Calculados en el layout de cada herramienta con su propio SLUG (lo exige pnpm seo:audit). */
    trail: BreadcrumbTrail;
    aplicacion: JsonLdObject;
    conIndicadores?: boolean;
    children: ReactNode;
}) {
    const faq = faqPageSchema(slug);
    const [access, indicadores] = await Promise.all([resolveToolAccess(slug), conIndicadores ? leerIndicadores() : Promise.resolve(null)]);
    return (
        <>
            <JsonLd schema={[breadcrumbSchema(trail), aplicacion, ...(faq ? [faq] : [])]} />
            <Breadcrumbs trail={trail} />
            <ToolAccessProvider value={{ isAuthorized: access.isAuthorized, accessType: access.accessType, toolName: access.toolName }}>
                <IndicadoresProvider value={indicadores}>{children}</IndicadoresProvider>
            </ToolAccessProvider>
            <ToolSeoContent slug={slug} />
        </>
    );
}
