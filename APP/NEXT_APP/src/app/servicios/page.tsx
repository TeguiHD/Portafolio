import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Esqueleto } from "@/modules/esqueleto/Esqueleto";
import { Vista } from "@/modules/landing/viva/Vista";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, type BreadcrumbTrail } from "@/lib/seo/schemas";
import { SERVICIOS } from "@/lib/servicios";
import "@/modules/sobre-mi/sobre-mi.css";
import { ListaServicios } from "@/modules/servicios/Escena";
import "@/modules/servicios/servicios.css";

export const metadata: Metadata = {
    title: { absolute: "Servicios de desarrollo web a medida | Nicoholas Lopetegui" },
    description: "Tiendas en línea, intranets y sistemas internos, herramientas web y automatizaciones a medida, en Chile y a distancia. Cada servicio, con su caso real.",
    alternates: { canonical: "/servicios" },
};

const trail: BreadcrumbTrail = [
    { name: "Inicio", path: "" },
    { name: "Servicios", path: "/servicios" },
];

/** Los servicios, cada uno con la pregunta que responde. */
export default function Servicios() {
    return (
        <Esqueleto portada>
            <JsonLd schema={[breadcrumbSchema(trail)]} />
            <main id="main-content" className="sm sv">
                <div className="ancho sm-migas"><Breadcrumbs trail={trail} /></div>
                <section id="inicio" className="sv-cab sv-cab-indice" aria-labelledby="sv-titulo">
                    <Vista className="ancho">
                        <h1 id="sv-titulo"><span className="linea-r"><span>Servicios<i>.</i></span></span></h1>
                        <p className="sv-respuesta" data-sube="" style={{ "--i": 1 } as CSSProperties}>
                            Nicoholas Lopetegui, desarrollador full stack en Chile, hace tres cosas a medida, en Chile y a distancia. Cada una tiene su caso real.
                        </p>
                    </Vista>
                </section>
                {/* Al señalar un servicio, la materia dibuja lo que se construye en él. */}
                <section id="sv-lista" className="sv-bloque" data-forma="figuras" data-ancla="#sv-escena" aria-label="Lista de servicios">
                    <Vista className="ancho">
                        <ListaServicios servicios={SERVICIOS.map(({ slug, nombre, pregunta }) => ({ slug, nombre, pregunta }))} />
                    </Vista>
                </section>
            </main>
        </Esqueleto>
    );
}
