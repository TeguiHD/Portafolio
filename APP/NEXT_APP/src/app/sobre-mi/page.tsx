/**
 * Página de autor: ancla E-A-T del sitio.
 *
 * `personSchema()` (src/lib/seo/schemas.ts) declara `url: "${SITE_URL}/sobre-mi"`
 * como identidad canónica del autor — esta ruta es lo que hace que esa
 * declaración apunte a algo real en vez de a un 404.
 *
 * Todo el contenido factual sale de fuentes ya existentes en el repositorio:
 * nombre, cargo y descripción de `personSchema()`; GitHub y LinkedIn de su
 * `sameAs`; el stack técnico y la trayectoria de las constantes
 * `defaultTechnologies` y `timeline` en
 * `src/modules/landing/sections/AboutSection.tsx` (código muerto, no
 * referenciado, pero con datos reales). No se transcribe nada más de ese
 * archivo: el párrafo de marketing que lo acompaña (título académico, años
 * de experiencia, cifras de ventas) no está en la tabla de fuentes de esta
 * página y no se usa aquí.
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

// Trayectoria: `timeline` en
// src/modules/landing/sections/AboutSection.tsx (líneas 23-28).
const TIMELINE = [
    { year: "2019", event: "Inicio carrera Full-stack" },
    { year: "2021", event: "Primer proyecto gubernamental (SLEP)" },
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
                                    Soy <strong className="text-white">{SITE_NAME}</strong>,{" "}
                                    {jobTitle.toLowerCase()}.
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
