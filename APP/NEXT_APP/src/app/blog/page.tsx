import type { Metadata } from "next";
import { Suspense } from "react";
import { Navbar } from "@/modules/landing/layout/Navbar";
import { FooterSection } from "@/modules/landing/sections/FooterSection";
import { Capsula } from "@/modules/pulse/blog/Capsula";
import { Noticias } from "@/modules/pulse/blog/Noticias";
import {
  EsqueletoNoticias,
  EsqueletoPanel,
  PanelGitHub,
  PanelMercado,
  PanelRadar,
} from "@/modules/pulse/blog/Paneles";
import { PulseNotificationToggle } from "@/modules/pulse/components/PulseNotificationToggle";
import { getPulseNewsCached } from "@/modules/pulse/lib/news-service";
import "@/modules/pulse/blog/blog.css";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Pulso digital: noticias de seguridad, IA y desarrollo reunidas de fuentes oficiales, con el mercado y la actividad técnica del día.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    url: "/blog",
    title: "Pulso digital — noticias, seguridad y mercado",
    description:
      "Noticias de seguridad, IA y desarrollo reunidas de fuentes oficiales, con el mercado y la actividad técnica del día.",
  },
};

/**
 * Las noticias se pintan en el servidor y llegan dentro del HTML: antes la página
 * salía vacía y todo empezaba después de hidratar, así que quien llegaba (o un
 * buscador) veía un titular y dos frases. El `Suspense` deja que la cabecera se pinte
 * mientras la tanda de fuentes termina.
 */
async function SeccionNoticias() {
  try {
    const { valor: items } = await getPulseNewsCached();
    return <Noticias inicial={items} />;
  } catch {
    return (
      <p className="pulso-fallo">
        Las fuentes no responden ahora mismo. Vuelve a cargar en un par de minutos.
      </p>
    );
  }
}

export default function BlogPage() {
  return (
    <div className="pulso">
      <Navbar />
      <main id="main-content" className="pulso-wrap">
        <header className="pulso-cab">
          <div>
            <p className="pulso-cejilla">Pulso digital</p>
            <h1>
              Noticias, seguridad y <span className="t">mercado en vivo</span>
            </h1>
            <p className="pulso-lede">
              Lo que publican CISA, NIST, OWASP, el CVE Program, los blogs de producto y la comunidad, reunido y
              ordenado en un solo sitio. Junto al mercado del día y la actividad técnica reciente.
            </p>
          </div>
          <Capsula />
        </header>

        <div className="pulso-cuerpo">
          <div>
            <Suspense fallback={<EsqueletoNoticias />}>
              <SeccionNoticias />
            </Suspense>
          </div>

          <aside className="pulso-lado" aria-label="Señales del día">
            <Suspense fallback={<EsqueletoPanel titulo="Mercado" />}>
              <PanelMercado />
            </Suspense>
            <Suspense fallback={<EsqueletoPanel titulo="GitHub" />}>
              <PanelGitHub />
            </Suspense>
            <Suspense fallback={<EsqueletoPanel titulo="Radar" filas={2} />}>
              <PanelRadar />
            </Suspense>
            <PulseNotificationToggle />
          </aside>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
