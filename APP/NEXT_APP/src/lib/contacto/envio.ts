/**
 * El envío del formulario de contacto, compartido por la portada («Conversemos») y la app Correo del modo escritorio:
 * mismos topes que el servidor (src/app/api/contact/route.ts), misma trampa para robots, mismo tiempo mínimo y los mismos
 * mensajes cuando algo falla. Cambiar algo aquí lo cambia en los dos lados.
 */
export const CORREO_CONTACTO = "contacto@nicoholas.dev";

export const LIMITES_CONTACTO = {
    MIN_MENSAJE: 10,
    MAX_MENSAJE: 2000,
    /** Desde este largo se muestra cuánto queda: maxLength corta en silencio lo que se pega de más. */
    AVISO_LARGO: 1800,
    /** El servidor descarta en silencio lo que llega antes de 3 s de abrir el formulario (filtro de bots). */
    ESPERA_MINIMA: 3200,
    /** La hora del servidor llega redondeada al segundo y con el retardo de la red: se resta este margen (ms). */
    MARGEN_RELOJ: 1500,
} as const;

export const MENSAJES_CONTACTO = {
    DEMASIADOS: "Recibí varios mensajes seguidos. Prueba de nuevo en una hora o escríbeme al correo.",
    FALLO: "No pude enviar el mensaje. Prueba otra vez o escríbeme al correo.",
    REVISAR: "Revisa el correo y el mensaje, y prueba otra vez.",
    LENTO: "El envío tardó demasiado. Prueba otra vez o escríbeme al correo.",
    SIN_RED: "No hay conexión a internet: el mensaje no salió. Lo escrito sigue aquí; prueba cuando vuelva la conexión.",
    CORTO: "Cuéntame un poco más: al menos 10 caracteres, sin contar los espacios.",
} as const;

export interface DatosContacto { name?: string; email: string; message: string; origen?: string; website: string }
export type ResultadoContacto = { ok: true } | { ok: false; error: string };

/** minLength cuenta los espacios; el servidor no. Sin esto, «         a» gastaba uno de los 3 envíos por hora en un rechazo. */
export function mensajeCorto(mensaje: string): boolean {
    return mensaje.trim().length < LIMITES_CONTACTO.MIN_MENSAJE;
}

/**
 * Cuánto adelanta o atrasa el reloj del servidor respecto del de este equipo (ms), o null si no se pudo medir. El servidor
 * compara la hora de apertura con SU reloj: con el del visitante adelantado, vería un envío «demasiado rápido» y lo
 * descartaría en silencio.
 */
export async function medirDesfase(): Promise<number | null> {
    try {
        const r = await fetch("/robots.txt", { method: "HEAD", cache: "no-store" });
        const hora = Date.parse(r.headers.get("date") ?? "");
        return Number.isFinite(hora) ? hora - Date.now() : null;
    } catch {
        return null;
    }
}

/**
 * Envía el mensaje. `abierto` es cuándo se abrió el formulario (Date.now() de la primera vez) y `desfase`, lo que midió
 * `medirDesfase`. Espera lo que falte del tiempo mínimo, corta a los 30 s y traduce cada falla a su mensaje.
 */
export async function enviarContacto(datos: DatosContacto, abierto: number, desfase: number): Promise<ResultadoContacto> {
    const corte = new AbortController(), reloj = setTimeout(() => corte.abort(), 30000);
    try {
        const falta = LIMITES_CONTACTO.ESPERA_MINIMA - (Date.now() - abierto);
        if (falta > 0) await new Promise((r) => setTimeout(r, falta));
        const r = await fetch("/api/contact", {
            method: "POST", headers: { "Content-Type": "application/json" }, signal: corte.signal,
            body: JSON.stringify({ ...datos, formStartTime: Math.round(abierto + desfase - LIMITES_CONTACTO.MARGEN_RELOJ) }),
        });
        const cuerpo: { success?: boolean; error?: string } = await r.json().catch(() => ({}));
        if (r.ok && cuerpo.success) return { ok: true };
        if (r.status === 429) return { ok: false, error: MENSAJES_CONTACTO.DEMASIADOS };
        if (r.status === 400) return { ok: false, error: typeof cuerpo.error === "string" && cuerpo.error ? `${cuerpo.error.replace(/^Email/, "Correo")}.` : MENSAJES_CONTACTO.REVISAR };
        return { ok: false, error: MENSAJES_CONTACTO.FALLO };
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return { ok: false, error: MENSAJES_CONTACTO.LENTO };
        return { ok: false, error: navigator.onLine === false ? MENSAJES_CONTACTO.SIN_RED : MENSAJES_CONTACTO.FALLO };
    } finally {
        clearTimeout(reloj);
    }
}
