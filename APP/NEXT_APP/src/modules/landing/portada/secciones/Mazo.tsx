"use client";

import Link from "next/link";
import { useRevelar } from "../revelar";

/** Cabecera real de #vault; el mazo de demostraciones llega en la tarea 4 del plan. */
export function Mazo() {
  const cab = useRevelar<HTMLDivElement>();
  return (
    <section id="vault" className="p-sec">
      <div className="p-wrap">
        <div ref={cab} className="p-cab" data-revelar>
          <span className="eyebrow ambar">Software de uso interno</span>
          <h2>
            <span className="ln"><span>Infraestructura <span className="a">Privada</span></span></span>
          </h2>
          <p className="sub">
            El trabajo que ocurre detrás de una plataforma: organizar la operación, preparar documentos y vigilar lo que pasa.
            Sistemas privados que construyo para uso interno.
          </p>
          <div>
            <Link href="#contact" className="p-cta fantasma">Conversar sobre un sistema</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
