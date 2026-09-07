import Link from "next/link";
import Image from "next/image";
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
    image: "/images/projects/floresdyd.webp",
    imageAlt: "Portada real de la tienda Flores D&D con un arreglo floral.",
    visualLabel: "Captura del sitio",
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
    image: "/images/projects/otec.webp",
    imageAlt: "Esquema del alcance OTEC: intranet, cursos, aula virtual y certificados.",
    visualLabel: "Esquema del proyecto",
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
    image: "/images/projects/herramientas.webp",
    imageAlt: "Interfaz real del catálogo de herramientas con acceso a QR y realidad aumentada.",
    visualLabel: "Captura del producto",
  },
];

export function ShowcaseSection() {
  return (
    <section id="casos" aria-labelledby="projects-title" className="relative px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-7xl">
        <p className="mb-4 text-sm font-medium text-teal-300">Trabajo que puedes conocer</p>
        <h2 id="projects-title" className="text-3xl font-bold text-white md:text-5xl">De la necesidad al producto</h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-400">Conoce qué construí, para qué sirve y qué puedes explorar en cada proyecto.</p>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {projects.map((project) => {
            const Icon = project.icon;
            return (
              <article key={project.title} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c131d] transition-colors hover:border-teal-300/30">
                <div className="relative aspect-[8/5] overflow-hidden border-b border-white/10">
                  <Image src={project.image} alt={project.imageAlt} fill sizes="(min-width: 1280px) 400px, (min-width: 1024px) 31vw, (min-width: 640px) 90vw, 100vw" className="object-cover" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0c131d] via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-4 rounded-full border border-white/15 bg-[#07090f]/90 px-3 py-1 text-[10px] text-slate-200">{project.visualLabel}</span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-teal-200"><Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />{project.category}</p>
                  <h3 className="mb-3 mt-2 text-xl font-semibold text-white">{project.title}</h3>
                  <p className="text-sm leading-relaxed text-neutral-300">{project.description}</p>
                  <p className="mb-4 mt-2 text-xs leading-relaxed text-slate-400">{project.details}</p>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-white/10 pt-3">
                    <p className="text-[10px] text-slate-400">{project.evidence}</p>
                    <Link href={project.href} target={project.external ? "_blank" : undefined} rel={project.external ? "noopener noreferrer" : undefined}
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg text-xs font-semibold text-teal-200 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-teal-300">
                      {project.cta}<ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                      {project.external && <span className="sr-only">(se abre en otra pestaña)</span>}
                    </Link>
                  </div>
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
