import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Esqueleto } from "@/modules/esqueleto/Esqueleto";
import { Vista } from "@/modules/landing/viva/Vista";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, type BreadcrumbTrail } from "@/lib/seo/schemas";
import { CATEGORIAS, EDICION, EDICIONES, RUTA, cumplimiento, distribucion, medidos, nombreEdicion, notaSitio, peso, pct, ranking, resumen, sitiosDe, periodoMedicion, urlDatos } from "@/lib/indice/datos";
import { conjuntoDatosSchema, citaIndice, hallazgos } from "@/lib/indice/textos";
import { DIMENSIONES, cumplimientoDimension } from "@/lib/indice/textos-dimensiones";
import { Buscador, Copiar, TextoMateria } from "@/modules/indice/Cliente";
import { BarrasCumplimiento, Histograma } from "@/modules/indice/Graficos";
import "@/modules/sobre-mi/sobre-mi.css";
import "@/modules/indice/indice.css";

export const metadata: Metadata = {
    title: { absolute: "Índice de la Web Chilena: sitios públicos medidos | nicoholas.dev" },
    description: "Los sitios de más de 800 instituciones públicas y universidades de Chile, medidos uno por uno en siete dimensiones: velocidad, buscadores, IA, seguridad, correo, privacidad y directorios.",
    alternates: { canonical: RUTA },
};

const trail: BreadcrumbTrail = [{ name: "Inicio", path: "" }, { name: "Índice de la Web Chilena", path: RUTA }];

export default function IndiceWebChilena() {
    const todos = EDICION.sitios, m = medidos(todos), r = resumen(todos), h = hallazgos(todos);
    const conDim = m.some((s) => s.dim);
    const entradas = todos.map((s) => {
        const c = CATEGORIAS.find((x) => x.id === s.categoria)!;
        return { slug: s.slug, nombre: s.nombre, ruta: `${RUTA}/${c.ruta}/${s.slug}`, categoria: c.singular, nota: s.estado === "medido" ? notaSitio(s) : null };
    });
    return (
        <Esqueleto portada>
            <JsonLd schema={[conjuntoDatosSchema(), breadcrumbSchema(trail)]} />
            <main id="main-content" className="sm ix">
                <div className="ancho sm-migas"><Breadcrumbs trail={trail} /></div>

                {/* La materia escribe la cifra más fuerte; la frase completa va en el HTML, primero. */}
                <section id="inicio" className="ix-cab" data-forma="texto" data-ancla="#ix-texto" aria-labelledby="ix-titulo">
                    <Vista className="ancho ix-cab-rejilla">
                        <div>
                            <p className="ix-edicion" data-sube="">Edición de {nombreEdicion(EDICION.edicion)}</p>
                            <h1 id="ix-titulo"><span className="linea-r"><span>Índice de la Web Chilena</span></span></h1>
                            <p className="ix-respuesta" data-sube="" style={{ "--i": 1 } as CSSProperties}>
                                {conDim ? <>Medí uno por uno los sitios de {r.total} instituciones de Chile, entre municipalidades, servicios locales de educación, hospitales, servicios públicos,
                                ministerios, delegaciones presidenciales, gobiernos regionales y universidades, en siete dimensiones: velocidad, buscadores, IA, seguridad, correo, privacidad y directorios.
                                Y le pregunté a Claude por el sitio oficial de cada una. {h.principal.frase}</> : <>Medí uno por uno los sitios de {r.total} instituciones de Chile, entre municipalidades, ministerios, gobiernos regionales y universidades: velocidad,
                                accesibilidad y buenas prácticas con Lighthouse, y doce controles de seguridad y de lo básico. {h.principal.frase}</>}
                            </p>
                        </div>
                        <div className="ix-cifra" data-sube="" style={{ "--i": 2 } as CSSProperties}>
                            <TextoMateria texto={h.principal.cifra} />
                            <p className="ix-cifra-texto"><strong>{h.principal.cifra}</strong> {h.principal.leyenda}</p>
                        </div>
                    </Vista>
                </section>

                <section className="ix-bloque" data-forma="marco" aria-labelledby="ix-hallazgos">
                    <Vista className="ancho">
                        <h2 id="ix-hallazgos"><span className="linea-r"><span>Lo que encontré</span></span></h2>
                        <ul className="ix-hallazgos" data-sube="">
                            {h.lista.map((x) => <li key={x.cifra + x.texto}><b>{x.cifra}</b><span>{x.texto}</span></li>)}
                        </ul>
                        <Buscador entradas={entradas} />
                    </Vista>
                </section>

                <section className="ix-bloque" data-forma="marco" aria-labelledby="ix-categorias">
                    <Vista className="ancho">
                        <h2 id="ix-categorias"><span className="linea-r"><span>Por tipo de institución</span></span></h2>
                        <p className="ix-nota">{conDim ? "La nota es el promedio de las dimensiones medidas de cada sitio, de 0 a 100." : "La nota del índice es el promedio de las cuatro notas de Lighthouse en celular (rendimiento, accesibilidad, buenas prácticas y SEO), de 0 a 100."}</p>
                        <div className="ix-categorias" data-sube="">
                            {CATEGORIAS.map((c) => {
                                const sitios = sitiosDe(c.id), rc = resumen(sitios), rk = ranking(medidos(sitios));
                                if (!sitios.length) return null;
                                return (
                                    <article key={c.id} className="ix-categoria">
                                        <h3><Link href={`${RUTA}/${c.ruta}`}>{c.plural}</Link></h3>
                                        <p className="ix-categoria-dato">{rc.medidos} medidos{rc.sinRespuesta ? `, ${rc.sinRespuesta} sin nota` : ""}. Nota mediana: <b>{rc.mediana.nota ?? "—"}</b>.</p>
                                        <Histograma tramos={distribucion(medidos(sitios))} titulo={`Cuántos sitios de ${c.articulo} hay en cada tramo de nota`} />
                                        <div className="ix-podio">
                                            <div>
                                                <h4>Más altas</h4>
                                                <ol>{rk.slice(0, 3).map((x) => <li key={x.sitio.slug}><Link href={`${RUTA}/${c.ruta}/${x.sitio.slug}`}>{x.sitio.nombre}</Link> <b>{x.nota}</b></li>)}</ol>
                                            </div>
                                            <div>
                                                <h4>Más bajas</h4>
                                                <ol>{rk.slice(-3).reverse().map((x) => <li key={x.sitio.slug}><Link href={`${RUTA}/${c.ruta}/${x.sitio.slug}`}>{x.sitio.nombre}</Link> <b>{x.nota}</b></li>)}</ol>
                                            </div>
                                        </div>
                                        <Link className="enlace-ir" href={`${RUTA}/${c.ruta}`}>Ver {c.articulo.split(" ")[0]} {sitios.length} {c.plural.toLowerCase()}</Link>
                                    </article>
                                );
                            })}
                        </div>
                    </Vista>
                </section>

                {conDim && (
                    <section className="ix-bloque" data-forma="marco" aria-labelledby="ix-dimensiones">
                        <Vista className="ancho">
                            <h2 id="ix-dimensiones"><span className="linea-r"><span>Siete dimensiones</span></span></h2>
                            <p className="ix-nota">Cada barra es el porcentaje de los sitios que cumple ese control. Qué mide cada dimensión, por qué importa y de dónde sale la regla, en <Link href={`${RUTA}/metodologia`}>la metodología</Link>.</p>
                            <div className="ix-dims-grupos" data-sube="">
                                {DIMENSIONES.filter((d) => d.id !== "velocidad").map((d) => {
                                    const filas = cumplimientoDimension(m, d.id as Exclude<typeof d.id, "velocidad">);
                                    if (!filas.length) return null;
                                    return (
                                        <div key={d.id} className="ix-dims-grupo">
                                            <h3>{d.nombre}</h3>
                                            <BarrasCumplimiento filas={filas} titulo={`${d.nombre}: porcentaje de los ${filas[0]!.total} sitios medidos que cumple cada control`} />
                                        </div>
                                    );
                                })}
                            </div>
                            <Link className="boton lleno" href={`${RUTA}/revisa-tu-sitio`}>Revisa tu sitio con los doce controles básicos</Link>
                        </Vista>
                    </section>
                )}

                {!conDim && <section className="ix-bloque" data-forma="marco" aria-labelledby="ix-controles">
                    <Vista className="ancho ix-dos">
                        <div>
                            <h2 id="ix-controles"><span className="linea-r"><span>Los doce controles</span></span></h2>
                            <p className="ix-nota">Cabeceras de seguridad y lo básico del HTML, revisados en lo que entrega el servidor sin ejecutar JavaScript: lo mismo que ve un buscador o una IA que no ejecuta código.</p>
                            <Link className="boton lleno" href={`${RUTA}/revisa-tu-sitio`}>Revisa tu sitio con los mismos controles</Link>
                        </div>
                        <div data-sube="">
                            <BarrasCumplimiento filas={cumplimiento(m)} titulo={`Porcentaje de los ${m.filter((s) => s.revision).length} sitios revisados que cumple cada control`} />
                        </div>
                    </Vista>
                </section>}

                <section className="ix-bloque" data-forma="marco" aria-labelledby="ix-datos">
                    <Vista className="ancho ix-dos">
                        <div>
                            <h2 id="ix-datos"><span className="linea-r"><span>Datos y método</span></span></h2>
                            <p className="ix-nota">
                                Medido {periodoMedicion()} con Lighthouse {EDICION.lighthouse}, emulando un celular como lo hace PageSpeed Insights,
                                una corrida por sitio y solo la portada. La mediana del peso de una portada es {peso(r.mediana.peso)}; {pct(r.sobre90.accesibilidad, r.medidos)} % de los sitios pasa 90 en accesibilidad.
                            </p>
                            <p className="ix-enlaces">
                                <Link className="enlace-ir" href={`${RUTA}/metodologia`}>Cómo se midió</Link>
                                <a className="enlace-ir" href={urlDatos("csv")} download>Descargar CSV</a>
                                <a className="enlace-ir" href={urlDatos("json")} download>Descargar JSON</a>
                                {EDICIONES.slice(1).map((e) => <a key={e.edicion} className="enlace-ir" href={urlDatos("csv", e)} download>Edición de {nombreEdicion(e.edicion)} (CSV)</a>)}
                            </p>
                        </div>
                        <div className="ix-cita" data-sube="">
                            <h3>Cita este estudio</h3>
                            <p>{citaIndice()}</p>
                            <Copiar texto={citaIndice()} />
                            <p className="ix-licencia">Los datos se pueden reusar con atribución (licencia <a href="https://creativecommons.org/licenses/by/4.0/deed.es" rel="license noopener" target="_blank">CC BY 4.0</a>).</p>
                        </div>
                    </Vista>
                </section>

                <section id="contacto" className="sm-contacto ix-contacto" data-forma="anillo" data-ancla="#ancla-anillo" aria-labelledby="ix-contacto">
                    <Vista className="ancho" id="ancla-anillo">
                        <h2 id="ix-contacto"><span className="linea-r"><span>¿Es tu institución?</span></span></h2>
                        <p data-sube="" style={{ "--i": 1 } as CSSProperties}>Si trabajas en una de estas instituciones y quieres subir la nota, te explico qué arreglar primero y cuánto cuesta hacerlo.</p>
                        <div className="sm-redes" data-sube="" style={{ "--i": 2 } as CSSProperties}>
                            <a className="boton lleno" href="/#contacto">Escribirme</a>
                            <Link className="enlace-ir" href="/servicios">Ver los servicios</Link>
                        </div>
                    </Vista>
                </section>
            </main>
        </Esqueleto>
    );
}
