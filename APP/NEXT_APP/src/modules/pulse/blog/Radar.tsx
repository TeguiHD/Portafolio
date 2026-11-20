import type { CSSProperties } from "react";
import { Vista } from "@/modules/landing/viva/Vista";
import { getPulseDevActivityCached } from "@/modules/pulse/lib/dev-service";
import { getPulseFinanceCached } from "@/modules/pulse/lib/finance-service";
import { getPulseNewsCached } from "@/modules/pulse/lib/news-service";
import { buildInsights } from "@/modules/pulse/lib/server-utils";
import type { PulseInsight } from "@/modules/pulse/types";

const POSTURAS: Record<NonNullable<PulseInsight["postura"]>, string> = {
    acumular: "acumular",
    mantener: "mantener",
    "tomar-ganancias": "tomar ganancias",
    esperar: "esperar",
    vigilar: "vigilar",
};
/** El color de la postura (la palabra en mono, sin etiquetas con fondo): uno para fondo oscuro y otro, más hondo, para el claro. */
const TONOS: Record<NonNullable<PulseInsight["postura"]>, [string, string]> = {
    acumular: ["#34d399", "#047857"], mantener: ["#60a5fa", "#1d4ed8"], "tomar-ganancias": ["#fbbf24", "#b45309"], esperar: ["var(--mut)", "var(--mut)"], vigilar: ["#fb7185", "#be123c"],
};
const INGLES = /\b(the|and|of|to|for|with|is|in|on|from|how|new|your|are)\b/i;

/** Radar: las lecturas automáticas del día, dentro del anillo de materia. Sin lecturas, la sección no se muestra. */
export async function Radar() {
    const [noticias, finanzas, dev] = await Promise.allSettled([getPulseNewsCached(), getPulseFinanceCached(), getPulseDevActivityCached()]);
    const ideas = buildInsights({
        news: noticias.status === "fulfilled" ? noticias.value.valor : [],
        finance: finanzas.status === "fulfilled" ? finanzas.value.valor : [],
        dev: dev.status === "fulfilled" ? dev.value.valor : undefined,
    });
    if (ideas.length === 0) return null;
    return (
        <section id="radar" className="plano" data-forma="anillo" data-ancla="#ancla-anillo" aria-labelledby="bp-radar-titulo">
            <Vista className="ancho" id="ancla-anillo">
                <h2 id="bp-radar-titulo"><span className="linea-r"><span>Radar</span></span></h2>
                <div className="bp-lecturas" data-sube="" style={{ "--i": 1 } as CSSProperties}>
                    {ideas.map((idea) => {
                        const cuerpo = (
                            <>
                                <p className="bp-sujeto">
                                    {idea.sujeto ?? "Señal"}
                                    {idea.postura ? <b style={{ "--c": TONOS[idea.postura][0], "--c-claro": TONOS[idea.postura][1] } as CSSProperties}>{POSTURAS[idea.postura]}{idea.plazo ? <em> · {idea.plazo === "corto" ? "corto plazo" : "largo plazo"}</em> : null}</b> : null}
                                </p>
                                <p className="bp-que" lang={INGLES.test(idea.title) && !/[áéíóúñ¿¡]/i.test(idea.title) ? "en" : undefined}>{idea.title}</p>
                                <p className="bp-detalle">{idea.detail}</p>
                            </>
                        );
                        return idea.enlace
                            ? <a key={idea.id} className="bp-lectura" href={idea.enlace} target="_blank" rel="noopener noreferrer">{cuerpo}</a>
                            : <div key={idea.id} className="bp-lectura">{cuerpo}</div>;
                    })}
                </div>
                <p className="bp-aviso" data-sube="" style={{ "--i": 2 } as CSSProperties}>Lectura automática de los datos del día (variación y media reciente). Es información, no una recomendación de inversión.</p>
            </Vista>
        </section>
    );
}
