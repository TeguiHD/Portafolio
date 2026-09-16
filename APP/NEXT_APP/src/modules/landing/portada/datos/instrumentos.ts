/**
 * Instrumentos de la mesa giratoria del hero, en el orden en que giran.
 *
 * El primero es el que recibe a quien llega: va el generador de QR, que se dibuja
 * limpio y se entiende de un vistazo.
 */
export const instrumentos = [
  { id: "qr", nombre: "Generador de QR", acento: "#a78bfa", ruta: "/herramientas/generador-qr" },
  { id: "paleta", nombre: "Extractor de paleta", acento: "#f59e0b", ruta: "/herramientas/paleta-colores" },
  { id: "recortar", nombre: "Recortar imagen", acento: "#60a5fa", ruta: "/herramientas/recortar-imagen" },
  { id: "quitar-fondo", nombre: "Quitar fondo", acento: "#5eead4", ruta: "/herramientas/quitar-fondo" },
] as const;

export type InstrumentoId = (typeof instrumentos)[number]["id"];

/** Búsqueda por id: los componentes no dependen del orden del carrusel. */
export function instrumentoPorId(id: InstrumentoId) {
  const dato = instrumentos.find((i) => i.id === id);
  if (!dato) throw new Error(`instrumento desconocido: ${id}`);
  return dato;
}
