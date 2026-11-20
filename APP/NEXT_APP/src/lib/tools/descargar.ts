/**
 * Descargas de las herramientas: todo se genera en el navegador, así que basta un enlace temporal a un Blob.
 * La URL se libera después (no al tiro: Safari y Firefox cancelan la descarga si se revoca en el mismo turno).
 */

/** Nombre de archivo seguro que conserva tildes y ñ (los sistemas de archivos actuales los aceptan). */
export function nombreArchivo(base: string, respaldo = "archivo"): string {
    const limpio = base.normalize("NFC").replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}_\- ]+/gu, "_").replace(/\s+/g, "-").replace(/_+/g, "_").replace(/^[-_]+|[-_]+$/g, "").slice(0, 80);
    return limpio || respaldo;
}

/** Descarga un Blob con ese nombre. */
export function descargarBlob(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.rel = "noopener";
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Descarga texto (UTF-8). */
export function descargarTexto(texto: string, nombre: string, tipo = "text/plain"): void {
    descargarBlob(new Blob([texto], { type: `${tipo};charset=utf-8` }), nombre);
}
