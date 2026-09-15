import Link from "next/link";
import { casos } from "../datos/casos";
import { CoverflowEscena } from "./CoverflowEscena";
import "./coverflow.css";

/**
 * Proyectos (#casos) — componente de servidor: los tres paneles con su imagen
 * real viajan en el HTML inicial; la escena cliente los fija al scroll.
 */
export function Coverflow() {
  return (
    <section id="casos" aria-labelledby="projects-title" className="p-sec p-casos">
      <div className="p-cover-pin">
        <div className="p-wrap p-cover-wrap">
          <CoverflowEscena casos={casos} />
          <Link href="/sobre-mi" className="p-casos-enlace">Conoce mi trayectoria y cómo trabajo</Link>
        </div>
      </div>
    </section>
  );
}
