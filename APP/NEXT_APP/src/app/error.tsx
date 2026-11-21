"use client";

import { useEffect } from "react";
import { PaginaErrorDiferida as PaginaError } from "@/modules/errores/PaginaErrorDiferida";

export default function Error({
    error,
    reset,
    retry,
}: {
    error: Error & { digest?: string };
    reset: () => void;
    /** Vuelve a pedir la página al servidor y la redibuja (Next 16). `reset` solo redibuja: si el error vino del servidor, no cambiaba nada. */
    retry?: () => void;
}) {
    useEffect(() => {
        console.error("Application error:", error);
    }, [error]);

    return (
        <PaginaError codigo="error" titulo="Algo falló aquí." texto="Fue un error de esta página, no tuyo. Puedes intentarlo de nuevo; si sigue, vuelve al inicio."
            acciones={<>
                <button type="button" className="boton lleno" onClick={() => (retry ?? reset)()}>Intentar de nuevo</button>
                <a className="enlace-ir" href="/">Volver al inicio</a>
            </>} />
    );
}
