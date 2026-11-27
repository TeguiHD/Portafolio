import type { Metadata } from "next";
import { getPublicTools } from "@/lib/public-tools.server";
import { SERVICIOS } from "@/lib/servicios";
import { casos } from "@/modules/landing/portada/datos/casos";
import { Escritorio } from "@/modules/escritorio/Escritorio";
import type { ProyectoEscritorio } from "@/modules/escritorio/tipos";

/**
 * /escritorio: el sitio como un escritorio de Windows 11 con la marca «n.» (pedido del dueño el 26-11-2026). Es otra
 * forma de recorrer las mismas páginas, así que no se indexa: lo que cuenta para buscadores e IA son las páginas normales.
 */
export const metadata: Metadata = {
    title: "Modo escritorio",
    description: "nicoholas.dev como un escritorio: proyectos, herramientas como apps, correo, noticias y configuración, con clics que suenan.",
    robots: { index: false, follow: true },
    alternates: { canonical: "/escritorio" },
};

export default async function PaginaEscritorio() {
    const tools = await getPublicTools();
    const herramientas = tools.map((t) => ({ slug: t.slug, nombre: t.name, familia: t.category, ancho: t.ancho, descripcion: t.description }));
    const servicios = SERVICIOS.map((s) => ({ slug: s.slug, nombre: s.nombre, resumen: s.seo.description }));
    const proyectos: ProyectoEscritorio[] = casos.map((c) => {
        const v = c as typeof c & { tipo?: string; direccion?: string; vistas?: { nombre: string; escritorio: string; celular?: string }[] };
        return {
            id: c.id, titulo: c.title, tipo: v.tipo ?? c.category, texto: c.description, imagen: v.vistas?.[0]?.escritorio ?? c.image, imagenAlt: c.imageAlt,
            cta: c.cta, href: c.href, externo: c.external, direccion: v.direccion,
            vistas: v.vistas?.map((x) => ({ nombre: x.nombre, escritorio: x.escritorio, celular: x.celular })),
        };
    });
    return <Escritorio herramientas={herramientas} proyectos={proyectos} servicios={servicios} />;
}
