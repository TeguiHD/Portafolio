"use client";

import { useRevelar } from "../revelar";

/** Cabecera real de #architecture; el centinela llega en la tarea 7 del plan. */
export function Centinela() {
  const cab = useRevelar<HTMLDivElement>();
  return (
    <section id="architecture" className="p-sec">
      <div className="p-wrap">
        <div ref={cab} className="p-cab" data-revelar>
          <h2>
            <span className="ln"><span>La seguridad no es un extra.</span></span>
            <span className="ln"><span className="t">Es parte del diseño.</span></span>
          </h2>
          <p className="sub">
            Seguridad defensiva por diseño. Un núcleo vigila el sitio y cada petición atraviesa cuatro anillos antes de tocar un dato.
            Lanza una y mira cómo responde.
          </p>
        </div>
      </div>
    </section>
  );
}
