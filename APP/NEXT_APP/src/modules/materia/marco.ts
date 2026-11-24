/** Columna del contenido: `.viva .ancho` mide min(1180px, 100% − 2 × 24px). */
const COLUMNA = 1180, AIRE = 48;

/**
 * Destino de la partícula i en el marco. `s`: su semilla (0 ≤ s < 1). El marco vive en los márgenes: los lados no pasan
 * del espacio libre junto a la columna (antes entraban en ella entre 861 y ~1300 px de ancho), y la franja de arriba
 * termina antes de la fila de las migas (antes llegaba a 84 px y las migas están desde 80). Escribe en `out`.
 */
export function destinoMarco(s: number, i: number, W: number, H: number, out = { x: 0, y: 0 }): { x: number; y: number } {
    const s4 = s * 4, lado = s4 | 0, q = s4 % 1, f = ((i * 37) % 70) / 70;
    if (lado === 0) { out.x = q * W; out.y = 6 + f * 54; return out; }
    if (lado === 2) { out.x = q * W; out.y = H - 14 - f * 70; return out; }
    const margen = (W - Math.min(COLUMNA, W - AIRE)) / 2, m = 6 + f * Math.max(0, Math.min(70, margen - 12));
    out.x = lado === 1 ? W - m : m; out.y = q * H;
    return out;
}
