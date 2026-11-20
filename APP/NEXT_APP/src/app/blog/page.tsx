import type { Metadata } from "next";
import { Suspense } from "react";
import { Esqueleto } from "@/modules/esqueleto/Esqueleto";
import { CabeceraBlog } from "@/modules/landing/viva/Blog";
import { Capsula } from "@/modules/pulse/blog/Capsula";
import { EnGitHub } from "@/modules/pulse/blog/EnGitHub";
import { Indice } from "@/modules/pulse/blog/Indice";
import { Mercado } from "@/modules/pulse/blog/Mercado";
import { Radar } from "@/modules/pulse/blog/Radar";
import { PulseNotificationToggle } from "@/modules/pulse/components/PulseNotificationToggle";
import { getPulseNewsCached } from "@/modules/pulse/lib/news-service";
import "@/modules/pulse/blog/blog.css";
import { JsonLd } from "@/components/seo/JsonLd";
import { blogSchema, breadcrumbSchema } from "@/lib/seo/schemas";
import "@/modules/pulse/blog/pagina.css";

export const metadata: Metadata = {
  title: "Blog de seguridad, IA y desarrollo",
  description: "Titulares de seguridad, inteligencia artificial y desarrollo de fuentes oficiales, actualizados cada día, con UF, dólar y cripto, y lo que estoy construyendo.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    url: "/blog",
    title: "Blog de seguridad, IA y desarrollo",
    description: "Titulares de seguridad, inteligencia artificial y desarrollo de fuentes oficiales, actualizados cada día, con UF, dólar y cripto, y lo que estoy construyendo.",
    // Al definir openGraph propio se pierde la imagen general: se declara de nuevo.
    images: ["/opengraph-image"],
  },
};

/**
 * Los titulares se pintan en el servidor y llegan dentro del HTML: quien llega sin JavaScript (o un buscador) los lee
 * igual. El `Suspense` deja que la cabecera se pinte mientras la tanda de fuentes termina.
 */
async function SeccionIndice() {
  try {
    const { valor: items } = await getPulseNewsCached();
    return <Indice inicial={items} />;
  } catch {
    return (
      <section id="indice" className="plano" aria-label="Titulares">
        <div className="ancho"><p className="bp-vacio">Las fuentes no responden ahora mismo. Vuelve a cargar en un par de minutos.</p></div>
      </section>
    );
  }
}

/** /blog: el tambor como cabecera; debajo, todo lo de hoy, en lo que trabajo y el radar. */
export default function BlogPage() {
  return (
    // `portada` activa el lenguaje de secciones de la portada (títulos que suben, número fantasma, planos): el blog lo comparte.
    <Esqueleto portada>
      <main id="main-content" className="bp">
        <JsonLd schema={[blogSchema(), breadcrumbSchema([{ name: "Inicio", path: "" }, { name: "Blog", path: "/blog" }])]} />
        <CabeceraBlog
          acciones={<>
            <Capsula />
            <PulseNotificationToggle />
            <a className="enlace-ir" href="#indice">Todo lo de hoy ↓</a>
          </>}
          extra={<Mercado />}
        />
        {/* Sin Suspense: los titulares van en el HTML inicial y se ven también sin JavaScript (la cabecera ya
            espera las mismas noticias, así que no se pierde tiempo). */}
        <SeccionIndice />
        <Suspense fallback={null}>
          <EnGitHub />
        </Suspense>
        <Suspense fallback={null}>
          <Radar />
        </Suspense>
      </main>
    </Esqueleto>
  );
}
