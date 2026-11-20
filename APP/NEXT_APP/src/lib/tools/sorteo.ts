import { enteroSeguro } from "./numeros";

/**
 * Elige `k` posiciones distintas de `0..n-1`, en el orden en que salen (1.º, 2.º…). Fisher-Yates parcial con
 * `enteroSeguro`: cada orden posible tiene la misma probabilidad y nadie sale dos veces.
 */
export function posicionesSinRepetir(n: number, k: number, azar: (max: number) => number = enteroSeguro): number[] {
    const total = Math.max(0, Math.floor(n));
    const cuantas = Math.max(0, Math.min(Math.floor(k), total));
    const pos = Array.from({ length: total }, (_, i) => i);
    for (let i = 0; i < cuantas; i++) {
        const j = i + azar(total - i);
        [pos[i], pos[j]] = [pos[j]!, pos[i]!];
    }
    return pos.slice(0, cuantas);
}
