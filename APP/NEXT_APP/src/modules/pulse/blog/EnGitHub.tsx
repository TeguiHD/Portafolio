import type { CSSProperties } from "react";
import { Vista } from "@/modules/landing/viva/Vista";
import { getPulseDevActivityCached } from "@/modules/pulse/lib/dev-service";
import { FiguraGitHub } from "./FiguraGitHub";

const fecha = (iso: string) => new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", timeZone: "America/Santiago" }).format(new Date(iso)).replace(".", "");

/**
 * «En lo que trabajo»: la materia dibuja la marca de GitHub y al lado van los repositorios con actividad reciente.
 * Sin seguidores ni estrellas (decisión del 17-11: con 3 y 0 no suman confianza). Si GitHub no responde, no se muestra.
 */
export async function EnGitHub() {
    let repos;
    try {
        repos = (await getPulseDevActivityCached()).valor.featuredRepos.slice(0, 3);
    } catch {
        return null;
    }
    if (!repos.length) return null;
    return (
        <section id="github" className="plano" data-forma="figuras" data-ancla="#ancla-marca" aria-labelledby="bp-gh-titulo">
            <span className="fantasma" aria-hidden="true">git</span>
            <Vista className="ancho bp-gh">
                <FiguraGitHub />
                <div>
                    <h2 id="bp-gh-titulo"><span className="linea-r"><span>En lo que trabajo</span></span></h2>
                    <ul className="bp-repos" data-sube="" style={{ "--i": 1 } as CSSProperties}>
                        {repos.map((r) => (
                            <li key={r.id}>
                                <a href={r.url} target="_blank" rel="noopener noreferrer">
                                    <strong>{r.name}</strong>
                                    <span>{r.language || "Código"} · actualizado el {fecha(r.updatedAt)}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                    <a className="enlace-ir" href="https://github.com/TeguiHD" target="_blank" rel="noopener noreferrer" data-sube="" style={{ "--i": 2 } as CSSProperties}>Ver mi GitHub ↗</a>
                </div>
            </Vista>
        </section>
    );
}
