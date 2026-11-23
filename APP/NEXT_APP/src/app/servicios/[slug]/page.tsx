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
import { EscenaServicio, type Figura } from "@/modules/servicios/Escena";
import { Marcador } from "@/modules/servicios/Marcador";
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
    const figura = SERVICIOS.indexOf(s) as Figura;
    const otros = SERVICIOS.filter((x) => x.slug !== s.slug);
    return (
        <Esqueleto portada>
            <JsonLd schema={[serviceSchema(s), faqSchema(s.faq), breadcrumbSchema(trail)]} />
            <main id="main-content" className="sm sv">
                <div className="ancho sm-migas"><Breadcrumbs trail={trail} /></div>

                {/* La pregunta tal como se la hacen a un buscador o a una IA, y la respuesta primero, en el HTML del servidor. */}
                <section id="inicio" className="sv-cab" data-forma="figuras" data-ancla="#sv-escena" aria-labelledby="sv-titulo">
                    <Vista className="ancho sv-cab-rejilla">
                        <div>
                            <p className="sv-consulta" data-sube="">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                                <span>{s.pregunta}</span>
                            </p>
                            <h1 id="sv-titulo"><span className="linea-r"><span>{s.titulo}</span></span></h1>
                            <p className="sv-respuesta" data-sube="" style={{ "--i": 1 } as CSSProperties}>{s.respuesta}</p>
                            <p className="sv-acciones" data-sube="" style={{ "--i": 2 } as CSSProperties}>
                                <a className="boton lleno" href="/#contacto">Cuéntame qué necesitas</a>
                                <a className="boton linea" href="#sv-caso">Ver el caso real</a>
                            </p>
                        </div>
                        <EscenaServicio figura={figura} />
                    </Vista>
                </section>

                <section className="sv-bloque" data-forma="marco" aria-labelledby="sv-incluye">
                    <Vista className="ancho sv-dos">
                        <h2 id="sv-incluye"><span className="linea-r"><span>Qué incluye</span></span></h2>
                        <ul className="sv-incluye" data-sube="">{s.incluye.map((x) => <li key={x}>{x}</li>)}</ul>
                    </Vista>
                </section>

                <section className="sv-bloque" data-forma="marco" aria-labelledby="sv-conviene">
                    <Vista className="ancho">
                        <h2 id="sv-conviene"><span className="linea-r"><span>¿Te conviene?</span></span></h2>
                        <div className="sv-balanza" data-sube="">
                            <div className="sv-si">
                                <h3>Sí, si…</h3>
                                <ul>{s.conviene.map((x) => <li key={x}>{x}</li>)}</ul>
                            </div>
                            <div className="sv-no">
                                <h3>Mejor no, si…</h3>
                                <p>{s.noConviene}</p>
                            </div>
                        </div>
                    </Vista>
                </section>

                <section className="sv-bloque" data-forma="marco" aria-labelledby="sv-como">
                    <Vista className="ancho">
                        <h2 id="sv-como"><span className="linea-r"><span>Cómo trabajo</span></span></h2>
                        <ol className="sv-pasos" data-sube="">
                            {PROCESO.map((p, i) => (
                                <li key={p.paso}>
                                    <span className="sv-paso-n" aria-hidden="true">{i + 1}</span>
                                    <h3>{p.paso}</h3>
                                    <p>{p.texto}</p>
                                </li>
                            ))}
                        </ol>
                    </Vista>
                </section>

                <section id="sv-caso" className="sv-bloque sv-caso" data-forma="marco" aria-labelledby="sv-caso-titulo">
                    <Vista className="ancho">
                        <h2 id="sv-caso-titulo"><span className="linea-r"><span>Caso real</span></span></h2>
                        <div className="sv-caso-cuerpo" data-sube="">
                            <div className="sv-caso-texto">
                                <h3>{s.caso.titulo}</h3>
                                <p>{s.caso.texto}</p>
                                {s.caso.enlace ? (s.caso.enlace.startsWith("http")
                                    ? <a className="enlace-ir" href={s.caso.enlace} target="_blank" rel="noopener noreferrer">Visitar {s.caso.enlace.replace("https://", "")}</a>
                                    : <Link className="enlace-ir" href={s.caso.enlace}>Ver las herramientas</Link>) : null}
                            </div>
                            {s.caso.medidas.length ? (
                                <div className="sv-cifras">
                                    <Marcador medidas={s.caso.medidas} />
                                    <p className="sv-fuente">Medido con {MEDICION.herramienta} el {MEDICION.fecha}, una corrida por página. Lighthouse considera bueno de 90 a 100.</p>
                                    <details className="sv-tabla">
                                        <summary>Todas las cifras</summary>
                                        <table>
                                            <caption>Notas de {MEDICION.herramienta}, {MEDICION.fecha}.</caption>
                                            <thead><tr><th scope="col">Página</th>{COLUMNAS.map(([largo, corto]) => <th key={largo} scope="col"><span className="sv-largo">{largo}</span><span className="sv-corto" aria-hidden="true">{corto}</span></th>)}</tr></thead>
                                            <tbody>
                                                {s.caso.medidas.map((m) => (
                                                    <tr key={`${m.pagina}-${m.dispositivo}`}><th scope="row">{m.pagina} <small>{m.dispositivo}</small></th>{[m.rendimiento, m.accesibilidad, m.practicas, m.seo].map((v, i) => <td key={i} data-etiqueta={COLUMNAS[i]![1]}>{v}</td>)}</tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </details>
                                </div>
                            ) : null}
                            {s.otroCaso ? (
                                <div className="sv-caso-texto sv-otro-caso">
                                    <h3>{s.otroCaso.titulo}</h3>
                                    <p>{s.otroCaso.texto}</p>
                                </div>
                            ) : null}
                        </div>
                    </Vista>
                </section>

                <section className="sv-bloque" data-forma="marco" aria-labelledby="sv-preguntas">
                    <Vista className="ancho sv-dos">
                        <h2 id="sv-preguntas"><span className="linea-r"><span>Preguntas frecuentes</span></span></h2>
                        <div className="sv-faq" data-sube="">
                            {s.faq.map((f) => <details key={f.question}><summary>{f.question}</summary><p>{f.answer}</p></details>)}
                        </div>
                    </Vista>
                </section>

                <section className="sv-bloque" data-forma="marco" aria-labelledby="sv-otros">
                    <Vista className="ancho">
                        <h2 id="sv-otros"><span className="linea-r"><span>También hago</span></span></h2>
                        <ul className="sv-filas sv-filas-otros" data-sube="">
                            {otros.map((x) => (
                                <li key={x.slug}>
                                    <Link href={`/servicios/${x.slug}`}>
                                        <span className="sv-fila-nombre">{x.nombre}</span>
                                        <span className="sv-fila-pregunta">{x.pregunta}</span>
                                        <svg className="sv-fila-ir" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Vista>
                </section>

                <section id="contacto" className="sm-contacto sv-contacto" data-forma="anillo" data-ancla="#ancla-anillo" aria-labelledby="sv-contacto">
                    <Vista className="ancho" id="ancla-anillo">
                        <h2 id="sv-contacto"><span className="linea-r"><span>Conversemos<i>.</i></span></span></h2>
                        <p data-sube="" style={{ "--i": 1 } as CSSProperties}>Cuéntame qué necesitas y te llega una propuesta escrita, con el alcance, el monto y los plazos.</p>
                        <div className="sm-redes" data-sube="" style={{ "--i": 2 } as CSSProperties}>
                            <a className="boton lleno" href="/#contacto">Escribirme</a>
                            <a className="enlace-ir" href="mailto:contacto@nicoholas.dev">contacto@nicoholas.dev</a>
                        </div>
                    </Vista>
                </section>
            </main>
        </Esqueleto>
    );
}
