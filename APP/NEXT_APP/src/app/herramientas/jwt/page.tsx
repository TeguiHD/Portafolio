"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

import { useState, useMemo } from "react";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { useCopiar } from "@/lib/tools/copiar";
import { bytesDeBase64, infoAlg, verificarFirmaJwt, type ResultadoFirma } from "@/lib/jwt-verificar";

interface JWTHeader {
    alg?: string;
    typ?: string;
    [key: string]: unknown;
}

interface JWTPayload {
    iss?: string;
    sub?: string;
    aud?: string | string[];
    exp?: number;
    nbf?: number;
    iat?: number;
    jti?: string;
    [key: string]: unknown;
}

/**
 * Decodifica una parte base64url del token a texto UTF-8. Todo ocurre en el navegador: la verificación
 * de firma (jwt-verificar.ts) usa WebCrypto y tampoco envía nada.
 */
function base64UrlDecode(str: string): string {
    // Límite para que un texto gigante no bloquee la pestaña.
    if (str.length > 100000) throw new Error("es demasiado largo");
    let bytes: Uint8Array;
    try { bytes = bytesDeBase64(str); } catch { throw new Error("no es base64url válido"); }
    return new TextDecoder().decode(bytes);
}

const ALGS_SOPORTADOS = "HS256/384/512, RS256/384/512, PS256/384/512 y ES256/384/512";

/** Texto y color de cada resultado de verificación. */
function vistaResultado(r: ResultadoFirma): { titulo: string; clase: string; detalle?: string } {
    switch (r.estado) {
        case "valida": return { titulo: "✓ Firma válida", clase: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" };
        case "invalida": return { titulo: "✗ Firma no válida", clase: "bg-red-500/10 border-red-500/30 text-red-300", detalle: r.detalle ?? "El contenido fue alterado o la clave no es la que firmó el token." };
        case "no-soportado": return { titulo: "Algoritmo no soportado", clase: "bg-amber-500/10 border-amber-500/30 text-amber-200", detalle: `alg: ${r.alg}. Se pueden verificar ${ALGS_SOPORTADOS}.` };
        case "sin-firma": return { titulo: "alg: none (sin firma)", clase: "bg-amber-500/10 border-amber-500/30 text-amber-200", detalle: `Cualquiera pudo fabricar este token; un servidor nunca debería aceptarlo.${r.detalle ? ` ${r.detalle}` : ""}` };
        case "error": return { titulo: "No se pudo verificar", clase: "bg-red-500/10 border-red-500/30 text-red-300", detalle: r.mensaje };
    }
}

/** El aviso depende del claim: exp pasado = expirado; nbf futuro = aún no válido; iat futuro = emitido en el futuro. */
function formatTimestamp(ts: unknown, claim: "iat" | "exp" | "nbf" = "exp"): string {
    // RFC 7519: son segundos desde 1970 (NumericDate). Un texto o un valor en milisegundos daban «Invalid Date» o el año 55000.
    if (typeof ts !== "number" || !Number.isFinite(ts)) return `${JSON.stringify(ts)} (no es un número: debería ser segundos desde 1970)`;
    if (Math.abs(ts) > 1e11) return `${ts} (parece estar en milisegundos: el estándar usa segundos, sería ${new Date(ts).toLocaleString("es-CL")})`;
    try {
        const date = new Date(ts * 1000);
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const expired = diff < 0;
        const relative = expired ? "hace " : "en ";
        const absDiff = Math.abs(diff);
        const minutes = Math.floor(absDiff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        let relStr = "";
        if (days > 0) relStr = `${relative}${days}d ${hours % 24}h`;
        else if (hours > 0) relStr = `${relative}${hours}h ${minutes % 60}m`;
        else relStr = `${relative}${minutes}m`;

        const aviso = claim === "exp" && expired ? "⚠️ expirado · " : claim === "nbf" && !expired ? "⚠️ aún no válido · " : claim === "iat" && !expired ? "⚠️ emitido en el futuro · " : "";
        return `${date.toLocaleString("es-CL")} (${aviso}${relStr})`;
    } catch {
        return String(ts);
    }
}

export default function JwtDecoderPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("jwt");
    const [token, setToken] = useState("");
    const { copiado, fallo, copiar } = useCopiar();
    const [secreto, setSecreto] = useState("");
    const [codificacion, setCodificacion] = useState<"utf8" | "base64">("utf8");
    const [clavePublica, setClavePublica] = useState("");
    const [verificando, setVerificando] = useState(false);
    // El resultado guarda para qué token y clave se calculó: si cambia cualquiera, deja de mostrarse.
    const [verificacion, setVerificacion] = useState<{ para: string; r: ResultadoFirma } | null>(null);

    // Se aceptan tokens copiados de una cabecera («Authorization: Bearer …»), entre comillas (de un JSON o un .env)
    // y con espacios o saltos de línea en medio.
    const limpio = token.trim()
        .replace(/^Authorization\s*:\s*/i, "")
        .replace(/^Bearer\s+/i, "")
        .replace(/^(["'`])([\s\S]*)\1$/, "$2")
        .replace(/\s+/g, "");
    const decoded = useMemo(() => {
        if (!limpio) return null;

        const parts = limpio.split(".");
        if (parts.length === 5) return { error: "Es un JWE (token cifrado): su contenido no se puede leer sin la clave de descifrado." };
        if (parts.length !== 3) return { error: "Token JWT inválido. Debe tener 3 partes separadas por puntos." };

        // Cada parte por separado: así el error dice cuál está mal en vez de un mensaje del motor en inglés.
        const leerParte = (texto: string, nombre: string): { ok: true; valor: unknown } | { ok: false; error: string } => {
            let json: string;
            try { json = base64UrlDecode(texto); } catch (e) { return { ok: false, error: `${nombre} ${e instanceof Error ? e.message : "no se pudo leer"}.` }; }
            try { return { ok: true, valor: JSON.parse(json) }; } catch { return { ok: false, error: `${nombre} no es JSON válido. ¿Copiaste el token completo?` }; }
        };
        const h = leerParte(parts[0], "El header");
        if (!h.ok) return { error: h.error };
        const p = leerParte(parts[1], "El payload");
        if (!p.ok) return { error: p.error };
        return { header: h.valor as JWTHeader, payload: p.valor as JWTPayload, signature: parts[2], error: null };
    }, [limpio]);

    const alg = decoded && !decoded.error ? infoAlg(decoded.header?.alg) : null;
    const familia = alg && alg !== "none" ? alg.familia : null;
    const claveActual = familia === "HS" ? `${codificacion}:${secreto}` : clavePublica;
    const entradas = `${limpio}\u0000${claveActual}`;
    const resultado = verificacion?.para === entradas ? verificacion.r : null;
    const puedeVerificar = familia === "HS" ? secreto.length > 0 : clavePublica.trim().length > 0;

    const verificar = async () => {
        if (!decoded || decoded.error || !decoded.header || !familia || !puedeVerificar) return;
        const [h, p, f] = limpio.split(".");
        setVerificando(true);
        const r = await verificarFirmaJwt([h, p, f], decoded.header, familia === "HS" ? { tipo: "secreto", texto: secreto, codificacion } : { tipo: "publica", texto: clavePublica });
        setVerificacion({ para: entradas, r });
        setVerificando(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Decodificador JWT"} />;
    }

    return (
        <div className="tool-page">
            <main className="tool-main pt-20 pb-12 sm:pt-24 sm:pb-16">
                <ToolPageHeader slug="jwt" />

                {/* Security Notice */}
                <div className="mb-6 p-3 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 text-center">
                    <p className="text-xs text-[#6366F1]">
                        🔒 El token se decodifica localmente. Nunca se envía a ningún servidor.
                    </p>
                </div>

                {/* Token Input */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <label htmlFor="jwt-token" className="text-sm text-neutral-300 block mb-2">Pega tu token JWT:</label>
                    <textarea
                        id="jwt-token"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
                        rows={4}
                        className="w-full bg-[#0F1724] border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm/relaxed outline-none focus:ring-2 resize-none"
                        spellCheck={false}
                    />
                    {token && (
                        <button type="button" onClick={() => setToken("")} className="mt-2 min-h-11 text-xs text-neutral-500 hover:text-white transition-colors">
                            Limpiar
                        </button>
                    )}
                </div>

                <span role="status" className="sr-only">{copiado ? "Copiado" : fallo ? "No se pudo copiar" : ""}</span>

                {/* Decoded Result */}
                {decoded && (
                    <div className="mt-6 space-y-4">
                        {decoded.error ? (
                            <div role="alert" className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                                ❌ {decoded.error}
                            </div>
                        ) : (
                            <>
                                {/* Token Parts Visualization */}
                                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                    <h3 className="text-sm text-neutral-300 mb-2">Estructura del token:</h3>
                                    <div className="flex flex-wrap gap-0 text-xs font-mono break-all">
                                        <span className="text-red-400">{limpio.split(".")[0]}</span>
                                        <span className="text-neutral-600">.</span>
                                        <span className="text-purple-400">{limpio.split(".")[1]}</span>
                                        <span className="text-neutral-600">.</span>
                                        <span className="text-cyan-400">{limpio.split(".")[2]}</span>
                                    </div>
                                </div>

                                {/* Header */}
                                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-2 bg-red-500/10 border-b border-white/5">
                                        <span className="text-sm font-medium text-red-400">Header (JOSE)</span>
                                        <button type="button" onClick={() => void copiar(JSON.stringify(decoded.header, null, 2), "header")} aria-label="Copiar header"
                                            className="min-h-11 px-2 text-xs text-neutral-500 hover:text-white transition-colors">
                                            {copiado === "header" ? "✓ Copiado" : fallo === "header" ? "No se pudo copiar" : "Copiar"}
                                        </button>
                                    </div>
                                    <pre className="p-4 text-sm text-neutral-300 font-mono overflow-x-auto">
                                        {JSON.stringify(decoded.header, null, 2)}
                                    </pre>
                                </div>

                                {/* Payload */}
                                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-2 bg-purple-500/10 border-b border-white/5">
                                        <span className="text-sm font-medium text-purple-400">Payload (Claims)</span>
                                        <button type="button" onClick={() => void copiar(JSON.stringify(decoded.payload, null, 2), "payload")} aria-label="Copiar payload"
                                            className="min-h-11 px-2 text-xs text-neutral-500 hover:text-white transition-colors">
                                            {copiado === "payload" ? "✓ Copiado" : fallo === "payload" ? "No se pudo copiar" : "Copiar"}
                                        </button>
                                    </div>
                                    <pre className="p-4 text-sm text-neutral-300 font-mono overflow-x-auto">
                                        {JSON.stringify(decoded.payload, null, 2)}
                                    </pre>

                                    {/* Timestamp analysis */}
                                    {(decoded.payload?.exp != null || decoded.payload?.iat != null || decoded.payload?.nbf != null) && (
                                        <div className="px-4 pb-4 space-y-1">
                                            <div className="border-t border-white/5 pt-3 mb-2">
                                                <span className="text-xs text-neutral-500">Análisis de timestamps:</span>
                                            </div>
                                            {decoded.payload?.iat != null && (
                                                <p className="text-xs text-neutral-400">
                                                    <span className="text-purple-400">iat</span> (emitido): {formatTimestamp(decoded.payload.iat, "iat")}
                                                </p>
                                            )}
                                            {decoded.payload?.exp != null && (
                                                <p className="text-xs text-neutral-400">
                                                    <span className="text-purple-400">exp</span> (expira): {formatTimestamp(decoded.payload.exp, "exp")}
                                                </p>
                                            )}
                                            {decoded.payload?.nbf != null && (
                                                <p className="text-xs text-neutral-400">
                                                    <span className="text-purple-400">nbf</span> (no antes de): {formatTimestamp(decoded.payload.nbf, "nbf")}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Firma y verificación con WebCrypto */}
                                <section aria-labelledby="jwt-firma" className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-2 bg-cyan-500/10 border-b border-white/5">
                                        <h3 id="jwt-firma" className="text-sm font-medium text-cyan-400">Firma</h3>
                                        <span className="text-xs font-mono text-neutral-400">alg: {String(decoded.header?.alg ?? "sin alg")}</span>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <p className="text-xs font-mono text-neutral-400 break-all">{decoded.signature || <span className="italic text-neutral-500">vacía</span>}</p>

                                        {(typeof decoded.header?.jku === "string" || typeof decoded.header?.x5u === "string") && (
                                            <p className="text-xs text-amber-200">El token indica una URL de donde sacar la clave (jku/x5u). Aquí no se descarga: pega tú la clave que esperas.</p>
                                        )}
                                        {decoded.header?.jwk !== undefined && (
                                            <p className="text-xs text-amber-200">La cabecera trae su propia clave (jwk). No la uses para verificar: quien fabrica el token puede poner ahí la suya.</p>
                                        )}

                                        {alg === "none" || alg === null ? (
                                            <div aria-live="polite">
                                                {(() => {
                                                    const v = vistaResultado(alg === "none" ? { estado: "sin-firma", detalle: decoded.signature ? "Trae una firma igual, pero con alg none un servidor no la revisaría." : undefined } : { estado: "no-soportado", alg: typeof decoded.header?.alg === "string" ? decoded.header.alg : "sin alg" });
                                                    return (
                                                        <div className={`rounded-lg border px-3 py-2 ${v.clase}`}>
                                                            <p className="text-sm font-medium">{v.titulo}</p>
                                                            {v.detalle && <p className="text-xs mt-1 opacity-90">{v.detalle}</p>}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            <form
                                                className="space-y-3"
                                                onSubmit={(e) => { e.preventDefault(); void verificar(); }}
                                            >
                                                {familia === "HS" ? (
                                                    <>
                                                        <div>
                                                            <label htmlFor="jwt-secreto" className="block text-xs text-neutral-300 mb-1.5">Secreto compartido</label>
                                                            <input
                                                                id="jwt-secreto"
                                                                type="text"
                                                                value={secreto}
                                                                onChange={(e) => setSecreto(e.target.value)}
                                                                autoComplete="off"
                                                                spellCheck={false}
                                                                className="w-full bg-[#0F1724] border border-white/10 rounded-lg px-3 py-2.5 text-white font-mono text-sm outline-none focus:ring-2"
                                                            />
                                                        </div>
                                                        <fieldset>
                                                            <legend className="text-xs text-neutral-400 mb-1">El secreto está en</legend>
                                                            <div className="flex flex-wrap gap-x-4">
                                                                <label className="inline-flex min-h-11 items-center gap-2 text-xs text-neutral-300">
                                                                    <input type="radio" name="jwt-codificacion" value="utf8" checked={codificacion === "utf8"} onChange={() => setCodificacion("utf8")} />
                                                                    Texto (UTF-8)
                                                                </label>
                                                                <label className="inline-flex min-h-11 items-center gap-2 text-xs text-neutral-300">
                                                                    <input type="radio" name="jwt-codificacion" value="base64" checked={codificacion === "base64"} onChange={() => setCodificacion("base64")} />
                                                                    Base64 o base64url
                                                                </label>
                                                            </div>
                                                        </fieldset>
                                                    </>
                                                ) : (
                                                    <div>
                                                        <label htmlFor="jwt-clave-publica" className="block text-xs text-neutral-300 mb-1.5">Clave pública (PEM o JWK)</label>
                                                        <textarea
                                                            id="jwt-clave-publica"
                                                            value={clavePublica}
                                                            onChange={(e) => setClavePublica(e.target.value)}
                                                            rows={5}
                                                            spellCheck={false}
                                                            aria-describedby="jwt-clave-ayuda"
                                                            placeholder={"-----BEGIN PUBLIC KEY-----\n…\n-----END PUBLIC KEY-----"}
                                                            className="w-full bg-[#0F1724] border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs/relaxed outline-none focus:ring-2 resize-y"
                                                        />
                                                        <p id="jwt-clave-ayuda" className="text-[11px] text-neutral-500 mt-1">
                                                            {familia === "ES" ? `Clave EC de la curva ${alg.bits === 512 ? "P-521" : `P-${alg.bits}`}` : "Clave RSA"} en PEM «BEGIN PUBLIC KEY», como JWK o como JWKS{typeof decoded.header?.kid === "string" ? ` (se usa la de kid «${decoded.header.kid}»)` : ""}.
                                                        </p>
                                                    </div>
                                                )}
                                                <button type="submit" disabled={!puedeVerificar || verificando} className="min-h-11 px-4 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-sm hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                                    {verificando ? "Verificando…" : "Verificar firma"}
                                                </button>
                                                <div aria-live="polite">
                                                    {resultado && (() => {
                                                        const v = vistaResultado(resultado);
                                                        return (
                                                            <div role={resultado.estado === "error" ? "alert" : undefined} className={`rounded-lg border px-3 py-2 ${v.clase}`}>
                                                                <p className="text-sm font-medium">{v.titulo}</p>
                                                                {v.detalle && <p className="text-xs mt-1 opacity-90">{v.detalle}</p>}
                                                                {"avisos" in resultado && resultado.avisos.map((aviso) => <p key={aviso} className="text-xs mt-1 text-amber-200">{aviso}</p>)}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </form>
                                        )}
                                        <p className="text-[11px] text-neutral-500">🔒 La clave nunca sale de tu navegador: la firma se verifica con WebCrypto en esta pestaña.</p>
                                    </div>
                                </section>
                            </>
                        )}
                    </div>
                )}

            </main>
        </div>
    );
}
