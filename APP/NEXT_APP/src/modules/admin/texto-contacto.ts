/**
 * Mensajes de contacto: hasta noviembre de 2026 /api/contact guardaba nombre, correo y mensaje escapados como HTML
 * (sanitizeInput). Ahora se guarda el texto tal cual, pero los viejos siguen escapados en la base. Al leerlos se
 * deshacen SOLO esas seis entidades; React escapa al mostrar, así que nunca va dangerouslySetInnerHTML.
 */

/** Deshace el escape viejo. `&amp;` va al final: así «&amp;lt;» (un «&lt;» escrito por la persona) vuelve a «&lt;». */
export function textoContacto(texto: string): string;
export function textoContacto(texto: string | null): string | null;
export function textoContacto(texto: string | null): string | null {
    if (!texto || !texto.includes("&")) return texto;
    return texto
        .replace(/&#x2F;/g, "/")
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&gt;/g, ">")
        .replace(/&lt;/g, "<")
        .replace(/&amp;/g, "&");
}

/** El mismo escape que se usaba al guardar: sirve para buscar también en los mensajes viejos. */
export function escapadoViejo(texto: string): string {
    return texto
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/\//g, "&#x2F;");
}

/** Nombre, correo, mensaje y respuesta legibles, sin tocar el resto de los campos. */
export function mensajeLegible<T extends { email?: string; name?: string | null; message?: string; response?: string | null }>(m: T): T {
    return {
        ...m,
        ...(m.email !== undefined ? { email: textoContacto(m.email) } : {}),
        ...(m.name !== undefined ? { name: textoContacto(m.name) } : {}),
        ...(m.message !== undefined ? { message: textoContacto(m.message) } : {}),
        ...(m.response !== undefined ? { response: textoContacto(m.response) } : {}),
    };
}
