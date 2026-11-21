"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { PaginaError } from "./PaginaError";

type Props = ComponentProps<typeof PaginaError>;

/** Si la pieza no llega (sin red, o un despliegue nuevo cambió los archivos), igual se ve qué pasó y qué hacer. */
function Sencilla({ titulo, texto, acciones }: Props) {
    return (
        <main id="main-content" style={{ maxWidth: 640, margin: "0 auto", padding: "18vh 20px" }}>
            <h1>{titulo}</h1>
            <p>{texto}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>{acciones}</div>
        </main>
    );
}

/**
 * El error y el 404 van en el árbol de la raíz, y Next baja sus piezas en TODAS las páginas por si hicieran falta.
 * PaginaError trae su propia copia de la barra, el pie y la materia (~9 KB comprimidos cada una): con la importación
 * diferida solo se descarga cuando de verdad se muestra un error. En un 404 servido el servidor la pinta igual.
 */
const Diferida = dynamic(() => import("./PaginaError").then((m) => m.PaginaError).catch(() => Sencilla));

export function PaginaErrorDiferida(props: Props) {
    return <Diferida {...props} />;
}
