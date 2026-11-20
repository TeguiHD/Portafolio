/**
 * Detector y limpiador de caracteres invisibles: los que sirven para esconder texto (mensajes en caracteres de ancho
 * cero, «ASCII smuggling» con etiquetas, bytes en selectores de variación) o para engañar al leer código (controles
 * bidi de «Trojan Source»).
 * No marca los que son parte legítima de un emoji (👩‍💻 lleva U+200D, ❤️ lleva U+FE0F, la bandera de Escocia lleva
 * etiquetas) ni los de uso normal en una escritura (el ZWNJ del persa, las variantes de un ideograma): esos se conservan.
 * Trabaja por punto de código, sin Intl.Segmenter, para dar el mismo resultado en cualquier navegador.
 */

export type TipoInvisible = "ancho-cero" | "bidi" | "selector" | "etiqueta" | "otro";

export const TIPOS_INVISIBLES: readonly TipoInvisible[] = ["ancho-cero", "bidi", "selector", "etiqueta", "otro"];

export const NOMBRE_TIPO: Record<TipoInvisible, string> = {
    "ancho-cero": "Espacios de ancho cero",
    bidi: "Controles de dirección (bidi)",
    selector: "Selectores de variación sueltos",
    etiqueta: "Etiquetas Unicode",
    otro: "Otros caracteres invisibles",
};

export interface Hallazgo {
    tipo: TipoInvisible;
    /** Posición del primer invisible del grupo, en puntos de código contando desde 1 (única: sirve de clave). */
    posicion: number;
    linea: number;
    /** El grupo está justo antes del carácter visible número `columna` de su línea (un emoji compuesto cuenta como uno). */
    columna: number;
    /** Invisibles seguidos del mismo tipo. */
    codigos: number[];
    /** Texto visible justo antes y justo después (sin los invisibles marcados). */
    antes: string;
    despues: string;
    /** Lo que se lee si el grupo esconde ASCII en etiquetas o bytes UTF-8 en selectores de variación. */
    textoOculto?: string;
}

export interface EmojiConInvisibles {
    emoji: string;
    veces: number;
}

export interface AnalisisInvisibles {
    hallazgos: Hallazgo[];
    /** Caracteres marcados por tipo. */
    porTipo: Record<TipoInvisible, number>;
    total: number;
    /** Emojis que llevan invisibles propios (uniones, selectores, etiquetas de bandera): se conservan. */
    emojis: EmojiConInvisibles[];
    /** Invisibles con uso normal en una escritura (ZWNJ/ZWJ entre letras árabes o índicas, variantes de ideogramas). */
    deEscritura: number;
    /** El texto sin los invisibles marcados. */
    limpio: string;
}

const ZWJ = 0x200d;
const ZWNJ = 0x200c;
const VS15 = 0xfe0e;
const VS16 = 0xfe0f;
const BANDERA_NEGRA = 0x1f3f4;
const CANCELAR_ETIQUETA = 0xe007f;
const TECLA = 0x20e3;

const PICTOGRAFICO = /\p{Extended_Pictographic}/u;
const EMOJI = /\p{Emoji}/u;
const IDEOGRAMA = /\p{Ideographic}/u;
// Bases con secuencias de variación estandarizadas (VS1–VS14) fuera de los ideogramas: símbolos matemáticos y algunas escrituras.
const BASE_VARIANTE = /[\p{Sm}\p{Script=Myanmar}\p{Script=Mongolian}\p{Script=Phags_Pa}\p{Script=Manichaean}]/u;
// Escrituras donde ZWNJ/ZWJ entre letras cambia la forma o la ligadura y son de uso corriente.
const ESCRITURA_CON_UNIONES = /[\p{Script=Arabic}\p{Script=Syriac}\p{Script=Nko}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Gurmukhi}\p{Script=Gujarati}\p{Script=Oriya}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Sinhala}\p{Script=Khmer}\p{Script=Myanmar}\p{Script=Mongolian}]/u;

const MARCA_COMBINANTE = /\p{M}/u;
const prueba = (re: RegExp, cp: number | undefined) => cp !== undefined && re.test(String.fromCodePoint(cp));
const esIndicadorRegional = (cp: number | undefined) => cp !== undefined && cp >= 0x1f1e6 && cp <= 0x1f1ff;
const esPictografico = (cp: number | undefined) => cp !== undefined && cp >= 0xa9 && prueba(PICTOGRAFICO, cp);
const esModificador = (cp: number | undefined) => cp !== undefined && cp >= 0x1f3fb && cp <= 0x1f3ff;
const esLetraEtiqueta = (cp: number | undefined) => cp !== undefined && ((cp >= 0xe0030 && cp <= 0xe0039) || (cp >= 0xe0061 && cp <= 0xe007a));

const OTROS = new Set([
    0x00ad, 0x034f, 0x061c, 0x115f, 0x1160, 0x17b4, 0x17b5, 0x180e, 0x200e, 0x200f,
    0x2061, 0x2062, 0x2063, 0x2064, 0x2065, 0x206a, 0x206b, 0x206c, 0x206d, 0x206e, 0x206f,
    0x3164, 0xffa0, 0xfff9, 0xfffa, 0xfffb, 0x1bca0, 0x1bca1, 0x1bca2, 0x1bca3,
    0x1d173, 0x1d174, 0x1d175, 0x1d176, 0x1d177, 0x1d178, 0x1d179, 0x1d17a,
]);

/** Tipo del carácter si es invisible, o null. */
export function tipoInvisible(cp: number): TipoInvisible | null {
    if ((cp >= 0x200b && cp <= 0x200d) || cp === 0x2060 || cp === 0xfeff) return "ancho-cero";
    if ((cp >= 0x202a && cp <= 0x202e) || (cp >= 0x2066 && cp <= 0x2069)) return "bidi";
    if ((cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0xe0100 && cp <= 0xe01ef)) return "selector";
    if (cp >= 0xe0000 && cp <= 0xe007f) return "etiqueta";
    if (OTROS.has(cp)) return "otro";
    return null;
}

const NOMBRES: Record<number, string> = {
    0x200b: "espacio de ancho cero (ZWSP)",
    0x200c: "no unión de ancho cero (ZWNJ)",
    0x200d: "unión de ancho cero (ZWJ)",
    0x2060: "unión de palabras (WJ)",
    0xfeff: "BOM / espacio de ancho cero sin corte",
    0x202a: "incrustar izquierda a derecha (LRE)",
    0x202b: "incrustar derecha a izquierda (RLE)",
    0x202c: "fin de formato direccional (PDF)",
    0x202d: "forzar izquierda a derecha (LRO)",
    0x202e: "forzar derecha a izquierda (RLO)",
    0x2066: "aislar izquierda a derecha (LRI)",
    0x2067: "aislar derecha a izquierda (RLI)",
    0x2068: "aislar según el primer carácter (FSI)",
    0x2069: "fin de aislamiento (PDI)",
    0x00ad: "guion suave (SHY)",
    0x034f: "unión de grafemas (CGJ)",
    0x061c: "marca de letra árabe (ALM)",
    0x200e: "marca izquierda a derecha (LRM)",
    0x200f: "marca derecha a izquierda (RLM)",
    0x180e: "separador vocálico mongol",
    0x115f: "relleno hangul",
    0x1160: "relleno hangul",
    0x3164: "relleno hangul",
    0xffa0: "relleno hangul de ancho medio",
    0x17b4: "vocal inherente jemer",
    0x17b5: "vocal inherente jemer",
    0xe0001: "etiqueta de idioma",
    0xe007f: "cancelar etiqueta",
};

/** «U+200B» con al menos 4 dígitos. */
export function codigoU(cp: number): string {
    return `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
}

/** Nombre en español del carácter invisible. */
export function nombreInvisible(cp: number): string {
    if (NOMBRES[cp]) return NOMBRES[cp];
    if (cp >= 0xfe00 && cp <= 0xfe0f) return `selector de variación ${cp - 0xfe00 + 1}`;
    if (cp >= 0xe0100 && cp <= 0xe01ef) return `selector de variación ${cp - 0xe0100 + 17}`;
    if (cp >= 0xe0020 && cp <= 0xe007e) return `etiqueta «${cp === 0xe0020 ? "espacio" : String.fromCharCode(cp - 0xe0000)}»`;
    return "carácter de formato invisible";
}

/**
 * Fin (exclusivo) de la secuencia de emoji que empieza en i: pictograma, modificador de tono o selector de
 * presentación, etiquetas de bandera de subdivisión y uniones ZWJ con otro pictograma. Devuelve i si no hay emoji.
 */
function finDeEmoji(cps: number[], i: number): number {
    if (!esPictografico(cps[i])) return i;
    let base = i;
    let j = i + 1;
    for (;;) {
        if (cps[j] === VS15 || cps[j] === VS16 || esModificador(cps[j])) j++;
        if (cps[base] === BANDERA_NEGRA) {
            let k = j;
            while (esLetraEtiqueta(cps[k])) k++;
            if (k > j && cps[k] === CANCELAR_ETIQUETA) j = k + 1;
        }
        if (cps[j] === ZWJ && esPictografico(cps[j + 1])) {
            base = j + 1;
            j += 2;
            continue;
        }
        return j;
    }
}

/** Bytes escondidos con el esquema de selectores de variación (VS1–16 = 0–15, VS17–256 = 16–255), si son UTF-8 legible. */
function leerSelectores(codigos: number[]): string | undefined {
    if (codigos.length < 2) return undefined;
    const bytes = new Uint8Array(codigos.map((cp) => (cp <= 0xfe0f ? cp - 0xfe00 : cp - 0xe0100 + 16)));
    try {
        const texto = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        return /^[^\p{Cc}]*$/u.test(texto.replace(/[\n\t]/g, "")) ? texto : undefined;
    } catch {
        return undefined;
    }
}

/** ASCII escondido en etiquetas (U+E0020–U+E007E). */
function leerEtiquetas(codigos: number[]): string | undefined {
    const texto = codigos.filter((cp) => cp >= 0xe0020 && cp <= 0xe007e).map((cp) => String.fromCharCode(cp - 0xe0000)).join("");
    return texto || undefined;
}

const CONTEXTO = 12;

function contexto(cps: number[], desde: number, hasta: number, marcado: Uint8Array): string {
    let s = "";
    for (let k = Math.max(0, desde); k < Math.min(cps.length, hasta); k++) {
        if (marcado[k]) continue;
        const cp = cps[k]!;
        s += cp === 0x0a ? "↵" : cp === 0x0d ? "" : cp === 0x09 ? "⇥" : String.fromCodePoint(cp);
    }
    return s;
}

export function analizarInvisibles(texto: string): AnalisisInvisibles {
    const cps = Array.from(texto, (c) => c.codePointAt(0)!);
    const n = cps.length;
    const enEmoji = new Uint8Array(n);
    const conteoEmojis = new Map<string, number>();

    for (let i = 0; i < n; ) {
        const fin = finDeEmoji(cps, i);
        if (fin === i) { i++; continue; }
        let lleva = false;
        for (let k = i; k < fin; k++) if (tipoInvisible(cps[k]!)) { enEmoji[k] = 1; lleva = true; }
        if (lleva) {
            const emoji = String.fromCodePoint(...cps.slice(i, fin));
            conteoEmojis.set(emoji, (conteoEmojis.get(emoji) ?? 0) + 1);
        }
        i = fin;
    }

    const marcado = new Uint8Array(n);
    const tipos: (TipoInvisible | null)[] = new Array(n).fill(null);
    let deEscritura = 0;

    for (let i = 0; i < n; i++) {
        const cp = cps[i]!;
        const tipo = tipoInvisible(cp);
        if (!tipo || enEmoji[i]) continue;
        const previo = cps[i - 1];
        const siguiente = cps[i + 1];
        const previoVisible = previo !== undefined && !tipoInvisible(previo);

        // Selector de presentación tras un carácter emoji que no es pictograma (teclas 1️⃣, #️⃣).
        if ((cp === VS15 || cp === VS16) && previoVisible && prueba(EMOJI, previo)) {
            const emoji = String.fromCodePoint(previo!, cp, ...(siguiente === TECLA ? [TECLA] : []));
            conteoEmojis.set(emoji, (conteoEmojis.get(emoji) ?? 0) + 1);
            continue;
        }
        // Variantes estandarizadas e ideográficas (un selector por base).
        if (((cp >= 0xfe00 && cp <= 0xfe0d) && previoVisible && (prueba(IDEOGRAMA, previo) || prueba(BASE_VARIANTE, previo)))
            || ((cp >= 0xe0100 && cp <= 0xe01ef) && previoVisible && prueba(IDEOGRAMA, previo))) {
            deEscritura++;
            continue;
        }
        // Un ZWNJ/ZWJ suelto entre dos letras de una escritura que los usa (persa, hindi…). Una racha no: eso es un mensaje.
        if ((cp === ZWNJ || cp === ZWJ) && previoVisible && siguiente !== undefined && !tipoInvisible(siguiente)
            && prueba(ESCRITURA_CON_UNIONES, previo) && prueba(ESCRITURA_CON_UNIONES, siguiente)) {
            deEscritura++;
            continue;
        }
        marcado[i] = 1;
        tipos[i] = tipo;
    }

    const porTipo: Record<TipoInvisible, number> = { "ancho-cero": 0, bidi: 0, selector: 0, etiqueta: 0, otro: 0 };
    const hallazgos: Hallazgo[] = [];
    const limpio: string[] = [];
    let linea = 1;
    let columna = 1;
    let indicadorAbierto = false;

    for (let i = 0; i < n; ) {
        const tipo = tipos[i];
        if (!tipo) {
            const cp = cps[i]!;
            limpio.push(String.fromCodePoint(cp));
            if (cp === 0x0a) {
                linea++;
                columna = 1;
                indicadorAbierto = false;
            } else {
                // Cuenta caracteres como se ven: no suman las marcas combinantes, los tonos de piel, la segunda letra
                // de una bandera, lo que va pegado con ZWJ dentro de un emoji ni los invisibles que se conservan.
                const pegado = cp === 0x0d || cp === TECLA || tipoInvisible(cp) !== null || esModificador(cp)
                    || prueba(MARCA_COMBINANTE, cp) || (cps[i - 1] === ZWJ && enEmoji[i - 1] === 1)
                    || (esIndicadorRegional(cp) && indicadorAbierto);
                indicadorAbierto = esIndicadorRegional(cp) ? !indicadorAbierto : false;
                if (!pegado) columna++;
            }
            i++;
            continue;
        }
        let fin = i;
        while (fin < n && tipos[fin] === tipo) fin++;
        const codigos = cps.slice(i, fin);
        porTipo[tipo] += codigos.length;
        hallazgos.push({
            tipo,
            posicion: i + 1,
            linea,
            columna,
            codigos,
            antes: contexto(cps, i - CONTEXTO, i, marcado),
            despues: contexto(cps, fin, fin + CONTEXTO, marcado),
            textoOculto: tipo === "etiqueta" ? leerEtiquetas(codigos) : tipo === "selector" ? leerSelectores(codigos) : undefined,
        });
        i = fin;
    }

    return {
        hallazgos,
        porTipo,
        total: TIPOS_INVISIBLES.reduce((suma, t) => suma + porTipo[t], 0),
        emojis: Array.from(conteoEmojis, ([emoji, veces]) => ({ emoji, veces })),
        deEscritura,
        limpio: limpio.join(""),
    };
}
