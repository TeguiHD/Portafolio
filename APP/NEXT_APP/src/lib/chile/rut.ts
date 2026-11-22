/**
 * RUT chileno: cuerpo numérico + dígito verificador (módulo 11, pesos 2 a 7 desde la derecha; 11 → 0, 10 → K).
 * Acepta lo que la gente escribe: con o sin puntos, guion, espacios y k minúscula.
 */

/** Solo dígitos y K, en mayúscula. */
export function limpiarRut(texto: string): string {
    return texto.toUpperCase().replace(/[^0-9K]/g, "");
}

export function calcularDv(cuerpo: string | number): string {
    const digitos = String(cuerpo).replace(/\D/g, "");
    let suma = 0, peso = 2;
    for (let i = digitos.length - 1; i >= 0; i--) {
        suma += Number(digitos[i]) * peso;
        peso = peso === 7 ? 2 : peso + 1;
    }
    const resto = 11 - (suma % 11);
    return resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
}

export interface ResultadoRut {
    valido: boolean;
    /** Cuerpo sin ceros a la izquierda. */
    cuerpo?: string;
    dv?: string;
    /** El dígito que corresponde, cuando el escrito no calza. */
    esperado?: string;
    motivo?: string;
}

/** Los RUT de personas y empresas no pasan de 9 dígitos de cuerpo (hoy, cerca de 100 millones). */
const MAX_CUERPO = 9;

export function validarRut(texto: string): ResultadoRut {
    // Otra letra que no sea K no se descarta en silencio: «12.345.678-X» no es un RUT.
    if (/[^0-9kK.\-\s]/.test(texto)) return { valido: false, motivo: "Un RUT solo lleva números, puntos, guion y, al final, la K." };
    const limpio = limpiarRut(texto);
    if (limpio.length < 2) return { valido: false, motivo: "Escribe el RUT completo, con su dígito verificador." };
    const cuerpo = limpio.slice(0, -1).replace(/^0+/, ""), dv = limpio.slice(-1);
    if (!cuerpo || !/^\d+$/.test(cuerpo)) return { valido: false, motivo: "El cuerpo del RUT solo lleva números; la K va al final." };
    if (cuerpo.length > MAX_CUERPO) return { valido: false, motivo: "Es demasiado largo para un RUT." };
    const esperado = calcularDv(cuerpo);
    if (dv !== esperado) return { valido: false, cuerpo, dv, esperado, motivo: `El dígito verificador de ${formatearCuerpo(cuerpo)} es ${esperado}, no ${dv}.` };
    return { valido: true, cuerpo, dv };
}

function formatearCuerpo(cuerpo: string): string {
    return cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** «123456785» → «12.345.678-5». Si no hay al menos dos caracteres útiles, devuelve lo limpio tal cual. */
export function formatearRut(texto: string): string {
    const limpio = limpiarRut(texto);
    if (limpio.length < 2) return limpio;
    return `${formatearCuerpo(limpio.slice(0, -1).replace(/^0+/, "") || "0")}-${limpio.slice(-1)}`;
}

/** Un RUT válido al azar, para probar formularios (entre 1.000.000 y 29.999.999, como los de personas). */
export function generarRut(azar: () => number = aleatorio): string {
    const cuerpo = String(1_000_000 + Math.floor(azar() * 29_000_000));
    return `${formatearCuerpo(cuerpo)}-${calcularDv(cuerpo)}`;
}

function aleatorio(): number {
    if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
        const u = new Uint32Array(1);
        crypto.getRandomValues(u);
        return u[0]! / 2 ** 32;
    }
    return Math.random();
}
