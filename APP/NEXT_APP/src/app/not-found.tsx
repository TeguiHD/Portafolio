import { PaginaError } from "@/modules/errores/PaginaError";
import { VolverAtras } from "@/modules/errores/VolverAtras";
import { getToolSeo } from "@/lib/seo/tools-content";

// Componente de servidor: TOOLS_SEO (~20 KB de textos SEO) no viaja al navegador en cada página.
// Curación editorial: estas tres herramientas son las salidas de recuperación
// deliberadas para un visitante perdido, no un slice arbitrario del registro.
// Se derivan de TOOLS_SEO (href y label) para que un rename o borrado del
// slug en tools-content.ts rompa el build en vez de dejar un enlace muerto.
const RECOVERY_TOOL_SLUGS = ["qr", "claves", "json"] as const;

const RECOVERY_LINKS = [
    { href: "/herramientas", label: "Todas las herramientas" },
    ...RECOVERY_TOOL_SLUGS.map((slug) => {
        const tool = getToolSeo(slug);
        return { href: `/herramientas/${tool.slug}`, label: tool.h1 };
    }),
    { href: "/blog", label: "Blog" },
    { href: "/", label: "Inicio" },
];

export default function NotFound() {
    return (
        <PaginaError codigo="404" titulo="Esta página no existe." texto="El contenido que buscas no existe o fue movido a otra ubicación."
            acciones={<>
                <a className="boton lleno" href="/">Volver al inicio</a>
                <VolverAtras />
            </>}
            salidas={RECOVERY_LINKS} />
    );
}
