"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { useCopiar } from "@/lib/tools/copiar";
import { descargarTexto } from "@/lib/tools/descargar";

const ACCENT = "#F59E0B";

/* ─── Presets ─── */

interface ServerBlock {
    listen: string;
    serverName: string;
    root: string;
    ssl: boolean;
    certPath: string;
    keyPath: string;
    forceHttps: boolean;
    gzip: boolean;
    proxy: boolean;
    proxyPass: string;
    blockBots: boolean;
    cacheStatic: boolean;
    secHeaders: boolean;
    rateLimit: boolean;
    customLocations: string;
}

const DEFAULT: ServerBlock = {
    listen: "80",
    serverName: "example.com",
    root: "/var/www/html",
    ssl: false,
    certPath: "/etc/letsencrypt/live/example.com/fullchain.pem",
    keyPath: "/etc/letsencrypt/live/example.com/privkey.pem",
    forceHttps: false,
    gzip: true,
    proxy: false,
    proxyPass: "http://localhost:3000",
    blockBots: false,
    cacheStatic: true,
    secHeaders: true,
    rateLimit: false,
    customLocations: "",
};

/**
 * SECURITY(OWASP): Input sanitization - prevent injection in generated configs.
 * Strips dangerous characters that could lead to config injection.
 */
function sanitize(val: string): string {
    // Remove Nginx-dangerous characters: semicolons, braces, backticks, $, #
    return val.replace(/[;{}`$#\\]/g, "").trim();
}

/** Interruptor accesible: un botón con role="switch" (antes era un label con un div: sin teclado, y tres no hacían nada). */
function Interruptor({ activo, alCambiar, children }: { activo: boolean; alCambiar: (v: boolean) => void; children: React.ReactNode }) {
    return (
        <button type="button" role="switch" aria-checked={activo} onClick={() => alCambiar(!activo)}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg py-1 text-left outline-none focus-visible:ring-2" style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}>
            <span aria-hidden="true" className={`relative h-5 w-10 shrink-0 rounded-full transition-colors ${activo ? "" : "bg-white/10"}`} style={activo ? { background: ACCENT } : undefined}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${activo ? "translate-x-5" : "translate-x-0.5"}`} />
            </span>
            <span className="text-sm text-neutral-300">{children}</span>
        </button>
    );
}

/** Un campo vacío dejaba «server_name ;» o «root ;» y nginx -t fallaba: se usa el valor por defecto y se avisa. */
function valor(texto: string, respaldo: string): string {
    return sanitize(texto) || respaldo;
}

/** Lo que el formulario dejaría mal o a medias, dicho antes de copiar. */
function avisosConfig(cfg: ServerBlock, mode: "nginx" | "htaccess"): string[] {
    const avisos: string[] = [];
    if (mode !== "nginx") return avisos;
    if (!sanitize(cfg.serverName)) avisos.push("Sin dominio: se usa «_» (responde a cualquier nombre).");
    if (!cfg.ssl && !/^\d{1,5}$/.test(sanitize(cfg.listen))) avisos.push("El puerto debe ser un número: se usa 80.");
    if (!cfg.proxy && !sanitize(cfg.root)) avisos.push("Sin carpeta raíz: se usa /var/www/html.");
    if (cfg.proxy && !/^https?:\/\/[^\s/]+/.test(sanitize(cfg.proxyPass))) avisos.push("El destino del proxy debe empezar con http:// o https:// y un host: se usa http://localhost:3000.");
    if (cfg.proxy && cfg.cacheStatic && /^https?:\/\/[^/\s]+\/./.test(sanitize(cfg.proxyPass))) avisos.push("El destino del proxy lleva ruta: en el bloque de estáticos nginx no la admite, así que esos archivos se piden al backend sin ella. Si tu app vive bajo esa ruta, apaga «Caché de archivos estáticos».");
    if (cfg.ssl && (!sanitize(cfg.certPath) || !sanitize(cfg.keyPath))) avisos.push("Faltan las rutas del certificado o de la clave: se usan las de Let's Encrypt para el dominio.");
    if (/[;{}`$#\\]/.test(cfg.serverName + cfg.root + cfg.proxyPass + cfg.certPath + cfg.keyPath + cfg.listen)) avisos.push("Se quitaron caracteres que nginx interpretaría (; { } $ # ` \\).");
    return avisos;
}

function generateNginxConfig(cfg: ServerBlock): string {
    const lines: string[] = [];
    const indent = "    ";
    const dominio = valor(cfg.serverName, "_");
    const primero = dominio.split(/\s+/)[0];
    const dominioCert = !primero || primero === "_" ? "example.com" : primero;
    const puerto = /^\d{1,5}$/.test(sanitize(cfg.listen)) ? sanitize(cfg.listen) : "80";
    const proxyPass = /^https?:\/\/[^\s/]+/.test(sanitize(cfg.proxyPass)) ? sanitize(cfg.proxyPass) : DEFAULT.proxyPass;
    // En un location con expresión regular, proxy_pass no puede llevar ruta («http://app:3000/» hace fallar nginx -t).
    const proxyBase = proxyPass.replace(/^(https?:\/\/[^/\s]+).*$/, "$1");
    const cert = valor(cfg.certPath, `/etc/letsencrypt/live/${dominioCert}/fullchain.pem`);
    const clave = valor(cfg.keyPath, `/etc/letsencrypt/live/${dominioCert}/privkey.pem`);

    // WebSocket con proxy: «Connection» según la petición (un 'upgrade' fijo rompe las conexiones normales con keep-alive).
    // Igual que limit_req_zone, el map va en el contexto http (los archivos de conf.d/ se incluyen ahí).
    if (cfg.proxy) {
        lines.push("# Va una sola vez en el contexto http: si otro sitio ya lo define, borra este bloque.");
        lines.push("map $http_upgrade $connection_upgrade {");
        lines.push(`${indent}default upgrade;`);
        lines.push(`${indent}''      close;`);
        lines.push("}");
        lines.push("");
    }

    // Rate limit zone (if enabled)
    if (cfg.rateLimit) {
        lines.push("# Rate limiting zone (una sola vez en el contexto http: si otro sitio ya la define, borra esta línea)");
        lines.push("limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;");
        lines.push("");
    }

    // Force HTTPS redirect block
    if (cfg.forceHttps && cfg.ssl) {
        lines.push("server {");
        lines.push(`${indent}listen 80;`);
        lines.push(`${indent}listen [::]:80;`);
        lines.push(`${indent}server_name ${dominio};`);
        lines.push(`${indent}return 301 https://$host$request_uri;`);
        lines.push("}");
        lines.push("");
    }

    lines.push("server {");

    // Listen
    if (cfg.ssl) {
        lines.push(`${indent}listen 443 ssl;`);
        lines.push(`${indent}listen [::]:443 ssl;`);
        lines.push(`${indent}http2 on; # nginx 1.25.1 o superior (antes: «listen 443 ssl http2;»)`);
    } else {
        lines.push(`${indent}listen ${puerto};`);
        lines.push(`${indent}listen [::]:${puerto};`);
    }

    lines.push(`${indent}server_name ${dominio};`);
    lines.push("");

    // SSL
    if (cfg.ssl) {
        lines.push(`${indent}# SSL Configuration`);
        lines.push(`${indent}ssl_certificate ${cert};`);
        lines.push(`${indent}ssl_certificate_key ${clave};`);
        lines.push(`${indent}ssl_protocols TLSv1.2 TLSv1.3;`);
        lines.push(`${indent}ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';`);
        lines.push(`${indent}ssl_prefer_server_ciphers on;`);
        lines.push(`${indent}ssl_session_cache shared:SSL:10m;`);
        lines.push(`${indent}ssl_session_timeout 10m;`);
        lines.push("");
    }

    // Root
    if (!cfg.proxy) {
        lines.push(`${indent}root ${valor(cfg.root, DEFAULT.root)};`);
        lines.push(`${indent}index index.html index.htm;`);
        lines.push("");
    }

    // Security headers
    if (cfg.secHeaders) {
        lines.push(`${indent}# Security Headers (OWASP)`);
        lines.push(`${indent}add_header X-Frame-Options "SAMEORIGIN" always;`);
        lines.push(`${indent}add_header X-Content-Type-Options "nosniff" always;`);
        lines.push(`${indent}add_header Referrer-Policy "strict-origin-when-cross-origin" always;`);
        lines.push(`${indent}add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;`);
        // HSTS solo tiene sentido (y solo es válido) servido por HTTPS. «preload» queda fuera: es un compromiso aparte.
        if (cfg.ssl) lines.push(`${indent}add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;`);
        lines.push(`${indent}add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';" always;`);
        lines.push("");
    }

    // Gzip
    if (cfg.gzip) {
        lines.push(`${indent}# Gzip Compression`);
        lines.push(`${indent}gzip on;`);
        lines.push(`${indent}gzip_vary on;`);
        lines.push(`${indent}gzip_min_length 1024;`);
        lines.push(`${indent}gzip_proxied any;`);
        lines.push(`${indent}gzip_comp_level 6;`);
        lines.push(`${indent}gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;`);
        lines.push("");
    }

    // Rate limit
    if (cfg.rateLimit) {
        lines.push(`${indent}# Rate Limiting`);
        lines.push(`${indent}limit_req zone=general burst=20 nodelay;`);
        lines.push(`${indent}limit_req_status 429;`);
        lines.push("");
    }

    // Block bots
    if (cfg.blockBots) {
        lines.push(`${indent}# Block malicious bots`);
        lines.push(`${indent}if ($http_user_agent ~* "(BadBot|Scrapy|AhrefsBot|SemrushBot|MJ12bot|DotBot)") {`);
        lines.push(`${indent}${indent}return 403;`);
        lines.push(`${indent}}`);
        lines.push("");
    }

    // Main location
    if (cfg.proxy) {
        lines.push(`${indent}location / {`);
        lines.push(`${indent}${indent}proxy_pass ${proxyPass};`);
        lines.push(`${indent}${indent}proxy_http_version 1.1;`);
        lines.push(`${indent}${indent}proxy_set_header Upgrade $http_upgrade;`);
        lines.push(`${indent}${indent}proxy_set_header Connection $connection_upgrade;`);
        lines.push(`${indent}${indent}proxy_set_header Host $host;`);
        lines.push(`${indent}${indent}proxy_set_header X-Real-IP $remote_addr;`);
        lines.push(`${indent}${indent}proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`);
        lines.push(`${indent}${indent}proxy_set_header X-Forwarded-Proto $scheme;`);
        lines.push(`${indent}${indent}proxy_cache_bypass $http_upgrade;`);
        lines.push(`${indent}}`);
    } else {
        lines.push(`${indent}location / {`);
        lines.push(`${indent}${indent}try_files $uri $uri/ =404;`);
        lines.push(`${indent}}`);
    }
    lines.push("");

    // Static cache
    if (cfg.cacheStatic) {
        lines.push(`${indent}# Static assets caching`);
        lines.push(`${indent}location ~* \\.(jpg|jpeg|png|gif|ico|css|js|woff2|woff|ttf|svg|webp|avif)$ {`);
        // Sin add_header aquí: un add_header dentro del location anula los de seguridad del server. «expires» ya pone Cache-Control.
        lines.push(`${indent}${indent}expires 30d;`);
        lines.push(`${indent}${indent}access_log off;`);
        if (cfg.proxy) {
            // Con proxy los estáticos también vienen del backend (si no, este location los buscaría en disco y daría 404).
            lines.push(`${indent}${indent}proxy_pass ${proxyBase};`);
            lines.push(`${indent}${indent}proxy_set_header Host $host;`);
        }
        lines.push(`${indent}}`);
        lines.push("");
    }

    // Deny hidden files
    lines.push(`${indent}# Deny hidden files`);
    lines.push(`${indent}location ~ /\\. {`);
    lines.push(`${indent}${indent}deny all;`);
    lines.push(`${indent}${indent}access_log off;`);
    lines.push(`${indent}${indent}log_not_found off;`);
    lines.push(`${indent}}`);

    lines.push("}");

    return lines.join("\n");
}

function generateHtaccess(cfg: ServerBlock): string {
    const lines: string[] = [];

    lines.push("# Generated .htaccess Configuration");
    lines.push("");

    // Force HTTPS
    if (cfg.forceHttps) {
        lines.push("# Force HTTPS");
        lines.push("RewriteEngine On");
        lines.push("RewriteCond %{HTTPS} off");
        lines.push("RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]");
        lines.push("");
    }

    // Security headers
    if (cfg.secHeaders) {
        lines.push("# Security Headers (OWASP)");
        lines.push("<IfModule mod_headers.c>");
        lines.push('    Header always set X-Frame-Options "SAMEORIGIN"');
        lines.push('    Header always set X-Content-Type-Options "nosniff"');
        lines.push('    Header always set Referrer-Policy "strict-origin-when-cross-origin"');
        lines.push('    Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"');
        if (cfg.forceHttps) lines.push('    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains" env=HTTPS');
        lines.push("</IfModule>");
        lines.push("");
    }

    // Gzip
    if (cfg.gzip) {
        lines.push("# Gzip Compression");
        lines.push("<IfModule mod_deflate.c>");
        lines.push("    AddOutputFilterByType DEFLATE text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml");
        lines.push("</IfModule>");
        lines.push("");
    }

    // Cache static
    if (cfg.cacheStatic) {
        lines.push("# Browser Caching");
        lines.push("<IfModule mod_expires.c>");
        lines.push("    ExpiresActive On");
        lines.push('    ExpiresByType image/jpeg "access plus 1 month"');
        lines.push('    ExpiresByType image/png "access plus 1 month"');
        lines.push('    ExpiresByType image/webp "access plus 1 month"');
        lines.push('    ExpiresByType text/css "access plus 1 month"');
        lines.push('    ExpiresByType application/javascript "access plus 1 month"');
        lines.push("</IfModule>");
        lines.push("");
    }

    // Block bots
    if (cfg.blockBots) {
        lines.push("# Block malicious bots");
        lines.push("RewriteEngine On");
        lines.push('RewriteCond %{HTTP_USER_AGENT} "BadBot|Scrapy|AhrefsBot|SemrushBot|MJ12bot" [NC]');
        lines.push("RewriteRule .* - [F,L]");
        lines.push("");
    }

    // Deny hidden files
    lines.push("# Deny hidden files");
    lines.push("<FilesMatch \"^\\.\">"); 
    lines.push("    Order allow,deny");
    lines.push("    Deny from all");
    lines.push("</FilesMatch>");

    return lines.join("\n");
}

export default function NginxConfigPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("nginx");
    const [cfg, setCfg] = useState<ServerBlock>(DEFAULT);
    const [mode, setMode] = useState<"nginx" | "htaccess">("nginx");
    const { copiado, fallo, copiar } = useCopiar();

    const update = useCallback((patch: Partial<ServerBlock>) => {
        setCfg(prev => ({ ...prev, ...patch }));
    }, []);

    const output = useMemo(() => {
        return mode === "nginx" ? generateNginxConfig(cfg) : generateHtaccess(cfg);
    }, [cfg, mode]);

    const avisos = useMemo(() => avisosConfig(cfg, mode), [cfg, mode]);

    const handleDownload = useCallback(() => {
        descargarTexto(output, mode === "nginx" ? "nginx.conf" : ".htaccess");
    }, [output, mode]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Generador Nginx"} />;
    }

    return (
        <div className="tool-page">
            <main className="tool-main max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
                <ToolPageHeader slug="nginx" title={<>Generador de Configuración</>} description={<>Genera configuraciones seguras para Nginx y .htaccess</>} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Controls */}
                    <div className="space-y-4">
                        {/* Mode Toggle */}
                        <div className="flex gap-2 bg-white/5 rounded-xl p-2 border border-white/10">
                            {(["nginx", "htaccess"] as const).map(m => (
                                <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
                                    className={`flex-1 min-h-11 py-2 rounded-lg text-sm font-medium transition-all ${mode === m ? "text-white" : "text-neutral-400"}`}
                                    style={mode === m ? { background: `${ACCENT}20`, boxShadow: `0 0 0 1px ${ACCENT}` } : undefined}>
                                    {m === "nginx" ? "Nginx" : ".htaccess"}
                                </button>
                            ))}
                        </div>

                        {/* Basic Settings */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
                            <h3 className="text-sm font-semibold text-white">Configuración Básica</h3>

                            <label className="block">
                                <span className="text-xs text-neutral-400">Dominio</span>
                                <input type="text" value={cfg.serverName}
                                    onChange={e => update({ serverName: e.target.value })}
                                    className="w-full mt-1 bg-[#0F1724] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2"
                                    style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
                                    maxLength={253} spellCheck={false} />
                            </label>

                            {!cfg.proxy && mode === "nginx" && (
                                <label className="block">
                                    <span className="text-xs text-neutral-400">Root</span>
                                    <input type="text" value={cfg.root}
                                        onChange={e => update({ root: e.target.value })}
                                        className="w-full mt-1 bg-[#0F1724] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2"
                                        maxLength={512} spellCheck={false} />
                                </label>
                            )}

                            {mode === "nginx" && (
                                <Interruptor activo={cfg.proxy} alCambiar={(v) => update({ proxy: v })}>Reverse Proxy</Interruptor>
                            )}

                            {cfg.proxy && mode === "nginx" && (
                                <label className="block">
                                    <span className="text-xs text-neutral-400">Proxy Pass</span>
                                    <input type="text" value={cfg.proxyPass}
                                        onChange={e => update({ proxyPass: e.target.value })}
                                        className="w-full mt-1 bg-[#0F1724] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2"
                                        maxLength={512} spellCheck={false} />
                                </label>
                            )}
                        </div>

                        {/* SSL */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
                            <h3 className="text-sm font-semibold text-white">SSL / HTTPS</h3>

                            <Interruptor activo={cfg.ssl} alCambiar={(v) => update({ ssl: v })}>Habilitar SSL</Interruptor>

                            {cfg.ssl && (
                                <>
                                    <Interruptor activo={cfg.forceHttps} alCambiar={(v) => update({ forceHttps: v })}>Forzar HTTPS (301)</Interruptor>

                                    {mode === "nginx" && (
                                        <>
                                            <label className="block">
                                                <span className="text-xs text-neutral-400">Cert Path</span>
                                                <input type="text" value={cfg.certPath}
                                                    onChange={e => update({ certPath: e.target.value })}
                                                    className="w-full mt-1 bg-[#0F1724] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2"
                                                    maxLength={512} spellCheck={false} />
                                            </label>
                                            <label className="block">
                                                <span className="text-xs text-neutral-400">Key Path</span>
                                                <input type="text" value={cfg.keyPath}
                                                    onChange={e => update({ keyPath: e.target.value })}
                                                    className="w-full mt-1 bg-[#0F1724] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2"
                                                    maxLength={512} spellCheck={false} />
                                            </label>
                                        </>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Features */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
                            <h3 className="text-sm font-semibold text-white">Características</h3>

                            {([
                                { key: "gzip" as const, label: "Compresión Gzip" },
                                { key: "secHeaders" as const, label: "Headers de Seguridad (OWASP)" },
                                { key: "cacheStatic" as const, label: "Caché de archivos estáticos" },
                                { key: "blockBots" as const, label: "Bloquear bots maliciosos" },
                                { key: "rateLimit" as const, label: "Rate Limiting" },
                            ]).map(feat => (
                                <Interruptor key={feat.key} activo={cfg[feat.key]} alCambiar={(v) => update({ [feat.key]: v })}>{feat.label}</Interruptor>
                            ))}
                        </div>
                    </div>

                    {/* Output */}
                    <div className="space-y-4">
                        <div className="bg-[#0D1117] rounded-xl border border-white/10 overflow-hidden flex flex-col" style={{ maxHeight: "70vh" }}>
                            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                                <span className="text-xs font-mono text-neutral-400">
                                    {mode === "nginx" ? "nginx.conf" : ".htaccess"}
                                </span>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => void copiar(output, "config")}
                                        className="min-h-11 px-3 py-1 rounded-md text-xs font-medium text-white transition-colors"
                                        style={{ background: `${ACCENT}30` }}>
                                        {copiado === "config" ? "✓ Copiado" : fallo === "config" ? "No se pudo copiar" : "Copiar"}
                                    </button>
                                    <button type="button" onClick={handleDownload}
                                        className="min-h-11 px-3 py-1 rounded-md text-xs font-medium text-white transition-colors"
                                        style={{ background: `${ACCENT}30` }}>
                                        Descargar
                                    </button>
                                    <span role="status" className="sr-only">{copiado === "config" ? "Configuración copiada" : fallo === "config" ? "No se pudo copiar" : ""}</span>
                                </div>
                            </div>
                            <pre role="region" aria-label="Configuración generada" tabIndex={0} className="flex-1 overflow-auto p-4 text-xs font-mono text-green-300 whitespace-pre leading-relaxed">
                                {output}
                            </pre>
                        </div>

                        {avisos.length > 0 && (
                            <ul aria-label="Avisos sobre la configuración" className="space-y-1 text-xs text-amber-200">
                                {avisos.map(aviso => <li key={aviso}>{aviso}</li>)}
                            </ul>
                        )}

                        {/* Security Note */}
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                            <p className="text-xs text-amber-300">
                                <strong>⚠️ Nota de seguridad:</strong> Revisa siempre la configuración antes de usarla en producción. 
                                Ajusta los headers de Content-Security-Policy según las necesidades de tu aplicación. 
                                Las rutas de certificados SSL deben coincidir con tu servidor.
                            </p>
                        </div>
                    </div>
                </div>

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
