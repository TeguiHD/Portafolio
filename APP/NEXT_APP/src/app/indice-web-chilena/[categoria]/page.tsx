import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Esqueleto } from "@/modules/esqueleto/Esqueleto";
import { Vista } from "@/modules/landing/viva/Vista";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, type BreadcrumbTrail } from "@/lib/seo/schemas";
import { CATEGORIAS, EDICION, RUTA, type Sitio, categoriaPorRuta, distribucion, medidos, nombreEdicion, peso, ranking, resumen, sitiosDe } from "@/lib/indice/datos";
import { FiltroTabla, OrdenTabla } from "@/modules/indice/Cliente";
import { notaDimension } from "@/modules/indice/Dimensiones";
import { DIMENSIONES } from "@/lib/indice/textos-dimensiones";
import { Histograma } from "@/modules/indice/Graficos";
import "@/modules/sobre-mi/sobre-mi.css";
import "@/modules/indice/indice.css";

type Props = { params: Promise<{ categoria: string }> };

/** En el ranking de un solo tipo, el nombre sin lo que se repite: «Arica» en vez de «Municipalidad de Arica». */
function corto(s: Sitio): string {
    if (s.categoria === "municipalidad") return s.comuna ?? s.nombre;
    if (s.categoria === "gobierno-regional") return s.nombre.replace(/^Gobierno Regional (de la |de los |de las |del |de )/i, "");
    if (s.categoria === "slep") return s.nombre.replace(/^Servicio Local de Educaci[oó]n P[uú]blica (de |del )?/i, "").replace(/\s*\(SLEP [^)]*\)+$/, "");
    if (s.categoria === "delegacion") return s.nombre.replace(/^Delegaci[oó]n Presidencial /i, "");
    return s.nombre;
}

export function generateStaticParams() {
    return CATEGORIAS.map((c) => ({ categoria: c.ruta }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const c = categoriaPorRuta((await params).categoria);
    if (!c) return {};
    const n = sitiosDe(c.id).length;
    return {
        title: { absolute: `${c.plural} de Chile: ranking de sus sitios web | Índice Web Chilena` },
        description: `${c.femenino ? "Las" : "Los"} ${n} ${c.plural.toLowerCase()} de Chile ${c.femenino ? "ordenadas" : "ordenados"} por la nota de su sitio: velocidad, accesibilidad, buenas prácticas, SEO y doce controles de seguridad. Edición de ${nombreEdicion(EDICION.edicion)}.`,
        alternates: { canonical: `${RUTA}/${c.ruta}` },
    };
}

export default async function Categoria({ params }: Props) {
    const c = categoriaPorRuta((await params).categoria);
    if (!c) notFound();
    const sitios = sitiosDe(c.id), m = medidos(sitios), rk = ranking(m), r = resumen(sitios);
    const sin = sitios.filter((s) => s.estado === "sin-respuesta");
    const trail: BreadcrumbTrail = [{ name: "Inicio", path: "" }, { name: "Índice de la Web Chilena", path: RUTA }, { name: c.plural, path: `${RUTA}/${c.ruta}` }];
    const idTabla = `ix-tabla-${c.ruta}`;
    const conDim = m.some((x) => x.dim);
    // Botones de orden: comando propio hacia la tabla (invocadores; React no conoce aún estos atributos).
    const orden = { commandfor: idTabla, command: "--ordenar" } as Record<string, string>;
    return (
        <Esqueleto portada>
            <JsonLd schema={[breadcrumbSchema(trail)]} />
            <main id="main-content" className="sm ix">
                <div className="ancho sm-migas"><Breadcrumbs trail={trail} /></div>
                <section id="inicio" className="ix-cab ix-cab-chica" aria-labelledby="ix-titulo">
                    <Vista className="ancho">
                        <p className="ix-edicion" data-sube="">Índice de la Web Chilena, {nombreEdicion(EDICION.edicion)}</p>
                        <h1 id="ix-titulo"><span className="linea-r"><span>{c.plural}</span></span></h1>
                        <p className="ix-respuesta" data-sube="">
                            {sitios.length} {c.plural.toLowerCase()} de Chile, {c.femenino ? "ordenadas" : "ordenados"} por la nota de su sitio en celular. La mediana es {r.mediana.nota ?? "—"} de 100;
                            {" "}{r.sobre90.accesibilidad} pasan 90 en accesibilidad y {r.sobre90.rendimiento} en rendimiento.
                        </p>
                    </Vista>
                </section>
                <section className="ix-bloque" data-forma="marco" aria-labelledby="ix-ranking">
                    <Vista className="ancho">
                        <div className="ix-ranking-cab">
                            <h2 id="ix-ranking"><span className="linea-r"><span>Ranking</span></span></h2>
                            <FiltroTabla tabla={idTabla} total={sitios.length} />
                        </div>
                        <div className="ix-tabla-caja" data-sube="" role="region" aria-labelledby={`${idTabla}-leyenda`} tabIndex={0}>
                            <table className="ix-tabla" id={idTabla}>
                                <caption id={`${idTabla}-leyenda`}>{conDim
                                    ? "Nota general: el promedio de las dimensiones medidas. Cada dimensión es el porcentaje de sus controles que cumple; la de velocidad es el promedio de Lighthouse en celular. Toca un encabezado para ordenar."
                                    : "Nota del índice: promedio de rendimiento, accesibilidad, buenas prácticas y SEO de Lighthouse en celular. Controles: cuántos de los doce cumple."}</caption>
                                <thead>
                                    <tr>
                                        <th scope="col" data-type="number"><button type="button" {...orden}><span className="ix-largo">Puesto</span><span className="ix-corto" aria-hidden="true">N.º</span></button></th>
                                        <th scope="col"><button type="button" {...orden}>{c.id === "municipalidad" ? "Comuna" : c.id === "gobierno-regional" ? "Región" : "Institución"}</button></th>
                                        <th scope="col" data-type="number" aria-sort="descending"><button type="button" {...orden}>Nota</button></th>
                                        {conDim ? DIMENSIONES.map((d) => <th key={d.id} scope="col" data-type="number"><button type="button" {...orden}>{d.corto}</button></th>) : (<>
                                            <th scope="col"><abbr title="Rendimiento">Rend.</abbr></th><th scope="col"><abbr title="Accesibilidad">Acces.</abbr></th>
                                            <th scope="col"><abbr title="Buenas prácticas">Práct.</abbr></th><th scope="col">SEO</th><th scope="col">Controles</th><th scope="col">Peso</th></>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rk.map(({ sitio: s, puesto, nota, controles }) => (
                                        <tr key={s.slug} data-buscar={`${s.nombre} ${s.region ?? ""} ${s.comuna ?? ""}`}>
                                            <td className="ix-puesto" data-value={puesto}>{puesto}</td>
                                            <th scope="row"><Link href={`${RUTA}/${c.ruta}/${s.slug}`} title={s.nombre}>{corto(s)}</Link>{s.region && corto(s) !== s.region && <small>{s.region}</small>}</th>
                                            <td className="ix-nota-celda" data-value={nota}><b data-nivel={nota >= 90 ? "bueno" : nota >= 50 ? "medio" : "bajo"}>{nota}</b></td>
                                            {conDim ? DIMENSIONES.map((d) => { const v = notaDimension(s, d.id); return <td key={d.id} data-value={v ?? -1}>{v ?? "—"}</td>; }) : (<>
                                                <td>{s.notas.rendimiento}</td><td>{s.notas.accesibilidad}</td><td>{s.notas.practicas}</td><td>{s.notas.seo}</td>
                                                <td>{controles === null ? "—" : `${controles}/12`}</td>
                                                <td>{peso(s.peso)}</td></>)}
                                        </tr>
                                    ))}
                                </tbody>
                                {sin.length > 0 && <tbody>
                                    {sin.map((s) => (
                                        <tr key={s.slug} data-buscar={`${s.nombre} ${s.region ?? ""} ${s.comuna ?? ""}`} className="ix-sin">
                                            <td className="ix-puesto">—</td>
                                            <th scope="row"><Link href={`${RUTA}/${c.ruta}/${s.slug}`} title={s.nombre}>{corto(s)}</Link>{s.region && corto(s) !== s.region && <small>{s.region}</small>}</th>
                                            <td colSpan={conDim ? DIMENSIONES.length + 1 : 7}>Sin nota: {s.motivo}.</td>
                                        </tr>
                                    ))}
                                </tbody>}
                            </table>
                        </div>
                        {conDim && <OrdenTabla tabla={idTabla} />}
                    </Vista>
                </section>
                <section className="ix-bloque" data-forma="marco" aria-labelledby="ix-reparto">
                    <Vista className="ancho ix-dos">
                        <div>
                            <h2 id="ix-reparto"><span className="linea-r"><span>Cómo se reparten</span></span></h2>
                            <p className="ix-nota">Mediana de rendimiento {r.mediana.rendimiento ?? "—"}, de accesibilidad {r.mediana.accesibilidad ?? "—"}, de buenas prácticas {r.mediana.practicas ?? "—"} y de SEO {r.mediana.seo ?? "—"}. La portada mediana pesa {peso(r.mediana.peso)}.</p>
                            <p className="ix-enlaces">
                                <Link className="enlace-ir" href={RUTA}>Volver al índice</Link>
                                <Link className="enlace-ir" href={`${RUTA}/metodologia`}>Cómo se midió</Link>
                            </p>
                        </div>
                        <div data-sube=""><Histograma tramos={distribucion(m)} titulo={`Cuántos sitios de ${c.articulo} hay en cada tramo de nota`} /></div>
                    </Vista>
                </section>
            </main>
        </Esqueleto>
    );
}
