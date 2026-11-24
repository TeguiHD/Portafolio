import Link from "next/link";
import { ANCLA_ESTUDIO, RUTA_COMO_SE_HIZO, estudioDe, type EstudioHerramienta } from "@/lib/como-se-hizo";

const FILAS: [keyof Omit<EstudioHerramienta, "fuentes">, string][] = [
    ["para", "Para qué"],
    ["reviso", "Qué se revisó"],
    ["funciona", "Cómo funciona"],
    ["comprueba", "Cómo se comprueba"],
];

/**
 * El estudio de una herramienta, debajo de ella y antes de la guía: para qué existe, qué se revisó, cómo funciona y
 * cómo se comprueba, con sus fuentes. Va en el HTML del servidor (lo leen la gente, los buscadores y las IA) y visible:
 * es la prueba de que detrás hay investigación, no un texto de venta. Datos: src/lib/como-se-hizo-herramientas.ts.
 */
export function ComoSeHizo({ slug }: { slug: string }) {
    const e = estudioDe(slug);
    if (!e) return null;
    return (
        <section id={ANCLA_ESTUDIO} className="tool-estudio" aria-labelledby="tool-estudio-t">
            <h2 id="tool-estudio-t">Cómo se hizo</h2>
            <dl>
                {FILAS.map(([campo, nombre]) => (
                    <div key={campo}><dt>{nombre}</dt><dd>{e[campo]}</dd></div>
                ))}
                {e.fuentes.length ? (
                    <div>
                        <dt>Fuentes</dt>
                        <dd>
                            <ul>
                                {e.fuentes.map((f) => (
                                    <li key={f.url}><a href={f.url} target="_blank" rel="noopener noreferrer"><cite>{f.nombre}</cite></a></li>
                                ))}
                            </ul>
                        </dd>
                    </div>
                ) : null}
            </dl>
            <p><Link href={RUTA_COMO_SE_HIZO}>Cómo se hace todo el sitio</Link></p>
        </section>
    );
}
