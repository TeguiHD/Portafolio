import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IndicadoresProvider } from "@/components/tools/chile/IndicadoresContext";
import { ToolAccessProvider } from "@/components/tools/ToolAccessProvider";
import { leerIndicadores } from "@/lib/chile/indicadores.server";
import { getPublicTools } from "@/lib/public-tools.server";
import { resolveToolAccess } from "@/lib/tool-access.server";
import { AppHerramienta } from "@/modules/escritorio/AppHerramienta";
import { HERRAMIENTAS_APP } from "@/modules/escritorio/herramientas-app";
import "@/app/herramientas/tools.css";
import "@/components/tools/mesa/mesa.css";
import "@/app/herramientas/tema-claro.css";
import "@/modules/escritorio/app-herramienta.css";

/** Las que muestran la UF, la UTM y los topes del día (los mismos que trae su layout en /herramientas). */
const CON_INDICADORES = new Set(["sueldo-liquido", "uf-utm"]);

type Props = { params: Promise<{ slug: string }> };

async function herramienta(slug: string) {
    return (await getPublicTools()).find((t) => t.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const t = await herramienta((await params).slug);
    return { title: t?.name ?? "Herramienta", robots: { index: false, follow: false } };
}

/**
 * /escritorio/app/<slug>: la herramienta sola, como app de una ventana del modo escritorio. Es la misma página de
 * /herramientas/<slug> sin lo que la rodea en el sitio (cabecera, migas, guía, preguntas y relacionadas): la ventana
 * ya dice qué es y la guía queda en «Acerca de». Fuera de una ventana manda a la herramienta (AppHerramienta).
 */
export default async function AppDeHerramienta({ params }: Props) {
    const { slug } = await params;
    const t = await herramienta(slug);
    const Herramienta = HERRAMIENTAS_APP[slug];
    if (!t || !Herramienta) notFound();
    const [acceso, indicadores] = await Promise.all([
        resolveToolAccess(slug),
        CON_INDICADORES.has(slug) ? leerIndicadores() : Promise.resolve(null),
    ]);
    return (
        <AppHerramienta slug={slug} ancho={t.ancho}>
            <ToolAccessProvider value={{ isAuthorized: acceso.isAuthorized, accessType: acceso.accessType, toolName: acceso.toolName }}>
                <IndicadoresProvider value={indicadores}>
                    <Herramienta />
                </IndicadoresProvider>
            </ToolAccessProvider>
        </AppHerramienta>
    );
}
