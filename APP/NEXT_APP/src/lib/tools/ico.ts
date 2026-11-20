/**
 * Archivo .ico con PNG dentro (formato admitido desde Windows Vista y por todos los navegadores actuales).
 * Cabecera ICONDIR de 6 bytes, una entrada ICONDIRENTRY de 16 bytes por tamaño y después los PNG tal cual.
 * Función pura: no usa el DOM.
 */

export interface PngIco {
    /** Lado del icono en px (1 a 256). */
    lado: number;
    png: ArrayBuffer | Uint8Array;
}

const CABECERA = 6;
const ENTRADA = 16;

export function empaquetarIco(imagenes: readonly PngIco[]): Blob {
    if (!imagenes.length) throw new Error("El ICO necesita al menos un tamaño.");
    for (const { lado } of imagenes) {
        if (!Number.isInteger(lado) || lado < 1 || lado > 256) throw new Error(`Tamaño de icono no válido: ${lado}`);
    }
    const datos = imagenes.map(({ png }) => (png instanceof Uint8Array ? png : new Uint8Array(png)));
    let desplazamiento = CABECERA + ENTRADA * imagenes.length;
    const bytes = new Uint8Array(desplazamiento + datos.reduce((suma, png) => suma + png.byteLength, 0));
    const vista = new DataView(bytes.buffer);

    vista.setUint16(0, 0, true); // reservado
    vista.setUint16(2, 1, true); // 1 = icono
    vista.setUint16(4, imagenes.length, true);

    imagenes.forEach(({ lado }, indice) => {
        const png = datos[indice];
        const entrada = CABECERA + indice * ENTRADA;
        const byteLado = lado === 256 ? 0 : lado; // en un byte, 0 significa 256
        vista.setUint8(entrada, byteLado);
        vista.setUint8(entrada + 1, byteLado);
        vista.setUint8(entrada + 2, 0); // sin paleta
        vista.setUint8(entrada + 3, 0); // reservado
        vista.setUint16(entrada + 4, 1, true); // planos de color
        vista.setUint16(entrada + 6, 32, true); // bits por píxel
        vista.setUint32(entrada + 8, png.byteLength, true);
        vista.setUint32(entrada + 12, desplazamiento, true);
        bytes.set(png, desplazamiento);
        desplazamiento += png.byteLength;
    });

    return new Blob([bytes], { type: "image/x-icon" });
}
