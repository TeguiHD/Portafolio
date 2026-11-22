import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Esqueleto } from "@/modules/esqueleto/Esqueleto";
import { Vista } from "@/modules/landing/viva/Vista";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, type BreadcrumbTrail } from "@/lib/seo/schemas";
import { SERVICIOS } from "@/lib/servicios";
import "@/modules/sobre-mi/sobre-mi.css";
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
                <section id="inicio" className="sm-cab sv-cab" aria-labelledby="sv-titulo">
                    <Vista className="ancho">
                        <h1 id="sv-titulo"><span className="linea-r"><span>Servicios<i>.</i></span></span></h1>
                        <p className="sv-respuesta" data-sube="" style={{ "--i": 1 } as CSSProperties}>
                            Nicoholas Lopetegui, desarrollador full stack en Chile, hace tres cosas a medida, en Chile y a distancia. Cada una tiene su caso real.
                        </p>
                    </Vista>
                </section>
                <section className="plano sv-bloque" data-forma="marco" aria-label="Lista de servicios">
                    <Vista className="ancho">
                        <ul className="sv-servicios" data-sube="">
                            {SERVICIOS.map((s) => (
                                <li key={s.slug}>
                                    <h2><Link href={`/servicios/${s.slug}`}>{s.nombre}</Link></h2>
                                    <p>{s.pregunta}</p>
                                </li>
                            ))}
                        </ul>
                    </Vista>
                </section>
            </main>
        </Esqueleto>
    );
}
