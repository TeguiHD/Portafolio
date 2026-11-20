"use client";

import { useState, useTransition } from "react";
import { PaginaAcceso, Campo, Esperando } from "@/modules/portal/PaginaAcceso";
import { ingresarPortalAction } from "./actions";

export default function IngresoPortal({ usuarioInicial }: { usuarioInicial: string }) {
    const [usuario, setUsuario] = useState(usuarioInicial);
    const [contrasena, setContrasena] = useState("");
    const [error, setError] = useState("");
    const [pendiente, startTransition] = useTransition();
    // Entre el «sí» del servidor y la carga de «Mis documentos» el botón no vuelve a quedar activo (un segundo clic
    // repetía el ingreso y gastaba un intento del límite).
    const [saliendo, setSaliendo] = useState(false);

    const entrar = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Se lee del formulario y no solo del estado: Chrome rellena usuario y clave guardados sin avisar a React hasta
        // que se toca la página, y el botón quedaba deshabilitado (o se enviaba vacío) con los campos llenos a la vista.
        const datos = new FormData(e.currentTarget);
        const u = String(datos.get("username") ?? usuario);
        const c = String(datos.get("password") ?? contrasena);
        if (!u.trim() || !c) {
            setError("Escribe tu usuario y tu contraseña.");
            return;
        }
        setUsuario(u);
        setContrasena(c);
        setError("");
        startTransition(async () => {
            try {
                const r = await ingresarPortalAction(u, c);
                if (r.success) {
                    setSaliendo(true);
                    window.location.assign(r.destino);
                }
                else setError(r.error);
            } catch {
                setError("No hubo conexión con el servidor. Inténtalo de nuevo.");
            }
        });
    };

    return (
        <PaginaAcceso palabra="hola" sello="Portal de clientes" titulo="Tus documentos." texto={<p>Tus propuestas, para leerlas, firmarlas y descargarlas.</p>}>
            <form onSubmit={entrar} className="pa-form">
                <Campo etiqueta="Usuario" name="username" valor={usuario} alCambiar={setUsuario} autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus={!usuarioInicial} />
                <Campo etiqueta="Contraseña" name="password" clave valor={contrasena} alCambiar={setContrasena} autoComplete="current-password" required autoFocus={Boolean(usuarioInicial)} />
                {error ? <p role="alert" className="pa-error">{error}</p> : null}
                <button type="submit" className="boton lleno" disabled={pendiente || saliendo} aria-busy={pendiente || saliendo}>
                    {pendiente || saliendo ? <>Entrando <Esperando /></> : "Entrar"}
                </button>
            </form>
            <div className="pa-pie"><p>¿No tienes tus datos? Pídeselos a quien te envió la propuesta.</p></div>
        </PaginaAcceso>
    );
}
