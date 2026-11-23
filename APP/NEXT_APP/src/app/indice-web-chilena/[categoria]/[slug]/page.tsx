import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Esqueleto } from "@/modules/esqueleto/Esqueleto";
import { Vista } from "@/modules/landing/viva/Vista";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, type BreadcrumbTrail } from "@/lib/seo/schemas";
import { SITE_URL } from "@/lib/seo/metadata";
import { EDICION, RUTA, categoriaPorId, categoriaPorRuta, fechaCorta, medidos, nombreEdicion, peso, ranking, resumen, segundos, sitioPorSlug, sitiosDe } from "@/lib/indice/datos";
import { CONTROLES, puntajeRevision } from "@/lib/indice/revision";
import { Anillos } from "@/modules/servicios/Anillos";
import "@/modules/sobre-mi/sobre-mi.css";
import "@/modules/servicios/servicios.css";
import "@/modules/indice/indice.css";

type Props = { params: Promise<{ categoria: string; slug: string }> };

export function generateStaticParams() {
    return EDICION.sitios.map((s) => ({ categoria: categoriaPorId(s.categoria)!.ruta, slug: s.slug }));
}
export const dynamicParams = false;

async function leer(params: Props["params"]) {
    const { categoria, slug } = await params;
    const c = categoriaPorRuta(categoria), s = sitioPorSlug(slug);
    return c && s && s.categoria === c.id ? { c, s } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const x = await leer(params);
    if (!x) return {};
    const { c, s } = x;
    const titulo = s.url ? `${s.nombre}: nota de su sitio web | Índice Web Chilena` : `${s.nombre} en el Índice de la Web Chilena`;
    const desc = s.estado === "medido"
        ? `Cómo está el sitio de ${s.nombre} (${s.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}): rendimiento ${s.notas.rendimiento}, accesibilidad ${s.notas.accesibilidad}, buenas prácticas ${s.notas.practicas} y SEO ${s.notas.seo}, y sus controles de seguridad.`
        : `${s.url ? `El sitio de ${s.nombre}` : s.nombre} no tiene nota en el Índice de la Web Chilena (${nombreEdicion(EDICION.edicion)}): ${s.motivo}.`;
    return { title: { absolute: titulo }, description: desc, alternates: { canonical: `${RUTA}/${c.ruta}/${s.slug}` } };
}

export default async function SitioIndice({ params }: Props) {
    const x = await leer(params);
    if (!x) notFound();
    const { c, s } = x;
    const grupo = sitiosDe(c.id), rk = ranking(medidos(grupo)), r = resumen(grupo);
    const fila = rk.find((f) => f.sitio.slug === s.slug);
    const vecinos = s.region ? grupo.filter((o) => o.region === s.region && o.slug !== s.slug).slice(0, 8) : [];
    const ruta = `${RUTA}/${c.ruta}/${s.slug}`;
    const trail: BreadcrumbTrail = [{ name: "Inicio", path: "" }, { name: "Índice de la Web Chilena", path: RUTA }, { name: c.plural, path: `${RUTA}/${c.ruta}` }, { name: s.nombre, path: ruta }];
    const dominio = s.url?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "";
    const pagina = {
        "@context": "https://schema.org", "@type": "WebPage", url: `${SITE_URL}${ruta}`, name: `${s.nombre} en el Índice de la Web Chilena`,
        isPartOf: { "@type": "Dataset", name: `Índice de la Web Chilena, ${nombreEdicion(EDICION.edicion)}`, url: `${SITE_URL}${RUTA}` },
        about: { "@type": c.id === "universidad" ? "CollegeOrUniversity" : "GovernmentOrganization", name: s.nombre, ...(s.url ? { url: s.url } : {}) },
    };
    return (
        <Esqueleto portada>
            <JsonLd schema={[pagina, breadcrumbSchema(trail)]} />
            <main id="main-content" className="sm sv ix">
                <div className="ancho sm-migas"><Breadcrumbs trail={trail} /></div>
                <section id="inicio" className="ix-cab ix-cab-chica" aria-labelledby="ix-titulo">
                    <Vista className="ancho">
                        <p className="ix-edicion" data-sube="">Índice de la Web Chilena, {nombreEdicion(EDICION.edicion)}</p>
                        <h1 id="ix-titulo"><span className="linea-r"><span>{s.nombre}</span></span></h1>
                        {s.estado === "medido" && fila ? (
                            <p className="ix-respuesta" data-sube="" style={{ "--i": 1 } as CSSProperties}>
                                El sitio de {s.nombre} (<a href={s.url} rel="noopener nofollow" target="_blank">{dominio}</a>) tiene nota {fila.nota} de 100 en celular: puesto {fila.puesto} de {rk.length} entre {c.articulo}.
                                {" "}La mediana de {c.articulo} es {r.mediana.nota}. {fila.controles !== null ? `Cumple ${fila.controles} de los doce controles de seguridad y de lo básico.` : ""}
                            </p>
                        ) : (
                            <p className="ix-respuesta" data-sube="" style={{ "--i": 1 } as CSSProperties}>
                                {s.url ? <>El sitio de {s.nombre} (<a href={s.url} rel="noopener nofollow" target="_blank">{dominio}</a>)</> : s.nombre} no tiene nota en esta edición: {s.estado === "medido" ? "no se pudo medir" : s.motivo}{s.fecha ? ` (revisado el ${fechaCorta(s.fecha)})` : ""}.
                            </p>
                        )}
                    </Vista>
                </section>

                {s.estado === "medido" && (
                    <>
                        <section className="ix-bloque" data-forma="marco" aria-labelledby="ix-notas">
                            <Vista className="ancho">
                                <h2 id="ix-notas"><span className="linea-r"><span>Notas de Lighthouse</span></span></h2>
                                <div className="ix-notas" data-sube="">
                                    <Anillos notas={s.notas} contexto="en celular" />
                                    <p className="sv-fuente">Medido el {fechaCorta(s.fecha)} con Lighthouse {EDICION.lighthouse}, emulando un celular, una corrida. Lighthouse considera bueno de 90 a 100.</p>
                                </div>
                                <dl className="ix-metricas" data-sube="">
                                    <div><dt>Lo principal se ve a los</dt><dd>{segundos(s.lcp)}<small>Mediana de {c.articulo}: {segundos(r.mediana.lcp)}</small></dd></div>
                                    <div><dt>Tiempo bloqueado</dt><dd>{s.tbt === null ? "—" : `${s.tbt.toLocaleString("es-CL")} ms`}<small>Lo que la página no responde mientras carga</small></dd></div>
                                    <div><dt>Saltos de diseño</dt><dd>{s.cls === null ? "—" : s.cls.toLocaleString("es-CL")}<small>Bueno: 0,1 o menos</small></dd></div>
                                    <div><dt>Peso de la portada</dt><dd>{peso(s.peso)}<small>Mediana de {c.articulo}: {peso(r.mediana.peso)}</small></dd></div>
                                    <div><dt>Archivos que descarga</dt><dd>{s.pedidos ?? "—"}<small>Al abrir la portada</small></dd></div>
                                </dl>
                            </Vista>
                        </section>

                        {s.revision && (
                            <section className="ix-bloque" data-forma="marco" aria-labelledby="ix-ctl">
                                <Vista className="ancho ix-dos">
                                    <div>
                                        <h2 id="ix-ctl"><span className="linea-r"><span>Doce controles</span></span></h2>
                                        <p className="ix-nota">Cumple {puntajeRevision(s.revision)} de 12. Revisado en lo que entrega el servidor, sin ejecutar JavaScript.</p>
                                    </div>
                                    <ul className="ix-controles" data-sube="">
                                        {CONTROLES.map((k) => {
                                            const ok = s.revision![k.id];
                                            return (
                                                <li key={k.id} data-ok={ok ? "si" : "no"}>
                                                    <span className="ix-marca" aria-hidden="true" />
                                                    <div>
                                                        <p><b>{k.nombre}</b> <span className="ix-estado">{ok ? "Cumple" : "No cumple"}</span></p>
                                                        {!ok && <p className="ix-arreglo">{k.porQue} {k.arreglo}</p>}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </Vista>
                            </section>
                        )}

                        <section className="ix-bloque" data-forma="marco" aria-labelledby="ix-a11y">
                            <Vista className="ancho ix-dos">
                                <div>
                                    <h2 id="ix-a11y"><span className="linea-r"><span>Accesibilidad</span></span></h2>
                                    <p className="ix-nota">{s.a11y.length ? `Las ${s.a11y.length === 1 ? "falla" : `${s.a11y.length} fallas`} que encontró Lighthouse en la portada. Una revisión automática no ve todo: sirve para empezar, no para certificar.` : "Lighthouse no encontró fallas automáticas en la portada. Una revisión automática no ve todo: no reemplaza probar con personas y lectores de pantalla."}</p>
                                </div>
                                {s.a11y.length > 0 && (
                                    <ul className="ix-fallas" data-sube="">
                                        {s.a11y.map(([id, titulo, n]) => <li key={id}><span>{titulo.replace(/`/g, "")}</span>{n > 0 && <small>{n} elemento{n === 1 ? "" : "s"}</small>}</li>)}
                                    </ul>
                                )}
                            </Vista>
                        </section>
                    </>
                )}

                <section className="ix-bloque" data-forma="marco" aria-labelledby="ix-mas">
                    <Vista className="ancho ix-dos">
                        <div>
                            <h2 id="ix-mas"><span className="linea-r"><span>Más del índice</span></span></h2>
                            <p className="ix-enlaces">
                                <Link className="enlace-ir" href={`${RUTA}/${c.ruta}`}>Ranking de {c.articulo}</Link>
                                <Link className="enlace-ir" href={`${RUTA}/revisa-tu-sitio`}>Revisa otro sitio</Link>
                                <Link className="enlace-ir" href={`${RUTA}/metodologia`}>Cómo se midió</Link>
                            </p>
                        </div>
                        {vecinos.length > 0 && (
                            <div data-sube="">
                                <h3 className="ix-vecinos-titulo">En la región de {s.region}</h3>
                                <ul className="ix-vecinos">{vecinos.map((v) => <li key={v.slug}><Link href={`${RUTA}/${c.ruta}/${v.slug}`}>{v.nombre}</Link></li>)}</ul>
                            </div>
                        )}
                    </Vista>
                </section>

                {/* Sin sitio (universidades en cierre) no hay nada que ofrecer arreglar. */}
                {s.url && <section id="contacto" className="sm-contacto ix-contacto" data-forma="anillo" data-ancla="#ancla-anillo" aria-labelledby="ix-contacto">
                    <Vista className="ancho" id="ancla-anillo">
                        <h2 id="ix-contacto"><span className="linea-r"><span>¿Trabajas aquí?</span></span></h2>
                        <p data-sube="" style={{ "--i": 1 } as CSSProperties}>Te explico qué arreglar primero en este sitio y te mando una propuesta escrita para hacerlo.</p>
                        <div className="sm-redes" data-sube="" style={{ "--i": 2 } as CSSProperties}>
                            <a className="boton lleno" href="/#contacto">Escribirme</a>
                            <Link className="enlace-ir" href="/servicios">Ver los servicios</Link>
                        </div>
                    </Vista>
                </section>}
            </main>
        </Esqueleto>
    );
}
