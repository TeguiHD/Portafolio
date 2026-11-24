import type { Metadata } from "next";
import Link from "next/link";
import { Esqueleto } from "@/modules/esqueleto/Esqueleto";
import { Vista } from "@/modules/landing/viva/Vista";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, faqSchema, type BreadcrumbTrail } from "@/lib/seo/schemas";
import { CATEGORIAS, EDICION, RUTA, categoriaPorId, periodoMedicion, nombreEdicion, sitiosDe, urlDatos } from "@/lib/indice/datos";
import { CONTROLES } from "@/lib/indice/revision";
import { DIMENSIONES } from "@/lib/indice/textos-dimensiones";
import { citaIndice } from "@/lib/indice/textos";
import { Copiar } from "@/modules/indice/Cliente";
import "@/modules/sobre-mi/sobre-mi.css";
import "@/modules/servicios/servicios.css";
import "@/modules/indice/indice.css";

export const metadata: Metadata = {
    title: { absolute: "Metodología del Índice de la Web Chilena | nicoholas.dev" },
    description: "Cómo se mide el Índice de la Web Chilena: qué sitios entran, las siete dimensiones y sus fuentes, la prueba con Claude, sus límites y cómo citar o descargar los datos.",
    alternates: { canonical: `${RUTA}/metodologia` },
};

const trail: BreadcrumbTrail = [{ name: "Inicio", path: "" }, { name: "Índice de la Web Chilena", path: RUTA }, { name: "Metodología", path: `${RUTA}/metodologia` }];

const PREGUNTAS = [
    { question: "¿Por qué una sola corrida por sitio?", answer: "Para medir cientos de sitios en pocas horas desde un solo equipo. La nota de rendimiento puede variar algunos puntos entre corridas; las de accesibilidad, buenas prácticas y SEO casi no cambian. Por eso el índice no ordena por diferencias de uno o dos puntos como si fueran definitivas." },
    { question: "¿Por qué solo la portada?", answer: "Es la página que más se visita y la que todos los sitios tienen. Un sitio puede tener la portada bien y el resto mal, o al revés: el índice mide la puerta de entrada, no el sitio completo." },
    { question: "Mi institución arregló su sitio, ¿cuándo se actualiza?", answer: "En la próxima edición, que se mide igual para todos. Mientras tanto, con «Revisa tu sitio» puedes ver al tiro los doce controles con la misma revisión que usa el índice." },
    { question: "¿La prueba con IA vale para ChatGPT o Gemini?", answer: "No. Se le preguntó solo a Claude, porque es el asistente con el que hay acceso por API para hacer las mismas preguntas a todas las instituciones. Otras IA pueden responder distinto; se sumarán en otra edición." },
    { question: "¿Encontraste un error en los datos?", answer: "Escríbeme a contacto@nicoholas.dev con el nombre de la institución y lo que viste. Si la dirección del sitio está mal o el resultado no corresponde, se corrige y se deja anotado." },
];

export default function Metodologia() {
    const conDim = EDICION.sitios.some((s) => s.estado === "medido" && s.dim);
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
                            (la misma configuración de PageSpeed Insights){conDim ? ", y con controles propios sobre lo que entrega el servidor, su DNS y los directorios donde aparece, agrupados en siete dimensiones" : " y con doce controles propios sobre lo que entrega el servidor"}. Todo el código del medidor es público.
                        </p>
                    </Vista>
                </section>

                <section className="ix-bloque" data-forma="marco" aria-labelledby="ix-quienes">
                    <Vista className="ancho ix-dos">
                        <h2 id="ix-quienes"><span className="linea-r"><span>Qué sitios entran</span></span></h2>
                        <div className="ix-texto-largo" data-sube="">
                            <p>Todas las instituciones de {CATEGORIAS.filter((c) => sitiosDe(c.id).length).length} grupos, sin elegir: {CATEGORIAS.map((c) => `${sitiosDe(c.id).length} ${c.plural.toLowerCase()}`).join(", ").replace(/, ([^,]*)$/, " y $1")}. La lista de sitios oficiales se armó con Wikidata y las listas oficiales de cada grupo (las universidades son todas las del listado de instituciones vigentes del SIES; los servicios públicos, servicios locales de educación, delegaciones presidenciales y la red de salud, las fichas del directorio de organismos del Portal de Transparencia), y cada dirección se comprobó abriéndola, con un navegador real cuando hizo falta.</p>
                            {(EDICION.excluidas ?? []).map((x) => (
                                <p key={x.nombre}>Quedó fuera {categoriaPorId(x.categoria)?.femenino ? "la" : "el"} {x.nombre}: {x.motivo}. Medir un sitio equivocado sería atribuirle notas ajenas.</p>
                            ))}
                            <p>Se mide la portada, en la dirección final después de las redirecciones. Un sitio que no cargó en dos intentos queda en la lista como «sin respuesta», sin nota: también es un dato. Lo mismo una institución sin sitio web: queda en la lista, sin nota y con su motivo.</p>
                        </div>
                    </Vista>
                </section>

                <section className="ix-bloque" data-forma="marco" aria-labelledby="ix-lh">
                    <Vista className="ancho ix-dos">
                        <h2 id="ix-lh"><span className="linea-r"><span>Lighthouse</span></span></h2>
                        <div className="ix-texto-largo" data-sube="">
                            <p>Lighthouse es la herramienta de Google que está detrás de PageSpeed Insights. Da cuatro notas de 0 a 100: rendimiento (qué tan rápido se ve y responde), accesibilidad (revisión automática de problemas para personas con discapacidad), buenas prácticas y SEO. Considera bueno de 90 a 100.</p>
                            <p>{conDim ? "El promedio simple de esas cuatro es la dimensión «Velocidad y calidad». La nota general de cada sitio es el promedio de sus dimensiones medidas, siempre que tenga Lighthouse; el ranking ordena por ella, y si dos sitios empatan, va primero el que cumple más de los doce controles básicos. Los empates completos comparten puesto." : "La nota del índice es el promedio simple de esas cuatro. El ranking ordena por esa nota; si dos sitios empatan, va primero el que cumple más controles. Los empates completos comparten puesto."}</p>
                            <p>Las mediciones se hicieron de a una, desde una conexión en Chile, con la emulación de celular y la red simulada que trae Lighthouse por defecto.</p>
                        </div>
                    </Vista>
                </section>

                {EDICION.universo && (
                    <section className="ix-bloque" data-forma="marco" aria-labelledby="ix-universo">
                        <Vista className="ancho ix-dos">
                            <h2 id="ix-universo"><span className="linea-r"><span>Del Portal de Transparencia</span></span></h2>
                            <div className="ix-texto-largo" data-sube="">
                                <p>De los organismos del directorio del Portal de Transparencia que no estaban en noviembre, {EDICION.universo.sinSitio} no indican un sitio propio y {EDICION.universo.compartenSitio} comparten el sitio con otro (por ejemplo, una subsecretaría con su ministerio): cada sitio cuenta una vez. {EDICION.universo.yaNoExisten ? `${EDICION.universo.yaNoExisten} ya no existe con ese nombre. ` : ""}{EDICION.universo.dudosos} quedaron fuera porque no se pudo confirmar que la dirección fuera de la institución.</p>
                                <p>Cuando la dirección del Portal ya no servía (dominio vencido, página interior que da error o un sitio ajeno), se buscó la actual y se dejó anotada: eso mismo es lo que mide la dimensión «Directorios al día».</p>
                            </div>
                        </Vista>
                    </section>
                )}

                {conDim && DIMENSIONES.map((d) => (
                    <section key={d.id} className="ix-bloque" data-forma="marco" aria-labelledby={`ix-dim-${d.id}`}>
                        <Vista className="ancho ix-dos">
                            <div>
                                <h2 id={`ix-dim-${d.id}`}><span className="linea-r"><span>{d.nombre}</span></span></h2>
                                <p className="ix-nota">{d.queMide}</p>
                                <p className="ix-fuentes">Fuentes: {d.fuentes.map((f, i) => <span key={f.url}>{i ? ", " : ""}<a href={f.url} rel="noopener" target="_blank">{f.texto}</a></span>)}.</p>
                            </div>
                            {d.controles.length > 0 && (
                                <dl className="ix-definiciones" data-sube="">
                                    {d.controles.map((c) => <div key={c.id}><dt>{c.nombre}</dt><dd>{c.porQue}</dd></div>)}
                                </dl>
                            )}
                        </Vista>
                    </section>
                ))}

                {conDim && (
                    <section className="ix-bloque" data-forma="marco" aria-labelledby="ix-claude">
                        <Vista className="ancho ix-dos">
                            <h2 id="ix-claude"><span className="linea-r"><span>Lo que responde la IA</span></span></h2>
                            <div className="ix-texto-largo" data-sube="">
                                <p>A cada institución con sitio verificado se le hizo la misma pregunta a Claude (el modelo Opus 5.5, por su API): «¿Cuál es el sitio web oficial de [nombre], en Chile? Responde solo con la dirección del sitio, sin explicación.»</p>
                                <p>Dos veces: sin herramientas, para ver lo que sabe de memoria, y con su búsqueda web (hasta dos búsquedas por pregunta), que es lo que ve alguien que le pregunta en claude.ai. Acierta si la dirección que responde es exactamente la del sitio verificado, o la que redirige a él; un dominio padre compartido (educacionpublica.cl por un servicio local de educación) no cuenta.</p>
                                <p>Se informa aparte y no suma a la nota general: depende de un solo proveedor de IA.</p>
                            </div>
                        </Vista>
                    </section>
                )}

                {!conDim && <section className="ix-bloque" data-forma="marco" aria-labelledby="ix-doce">
                    <Vista className="ancho ix-dos">
                        <h2 id="ix-doce"><span className="linea-r"><span>Los doce controles</span></span></h2>
                        <dl className="ix-definiciones" data-sube="">
                            {CONTROLES.map((c) => <div key={c.id}><dt>{c.nombre}</dt><dd>{c.porQue}</dd></div>)}
                        </dl>
                    </Vista>
                </section>}

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
                                <a className="enlace-ir" href={urlDatos("csv")} download>Descargar CSV</a>
                                <a className="enlace-ir" href={urlDatos("json")} download>Descargar JSON</a>
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
