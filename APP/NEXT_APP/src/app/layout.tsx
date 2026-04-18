import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google"; // turbo
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { StructuredData } from "@/components/StructuredData";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import { PWARegister } from "@/modules/finance/components/PWAComponents";
import { VisualEnhancements } from "@/modules/landing/layout/VisualEnhancements";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap", // Ensure text is visible immediately while font loads (LCP fix)
  preload: true,
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: true,
});

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
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Nicoholas Lopetegui — Desarrollador Full Stack",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nicoholas Lopetegui | Desarrollador Full Stack",
    description:
      "Transformo problemas complejos en productos funcionales. Sin rodeos. Sin demoras.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: BASE_URL,
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

        {/* Resource hints for faster loading */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />

        {/* Browser compatibility warning - shown if JS fails to execute (old browsers/CSP block) */}
        <noscript>
          <style dangerouslySetInnerHTML={{
            __html: `
            .browser-warning {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
              color: white;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              padding: 2rem;
              font-family: system-ui, -apple-system, sans-serif;
              z-index: 99999;
            }
            .browser-warning h1 { font-size: 2rem; margin-bottom: 1rem; color: #f59e0b; }
            .browser-warning p { font-size: 1.1rem; margin-bottom: 1.5rem; max-width: 500px; line-height: 1.6; }
            .browser-warning a {
              background: #3b82f6;
              color: white;
              padding: 12px 24px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              transition: background 0.2s;
            }
            .browser-warning a:hover { background: #2563eb; }
          `}} />
        </noscript>
        <noscript>
          <div className="browser-warning">
            <h1>🔒 Navegador no compatible</h1>
            <p>
              Para acceder a la experiencia completa y segura de este sitio,
              necesitas un navegador moderno con JavaScript habilitado.
            </p>
            <p>
              Recomendamos actualizar a la última versión de Chrome, Firefox, Safari o Edge.
            </p>
            <a href="https://browsehappy.com/" target="_blank" rel="noopener noreferrer">
              Actualizar navegador
            </a>
          </div>
        </noscript>
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased text-white bg-[#0a0a0a] selection:bg-accent-success/30`}>
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
