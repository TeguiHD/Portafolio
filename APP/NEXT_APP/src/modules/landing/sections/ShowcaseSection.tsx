import Link from "next/link";
import { ArrowUpRight, ShoppingBag, GraduationCap, Wrench } from "lucide-react";
import { TOOL_COUNT } from "@/lib/tool-count";

// Alcance documentado en /sobre-mi; las métricas comerciales requieren
// fuente, periodo y autorización antes de publicarse.
const projects = [
  {
    title: "FloresDyD",
    category: "E-commerce a medida",
    description: "De un emprendimiento sin presencia digital a una tienda con identidad propia, compras online y gestión de entregas.",
    details: "Identidad visual, pagos, acceso con Google y carrito persistente para clientes y visitantes.",
    evidence: "Sitio público",
    href: "https://floresdyd.cl",
    cta: "Visitar tienda",
    external: true,
    icon: ShoppingBag,
  },
  {
    title: "Intranet y aula virtual OTEC",
    category: "Gestión de capacitación",
    description: "Una plataforma interna para organizar cursos, estudiantes y actividades de un organismo técnico de capacitación.",
    details: "Intranet, aula virtual y emisión de certificados de cursos y actividades.",
    evidence: "Sistema privado · alcance documentado",
    href: "/sobre-mi",
    cta: "Conocer el proyecto",
    external: false,
    icon: GraduationCap,
  },
  {
    title: "Herramientas de uso diario",
    category: "Producto propio",
    description: "Utilidades para resolver tareas de desarrollo y diseño: imágenes, códigos QR, datos y más.",
    details: `${TOOL_COUNT} herramientas disponibles. Abre una, prueba tus propios datos y comprueba el resultado.`,
    evidence: "Demo interactiva disponible",
    href: "/herramientas",
    cta: "Probar herramientas",
    external: false,
    icon: Wrench,
  },
];

export function ShowcaseSection() {
  return (
    <section id="casos" aria-labelledby="projects-title" className="relative px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-7xl">
        <p className="mb-4 text-sm font-medium text-teal-300">Trabajo que puedes conocer</p>
        <h2 id="projects-title" className="text-3xl font-bold text-white md:text-5xl">De la necesidad al producto</h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-400">Conoce qué construí, para qué sirve y qué puedes explorar en cada proyecto.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {projects.map((project) => {
            const Icon = project.icon;
            return (
              <article key={project.title} className="flex flex-col rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-8">
                <Icon aria-hidden="true" className="mb-6 h-8 w-8 text-teal-300" />
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">{project.category}</p>
                <h3 className="mb-3 mt-2 text-2xl font-semibold text-white">{project.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-300">{project.description}</p>
                <p className="mb-6 mt-3 text-sm leading-relaxed text-neutral-400">{project.details}</p>
                <div className="mt-auto border-t border-white/10 pt-5">
                  <p className="mb-3 text-xs text-teal-200">{project.evidence}</p>
                  <Link href={project.href} target={project.external ? "_blank" : undefined} rel={project.external ? "noopener noreferrer" : undefined}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-white transition-colors hover:text-teal-200 focus-visible:outline-2 focus-visible:outline-teal-300">
                    {project.cta}<ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                    {project.external && <span className="sr-only">(se abre en otra pestaña)</span>}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
        <Link href="/sobre-mi" className="mt-8 inline-flex min-h-11 items-center rounded-lg text-sm text-neutral-300 underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-teal-300">Conoce mi trayectoria y cómo trabajo</Link>
      </div>
    </section>
  );
}
