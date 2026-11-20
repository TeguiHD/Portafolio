/** ZIP de varios archivos generados en el navegador. JSZip se carga solo cuando hace falta. */

export interface ArchivoZip {
    nombre: string;
    blob: Blob;
}

/** Evita nombres repetidos dentro del ZIP («foto.webp», «foto-2.webp»…); sin distinguir mayúsculas, como Windows y macOS. */
export function nombresUnicos(nombres: readonly string[]): string[] {
    const usados = new Set<string>();
    return nombres.map((nombre) => {
        const punto = nombre.lastIndexOf(".");
        const base = punto > 0 ? nombre.slice(0, punto) : nombre;
        const extension = punto > 0 ? nombre.slice(punto) : "";
        let candidato = nombre;
        for (let n = 2; usados.has(candidato.toLowerCase()); n++) candidato = `${base}-${n}${extension}`;
        usados.add(candidato.toLowerCase());
        return candidato;
    });
}

/** Arma el ZIP. `alAvanzar` recibe el porcentaje (0–100). */
export async function crearZip(archivos: readonly ArchivoZip[], alAvanzar?: (porcentaje: number) => void): Promise<Blob> {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const nombres = nombresUnicos(archivos.map((archivo) => archivo.nombre));
    archivos.forEach((archivo, i) => { zip.file(nombres[i], archivo.blob); });
    // Las imágenes ya vienen comprimidas: volver a comprimirlas casi no ahorra espacio y tarda más.
    return zip.generateAsync({ type: "blob", compression: "STORE", mimeType: "application/zip" }, (meta) => alAvanzar?.(meta.percent));
}
