/**
 * Núcleo puro del probador de regex: lo usan el worker (con su tiempo máximo) y, solo si el navegador
 * no tiene workers, el hilo principal. No importa nada para que el worker quede liviano.
 */

/** Coincidencias que se resaltan y cuentan. */
export const MAX_MATCHES = 10000;
/** Coincidencias que se mandan con sus grupos al panel de detalle. */
export const MAX_DETAILS = 200;
/** Grupos por coincidencia que se mandan al panel. */
export const MAX_GROUPS = 50;
/** Largo máximo de cada texto del detalle (el resaltado usa los rangos, no esto). */
export const MAX_DETAIL_CHARS = 300;
/** Tope del texto ya reemplazado que vuelve del worker. */
export const MAX_REPLACED_CHARS = 2_000_000;

export interface RegexMatchDetail {
    index: number;
    end: number;
    /** Texto de la coincidencia, recortado a MAX_DETAIL_CHARS. */
    text: string;
    /** Grupos numerados desde el 1; `null` si el grupo no participó en esta coincidencia. */
    groups: (string | null)[];
    /** Cuántos grupos quedaron fuera por MAX_GROUPS. */
    hiddenGroups: number;
}

export interface RegexReplaceResult {
    text: string;
    /** El resultado superó MAX_REPLACED_CHARS y se cortó. */
    cut: boolean;
}

export interface RegexRunResult {
    matches: string[];
    ranges: [number, number][];
    details: RegexMatchDetail[];
    /** Nombre de cada grupo numerado (índice 0 = grupo 1); `null` si no tiene nombre. */
    groupNames: (string | null)[];
    replaced: RegexReplaceResult | null;
    execMs: number;
    /** Hay más de MAX_MATCHES coincidencias. */
    truncated: boolean;
}

function recortar(texto: string): string {
    return texto.length > MAX_DETAIL_CHARS ? `${texto.slice(0, MAX_DETAIL_CHARS)}…` : texto;
}

/**
 * Nombres de los grupos de captura en orden, leyendo el patrón sin ejecutarlo.
 * Salta escapes y clases de caracteres (con la bandera v las clases pueden anidarse).
 */
export function groupNamesOf(pattern: string, unicodeSets: boolean): (string | null)[] {
    const names: (string | null)[] = [];
    let classDepth = 0;
    for (let i = 0; i < pattern.length; i++) {
        const c = pattern[i];
        if (c === "\\") { i++; continue; }
        if (classDepth > 0) {
            if (c === "]") classDepth--;
            else if (c === "[" && unicodeSets) classDepth++;
            continue;
        }
        if (c === "[") { classDepth = 1; continue; }
        if (c !== "(") continue;
        if (pattern[i + 1] !== "?") { names.push(null); continue; }
        if (pattern[i + 2] === "<" && pattern[i + 3] !== "=" && pattern[i + 3] !== "!") {
            const end = pattern.indexOf(">", i + 3);
            names.push(end > i + 3 ? pattern.slice(i + 3, end) : null);
        }
    }
    return names;
}

/**
 * Ejecuta la regex sobre el texto. Con `replacement` distinto de null también reemplaza con el
 * `String.prototype.replace` nativo, que ya entiende $1, $10, $<nombre>, $&, $`, $' y $$.
 */
export function runRegexCore(pattern: string, flags: string, text: string, replacement: string | null): RegexRunResult {
    const start = performance.now();
    const re = new RegExp(pattern, flags);
    const matches: string[] = [];
    const ranges: [number, number][] = [];
    const details: RegexMatchDetail[] = [];
    let truncated = false;
    let groupCount = 0;

    const add = (m: RegExpMatchArray | RegExpExecArray) => {
        const index = m.index ?? 0;
        const end = index + m[0].length;
        matches.push(m[0]);
        ranges.push([index, end]);
        groupCount = m.length - 1;
        if (details.length < MAX_DETAILS) {
            const groups: (string | null)[] = [];
            for (let g = 1; g < m.length && g <= MAX_GROUPS; g++) groups.push(m[g] === undefined ? null : recortar(m[g]));
            details.push({ index, end, text: recortar(m[0]), groups, hiddenGroups: Math.max(0, m.length - 1 - MAX_GROUPS) });
        }
    };

    if (re.global) {
        // matchAll trabaja sobre una copia de la regex (el lastIndex de `re` no se arrastra) y, tras una
        // coincidencia vacía, avanza un carácter (un punto de código con u o v): el bucle siempre termina.
        for (const m of text.matchAll(re)) {
            if (matches.length === MAX_MATCHES) { truncated = true; break; }
            add(m);
        }
    } else {
        // Sin g, exec parte de lastIndex 0 (con y, exige que la coincidencia empiece ahí).
        re.lastIndex = 0;
        const m = re.exec(text);
        if (m) add(m);
    }

    const scanned = groupNamesOf(pattern, flags.includes("v"));
    // Si la lectura del patrón no cuadra con lo que contó el motor, mejor sin nombres que con nombres cruzados.
    const groupNames = matches.length > 0 && scanned.length !== groupCount ? new Array<string | null>(groupCount).fill(null) : scanned;

    let replaced: RegexReplaceResult | null = null;
    if (replacement !== null) {
        const out = text.replace(new RegExp(pattern, flags), replacement);
        replaced = out.length > MAX_REPLACED_CHARS ? { text: out.slice(0, MAX_REPLACED_CHARS), cut: true } : { text: out, cut: false };
    }

    return { matches, ranges, details, groupNames, replaced, execMs: performance.now() - start, truncated };
}
