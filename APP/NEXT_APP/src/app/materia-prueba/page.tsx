import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Materia } from "@/modules/materia/Materia";
import { Barra } from "@/modules/esqueleto/Barra";
import { Pie } from "@/modules/esqueleto/Pie";
import "@/modules/esqueleto/esqueleto.css";

export const metadata: Metadata = { title: "Diagnóstico de la materia", robots: { index: false, follow: false } };

const seccion = { position: "relative", zIndex: 1, minHeight: "100vh", display: "grid", placeItems: "center" } as const;

/**
 * Página de diagnóstico del motor de partículas: una sección por forma.
 * Solo existe fuera de producción; la usan las pruebas de tests/e2e/viva-materia.spec.ts.
 */
export default function MateriaPrueba() {
    if (process.env.NODE_ENV === "production") notFound();
    return (
        <Materia>
            <div className="viva">
            <Barra inicio="#p-figuras" contacto="#p-firma" enlaces={[{ href: "#p-olas", texto: "Olas" }, { href: "#p-imagen-sin-foto", texto: "Imagen" }, { href: "#p-firma", texto: "Firma" }]} />
            <main id="contenido" tabIndex={-1} className="viva-portada">
                <section id="p-figuras" data-forma="figuras" data-ancla="#p-ancla-figuras" style={seccion}><div id="p-ancla-figuras" style={{ width: 400, height: 400 }} /></section>
                <section id="p-olas" data-forma="olas" style={seccion}><p>olas</p></section>
                <section id="p-imagen-sin-foto" data-forma="imagen" data-ancla="#p-ancla-imagen" style={seccion}><div id="p-ancla-imagen" style={{ width: 600, height: 375 }} /></section>
                <section id="p-firma" data-forma="firma" data-ancla="#p-ancla-firma" style={seccion}><div id="p-ancla-firma" style={{ width: "min(880px, 92vw)", height: 190 }} /></section>
            </main>
            <Pie />
            </div>
        </Materia>
    );
}
