/**
 * Lógica del generador de claves: azar sin sesgo, al menos un carácter por grupo y entropía calculada sin exagerar.
 */
import { enteroSeguro } from "./numeros";
import { PALABRAS_ES } from "./palabras-es";

export const GRUPOS_CLAVE = {
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    numbers: "0123456789",
    symbols: "!@#$%^&*",
    brackets: "()[]{}",
    special: "~`|\\:;\"'<>,./?_+-=",
} as const;

export type GrupoClave = keyof typeof GRUPOS_CLAVE;

// La barra vertical se confunde con l, 1 e I en muchas fuentes.
const AMBIGUOS = /[l1I|oO0]/g;

/** Caracteres de cada grupo elegido, sin repetidos y sin ambiguos si se pide. Omite grupos que quedan vacíos. */
export function gruposElegidos(activos: Record<GrupoClave, boolean>, sinAmbiguos: boolean): string[] {
    const vistos = new Set<string>();
    const grupos: string[] = [];
    for (const id of Object.keys(GRUPOS_CLAVE) as GrupoClave[]) {
        if (!activos[id]) continue;
        let chars = GRUPOS_CLAVE[id] as string;
        if (sinAmbiguos) chars = chars.replace(AMBIGUOS, "");
        let propios = "";
        for (const c of chars) {
            if (vistos.has(c)) continue;
            vistos.add(c);
            propios += c;
        }
        if (propios) grupos.push(propios);
    }
    return grupos;
}

/** Mezcla Fisher-Yates con azar sin sesgo. */
export function mezclar<T>(lista: T[]): T[] {
    for (let i = lista.length - 1; i > 0; i--) {
        const j = enteroSeguro(i + 1);
        [lista[i], lista[j]] = [lista[j], lista[i]];
    }
    return lista;
}

const INTENTOS_MAX = 10_000;

/**
 * Clave de `largo` caracteres con al menos uno de cada grupo.
 * Se sortea cada carácter del conjunto completo y se descarta la clave si le falta algún grupo: así todas las claves
 * válidas salen con la misma probabilidad. Si por algún motivo no aparece una válida tras muchos intentos (no pasa
 * con 8+ caracteres), se pone uno de cada grupo y el resto al azar, y se mezcla con Fisher-Yates.
 */
export function generarClave(grupos: string[], largo: number): string {
    const todos = grupos.join("");
    if (!todos || largo < 1) return "";
    const sortear = () => todos[enteroSeguro(todos.length)];
    if (largo >= grupos.length) {
        for (let intento = 0; intento < INTENTOS_MAX; intento++) {
            const clave = Array.from({ length: largo }, sortear).join("");
            if (grupos.every((g) => [...clave].some((c) => g.includes(c)))) return clave;
        }
    }
    const forzados = grupos.map((g) => g[enteroSeguro(g.length)]);
    const resto = Array.from({ length: Math.max(0, largo - forzados.length) }, sortear);
    return mezclar([...forzados, ...resto]).slice(0, largo).join("");
}

/**
 * Bits de entropía de una clave uniforme entre las que tienen al menos un carácter de cada grupo:
 * log2(N^L · p), con p = proporción de claves que cumplen (inclusión-exclusión sobre los grupos).
 * Es un poco menos que L·log2(N): exigir un carácter por grupo descarta algunas combinaciones.
 */
export function entropiaClave(grupos: string[], largo: number): number {
    const tamanos = grupos.map((g) => g.length);
    const n = tamanos.reduce((a, b) => a + b, 0);
    if (!n || largo < 1) return 0;
    let p = 0;
    const k = tamanos.length;
    for (let mascara = 0; mascara < 1 << k; mascara++) {
        let faltan = 0;
        let bits = 0;
        for (let i = 0; i < k; i++) if (mascara & (1 << i)) { faltan += tamanos[i]; bits++; }
        p += (bits % 2 ? -1 : 1) * Math.pow(1 - faltan / n, largo);
    }
    if (p <= 0) return 0;
    return largo * Math.log2(n) + Math.log2(p);
}

export const SEPARADORES_FRASE = [
    { valor: "-", nombre: "Guion (-)" },
    { valor: ".", nombre: "Punto (.)" },
    { valor: "_", nombre: "Guion bajo (_)" },
    { valor: " ", nombre: "Espacio" },
] as const;

export interface OpcionesFrase {
    palabras: number;
    separador: string;
    mayuscula: boolean;
    numero: boolean;
}

/** Tamaño real de la lista: de aquí sale la entropía, no de un número redondo. */
export const TOTAL_PALABRAS = PALABRAS_ES.length;
export const BITS_POR_PALABRA = Math.log2(TOTAL_PALABRAS);
const NUMEROS_POSIBLES = 100; // 0 a 99

/** Frase de palabras al azar (con reposición). El número opcional va en una posición al azar. */
export function generarFrase({ palabras, separador, mayuscula, numero }: OpcionesFrase): string {
    const partes = Array.from({ length: palabras }, () => {
        const p = PALABRAS_ES[enteroSeguro(TOTAL_PALABRAS)];
        return mayuscula ? p[0].toUpperCase() + p.slice(1) : p;
    });
    if (numero) partes.splice(enteroSeguro(palabras + 1), 0, String(enteroSeguro(NUMEROS_POSIBLES)));
    return partes.join(separador);
}

/**
 * log2(lista) por palabra; el número suma log2(100) por su valor y log2(palabras + 1) por su posición.
 * La mayúscula y el separador son fijos: no suman nada. Supone que el atacante conoce la lista y el formato.
 */
export function entropiaFrase({ palabras, numero }: Pick<OpcionesFrase, "palabras" | "numero">): number {
    return palabras * BITS_POR_PALABRA + (numero ? Math.log2(NUMEROS_POSIBLES) + Math.log2(palabras + 1) : 0);
}

const ANIO_S = 365.25 * 86_400;
const EDAD_UNIVERSO_ANIOS = 1.38e10;
const f1 = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 });
const f0 = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });
const SUPERINDICE = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const potencia = (e: number) => `10${String(e).replace(/\d/g, (d) => SUPERINDICE[Number(d)])}`;

/** log10 de los segundos promedio para dar con la clave: la mitad del espacio, 2^bits / 2, a `porSegundo` intentos. */
export function log10SegundosPromedio(bits: number, porSegundo: number): number {
    return (bits - 1) * Math.log10(2) - Math.log10(porSegundo);
}

/** Tiempo legible a partir de log10(segundos), sin desbordar con claves largas. */
export function tiempoLegible(log10s: number): { texto: string; universo: string | null } {
    if (!Number.isFinite(log10s) || log10s < -3) return { texto: "menos de 1 milisegundo", universo: null };
    const s = Math.pow(10, log10s);
    if (s < 1) return { texto: `${f0.format(s * 1000)} ms`, universo: null };
    if (s < 60) return { texto: `${f1.format(s)} segundos`, universo: null };
    if (s < 3600) return { texto: `${f0.format(s / 60)} minutos`, universo: null };
    if (s < 86_400) return { texto: `${f1.format(s / 3600)} horas`, universo: null };
    if (s < 86_400 * 30) return { texto: `${f0.format(s / 86_400)} días`, universo: null };
    if (s < ANIO_S) return { texto: `${f1.format(s / 86_400 / 30.44)} meses`, universo: null };
    const log10a = log10s - Math.log10(ANIO_S);
    const anios = Math.pow(10, log10a);
    let texto: string;
    if (anios < 100) texto = `${f0.format(anios)} años`;
    else if (anios < 1e3) texto = `${f1.format(anios / 100)} siglos`;
    else if (anios < 1e6) texto = `${f1.format(anios / 1e3)} mil años`;
    else if (anios < 1e9) texto = `${f1.format(anios / 1e6)} millones de años`;
    else if (anios < 1e12) texto = `${f1.format(anios / 1e9)} mil millones de años`;
    else if (anios < 1e15) texto = `${f1.format(anios / 1e12)} billones de años`;
    else texto = `unos ${potencia(Math.floor(log10a))} años`;
    const veces = log10a - Math.log10(EDAD_UNIVERSO_ANIOS);
    let universo: string | null = null;
    if (veces >= 0) universo = veces < 6
        ? `${f0.format(Math.pow(10, veces))} veces la edad del universo`
        : `unas ${potencia(Math.floor(veces))} veces la edad del universo`;
    return { texto, universo };
}
