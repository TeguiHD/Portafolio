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
 * Lo pegado (o autocompletado) a dígitos con una coma decimal.
 * - Con coma y punto, el último de los dos es el decimal: «1.234,56» y «1,234.56» son lo mismo.
 * - Solo comas: una es decimal («19,5»); varias son miles («1,234,567»).
 * - Solo puntos: son miles si forman grupos de tres tras un primer grupo sin cero adelante («1.234.567»); si no, el punto
 *   es decimal («39512.34» de una planilla en inglés, «0.005»).
 * En un campo sin decimales se quitan los decimales: «150000.00» es 150.000, no 15.000.000.
 */
function normalizarPegado(texto: string, o: OpcionesNumero): string {
    const t = texto.replace(/[^\d.,-]/g, "");
    const signo = o.negativos && t.startsWith("-") ? "-" : "";
    const cuerpo = t.replace(/-/g, "");
    const coma = cuerpo.lastIndexOf(","), punto = cuerpo.lastIndexOf(".");
    const comas = (cuerpo.match(/,/g) ?? []).length, puntos = (cuerpo.match(/\./g) ?? []).length;
    let corte = -1;
    if (comas && puntos) corte = Math.max(coma, punto);
    else if (comas === 1) corte = coma;
    else if (puntos && !(puntos > 1 || /^[1-9]\d{0,2}(\.\d{3})+$/.test(cuerpo))) corte = punto;
    const entero = (corte >= 0 ? cuerpo.slice(0, corte) : cuerpo).replace(/[.,]/g, "");
    const dec = corte >= 0 ? cuerpo.slice(corte + 1).replace(/[.,]/g, "") : null;
    return signo + entero + (dec !== null && o.decimales > 0 ? `,${dec}` : "");
}

/** Qué reemplazó el navegador: el tramo [inicio, fin) del texto anterior y lo que entró (lo anota `beforeinput`). */
export interface CambioCampo { inicio: number; fin: number; insertado: string }

export interface ExtraCambio {
    /** Lo que anotó `beforeinput`, si describe este cambio. Sin él se deduce de los dos textos y del cursor. */
    cambio?: CambioCampo;
    /** Hacia dónde se borró (Retroceso o Supr), también de `beforeinput`. */
    borrado?: "atras" | "adelante";
    /** Si la coma del campo nació de un punto escrito: todavía puede ser un punto de miles. */
    comaProvisional?: boolean;
}

/**
 * Da formato a un campo numérico mientras se escribe. `anterior` es lo que mostraba el campo, `nuevo` lo que dejó el
 * navegador tras la tecla (o el pegado) y `cursor` dónde quedó. Devuelve el texto con los puntos, el cursor junto al
 * mismo dígito (los puntos que aparecen o desaparecen no lo mueven) y si la coma sigue siendo provisional.
 *
 * El punto escrito en un campo con decimales es ambiguo: en Chile es de miles («1.190.000»), en un teclado en inglés es
 * el decimal («2.5»). Entra como coma provisional y vuelve a ser de miles en cuanto no puede ser decimal: si llegan más
 * decimales que el tope, otro punto o una coma. Después de un cero («0.005») es decimal sin vuelta.
 */
export function alEscribir(anterior: string, nuevo: string, cursor: number, o: OpcionesNumero, extra: ExtraCambio = {}): { texto: string; cursor: number; comaProvisional?: true } {
    let inicio: number, fin: number, insertado: string;
    if (extra.cambio) ({ inicio, fin, insertado } = extra.cambio);
    else {
        // Al escribir o pegar, el cursor queda al final de lo que entró. Deducir el final por coincidencia de letras
        // fallaba al reemplazar todo: «10.000» → «1.190.000» se leía como «.19» insertado (y era decimal).
        const s = Math.max(0, Math.min(nuevo.length - cursor, anterior.length));
        let p = 0;
        while (p < Math.min(cursor, anterior.length - s) && anterior[p] === nuevo[p]) p++;
        [inicio, fin, insertado] = [p, anterior.length - s, nuevo.slice(p, cursor)];
    }
    const quitado = anterior.slice(inicio, fin), resto = anterior.slice(0, inicio) + anterior.slice(fin);
    let provisional = !!extra.comaProvisional && resto.includes(",");
    let crudo = nuevo, pos = cursor;
    /** Pone `c` en el lugar del cambio; si había una coma provisional, la saca (era de miles). */
    const reemplazarComa = (c: string) => {
        let antes = anterior.slice(0, inicio), despues = anterior.slice(fin);
        if (provisional) { antes = antes.replace(",", ""); despues = despues.replace(",", ""); }
        crudo = antes + c + despues;
        pos = antes.length + c.length;
    };
    if (insertado.length > 1) {
        // Pegado, autocompletado o arrastrado: se normaliza solo lo que entró.
        const limpio = normalizarPegado(insertado, o);
        crudo = anterior.slice(0, inicio) + limpio + anterior.slice(fin);
        pos = inicio + limpio.length;
        provisional = false;
    } else if (insertado === "." && o.decimales > 0 && (!resto.includes(",") || provisional)) {
        reemplazarComa(",");
        provisional = !/^-?0?$/.test(anterior.slice(0, inicio).replace(/\./g, "").replace(",", ""));
    } else if (insertado === "," && provisional) {
        reemplazarComa(",");
        provisional = false;
    } else if (!insertado && quitado === ".") {
        // Se borró solo un punto de miles (el teclado del celular no avisa la tecla): se borra el dígito de al lado.
        if (extra.borrado === "adelante") { crudo = anterior.slice(0, inicio) + anterior.slice(fin + 1); pos = inicio; }
        else { crudo = anterior.slice(0, Math.max(0, inicio - 1)) + anterior.slice(fin); pos = Math.max(0, inicio - 1); }
    }
    if (quitado.includes(",")) provisional = provisional && resto.includes(",");

    // Lo que cuenta: signo, dígitos enteros, una coma y los decimales; y cuántos de cada uno quedan antes del cursor.
    let signo = false, antesSigno = false, coma = false, antesComa = false;
    let entero: string[] = [], dec: string[] = [];
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
    // Más decimales que el tope tras una coma provisional: no era decimal, era un punto de miles.
    if (provisional && dec.length > o.decimales) {
        entero = [...entero, ...dec]; kEntero += kDec; dec = []; kDec = 0;
        coma = false; antesComa = false; provisional = false;
    }
    // Una tecla que no cabe (más de 13 enteros o más decimales que el tope) no entra: el número no cambia.
    if (insertado.length === 1 && insertado >= "0" && insertado <= "9" && (entero.join("").replace(/^0+(?=\d)/, "").length > MAX_ENTEROS || dec.length > o.decimales)) {
        return { texto: anterior, cursor: inicio, ...(extra.comaProvisional && anterior.includes(",") ? { comaProvisional: true as const } : {}) };
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
    return { texto, cursor: nuevoCursor, ...(provisional && coma ? { comaProvisional: true as const } : {}) };
}
