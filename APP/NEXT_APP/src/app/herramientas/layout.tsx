import { CarcasaHerramientas } from "@/components/tools/CarcasaHerramientas";
import { getPublicTools } from "@/lib/public-tools.server";
import { relacionadasDe } from "@/lib/tool-destacadas";
import { Esqueleto } from "@/modules/esqueleto/Esqueleto";
import "./tools.css";
import "@/components/tools/mesa/mesa.css";
import "./tema-claro.css";

/**
 * /herramientas dentro del esqueleto del sitio (barra, pie y materia), como el resto de las páginas públicas.
 * Tema claro y oscuro: el interior de las herramientas usa clases oscuras fijas que tema-claro.css traduce a los colores del tema.
 */
export default async function ToolsLayout({ children }: { children: React.ReactNode }) {
    const tools = await getPublicTools();
    // Las relacionadas se resuelven aquí, solo entre las visibles: el registro completo no viaja al navegador.
    const visibles = tools.map((t) => t.slug);
    const relacionadas = Object.fromEntries(visibles.map((s) => [s, relacionadasDe(s, visibles)]));
    return (
        <Esqueleto>
            <CarcasaHerramientas tools={tools} relacionadas={relacionadas}>{children}</CarcasaHerramientas>
        </Esqueleto>
    );
}
