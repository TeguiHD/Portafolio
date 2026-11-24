import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Esqueleto } from "@/modules/esqueleto/Esqueleto";
import { Vista } from "@/modules/landing/viva/Vista";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { EscribeMateria } from "@/modules/como-se-hizo/Escribe";
import { breadcrumbSchema, type BreadcrumbTrail } from "@/lib/seo/schemas";
import { SITE_URL } from "@/lib/seo/metadata";
import { ANCLA_ESTUDIO, METODO, PRUEBAS_MINIMO, RUTA_COMO_SE_HIZO, type Fuente } from "@/lib/como-se-hizo";
import { PRODUCTOS } from "@/lib/como-se-hizo-productos";
import { ESTUDIOS_HERRAMIENTAS } from "@/lib/como-se-hizo-herramientas";
import { getPublicTools } from "@/lib/public-tools.server";
import "@/modules/sobre-mi/sobre-mi.css";
import "@/modules/como-se-hizo/como-se-hizo.css";

/**
 * /como-se-hizo: el método del sitio (medir, revisar, decidir por escrito, comprobar) y el estudio de cada producto,
 * con enlace al de cada herramienta. Diseño: docs/superpowers/specs/2026-11-24-como-se-hizo-design.md
 */
const TITULO = "Cómo se hizo nicoholas.dev";
const DESCRIPCION = "El estudio detrás de cada parte del sitio: qué se midió, qué se revisó, qué se decidió y cómo se comprueba, en el Índice de la Web Chilena, las herramientas, los servicios y el propio sitio.";

export const metadata: Metadata = {
    title: { absolute: `${TITULO} | Nicoholas Lopetegui` },
    description: DESCRIPCION,
    alternates: { canonical: RUTA_COMO_SE_HIZO },
    openGraph: { title: TITULO, description: DESCRIPCION, url: RUTA_COMO_SE_HIZO, type: "website" },
};

const trail: BreadcrumbTrail = [
    { name: "Inicio", path: "" },
    { name: "Cómo se hizo", path: RUTA_COMO_SE_HIZO },
];

const pagina = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE_URL}${RUTA_COMO_SE_HIZO}#pagina`,
    url: `${SITE_URL}${RUTA_COMO_SE_HIZO}`,
    name: TITULO,
    description: DESCRIPCION,
    inLanguage: "es",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    author: { "@id": `${SITE_URL}/#person` },
};

function Ficha({ e }: { e: { para: string; reviso: string; funciona: string; comprueba: string; fuentes: Fuente[] } }) {
    const filas: [string, string][] = [["Para qué", e.para], ["Qué se revisó", e.reviso], ["Cómo funciona", e.funciona], ["Cómo se comprueba", e.comprueba]];
    return (
        <dl className="cs-ficha">
            {filas.map(([nombre, texto]) => <div key={nombre}><dt>{nombre}</dt><dd>{texto}</dd></div>)}
            {e.fuentes.length ? (
                <div>
                    <dt>Fuentes</dt>
                    <dd><ul>{e.fuentes.map((f) => <li key={f.url}><a href={f.url} target="_blank" rel="noopener noreferrer"><cite>{f.nombre}</cite></a></li>)}</ul></dd>
                </div>
            ) : null}
        </dl>
    );
}

export default async function ComoSeHizo() {
    // Las herramientas con estudio, en el orden del catálogo y solo las públicas: una que el panel oculta no se enlaza.
    const herramientas = (await getPublicTools()).filter((t) => ESTUDIOS_HERRAMIENTAS[t.slug]);
    return (
        <Esqueleto portada>
            <JsonLd schema={[pagina, breadcrumbSchema(trail)]} />
            <main id="main-content" className="sm cs">
                <div className="ancho sm-migas"><Breadcrumbs trail={trail} /></div>

                {/* La materia escribe la cifra de pruebas; la frase completa va en el HTML, primero. */}
                <section id="inicio" className="sm-cab cs-cab" data-forma="texto" data-ancla="#cs-texto" aria-labelledby="cs-titulo">
                    <Vista className="ancho cs-cab-rejilla">
                        <div>
                            <h1 id="cs-titulo"><span className="linea-r"><span>Cómo se hizo<i>.</i></span></span></h1>
                            <p className="sm-lead" data-sube="" style={{ "--i": 1 } as CSSProperties}>Cada parte de este sitio empieza con una medición, sigue con una revisión de lo que ya existe y termina en una decisión escrita.</p>
                            <p className="sm-desc" data-sube="" style={{ "--i": 2 } as CSSProperties}>Aquí está el estudio de cada una: qué se midió, qué se revisó, qué se decidió y cómo se comprueba.</p>
                        </div>
                        <div className="cs-cifra" data-sube="" style={{ "--i": 2 } as CSSProperties}>
                            <EscribeMateria texto={`+${PRUEBAS_MINIMO}`} />
                            <p><strong>Más de {PRUEBAS_MINIMO}</strong> pruebas automáticas; la mayoría abre el sitio en un navegador real.</p>
                        </div>
                    </Vista>
                </section>

                <section id="metodo" className="plano" data-forma="marco" aria-labelledby="cs-metodo">
                    <Vista className="ancho">
                        <h2 id="cs-metodo"><span className="linea-r"><span>El método</span></span></h2>
                        <ol className="cs-metodo" data-sube="" style={{ "--i": 1 } as CSSProperties}>
                            {METODO.map((m, i) => (
                                <li key={m.paso}>
                                    <span className="cs-n" aria-hidden="true">{i + 1}</span>
                                    <div>
                                        <h3>{m.paso}</h3>
                                        <p>{m.texto}</p>
                                        <p className="cs-ejemplo">{m.ejemplo}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </Vista>
                </section>

                {PRODUCTOS.map((p) => (
                    <section key={p.id} id={p.id} className="plano" data-forma="marco" aria-labelledby={`cs-${p.id}`}>
                        <Vista className="ancho">
                            <h2 id={`cs-${p.id}`}><span className="linea-r"><span>{p.nombre}</span></span></h2>
                            <div className="cs-producto" data-sube="" style={{ "--i": 1 } as CSSProperties}>
                                <Ficha e={p} />
                                <p className="cs-ir">
                                    <Link className="enlace-ir" href={p.href}>{p.ir}</Link>
                                    {p.mas ? <Link className="enlace-ir" href={p.mas.href}>{p.mas.texto}</Link> : null}
                                </p>
                                {p.id === "herramientas" && herramientas.length ? (
                                    <nav className="cs-herramientas" aria-labelledby="cs-cada-una">
                                        <h3 id="cs-cada-una">El estudio de cada una</h3>
                                        <ul>
                                            {herramientas.map((t) => (
                                                <li key={t.slug}><Link href={`/herramientas/${t.slug}#${ANCLA_ESTUDIO}`}>{t.name}</Link></li>
                                            ))}
                                        </ul>
                                    </nav>
                                ) : null}
                            </div>
                        </Vista>
                    </section>
                ))}

                <section id="contacto" className="sm-contacto" data-forma="anillo" data-ancla="#ancla-anillo" aria-labelledby="cs-contacto">
                    <Vista className="ancho" id="ancla-anillo">
                        <h2 id="cs-contacto"><span className="linea-r"><span>Conversemos<i>.</i></span></span></h2>
                        <p data-sube="" style={{ "--i": 1 } as CSSProperties}>Si quieres algo hecho así para tu empresa o institución, cuéntame qué necesitas y te llega una propuesta escrita.</p>
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
