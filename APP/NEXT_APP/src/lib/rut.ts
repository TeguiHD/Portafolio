/**
 * Utilidades para RUT chileno (Rol Único Tributario)
 * Formato: XX.XXX.XXX-K  |  Algoritmo: Módulo 11
 */

/**
 * Limpia el RUT dejando sólo dígitos y la letra K/k.
 */
export function cleanRut(rut: string): string {
    return rut.replace(/[^0-9kK]/g, "").toUpperCase();
}

/**
 * Formatea el RUT con puntos y guión: 12345678-9 → 12.345.678-9
 * Acepta entrada parcial (mientras el usuario escribe).
 */
export function formatRut(value: string): string {
    const clean = cleanRut(value);
    if (clean.length === 0) return "";
    if (clean.length === 1) return clean;

    const dv = clean.slice(-1);
    const body = clean.slice(0, -1);

    // Formatear el cuerpo con puntos cada 3 dígitos desde la derecha
    const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    return `${formatted}-${dv}`;
}

/**
 * Valida el dígito verificador de un RUT usando Módulo 11.
 * Retorna true si el RUT es válido.
 */
export function validateRut(rut: string): boolean {
    const clean = cleanRut(rut);

    // Mínimo 2 caracteres (1 dígito + dv), máximo 9 (8 dígitos + dv)
    if (clean.length < 2 || clean.length > 9) return false;

    const dv = clean.slice(-1);
    const body = clean.slice(0, -1);

    // El cuerpo debe ser solo números
    if (!/^\d+$/.test(body)) return false;

    const num = parseInt(body, 10);
    if (isNaN(num) || num < 1) return false;

    // Cálculo Módulo 11
    let sum = 0;
    let multiplier = 2;
    let n = num;

    while (n > 0) {
        sum += (n % 10) * multiplier;
        n = Math.floor(n / 10);
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const remainder = sum % 11;
    const expectedDv =
        remainder === 0 ? "0" : remainder === 1 ? "K" : String(11 - remainder);

    return dv === expectedDv;
}

/**
 * Retorna un mensaje de error o null si el RUT es válido (o está vacío).
 */
export function getRutError(rut: string): string | null {
    if (!rut || rut.trim() === "") return null; // Opcional → no error
    const clean = cleanRut(rut);
    if (clean.length < 7) return "RUT demasiado corto";
    if (!validateRut(rut)) return "RUT inválido";
    return null;
}
