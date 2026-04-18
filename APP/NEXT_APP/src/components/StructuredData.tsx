/**
 * JSON-LD structured data for Google Rich Snippets.
 * Renders as a <script type="application/ld+json"> in the page.
 */
export function StructuredData() {
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Nicoholas Lopetegui",
    url: "https://nicoholas.dev",
    jobTitle: "Desarrollador Full Stack",
    description:
      "Desarrollador Full Stack que transforma problemas complejos en productos funcionales. Plataformas, automatizaciones y datos con impacto real.",
    sameAs: [
      "https://github.com/TeguiHD",
      "https://linkedin.com/in/nicoholas-lopetegui",
    ],
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

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Nicoholas Lopetegui | Desarrollador Full Stack",
    url: "https://nicoholas.dev",
    description:
      "Portafolio de Nicoholas Lopetegui — Desarrollador Full Stack. Plataformas, herramientas y automatizaciones.",
    author: {
      "@type": "Person",
      name: "Nicoholas Lopetegui",
    },
    inLanguage: "es",
  };

  const professionalServiceSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Nicoholas Lopetegui — Desarrollo Full Stack",
    url: "https://nicoholas.dev",
    description:
      "Servicios de desarrollo web Full Stack: plataformas, automatizaciones, APIs y arquitectura de software.",
    provider: {
      "@type": "Person",
      name: "Nicoholas Lopetegui",
    },
    areaServed: {
      "@type": "Country",
      name: "Chile",
    },
    serviceType: [
      "Desarrollo Web",
      "Desarrollo Full Stack",
      "Automatización",
      "Consultoría en Arquitectura de Software",
    ],
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      priceSpecification: {
        "@type": "PriceSpecification",
        priceCurrency: "CLP",
      },
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: "https://nicoholas.dev",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Herramientas",
        item: "https://nicoholas.dev/herramientas",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Blog",
        item: "https://nicoholas.dev/blog",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(professionalServiceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
