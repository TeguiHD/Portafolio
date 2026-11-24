import type { RespuestaIa, SitioMedido } from "@/lib/indice/calculos";
import { DIMENSIONES, type IdDimension } from "@/lib/indice/textos-dimensiones";

const nivel = (n: number) => (n >= 90 ? "bueno" : n >= 50 ? "medio" : "bajo");

/** La nota de una dimensión en un sitio, o null si no se pudo medir o no aplica. */
export function notaDimension(s: SitioMedido, id: IdDimension): number | null {
    if (!s.dim) return null;
    if (id === "velocidad") return s.dim.velocidad;
    return s.dim[id]?.nota ?? null;
}

/** Por qué una dimensión no tiene nota en este sitio. */
function sinNota(s: SitioMedido, id: IdDimension): string {
    if (id === "correo") return s.correoNoAplica ? `No aplica: el sitio cuelga de ${s.correoNoAplica}, un dominio que comparte con otros organismos.` : "No se pudo consultar el DNS del dominio.";
    if (id === "directorios") return "No aplica: la institución no está en el Portal de Transparencia ni en el SINIM.";
    if (id === "privacidad") return "Sin dato: Lighthouse no pudo cargar la portada.";
    return "Sin dato: el servidor no entregó la portada a la revisión sin navegador (respondió con error o con un bloqueo de robots), así que no se pudo leer.";
}

/**
 * Las siete dimensiones de un sitio, cada una con su nota y, al abrirla, sus controles: qué cumple y, lo que no,
 * por qué importa y cómo se arregla. Sin JavaScript (details nativos).
 */
export function DimensionesSitio({ s }: { s: SitioMedido }) {
    if (!s.dim) return null;
    return (
        <ul className="ix-dims">
            {DIMENSIONES.map((d) => {
                const nota = notaDimension(s, d.id);
                const c = d.id === "velocidad" ? null : (s.dim![d.id]?.c as Record<string, boolean> | undefined);
                const controles = d.controles.filter((k) => c && k.id in c);
                return (
                    <li key={d.id}>
                        <details className="ix-dim" open={d.id === "velocidad" ? undefined : nota !== null && nota < 50 ? true : undefined}>
                            <summary>
                                <span className="ix-dim-nombre">{d.nombre}</span>
                                {nota === null ? <span className="ix-dim-sin">—</span> : <b data-nivel={nivel(nota)}>{nota}</b>}
                                {nota !== null && <meter min={0} max={100} low={50} high={90} optimum={100} value={nota} aria-label={`${d.nombre}: ${nota} de 100`} />}
                            </summary>
                            <div className="ix-dim-cuerpo">
                                <p className="ix-nota">{d.queMide}</p>
                                {nota === null && <p className="ix-nota">{sinNota(s, d.id)}</p>}
                                {d.id === "velocidad" && typeof s.antes === "number" && (
                                    <p className="ix-nota">En noviembre de 2026 tuvo {s.antes}: {s.dim!.velocidad! > s.antes ? `subió ${s.dim!.velocidad! - s.antes}` : s.dim!.velocidad! < s.antes ? `bajó ${s.antes - s.dim!.velocidad!}` : "igual"}.</p>
                                )}
                                {controles.length > 0 && (
                                    <ul className="ix-controles">
                                        {controles.map((k) => {
                                            const ok = c![k.id];
                                            return (
                                                <li key={k.id} data-ok={ok ? "si" : "no"}>
                                                    <span className="ix-marca" aria-hidden="true" />
                                                    <div>
                                                        <p><b>{k.nombre}</b> <span className="ix-estado">{ok ? "Cumple" : "No cumple"}</span></p>
                                                        {!ok && <p className="ix-arreglo">{k.porQue} {k.arreglo}</p>}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                                {d.id === "ia" && s.dim!.ia && (
                                    <p className="ix-nota">
                                        Robots de entrenamiento (GPTBot, ClaudeBot, Google-Extended): {s.dim!.ia.entrenamiento ? "los deja entrar" : "cierra al menos uno"} (se informa, no resta).
                                        {s.dim!.ia.llms ? " Publica un llms.txt." : ""}
                                    </p>
                                )}
                                {d.id === "privacidad" && s.dim!.privacidad && s.dim!.privacidad.nombres.length > 0 && (
                                    <p className="ix-nota">Servicios que rastrean desde la portada: {s.dim!.privacidad.nombres.join(", ")}.</p>
                                )}
                                {d.fuentes.length > 0 && (
                                    <p className="ix-fuentes">Regla: {d.fuentes.map((f, i) => <span key={f.url}>{i ? ", " : ""}<a href={f.url} rel="noopener" target="_blank">{f.texto}</a></span>)}.</p>
                                )}
                            </div>
                        </details>
                    </li>
                );
            })}
        </ul>
    );
}

/** «Lo que responde la IA»: qué contesta Claude cuando le preguntan por el sitio oficial, de memoria y buscando. */
export function RespuestaIaSitio({ s }: { s: SitioMedido }) {
    if (!s.ia) return null;
    const fila = (titulo: string, x: RespuestaIa | null) => (
        <div>
            <dt>{titulo}</dt>
            <dd data-ok={x?.ok ? "si" : "no"}>
                {x ? <><span className="ix-ia-r">{x.r || "no dio una dirección"}</span> <span className="ix-estado">{x.ok ? "Acierta" : "No acierta"}</span></> : "—"}
            </dd>
        </div>
    );
    return (
        <dl className="ix-ia">
            {fila("De memoria", s.ia.memoria)}
            {fila("Buscando en internet", s.ia.busqueda)}
        </dl>
    );
}
