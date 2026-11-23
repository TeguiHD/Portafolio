import type { Metadata } from "next";
import Link from "next/link";
import { Esqueleto } from "@/modules/esqueleto/Esqueleto";
import { Vista } from "@/modules/landing/viva/Vista";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, faqSchema, type BreadcrumbTrail } from "@/lib/seo/schemas";
import { CATEGORIAS, EDICION, RUTA, periodoMedicion, nombreEdicion, sitiosDe } from "@/lib/indice/datos";
import { CONTROLES } from "@/lib/indice/revision";
import { citaIndice } from "@/lib/indice/textos";
import { Copiar } from "@/modules/indice/Cliente";
import "@/modules/sobre-mi/sobre-mi.css";
import "@/modules/servicios/servicios.css";
import "@/modules/indice/indice.css";

export const metadata: Metadata = {
    title: { absolute: "Metodología del Índice de la Web Chilena | nicoholas.dev" },
    description: "Cómo se mide el Índice de la Web Chilena: qué sitios entran, cómo se usa Lighthouse, qué revisan los doce controles, sus límites y cómo citar o descargar los datos.",
    alternates: { canonical: `${RUTA}/metodologia` },
};

const trail: BreadcrumbTrail = [{ name: "Inicio", path: "" }, { name: "Índice de la Web Chilena", path: RUTA }, { name: "Metodología", path: `${RUTA}/metodologia` }];

const PREGUNTAS = [
    { question: "¿Por qué una sola corrida por sitio?", answer: "Para medir cientos de sitios en pocas horas desde un solo equipo. La nota de rendimiento puede variar algunos puntos entre corridas; las de accesibilidad, buenas prácticas y SEO casi no cambian. Por eso el índice no ordena por diferencias de uno o dos puntos como si fueran definitivas." },
    { question: "¿Por qué solo la portada?", answer: "Es la página que más se visita y la que todos los sitios tienen. Un sitio puede tener la portada bien y el resto mal, o al revés: el índice mide la puerta de entrada, no el sitio completo." },
    { question: "Mi institución arregló su sitio, ¿cuándo se actualiza?", answer: "En la próxima edición, que se mide igual para todos. Mientras tanto, con «Revisa tu sitio» puedes ver al tiro los doce controles con la misma revisión que usa el índice." },
    { question: "¿Encontraste un error en los datos?", answer: "Escríbeme a contacto@nicoholas.dev con el nombre de la institución y lo que viste. Si la dirección del sitio está mal o el resultado no corresponde, se corrige y se deja anotado." },
];

export default function Metodologia() {
    return (
        <Esqueleto portada>
            <JsonLd schema={[faqSchema(PREGUNTAS), breadcrumbSchema(trail)]} />
            <main id="main-content" className="sm sv ix">
                <div className="ancho sm-migas"><Breadcrumbs trail={trail} /></div>
                <section id="inicio" className="ix-cab ix-cab-chica" aria-labelledby="ix-titulo">
                    <Vista className="ancho">
                        <p className="ix-edicion" data-sube="">Índice de la Web Chilena, {nombreEdicion(EDICION.edicion)}</p>
                        <h1 id="ix-titulo"><span className="linea-r"><span>Cómo se midió</span></span></h1>
                        <p className="ix-respuesta" data-sube="">
                            Cada sitio se midió una vez, {periodoMedicion()}, con Lighthouse {EDICION.lighthouse} emulando un celular
                            (la misma configuración de PageSpeed Insights) y con doce controles propios sobre lo que entrega el servidor. Todo el código del medidor es público.
                        </p>
                    </Vista>
                </section>

                <section className="ix-bloque" data-forma="marco" aria-labelledby="ix-quienes">
                    <Vista className="ancho ix-dos">
                        <h2 id="ix-quienes"><span className="linea-r"><span>Qué sitios entran</span></span></h2>
                        <div className="ix-texto-largo" data-sube="">
                            <p>Todas las instituciones de cuatro grupos, sin elegir: {CATEGORIAS.map((c) => `${sitiosDe(c.id).length} ${c.plural.toLowerCase()}`).join(", ").replace(/, ([^,]*)$/, " y $1")}. La lista de sitios oficiales se armó con Wikidata y las listas oficiales de cada grupo, y cada dirección se comprobó abriéndola.</p>
                            <p>Se mide la portada, en la dirección final después de las redirecciones. Un sitio que no cargó en dos intentos queda en la lista como «sin respuesta», sin nota: también es un dato.</p>
                        </div>
                    </Vista>
                </section>

                <section className="ix-bloque" data-forma="marco" aria-labelledby="ix-lh">
                    <Vista className="ancho ix-dos">
                        <h2 id="ix-lh"><span className="linea-r"><span>Lighthouse</span></span></h2>
                        <div className="ix-texto-largo" data-sube="">
                            <p>Lighthouse es la herramienta de Google que está detrás de PageSpeed Insights. Da cuatro notas de 0 a 100: rendimiento (qué tan rápido se ve y responde), accesibilidad (revisión automática de problemas para personas con discapacidad), buenas prácticas y SEO. Considera bueno de 90 a 100.</p>
                            <p>La nota del índice es el promedio simple de esas cuatro. El ranking ordena por esa nota; si dos sitios empatan, va primero el que cumple más controles. Los empates completos comparten puesto.</p>
                            <p>Las mediciones se hicieron de a una, desde una conexión en Chile, con la emulación de celular y la red simulada que trae Lighthouse por defecto.</p>
                        </div>
                    </Vista>
                </section>

                <section className="ix-bloque" data-forma="marco" aria-labelledby="ix-doce">
                    <Vista className="ancho ix-dos">
                        <h2 id="ix-doce"><span className="linea-r"><span>Los doce controles</span></span></h2>
                        <dl className="ix-definiciones" data-sube="">
                            {CONTROLES.map((c) => <div key={c.id}><dt>{c.nombre}</dt><dd>{c.porQue}</dd></div>)}
                        </dl>
                    </Vista>
                </section>

                <section className="ix-bloque" data-forma="marco" aria-labelledby="ix-limites">
                    <Vista className="ancho ix-dos">
                        <h2 id="ix-limites"><span className="linea-r"><span>Límites</span></span></h2>
                        <div className="sv-faq" data-sube="">
                            {PREGUNTAS.map((p) => <details key={p.question}><summary>{p.question}</summary><p>{p.answer}</p></details>)}
                        </div>
                    </Vista>
                </section>

                <section className="ix-bloque" data-forma="marco" aria-labelledby="ix-usar">
                    <Vista className="ancho ix-dos">
                        <h2 id="ix-usar"><span className="linea-r"><span>Usar los datos</span></span></h2>
                        <div data-sube="">
                            <p className="ix-enlaces">
                                <a className="enlace-ir" href={`${RUTA}/datos/${EDICION.edicion}.csv`} download>Descargar CSV</a>
                                <a className="enlace-ir" href={`${RUTA}/datos/${EDICION.edicion}.json`} download>Descargar JSON</a>
                                <a className="enlace-ir" href="https://github.com/TeguiHD/Portafolio/tree/ui/portada/APP/NEXT_APP/scripts/indice" rel="noopener" target="_blank">Código del medidor</a>
                            </p>
                            <div className="ix-cita">
                                <h3>Cita este estudio</h3>
                                <p>{citaIndice()}</p>
                                <Copiar texto={citaIndice()} />
                                <p className="ix-licencia">Licencia <a href="https://creativecommons.org/licenses/by/4.0/deed.es" rel="license noopener" target="_blank">CC BY 4.0</a>: puedes reusar y publicar los datos nombrando la fuente.</p>
                            </div>
                            <p className="ix-nota"><Link href={RUTA}>Volver al índice</Link></p>
                        </div>
                    </Vista>
                </section>
            </main>
        </Esqueleto>
    );
}
