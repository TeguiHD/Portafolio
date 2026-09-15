import { TOOL_COUNT } from "@/lib/tool-count";

// Alcance documentado en /sobre-mi; las métricas comerciales requieren
// fuente, periodo y autorización antes de publicarse.
export const casos = [
  {
    id: "floresdyd",
    title: "FloresDyD",
    category: "E-commerce a medida",
    description: "De un emprendimiento sin presencia digital a una tienda con identidad propia, compras online y gestión de entregas.",
    details: "Identidad visual, pagos, acceso con Google y carrito persistente para clientes y visitantes.",
    evidence: "Sitio público",
    href: "https://floresdyd.cl",
    cta: "Visitar tienda",
    external: true,
    image: "/images/projects/floresdyd.webp",
    imageAlt: "Portada real de la tienda Flores D&D con un arreglo floral.",
    visualLabel: "Captura del sitio",
    fondo: "linear-gradient(135deg,#3f1d2e,#7c2d12)",
  },
  {
    id: "otec",
    title: "Intranet y aula virtual OTEC",
    category: "Gestión de capacitación",
    description: "Una plataforma interna para organizar cursos, estudiantes y actividades de un organismo técnico de capacitación.",
    details: "Intranet, aula virtual y emisión de certificados de cursos y actividades.",
    evidence: "Sistema privado · alcance documentado",
    href: "/sobre-mi",
    cta: "Conocer el proyecto",
    external: false,
    image: "/images/projects/otec.webp",
    imageAlt: "Esquema del alcance OTEC: intranet, cursos, aula virtual y certificados.",
    visualLabel: "Esquema del proyecto",
    fondo: "linear-gradient(135deg,#0f2a3a,#134e4a)",
  },
  {
    id: "herramientas",
    title: "Herramientas de uso diario",
    category: "Producto propio",
    description: "Utilidades para resolver tareas de desarrollo y diseño: imágenes, códigos QR, datos y más.",
    details: `${TOOL_COUNT} herramientas disponibles. Abre una, prueba tus propios datos y comprueba el resultado.`,
    evidence: "Demo interactiva disponible",
    href: "/herramientas",
    cta: "Probar herramientas",
    external: false,
    image: "/images/projects/herramientas.webp",
    imageAlt: "Interfaz real del catálogo de herramientas con acceso a QR y realidad aumentada.",
    visualLabel: "Captura del producto",
    fondo: "linear-gradient(135deg,#1e1b4b,#0f172a)",
  },
] as const;

export type Caso = (typeof casos)[number];
