"use client";

import dynamic from "next/dynamic";
import { usePortada } from "../PortadaMotion";
import { usePrimeraInteraccion } from "../interaccionInicial";

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
  const { nivel } = usePortada();
  const interactuado = usePrimeraInteraccion();
  // En nivel medio (móvil, pocos núcleos) la mesa espera a la primera interacción: quien solo mira no la paga.
  if (nivel === "medio" && !interactuado) return <div className="p-mesa" aria-hidden="true" />;
  return <MesaGiratoria />;
}
