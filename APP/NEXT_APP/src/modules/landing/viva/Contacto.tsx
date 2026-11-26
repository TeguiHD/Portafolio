"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type SyntheticEvent } from "react";
import { useMateria } from "@/modules/materia/Materia";
import { avisar } from "@/modules/esqueleto/avisos";
import { copiarTexto } from "@/lib/tools/copiar";
import { ORIGENES } from "@/lib/contacto-origen";
import { CORREO_CONTACTO, LIMITES_CONTACTO, MENSAJES_CONTACTO, enviarContacto, medirDesfase, mensajeCorto } from "@/lib/contacto/envio";
import { Vista } from "./Vista";
import "./contacto.css";
import "./contacto-formulario.css";

const CORREO = CORREO_CONTACTO;
const { MIN_MENSAJE, MAX_MENSAJE, AVISO_LARGO } = LIMITES_CONTACTO;

type Campo = HTMLInputElement | HTMLTextAreaElement;
/** `:user-invalid` es solo visual: esto lo refleja en `aria-invalid` para los lectores de pantalla. */
const marcar = (e: SyntheticEvent<Campo>) => { const c = e.currentTarget; c.setAttribute("aria-invalid", String(!c.validity.valid)); };
const alEscribir = (e: SyntheticEvent<Campo>) => { const c = e.currentTarget; if (c.getAttribute("aria-invalid") === "true" && c.validity.valid) c.setAttribute("aria-invalid", "false"); };
const campo = { onBlur: marcar, onInvalid: marcar, onInput: alEscribir };

/**
 * Contacto: una palabra enorme, el correo para copiar y un botón redondo que abre el formulario.
 * El formulario envía a /api/contact lo mismo que la sección anterior.
 */
export function Contacto() {
    const motor = useMateria();
    const dialogo = useRef<HTMLDialogElement>(null), abierto = useRef(0), ocupado = useRef(false);
    // Cuánto adelanta o atrasa el reloj del servidor respecto del de este equipo (ms). El servidor compara la hora de
    // apertura con SU reloj: con el del visitante adelantado, vería un envío «demasiado rápido» y lo descartaría en silencio.
    const desfase = useRef(0), desfaseMedido = useRef(false);
    const [enviando, setEnviando] = useState(false), [fallo, setFallo] = useState(""), [largo, setLargo] = useState(0);

    // Cerrar al tocar fuera: nativo con closedby="any"; donde no existe, se comprueba el punto del clic.
    useEffect(() => {
        const d = dialogo.current;
        if (!d || "closedBy" in HTMLDialogElement.prototype) return;
        const fuera = (ev: MouseEvent) => {
            if (ev.target !== d) return;
            const r = d.getBoundingClientRect();
            if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) d.close();
        };
        d.addEventListener("click", fuera);
        return () => d.removeEventListener("click", fuera);
    }, []);

    const copiar = () => {
        // Si el navegador no deja copiar, el aviso no lleva el visto bueno: dice que no se pudo y muestra el correo.
        void copiarTexto(CORREO).then((ok) => (ok ? avisar("Correo copiado") : avisar(`No se pudo copiar: ${CORREO}`, false)));
        motor?.sacudir(9);
    };
    const abrir = () => {
        const d = dialogo.current; if (!d || d.open) return;
        abierto.current ||= Date.now(); // se cuenta desde la primera vez: reabrir con el texto ya escrito no reinicia el reloj
        setFallo(""); // el motivo de un intento anterior no vale para el siguiente
        d.showModal();
        if (!desfaseMedido.current) {
            desfaseMedido.current = true;
            void medirDesfase().then((d) => { if (d === null) desfaseMedido.current = false; else desfase.current = d; });
        }
    };

    // Si el envío falla con el formulario ya cerrado, se vuelve a abrir: lo escrito sigue ahí y el motivo queda a la vista.
    const avisarFallo = (texto: string) => { setFallo(texto); const d = dialogo.current; if (d && !d.open) d.showModal(); };

    const enviar = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (ocupado.current) return;
        const f = e.currentTarget, datos = new FormData(f), texto = (k: string) => String(datos.get(k) ?? "").trim();
        // minLength cuenta los espacios; el servidor no. Sin esto, «         a» gastaba uno de los 3 envíos por hora en un rechazo.
        if (mensajeCorto(texto("message"))) { setFallo(MENSAJES_CONTACTO.CORTO); f.querySelector<HTMLTextAreaElement>("#ct-mensaje")?.focus(); return; }
        ocupado.current = true; setEnviando(true); setFallo("");
        try {
            const r = await enviarContacto({ name: texto("name") || undefined, email: texto("email"), message: texto("message"), origen: texto("origen") || undefined, website: String(datos.get("website") ?? "") }, abierto.current, desfase.current);
            if (r.ok) {
                f.reset(); setLargo(0); abierto.current = 0; dialogo.current?.close();
                avisar("Mensaje enviado"); motor?.sacudir(9);
            } else avisarFallo(r.error);
        } finally {
            ocupado.current = false; setEnviando(false);
        }
    };

    return (
        <section id="contacto" className="plano" data-forma="anillo" data-ancla="#ancla-anillo" aria-labelledby="ct-titulo">
            <Vista className="ancho centro" id="ancla-anillo">
                <p className="ct-pre" data-sube="">¿Tienes un proyecto?</p>
                <h2 className="ct-titulo" id="ct-titulo"><span className="linea-r" style={{ "--i": 1 } as CSSProperties}><span>Conversemos<i>.</i></span></span></h2>
                <div className="ct-fila" data-sube="" style={{ "--i": 2 } as CSSProperties}>
                    <button className="ct-correo" id="copiar" type="button" aria-label={`Copiar el correo ${CORREO}`} onClick={copiar}><span>{CORREO}</span><i>copiar</i></button>
                    <button className="ct-ir" id="ct-abrir" type="button" aria-label="Escribirme un mensaje" aria-haspopup="dialog" onClick={abrir}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
                    </button>
                </div>
                <div className="ct-redes" data-sube="" style={{ "--i": 3 } as CSSProperties}>
                    <a href="https://www.linkedin.com/in/nicoholas-lopetegui/" target="_blank" rel="noopener me">LinkedIn ↗</a>
                    <a href="https://github.com/TeguiHD" target="_blank" rel="noopener me">GitHub ↗</a>
                </div>
            </Vista>

            {/* closedby="any": se cierra con Escape o tocando fuera (React todavía no tipa el atributo). */}
            <dialog className="ct-dialogo" id="ct-dialogo" ref={dialogo} aria-labelledby="ct-dlg-titulo" {...{ closedby: "any" }}>
                {/* Al corregir cualquier campo, el motivo del intento anterior se borra: ya no describe lo que hay escrito. */}
                <form className="ct-form" onSubmit={enviar} onInput={() => { if (fallo) setFallo(""); }}>
                    <header>
                        <h3 id="ct-dlg-titulo">Escríbeme</h3>
                        <button className="ct-cerrar" type="button" aria-label="Cerrar" onClick={() => dialogo.current?.close()}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                        </button>
                    </header>
                    {/* Trampa para bots: las personas no la ven ni llegan a ella con el teclado. */}
                    <input className="ct-trampa" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" defaultValue="" />
                    <p className="ct-campo">
                        <label htmlFor="ct-nombre">Nombre <small>opcional</small></label>
                        <input id="ct-nombre" name="name" type="text" autoComplete="name" maxLength={100} {...campo} />
                    </p>
                    <p className="ct-campo">
                        <label htmlFor="ct-correo">Correo</label>
                        <input id="ct-correo" name="email" type="email" autoComplete="email" inputMode="email" required maxLength={254} pattern="[^\s@]+@[^\s@]+\.[^\s@]+" aria-describedby="ct-correo-error" {...campo} />
                        <span className="ct-error" id="ct-correo-error">Escribe un correo completo, como nombre@dominio.cl</span>
                    </p>
                    <p className="ct-campo">
                        <label htmlFor="ct-mensaje">Mensaje <small>hasta 2.000 caracteres</small></label>
                        <textarea id="ct-mensaje" name="message" rows={5} required minLength={MIN_MENSAJE} maxLength={MAX_MENSAJE} aria-describedby="ct-mensaje-error" {...campo}
                            onInput={(e) => { alEscribir(e); const n = e.currentTarget.value.length; setLargo(n >= AVISO_LARGO ? n : 0); /* bajo el umbral no re-renderiza */ }} />
                        <span className="ct-error" id="ct-mensaje-error">Cuéntame un poco más: al menos 10 caracteres.</span>
                        {largo >= AVISO_LARGO ? (
                            <span className="ct-cuenta" data-tope={largo >= MAX_MENSAJE || undefined} aria-hidden="true">
                                {largo >= MAX_MENSAJE ? "Llegaste al máximo: lo que escribas o pegues de más no entra." : `${largo.toLocaleString("es-CL")} de 2.000`}
                            </span>
                        ) : null}
                        {/* Solo el tope se anuncia: contar en voz alta cada tecla de las últimas 200 sería ruido. */}
                        <span className="sr-only" role="status">{largo >= MAX_MENSAJE ? "Llegaste al máximo de 2.000 caracteres." : ""}</span>
                    </p>
                    {/* Selector nativo a propósito: en el celular abre la rueda del sistema (base-select la reemplazaría). */}
                    <p className="ct-campo">
                        <label htmlFor="ct-origen">¿Cómo llegaste? <small>opcional</small></label>
                        <select id="ct-origen" name="origen" defaultValue="">
                            <option value="">Elige una opción</option>
                            {ORIGENES.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
                        </select>
                    </p>
                    <p className="ct-fallo" id="ct-fallo" role="alert">{fallo}</p>
                    <footer>
                        <a href={`mailto:${CORREO}`}>{CORREO}</a>
                        <button className="boton lleno" id="ct-enviar" type="submit" aria-disabled={enviando} data-enviando={enviando || undefined}>
                            {enviando ? "Enviando" : "Enviar"}
                            <svg className="flecha" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
                        </button>
                    </footer>
                </form>
            </dialog>
        </section>
    );
}
