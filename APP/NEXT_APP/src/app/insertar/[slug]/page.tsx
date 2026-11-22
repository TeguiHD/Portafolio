import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { INCRUSTABLES } from "@/lib/chile/incrustables";
import { resolveToolAccess } from "@/lib/tool-access.server";
import { leerIndicadores } from "@/lib/chile/indicadores.server";
import { SITE_URL } from "@/lib/seo/metadata";
import { IndicadoresProvider } from "@/components/tools/chile/IndicadoresContext";
import { ValidadorRut } from "@/components/tools/chile/ValidadorRut";
import { ConversorIndicadores } from "@/components/tools/chile/ConversorIndicadores";
import { CalculadoraSueldo } from "@/components/tools/chile/CalculadoraSueldo";
import { CalculadoraHonorarios } from "@/components/tools/chile/CalculadoraHonorarios";
import { CalculadoraIva } from "@/components/tools/chile/CalculadoraIva";
import { TemaIncrustado } from "@/components/tools/chile/TemaIncrustado";
import "@/app/herramientas/tema-claro.css";
import "./insertar.css";

/**
 * La herramienta sola, para insertarla en otro sitio con un iframe (botón «Insertar en tu sitio»). Sin barra, sin pie
 * y sin el fondo de partículas; con el enlace de vuelta a la herramienta. La CSP de esta ruta permite que cualquier sitio
 * la incruste (src/proxy.ts). No se indexa: la página que cuenta es /herramientas/<slug>.
 */
const COMPONENTES: Record<string, () => ReactNode> = {
    impuestos: () => <CalculadoraIva />,
    rut: () => <ValidadorRut />,
    "uf-utm": () => <ConversorIndicadores />,
    "sueldo-liquido": () => <CalculadoraSueldo />,
    "boleta-honorarios": () => <CalculadoraHonorarios />,
};
const CON_INDICADORES = new Set(["uf-utm", "sueldo-liquido"]);

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ tema?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const h = INCRUSTABLES[slug];
    if (!h) return {};
    return {
        title: { absolute: `${h.nombre} | nicoholas.dev` },
        robots: { index: false, follow: true },
        alternates: { canonical: `/herramientas/${slug}` },
    };
}

export default async function Insertar({ params, searchParams }: Props) {
    const { slug } = await params;
    const h = INCRUSTABLES[slug], componente = COMPONENTES[slug];
    if (!h || !componente) notFound();
    const [acceso, indicadores, { tema }] = await Promise.all([
        resolveToolAccess(slug),
        CON_INDICADORES.has(slug) ? leerIndicadores() : Promise.resolve(null),
        searchParams,
    ]);
    if (!acceso.isAuthorized) notFound();
    return (
        <IndicadoresProvider value={indicadores}>
            <TemaIncrustado tema={tema === "claro" ? "claro" : tema === "oscuro" ? "oscuro" : null} />
            <main className="insertado tools-workspace">
                <h1 className="insertado-titulo">{h.nombre}</h1>
                {componente()}
                <a className="insertado-firma" href={`${SITE_URL}/herramientas/${slug}`} target="_blank" rel="noopener">
                    {h.nombre} · <b>nicoholas.dev</b> ↗
                </a>
            </main>
        </IndicadoresProvider>
    );
}
