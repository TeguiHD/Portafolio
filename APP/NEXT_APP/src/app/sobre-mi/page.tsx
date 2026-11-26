/**
 * Página de autor: ancla E-A-T del sitio.
 *
 * `personSchema()` (src/lib/seo/schemas.ts) declara `url: "${SITE_URL}/sobre-mi"`
 * como identidad canónica del autor — esta ruta es lo que hace que esa
 * declaración apunte a algo real en vez de a un 404.
 *
 * Todo el contenido factual sale de fuentes verificadas: nombre y cargo de
 * `personSchema()`; los servicios, de la portada y llms.txt; GitHub y LinkedIn de su `sameAs`; el stack
 * técnico de `defaultTechnologies` en
 * `src/modules/landing/sections/AboutSection.tsx`.
 *
 * La sección «En la UBO» (26-11-2026) sale de lo que dio el titular el 25-11 (cargo desde el 17-06-2026, Moodle,
 * Sostenibilidad con la U. de Chile, procesos docentes, desarrollos con SapIA), del programa público del diplomado
 * (módulos 3 y 4) y del sitio público de SapIA (nombre completo y dependencia). La patente es una SOLICITUD publicada en
 * el boletín de la CIPC (vol. 58, n.º 12, dic. 2025): no se enlaza ese PDF porque trae la dirección particular del titular.
 *
 * El título (Ingeniero en Informática), la práctica profesional en el SLEP
 * Santa Rosa y los dos proyectos (FloresDyD y la intranet/aula virtual para
 * una OTEC) los confirmó el titular del sitio de forma explícita el
 * 2026-08-05. floresdyd.cl es un sitio público y verificable; el proyecto de
 * la OTEC es un sistema interno tras login y por eso no se enlaza. NO se
 * incluyen las afirmaciones que NO confirmó —"5+ años de experiencia" y
 * "+150% ventas" del párrafo de marketing de AboutSection.tsx— ni la lista
 * ampliada de marcos de seguridad, que en un e-commerce pequeño leería como
 * sobreafirmación; se conserva solo la referencia concreta y creíble (OWASP).
 */
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Esqueleto } from "@/modules/esqueleto/Esqueleto";
import { Vista } from "@/modules/landing/viva/Vista";
import { StackVivo } from "@/modules/sobre-mi/StackVivo";
import "@/modules/sobre-mi/sobre-mi.css";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { personSchema, profilePageSchema, breadcrumbSchema, type BreadcrumbTrail } from "@/lib/seo/schemas";
import { SITE_NAME } from "@/lib/seo/metadata";

export const metadata: Metadata = {
    title: { absolute: "Sobre mí | Nicoholas Lopetegui" },
    description:
        "Nicoholas Lopetegui: desarrollador full stack, técnico de plataformas académicas en la UBO y docente de IA generativa. Su trabajo, su stack y su trayectoria.",
    alternates: { canonical: "/sobre-mi" },
};

const trail: BreadcrumbTrail = [
    { name: "Inicio", path: "" },
    { name: "Sobre mí", path: "/sobre-mi" },
];

// Stack técnico: `defaultTechnologies` en
// src/modules/landing/sections/AboutSection.tsx (líneas 8-21).
// Las categorías se muestran tal cual: van en español (antes «Database», «Automation», «Animation»).
const TECHNOLOGIES = [
    { name: "Next.js", category: "Frontend" },
    { name: "React", category: "Frontend" },
    { name: "TypeScript", category: "Frontend" },
    { name: "Node.js", category: "Backend" },
    { name: "Python", category: "Backend" },
    { name: "PostgreSQL", category: "Base de datos" },
    { name: "Docker", category: "DevOps" },
    { name: "n8n", category: "Automatización" },
    { name: "GSAP", category: "Animación" },
    { name: "Prisma", category: "ORM" },
    { name: "FastAPI", category: "Backend" },
    { name: "Power BI", category: "BI" },
];

// Trayectoria: base en `timeline` de
// src/modules/landing/sections/AboutSection.tsx (líneas 23-28). La entrada del
// SLEP se precisó con el dato confirmado por el titular: fue su práctica
// profesional en el SLEP Santa Rosa.
const TIMELINE = [
    { year: "2019", event: "Inicio carrera Full-stack" },
    { year: "2021", event: "Práctica profesional en el SLEP Santa Rosa" },
    { year: "2023", event: "Especialización en automatizaciones" },
    { year: "2024", event: "ML Ops y pipelines de datos" },
    { year: "2025", event: "Coinventor en una solicitud de patente presentada en Sudáfrica" },
    { year: "2026", event: "Plataformas académicas y docencia de IA generativa en la UBO" },
];

const DIPLOMADO = "https://educacioncontinua.ubo.cl/diplomados/inteligencia-artificial-generativa-aplicada/";

/**
 * Sobre mí con el lenguaje de la portada (rediseño del 18-11-2026; el contenido es el mismo y sigue sustentado arriba):
 * la firma de partículas en la cabecera, el stack que la materia dibuja, la trayectoria y los proyectos en filas,
 * y el contacto dentro del anillo.
 */
export default function SobreMiPage() {

    return (
        <Esqueleto portada>
            <JsonLd schema={[profilePageSchema(), personSchema(), breadcrumbSchema(trail)]} />
            <main id="main-content" className="sm">
                <div className="ancho sm-migas"><Breadcrumbs trail={trail} /></div>

                <section id="inicio" className="sm-cab" data-forma="firma" data-ancla="#ancla-firma" aria-labelledby="sm-titulo">
                    <Vista className="ancho">
                        <h1 id="sm-titulo"><span className="linea-r"><span>Sobre mí<i>.</i></span></span></h1>
                        {/* La respuesta a «¿quién es?» va primero y en el HTML del servidor: es lo que leen y repiten las IA. */}
                        <p className="sm-lead" data-sube="" style={{ "--i": 1 } as CSSProperties}>
                            Soy <strong>{SITE_NAME}</strong>, ingeniero en informática y desarrollador full stack en Chile.
                        </p>
                        <p className="sm-desc" data-sube="" style={{ "--i": 2 } as CSSProperties}>
                            Trabajo en las plataformas académicas de la Universidad Bernardo O&apos;Higgins y enseño IA generativa en su
                            diplomado. Por mi cuenta hago tiendas en línea, sistemas internos e intranets y herramientas web a medida, en
                            Chile y a distancia, con Next.js, TypeScript, Node.js y PostgreSQL.
                        </p>
                        <div id="ancla-firma" aria-hidden="true" />
                    </Vista>
                </section>

                <section id="ubo" className="plano" data-forma="marco" aria-labelledby="sm-ubo">
                    <Vista className="ancho">
                        <h2 id="sm-ubo"><span className="linea-r"><span>En la UBO</span></span></h2>
                        <p className="sm-intro" data-sube="" style={{ "--i": 1 } as CSSProperties}>
                            Desde junio de 2026 soy técnico de gestión y plataformas académicas en la Universidad Bernardo O&apos;Higgins.
                        </p>
                        <div className="sm-filas" data-sube="" style={{ "--i": 2 } as CSSProperties}>
                            <article>
                                <h3>Aulas virtuales</h3>
                                <p>
                                    Gestiono las aulas Moodle de pregrado, postgrado y educación continua, y construyo las aulas del
                                    Departamento de Sostenibilidad, en colaboración con la Universidad de Chile.
                                </p>
                            </article>
                            <article>
                                <h3>Procesos docentes</h3>
                                <p>
                                    Plataformas para la postulación de docentes premium y para la incorporación académica, y herramientas y
                                    automatizaciones para el trabajo diario de la universidad.
                                </p>
                            </article>
                            <article>
                                <h3>Con SapIA</h3>
                                <p>
                                    Con la Sección de Articulación y Promoción de la Inteligencia Artificial en la Academia (SapIA) hago
                                    desarrollos para los directores de carrera: un analizador de pitch y páginas para los docentes que postulan
                                    a fondos de desarrollo.
                                </p>
                                <a className="enlace-ir" href="https://sapia.ubo.cl/" target="_blank" rel="noopener noreferrer">sapia.ubo.cl ↗</a>
                            </article>
                            <article>
                                <h3>Docencia</h3>
                                <p>
                                    Enseño los módulos 3, «¿Cómo optimizar tareas con IA?», y 4, «Creación de propuestas de soluciones
                                    innovadoras con IA», del Diplomado en Inteligencia Artificial Generativa Aplicada de la UBO: la versión 1
                                    terminó en octubre de 2026 y la versión 2 está en curso.
                                </p>
                                <a className="enlace-ir" href={DIPLOMADO} target="_blank" rel="noopener noreferrer">El programa del diplomado ↗</a>
                            </article>
                            <article>
                                <h3>Una solicitud de patente</h3>
                                <p>
                                    Soy coinventor de la solicitud de patente ZA 2025/10601, «Computerized system and method for real-time
                                    simulation and analysis of macroeconomic variables», presentada en Sudáfrica por la UBO y la Universidad
                                    Estatal de Economía de San Petersburgo (UNECON). Se publicó como solicitud en el boletín de patentes de la
                                    CIPC de diciembre de 2025; todavía no es una patente concedida.
                                </p>
                            </article>
                        </div>
                    </Vista>
                </section>

                <section id="stack" className="plano" data-forma="figuras" data-ancla="#ancla-marca" aria-labelledby="sm-stack">
                    <span className="fantasma" aria-hidden="true">{TECHNOLOGIES.length}</span>
                    <Vista className="ancho">
                        <h2 id="sm-stack"><span className="linea-r"><span>El stack</span></span></h2>
                        <StackVivo stack={TECHNOLOGIES} />
                    </Vista>
                </section>

                <section id="trayectoria" className="plano" data-forma="marco" aria-labelledby="sm-trayectoria">
                    <Vista className="ancho">
                        <h2 id="sm-trayectoria"><span className="linea-r"><span>La trayectoria</span></span></h2>
                        <ol className="sm-anios" data-sube="" style={{ "--i": 1 } as CSSProperties}>
                            {TIMELINE.map((item) => (
                                <li key={item.year}><span className="sm-anio">{item.year}</span><span>{item.event}</span></li>
                            ))}
                        </ol>
                    </Vista>
                </section>

                <section id="hechos" className="plano" data-forma="marco" aria-labelledby="sm-proyectos">
                    <Vista className="ancho">
                        <h2 id="sm-proyectos"><span className="linea-r"><span>Proyectos</span></span></h2>
                        <div className="sm-proyectos" data-sube="" style={{ "--i": 1 } as CSSProperties}>
                            <article>
                                <h3>FloresDyD <span>e-commerce a medida</span></h3>
                                <p>
                                    Tienda online construida desde cero para un emprendimiento que no tenía identidad de marca ni presencia
                                    digital. Incluye identidad visual, gestión de clientes recurrentes y ocasionales, gestión de entregas,
                                    pasarelas de pago, inicio de sesión con Google y con cuenta propia, y carrito persistente por cuenta y por
                                    cookies para quien compra sin registrarse. Desarrollado aplicando buenas prácticas de seguridad
                                    —siguiendo referencias como OWASP— y cuidando la experiencia de uso.
                                </p>
                                <a className="enlace-ir" href="https://floresdyd.cl" target="_blank" rel="noopener noreferrer">floresdyd.cl ↗</a>
                            </article>
                            <article>
                                <h3>Intranet y aula virtual <span>para una OTEC</span></h3>
                                <p>
                                    Plataforma interna para un organismo técnico de capacitación: intranet y aula virtual para sus estudiantes,
                                    con emisión de certificados de cursos y actividades, gestión de cursos y gestión de pagos. Al ser un sistema
                                    privado tras autenticación, no tiene una demo pública.
                                </p>
                            </article>
                        </div>
                        <p className="sm-tambien" data-sube="" style={{ "--i": 2 } as CSSProperties}>Y este sitio: <Link href="/como-se-hizo">cómo se hizo cada parte</Link>, con lo que se midió, lo que se revisó y cómo se comprueba.</p>
                    </Vista>
                </section>

                <section id="contacto" className="sm-contacto" data-forma="anillo" data-ancla="#ancla-anillo" aria-labelledby="sm-contacto">
                    <Vista className="ancho centro" id="ancla-anillo">
                        <h2 id="sm-contacto"><span className="linea-r"><span>Cómo contactar<i>.</i></span></span></h2>
                        <p data-sube="" style={{ "--i": 1 } as CSSProperties}>Los canales verificables son estos dos perfiles públicos, o el formulario de la portada.</p>
                        <div className="sm-redes" data-sube="" style={{ "--i": 2 } as CSSProperties}>
                            <a className="enlace-ir" href="https://github.com/TeguiHD" target="_blank" rel="noopener noreferrer me">GitHub ↗</a>
                            <a className="enlace-ir" href="https://www.linkedin.com/in/nicoholas-lopetegui/" target="_blank" rel="noopener noreferrer me">LinkedIn ↗</a>
                            <a className="boton lleno" href="/#contacto">Escribirme</a>
                        </div>
                    </Vista>
                </section>
            </main>
        </Esqueleto>
    );
}
