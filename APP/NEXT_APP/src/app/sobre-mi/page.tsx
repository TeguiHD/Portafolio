/**
 * Página de autor: ancla E-A-T del sitio.
 *
 * `personSchema()` (src/lib/seo/schemas.ts) declara `url: "${SITE_URL}/sobre-mi"`
 * como identidad canónica del autor — esta ruta es lo que hace que esa
 * declaración apunte a algo real en vez de a un 404.
 *
 * Todo el contenido factual sale de fuentes verificadas: nombre, cargo y
 * descripción de `personSchema()`; GitHub y LinkedIn de su `sameAs`; el stack
 * técnico de `defaultTechnologies` en
 * `src/modules/landing/sections/AboutSection.tsx`.
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
import { Navbar } from "@/modules/landing/layout/Navbar";
import { FooterSection } from "@/modules/landing/sections/FooterSection";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { personSchema, breadcrumbSchema, type BreadcrumbTrail } from "@/lib/seo/schemas";
import { SITE_NAME } from "@/lib/seo/metadata";

export const metadata: Metadata = {
    title: { absolute: "Sobre mí | Nicoholas Lopetegui" },
    description:
        "Nicoholas Lopetegui, Desarrollador Full Stack: quién construye y mantiene las herramientas de este sitio, su stack técnico y su trayectoria profesional.",
    alternates: { canonical: "/sobre-mi" },
};

const trail: BreadcrumbTrail = [
    { name: "Inicio", path: "" },
    { name: "Sobre mí", path: "/sobre-mi" },
];

// Stack técnico: `defaultTechnologies` en
// src/modules/landing/sections/AboutSection.tsx (líneas 8-21).
const TECHNOLOGIES = [
    { name: "Next.js", category: "Frontend" },
    { name: "React", category: "Frontend" },
    { name: "TypeScript", category: "Frontend" },
    { name: "Node.js", category: "Backend" },
    { name: "Python", category: "Backend" },
    { name: "PostgreSQL", category: "Database" },
    { name: "Docker", category: "DevOps" },
    { name: "n8n", category: "Automation" },
    { name: "GSAP", category: "Animation" },
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
];

export default function SobreMiPage() {
    const person = personSchema();
    const jobTitle = person.jobTitle as string;
    const description = person.description as string;

    return (
        <div className="min-h-screen bg-[#050914] text-neutral-300">
            <Navbar />

            <JsonLd schema={[personSchema(), breadcrumbSchema(trail)]} />

            <div className="pt-24">
                <Breadcrumbs trail={trail} />

                <main className="px-4 pb-16 sm:px-6">
                    <div className="mx-auto max-w-4xl">
                        <div className="mb-12 border-b border-white/10 pb-8">
                            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[#00B8A9]">
                                Quién está detrás
                            </p>
                            <h1 className="text-3xl font-bold text-white sm:text-4xl">
                                Sobre mí
                            </h1>
                        </div>

                        <div className="space-y-12 text-sm leading-relaxed sm:text-base">
                            <section>
                                <h2 className="mb-4 text-xl font-semibold text-white">
                                    Quién soy
                                </h2>
                                <p>
                                    Soy <strong className="text-white">{SITE_NAME}</strong>,
                                    ingeniero en informática y {jobTitle.toLowerCase()}.
                                </p>
                            </section>

                            <section>
                                <h2 className="mb-4 text-xl font-semibold text-white">
                                    En qué trabajo
                                </h2>
                                <p>{description}</p>
                            </section>

                            <section>
                                <h2 className="mb-4 text-xl font-semibold text-white">
                                    El stack
                                </h2>
                                <ul className="flex flex-wrap gap-3">
                                    {TECHNOLOGIES.map((tech) => (
                                        <li
                                            key={tech.name}
                                            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2"
                                        >
                                            <span className="text-sm font-semibold text-white">
                                                {tech.name}
                                            </span>
                                            <span className="ml-2 text-xs text-neutral-500">
                                                {tech.category}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            <section>
                                <h2 className="mb-4 text-xl font-semibold text-white">
                                    La trayectoria
                                </h2>
                                <ol className="space-y-4">
                                    {TIMELINE.map((item) => (
                                        <li key={item.year} className="flex items-start gap-4">
                                            <span className="w-14 shrink-0 font-mono text-sm font-semibold text-[#00B8A9]">
                                                {item.year}
                                            </span>
                                            <span className="text-neutral-300">{item.event}</span>
                                        </li>
                                    ))}
                                </ol>
                            </section>

                            <section>
                                <h2 className="mb-4 text-xl font-semibold text-white">
                                    Proyectos
                                </h2>
                                <div className="space-y-6">
                                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
                                        <div className="mb-2 flex flex-wrap items-center gap-3">
                                            <h3 className="text-base font-semibold text-white">
                                                FloresDyD — e-commerce a medida
                                            </h3>
                                            <a
                                                href="https://floresdyd.cl"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs font-medium text-[#00B8A9] transition hover:text-white"
                                            >
                                                floresdyd.cl ↗
                                            </a>
                                        </div>
                                        <p className="text-sm leading-relaxed text-neutral-400">
                                            Tienda online construida desde cero para un
                                            emprendimiento que no tenía identidad de marca ni
                                            presencia digital. Incluye identidad visual, gestión de
                                            clientes recurrentes y ocasionales, gestión de entregas,
                                            pasarelas de pago, inicio de sesión con Google y con
                                            cuenta propia, y carrito persistente por cuenta y por
                                            cookies para quien compra sin registrarse. Desarrollado
                                            aplicando buenas prácticas de seguridad —siguiendo
                                            referencias como OWASP— y cuidando la experiencia de uso.
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
                                        <h3 className="mb-2 text-base font-semibold text-white">
                                            Intranet y aula virtual para una OTEC
                                        </h3>
                                        <p className="text-sm leading-relaxed text-neutral-400">
                                            Plataforma interna para un organismo técnico de
                                            capacitación: intranet y aula virtual para sus
                                            estudiantes, con emisión de certificados de cursos y
                                            actividades, gestión de cursos y gestión de pagos. Al ser
                                            un sistema privado tras autenticación, no tiene una demo
                                            pública.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h2 className="mb-4 text-xl font-semibold text-white">
                                    Cómo contactar
                                </h2>
                                <p className="mb-4">
                                    Los canales verificables son estos dos perfiles públicos:
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <a
                                        href="https://github.com/TeguiHD"
                                        target="_blank"
                                        rel="noopener noreferrer me"
                                        className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-white transition hover:border-white/20"
                                    >
                                        GitHub
                                    </a>
                                    <a
                                        href="https://linkedin.com/in/nicoholas-lopetegui"
                                        target="_blank"
                                        rel="noopener noreferrer me"
                                        className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-white transition hover:border-white/20"
                                    >
                                        LinkedIn
                                    </a>
                                </div>
                            </section>
                        </div>
                    </div>
                </main>
            </div>

            <FooterSection />
        </div>
    );
}
