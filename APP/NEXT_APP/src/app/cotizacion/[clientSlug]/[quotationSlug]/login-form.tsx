"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PaginaAcceso, Campo, Esperando } from "@/modules/portal/PaginaAcceso";
import { verifyQuotationAccessAction } from "./actions";

interface LoginFormProps {
    clientSlug: string;
    quotationSlug: string;
    clientName: string;
    projectName: string;
}

/** Entrada a una propuesta con el código que llegó junto al enlace. */
export default function QuotationLoginForm({ clientSlug, quotationSlug, clientName, projectName }: LoginFormProps) {
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const formulario = useRef<HTMLFormElement>(null);

    // Tras un error el campo (deshabilitado mientras se verificaba) vuelve a tener el foco con el código seleccionado:
    // se corrige sin buscar dónde estaba.
    useEffect(() => {
        if (!error || isPending) return;
        const campo = formulario.current?.querySelector<HTMLInputElement>("input[name=codigo]");
        campo?.focus();
        campo?.select();
    }, [error, isPending]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;
        setError("");
        startTransition(async () => {
            try {
                const result = await verifyQuotationAccessAction(clientSlug, quotationSlug, code);
                if (result.success) {
                    router.refresh();
                    return;
                }
                setError(result.error || "No se pudo abrir la propuesta.");
            } catch {
                // Sin esto, una caída de la red terminaba en la página de error del sitio.
                setError("No hubo conexión con el servidor. Inténtalo de nuevo.");
            }
        });
    };

    return (
        <PaginaAcceso palabra="hola" sello={clientName} titulo={projectName} texto={<p>Escribe el código que llegó junto con el enlace.</p>}>
            <form ref={formulario} onSubmit={handleSubmit} className="pa-form">
                <Campo etiqueta="Código de acceso" name="codigo" valor={code} alCambiar={(v) => { setCode(v); if (error) setError(""); }} autoFocus disabled={isPending} autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} data-codigo="" />
                {error ? <p role="alert" className="pa-error">{error}</p> : null}
                <button type="submit" className="boton lleno" disabled={isPending || !code.trim()} aria-busy={isPending}>
                    {isPending ? <>Verificando <Esperando /></> : "Abrir la propuesta"}
                </button>
            </form>
            <div className="pa-pie">
                <a href={`/cotizacion?usuario=${encodeURIComponent(clientSlug)}`}>Entrar con usuario y contraseña</a>
                <p>¿No tienes el código? Pídeselo a quien te envió el enlace.</p>
            </div>
        </PaginaAcceso>
    );
}
