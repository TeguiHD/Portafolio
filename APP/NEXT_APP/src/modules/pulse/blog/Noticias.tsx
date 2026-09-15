"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import type { PulseCategory, PulseNewsItem } from "@/modules/pulse/types";

const POR_PAGINA = 12;

const CATEGORIAS: { id: PulseCategory | "all"; nombre: string; tono: string }[] = [
  { id: "all", nombre: "Todo", tono: "var(--p-teal)" },
  { id: "ai", nombre: "IA", tono: "var(--p-vio)" },
  { id: "security", nombre: "Seguridad", tono: "var(--p-rojo)" },
  { id: "dev", nombre: "Desarrollo", tono: "var(--p-teal)" },
  { id: "startup", nombre: "Producto", tono: "var(--p-ambar)" },
];

const TONOS: Record<PulseCategory, string> = {
  ai: "var(--p-vio)",
  security: "var(--p-rojo)",
  dev: "var(--p-teal)",
  startup: "var(--p-ambar)",
  market: "var(--p-azul)",
};

const NOMBRES: Record<PulseCategory, string> = {
  ai: "IA",
  security: "Seguridad",
  dev: "Desarrollo",
  startup: "Producto",
  market: "Mercado",
};

/** Minutos de lectura a partir del texto que tenemos, redondeado hacia arriba. */
function minutos(item: PulseNewsItem) {
  const palabras = `${item.title} ${item.excerpt ?? ""}`.trim().split(/\s+/).length;
  return Math.max(1, Math.round(palabras / 90));
}

function dominio(item: PulseNewsItem) {
  if (item.sourceDomain) return item.sourceDomain;
  try {
    return new URL(item.url).hostname.replace(/^www\./, "");
  } catch {
    return item.source;
  }
}

/** ¿Trae el medio una foto de verdad, o solo el respaldo que dibuja el sitio? */
function tienePortada(item: PulseNewsItem) {
  return Boolean(item.imageUrl && !item.imageUrl.startsWith("/api/pulse/placeholder"));
}

/**
 * La caja de la portada. `Portada` es la caja misma (no algo dentro de ella) para que
 * el plano de color pueda centrar su contenido y la marca quede encima.
 */
function Portada({ item, className, children }: { item: PulseNewsItem; className: string; children?: React.ReactNode }) {
  const [roto, setRoto] = useState(false);
  // Sin foto del medio se pinta un plano de color con la fuente: meter el titular
  // dentro de la imagen lo dejaba escrito dos veces en la misma tarjeta.
  if (!tienePortada(item) || roto) {
    return (
      <div className={className} data-sin-foto="">
        <span className="pulso-sin-foto">
          <span className="fuente">{item.source}</span>
          <span className="cat">{NOMBRES[item.category]}</span>
        </span>
        {children}
      </div>
    );
  }
  return (
    <div className={className}>
      {/* Las portadas son de los propios medios: se piden sin referente y, si no llegan,
          la tarjeta se queda con el plano de color. */}
      <img
        src={item.imageUrl}
        alt={item.imageAlt || ""}
        width={1200}
        height={675}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setRoto(true)}
      />
      {children}
    </div>
  );
}

/** Ficha de lectura: lo que sabemos del artículo, sin traer la página ajena adentro. */
function Lector({ item, alCerrar }: { item: PulseNewsItem; alCerrar: () => void }) {
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    caja.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") alCerrar();
      if (e.key !== "Tab" || !caja.current) return;
      const foco = caja.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (foco.length === 0) return;
      const primero = foco[0];
      const ultimo = foco[foco.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", tecla);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = overflow;
      previo?.focus?.();
    };
  }, [alCerrar]);

  return (
    <div className="pulso-lector-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) alCerrar(); }}>
      <div
        ref={caja}
        className="pulso-lector"
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
        tabIndex={-1}
        style={{ "--tono": TONOS[item.category] } as CSSProperties}
      >
        <div style={{ position: "relative" }}>
          <Portada item={item} className="pulso-lector-img" />
          <button type="button" className="pulso-cerrar pulso-lector-cerrar" onClick={alCerrar} aria-label="Cerrar">
            <X aria-hidden="true" width={16} height={16} />
          </button>
        </div>
        <div className="pulso-lector-txt">
          <div className="pulso-lector-meta">
            <span style={{ color: TONOS[item.category] }}>{NOMBRES[item.category]}</span>
            <span className="punto" aria-hidden="true" />
            <span>{item.source}</span>
            <span className="punto" aria-hidden="true" />
            <span>{item.timestampLabel}</span>
            <span className="punto" aria-hidden="true" />
            <span>{minutos(item)} min</span>
          </div>
          <h2>{item.title}</h2>
          {item.excerpt ? <p>{item.excerpt}</p> : null}
          <div className="pulso-lector-pie">
            <p className="pulso-lector-nota">
              Resumen tomado del propio medio. El artículo completo se lee en su sitio, que es de quien lo escribió.
            </p>
            <a className="pulso-lector-ir" href={item.url} target="_blank" rel="noopener noreferrer nofollow">
              Leer en {dominio(item)}
              <ArrowUpRight aria-hidden="true" width={16} height={16} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Noticias({ inicial }: { inicial: PulseNewsItem[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<PulseCategory | "all">("all");
  const [orden, setOrden] = useState<"reciente" | "relevancia">("reciente");
  const [pagina, setPagina] = useState(1);
  const [abierto, setAbierto] = useState<PulseNewsItem | null>(null);
  const consulta = useDeferredValue(busqueda);
  const cima = useRef<HTMLDivElement>(null);

  const filtradas = useMemo(() => {
    const texto = consulta.trim().toLowerCase();
    const lista = inicial.filter((item) => {
      if (categoria !== "all" && item.category !== categoria) return false;
      if (!texto) return true;
      return `${item.title} ${item.excerpt ?? ""} ${item.source}`.toLowerCase().includes(texto);
    });
    if (orden === "relevancia") {
      return [...lista].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    }
    return [...lista].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  }, [inicial, consulta, categoria, orden]);

  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const actual = Math.min(pagina, paginas);
  const visibles = filtradas.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA);

  useEffect(() => {
    setPagina(1);
  }, [consulta, categoria, orden]);

  const irA = useCallback((n: number) => {
    setPagina(n);
    cima.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  return (
    <div ref={cima}>
      <div className="pulso-barra">
        <div className="pulso-buscar">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por título, resumen o fuente"
            aria-label="Buscar en las noticias"
          />
        </div>
        <div className="pulso-chips">
          <span className="pulso-chips-etiqueta" id="pulso-cat">Tema</span>
          {CATEGORIAS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="pulso-chip"
              aria-pressed={categoria === c.id}
              style={{ "--tono": c.tono } as CSSProperties}
              onClick={() => setCategoria(c.id)}
            >
              {c.nombre}
            </button>
          ))}
          <span className="pulso-chips-etiqueta orden">Orden</span>
          {(["reciente", "relevancia"] as const).map((o) => (
            <button key={o} type="button" className="pulso-chip" aria-pressed={orden === o} onClick={() => setOrden(o)}>
              {o === "reciente" ? "Lo último" : "Relevancia"}
            </button>
          ))}
        </div>
      </div>

      <div className="pulso-conteo">
        <p role="status">
          <b>{filtradas.length}</b> {filtradas.length === 1 ? "señal" : "señales"}
          {categoria === "all" ? "" : ` en ${CATEGORIAS.find((c) => c.id === categoria)?.nombre.toLowerCase()}`}
          {consulta.trim() ? ` para «${consulta.trim()}»` : ""}
          {paginas > 1 ? ` · página ${actual} de ${paginas}` : ""}
        </p>
        {(consulta || categoria !== "all") && (
          <button type="button" className="pulso-chip" onClick={() => { setBusqueda(""); setCategoria("all"); }}>
            Quitar filtros
          </button>
        )}
      </div>

      {visibles.length === 0 ? (
        <p className="pulso-vacio">Nada coincide con esa búsqueda. Prueba con otro término o quita los filtros.</p>
      ) : (
        <div className="pulso-rejilla">
          {visibles.map((item, i) => (
            <article
              key={item.id}
              className={i === 0 && actual === 1 && !consulta.trim() ? "pulso-tarjeta destacada" : "pulso-tarjeta"}
              style={{ "--tono": TONOS[item.category] } as CSSProperties}
            >
              <Portada item={item} className="pulso-tarjeta-img">
                <span className="pulso-marca">{NOMBRES[item.category]}</span>
              </Portada>
              <div className="pulso-tarjeta-txt">
                {/* El nombre accesible es el titular; el botón se extiende por toda la
                    tarjeta con su ::after, así que se puede pulsar donde sea. */}
                <h3>
                  <button type="button" className="pulso-tarjeta-btn" onClick={() => setAbierto(item)}>
                    {item.title}
                  </button>
                </h3>
                {item.excerpt ? <p>{item.excerpt}</p> : null}
                <div className="pulso-tarjeta-pie">
                  <span className="fuente">{item.source}</span>
                  <span className="punto" aria-hidden="true" />
                  <span>{item.timestampLabel}</span>
                  <span className="punto" aria-hidden="true" />
                  <span>{minutos(item)} min</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {paginas > 1 ? (
        <nav className="pulso-paginado" aria-label="Paginación de noticias">
          <button type="button" className="pulso-pag" onClick={() => irA(actual - 1)} disabled={actual === 1} aria-label="Página anterior">
            <ChevronLeft aria-hidden="true" width={16} height={16} />
          </button>
          {Array.from({ length: paginas }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className="pulso-pag"
              aria-current={n === actual ? "page" : undefined}
              aria-label={`Página ${n}`}
              onClick={() => irA(n)}
            >
              {n}
            </button>
          ))}
          <button type="button" className="pulso-pag" onClick={() => irA(actual + 1)} disabled={actual === paginas} aria-label="Página siguiente">
            <ChevronRight aria-hidden="true" width={16} height={16} />
          </button>
        </nav>
      ) : null}

      {abierto ? <Lector item={abierto} alCerrar={() => setAbierto(null)} /> : null}
    </div>
  );
}
