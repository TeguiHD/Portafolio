"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, Download, Newspaper } from "lucide-react";
import { ThrottledLink } from "@/components/ui/ThrottledLink";
import { PWAInstallBanner, usePWA } from "@/modules/finance/components/PWAComponents";
import type { PulseContextData } from "@/modules/pulse/types";
import { CapsuleTrigger } from "@/modules/pulse/components/CapsuleTrigger";
import { CommandCenter } from "@/modules/pulse/components/CommandCenter";
import { ModalContainer } from "@/modules/pulse/components/ModalContainer";
import { PulseNotificationToggle } from "@/modules/pulse/components/PulseNotificationToggle";

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("No fue posible cargar datos.");
  }

  return response.json() as Promise<T>;
}

export function DigitalPulseEntrySection() {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<PulseContextData | null>(null);
  const [newsCount, setNewsCount] = useState(0);
  const { isInstallable, installPWA } = usePWA();

  useEffect(() => {
    void readJson<{ data: PulseContextData }>("/api/pulse/context?auto=1&city=Santiago")
      .then((payload) => setContext(payload.data))
      .catch(() => undefined);

    void readJson<{ items: Array<unknown> }>("/api/pulse/news")
      .then((payload) => setNewsCount(payload.items.length))
      .catch(() => undefined);
  }, []);

  return (
    <>
      <section id="digital-pulse" className="relative px-4 py-24 sm:px-6">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.09),transparent_26%)]" />
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="mb-3 text-xs uppercase tracking-[0.32em] text-cyan-200/70">Blog evolutivo</p>
              <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Digital Pulse reemplaza el blog estático por un módulo vivo orientado a producto.
              </h2>
              <p className="mt-4 text-base leading-7 text-white/65 sm:text-lg">
                Noticias técnicas, vulnerabilidades, clima, finanzas y actividad de desarrollo unidos en una sola experiencia.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <ThrottledLink
                href="/blog"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white text-sm font-medium text-black px-4 py-2.5 transition hover:bg-white/90"
              >
                Abrir vista completa
                <ArrowUpRight className="h-4 w-4" />
              </ThrottledLink>
              {isInstallable ? (
                <button
                  type="button"
                  onClick={() => {
                    void installPWA();
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition hover:bg-white/[0.08]"
                >
                  <Download className="h-4 w-4" />
                  Instalar app
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.5fr,1fr]">
            <CapsuleTrigger context={context} newsCount={newsCount} onOpen={() => setOpen(true)} />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200">
                  <Newspaper className="h-5 w-5" />
                </div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">Fuentes</p>
                <p className="mt-2 text-xl font-semibold text-white">IA, Ciberseguridad, Desarrollo y Startups con fuentes curadas</p>
                <p className="mt-2 text-sm leading-6 text-white/58">
                  Claude, OpenAI, Qwen, Kimi, GLM, SeedDream, Gemini, Gamma y Sora; The Hacker News, CISA, NIST, OWASP y MITRE; GitHub Blog y Y Combinator.
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-200">
                  <Activity className="h-5 w-5" />
                </div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">Responsive + PWA</p>
                <p className="mt-2 text-xl font-semibold text-white">Instalable y mobile-first</p>
                <p className="mt-2 text-sm leading-6 text-white/58">
                  Diseño preparado para modal en home, ruta completa y experiencia instalable tipo app.
                </p>
              </div>

              <PulseNotificationToggle />
            </div>
          </div>
        </div>
      </section>

      <ModalContainer open={open} title="Digital Pulse / Command Center" onClose={() => setOpen(false)}>
        <CommandCenter mode="modal" visible={open} />
      </ModalContainer>
      <PWAInstallBanner />
    </>
  );
}
