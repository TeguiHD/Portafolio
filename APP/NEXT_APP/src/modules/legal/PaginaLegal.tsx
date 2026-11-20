import type { ReactNode } from "react";
import { Esqueleto } from "@/modules/esqueleto/Esqueleto";
import "./legal.css";

export interface SeccionLegal { id: string; titulo: string; contenido: ReactNode }

/**
 * Plantilla de las páginas legales con el lenguaje del sitio: título grande, fecha fija de la última actualización real
 * (antes se calculaba con la fecha del día y siempre decía «este mes»), un índice al costado y secciones numeradas
 * sin barras de color ni cajas de aviso. Tema claro y oscuro. La materia se queda quieta en el marco mientras se lee.
 */
export function PaginaLegal({ titulo, actualizado, secciones, cierre }: { titulo: string; actualizado: string; secciones: SeccionLegal[]; cierre?: ReactNode }) {
    return (
        <Esqueleto>
            <main id="main-content" className="lg">
                <section className="lg-marco" data-forma="marco" aria-labelledby="lg-titulo">
                    <header className="lg-cab ancho">
                        <h1 id="lg-titulo">{titulo}<i>.</i></h1>
                        <p>Última actualización: {actualizado}</p>
                    </header>
                    <div className="lg-cuerpo ancho">
                        <nav className="lg-indice" aria-label="En esta página">
                            <ol>{secciones.map((s, k) => <li key={s.id}><a href={`#${s.id}`}><span>{k + 1}</span>{s.titulo}</a></li>)}</ol>
                        </nav>
                        <div className="lg-texto">
                            {secciones.map((s, k) => (
                                <section key={s.id} id={s.id} aria-labelledby={`${s.id}-t`}>
                                    <h2 id={`${s.id}-t`}><span>{k + 1}</span>{s.titulo}</h2>
                                    {s.contenido}
                                </section>
                            ))}
                            {cierre ? <div className="lg-cierre">{cierre}</div> : null}
                        </div>
                    </div>
                </section>
            </main>
        </Esqueleto>
    );
}
