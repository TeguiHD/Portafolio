"use client";

import { useEffect, useState } from "react";

/**
 * Transición entre rutas: un fundido corto al navegar.
 *
 * Tres decisiones deliberadas:
 *  1. Solo `opacity`, nunca `transform`. Un transform en este envoltorio lo
 *     convertiría en bloque contenedor de los navbars `position: fixed`, que
 *     saltarían durante la animación.
 *  2. Solo anima en navegaciones de cliente. En el primer render no hay clase,
 *     así que el HTML servido jamás lleva `opacity: 0`: los rastreadores sin JS
 *     y el primer pintado ven el contenido tal cual.
 *  3. Va en CSS y no en framer-motion: este envoltorio está en todas las rutas,
 *     así que la biblioteca entraba en el paquete inicial de todas ellas para
 *     un fundido de una línea.
 */
let yaNavego = false;

export default function Template({ children }: { children: React.ReactNode }) {
  const [animar] = useState(() => yaNavego);

  useEffect(() => {
    yaNavego = true;
  }, []);

  return <div className={animar ? "ruta-entra" : undefined}>{children}</div>;
}
