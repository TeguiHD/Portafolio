/**
 * Los sonidos del modo escritorio. Se fabrican con síntesis (sintesis.ts), sin descargar archivos: cuatro variantes por
 * golpe del clic y ocho teclas, para que no suene a grabación repetida. Las muestras se dibujan una vez, apenas carga la
 * página; el contexto de audio nace con el primer gesto, como exigen los navegadores, y se suspende con la pestaña oculta.
 * Como Windows, no hay sonidos al abrir, minimizar o cerrar ventanas: solo el clic, el teclado, las notificaciones y el
 * inicio de sesión.
 */
import { sintetizarAviso, sintetizarClic, sintetizarTecla, type TipoClic } from "./sintesis";

export type { TipoClic } from "./sintesis";
export type Aviso = "notificacion" | "inicio";

export interface PreferenciasSonido {
    activo: boolean;
    /** 0 a 1. La ganancia es su cuadrado: el oído percibe el volumen en escala logarítmica. */
    volumen: number;
    tipo: TipoClic;
    clic: boolean;
    teclas: boolean;
    /** Notificaciones e inicio de sesión. */
    avisos: boolean;
}

export const TIPOS_CLIC: { id: TipoClic; nombre: string; detalle: string }[] = [
    { id: "mouse", nombre: "Mouse", detalle: "Seco y agudo, como un mouse de oficina" },
    { id: "silencioso", nombre: "Silencioso", detalle: "Apagado, como un mouse sin clic" },
    { id: "retro", nombre: "Retro", detalle: "Con más cuerpo, como un mouse antiguo" },
];

const CLAVE = "escritorio:sonido";
const SR = 44100;
const BASE: PreferenciasSonido = { activo: true, volumen: 0.6, tipo: "mouse", clic: true, teclas: true, avisos: true };

/**
 * Lo guardado, validado campo por campo. En pantallas táctiles el sonido parte apagado: un toque no suena a mouse.
 * Las preferencias de la versión anterior («suave», «ventanas») caen a lo de fábrica sin romper nada.
 */
export function interpretarPreferencias(texto: string | null, tactil: boolean): PreferenciasSonido {
    const p: PreferenciasSonido = { ...BASE, activo: !tactil };
    try {
        const g = JSON.parse(texto ?? "null") as Partial<Record<keyof PreferenciasSonido, unknown>> | null;
        if (g && typeof g === "object") {
            for (const k of ["activo", "clic", "teclas", "avisos"] as const) if (typeof g[k] === "boolean") p[k] = g[k];
            if (typeof g.volumen === "number" && g.volumen >= 0 && g.volumen <= 1) p.volumen = g.volumen;
            if (typeof g.tipo === "string" && TIPOS_CLIC.some((t) => t.id === g.tipo)) p.tipo = g.tipo as TipoClic;
        }
    } catch { /* dato roto: valen las de fábrica */ }
    return p;
}

export function leerPreferencias(tactil: boolean): PreferenciasSonido {
    let texto: string | null = null;
    try { texto = localStorage.getItem(CLAVE); } catch { /* sin almacenamiento */ }
    return interpretarPreferencias(texto, tactil);
}

function aBuffer(x: Float32Array): AudioBuffer {
    const b = new AudioBuffer({ length: x.length, numberOfChannels: 1, sampleRate: SR });
    b.getChannelData(0).set(x);
    return b;
}

export class SonidoEscritorio {
    private ctx: AudioContext | null = null;
    private maestro: GainNode | null = null;
    private clics: Partial<Record<TipoClic, { presionar: AudioBuffer[]; soltar: AudioBuffer[] }>> = {};
    private teclas: AudioBuffer[] = [];
    private avisos: Partial<Record<Aviso, AudioBuffer>> = {};
    readonly listo: Promise<void>;

    constructor(public prefs: PreferenciasSonido) {
        this.listo = this.preparar();
    }

    /** Primero el clic elegido (el primer toque no espera a los demás); el resto, en pausas, sin trabar la página. */
    private async preparar() {
        if (typeof AudioBuffer === "undefined") return;
        const pausa = () => new Promise<void>((r) => setTimeout(r, 0));
        const orden = [this.prefs.tipo, ...TIPOS_CLIC.map((t) => t.id).filter((t) => t !== this.prefs.tipo)];
        for (const t of orden) {
            try {
                this.clics[t] = {
                    presionar: [1, 2, 3, 4].map((s) => aBuffer(sintetizarClic(t, "presionar", s, SR))),
                    soltar: [1, 2, 3, 4].map((s) => aBuffer(sintetizarClic(t, "soltar", s, SR))),
                };
            } catch { /* este tipo no suena; los demás sí */ }
            await pausa();
        }
        try { this.teclas = [1, 2, 3, 4, 5, 6, 7, 8].map((s) => aBuffer(sintetizarTecla(s, SR))); } catch { /* sin teclado */ }
        await pausa();
        for (const a of ["notificacion", "inicio"] as const) {
            try { this.avisos[a] = aBuffer(sintetizarAviso(a, SR)); } catch { /* sin este aviso */ }
        }
    }

    cambiar(p: Partial<PreferenciasSonido>) {
        this.prefs = { ...this.prefs, ...p };
        try { localStorage.setItem(CLAVE, JSON.stringify(this.prefs)); } catch { /* vale para esta visita */ }
        this.ajustarVolumen();
    }

    private ajustarVolumen() {
        if (this.maestro) this.maestro.gain.value = this.prefs.activo ? this.prefs.volumen ** 2 : 0;
    }

    private asegurar(): boolean {
        if (typeof AudioContext === "undefined") return false;
        if (!this.ctx) {
            this.ctx = new AudioContext({ latencyHint: "interactive" });
            this.maestro = this.ctx.createGain();
            this.maestro.connect(this.ctx.destination);
        }
        if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => undefined);
        this.ajustarVolumen();
        return true;
    }

    private tocar(b: AudioBuffer | undefined, fuerza: number, variacion: number) {
        if (!b || !this.prefs.activo || this.prefs.volumen <= 0 || !this.asegurar() || !this.ctx || !this.maestro) return;
        const s = this.ctx.createBufferSource(), g = this.ctx.createGain();
        s.buffer = b;
        s.playbackRate.value = 1 + (Math.random() * 2 - 1) * variacion;
        g.gain.value = fuerza;
        s.connect(g).connect(this.maestro);
        s.start();
    }

    private alAzar(lista?: AudioBuffer[]) { return lista?.[Math.floor(Math.random() * lista.length)]; }

    /** El golpe de soltar ya viene más suave de fábrica (como en un mouse real): los dos se tocan con la misma fuerza. */
    presionar(fuerza = 1) { if (this.prefs.clic) this.tocar(this.alAzar(this.clics[this.prefs.tipo]?.presionar), fuerza, 0.04); }
    soltar(fuerza = 1) { if (this.prefs.clic) this.tocar(this.alAzar(this.clics[this.prefs.tipo]?.soltar), fuerza, 0.04); }
    /** Enter, espacio y borrar suenan más fuerte que las letras. */
    tecla(fuerte: boolean) { if (this.prefs.teclas) this.tocar(this.alAzar(this.teclas), fuerte ? 0.75 : 0.5, 0.08); }
    aviso(a: Aviso) { if (this.prefs.avisos) this.tocar(this.avisos[a], 0.8, 0); }
    /** Sin sonido: Windows no suena al abrir, minimizar o cerrar ventanas. Queda mientras el escritorio se rehace. */
    efecto(_e: "abrir" | "cerrar" | "minimizar") { /* sin sonido */ }
    /** Para probar el tipo elegido: golpe y retorno, aunque el clic del mouse esté apagado. */
    muestra() {
        const c = this.clics[this.prefs.tipo];
        this.tocar(this.alAzar(c?.presionar), 1, 0.04);
        setTimeout(() => this.tocar(this.alAzar(c?.soltar), 1, 0.04), 95);
    }
    suspender(v: boolean) {
        if (this.ctx) void (v ? this.ctx.suspend() : this.ctx.resume()).catch(() => undefined);
    }
    cerrar() {
        void this.ctx?.close().catch(() => undefined);
        this.ctx = null; this.maestro = null;
    }
}
