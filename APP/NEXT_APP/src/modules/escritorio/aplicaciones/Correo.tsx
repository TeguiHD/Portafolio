"use client";

import { useEffect, useRef, useState, type FormEvent, type SyntheticEvent } from "react";
import { Send, Trash2 } from "lucide-react";
import { ORIGENES } from "@/lib/contacto-origen";
import { CORREO_CONTACTO, LIMITES_CONTACTO, MENSAJES_CONTACTO, enviarContacto, medirDesfase, mensajeCorto } from "@/lib/contacto/envio";
import { IconoDe } from "../iconos/Icono";

type Campo = HTMLInputElement | HTMLTextAreaElement;
/** `:user-invalid` es solo visual: esto lo refleja en `aria-invalid` para los lectores de pantalla. */
const marcar = (e: SyntheticEvent<Campo>) => { const c = e.currentTarget; c.setAttribute("aria-invalid", String(!c.validity.valid)); };

/**
 * Correo: un mensaje nuevo para escribirme, como en una app de correo. Envía exactamente lo mismo que el formulario de
 * la portada (src/lib/contacto/envio.ts): mismos topes, misma trampa para robots y el mismo tiempo mínimo.
 */
export function Correo({ alEnviado }: { alEnviado(correo: string): void }) {
    const form = useRef<HTMLFormElement>(null), mensaje = useRef<HTMLTextAreaElement>(null);
    const abierto = useRef(0), desfase = useRef(0), ocupado = useRef(false);
    const [enviando, setEnviando] = useState(false), [fallo, setFallo] = useState(""), [largo, setLargo] = useState(0);
    const [enviado, setEnviado] = useState<string | null>(null);

    useEffect(() => {
        abierto.current = Date.now();
        void medirDesfase().then((d) => { if (d !== null) desfase.current = d; });
    }, []);

    const enviar = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (ocupado.current) return;
        const f = e.currentTarget, datos = new FormData(f), texto = (k: string) => String(datos.get(k) ?? "").trim();
        if (mensajeCorto(texto("message"))) { setFallo(MENSAJES_CONTACTO.CORTO); mensaje.current?.focus(); return; }
        ocupado.current = true; setEnviando(true); setFallo("");
        try {
            const r = await enviarContacto({ name: texto("name") || undefined, email: texto("email"), message: texto("message"), origen: texto("origen") || undefined, website: String(datos.get("website") ?? "") }, abierto.current, desfase.current);
            if (r.ok) { setEnviado(texto("email")); f.reset(); setLargo(0); alEnviado(texto("email")); }
            else setFallo(r.error);
        } finally {
            ocupado.current = false; setEnviando(false);
        }
    };
    const otro = () => { setEnviado(null); setFallo(""); abierto.current = Date.now(); };

    if (enviado) {
        return (
            <div className="co-listo">
                <IconoDe icono="correo" tam={64} />
                <h3>Mensaje enviado</h3>
                <p>Te respondo a <b>{enviado}</b> desde {CORREO_CONTACTO}.</p>
                <button type="button" className="es-primario" onClick={otro}>Escribir otro mensaje</button>
            </div>
        );
    }
    return (
        <form ref={form} className="co" onSubmit={enviar} noValidate={false}>
            <div className="co-barra">
                <button type="submit" className="es-primario" disabled={enviando}><Send size={15} aria-hidden="true" />{enviando ? "Enviando…" : "Enviar"}</button>
                <button type="button" className="es-boton-chico" onClick={() => { form.current?.reset(); setLargo(0); setFallo(""); }}><Trash2 size={14} aria-hidden="true" />Descartar</button>
            </div>
            <div className="co-campos">
                <div className="co-fila"><span>Para</span><span className="co-chip"><span className="es-avatar" aria-hidden="true">N</span>Nicoholas Lopetegui<small>{CORREO_CONTACTO}</small></span></div>
                <label className="co-fila"><span>Tu nombre</span><input name="name" autoComplete="name" maxLength={100} placeholder="Opcional" /></label>
                <label className="co-fila"><span>Tu correo</span><input name="email" type="email" required autoComplete="email" maxLength={254} placeholder="Para poder responderte" onBlur={marcar} onInvalid={marcar} /></label>
                <label className="co-fila"><span>¿Cómo llegaste?</span>
                    <select name="origen" defaultValue=""><option value="">Prefiero no decirlo</option>{ORIGENES.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}</select>
                </label>
                <input className="co-trampa" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" defaultValue="" />
            </div>
            {/* Sin minLength: el largo mínimo lo explica el envío en español (el aviso nativo cuenta espacios y está en otro idioma). */}
            <textarea ref={mensaje} name="message" className="co-mensaje" required maxLength={LIMITES_CONTACTO.MAX_MENSAJE}
                aria-label="Mensaje" placeholder="Cuéntame qué necesitas: qué quieres construir o arreglar, y para cuándo."
                onBlur={marcar} onInvalid={marcar} onInput={(e) => { const n = e.currentTarget.value.length; setLargo(n >= LIMITES_CONTACTO.AVISO_LARGO ? n : 0); }} />
            <div className="co-pie">
                {fallo ? <p className="co-fallo" role="alert">{fallo}</p> : <span />}
                {largo > 0 && <span className="co-cuenta">{largo >= LIMITES_CONTACTO.MAX_MENSAJE ? "Llegaste al máximo de 2.000 caracteres." : `${largo.toLocaleString("es-CL")} de 2.000`}</span>}
            </div>
        </form>
    );
}
