/**
 * Sonidos del modo escritorio, sintetizados con Web Audio: no se descarga ningún archivo.
 *
 * Cada sonido se dibuja una sola vez con OfflineAudioContext (tres variantes por clic, para que no suene a máquina) y
 * después solo se reproduce: un clic cuesta un nodo y suena sin retraso. El contexto de audio nace con el primer gesto
 * de la persona, como exigen los navegadores, y se suspende cuando la pestaña no está a la vista.
 */
export type TipoClic = "suave" | "nitido" | "madera";
export type Efecto = "abrir" | "cerrar" | "minimizar";
export interface PreferenciasSonido {
    activo: boolean;
    /** 0 a 1. La ganancia es su cuadrado: el oído percibe el volumen en escala logarítmica. */
    volumen: number;
    tipo: TipoClic;
    clic: boolean;
    teclas: boolean;
    ventanas: boolean;
}

export const TIPOS_CLIC: { id: TipoClic; nombre: string }[] = [{ id: "suave", nombre: "Suave" }, { id: "nitido", nombre: "Nítido" }, { id: "madera", nombre: "Madera" }];

interface Ruido { tipo: BiquadFilterType; f: number; f2?: number; q?: number; hp?: number; pico: number; ataque?: number; caida: number }
interface Tono { forma?: OscillatorType; f: number; f2?: number; pico: number; ataque?: number; caida: number }
type Capa = ["r", Ruido] | ["t", Tono];
const R = (p: Ruido): Capa => ["r", p], T = (p: Tono): Capa => ["t", p];

/** Al presionar suena el golpe; al soltar, el retorno del botón, más corto y más agudo. */
const CLICS: Record<TipoClic, { presionar: Capa[]; soltar: Capa[] }> = {
    suave: {
        presionar: [R({ tipo: "bandpass", f: 1900, q: 0.8, pico: 0.8, caida: 0.028 }), T({ f: 165, f2: 105, pico: 0.45, ataque: 0.002, caida: 0.034 })],
        soltar: [R({ tipo: "bandpass", f: 2800, q: 1, pico: 0.42, caida: 0.016 }), T({ f: 240, f2: 200, pico: 0.14, caida: 0.018 })],
    },
    nitido: {
        presionar: [R({ tipo: "bandpass", f: 4300, q: 2.6, hp: 2200, pico: 1, ataque: 0.0005, caida: 0.01 }), T({ f: 3100, pico: 0.15, ataque: 0.0005, caida: 0.012 }), T({ f: 280, f2: 220, pico: 0.22, caida: 0.014 })],
        soltar: [R({ tipo: "bandpass", f: 5200, q: 2.2, hp: 3000, pico: 0.55, ataque: 0.0005, caida: 0.007 }), T({ f: 4100, pico: 0.07, ataque: 0.0005, caida: 0.008 })],
    },
    madera: {
        presionar: [R({ tipo: "lowpass", f: 1300, q: 0.7, pico: 0.9, ataque: 0.0015, caida: 0.045 }), T({ forma: "triangle", f: 130, f2: 82, pico: 0.55, ataque: 0.002, caida: 0.06 }), R({ tipo: "bandpass", f: 720, q: 4, pico: 0.35, caida: 0.03 })],
        soltar: [R({ tipo: "bandpass", f: 1600, q: 2, pico: 0.32, caida: 0.02 }), T({ f: 190, f2: 160, pico: 0.16, caida: 0.024 })],
    },
};

/** Las ventanas: abrir sube, cerrar baja y minimizar es un soplo que se va. Bajos a propósito. */
const EFECTOS: Record<Efecto, Capa[]> = {
    abrir: [T({ f: 520, f2: 780, pico: 0.11, ataque: 0.008, caida: 0.11 }), T({ f: 1040, f2: 1560, pico: 0.035, ataque: 0.008, caida: 0.08 })],
    cerrar: [T({ f: 660, f2: 400, pico: 0.09, ataque: 0.006, caida: 0.1 })],
    minimizar: [R({ tipo: "bandpass", f: 2400, f2: 700, q: 1.4, pico: 0.16, ataque: 0.01, caida: 0.13 })],
};

const SR = 44100;

function ruido(oc: BaseAudioContext, dur: number, semilla: number): AudioBufferSourceNode {
    const b = oc.createBuffer(1, Math.ceil(SR * dur), SR), d = b.getChannelData(0);
    let s = (semilla * 7919) % 233280;
    for (let i = 0; i < d.length; i++) { s = (s * 9301 + 49297) % 233280; d[i] = s / 116640 - 1; }
    const n = oc.createBufferSource();
    n.buffer = b;
    return n;
}

function envolvente(g: GainNode, pico: number, ataque: number, caida: number) {
    g.gain.setValueAtTime(0.0001, 0);
    g.gain.exponentialRampToValueAtTime(pico, ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, ataque + caida);
}

async function dibujar(capas: Capa[], semilla: number, dur = 0.16): Promise<AudioBuffer> {
    const oc = new OfflineAudioContext(1, Math.ceil(SR * dur), SR);
    const sal = oc.createGain();
    sal.gain.value = 0.9;
    const comp = oc.createDynamicsCompressor();
    comp.threshold.value = -8; comp.ratio.value = 6; comp.attack.value = 0.001; comp.release.value = 0.05;
    sal.connect(comp).connect(oc.destination);
    capas.forEach(([tipo, p], i) => {
        const ataque = p.ataque ?? 0.001;
        const g = oc.createGain();
        envolvente(g, p.pico, ataque, p.caida);
        g.connect(sal);
        if (tipo === "r") {
            const n = ruido(oc, ataque + p.caida + 0.01, semilla * 31 + i);
            let nodo: AudioNode = n;
            if (p.hp) { const h = oc.createBiquadFilter(); h.type = "highpass"; h.frequency.value = p.hp; nodo = nodo.connect(h); }
            const f = oc.createBiquadFilter();
            f.type = p.tipo; f.Q.value = p.q ?? 1;
            f.frequency.setValueAtTime(p.f, 0);
            if (p.f2) f.frequency.exponentialRampToValueAtTime(p.f2, ataque + p.caida);
            nodo.connect(f).connect(g);
            n.start(0);
        } else {
            const o = oc.createOscillator();
            o.type = p.forma ?? "sine";
            o.frequency.setValueAtTime(p.f, 0);
            if (p.f2) o.frequency.exponentialRampToValueAtTime(p.f2, ataque + p.caida);
            o.connect(g);
            o.start(0); o.stop(ataque + p.caida + 0.01);
        }
    });
    return oc.startRendering();
}

const CLAVE = "escritorio:sonido";
const BASE: PreferenciasSonido = { activo: true, volumen: 0.6, tipo: "suave", clic: true, teclas: true, ventanas: true };

/** Lo guardado, validado campo por campo. En pantallas táctiles el sonido parte apagado: un toque no suena a mouse. */
export function leerPreferencias(tactil: boolean): PreferenciasSonido {
    const p: PreferenciasSonido = { ...BASE, activo: !tactil };
    try {
        const g = JSON.parse(localStorage.getItem(CLAVE) ?? "null") as Partial<PreferenciasSonido> | null;
        if (g && typeof g === "object") {
            for (const k of ["activo", "clic", "teclas", "ventanas"] as const) if (typeof g[k] === "boolean") p[k] = g[k];
            if (typeof g.volumen === "number" && g.volumen >= 0 && g.volumen <= 1) p.volumen = g.volumen;
            if (typeof g.tipo === "string" && Object.hasOwn(CLICS, g.tipo)) p.tipo = g.tipo;
        }
    } catch { /* sin almacenamiento o dato roto: valen las de fábrica */ }
    return p;
}

export class SonidoEscritorio {
    private ctx: AudioContext | null = null;
    private maestro: GainNode | null = null;
    private clics: Partial<Record<TipoClic, { presionar: AudioBuffer[]; soltar: AudioBuffer[] }>> = {};
    private efectos: Partial<Record<Efecto, AudioBuffer>> = {};
    readonly listo: Promise<void>;

    constructor(public prefs: PreferenciasSonido) {
        this.listo = this.preparar();
    }

    private async preparar() {
        if (typeof OfflineAudioContext === "undefined") return;
        // Primero el clic elegido: el primer toque no espera a los demás.
        const orden = [this.prefs.tipo, ...TIPOS_CLIC.map((t) => t.id).filter((t) => t !== this.prefs.tipo)];
        for (const t of orden) {
            try {
                const [presionar, soltar] = await Promise.all([
                    Promise.all([1, 2, 3].map((s) => dibujar(CLICS[t].presionar, s))),
                    Promise.all([4, 5, 6].map((s) => dibujar(CLICS[t].soltar, s))),
                ]);
                this.clics[t] = { presionar, soltar };
            } catch { /* este tipo no suena; los demás sí */ }
        }
        for (const e of Object.keys(EFECTOS) as Efecto[]) {
            try { this.efectos[e] = await dibujar(EFECTOS[e], 9, 0.22); } catch { /* sin este efecto */ }
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

    presionar(fuerza = 1) { if (this.prefs.clic) this.tocar(this.alAzar(this.clics[this.prefs.tipo]?.presionar), fuerza, 0.04); }
    soltar(fuerza = 0.72) { if (this.prefs.clic) this.tocar(this.alAzar(this.clics[this.prefs.tipo]?.soltar), fuerza, 0.04); }
    /** Las teclas usan el mismo clic, más suave; Enter, espacio y borrar suenan como el golpe. */
    tecla(fuerte: boolean) {
        if (!this.prefs.teclas) return;
        const c = this.clics[this.prefs.tipo];
        this.tocar(this.alAzar(fuerte ? c?.presionar : c?.soltar), fuerte ? 0.6 : 0.5, 0.08);
    }
    efecto(e: Efecto) { if (this.prefs.ventanas) this.tocar(this.efectos[e], 1, 0.02); }
    /** Para probar el tipo elegido: golpe y retorno, aunque el clic del mouse esté apagado. */
    muestra() {
        const c = this.clics[this.prefs.tipo];
        this.tocar(this.alAzar(c?.presionar), 1, 0.04);
        setTimeout(() => this.tocar(this.alAzar(c?.soltar), 0.72, 0.04), 95);
    }
    suspender(v: boolean) {
        if (this.ctx) void (v ? this.ctx.suspend() : this.ctx.resume()).catch(() => undefined);
    }
    cerrar() {
        void this.ctx?.close().catch(() => undefined);
        this.ctx = null; this.maestro = null;
    }
}
