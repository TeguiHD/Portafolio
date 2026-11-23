import type { Metadata } from "next";
import Link from "next/link";
import { Esqueleto } from "@/modules/esqueleto/Esqueleto";
import { Vista } from "@/modules/landing/viva/Vista";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, type BreadcrumbTrail } from "@/lib/seo/schemas";
import { EDICION, RUTA, medidos } from "@/lib/indice/datos";
import { Revisor } from "@/modules/indice/Revisor";
import "@/modules/sobre-mi/sobre-mi.css";
import "@/modules/indice/indice.css";

export const metadata: Metadata = {
    title: { absolute: "Revisa la seguridad básica de tu sitio web | Índice Web Chilena" },
    description: "Revisa gratis doce controles de tu sitio: HTTPS, HSTS, CSP, protección contra marcos, idioma, título y más, y compáralo con los sitios públicos de Chile.",
    alternates: { canonical: `${RUTA}/revisa-tu-sitio` },
};

const trail: BreadcrumbTrail = [{ name: "Inicio", path: "" }, { name: "Índice de la Web Chilena", path: RUTA }, { name: "Revisa tu sitio", path: `${RUTA}/revisa-tu-sitio` }];

export default function RevisaTuSitio() {
    const n = medidos(EDICION.sitios).filter((s) => s.revision).length;
    return (
        <Esqueleto portada>
            <JsonLd schema={[breadcrumbSchema(trail)]} />
            <main id="main-content" className="sm ix">
                <div className="ancho sm-migas"><Breadcrumbs trail={trail} /></div>
                <section id="inicio" className="ix-cab ix-cab-chica" aria-labelledby="ix-titulo">
                    <Vista className="ancho">
                        <h1 id="ix-titulo"><span className="linea-r"><span>Revisa tu sitio</span></span></h1>
                        <p className="ix-respuesta" data-sube="">
                            Los mismos doce controles del Índice de la Web Chilena (seguridad básica y lo esencial del HTML), sobre el sitio que escribas, y cómo queda frente a los {n} sitios públicos medidos.
                            Se revisa la página que escribas, tal como la entrega el servidor. No hace falta registrarse.
                        </p>
                    </Vista>
                </section>
                <section className="ix-bloque" aria-label="Revisor">
                    <div className="ancho"><Revisor /></div>
                </section>
                <section className="ix-bloque" aria-label="Más del índice">
                    <div className="ancho">
                        <p className="ix-enlaces">
                            <Link className="enlace-ir" href={RUTA}>Ver el índice</Link>
                            <Link className="enlace-ir" href={`${RUTA}/metodologia`}>Qué revisa cada control</Link>
                        </p>
                    </div>
                </section>
            </main>
        </Esqueleto>
    );
}
