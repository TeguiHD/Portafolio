import { CarcasaHerramientas } from "@/components/tools/CarcasaHerramientas";
import { getPublicTools } from "@/lib/public-tools.server";
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
    return (
        <Esqueleto>
            <CarcasaHerramientas tools={tools}>{children}</CarcasaHerramientas>
        </Esqueleto>
    );
}
