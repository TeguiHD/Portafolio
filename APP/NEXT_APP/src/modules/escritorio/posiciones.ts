/**
 * Dónde va cada ícono del escritorio: [columna, fila] en la grilla, como Windows (columnas desde arriba a la izquierda).
 * Funciones puras (tests/e2e/escritorio-logica.spec.ts).
 */
export type Pos = [number, number];
export const CLAVE_POSICIONES = "escritorio:posiciones";

/** Lo guardado en este navegador, solo con ids conocidos y números de celda válidos. */
export function leerPosiciones(ids: string[]): Record<string, Pos> {
    try {
        const g = JSON.parse(localStorage.getItem(CLAVE_POSICIONES) ?? "{}") as Record<string, unknown>;
        return Object.fromEntries(Object.entries(g).filter(([id, p]) => ids.includes(id) && Array.isArray(p) && p.length === 2 && p.every((n) => Number.isInteger(n) && n >= 0 && n < 60))) as Record<string, Pos>;
    } catch { return {}; }
}

/**
 * Las posiciones finales: las guardadas que caben en la pantalla (filas y columnas) y no chocan; el resto va a la
 * primera celda libre, bajando por columnas. Así un ícono movido lejos en una pantalla grande no queda fuera de la vista
 * en una más angosta.
 */
export function ubicar(ids: string[], guardadas: Record<string, Pos>, filas: number, columnas = Infinity): Record<string, Pos> {
    const f = Math.max(1, filas), usadas = new Set<string>(), out: Record<string, Pos> = {};
    for (const id of ids) {
        const p = guardadas[id];
        if (p && p[1] < f && p[0] < columnas && !usadas.has(`${p[0]},${p[1]}`)) { out[id] = p; usadas.add(`${p[0]},${p[1]}`); }
    }
    let k = 0;
    for (const id of ids) {
        if (out[id]) continue;
        while (usadas.has(`${Math.floor(k / f)},${k % f}`)) k++;
        out[id] = [Math.floor(k / f), k % f];
        usadas.add(`${out[id][0]},${out[id][1]}`);
    }
    return out;
}
