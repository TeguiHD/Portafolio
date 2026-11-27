/**
 * Los fondos de pantalla del modo escritorio. Los de imagen son propios: los dibuja scripts/escritorio/fondos (paisajes
 * del norte y del sur de Chile y abstractos) y se sirven desde public/escritorio/fondos en AVIF y WebP de tres tamaños.
 * «Materia viva» es el motor de partículas del sitio (solo se carga si se elige) y «Color sólido», un color parejo.
 * Si se vuelven a generar, se sube VERSION para que nadie vea la imagen vieja guardada.
 */
export type FondoId = "pampa" | "pacifico" | "cordillera" | "austral" | "curvas" | "grafito" | "papel" | "materia" | "materia-viva" | "solido";
export interface Fondo { id: FondoId; nombre: string; detalle: string; tema: "oscuro" | "claro"; tipo: "imagen" | "vivo" | "solido" }

const VERSION = 1;

export const FONDOS: Fondo[] = [
    { id: "pampa", nombre: "Pampa", detalle: "Dunas del desierto de Atacama al atardecer", tema: "oscuro", tipo: "imagen" },
    { id: "pacifico", nombre: "Pacífico", detalle: "El mar de noche frente a la costa", tema: "oscuro", tipo: "imagen" },
    { id: "cordillera", nombre: "Cordillera", detalle: "Los Andes nevados al amanecer", tema: "claro", tipo: "imagen" },
    { id: "austral", nombre: "Austral", detalle: "Aurora sobre los cerros del sur", tema: "oscuro", tipo: "imagen" },
    { id: "curvas", nombre: "Curvas de nivel", detalle: "La topografía de una quebrada, como en un plano", tema: "oscuro", tipo: "imagen" },
    { id: "grafito", nombre: "Grafito", detalle: "Degradado oscuro en verde azulado e índigo", tema: "oscuro", tipo: "imagen" },
    { id: "papel", nombre: "Papel", detalle: "Degradado claro en tonos pastel", tema: "claro", tipo: "imagen" },
    { id: "materia", nombre: "Materia", detalle: "La malla de puntos del sitio, quieta", tema: "oscuro", tipo: "imagen" },
    { id: "materia-viva", nombre: "Materia viva", detalle: "La materia del sitio en movimiento; usa más batería", tema: "oscuro", tipo: "vivo" },
    { id: "solido", nombre: "Color sólido", detalle: "Un color parejo, sin imagen", tema: "oscuro", tipo: "solido" },
];

export const COLORES_SOLIDOS = ["#0b1320", "#10221f", "#1d1530", "#2b1a1a", "#1f1f1f", "#0e3b43", "#e8eef3", "#f2ece3"];

export function esFondo(v: unknown): v is FondoId {
    return typeof v === "string" && FONDOS.some((f) => f.id === v);
}

/** Sin elección, el fondo sigue al tema, como Windows al cambiar de modo. */
export function fondoPorDefecto(tema: "oscuro" | "claro"): FondoId {
    return tema === "claro" ? "cordillera" : "pampa";
}

export function srcsetFondo(id: FondoId, formato: "avif" | "webp"): string {
    return [1280, 1920, 2560].map((w) => `/escritorio/fondos/${id}-${w}.${formato}?v=${VERSION} ${w}w`).join(", ");
}

export function miniFondo(id: FondoId): string {
    return `/escritorio/fondos/${id}-mini.webp?v=${VERSION}`;
}
