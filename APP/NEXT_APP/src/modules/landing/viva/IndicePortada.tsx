import Link from "next/link";
import { EDICION, RUTA, medidos } from "@/lib/indice/datos";
import { hallazgos } from "@/lib/indice/textos";
import { Vista } from "./Vista";
import "./indice-portada.css";

/**
 * La investigación a la vista desde la portada: tres hallazgos del Índice de la Web Chilena (calculados de la edición
 * vigente, nunca escritos a mano) y los caminos para verlo entero o revisar el propio sitio.
 */
export function IndicePortada() {
    const h = hallazgos(EDICION.sitios);
    const elegidos = ["ia-memoria", "correo", "rastreo"].map((id) => h.lista.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x);
    const total = EDICION.sitios.length, medidosN = medidos(EDICION.sitios).length;
    return (
        <section id="indice" className="plano ipo" data-forma="marco" aria-labelledby="ipo-titulo">
            <Vista className="ancho ipo-rejilla">
                <div className="ipo-texto">
                    <h2 id="ipo-titulo"><span className="linea-r"><span>Índice de la Web Chilena</span></span></h2>
                    <p data-sube="">Medí uno por uno los sitios de {total} instituciones públicas y universidades de Chile ({medidosN} con nota) en siete dimensiones: velocidad, buscadores, IA, seguridad, correo, privacidad y directorios.</p>
                    <p className="ipo-acciones" data-sube="">
                        <Link className="boton lleno" href={RUTA}>Ver el índice</Link>
                        <Link className="enlace-ir" href={`${RUTA}/revisa-tu-sitio`}>Revisa tu sitio</Link>
                    </p>
                </div>
                <ul className="ipo-cifras" data-sube="">
                    {elegidos.map((x) => <li key={x.id}><b>{x.cifra}</b><span>{x.texto}</span></li>)}
                </ul>
            </Vista>
        </section>
    );
}
