"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { EVENTO_ANCLA } from "../portada/anclas";

type DeferredSectionComponent = ComponentType<Record<string, never>>;

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
  };
};

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const SECTION_DEFINITIONS = {
  "tools-belt": {
    anchorId: "tools-belt",
    minHeightClass: "min-h-[72vh]",
    load: async () => (await import("./ToolsBeltSection")).ToolsBeltSection,
  },
  vault: {
    anchorId: "vault",
    minHeightClass: "min-h-[72vh]",
    load: async () => (await import("../portada/secciones/Mazo")).Mazo,
  },
  tecnologias: {
    anchorId: "tecnologias",
    minHeightClass: "min-h-[66vh]",
    load: async () => (await import("../portada/secciones/Orbita")).Orbita,
  },
  architecture: {
    anchorId: "architecture",
    minHeightClass: "min-h-[62vh]",
    load: async () => (await import("../portada/secciones/Centinela")).Centinela,
  },
  contact: {
    anchorId: "contact",
    minHeightClass: "min-h-[70vh]",
    load: async () => (await import("./ContactSection")).ContactSection,
  },

} as const;

export type DeferredLandingSectionId = keyof typeof SECTION_DEFINITIONS;

const EARLY_PRELOAD_SECTIONS: ReadonlySet<DeferredLandingSectionId> = new Set([
  "tools-belt",
]);

interface DeferredLandingSectionProps {
  section: DeferredLandingSectionId;
}

export function DeferredLandingSection({ section }: DeferredLandingSectionProps) {
  const definition = SECTION_DEFINITIONS[section];
  const [shouldLoad, setShouldLoad] = useState(false);
  const [LoadedSection, setLoadedSection] =
    useState<DeferredSectionComponent | null>(null);
  const placeholderRef = useRef<HTMLElement | null>(null);

  /** Verdadero cuando alguien ha pedido venir aquí: hay que cargar y luego situarse. */
  const [pedida, setPedida] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mirar = () => {
      if (window.location.hash === `#${definition.anchorId}`) {
        setPedida(true);
        setShouldLoad(true);
      }
    };
    // Al montar (llegada directa con ancla), al volver atrás, y sobre todo cuando la
    // barra lo pide: la navegación de Next usa `pushState` y no dispara `hashchange`.
    mirar();
    const porAviso = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== definition.anchorId) return;
      setPedida(true);
      setShouldLoad(true);
    };
    window.addEventListener("hashchange", mirar);
    window.addEventListener("popstate", mirar);
    window.addEventListener(EVENTO_ANCLA, porAviso);
    return () => {
      window.removeEventListener("hashchange", mirar);
      window.removeEventListener("popstate", mirar);
      window.removeEventListener(EVENTO_ANCLA, porAviso);
    };
  }, [definition.anchorId]);

  // Ya cargada, hay que volver a situarla, y varias veces: el hueco y la sección de
  // verdad no miden igual, y las secciones de más arriba siguen creciendo según cargan,
  // empujando el destino hacia abajo. Se insiste un par de segundos y se suelta al
  // primer gesto, para no pelearse con quien decide irse a otro sitio.
  useEffect(() => {
    if (!LoadedSection || typeof window === "undefined" || !pedida) return;
    let intentos = 0;
    let reloj: number | null = null;
    const gestos = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    const soltar = () => {
      if (reloj !== null) window.clearTimeout(reloj);
      reloj = null;
      gestos.forEach((g) => window.removeEventListener(g, soltar));
    };
    const situar = () => {
      document.getElementById(definition.anchorId)?.scrollIntoView({ block: "start" });
      if (++intentos >= 9) return soltar();
      reloj = window.setTimeout(situar, 220);
    };
    gestos.forEach((g) => window.addEventListener(g, soltar, { passive: true }));
    situar();
    return soltar;
  }, [LoadedSection, pedida, definition.anchorId]);

  useEffect(() => {
    if (shouldLoad || LoadedSection) return;

    const node = placeholderRef.current;
    if (!node) return;

    const rootMargin =
      section === "tools-belt"
        ? "460px 0px 460px 0px"
        : "280px 0px 280px 0px";

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
            break;
          }
        }
      },
      {
        rootMargin,
        threshold: 0.01,
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [LoadedSection, section, shouldLoad]);

  useEffect(() => {
    if (LoadedSection || !EARLY_PRELOAD_SECTIONS.has(section)) return;
    if (typeof window === "undefined") return;

    const saveData = Boolean(
      (navigator as NavigatorWithConnection).connection?.saveData
    );
    if (saveData) return;

    let timeoutHandle: number | null = null;
    let idleHandle: number | null = null;
    let cancelled = false;

    const idleWindow = window as IdleWindow;
    const preload = () => {
      if (cancelled) return;
      definition.load().catch(() => undefined);
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleHandle = idleWindow.requestIdleCallback(() => preload(), {
        timeout: 1600,
      });
    } else {
      timeoutHandle = window.setTimeout(() => preload(), 450);
    }

    return () => {
      cancelled = true;

      if (
        idleHandle !== null &&
        typeof idleWindow.cancelIdleCallback === "function"
      ) {
        idleWindow.cancelIdleCallback(idleHandle);
      }

      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, [LoadedSection, definition, section]);

  useEffect(() => {
    if (!shouldLoad || LoadedSection) return;

    let cancelled = false;
    let timeoutHandle: number | null = null;
    let idleHandle: number | null = null;
    const idleWindow = window as IdleWindow;

    const loadSection = () => {
      definition
        .load()
        .then((component) => {
          if (!cancelled) {
            setLoadedSection(() => component as DeferredSectionComponent);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setShouldLoad(false);
          }
        });
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleHandle = idleWindow.requestIdleCallback(() => loadSection(), {
        timeout: 1200,
      });
    } else {
      timeoutHandle = window.setTimeout(() => loadSection(), 120);
    }

    return () => {
      cancelled = true;

      if (
        idleHandle !== null &&
        typeof idleWindow.cancelIdleCallback === "function"
      ) {
        idleWindow.cancelIdleCallback(idleHandle);
      }

      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, [LoadedSection, definition, shouldLoad]);

  if (LoadedSection) {
    return <LoadedSection />;
  }

  return (
    <section
      id={definition.anchorId}
      ref={placeholderRef}
      aria-busy="true"
      className={`relative ${definition.minHeightClass} px-4 sm:px-6`}
    >
      <div className="mx-auto max-w-7xl py-24 md:py-32">
        <div className="h-9 w-52 rounded-lg bg-white/5 motion-safe:animate-pulse" />
        <div className="mt-6 h-4 w-full max-w-2xl rounded bg-white/5 motion-safe:animate-pulse" />
        <div className="mt-3 h-4 w-full max-w-xl rounded bg-white/5 motion-safe:animate-pulse" />
      </div>
    </section>
  );
}
