import { FIGURAS, mosaicoDeImagen, nubeDeFigura, nubeDeTexto, nubeDeTrazo, type Mosaico, type Nube } from "./figuras";
import { radiosAnillo } from "./anillo";

/**
 * Motor de «Materia viva»: un solo cuerpo de partículas en un lienzo fijo, que cambia de forma.
 *
 * Reglas que mantienen el bucle liviano (medidas con la CPU a un cuarto):
 *  - Las anclas se miden en medir() (al desplazar, al cambiar de tamaño y cada 600 ms), NUNCA dentro del cuadro.
 *  - Se pinta con fillRect; solo las partículas que toca el cursor usan arco.
 *  - Si los cuadros se atrasan, baja la cantidad de partículas activas.
 *  - Si nada se mueve (forma quieta, sin cursor ni desplazamiento), deja de pintar hasta que algo la despierte.
 *  - Al desplazar, lo que va anclado a la página se corre con ella en el mismo cuadro (no la persigue con el resorte).
 */
export type Forma = "figuras" | "texto" | "imagen" | "olas" | "marco" | "anillo" | "firma";
/** El tiempo del lugar, hecho materia: manda sobre la forma de la sección mientras está puesto. */
export type Clima = "lluvia" | "nieve" | "sol" | "noche" | "nubes";
type FormaActiva = Forma | "clima";

export interface Motor {
    /** Pone la materia a hacer de clima (lluvia que cae, sol que sube, noche que titila…); null vuelve a la sección. */
    clima(tipo: Clima | null): void;
    /** Pide una forma. Si a esa forma le falta su ancla o su contenido, cae en una que no los necesita. */
    forma(f: Forma, ancla?: HTMLElement | null): void;
    figura(indice: 0 | 1 | 2): void;
    figuraDesdeTrazo(d: string, tinta?: string | null): void;
    escribir(texto: string): void;
    /** Devuelve false si la imagen no se pudo leer (por ejemplo, viene de otro origen sin permiso). */
    imagen(fuente: HTMLImageElement | HTMLCanvasElement): boolean;
    /** true cuando algo opaco ya tapa el mosaico: sus partículas dejan de pintarse y de reaccionar. */
    cubrir(v: boolean): void;
    sacudir(fuerza: number): void;
    medir(): void;
    pausar(v: boolean): void;
    destruir(): void;
}

const ALFA: Record<FormaActiva, number> = { figuras: 0.95, texto: 0.95, imagen: 1, olas: 0.4, marco: 0.3, anillo: 0.5, firma: 1, clima: 0.6 };
/** Código numérico del clima para el bucle (sin comparar textos por partícula). 5 = noche: la única con destino fijo. */
const MODO_CLIMA: Record<Clima, number> = { lluvia: 1, nieve: 2, sol: 3, nubes: 4, noche: 5 };
const CON_ANCLA: Forma[] = ["figuras", "texto", "imagen", "anillo", "firma"];
/** Formas que, ya armadas, no cambian solas: se pueden dejar de pintar. Olas y anillo se mueven siempre. */
const QUIETAS: FormaActiva[] = ["figuras", "texto", "imagen", "firma", "marco"];
/** Un toque que se mueve menos que esto es un toque, no un deslizamiento (px). */
const TOQUE = 12;
const TEXTO_FIRMA = "nicoholas.dev";

interface Caja { x: number; y: number; w: number; h: number }

export function crearMotor(lienzo: HTMLCanvasElement, op: { frente: HTMLElement; quieto: boolean }): Motor {
    const ctx = lienzo.getContext("2d")!;
    const quieto = op.quieto;
    let W = 0, H = 0, N = 0, activas = 0, t = 0, sy = 0, vivo = true, pausado = false, cuadroId = 0;
    let syEvento = scrollY, syCuadro = syEvento, dormido = false, calma = 0;
    /** Algo cambió: vuelve a pintar en el próximo cuadro. */
    const despertar = () => { dormido = false; calma = 0; };
    let px = new Float32Array(0), py = new Float32Array(0), vx = new Float32Array(0), vy = new Float32Array(0);
    let rb = new Float32Array(0), r = new Float32Array(0), retraso = new Float32Array(0), sem = new Float32Array(0), tocadas = new Int32Array(0);

    let pedida: Forma = "olas", forma: FormaActiva = "olas", alfa = 0, climaPuesto: Clima | null = null, modoClima = 0;
    const anclas: Partial<Record<Forma, HTMLElement>> = {};
    const cajas: Partial<Record<Forma, Caja>> = {};
    const nubes: { figuras: Nube | null; texto: Nube | null; firma: Nube | null } = { figuras: null, texto: null, firma: null };
    const hechas: Partial<Record<"figuras" | "texto" | "firma", string>> = {}; // con qué tamaño se muestreó cada una
    let figuraPedida: { tipo: "fija"; i: number } | { tipo: "trazo"; d: string; tinta: string | null } = { tipo: "fija", i: 0 };
    let textoPedido = "";
    let mosaico: Mosaico | null = null, fuenteMosaico: HTMLImageElement | HTMLCanvasElement | null = null, cubierto = false;
    const puntero = { x: -9999, y: -9999 };
    let color = { base: "203 213 225", acento: "94 234 212" };
    /** Opacidad del marco: la pone el tema (--alfa-marco). Sobre fondo claro, 0,3 se veía como suciedad en los bordes. */
    let alfaMarco = ALFA.marco;
    let familia = '"JetBrains Mono", ui-monospace, monospace';

    const movil = () => W < 820;

    function leerColor() {
        const s = getComputedStyle(document.documentElement);
        color = { base: s.getPropertyValue("--particula").trim() || color.base, acento: s.getPropertyValue("--particula-acento").trim() || color.acento };
        const f = s.getPropertyValue("--font-mono").trim(); if (f) familia = `${f}, ui-monospace, monospace`;
        const am = parseFloat(s.getPropertyValue("--alfa-marco")); alfaMarco = Number.isFinite(am) ? am : ALFA.marco;
        manchaDe = ""; despertar();
    }

    function dimensionar() {
        // El lienzo mide la pantalla grande (100lvh): la barra del navegador del celular, al aparecer o esconderse, no lo cambia.
        W = lienzo.clientWidth || innerWidth; H = lienzo.clientHeight || innerHeight;
        // En pantallas chicas, menos píxeles por cuadro: cada partícula mide 1–3 px y no se nota.
        const dpr = Math.min(devicePixelRatio || 1, movil() ? 1.25 : 1.5);
        lienzo.width = Math.floor(W * dpr); lienzo.height = Math.floor(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // Equipos modestos (≤ 4 núcleos o ≤ 4 GB) parten con menos partículas; además, si va lento, baja sola (más abajo).
        const nav = navigator as Navigator & { deviceMemory?: number };
        const modesto = (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
        const n = Math.round((movil() ? 1800 : 4600) * (modesto ? 0.7 : 1));
        if (n !== N) {
            N = n; activas = n;
            px = new Float32Array(N); py = new Float32Array(N); vx = new Float32Array(N); vy = new Float32Array(N);
            rb = new Float32Array(N); r = new Float32Array(N); retraso = new Float32Array(N); sem = new Float32Array(N); tocadas = new Int32Array(N);
            for (let i = 0; i < N; i++) { px[i] = Math.random() * W; py[i] = Math.random() * H; rb[i] = r[i] = 0.7 + Math.random() * 0.8; sem[i] = Math.random(); }
            publicar();
        }
    }

    function publicar() { lienzo.dataset.total = String(N); lienzo.dataset.activas = String(activas); }

    function medir() {
        sy = scrollY;
        for (const f of CON_ANCLA) {
            const e = anclas[f], antes = cajas[f];
            // Un ancla oculta (display: none, p. ej. la esfera de herramientas en celular) mide 0: cuenta como sin ancla.
            if (!e || !e.isConnected || (!e.offsetWidth && !e.offsetHeight)) { if (antes) { delete cajas[f]; despertar(); } continue; }
            const b = e.getBoundingClientRect();
            // El tamaño sale del diseño (offsetWidth/Height), no de la caja transformada: el acercamiento por planos escala
            // las secciones al entrar y, con la caja escalada, texto y figuras se volverían a muestrear en cada cuadro.
            const c = { x: b.left + b.width / 2, y: b.top + b.height / 2 + sy, w: e.offsetWidth || b.width, h: e.offsetHeight || b.height };
            // Las cajas van en coordenadas de la página: desplazar no las cambia; solo despierta un cambio de diseño.
            if (!antes || Math.abs(antes.x - c.x) + Math.abs(antes.y - c.y) + Math.abs(antes.w - c.w) + Math.abs(antes.h - c.h) > 1) despertar();
            cajas[f] = c;
        }
    }

    /** Muestrea lo que haga falta para la forma actual, solo si cambió el tamaño de su ancla o su contenido. */
    function preparar(f: Forma) {
        const c = cajas[f]; if (!c) return;
        const antes = f === "imagen" ? mosaico : nubes[f as keyof typeof nubes];
        prepararSin(f, c);
        if ((f === "imagen" ? mosaico : nubes[f as keyof typeof nubes]) !== antes) despertar();
    }
    function prepararSin(f: Forma, c: Caja) {
        if (f === "firma") {
            const clave = `${Math.round(c.w)}x${Math.round(c.h)}`;
            if (hechas.firma !== clave) { nubes.firma = nubeDeTexto(TEXTO_FIRMA, c.w, c.h, 3, familia); hechas.firma = clave; }
        } else if (f === "texto") {
            const clave = `${Math.round(c.w)}x${Math.round(c.h)}:${textoPedido}`;
            if (hechas.texto !== clave) { nubes.texto = nubeDeTexto(textoPedido || " ", c.w, c.h, 4, familia); hechas.texto = clave; }
        } else if (f === "figuras") {
            const lado = Math.min(c.w, c.h), fp = figuraPedida;
            const clave = `${Math.round(lado)}:${fp.tipo === "fija" ? fp.i : fp.d.length + fp.d.slice(0, 24)}`;
            if (hechas.figuras !== clave) {
                if (fp.tipo === "fija") nubes.figuras = nubeDeFigura(FIGURAS[fp.i], lado, movil() ? 6 : 5);
                else { nubes.figuras = nubeDeTrazo(fp.d, lado, movil() ? 5 : 4); nubes.figuras.tinta = fp.tinta; }
                hechas.figuras = clave;
            }
        } else if (f === "imagen" && fuenteMosaico && !mosaico) {
            mosaico = mosaicoDeImagen(fuenteMosaico, c.w, c.h, movil() ? 46 : 78);
        }
    }

    /** Decide qué forma se puede mostrar de verdad y la aplica. */
    function aplicar() {
        if (climaPuesto) {
            if (forma !== "clima") { forma = "clima"; sacudirInterno(6, 18); }
            lienzo.dataset.formaActiva = "clima"; lienzo.dataset.clima = climaPuesto;
            if (quieto) asentar();
            return;
        }
        delete lienzo.dataset.clima;
        let f: Forma = pedida;
        if (CON_ANCLA.includes(f) && !cajas[f]) f = f === "imagen" ? "marco" : "olas";
        if (f === "imagen") { preparar("imagen"); if (!mosaico) f = "marco"; }
        else preparar(f);
        if (f === "texto" && !textoPedido) f = "olas";
        // En pantallas chicas las formas de fondo se apagan: las olas pasaban por encima del texto y el marco ensuciaba los
        // bordes. La materia queda solo donde es el contenido (figuras, texto, imagen, firma, anillo, clima).
        if (movil() && f === "olas") f = "marco";
        if (f !== forma) { forma = f; sacudirInterno(9, 26); }
        lienzo.dataset.formaActiva = forma;
        if (quieto) asentar();
    }

    function sacudirInterno(fuerza: number, demora: number) {
        despertar();
        for (let i = 0; i < N; i++) { retraso[i] = Math.random() * demora; vx[i] += (Math.random() - 0.5) * fuerza; vy[i] += (Math.random() - 0.5) * fuerza; }
    }

    /* ---- Profundidad: polvo lejano (casi quieto) y luces del frente (se mueven más que el contenido) ---- */
    const lejos = Array.from({ length: 150 }, () => [Math.random(), Math.random(), 0.8 + Math.random() * 1.6]);
    const cerca = Array.from({ length: 8 }, () => [Math.random(), Math.random(), 130 + Math.random() * 190]);
    let ox = 0, oy = 0, fondoQuieto = false, mancha: HTMLCanvasElement | null = null, manchaDe = "";
    const luces = Array.from({ length: 9 }, (_, i) => {
        const e = document.createElement("i"), tam = 70 + Math.random() * 190;
        e.style.width = e.style.height = `${tam}px`; op.frente.append(e);
        return { e, x: (i + Math.random()) / 9, y: Math.random(), tam, v: 0.45 + Math.random() * 0.7 };
    });

    function fondo() {
        const tx = puntero.x > -999 ? puntero.x / W - 0.5 : 0, ty = puntero.y > -999 ? puntero.y / H - 0.5 : 0;
        fondoQuieto = Math.abs(tx - ox) + Math.abs(ty - oy) < 0.002;
        ox += (tx - ox) * 0.05; oy += (ty - oy) * 0.05;
        const alto = H * 1.5; ctx.fillStyle = `rgb(${color.base} / .26)`;
        for (let q = 0; q < lejos.length; q++) { const l = lejos[q]; ctx.fillRect(l[0] * W - ox * 10, ((((l[1] * alto - sy * 0.05) % alto) + alto) % alto) - H * 0.25 - oy * 10, l[2], l[2]); }
        if (manchaDe !== color.acento || !mancha) { // la luz se dibuja una vez y después solo se copia
            mancha = document.createElement("canvas"); mancha.width = mancha.height = 128;
            const g = mancha.getContext("2d")!, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
            gr.addColorStop(0, `rgb(${color.acento} / .075)`); gr.addColorStop(1, `rgb(${color.acento} / 0)`);
            g.fillStyle = gr; g.fillRect(0, 0, 128, 128); manchaDe = color.acento;
        }
        const alto2 = H * 2.2;
        for (let q = 0; q < cerca.length; q++) { const c = cerca[q], r0 = c[2]; ctx.drawImage(mancha, c[0] * W - ox * 46 - r0, ((((c[1] * alto2 - sy * 0.28) % alto2) + alto2) % alto2) - H * 0.6 - oy * 46 - r0, r0 * 2, r0 * 2); }
        const alto3 = H * 1.9;
        for (let q = 0; q < luces.length; q++) { const l = luces[q]; l.e.style.transform = `translate3d(${(l.x * W - l.tam / 2 - ox * 150 * l.v).toFixed(1)}px,${(((((l.y * alto3 - sy * l.v) % alto3) + alto3) % alto3) - l.tam - oy * 90 * l.v).toFixed(1)}px,0)`; }
    }

    /** Destino de la partícula i en la forma actual. Escribe en `dest`. `ancla`: el destino va pegado a la página (se corre al desplazar). */
    const dest = { x: 0, y: 0, marca: false, celda: -1, ancla: false };
    let nubeActual: Nube | null = null, mos: Mosaico | null = null, ax = 0, ay = 0, rx = 0, ry = 0;
    function alCuadro() {
        const c = forma === "clima" ? undefined : cajas[forma];
        modoClima = forma === "clima" && climaPuesto ? MODO_CLIMA[climaPuesto] : 0;
        ax = c ? c.x : 0; ay = c ? c.y - sy : 0;
        nubeActual = forma === "figuras" ? nubes.figuras : forma === "texto" ? nubes.texto : forma === "firma" ? nubes.firma : null;
        mos = forma === "imagen" ? mosaico : null;
        ({ rx, ry } = radiosAnillo(W, H));
    }
    function destino(i: number) {
        dest.marca = false; dest.celda = -1; dest.ancla = true;
        const nb = nubeActual;
        if (nb && nb.n) { const k = i % nb.n, j = i >= nb.n ? (sem[i] - 0.5) * 5 : 0; dest.x = ax + nb.x[k] + j; dest.y = ay + nb.y[k] - j; dest.marca = nb.marca[k] === 1; return; }
        if (mos && i < mos.n) { dest.x = ax + mos.x[i]; dest.y = ay + mos.y[i]; dest.celda = i; return; }
        dest.ancla = forma === "anillo";
        // Clima: un lugar sembrado por partícula en toda la pantalla. La noche se queda ahí (estrellas);
        // lluvia, nieve, sol y nubes lo usan solo para el cuadro único de «menos movimiento» (su física es libre).
        if (modoClima) { const s = sem[i]; dest.x = s * W; dest.y = ((i * 0.7548776662) % 1) * H * (modoClima === 5 ? 0.82 : 1); // x e y de semillas distintas: si no, quedan en diagonales
             dest.marca = modoClima === 3 ? i < activas * 0.32 : modoClima === 5 && i < activas * 0.07; return; } // acento en un tramo seguido: un solo cambio de color por cuadro
        if (forma === "olas") { const x = (i % 140) / 139, fila = (i / 140) | 0; dest.x = x * (W + 60) - 30; dest.y = H * 0.86 + fila * 9 + Math.sin(x * 9 + t * 0.0011 + fila * 0.55) * 16 + Math.sin(x * 23 - t * 0.0007) * 5; return; }
        if (forma === "anillo") { const ang = sem[i] * 6.2832 + t * 0.00016 * (1 + (i % 3) * 0.35), k = 1 + (i % 7) * 0.022 + Math.sin(t * 0.001 + i) * 0.006; dest.x = ax + Math.cos(ang) * rx * k; dest.y = ay + Math.sin(ang) * ry * k; return; }
        const s4 = sem[i] * 4, lado = s4 | 0, q = s4 % 1, m = 14 + ((i * 37) % 70); // marco: a los bordes
        dest.x = lado === 0 || lado === 2 ? q * W : lado === 1 ? W - m : m; dest.y = lado === 0 ? m : lado === 2 ? H - m : q * H;
    }

    /**
     * Física sin destino para lluvia, nieve, sol y nubes: cada partícula cae, sube o deriva, y al salir de la pantalla
     * reaparece por el otro lado. La forma que había se deshace en ese clima (no vuela hacia un dibujo).
     */
    function moverLibre(i: number, X: number, Y: number, R2: number) {
        const s = sem[i];
        if (retraso[i] > 0) retraso[i]--;
        if (modoClima === 1) { vy[i] += 0.26; vy[i] *= 0.982; vx[i] += (0.7 + s * 0.5 - vx[i]) * 0.04; } // lluvia: cae con algo de viento
        else if (modoClima === 2) { vy[i] += (0.55 + s * 0.5 - vy[i]) * 0.03; vx[i] += (Math.sin(t * 0.0011 + s * 40) * 0.7 - vx[i]) * 0.05; } // nieve: baja meciéndose
        else if (modoClima === 3) { vy[i] += (-0.32 - s * 0.45 - vy[i]) * 0.03; vx[i] += (Math.sin(t * 0.0008 + s * 30) * 0.45 - vx[i]) * 0.04; } // sol: polvo que sube con la luz
        else { // nubes: tres bancos que derivan a la derecha
            const banco = H * (0.16 + (i % 3) * 0.17) + Math.sin(s * 50) * H * 0.045 + (((s * 13.7) % 1) - 0.5) * H * 0.07;
            vx[i] += (0.28 + s * 0.42 - vx[i]) * 0.04; vy[i] += (banco - py[i]) * 0.0025; vy[i] *= 0.92;
        }
        const dx = px[i] - X, dy = py[i] - Y, d2 = dx * dx + dy * dy;
        if (d2 < R2) { const d = Math.sqrt(d2) || 1, g = 1 - d / 120; vx[i] += (dx / d) * g * g * 3; vy[i] += (dy / d) * g * g * 3; }
        px[i] += vx[i]; py[i] += vy[i];
        r[i] += (rb[i] - r[i]) * 0.1;
        // Al salir, reaparece por el lado contrario (una sola vez por vuelta: no es costo por cuadro).
        if (modoClima === 4) { if (px[i] > W + 40) { px[i] = -40; py[i] = H * (0.16 + (i % 3) * 0.17); } }
        else if (modoClima === 3) { if (py[i] < -20) { py[i] = H + 10 + Math.random() * 60; px[i] = Math.random() * W; } }
        else if (py[i] > H + 24) { py[i] = -10 - Math.random() * 90; px[i] = Math.random() * (W + 120) - 120; if (modoClima === 1) vy[i] = 5 + Math.random() * 4; }
    }

    function pintar(fisica: boolean) {
        // Lo anclado a la página se corre con ella en este cuadro, no un cuadro después. El desplazamiento llega del evento
        // `scroll`: leer scrollY aquí obligaba a recalcular estilos en cada cuadro (medido: casi el doble de trabajo).
        const s = syEvento, corre = s - syCuadro; syCuadro = sy = s;
        alCuadro();
        const alfaAntes = alfa;
        alfa += ((forma === "marco" ? (movil() ? 0 : alfaMarco) : ALFA[forma]) - alfa) * (fisica ? 0.06 : 1);
        ctx.clearRect(0, 0, W, H); fondo();
        const R = 120, R2 = R * R, X = puntero.x, Y = puntero.y;
        const tb = `rgb(${(nubeActual && nubeActual.tinta) || color.base} / ${alfa})`, ta = `rgb(${color.acento} / ${Math.min(1, alfa + 0.35)})`;
        let nt = 0, acento = false, mueve = 0; ctx.fillStyle = tb;
        for (let i = 0; i < activas; i++) {
            destino(i);
            const celda = dest.celda; let toca = false;
            if (fisica && modoClima && modoClima !== 5) {
                moverLibre(i, X, Y, R2);
            } else if (fisica) {
                if (corre && dest.ancla) py[i] -= corre;
                const k = retraso[i] > 0 ? (retraso[i]--, 0.008) : 0.055;
                vx[i] += (dest.x - px[i]) * k; vy[i] += (dest.y - py[i]) * k;
                const dx = px[i] - X, dy = py[i] - Y, d2 = dx * dx + dy * dy;
                if (d2 < R2 && !(celda >= 0 && cubierto)) { const d = Math.sqrt(d2) || 1, g = 1 - d / R; vx[i] += (dx / d) * g * g * 7; vy[i] += (dy / d) * g * g * 7; if (celda < 0) { r[i] = rb[i] * (1 + g * 1.9); toca = true; } }
                // De noche, las estrellas titilan: el radio va y viene.
                const dr = (celda >= 0 ? mos!.medio : modoClima === 5 ? rb[i] * (0.45 + 0.95 * Math.abs(Math.sin(t * 0.0021 + sem[i] * 31))) : rb[i]) - r[i];
                r[i] += dr * (celda >= 0 ? 0.12 : 0.1);
                vx[i] *= 0.84; vy[i] *= 0.84; px[i] += vx[i]; py[i] += vy[i];
                const m = (vx[i] < 0 ? -vx[i] : vx[i]) + (vy[i] < 0 ? -vy[i] : vy[i]) + (dr < 0 ? -dr : dr) + retraso[i];
                if (m > mueve) mueve = m;
            } else { px[i] = dest.x; py[i] = dest.y; vx[i] = vy[i] = 0; r[i] = celda >= 0 ? mos!.medio : rb[i]; }
            const rr = r[i];
            if (celda >= 0) { if (cubierto) continue; ctx.fillStyle = mos!.tinta[celda]; acento = true; ctx.fillRect(px[i] - rr, py[i] - rr, rr * 2, rr * 2); continue; }
            if (toca) { tocadas[nt++] = i; continue; }
            if (dest.marca !== acento) { ctx.fillStyle = dest.marca ? ta : tb; acento = dest.marca; }
            if (modoClima === 1) { const largo = rr * 2 + (vy[i] > 0 ? vy[i] * 1.6 : 0); ctx.fillRect(px[i] - rr * 0.45, py[i] - largo, rr * 0.9, largo); } // gota con estela
            else ctx.fillRect(px[i] - rr, py[i] - rr, rr * 2, rr * 2);
        }
        if (nt) { ctx.fillStyle = ta; ctx.beginPath(); for (let q = 0; q < nt; q++) { const i = tocadas[q]; ctx.moveTo(px[i] + r[i], py[i]); ctx.arc(px[i], py[i], r[i], 0, 6.2832); } ctx.fill(); }
        // Un tercio de segundo sin que nada se mueva más de 0,05 px por cuadro (lo que queda de vaivén es < 0,3 px, no se ve):
        // este cuadro ya es igual al siguiente y se deja de pintar.
        if (fisica && QUIETAS.includes(forma) && !corre && fondoQuieto && mueve < 0.05 && Math.abs(alfa - alfaAntes) < 0.001) { if (++calma > 20) dormido = true; }
        else calma = 0;
    }

    /** Con menos movimiento: la materia aparece ya en su sitio, en un solo cuadro. */
    let asentarPendiente = false;
    function asentar() {
        if (asentarPendiente || !W) return; asentarPendiente = true;
        requestAnimationFrame(() => { asentarPendiente = false; if (vivo) pintar(false); });
    }

    let ultimo = 0, vistos = 0, lentos = 0;
    function cuadro(ahora: number) {
        if (!vivo) return;
        cuadroId = requestAnimationFrame(cuadro);
        if (!W || !N || pausado || document.hidden) { ultimo = ahora; return; }
        if (dormido) { if (syEvento === syCuadro) { ultimo = ahora; return; } despertar(); }
        const dt = ahora - ultimo; ultimo = ahora; t = ahora;
        if (dt < 1000) { // una pausa más larga es una pestaña que volvió, no un equipo lento
            vistos++; if (dt > 24) lentos++;
            const piso = movil() ? 900 : 1400;
            if (vistos >= 45) { if (lentos > 22 && activas > piso) { activas = Math.max(piso, (activas * 0.8) | 0); publicar(); } vistos = lentos = 0; }
        }
        pintar(true);
    }

    /* ---- Entradas del mundo ---- */
    // El dedo no es un cursor: al deslizar, la materia no se aparta ni estalla. Solo un toque (sin deslizar) la sacude.
    const alMover = (e: PointerEvent) => { if (e.pointerType === "touch") return; puntero.x = e.clientX; puntero.y = e.clientY; despertar(); };
    // Al levantar el dedo también llega pointerleave: si no había cursor, no hay nada que despertar.
    const alSalir = () => { if (puntero.x < -999) return; puntero.x = puntero.y = -9999; despertar(); };
    const empujar = (x: number, y: number, alcance: number, fuerza: number) => {
        despertar();
        for (let i = 0; i < N; i++) { const dx = px[i] - x, dy = py[i] - y, d = Math.hypot(dx, dy) || 1; if (d < alcance) { const f = (1 - d / alcance) * fuerza; vx[i] += (dx / d) * f; vy[i] += (dy / d) * f; } }
    };
    let toque: { x: number; y: number; id: number } | null = null;
    const alTocar = (e: PointerEvent) => {
        if (e.pointerType === "touch") { toque = { x: e.clientX, y: e.clientY, id: e.pointerId }; return; }
        empujar(e.clientX, e.clientY, 280, 26); // cada clic sacude la materia cercana
    };
    const alSoltar = (e: PointerEvent) => {
        if (!toque || e.pointerId !== toque.id) return;
        const { x, y } = toque; toque = null;
        if (Math.hypot(e.clientX - x, e.clientY - y) < TOQUE) empujar(x, y, 220, 20);
    };
    const alCancelar = () => { toque = null; }; // el navegador tomó el gesto para desplazar
    const alDesplazar = () => { syEvento = scrollY; };
    let rt = 0;
    // Se mira el tamaño del propio lienzo (100lvh), no el de la ventana: la barra del navegador del celular no lo cambia.
    const alRedimensionar = () => {
        clearTimeout(rt);
        rt = window.setTimeout(() => {
            if (lienzo.clientWidth === W && lienzo.clientHeight === H) { medir(); return; }
            dimensionar(); delete hechas.figuras; delete hechas.texto; delete hechas.firma; mosaico = null; medir(); aplicar(); despertar();
        }, 150);
    };
    if (!quieto) {
        addEventListener("pointermove", alMover, { passive: true }); addEventListener("pointerdown", alTocar, { passive: true });
        addEventListener("pointerup", alSoltar, { passive: true }); addEventListener("pointercancel", alCancelar, { passive: true });
        document.addEventListener("pointerleave", alSalir);
    }
    addEventListener("scroll", alDesplazar, { passive: true });
    const tamano = new ResizeObserver(alRedimensionar); tamano.observe(lienzo);
    const vigia = new MutationObserver(() => { leerColor(); if (quieto) asentar(); });
    vigia.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
    const reloj = window.setInterval(() => { if (!document.hidden && !quieto) medir(); }, 600);

    lienzo.dataset.quieto = String(quieto);
    leerColor(); dimensionar(); medir(); aplicar();
    // La fuente monoespaciada puede llegar después: al cargar, se vuelve a muestrear el texto.
    document.fonts?.ready.then(() => { if (!vivo) return; leerColor(); delete hechas.texto; delete hechas.firma; medir(); aplicar(); });
    if (quieto) asentar(); else cuadroId = requestAnimationFrame(cuadro);

    return {
        clima(tipo) { if (tipo === climaPuesto) return; climaPuesto = tipo; despertar(); aplicar(); },
        forma(f, ancla) { if (ancla) anclas[f] = ancla; pedida = f; medir(); aplicar(); },
        figura(i) { figuraPedida = { tipo: "fija", i }; preparar("figuras"); if (forma === "figuras") sacudirInterno(7, 20); if (quieto) asentar(); },
        figuraDesdeTrazo(d, tinta = null) { figuraPedida = { tipo: "trazo", d, tinta }; preparar("figuras"); if (forma === "figuras") sacudirInterno(8, 20); if (quieto) asentar(); },
        escribir(texto) { textoPedido = texto.trim(); medir(); aplicar(); if (forma === "texto") sacudirInterno(4, 20); },
        imagen(fuente) { fuenteMosaico = fuente; mosaico = null; medir(); aplicar(); if (mosaico && forma === "imagen") sacudirInterno(10, 20); return !!mosaico; },
        cubrir(v) { if (v !== cubierto) despertar(); cubierto = v; if (quieto) asentar(); },
        sacudir(fuerza) { sacudirInterno(fuerza, 20); },
        medir() { medir(); if (quieto) asentar(); },
        pausar(v) { pausado = v; despertar(); },
        destruir() {
            vivo = false; cancelAnimationFrame(cuadroId); clearInterval(reloj); clearTimeout(rt); vigia.disconnect(); tamano.disconnect();
            removeEventListener("pointermove", alMover); removeEventListener("pointerdown", alTocar); removeEventListener("pointerup", alSoltar); removeEventListener("pointercancel", alCancelar);
            document.removeEventListener("pointerleave", alSalir); removeEventListener("scroll", alDesplazar);
            for (const l of luces) l.e.remove();
        },
    };
}
