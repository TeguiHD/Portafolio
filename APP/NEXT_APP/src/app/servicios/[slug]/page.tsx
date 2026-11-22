import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Esqueleto } from "@/modules/esqueleto/Esqueleto";
import { Vista } from "@/modules/landing/viva/Vista";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, faqSchema, serviceSchema, type BreadcrumbTrail } from "@/lib/seo/schemas";
import { MEDICION, PROCESO, SERVICIOS, getServicio } from "@/lib/servicios";
import "@/modules/sobre-mi/sobre-mi.css";
import "@/modules/servicios/servicios.css";

/**
 * Una página por servicio (jugada 3 del informe GEO): la pregunta exacta respondida en el primer párrafo, lo que incluye,
 * cuándo conviene y cuándo no, cómo se trabaja, el caso real con cifras medidas y las preguntas frecuentes.
 * Todo sale de src/lib/servicios.ts; nada de precios ni plazos hasta que el titular los entregue.
 */
type Props = { params: Promise<{ slug: string }> };
/** En el celular los encabezados van abreviados (la tabla cabe sin deslizar); el lector de pantalla lee el nombre entero. */
const COLUMNAS = [["Rendimiento", "Rend."], ["Accesibilidad", "Acces."], ["Buenas prácticas", "Práct."], ["SEO", "SEO"]] as const;

export function generateStaticParams() {
    return SERVICIOS.map((s) => ({ slug: s.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const s = getServicio((await params).slug);
    if (!s) return {};
    return {
        title: { absolute: s.seo.title },
        description: s.seo.description,
        alternates: { canonical: `/servicios/${s.slug}` },
        openGraph: { title: s.seo.title, description: s.seo.description, url: `/servicios/${s.slug}`, type: "website" },
    };
}

export default async function PaginaServicio({ params }: Props) {
    const s = getServicio((await params).slug);
    if (!s) notFound();
    const trail: BreadcrumbTrail = [
        { name: "Inicio", path: "" },
        { name: "Servicios", path: "/servicios" },
        { name: s.nombre, path: `/servicios/${s.slug}` },
    ];
    return (
        <Esqueleto portada>
            <JsonLd schema={[serviceSchema(s), faqSchema(s.faq), breadcrumbSchema(trail)]} />
            <main id="main-content" className="sm sv">
                <div className="ancho sm-migas"><Breadcrumbs trail={trail} /></div>

                <section id="inicio" className="sm-cab sv-cab" aria-labelledby="sv-titulo">
                    <Vista className="ancho">
                        <p className="sv-pregunta" data-sube="">{s.pregunta}</p>
                        <h1 id="sv-titulo"><span className="linea-r"><span>{s.titulo}</span></span></h1>
                        {/* La respuesta va primero y en el HTML del servidor: es lo que leen y repiten las IA. */}
                        <p className="sv-respuesta" data-sube="" style={{ "--i": 1 } as CSSProperties}>{s.respuesta}</p>
                        <p className="sv-acciones" data-sube="" style={{ "--i": 2 } as CSSProperties}>
                            <a className="boton lleno" href="/#contacto">Cuéntame qué necesitas</a>
                        </p>
                    </Vista>
                </section>

                <section className="plano sv-bloque" data-forma="marco" aria-labelledby="sv-incluye">
                    <Vista className="ancho">
                        <h2 id="sv-incluye"><span className="linea-r"><span>Qué incluye</span></span></h2>
                        <ul className="sv-lista" data-sube="">{s.incluye.map((x) => <li key={x}>{x}</li>)}</ul>
                    </Vista>
                </section>

                <section className="plano sv-bloque" data-forma="marco" aria-labelledby="sv-conviene">
                    <Vista className="ancho">
                        <h2 id="sv-conviene"><span className="linea-r"><span>Cuándo conviene</span></span></h2>
                        <ul className="sv-lista" data-sube="">{s.conviene.map((x) => <li key={x}>{x}</li>)}</ul>
                        <p className="sv-no" data-sube=""><strong>Cuándo no:</strong> {s.noConviene}</p>
                    </Vista>
                </section>

                <section className="plano sv-bloque" data-forma="marco" aria-labelledby="sv-como">
                    <Vista className="ancho">
                        <h2 id="sv-como"><span className="linea-r"><span>Cómo trabajo</span></span></h2>
                        <ol className="sm-anios" data-sube="">
                            {PROCESO.map((p, i) => <li key={p.paso}><span className="sm-anio">{i + 1}</span><span><b>{p.paso}.</b> <span className="sv-paso">{p.texto}</span></span></li>)}
                        </ol>
                    </Vista>
                </section>

                <section className="plano sv-bloque" data-forma="marco" aria-labelledby="sv-caso">
                    <Vista className="ancho">
                        <h2 id="sv-caso"><span className="linea-r"><span>Caso real</span></span></h2>
                        <div className="sm-proyectos" data-sube="">
                            <article>
                                <h3>{s.caso.titulo}</h3>
                                <p>{s.caso.texto}</p>
                                {s.caso.medidas.length ? (
                                    <div className="sv-tabla">
                                        <table>
                                            <caption>Medido con {MEDICION.herramienta} el {MEDICION.fecha} (una corrida por página).</caption>
                                            <thead><tr><th scope="col">Página</th>{COLUMNAS.map(([largo, corto]) => <th key={largo} scope="col"><span className="sv-largo">{largo}</span><span className="sv-corto" aria-hidden="true">{corto}</span></th>)}</tr></thead>
                                            <tbody>
                                                {s.caso.medidas.map((m) => (
                                                    <tr key={`${m.pagina}-${m.dispositivo}`}><th scope="row">{m.pagina} <small>{m.dispositivo}</small></th>{[m.rendimiento, m.accesibilidad, m.practicas, m.seo].map((v, i) => <td key={i} data-etiqueta={COLUMNAS[i]![1]}>{v}</td>)}</tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : null}
                                {s.caso.enlace ? (s.caso.enlace.startsWith("http")
                                    ? <a className="enlace-ir" href={s.caso.enlace} target="_blank" rel="noopener noreferrer">{s.caso.enlace.replace("https://", "")} ↗</a>
                                    : <Link className="enlace-ir" href={s.caso.enlace}>Verlas →</Link>) : null}
                            </article>
                            {s.otroCaso ? (
                                <article>
                                    <h3>{s.otroCaso.titulo}</h3>
                                    <p>{s.otroCaso.texto}</p>
                                </article>
                            ) : null}
                        </div>
                    </Vista>
                </section>

                <section className="plano sv-bloque" data-forma="marco" aria-labelledby="sv-preguntas">
                    <Vista className="ancho">
                        <h2 id="sv-preguntas"><span className="linea-r"><span>Preguntas frecuentes</span></span></h2>
                        <div className="sv-faq" data-sube="">
                            {s.faq.map((f) => <details key={f.question}><summary>{f.question}</summary><p>{f.answer}</p></details>)}
                        </div>
                    </Vista>
                </section>

                <section id="contacto" className="sm-contacto" data-forma="anillo" data-ancla="#ancla-anillo" aria-labelledby="sv-contacto">
                    <Vista className="ancho centro" id="ancla-anillo">
                        <h2 id="sv-contacto"><span className="linea-r"><span>Conversemos<i>.</i></span></span></h2>
                        <p data-sube="" style={{ "--i": 1 } as CSSProperties}>Cuéntame qué necesitas y te llega una propuesta escrita, con el alcance, el monto y los plazos.</p>
                        <div className="sm-redes" data-sube="" style={{ "--i": 2 } as CSSProperties}>
                            <a className="boton lleno" href="/#contacto">Escribirme</a>
                            <a className="enlace-ir" href="mailto:contacto@nicoholas.dev">contacto@nicoholas.dev</a>
                        </div>
                        <p className="sv-otros" data-sube="" style={{ "--i": 3 } as CSSProperties}>
                            También: {SERVICIOS.filter((x) => x.slug !== s.slug).map((x, i) => <span key={x.slug}>{i ? " · " : ""}<Link href={`/servicios/${x.slug}`}>{x.nombre}</Link></span>)}
                        </p>
                    </Vista>
                </section>
            </main>
        </Esqueleto>
    );
}
