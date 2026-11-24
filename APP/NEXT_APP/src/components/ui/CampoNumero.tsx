"use client";

/**
 * Campo para escribir un número a la chilena: pone los puntos de miles (y la coma decimal donde corresponde) mientras se
 * escribe, sin mover el cursor del dígito que se tocó. El formulario recibe y entrega un número (null si está vacío);
 * el texto visible vive aquí. Las reglas están en src/lib/tools/numeros.ts (alEscribir) y en
 * docs/superpowers/specs/2026-11-23-separador-miles-design.md.
 */
import { useCallback, useLayoutEffect, useRef, useState, type InputHTMLAttributes, type KeyboardEvent, type Ref } from "react";
import { alEscribir, numeroDeTexto, textoDeNumero } from "@/lib/tools/numeros";

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
                const r = alEscribir(mostrado, el.value, el.selectionStart ?? el.value.length, opciones);
                cursorPendiente.current = r.cursor;
                setTexto(r.texto);
                setVuelta((v) => v + 1);
                const n = numeroDeTexto(r.texto);
                if (n !== valor) alCambiar(n);
            }}
        />
    );
}
