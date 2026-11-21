import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { FaviconVivo } from "@/components/brand/FaviconVivo";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { StructuredData } from "@/components/StructuredData";
import { TemaInicial } from "@/modules/esqueleto/TemaInicial";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import { PWARegister } from "@/components/pwa/PWAComponents";
import { AvisoVersion } from "@/components/pwa/AvisoVersion";

const BASE_URL = "https://nicoholas.dev";

// Fuentes autoalojadas por Next (sin peticiones a Google en tiempo de ejecución,
// respaldo con métricas ajustadas para evitar saltos de maquetación).
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
// La mono no se precarga a propósito: no es la letra del párrafo que marca el LCP y,
// compitiendo por el ancho de banda en ese momento, lo retrasaba 0,7 s en móvil. Llega
// un instante después y el texto que la usa (terminal, etiquetas, firma) la adopta.
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], display: "swap", variable: "--font-mono", preload: false });

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
    default: "Nicoholas Lopetegui | Desarrollador Full Stack en Chile",
    template: "%s | Nicoholas Lopetegui",
  },
  description:
    "Desarrollador full stack en Chile: tiendas en línea, sistemas internos y herramientas web a medida. Además, 29 herramientas gratis y sin registro.",
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
    title: "Nicoholas Lopetegui | Desarrollador Full Stack en Chile",
    description:
      "Tiendas en línea, sistemas internos y herramientas web a medida. Además, 29 herramientas gratis y sin registro.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nicoholas Lopetegui | Desarrollador Full Stack en Chile",
    description:
      "Tiendas en línea, sistemas internos y herramientas web a medida. Además, 29 herramientas gratis y sin registro.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "nicoholas.dev", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icon.svg?v=5", type: "image/svg+xml" },
      // Para la pestaña basta uno chico; los de 192 y 512 los pide el manifest (antes cada visita bajaba el de 192: 35 KB).
      { url: "/icon-32.png?v=5", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/apple-icon.png?v=5", type: "image/png", sizes: "180x180" },
    ],
  },
};

/** La barra del sistema (y la de la app instalada) con el fondo del tema: claro u oscuro según el sistema. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f4f0" },
    { media: "(prefers-color-scheme: dark)", color: "#08090d" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await bootstrapPulseNotifier();

  return (
    <html lang="es" data-tema="oscuro" data-scroll-behavior="smooth" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <TemaInicial />
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
        {/* El icono de la pestaña respira y sigue el color de la sección; si te vas, se apaga. */}
        <FaviconVivo />
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
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold focus:text-sm"
        >
          Saltar al contenido principal
        </a>
        <ToastProvider>
          <PWARegister />
          <AvisoVersion />
          <AnalyticsTracker />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
