"use client";

import { useEffect } from "react";

/**
 * Tema de la herramienta insertada: el que pida el sitio que la inserta (?tema=claro u ?tema=oscuro) o, si no pide
 * ninguno, el del sistema de quien la mira. No se guarda: dentro de un iframe no corresponde tocar las preferencias.
 */
export function TemaIncrustado({ tema }: { tema: "claro" | "oscuro" | null }) {
    useEffect(() => {
        const elegido = tema ?? (matchMedia("(prefers-color-scheme: light)").matches ? "claro" : "oscuro");
        document.documentElement.dataset.tema = elegido;
    }, [tema]);
    return null;
}
