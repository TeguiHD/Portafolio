/** Instrumentos de la mesa giratoria del hero, en el orden en que giran. */
export const instrumentos = [
  { id: "quitar-fondo", nombre: "Quitar fondo", acento: "#5eead4", ruta: "/herramientas/quitar-fondo" },
  { id: "qr", nombre: "Generador de QR", acento: "#a78bfa", ruta: "/herramientas/generador-qr" },
  { id: "paleta", nombre: "Extractor de paleta", acento: "#f59e0b", ruta: "/herramientas/paleta-colores" },
  { id: "recortar", nombre: "Recortar imagen", acento: "#60a5fa", ruta: "/herramientas/recortar-imagen" },
] as const;

export type InstrumentoId = (typeof instrumentos)[number]["id"];
