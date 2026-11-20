/**
 * Utilidades numéricas compartidas por las herramientas.
 */

/** Entero al azar en [0, n) con crypto y sin sesgo de módulo (muestreo por rechazo). */
export function enteroSeguro(n: number): number {
    if (!Number.isInteger(n) || n <= 1) return 0;
    const limite = Math.floor(0x1_0000_0000 / n) * n;
    const a = new Uint32Array(1);
    do { crypto.getRandomValues(a); } while (a[0]! >= limite);
    return a[0]! % n;
}

/**
 * Lee un monto escrito a la chilena: «1.190.000» = 1190000, «1.190.000,50» = 1190000.5, «19,5» = 19.5.
 * Sin coma, un punto seguido de 1–2 dígitos se toma como decimal («1190.5»); grupos de 3 tras puntos, como miles.
 */
export function numeroCL(texto: string): number | null {
    const t = texto.replace(/[\s$]/g, "").replace(/[^0-9.,-]/g, "");
    if (!t || t === "-" ) return null;
    let normal: string;
    if (t.includes(",")) normal = t.replace(/\./g, "").replace(",", ".");
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) normal = t.replace(/\./g, "");
    else normal = t;
    const n = Number(normal);
    return Number.isFinite(n) ? n : null;
}
