/**
 * Reconoce el formato real de una imagen por sus primeros bytes, sin fiarse de la extensión ni de `file.type`
 * (que llega vacío en algunos sistemas y que cualquiera puede cambiar renombrando el archivo).
 */

type Parte = readonly [desde: number, bytes: readonly number[]];

const ascii = (texto: string) => Array.from(texto, (caracter) => caracter.charCodeAt(0));

const FIRMAS: ReadonlyArray<readonly [tipo: string, alternativas: ReadonlyArray<ReadonlyArray<Parte>>]> = [
    ["image/png", [[[0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]]]],
    ["image/jpeg", [[[0, [0xff, 0xd8, 0xff]]]]],
    // RIFF también lo usan WAV y AVI: WebP exige «WEBP» en el byte 8.
    ["image/webp", [[[0, ascii("RIFF")], [8, ascii("WEBP")]]]],
    ["image/gif", [[[0, ascii("GIF87a")]], [[0, ascii("GIF89a")]]]],
    ["image/bmp", [[[0, ascii("BM")]]]],
    ["image/x-icon", [[[0, [0x00, 0x00, 0x01, 0x00]]], [[0, [0x00, 0x00, 0x02, 0x00]]]]],
    ["image/tiff", [[[0, [0x49, 0x49, 0x2a, 0x00]]], [[0, [0x4d, 0x4d, 0x00, 0x2a]]]]],
];

const MARCAS_AVIF = new Set(["avif", "avis"]);
const MARCAS_HEIC = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis"]);

/** Bytes que conviene leer para reconocer cualquiera de los formatos de aquí. */
export const BYTES_CABECERA = 64;

/** Marcas de la caja `ftyp` de ISO-BMFF (AVIF, HEIC): la principal y las compatibles. */
function marcasFtyp(cabecera: Uint8Array): string[] {
    if (cabecera.length < 16) return [];
    const texto = (desde: number) => String.fromCharCode(...cabecera.subarray(desde, desde + 4));
    if (texto(4) !== "ftyp") return [];
    const tamano = ((cabecera[0] << 24) | (cabecera[1] << 16) | (cabecera[2] << 8) | cabecera[3]) >>> 0;
    const fin = Math.min(cabecera.length, tamano >= 16 ? tamano : cabecera.length);
    const marcas = [texto(8)];
    for (let i = 16; i + 4 <= fin; i += 4) marcas.push(texto(i));
    return marcas;
}

/** Tipo MIME según los bytes, o null si no es una imagen conocida. SVG es texto: se reconoce con `pareceSvg`. */
export function formatoPorBytes(cabecera: Uint8Array): string | null {
    for (const [tipo, alternativas] of FIRMAS) {
        if (alternativas.some((partes) => partes.every(([desde, bytes]) => bytes.every((byte, i) => cabecera[desde + i] === byte)))) return tipo;
    }
    const marcas = marcasFtyp(cabecera);
    if (marcas.some((marca) => MARCAS_AVIF.has(marca))) return "image/avif";
    if (marcas.some((marca) => MARCAS_HEIC.has(marca))) return "image/heic";
    return null;
}

/** El comienzo del archivo tiene una etiqueta <svg>. */
export function pareceSvg(inicio: string): boolean {
    return /<svg[\s>]/i.test(inicio);
}

const ETIQUETAS: Record<string, string> = {
    "image/png": "PNG",
    "image/jpeg": "JPG",
    "image/webp": "WebP",
    "image/gif": "GIF",
    "image/bmp": "BMP",
    "image/avif": "AVIF",
    "image/svg+xml": "SVG",
    "image/x-icon": "ICO",
    "image/tiff": "TIFF",
    "image/heic": "HEIC",
    "image/heif": "HEIF",
};

/** Nombre corto de un formato para mostrarlo («image/jpeg» → «JPG»). */
export function etiquetaFormato(tipo: string): string {
    return ETIQUETAS[tipo] ?? (tipo.split("/")[1]?.replace(/^x-/, "").toUpperCase() || "desconocido");
}

/** «PNG, JPG o WebP». */
export function listaFormatos(tipos: readonly string[]): string {
    const etiquetas = [...new Set(tipos.map(etiquetaFormato))];
    return etiquetas.length > 1 ? `${etiquetas.slice(0, -1).join(", ")} o ${etiquetas.at(-1)}` : etiquetas[0] ?? "";
}

const EXTENSIONES: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg,.jpeg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/bmp": ".bmp",
    "image/avif": ".avif",
    "image/svg+xml": ".svg",
    "image/x-icon": ".ico",
};

/** Valor del atributo `accept` de un <input type="file"> para esos tipos. */
export function extensionesAceptadas(tipos: readonly string[]): string {
    return tipos.map((tipo) => EXTENSIONES[tipo] ?? tipo).join(",");
}
