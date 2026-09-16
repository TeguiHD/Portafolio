import { ArrowUpRight } from "lucide-react";
import { getPulseFinanceCached } from "@/modules/pulse/lib/finance-service";
import { getPulseDevActivityCached } from "@/modules/pulse/lib/dev-service";
import { getPulseNewsCached } from "@/modules/pulse/lib/news-service";
import { buildInsights } from "@/modules/pulse/lib/server-utils";
import type { PulseFinanceItem } from "@/modules/pulse/types";
import { Mercado } from "./Mercado";

/** Precio con el formato del país; si la moneda viene rara, se muestra el número a secas. */
function precio(item: PulseFinanceItem) {
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: item.currency,
      maximumFractionDigits: item.price > 1000 ? 0 : 2,
    }).format(item.price);
  } catch {
    return item.price.toLocaleString("es-CL");
  }
}

function Chispa({ valores, tono }: { valores: number[]; tono: string }) {
  if (valores.length < 2) return null;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const puntos = valores
    .map((v, i) => `${(i / (valores.length - 1)) * 60},${18 - ((v - min) / rango) * 16}`)
    .join(" ");
  return (
    <svg width="60" height="18" viewBox="0 0 60 18" aria-hidden="true" style={{ gridRow: "1 / span 2", gridColumn: 2, justifySelf: "end" }}>
      <polyline points={puntos} fill="none" stroke={tono} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export async function PanelMercado() {
  let items: PulseFinanceItem[] = [];
  let rancio = false;
  let fallo = false;
  try {
    const r = await getPulseFinanceCached();
    items = r.valor;
    rancio = r.rancio;
  } catch {
    fallo = true;
  }
  const fuentes = new Set(items.map((i) => i.source));

  return (
    <section className="pulso-panel" aria-labelledby="pulso-mercado">
      <div className="pulso-panel-cab">
        <h2 id="pulso-mercado">Mercado</h2>
        {!fallo && !rancio ? <span className="pulso-vivo">en vivo</span> : null}
      </div>
      {fallo ? (
        <p className="pulso-fallo">Las fuentes de mercado no responden ahora mismo. Vuelve en unos minutos.</p>
      ) : (
        <>
          {items.map((item) => (
            <div key={item.id} className="pulso-valor">
              <span className="simbolo">{item.symbol}</span>
              <span className="nombre">{item.name}</span>
              <span className="precio">{precio(item)}</span>
              <span className={`delta ${item.trend === "up" ? "sube" : item.trend === "down" ? "baja" : "plano"}`}>
                {item.changePercent >= 0 ? "+" : ""}
                {item.changePercent.toFixed(2)}%
              </span>
              <Chispa valores={item.sparkline} tono={item.trend === "down" ? "#f87171" : "var(--p-teal)"} />
            </div>
          ))}
          <Mercado />
          <p className="pulso-aviso">
            {rancio ? "Últimos valores guardados: la fuente no responde ahora. " : ""}
            {fuentes.size > 0 ? `Fuente: ${[...fuentes].join(", ")}.` : ""}
            {!fuentes.has("mindicador.cl") ? " Los indicadores chilenos no están disponibles en este momento." : ""}
          </p>
        </>
      )}
    </section>
  );
}

export async function PanelGitHub() {
  try {
    const { valor: dev, rancio } = await getPulseDevActivityCached();
    return (
      <section className="pulso-panel" aria-labelledby="pulso-github">
        <div className="pulso-panel-cab">
          <h2 id="pulso-github">GitHub</h2>
          <a className="pulso-enlace" href={dev.profileUrl} target="_blank" rel="noopener noreferrer">
            @{dev.username}
            <ArrowUpRight aria-hidden="true" width={14} height={14} />
          </a>
        </div>
        {dev.featuredRepos.slice(0, 3).map((repo) => (
          <a key={repo.id} className="pulso-repo" href={repo.url} target="_blank" rel="noopener noreferrer">
            <strong>{repo.name}</strong>
            <span>{repo.description}</span>
            <span className="pulso-repo-meta">
              <span>{repo.language}</span>
              <span>★ {repo.stars}</span>
            </span>
          </a>
        ))}
        <p className="pulso-aviso">
          {rancio ? "Datos guardados: GitHub limitó las consultas. " : ""}
          {dev.publicRepos} repositorios públicos · {dev.followers} seguidores
        </p>
      </section>
    );
  } catch {
    return (
      <section className="pulso-panel" aria-labelledby="pulso-github">
        <div className="pulso-panel-cab"><h2 id="pulso-github">GitHub</h2></div>
        <p className="pulso-fallo">GitHub no responde ahora mismo.</p>
      </section>
    );
  }
}

/** Cómo se lee cada postura, en una palabra. */
const POSTURAS: Record<NonNullable<import("@/modules/pulse/types").PulseInsight["postura"]>, string> = {
  acumular: "Acumular",
  mantener: "Mantener",
  "tomar-ganancias": "Tomar ganancias",
  esperar: "Esperar",
  vigilar: "Vigilar",
};

export async function PanelRadar() {
  const [noticias, finanzas, dev] = await Promise.allSettled([
    getPulseNewsCached(),
    getPulseFinanceCached(),
    getPulseDevActivityCached(),
  ]);
  const ideas = buildInsights({
    news: noticias.status === "fulfilled" ? noticias.value.valor : [],
    finance: finanzas.status === "fulfilled" ? finanzas.value.valor : [],
    dev: dev.status === "fulfilled" ? dev.value.valor : undefined,
  });
  if (ideas.length === 0) return null;
  return (
    <section className="pulso-panel" aria-labelledby="pulso-radar">
      <div className="pulso-panel-cab"><h2 id="pulso-radar">Radar</h2></div>
      {ideas.map((idea) => {
        const cuerpo = (
          <>
            <div className="pulso-idea-cab">
              {idea.sujeto ? <span className="pulso-idea-sujeto">{idea.sujeto}</span> : null}
              {idea.postura ? (
                <span className="pulso-idea-postura" data-postura={idea.postura}>
                  {POSTURAS[idea.postura]}
                  {idea.plazo ? <em>· {idea.plazo === "corto" ? "corto plazo" : "largo plazo"}</em> : null}
                </span>
              ) : null}
            </div>
            <strong>{idea.title}</strong>
            <span>{idea.detail}</span>
          </>
        );
        return idea.enlace ? (
          <a key={idea.id} className="pulso-idea" data-tono={idea.tone} href={idea.enlace} target="_blank" rel="noopener noreferrer">
            {cuerpo}
          </a>
        ) : (
          <div key={idea.id} className="pulso-idea" data-tono={idea.tone}>
            {cuerpo}
          </div>
        );
      })}
      <p className="pulso-aviso">
        Lectura automática de los datos del día (variación y media reciente). Es información, no una recomendación de
        inversión.
      </p>
    </section>
  );
}

/** Huesos con la forma final, para que al llegar los datos nada salte de sitio. */
export function EsqueletoPanel({ titulo, filas = 3 }: { titulo: string; filas?: number }) {
  return (
    <section className="pulso-panel" aria-busy="true">
      <div className="pulso-panel-cab"><h2>{titulo}</h2></div>
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="pulso-hueso" style={{ height: 44, marginTop: i ? 10 : 0, border: 0 }}>
          <div className="barra" />
        </div>
      ))}
    </section>
  );
}

export function EsqueletoNoticias() {
  return (
    <div aria-busy="true" aria-label="Cargando noticias">
      <div className="pulso-hueso" style={{ height: 118 }}><div className="barra" /></div>
      <div className="pulso-rejilla" style={{ marginTop: 24 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={i === 0 ? "pulso-hueso destacada" : "pulso-hueso"} style={i === 0 ? { gridColumn: "span 2" } : undefined}>
            <div className="pulso-hueso-img"><div className="barra" /></div>
            <div className="pulso-hueso-lin" style={{ width: "72%" }}><div className="barra" /></div>
            <div className="pulso-hueso-lin" style={{ width: "90%" }}><div className="barra" /></div>
            <div className="pulso-hueso-lin" style={{ width: "40%", marginBottom: 18 }}><div className="barra" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
