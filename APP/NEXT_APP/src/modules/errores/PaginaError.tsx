"use client";

import { useEffect, type ReactNode } from "react";
import { Esqueleto } from "@/modules/esqueleto/Esqueleto";
import { useMateria } from "@/modules/materia/Materia";
import "./errores.css";

/** Le pide a la materia que escriba el código del error en su ancla. */
function Escribir({ texto }: { texto: string }) {
    const motor = useMateria();
    useEffect(() => { motor?.escribir(texto); }, [motor, texto]);
    return null;
}

/**
 * Páginas de error con el lenguaje del sitio: la barra y el pie de siempre, un título que dice qué pasó, las salidas
 * como enlaces y la materia escribiendo el código (404, error) al lado. Sin orbes ni gradientes de fondo.
 */
export function PaginaError({ codigo, titulo, texto, acciones, salidas }: { codigo: string; titulo: string; texto: string; acciones: ReactNode; salidas?: { href: string; label: string }[] }) {
    return (
        <Esqueleto>
            <main id="main-content" className="er">
                <section className="er-escena" data-forma="texto" data-ancla="#ancla-texto" aria-labelledby="er-titulo">
                    <Escribir texto={codigo} />
                    <div className="ancho er-rejilla">
                        <div>
                            <p className="er-codigo">{codigo}</p>
                            <h1 id="er-titulo">{titulo}</h1>
                            <p className="er-texto">{texto}</p>
                            <div className="er-acciones">{acciones}</div>
                        </div>
                        <div id="ancla-texto" aria-hidden="true" />
                    </div>
                    {salidas?.length ? (
                        <nav className="ancho er-salidas" aria-label="Páginas sugeridas">
                            <p>Quizás buscabas:</p>
                            <ul>{salidas.map((s) => <li key={s.href}><a className="enlace-ir" href={s.href}>{s.label}</a></li>)}</ul>
                        </nav>
                    ) : null}
                </section>
            </main>
        </Esqueleto>
    );
}
