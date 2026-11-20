/**
 * Busca la mayor calidad (WebP o JPEG) cuyo archivo cabe en un peso dado. Si ni con la calidad mínima cabe,
 * achica la imagen por pasos y vuelve a buscar. El codificador se inyecta para poder probarlo sin navegador.
 */

export interface OpcionesPesoObjetivo {
    objetivoBytes: number;
    ancho: number;
    alto: number;
    /** Codifica la imagen a ese tamaño con calidad 0–1. */
    codificar: (ancho: number, alto: number, calidad: number) => Promise<Blob>;
    /** En %; por debajo los artefactos se vuelven muy visibles. */
    calidadMinima?: number;
    calidadMaxima?: number;
    /** No se achica por debajo de este lado largo (px). */
    ladoMinimo?: number;
    signal?: AbortSignal;
}

export interface ResultadoPesoObjetivo {
    blob: Blob;
    /** Calidad usada, en %. */
    calidad: number;
    ancho: number;
    alto: number;
    logrado: boolean;
    /** Hubo que achicar la imagen. */
    reducida: boolean;
    intentos: number;
}

const MAX_INTENTOS = 48;

export async function buscarPesoObjetivo(opciones: OpcionesPesoObjetivo): Promise<ResultadoPesoObjetivo> {
    const { objetivoBytes, codificar, signal } = opciones;
    const minima = opciones.calidadMinima ?? 40;
    const maxima = opciones.calidadMaxima ?? 92;
    const ladoMinimo = opciones.ladoMinimo ?? 64;
    let ancho = opciones.ancho;
    let alto = opciones.alto;
    let intentos = 0;
    let masLiviano: { blob: Blob; calidad: number; ancho: number; alto: number } | null = null;

    const probar = async (calidad: number) => {
        signal?.throwIfAborted();
        intentos += 1;
        const blob = await codificar(ancho, alto, calidad / 100);
        signal?.throwIfAborted();
        if (!masLiviano || blob.size < masLiviano.blob.size) masLiviano = { blob, calidad, ancho, alto };
        return blob;
    };
    const resultado = (blob: Blob, calidad: number): ResultadoPesoObjetivo => ({
        blob, calidad, ancho, alto, logrado: true, reducida: ancho !== opciones.ancho || alto !== opciones.alto, intentos,
    });

    for (let paso = 0; intentos < MAX_INTENTOS; paso++) {
        // A tamaño completo, si el objetivo es holgado basta un intento con la calidad alta.
        let techo = maxima + 1;
        if (paso === 0) {
            const alta = await probar(maxima);
            if (alta.size <= objetivoBytes) return resultado(alta, maxima);
            techo = maxima;
        }
        const baja = await probar(minima);
        if (baja.size <= objetivoBytes) {
            // Búsqueda binaria: «piso» siempre cabe y «techo» no (o está fuera del rango).
            let piso = minima;
            let mejor = baja;
            while (techo - piso > 1 && intentos < MAX_INTENTOS) {
                const medio = Math.floor((piso + techo) / 2);
                const blob = await probar(medio);
                if (blob.size <= objetivoBytes) { piso = medio; mejor = blob; } else techo = medio;
            }
            return resultado(mejor, piso);
        }
        const ladoLargo = Math.max(ancho, alto);
        if (ladoLargo <= ladoMinimo) break;
        // El peso crece más o menos con los píxeles: se estima la escala y se limita para no pasarse de golpe.
        const estimada = Math.sqrt(objetivoBytes / baja.size) * 0.95;
        const escala = Math.max(Math.min(0.9, Math.max(0.5, estimada)), ladoMinimo / ladoLargo);
        ancho = Math.max(1, Math.round(ancho * escala));
        alto = Math.max(1, Math.round(alto * escala));
    }

    const final = masLiviano as { blob: Blob; calidad: number; ancho: number; alto: number } | null;
    if (!final) throw new Error("No se pudo codificar la imagen.");
    return {
        ...final,
        logrado: final.blob.size <= objetivoBytes,
        reducida: final.ancho !== opciones.ancho || final.alto !== opciones.alto,
        intentos,
    };
}
