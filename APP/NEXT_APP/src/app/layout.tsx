import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { StructuredData } from "@/components/StructuredData";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import { PWARegister } from "@/modules/finance/components/PWAComponents";
import { VisualEnhancements } from "@/modules/landing/layout/VisualEnhancements";

const BASE_URL = "https://nicoholas.dev";

async function bootstrapPulseNotifier() {
  if (process.env.PULSE_PUSH_BOOT !== "true") {
    return;
  }

  const { startPulseNotifier } = await import("@/modules/pulse/lib/notifier");
  startPulseNotifier();
}

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Nicoholas Lopetegui | Desarrollador Full Stack",
    template: "%s | Nicoholas Lopetegui",
  },
  description:
    "Desarrollador Full Stack que transforma problemas complejos en productos funcionales. Plataformas, automatizaciones y datos con impacto real.",
  keywords: [
    "desarrollador full stack",
    "desarrollo web",
    "Next.js",
    "React",
    "TypeScript",
    "automatización",
    "Chile",
    "portafolio",
  ],
  authors: [{ name: "Nicoholas Lopetegui", url: BASE_URL }],
  creator: "Nicoholas Lopetegui",
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: BASE_URL,
    siteName: "Nicoholas Lopetegui",
    title: "Nicoholas Lopetegui | Desarrollador Full Stack",
    description:
      "Transformo problemas complejos en productos funcionales. Plataformas, automatizaciones y datos con impacto real.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nicoholas Lopetegui | Desarrollador Full Stack",
    description:
      "Transformo problemas complejos en productos funcionales. Sin rodeos. Sin demoras.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await bootstrapPulseNotifier();

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Structured Data for Google Rich Snippets */}
        <StructuredData />

        {/*
          Aviso de JavaScript deshabilitado.

          Antes esto era un overlay `position: fixed` a pantalla completa que
          tapaba el sitio entero. Googlebot ejecuta JS y lo ignoraba, pero los
          crawlers de modelos de lenguaje (GPTBot, ClaudeBot, PerplexityBot,
          CCBot...) no renderizan JavaScript: para ellos el sitio ENTERO era ese
          mensaje. Ahora es una franja que no oculta nada, así que el contenido
          servido sigue siendo legible sin JS.
        */}
        <noscript>
          <style dangerouslySetInnerHTML={{
            __html: `
            .browser-warning {
              position: relative;
              background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
              border-bottom: 1px solid rgba(245, 158, 11, 0.35);
              color: white;
              display: flex;
              flex-wrap: wrap;
              align-items: center;
              justify-content: center;
              gap: 0.75rem;
              text-align: center;
              padding: 0.75rem 1rem;
              font-family: system-ui, -apple-system, sans-serif;
              font-size: 0.9rem;
              line-height: 1.5;
            }
            .browser-warning .browser-warning-title { font-weight: 700; color: #f59e0b; margin: 0; }
            .browser-warning p { margin: 0; max-width: 60ch; }
            .browser-warning a {
              background: #3b82f6;
              color: white;
              padding: 6px 14px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              white-space: nowrap;
            }
          `}} />
        </noscript>
      </head>
      <body className="font-sans antialiased text-white bg-[#0a0a0a] selection:bg-accent-success/30">
        {/* El aviso vive en el body: <head> solo admite link/style/meta dentro
            de <noscript>, y un <div> ahí lo expulsa el parser. */}
        <noscript>
          <div className="browser-warning" role="status">
            <p className="browser-warning-title">JavaScript deshabilitado</p>
            <p>
              Las herramientas interactivas necesitan JavaScript. El contenido de
              esta página se puede leer igualmente.
            </p>
            <a href="https://browsehappy.com/" target="_blank" rel="noopener noreferrer">
              Cómo activarlo
            </a>
          </div>
        </noscript>
        {/* Skip to content — accessibility (WCAG 2.4.1) */}
        <a
          href="#hero"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold focus:text-sm"
        >
          Saltar al contenido principal
        </a>
        <VisualEnhancements />
        <ToastProvider>
          <PWARegister />
          <AnalyticsTracker />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
