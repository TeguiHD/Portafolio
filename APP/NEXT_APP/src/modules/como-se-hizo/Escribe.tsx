"use client";

import { useEffect } from "react";
import { useMateria } from "@/modules/materia/Materia";

/** La materia escribe la cifra de la cabecera (la sección declara data-forma="texto" data-ancla="#cs-texto"). */
export function EscribeMateria({ texto }: { texto: string }) {
    const motor = useMateria();
    useEffect(() => { motor?.escribir(texto); }, [motor, texto]);
    return <div id="cs-texto" className="cs-texto" aria-hidden="true" />;
}
