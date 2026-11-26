import type { Metadata } from "next";
import { Esqueleto } from "@/modules/esqueleto/Esqueleto";
import { Contacto } from "@/modules/landing/viva/Contacto";

/**
 * /contacto: la sección «Conversemos» de la portada, sola. La abre la ventana «Conversemos» del modo escritorio, con el
 * mismo formulario y el mismo envío. No se indexa: para buscadores, el contacto vive en la portada.
 */
export const metadata: Metadata = {
    title: "Contacto",
    description: "Escríbeme por el formulario o a contacto@nicoholas.dev para conversar sobre tu proyecto.",
    robots: { index: false, follow: true },
};

export default function PaginaContacto() {
    return (
        <Esqueleto>
            <main className="pagina-contacto">
                <Contacto />
            </main>
        </Esqueleto>
    );
}
