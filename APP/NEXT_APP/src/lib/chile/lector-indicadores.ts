/** Un valor con el momento en que se trajo de la fuente (ms desde 1970). */
export interface Guardado<T> { valor: T; momento: number }

export interface OpcionesLector<T> {
    /** Trae el valor de la fuente. Puede tardar: la página no la espera más de `esperaMs`. */
    cargar: () => Promise<T>;
    /** Guarda lo último bueno fuera del proceso (Redis), para que un reinicio no lo pierda. */
    guardar?: (v: Guardado<T>) => Promise<unknown>;
    /** Lee lo guardado. Si tarda más de `esperaMs`, se sigue sin ello. */
    leerGuardado?: () => Promise<Guardado<T> | null>;
    /** Hasta cuándo un valor no se vuelve a pedir. */
    frescoMs: number;
    /** Hasta cuándo un valor viejo todavía se muestra (mientras se refresca por detrás). */
    rancioMs: number;
    /** Lo más que espera una lectura sin nada que mostrar. */
    esperaMs: number;
    /** Tras un fallo, cuánto esperar antes de volver a pedir (si no, cada visita esperaría a una fuente caída). */
    pausaTrasFalloMs: number;
    ahora?: () => number;
}

/**
 * Lector de un dato de una fuente lenta o intermitente (los indicadores de mindicador.cl, que a ratos tardan 12 s):
 * sirve lo fresco; lo caducado lo sirve al tiro y lo refresca por detrás; sin nada, espera un momento y si no llega
 * devuelve null mientras la carga sigue. Lo último bueno queda guardado fuera del proceso, y tras un fallo no se
 * reintenta hasta pasada una pausa. Nunca lanza.
 */
export function crearLectorIndicadores<T>(op: OpcionesLector<T>): () => Promise<T | null> {
    const ahora = op.ahora ?? Date.now;
    let memoria: Guardado<T> | null = null, enCurso: Promise<void> | null = null, ultimoFallo = -Infinity, leidoGuardado = false;
    const conPlazo = <R>(p: Promise<R>, ms: number) => Promise.race([p, new Promise<undefined>((r) => setTimeout(() => r(undefined), ms))]);

    const refrescar = () => {
        if (enCurso || ahora() - ultimoFallo < op.pausaTrasFalloMs) return;
        enCurso = op.cargar()
            .then((valor) => {
                memoria = { valor, momento: ahora() };
                op.guardar?.(memoria).catch(() => { /* sin Redis: queda en memoria */ });
            })
            .catch(() => { ultimoFallo = ahora(); })
            .finally(() => { enCurso = null; });
    };

    return async () => {
        if (!memoria && !leidoGuardado && op.leerGuardado) {
            leidoGuardado = true;
            const g = await conPlazo(op.leerGuardado().catch(() => null), op.esperaMs);
            if (g && !memoria) memoria = g;
        }
        const edad = memoria ? ahora() - memoria.momento : Infinity;
        if (edad < op.frescoMs) return memoria!.valor;
        refrescar();
        if (edad < op.rancioMs) return memoria!.valor;
        if (enCurso) await conPlazo(enCurso, op.esperaMs);
        return memoria && ahora() - memoria.momento < op.rancioMs ? memoria.valor : null;
    };
}
