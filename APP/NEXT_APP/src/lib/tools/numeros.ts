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

/* ---------- Campos numéricos: el número a la chilena mientras se escribe (23-11-2026) ---------- */

/** decimales 0 = entero (montos en pesos); negativos solo donde un saldo puede quedar bajo cero. */
export interface OpcionesNumero { decimales: number; negativos?: boolean }

/** Más de 13 dígitos enteros ya no caben con exactitud en un número de JavaScript sumado a decimales. */
const MAX_ENTEROS = 13;

const agrupar = (digitos: string) => digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** El texto que se muestra para un número: 1234567 → «1.234.567»; 39512.34 con 2 decimales → «39.512,34». */
export function textoDeNumero(n: number | null, o: OpcionesNumero): string {
    if (n === null || !Number.isFinite(n)) return "";
    const [entero, dec = ""] = Math.abs(n).toFixed(o.decimales).split(".");
    const decimales = dec.replace(/0+$/, "");
    return `${n < 0 ? "-" : ""}${agrupar(entero!)}${decimales ? `,${decimales}` : ""}`;
}

/** Lee el texto visible (puntos = miles, coma = decimal). Vacío, «-» o «,» solos: null. */
export function numeroDeTexto(texto: string): number | null {
    const normal = texto.replace(/\./g, "").replace(",", ".");
    if (!/\d/.test(normal)) return null;
    const n = Number(normal);
    return Number.isFinite(n) ? n : null;
}

/**
 * Lo pegado (o autocompletado) a dígitos con una coma decimal. Con coma, los puntos son miles. Sin coma, en un campo con
 * decimales, un único punto seguido de un número de dígitos distinto de 3 es decimal («39512.34» de una planilla en
 * inglés); «1.234» siempre es mil doscientos treinta y cuatro.
 */
function normalizarPegado(texto: string, o: OpcionesNumero): string {
    const t = texto.replace(/[^\d.,-]/g, "");
    const signo = o.negativos && t.startsWith("-") ? "-" : "";
    const cuerpo = t.replace(/-/g, "");
    const coma = cuerpo.indexOf(",");
    let entero: string, dec: string | null = null;
    if (coma >= 0) {
        entero = cuerpo.slice(0, coma).replace(/\./g, "");
        dec = cuerpo.slice(coma + 1).replace(/[.,]/g, "");
    } else {
        const partes = cuerpo.split(".");
        if (o.decimales > 0 && partes.length === 2 && partes[1]!.length !== 3) [entero, dec] = [partes[0]!, partes[1]!];
        else entero = cuerpo.replace(/\./g, "");
    }
    return signo + entero + (dec !== null && o.decimales > 0 ? `,${dec}` : "");
}

/**
 * Da formato a un campo numérico mientras se escribe. `anterior` es lo que mostraba el campo, `nuevo` lo que dejó el
 * navegador tras la tecla (o el pegado) y `cursor` dónde quedó. Devuelve el texto con los puntos y el cursor junto al
 * mismo dígito: los puntos que aparecen o desaparecen no lo mueven de su sitio.
 */
export function alEscribir(anterior: string, nuevo: string, cursor: number, o: OpcionesNumero): { texto: string; cursor: number } {
    // El tramo que cambió: lo que no coincide entre el principio y el final de los dos textos.
    let p = 0;
    while (p < anterior.length && p < nuevo.length && anterior[p] === nuevo[p]) p++;
    let s = 0;
    while (s < anterior.length - p && s < nuevo.length - p && anterior[anterior.length - 1 - s] === nuevo[nuevo.length - 1 - s]) s++;
    const insertado = nuevo.slice(p, nuevo.length - s);
    let crudo = nuevo, pos = cursor;
    if (insertado.length > 1) {
        // Pegado, autocompletado o arrastrado: se normaliza solo lo que entró.
        const limpio = normalizarPegado(insertado, o);
        crudo = nuevo.slice(0, p) + limpio + nuevo.slice(nuevo.length - s);
        pos = p + limpio.length;
    } else if (insertado === "." && o.decimales > 0 && !anterior.includes(",")) {
        // El teclado del celular da «.» como decimal en muchos idiomas: donde hay decimales, es la coma.
        crudo = `${nuevo.slice(0, p)},${nuevo.slice(p + 1)}`;
    }

    // Lo que cuenta: signo, dígitos enteros, una coma y los decimales; y cuántos de cada uno quedan antes del cursor.
    let signo = false, antesSigno = false, coma = false, antesComa = false;
    const entero: string[] = [], dec: string[] = [];
    let kEntero = 0, kDec = 0;
    for (let i = 0; i < crudo.length; i++) {
        const c = crudo[i]!, antes = i < pos;
        if (c === "-" && o.negativos && !signo && !entero.length && !coma) { signo = true; antesSigno = antes; }
        else if (c === "," && o.decimales > 0 && !coma) { coma = true; antesComa = antes; }
        else if (c >= "0" && c <= "9") {
            if (coma) { dec.push(c); if (antes) kDec++; }
            else { entero.push(c); if (antes) kEntero++; }
        }
    }
    while (entero.length > 1 && entero[0] === "0") { entero.shift(); if (kEntero > 0) kEntero--; }
    if (!entero.length && coma) { entero.push("0"); if (antesComa) kEntero = 1; }
    if (entero.length > MAX_ENTEROS) { entero.length = MAX_ENTEROS; kEntero = Math.min(kEntero, MAX_ENTEROS); }
    if (dec.length > o.decimales) { dec.length = o.decimales; kDec = Math.min(kDec, o.decimales); }

    const agrupado = agrupar(entero.join(""));
    const texto = `${signo ? "-" : ""}${agrupado}${coma ? `,${dec.join("")}` : ""}`;
    const base = signo && antesSigno ? 1 : 0;
    let nuevoCursor: number;
    if (antesComa) nuevoCursor = (signo ? 1 : 0) + agrupado.length + 1 + kDec;
    else if (kEntero === 0) nuevoCursor = base;
    else {
        // Los puntos que hay antes del k-ésimo dígito: el primer grupo tiene 1 a 3 dígitos y los demás, 3.
        const primero = entero.length % 3 || 3;
        const puntos = kEntero <= primero ? 0 : 1 + Math.floor((kEntero - primero - 1) / 3);
        nuevoCursor = (signo ? 1 : 0) + kEntero + puntos;
    }
    return { texto, cursor: nuevoCursor };
}
