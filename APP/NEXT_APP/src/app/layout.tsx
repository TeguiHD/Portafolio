import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google"; // turbo
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import AnalyticsTracker from "@/components/AnalyticsTracker";

import MouseTrackerWrapper from "@/components/MouseTrackerWrapper";
import { SmoothScroll } from "@/components/ui/SmoothScroll";
import { BackgroundManager } from "@/modules/landing/layout/BackgroundManager";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Portafolio | Nicoholas Lopetegui",
  description:
    "Plataformas, automatizaciones y datos. Casos reales con impacto y un panel privado para cotizaciones.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
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
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased text-white selection:bg-accent-success/30`}>
        <SmoothScroll>
          <BackgroundManager />
          <ToastProvider>
            <MouseTrackerWrapper />
            <AnalyticsTracker />
            {children}
          </ToastProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}


