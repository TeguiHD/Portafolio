"use client";

/**
 * Campo para escribir un número a la chilena: pone los puntos de miles (y la coma decimal donde corresponde) mientras se
 * escribe, sin mover el cursor del dígito que se tocó. El formulario recibe y entrega un número (null si está vacío);
 * el texto visible vive aquí. Las reglas están en src/lib/tools/numeros.ts (alEscribir) y en
 * docs/superpowers/specs/2026-11-23-separador-miles-design.md.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type InputHTMLAttributes, type KeyboardEvent, type Ref } from "react";
import { alEscribir, numeroDeTexto, textoDeNumero, type CambioCampo } from "@/lib/tools/numeros";

type Nativos = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type" | "inputMode">;

export interface PropsCampoNumero extends Nativos {
    valor: number | null;
    alCambiar: (n: number | null) => void;
    /** Cuántos decimales admite (0: montos en pesos). */
    decimales?: number;
    /** Si admite el signo menos (un saldo bajo cero). */
    negativos?: boolean;
    ref?: Ref<HTMLInputElement>;
}

export function CampoNumero({ valor, alCambiar, decimales = 0, negativos = false, ref, onKeyDown, autoComplete = "off", ...resto }: PropsCampoNumero) {
    const opciones = { decimales, negativos };
    const [texto, setTexto] = useState(() => textoDeNumero(valor, opciones));
    // Cada cambio vuelve a dibujar el campo, aunque el texto no cambie (una letra que se descarta): así el cursor se
    // repone siempre, también cuando React devuelve el valor anterior al campo.
    const [, setVuelta] = useState(0);
    const interno = useRef<HTMLInputElement | null>(null);
    const cursorPendiente = useRef<number | null>(null);
    // Qué está por reemplazar el navegador (selección y texto que entra): sin esto, «10.000» → «1.190.000» con fill o
    // al pegar sobre una selección no se puede saber qué parte es nueva.
    const cambio = useRef<CambioCampo | null>(null);
    const borrado = useRef<"atras" | "adelante" | undefined>(undefined);
    // Si la coma nació de un punto escrito (todavía puede ser de miles): ver alEscribir.
    const comaProvisional = useRef(false);
    useEffect(() => {
        const el = interno.current;
        if (!el) return;
        const anotar = (e: InputEvent) => {
            const datos = e.data ?? e.dataTransfer?.getData("text/plain") ?? null;
            cambio.current = e.inputType.startsWith("insert") && datos !== null && el.selectionStart !== null && el.selectionEnd !== null
                ? { inicio: el.selectionStart, fin: el.selectionEnd, insertado: datos } : null;
            borrado.current = e.inputType === "deleteContentForward" ? "adelante" : e.inputType.startsWith("delete") ? "atras" : undefined;
        };
        el.addEventListener("beforeinput", anotar);
        return () => el.removeEventListener("beforeinput", anotar);
    }, []);

    // Si el formulario cambió el número desde afuera (reiniciar, «Todo lo que falta»), se muestra el suyo.
    const mostrado = numeroDeTexto(texto) === valor ? texto : textoDeNumero(valor, opciones);

    useLayoutEffect(() => {
        const el = interno.current, c = cursorPendiente.current;
        cursorPendiente.current = null;
        if (el && c !== null && el.ownerDocument.activeElement === el) el.setSelectionRange(c, c);
    });

    const ponerRef = useCallback((el: HTMLInputElement | null) => {
        interno.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
    }, [ref]);

    function teclaAbajo(e: KeyboardEvent<HTMLInputElement>) {
        onKeyDown?.(e);
        if (e.defaultPrevented || (e.key !== "Backspace" && e.key !== "Delete")) return;
        // Borrar sobre un punto de miles borra el dígito de al lado: si no, el punto vuelve y la tecla parece no hacer nada.
        const el = e.currentTarget, i = el.selectionStart;
        if (i === null || i !== el.selectionEnd) return;
        if (e.key === "Backspace" && el.value[i - 1] === ".") el.setSelectionRange(i - 1, i - 1);
        if (e.key === "Delete" && el.value[i] === ".") el.setSelectionRange(i + 1, i + 1);
    }

    return (
        <input
            {...resto}
            ref={ponerRef}
            type="text"
            inputMode={decimales > 0 ? "decimal" : "numeric"}
            autoComplete={autoComplete}
            autoCorrect="off"
            spellCheck={false}
            value={mostrado}
            onKeyDown={teclaAbajo}
            onChange={(e) => {
                const el = e.currentTarget;
                const anotado = cambio.current, haciaDonde = borrado.current;
                cambio.current = null;
                borrado.current = undefined;
                // Lo anotado vale solo si describe este mismo cambio (si no, se deduce de los textos).
                const valido = anotado && anotado.fin <= mostrado.length && mostrado.slice(0, anotado.inicio) + anotado.insertado + mostrado.slice(anotado.fin) === el.value ? anotado : undefined;
                // Si el formulario cambió el número desde afuera, la coma que se ve ya no es la que se escribió.
                const provisional = comaProvisional.current && mostrado === texto;
                const r = alEscribir(mostrado, el.value, el.selectionStart ?? el.value.length, opciones, { cambio: valido, borrado: haciaDonde, comaProvisional: provisional });
                comaProvisional.current = !!r.comaProvisional;
                cursorPendiente.current = r.cursor;
                setTexto(r.texto);
                setVuelta((v) => v + 1);
                const n = numeroDeTexto(r.texto);
                if (n !== valor) alCambiar(n);
            }}
        />
    );
}
