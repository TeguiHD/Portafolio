import type { Clima } from "@/modules/materia/motor";
import { figuraDelCielo } from "./IconoTiempo";

/** El cielo del lugar, en el idioma de la materia: llueve, nieva, sube polvo con el sol, titilan estrellas o pasan nubes. */
export function climaDe(codigo: number, dia: boolean): Clima {
  const f = figuraDelCielo(codigo, dia);
  if (f === "tormenta" || f === "chubasco" || f === "lluvia" || f === "llovizna") return "lluvia";
  if (f === "nieve") return "nieve";
  if (f === "niebla" || f === "nube") return "nubes";
  return f === "luna" || f === "luna-nube" ? "noche" : "sol";
}
