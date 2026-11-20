"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { sanitizeRedirectPath } from "@/lib/url-security";
import { PaginaAcceso, Campo, Esperando } from "@/modules/portal/PaginaAcceso";

function LoginForm({ alPedirFactor }: { alPedirFactor: (si: boolean) => void }) {
    const searchParams = useSearchParams();
    const callbackUrl = sanitizeRedirectPath(searchParams.get("callbackUrl"), "/admin/landing");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [mfaRequired, setMfaRequired] = useState(false);
    const [mfaCode, setMfaCode] = useState("");
    const [recoveryCode, setRecoveryCode] = useState("");
    const [useRecoveryCode, setUseRecoveryCode] = useState(false);
    const [loading, setLoading] = useState(false);
    // Los errores quedan escritos bajo el formulario (antes eran avisos flotantes que se iban a los cinco segundos).
    const [error, setError] = useState("");
    const formulario = useRef<HTMLFormElement>(null);
    const toast = useToast();
    useEffect(() => { alPedirFactor(mfaRequired); }, [mfaRequired, alPedirFactor]);

    // Tras un error el foco vuelve a donde hay que corregir (el botón se deshabilitó mientras se verificaba): la clave en
    // el primer paso, el código en el segundo.
    useEffect(() => {
        if (!error || loading) return;
        const campo = formulario.current?.querySelector<HTMLInputElement>(mfaRequired ? "input" : "input[name=password]");
        campo?.focus();
        campo?.select();
    }, [error, loading, mfaRequired]);

    const resetMfaStep = () => {
        setMfaRequired(false);
        setMfaCode("");
        setRecoveryCode("");
        setUseRecoveryCode(false);
        setError("");
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        // Chrome rellena correo y clave guardados sin avisar a React hasta que se toca la página: se leen del formulario.
        let correoEnviado = email;
        let claveEnviada = password;
        if (!mfaRequired) {
            const datos = new FormData(e.currentTarget);
            correoEnviado = String(datos.get("email") ?? email);
            claveEnviada = String(datos.get("password") ?? password);
            setEmail(correoEnviado);
            setPassword(claveEnviada);
        }

        // El servidor quita guiones y pasa a mayúsculas, pero no los espacios: «ABCD EFGH» copiado de la lista fallaba.
        const normalizedRecoveryCode = recoveryCode.replace(/[^A-Za-z0-9-]/g, "").toUpperCase();
        if (mfaRequired) {
            if (useRecoveryCode) {
                if (normalizedRecoveryCode.replace(/-/g, "").length < 8) {
                    setError("Escribe un código de recuperación completo (8 caracteres).");
                    return;
                }
            } else if (mfaCode.length !== 6) {
                setError("Escribe los 6 dígitos de tu app autenticadora.");
                return;
            }
        }

        setLoading(true);

        try {
            const normalizedEmail = correoEnviado.trim().toLowerCase();
            const result = await signIn("credentials", {
                email: normalizedEmail,
                password: claveEnviada,
                ...(mfaRequired
                    ? (useRecoveryCode
                        ? { mfaRecoveryCode: normalizedRecoveryCode }
                        : { mfaCode })
                    : {}),
                redirect: false,
            });

            if (result?.code === "mfa_required") {
                setMfaRequired(true);
                setLoading(false);
                return;
            }

            if (result?.code === "mfa_invalid") {
                setLoading(false);
                // El código viejo se borra: con los seis dígitos aún escritos había que borrarlos a mano para reintentar.
                setMfaCode("");
                setRecoveryCode("");
                setError(useRecoveryCode
                    ? "Ese código de recuperación no sirve. Revisa que no lo hayas usado antes."
                    : "El código no coincide. Escribe el que muestra ahora tu app (cambia cada 30 segundos).");
                return;
            }

            if (result?.error) {
                // Log failed login attempt
                fetch("/api/audit/event", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "login.failed",
                        category: "auth",
                        metadata: { email: normalizedEmail, reason: result.code || result.error }
                    })
                }).catch(() => { }); // Fire and forget

                // Sin decir cuál de los dos falló ni si la cuenta quedó en pausa: así no se delata qué correos tienen cuenta.
                // La segunda frase va siempre, porque tras varios intentos el servidor responde igual aunque la clave sea buena.
                setError("El correo o la contraseña no coinciden. Tras varios intentos seguidos, el acceso se pausa unos minutos.");
                setLoading(false);
                return;
            }

            // Log successful login
            fetch("/api/audit/event", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "login.success",
                    category: "auth",
                    metadata: { email: normalizedEmail }
                })
            }).catch(() => { }); // Fire and forget

            toast.success("¡Bienvenido!", "Redirigiendo al panel...");

            // Hard redirect to ensure session is picked up by middleware
            setTimeout(() => {
                window.location.href = callbackUrl;
            }, 500);
        } catch {
            setError("No hubo conexión con el servidor. Inténtalo de nuevo.");
            setLoading(false);
        }
    };

    const correo = email.trim().toLowerCase();
    return (
        <>
            <form ref={formulario} onSubmit={handleSubmit} className="pa-form">
                {mfaRequired ? (
                    <>
                        {useRecoveryCode ? (
                            <Campo etiqueta="Código de recuperación" name="recuperacion" valor={recoveryCode} alCambiar={(v) => { setRecoveryCode(v.toUpperCase()); setError(""); }}
                                placeholder="ABCD-EFGH" autoCapitalize="characters" autoCorrect="off" spellCheck={false} autoFocus data-codigo="" />
                        ) : (
                            <Campo etiqueta="Código de tu app autenticadora" name="codigo" valor={mfaCode} alCambiar={(v) => { setMfaCode(v.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                                placeholder="000000" inputMode="numeric" autoComplete="one-time-code" autoFocus data-codigo="" />
                        )}
                        <button type="button" className="pa-alterno" onClick={() => { setUseRecoveryCode((c) => !c); setMfaCode(""); setRecoveryCode(""); setError(""); }}>
                            {useRecoveryCode ? "Usar la app autenticadora" : "Usar un código de recuperación"}
                        </button>
                    </>
                ) : (
                    <>
                        <Campo etiqueta="Correo" type="email" name="email" valor={email} alCambiar={setEmail} autoComplete="username" spellCheck={false} required autoFocus />
                        <Campo etiqueta="Contraseña" name="password" clave valor={password} alCambiar={setPassword} autoComplete="current-password" required />
                    </>
                )}
                {error ? <p role="alert" className="pa-error">{error}</p> : null}
                <button type="submit" className="boton lleno" disabled={loading} aria-busy={loading}>
                    {loading ? <>{mfaRequired ? "Verificando" : "Entrando"} <Esperando /></> : mfaRequired ? "Verificar y entrar" : "Entrar"}
                </button>
            </form>
            <div className="pa-pie">
                {mfaRequired
                    ? <><p>Para <strong>{correo}</strong>.</p><button type="button" className="pa-alterno" onClick={resetMfaStep}>Cambiar correo o contraseña</button></>
                    : <a href="/">Volver al sitio</a>}
            </div>
        </>
    );
}

/** El título cambia cuando el servidor pide el segundo factor; por eso lo decide el formulario. */
function Acceso() {
    const [paso, setPaso] = useState<"clave" | "factor">("clave");
    const alPedirFactor = useCallback((si: boolean) => setPaso(si ? "factor" : "clave"), []);
    return (
        <PaginaAcceso palabra="panel" sello="nicoholas.dev"
            titulo={paso === "factor" ? "Un paso más." : "Panel."}
            texto={<p>{paso === "factor" ? "Confirma con el segundo factor para terminar de entrar." : "Entrada al panel de administración."}</p>}>
            <Suspense fallback={null}>
                <LoginForm alPedirFactor={alPedirFactor} />
            </Suspense>
        </PaginaAcceso>
    );
}

export default function LoginPage() {
    return <Acceso />;
}
