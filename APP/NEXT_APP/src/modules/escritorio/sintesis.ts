/**
 * Síntesis de los sonidos del escritorio, sin archivos y sin DOM: cada función devuelve las muestras (mono, -1 a 1) y el
 * reproductor (sonido.ts) las pasa a un AudioBuffer. Al no depender del navegador, las pruebas miden el sonido en Node.
 *
 * El clic «Mouse» imita un microinterruptor de mouse: un golpe seco de un par de milisegundos con la energía entre 4 y
 * 11 kHz, un golpe sordo grave muy por debajo y dos rebotes del resorte. Es el carácter del clic de bait.cl que le gustó al
 * dueño, medido el 26-11-2026 (centroide cerca de 8 kHz, bandas de 4 a 11 kHz, rebotes a -22 y -27 dB): se reprodujo la
 * forma del espectro y de la envolvente con modos al azar, no la grabación.
 */
export type TipoClic = "mouse" | "silencioso" | "retro";
export type Fase = "presionar" | "soltar";

/** Forma del espectro: nivel en dB por frecuencia (Hz), interpolado en escala logarítmica. */
type Perfil = [number, number][];

interface Receta {
    /** Dónde caen los modos (Hz) y cuánto pesa cada frecuencia. */
    desde: number; hasta: number; perfil: Perfil; modos: number;
    /** Caída de cada modo (s), entre estos dos valores. */
    caida: [number, number];
    /** Golpes sordos graves: frecuencia (Hz), amplitud relativa a los modos y caída (s). */
    sordos: [number, number, number][];
    /** Rebotes del resorte: [segundos después del golpe, amplitud relativa]. */
    rebotes: [number, number][];
    /** Pico final de la muestra. */
    pico: number;
}

const RECETAS: Record<TipoClic, Record<Fase, Receta>> = {
    mouse: {
        // Bandas de tercio de octava de bait.cl, en su frecuencia central.
        presionar: {
            desde: 3200, hasta: 12800, modos: 32, caida: [0.0009, 0.003],
            perfil: [[3600, -21], [4500, -9], [5700, -6], [7200, -10], [8000, -10], [9000, 0], [11400, -2], [12800, -4], [13500, -19], [14400, -22]],
            sordos: [[85, 0.08, 0.012], [150, 0.055, 0.008]],
            rebotes: [[0.0035, 0.2], [0.011, 0.08], [0.018, 0.05], [0.025, 0.028]], pico: 0.95,
        },
        soltar: {
            desde: 3400, hasta: 15000, modos: 30, caida: [0.0006, 0.0018],
            perfil: [[3600, -24], [4500, -22], [5700, -12], [7200, -17], [8000, -16], [9000, 0], [11400, -6], [12800, -8], [13500, -20], [14400, -22]],
            sordos: [[95, 0.1, 0.01], [140, 0.07, 0.007]],
            rebotes: [[0.0045, 0.17], [0.0095, 0.07], [0.012, 0.06], [0.019, 0.04]], pico: 0.62,
        },
    },
    silencioso: {
        presionar: {
            desde: 600, hasta: 6000, modos: 12, caida: [0.0015, 0.0035],
            perfil: [[1000, -6], [1600, 0], [2500, -3], [4000, -12], [6400, -24]],
            sordos: [[95, 0.3, 0.009]], rebotes: [], pico: 0.6,
        },
        soltar: {
            desde: 800, hasta: 6000, modos: 10, caida: [0.0012, 0.003],
            perfil: [[1000, -8], [1800, 0], [2800, -3], [4000, -12], [6400, -24]],
            sordos: [[110, 0.26, 0.008]], rebotes: [], pico: 0.42,
        },
    },
    retro: {
        presionar: {
            desde: 1400, hasta: 9000, modos: 16, caida: [0.0012, 0.0028],
            perfil: [[1600, -12], [2500, -4], [3200, 0], [4000, -2], [5000, -6], [6400, -12], [8000, -20]],
            sordos: [[85, 0.11, 0.012]], rebotes: [[0.011, 0.12]], pico: 0.85,
        },
        soltar: {
            desde: 1600, hasta: 9500, modos: 14, caida: [0.001, 0.0024],
            perfil: [[1600, -14], [2500, -6], [3600, 0], [4500, -2], [5600, -6], [7000, -12], [8000, -20]],
            sordos: [[95, 0.09, 0.009]], rebotes: [[0.009, 0.1]], pico: 0.58,
        },
    },
};

/** Generador con semilla (mulberry32): la misma semilla da el mismo sonido. */
function azar(semilla: number): () => number {
    let a = (semilla >>> 0) || 1;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function nivel(perfil: Perfil, f: number): number {
    if (f <= perfil[0][0]) return perfil[0][1];
    const ultimo = perfil[perfil.length - 1];
    if (f >= ultimo[0]) return ultimo[1];
    for (let i = 1; i < perfil.length; i++) {
        const [f1, d1] = perfil[i - 1], [f2, d2] = perfil[i];
        if (f <= f2) return d1 + ((d2 - d1) * Math.log(f / f1)) / Math.log(f2 / f1);
    }
    return ultimo[1];
}

/** Suma un modo amortiguado (seno que se apaga) desde la muestra `ini`. */
function modo(y: Float32Array, sr: number, ini: number, f: number, amp: number, caida: number, fase = 0) {
    const fin = Math.min(y.length, ini + Math.ceil(caida * 9 * sr));
    const w = (2 * Math.PI * f) / sr, k = Math.exp(-1 / (caida * sr)), subida = 1 - Math.exp(-1 / (0.00025 * sr));
    let env = amp, entrada = 0;
    for (let n = ini; n < fin; n++) {
        entrada += (1 - entrada) * subida; // subida de 0,25 ms: el filo lo pone el chasquido, no el arranque de cada modo
        y[n] += env * entrada * Math.sin(w * (n - ini) + fase);
        env *= k;
    }
}

/** Ruido muy corto y filtrado hacia los agudos: el filo del golpe. */
function chasquido(y: Float32Array, sr: number, ini: number, amp: number, caida: number, r: () => number) {
    const fin = Math.min(y.length, ini + Math.ceil(caida * 8 * sr));
    let a1 = 0, a2 = 0, bajo = 0, env = amp;
    const k = Math.exp(-1 / (caida * sr)), alfa = 1 - Math.exp((-2 * Math.PI * 10000) / sr);
    for (let n = ini; n < fin; n++) {
        const blanco = r() * 2 - 1;
        // Segunda diferencia (paso alto, para no ensuciar los medios) y un paso bajo a 10 kHz (para no chirriar).
        bajo += alfa * ((blanco - 2 * a1 + a2) / 4 - bajo);
        y[n] += bajo * env;
        a2 = a1; a1 = blanco;
        env *= k;
    }
}

function normalizar(y: Float32Array, pico: number): Float32Array {
    let m = 0;
    for (let i = 0; i < y.length; i++) m = Math.max(m, Math.abs(y[i]));
    if (m > 0) for (let i = 0; i < y.length; i++) y[i] *= pico / m;
    return y;
}

/**
 * Un golpe de modos al azar dentro del perfil, más su filo de ruido. Las frecuencias se sortean con la forma del perfil
 * (se acepta cada una con probabilidad igual a su potencia): así el espectro sigue al perfil aunque haya pocos modos.
 */
function golpe(y: Float32Array, sr: number, ini: number, receta: Receta, amp: number, r: () => number) {
    const { desde, hasta, perfil, modos, caida } = receta;
    for (let i = 0; i < modos; i++) {
        let f = desde, intentos = 0;
        do f = desde * (hasta / desde) ** r(); while (r() > 10 ** (nivel(perfil, f) / 10) && ++intentos < 64);
        modo(y, sr, ini, f, (0.6 + 0.4 * r()) * amp, caida[0] + (caida[1] - caida[0]) * r());
    }
    chasquido(y, sr, ini, 1.1 * amp, 0.00022, r);
}

/** Un clic: presionar o soltar, con su variante según la semilla (cuatro variantes bastan para que no suene a máquina). */
export function sintetizarClic(tipo: TipoClic, fase: Fase, semilla: number, sr: number): Float32Array {
    const receta = RECETAS[tipo][fase];
    const r = azar(semilla * 7919 + (fase === "soltar" ? 104729 : 0) + (tipo === "mouse" ? 0 : tipo === "silencioso" ? 31337 : 65521));
    const y = new Float32Array(Math.ceil(0.05 * sr));
    const ini = Math.round(0.0004 * sr);
    golpe(y, sr, ini, receta, 1, r);
    for (const [fs, as, cs] of receta.sordos) modo(y, sr, ini, fs * (0.92 + 0.16 * r()), as * receta.modos ** 0.5, cs);
    for (const [t, a] of receta.rebotes) golpe(y, sr, ini + Math.round((t + (r() - 0.5) * 0.002) * sr), receta, a, r);
    return normalizar(y, receta.pico * (0.94 + 0.06 * r()));
}

/** Una tecla de teclado mecánico: golpe grave del fondo, choque de la tapa y chasquido del interruptor. */
export function sintetizarTecla(semilla: number, sr: number): Float32Array {
    const r = azar(semilla * 15485863 + 7);
    const y = new Float32Array(Math.ceil(0.07 * sr));
    const ini = Math.round(0.0004 * sr);
    modo(y, sr, ini, 90 + 90 * r(), 0.4, 0.009);
    modo(y, sr, ini, 180 + 60 * r(), 0.22, 0.006);
    for (let i = 0; i < 7; i++) modo(y, sr, ini, 1300 * 2.8 ** r(), 0.3 + 0.3 * r(), 0.002 + 0.003 * r());
    for (let i = 0; i < 10; i++) modo(y, sr, ini, 4800 * 2.2 ** r(), 0.45 + 0.35 * r(), 0.0009 + 0.0013 * r());
    chasquido(y, sr, ini, 1.6, 0.0004, r);
    return normalizar(y, 0.8 * (0.9 + 0.1 * r()));
}

/** Notas suaves y propias: dos para una notificación, tres para entrar al escritorio. */
export function sintetizarAviso(tipo: "notificacion" | "inicio", sr: number): Float32Array {
    const notas: [number, number, number][] = tipo === "notificacion"
        ? [[0, 784, 0.6], [0.11, 1175, 0.5]] // sol y re, una quinta arriba
        : [[0, 523.25, 0.45], [0.09, 783.99, 0.4], [0.18, 1318.5, 0.32]]; // do, sol y mi: acorde abierto que sube
    const largo = tipo === "notificacion" ? 0.9 : 1.4;
    const y = new Float32Array(Math.ceil(largo * sr));
    const ataque = tipo === "notificacion" ? 0.006 : 0.035, caida = tipo === "notificacion" ? 0.22 : 0.45;
    for (const [t, f, a] of notas) {
        const ini = Math.round(t * sr), w = (2 * Math.PI * f) / sr;
        for (let n = ini; n < y.length; n++) {
            const s = (n - ini) / sr;
            const env = a * Math.min(1, s / ataque) * Math.exp(-s / caida);
            y[n] += env * (Math.sin(w * (n - ini)) + 0.12 * Math.sin(2 * w * (n - ini)));
        }
    }
    // Cola sin cortes: los últimos 30 ms bajan a cero.
    const cola = Math.round(0.03 * sr);
    for (let i = 0; i < cola; i++) y[y.length - 1 - i] *= i / cola;
    return normalizar(y, 0.7);
}

/** FFT de raíz 2 en sitio (para medir; no se usa al reproducir). */
function fft(re: Float64Array, im: Float64Array) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
        let b = n >> 1;
        for (; j & b; b >>= 1) j ^= b;
        j ^= b;
        if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
    }
    for (let len = 2; len <= n; len <<= 1) {
        const ang = (-2 * Math.PI) / len, mitad = len >> 1;
        for (let i = 0; i < n; i += len) {
            for (let k = 0; k < mitad; k++) {
                const c = Math.cos(ang * k), s = Math.sin(ang * k);
                const vr = re[i + k + mitad] * c - im[i + k + mitad] * s, vi = re[i + k + mitad] * s + im[i + k + mitad] * c;
                re[i + k + mitad] = re[i + k] - vr; im[i + k + mitad] = im[i + k] - vi;
                re[i + k] += vr; im[i + k] += vi;
            }
        }
    }
}

/** Espectro de potencia: [frecuencia, potencia] por cada línea de la FFT. */
function potencias(x: Float32Array, sr: number): [number, number][] {
    let n = 4096;
    while (n < x.length) n <<= 1;
    const re = new Float64Array(n), im = new Float64Array(n);
    re.set(x);
    fft(re, im);
    const out: [number, number][] = [];
    for (let k = 0; k < n / 2; k++) out.push([(k * sr) / n, re[k] * re[k] + im[k] * im[k]]);
    return out;
}

/** Centro de gravedad del espectro de potencia (Hz): qué tan agudo se oye. */
export function centroide(x: Float32Array, sr: number): number {
    let num = 0, den = 0;
    for (const [f, p] of potencias(x, sr)) { num += f * p; den += p; }
    return den > 0 ? num / den : 0;
}

/** Energía entre dos frecuencias (Hz), en unidades de la FFT: sirve para comparar bandas de un mismo sonido. */
export function energiaEntre(x: Float32Array, sr: number, desde: number, hasta: number): number {
    let e = 0;
    for (const [f, p] of potencias(x, sr)) if (f >= desde && f < hasta) e += p;
    return e;
}

/** Hasta qué segundo la envolvente (ventanas de 1 ms) sigue por encima de `db` respecto de su pico. */
export function duracionSobre(x: Float32Array, sr: number, db: number): number {
    const v = Math.max(1, Math.round(sr / 1000)), niveles: number[] = [];
    for (let i = 0; i + v <= x.length; i += v) {
        let s = 0;
        for (let j = 0; j < v; j++) s += x[i + j] * x[i + j];
        niveles.push(Math.sqrt(s / v));
    }
    const pico = Math.max(...niveles), umbral = pico * 10 ** (db / 20);
    let ultimo = 0;
    niveles.forEach((nv, i) => { if (nv >= umbral) ultimo = i; });
    return ((ultimo + 1) * v) / sr;
}
