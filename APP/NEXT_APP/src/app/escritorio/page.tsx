import type { Metadata } from "next";
import { getPublicTools } from "@/lib/public-tools.server";
import { casos } from "@/modules/landing/portada/datos/casos";
import { Escritorio } from "@/modules/escritorio/Escritorio";
import type { ProyectoEscritorio } from "@/modules/escritorio/tipos";

/**
 * /escritorio: el sitio como un escritorio con ventanas (pedido del dueño el 26-11-2026). Es otra forma de recorrer
 * las mismas páginas, así que no se indexa: lo que cuenta para buscadores e IA son las páginas normales.
 */
export const metadata: Metadata = {
    title: "Modo escritorio",
    description: "nicoholas.dev como un escritorio: proyectos, herramientas y páginas en ventanas que se arrastran, con clics que suenan.",
    robots: { index: false, follow: true },
    alternates: { canonical: "/escritorio" },
};

export default async function PaginaEscritorio() {
    const tools = await getPublicTools();
    const herramientas = tools.map((t) => ({ slug: t.slug, nombre: t.name, familia: t.category, ancho: t.ancho }));
    const proyectos: ProyectoEscritorio[] = casos.map((c) => {
        const v = c as typeof c & { tipo?: string; vistas?: { escritorio: string }[] };
        return {
            id: c.id, titulo: c.title, tipo: v.tipo ?? c.category, texto: c.description,
            imagen: v.vistas?.[0]?.escritorio ?? c.image, imagenAlt: c.imageAlt, cta: c.cta, href: c.href, externo: c.external,
        };
    });
    return <Escritorio herramientas={herramientas} proyectos={proyectos} />;
}
