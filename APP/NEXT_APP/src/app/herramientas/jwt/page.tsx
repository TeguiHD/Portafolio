"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";

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
 * SECURITY(OWASP): JWT is ONLY decoded, never verified/trusted.
 * No secrets, no signature validation. Read-only inspection tool.
 * base64url decoding with proper padding handling.
 */
function base64UrlDecode(str: string): string {
    // SECURITY: Limit input length to prevent DoS
    if (str.length > 100000) throw new Error("Token demasiado largo");

    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const padding = base64.length % 4;
    if (padding === 2) base64 += "==";
    else if (padding === 3) base64 += "=";

    try {
        return decodeURIComponent(
            atob(base64)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
    } catch {
        return atob(base64);
    }
}

function formatTimestamp(ts: number): string {
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

        return `${date.toLocaleString("es-ES")} (${expired ? "⚠️ EXPIRADO " : ""}${relStr})`;
    } catch {
        return String(ts);
    }
}

export default function JwtDecoderPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("jwt");
    const [token, setToken] = useState("");
    const [copied, setCopied] = useState<string | null>(null);

    const decoded = useMemo(() => {
        if (!token.trim()) return null;

        const parts = token.trim().split(".");
        if (parts.length !== 3) return { error: "Token JWT inválido. Debe tener 3 partes separadas por puntos." };

        try {
            const header: JWTHeader = JSON.parse(base64UrlDecode(parts[0]));
            const payload: JWTPayload = JSON.parse(base64UrlDecode(parts[1]));
            const signature = parts[2];

            return { header, payload, signature, error: null };
        } catch (e) {
            return { error: `Error al decodificar: ${e instanceof Error ? e.message : "formato inválido"}` };
        }
    }, [token]);

    const handleCopy = useCallback((text: string, section: string) => {
        navigator.clipboard.writeText(text);
        setCopied(section);
        setTimeout(() => setCopied(null), 1500);
    }, []);

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
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Decodificador JWT</h1>
                    <p className="text-neutral-400 text-sm sm:text-base">
                        Decodifica tokens JWT y visualiza header, payload y firma. Sin envío a servidores.
                    </p>
                </div>

                {/* Security Notice */}
                <div className="mb-6 p-3 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 text-center">
                    <p className="text-xs text-[#6366F1]">
                        🔒 El token se decodifica localmente. Nunca se envía a ningún servidor.
                    </p>
                </div>

                {/* Token Input */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <label className="text-sm text-neutral-300 block mb-2">Pega tu token JWT:</label>
                    <textarea
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
                        rows={4}
                        className="w-full bg-[#0F1724] border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm/relaxed outline-none focus:ring-2 resize-none"
                        spellCheck={false}
                    />
                    {token && (
                        <button onClick={() => setToken("")} className="mt-2 text-xs text-neutral-500 hover:text-white transition-colors">
                            Limpiar
                        </button>
                    )}
                </div>

                {/* Decoded Result */}
                {decoded && (
                    <div className="mt-6 space-y-4">
                        {decoded.error ? (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                                ❌ {decoded.error}
                            </div>
                        ) : (
                            <>
                                {/* Token Parts Visualization */}
                                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                    <h3 className="text-sm text-neutral-300 mb-2">Estructura del token:</h3>
                                    <div className="flex flex-wrap gap-0 text-xs font-mono break-all">
                                        <span className="text-red-400">{token.split(".")[0]}</span>
                                        <span className="text-neutral-600">.</span>
                                        <span className="text-purple-400">{token.split(".")[1]}</span>
                                        <span className="text-neutral-600">.</span>
                                        <span className="text-cyan-400">{token.split(".")[2]}</span>
                                    </div>
                                </div>

                                {/* Header */}
                                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-2 bg-red-500/10 border-b border-white/5">
                                        <span className="text-sm font-medium text-red-400">Header (JOSE)</span>
                                        <button onClick={() => handleCopy(JSON.stringify(decoded.header, null, 2), "header")}
                                            className="text-xs text-neutral-500 hover:text-white transition-colors">
                                            {copied === "header" ? "✓ Copiado" : "Copiar"}
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
                                        <button onClick={() => handleCopy(JSON.stringify(decoded.payload, null, 2), "payload")}
                                            className="text-xs text-neutral-500 hover:text-white transition-colors">
                                            {copied === "payload" ? "✓ Copiado" : "Copiar"}
                                        </button>
                                    </div>
                                    <pre className="p-4 text-sm text-neutral-300 font-mono overflow-x-auto">
                                        {JSON.stringify(decoded.payload, null, 2)}
                                    </pre>

                                    {/* Timestamp analysis */}
                                    {(decoded.payload?.exp || decoded.payload?.iat || decoded.payload?.nbf) && (
                                        <div className="px-4 pb-4 space-y-1">
                                            <div className="border-t border-white/5 pt-3 mb-2">
                                                <span className="text-xs text-neutral-500">Análisis de timestamps:</span>
                                            </div>
                                            {decoded.payload?.iat && (
                                                <p className="text-xs text-neutral-400">
                                                    <span className="text-purple-400">iat</span> (emitido): {formatTimestamp(decoded.payload.iat)}
                                                </p>
                                            )}
                                            {decoded.payload?.exp && (
                                                <p className="text-xs text-neutral-400">
                                                    <span className="text-purple-400">exp</span> (expira): {formatTimestamp(decoded.payload.exp)}
                                                </p>
                                            )}
                                            {decoded.payload?.nbf && (
                                                <p className="text-xs text-neutral-400">
                                                    <span className="text-purple-400">nbf</span> (no antes de): {formatTimestamp(decoded.payload.nbf)}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Signature */}
                                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                    <div className="px-4 py-2 bg-cyan-500/10 border-b border-white/5">
                                        <span className="text-sm font-medium text-cyan-400">Signature</span>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-xs font-mono text-neutral-400 break-all">{decoded.signature}</p>
                                        <p className="text-xs text-neutral-600 mt-2">
                                            ⚠️ La firma no se verifica. Esta herramienta solo decodifica.
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div className="mt-8 text-center">
                    <Link href="/herramientas" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver a herramientas
                    </Link>
                </div>
            </main>
        </div>
    );
}
