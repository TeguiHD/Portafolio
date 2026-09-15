"use client";

import { useRevelar } from "../revelar";

/** Cabecera real de #tecnologias; la órbita de iconos llega en la tarea 6 del plan. */
export function Orbita() {
  const cab = useRevelar<HTMLDivElement>();
  return (
    <section id="tecnologias" className="p-sec">
      <div className="p-wrap">
        <div ref={cab} className="p-cab centrada" data-revelar>
          <h2>
            <span className="ln"><span>Una base <span className="m">para crecer</span></span></span>
          </h2>
          <p className="sub">
            Elijo las tecnologías según tu proyecto: una web ágil, procesos conectados y un sistema fácil de mantener.
          </p>
        </div>
      </div>
    </section>
  );
}
