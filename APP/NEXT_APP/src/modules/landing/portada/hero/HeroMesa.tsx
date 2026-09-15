"use client";

import dynamic from "next/dynamic";

/**
 * La mesa giratoria (instrumentos, demostraciones, generador de QR) se carga en su
 * propio chunk tras hidratar: el texto del hero, que es el LCP, no espera por ella.
 * La caja `.p-mesa` reserva la altura desde el CSS para que no haya salto.
 */
const MesaGiratoria = dynamic(() => import("./MesaGiratoria").then((m) => m.MesaGiratoria), {
  ssr: false,
  loading: () => <div className="p-mesa" aria-hidden="true" />,
});

export function HeroMesa() {
  return <MesaGiratoria />;
}
