/**
 * Constructores de JSON-LD. Cada función devuelve un objeto schema.org
 * listo para serializar; el emisor (`@/components/seo/JsonLd`) se encarga
 * del nonce de CSP.
 *
 * Los datos salen del registro de herramientas y de las constantes del
 * sitio: no se declara aquí nada que no sea verificable en el repositorio.
 */
import { getToolSeo } from "./tools-content";
import { SITE_URL, SITE_NAME } from "./metadata";
import { getToolCopy } from "./tools-copy";

export type JsonLdObject = Record<string, unknown>;

const CONTEXT = "https://schema.org";

/** Perfiles públicos verificables del autor. */
const SAME_AS = [
    "https://github.com/TeguiHD",
    "https://linkedin.com/in/nicoholas-lopetegui",
];

export function personSchema(): JsonLdObject {
    return {
        "@context": CONTEXT,
        "@type": "Person",
        "@id": `${SITE_URL}/#person`,
        name: SITE_NAME,
        // La página de autor es el ancla E-A-T: Person apunta ahí, no a la home.
        url: `${SITE_URL}/sobre-mi`,
        jobTitle: "Desarrollador Full Stack",
        description:
            "Desarrollador Full Stack que transforma problemas complejos en productos funcionales. Plataformas, automatizaciones y datos con impacto real.",
        // Credencial confirmada por el titular el 2026-08-05. Sin institución
        // declarada: no se afirma alma mater porque no fue verificada.
        hasCredential: {
            "@type": "EducationalOccupationalCredential",
            credentialCategory: "degree",
            name: "Ingeniero en Informática",
        },
        // Datos públicos del propio sitio: el correo de contacto y el país (no se declara ciudad: no está publicada).
        email: "mailto:contacto@nicoholas.dev",
        address: { "@type": "PostalAddress", addressCountry: "CL" },
        sameAs: SAME_AS,
        knowsAbout: [
            "Next.js",
            "React",
            "TypeScript",
            "Node.js",
            "PostgreSQL",
            "Docker",
            "Desarrollo Web Full Stack",
            "Automatización",
            "Arquitectura de Software",
        ],
    };
}

export function websiteSchema(): JsonLdObject {
    return {
        "@context": CONTEXT,
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: `${SITE_NAME} | Desarrollador Full Stack`,
        url: SITE_URL,
        description:
            "Portafolio de Nicoholas Lopetegui — Desarrollador Full Stack. Plataformas, herramientas y automatizaciones.",
        author: { "@id": `${SITE_URL}/#person` },
        inLanguage: "es",
    };
}

export function professionalServiceSchema(): JsonLdObject {
    return {
        "@context": CONTEXT,
        "@type": "ProfessionalService",
        "@id": `${SITE_URL}/#servicio`,
        name: `${SITE_NAME} — Desarrollo web a medida`,
        url: SITE_URL,
        description:
            "Desarrollo web a medida: tiendas en línea, sistemas internos e intranets, herramientas web y automatizaciones.",
        provider: { "@id": `${SITE_URL}/#person` },
        email: "mailto:contacto@nicoholas.dev",
        address: { "@type": "PostalAddress", addressCountry: "CL" },
        areaServed: { "@type": "Country", name: "Chile" },
        availableLanguage: "es",
        sameAs: SAME_AS,
        // Lo que ofrece la portada (el selector «Tiendas y sitios / Sistemas internos / Herramientas») y lo que ya figuraba.
        serviceType: [
            "Tiendas en línea y sitios web a medida",
            "Sistemas internos e intranets",
            "Herramientas web",
            "Automatización",
            "Desarrollo Full Stack",
        ],
    };
}

/**
 * Los proyectos de la portada como lista de trabajos. Solo lo publicado: nombre, tipo, descripción y, si es público, su URL.
 * La intranet OTEC es privada: va sin URL propia.
 */
export function portafolioSchema(casos: readonly { title: string; category: string; description: string; href: string; external: boolean }[]): JsonLdObject {
    return {
        "@context": CONTEXT,
        "@type": "ItemList",
        "@id": `${SITE_URL}/#proyectos`,
        name: "Proyectos",
        itemListElement: casos.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
                "@type": "CreativeWork",
                name: c.title,
                genre: c.category,
                description: c.description,
                creator: { "@id": `${SITE_URL}/#person` },
                ...(c.external ? { url: c.href } : c.href.startsWith("/herramientas") ? { url: `${SITE_URL}${c.href}` } : {}),
            },
        })),
    };
}

/** El blog: una página de colección (titulares de fuentes externas enlazadas, más el mercado y la actividad en GitHub). */
export function blogSchema(): JsonLdObject {
    return {
        "@context": CONTEXT,
        "@type": "CollectionPage",
        "@id": `${SITE_URL}/blog#pagina`,
        name: "Blog: seguridad, IA y desarrollo",
        url: `${SITE_URL}/blog`,
        inLanguage: "es",
        description: "Titulares de seguridad, inteligencia artificial y desarrollo de fuentes oficiales, con el mercado del día y la actividad en GitHub.",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        author: { "@id": `${SITE_URL}/#person` },
    };
}

export interface BreadcrumbCrumb {
    /** Texto visible de la miga. */
    name: string;
    /** Ruta relativa, sin dominio y sin barra final. La raíz es "". */
    path: string;
}

export type BreadcrumbTrail = BreadcrumbCrumb[];

export function breadcrumbSchema(trail: BreadcrumbTrail): JsonLdObject {
    if (trail.length === 0) {
        throw new Error(
            "[seo] breadcrumbSchema recibió una ruta vacía: un BreadcrumbList sin " +
                "itemListElement es inválido para schema.org."
        );
    }

    return {
        "@context": CONTEXT,
        "@type": "BreadcrumbList",
        itemListElement: trail.map((crumb, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: crumb.name,
            item: `${SITE_URL}${crumb.path}`,
        })),
    };
}

/**
 * Ruta de migas canónica de una herramienta: Inicio > Herramientas > <tool>.
 * Se usa tanto para la UI visible como para el JSON-LD, de modo que no puedan
 * divergir.
 */
export function toolBreadcrumbTrail(slug: string): BreadcrumbTrail {
    const entry = getToolSeo(slug);
    return [
        { name: "Inicio", path: "" },
        { name: "Herramientas", path: "/herramientas" },
        { name: entry.h1, path: `/herramientas/${entry.slug}` },
    ];
}

/** Ruta de migas del hub de herramientas. */
export const TOOLS_HUB_TRAIL: BreadcrumbTrail = [
    { name: "Inicio", path: "" },
    { name: "Herramientas", path: "/herramientas" },
];

export function softwareApplicationSchema(slug: string): JsonLdObject {
    const entry = getToolSeo(slug);

    return {
        "@context": CONTEXT,
        "@type": "SoftwareApplication",
        name: entry.h1,
        url: `${SITE_URL}/herramientas/${entry.slug}`,
        description: entry.description,
        applicationCategory: "UtilitiesApplication",
        // Se usa desde el navegador, sin instalación. No se afirma "sin backend":
        // dns y regex llaman a endpoints propios, así que esa promesa sería falsa
        // en un schema compartido por las 29.
        operatingSystem: "Any",
        browserRequirements: "Requiere JavaScript",
        inLanguage: "es",
        author: { "@id": `${SITE_URL}/#person` },
        // Gratis y sin registro: es el diferenciador real frente a la competencia.
        offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "CLP",
        },
    };
}

/**
 * FAQPage a partir del contenido editorial de una herramienta.
 *
 * Devuelve null si la herramienta todavía no tiene FAQ escritas: un FAQPage
 * con `mainEntity: []` es schema inválido, y emitirlo vacío es peor que no
 * emitirlo.
 */
export function faqPageSchema(slug: string): JsonLdObject | null {
    const copy = getToolCopy(slug);
    if (!copy || copy.faq.length === 0) return null;

    return {
        "@context": CONTEXT,
        "@type": "FAQPage",
        mainEntity: copy.faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
            },
        })),
    };
}
