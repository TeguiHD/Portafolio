"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";

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

function generateNginxConfig(cfg: ServerBlock): string {
    const lines: string[] = [];
    const indent = "    ";

    // Rate limit zone (if enabled)
    if (cfg.rateLimit) {
        lines.push("# Rate limiting zone");
        lines.push("limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;");
        lines.push("");
    }

    // Force HTTPS redirect block
    if (cfg.forceHttps && cfg.ssl) {
        lines.push("server {");
        lines.push(`${indent}listen 80;`);
        lines.push(`${indent}listen [::]:80;`);
        lines.push(`${indent}server_name ${sanitize(cfg.serverName)};`);
        lines.push(`${indent}return 301 https://$host$request_uri;`);
        lines.push("}");
        lines.push("");
    }

    lines.push("server {");

    // Listen
    if (cfg.ssl) {
        lines.push(`${indent}listen 443 ssl http2;`);
        lines.push(`${indent}listen [::]:443 ssl http2;`);
    } else {
        lines.push(`${indent}listen ${sanitize(cfg.listen)};`);
        lines.push(`${indent}listen [::]:${sanitize(cfg.listen)};`);
    }

    lines.push(`${indent}server_name ${sanitize(cfg.serverName)};`);
    lines.push("");

    // SSL
    if (cfg.ssl) {
        lines.push(`${indent}# SSL Configuration`);
        lines.push(`${indent}ssl_certificate ${sanitize(cfg.certPath)};`);
        lines.push(`${indent}ssl_certificate_key ${sanitize(cfg.keyPath)};`);
        lines.push(`${indent}ssl_protocols TLSv1.2 TLSv1.3;`);
        lines.push(`${indent}ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';`);
        lines.push(`${indent}ssl_prefer_server_ciphers on;`);
        lines.push(`${indent}ssl_session_cache shared:SSL:10m;`);
        lines.push(`${indent}ssl_session_timeout 10m;`);
        lines.push("");
    }

    // Root
    if (!cfg.proxy) {
        lines.push(`${indent}root ${sanitize(cfg.root)};`);
        lines.push(`${indent}index index.html index.htm;`);
        lines.push("");
    }

    // Security headers
    if (cfg.secHeaders) {
        lines.push(`${indent}# Security Headers (OWASP)`);
        lines.push(`${indent}add_header X-Frame-Options "SAMEORIGIN" always;`);
        lines.push(`${indent}add_header X-Content-Type-Options "nosniff" always;`);
        lines.push(`${indent}add_header X-XSS-Protection "1; mode=block" always;`);
        lines.push(`${indent}add_header Referrer-Policy "strict-origin-when-cross-origin" always;`);
        lines.push(`${indent}add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;`);
        lines.push(`${indent}add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;`);
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
        lines.push(`${indent}${indent}proxy_pass ${sanitize(cfg.proxyPass)};`);
        lines.push(`${indent}${indent}proxy_http_version 1.1;`);
        lines.push(`${indent}${indent}proxy_set_header Upgrade $http_upgrade;`);
        lines.push(`${indent}${indent}proxy_set_header Connection 'upgrade';`);
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
        lines.push(`${indent}location ~* \\.(jpg|jpeg|png|gif|ico|css|js|woff2|woff|ttf|svg|webp)$ {`);
        lines.push(`${indent}${indent}expires 30d;`);
        lines.push(`${indent}${indent}add_header Cache-Control "public, immutable";`);
        lines.push(`${indent}${indent}access_log off;`);
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
        lines.push('    Header always set X-XSS-Protection "1; mode=block"');
        lines.push('    Header always set Referrer-Policy "strict-origin-when-cross-origin"');
        lines.push('    Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"');
        lines.push('    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"');
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
    const [copied, setCopied] = useState(false);

    const update = useCallback((patch: Partial<ServerBlock>) => {
        setCfg(prev => ({ ...prev, ...patch }));
    }, []);

    const output = useMemo(() => {
        return mode === "nginx" ? generateNginxConfig(cfg) : generateHtaccess(cfg);
    }, [cfg, mode]);

    const handleCopy = useCallback(async () => {
        await navigator.clipboard.writeText(output);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [output]);

    const handleDownload = useCallback(() => {
        const filename = mode === "nginx" ? "nginx.conf" : ".htaccess";
        const blob = new Blob([output], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
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
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Generador de Configuración</h1>
                    <p className="text-neutral-400 text-sm sm:text-base">
                        Genera configuraciones seguras para Nginx y .htaccess
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Controls */}
                    <div className="space-y-4">
                        {/* Mode Toggle */}
                        <div className="flex gap-2 bg-white/5 rounded-xl p-2 border border-white/10">
                            {(["nginx", "htaccess"] as const).map(m => (
                                <button key={m} onClick={() => setMode(m)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === m ? "text-white" : "text-neutral-400"}`}
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
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`relative w-10 h-5 rounded-full transition-colors ${cfg.proxy ? "" : "bg-white/10"}`}
                                        style={cfg.proxy ? { background: ACCENT } : undefined}>
                                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${cfg.proxy ? "translate-x-5" : "translate-x-0.5"}`} />
                                    </div>
                                    <span className="text-sm text-neutral-300">Reverse Proxy</span>
                                </label>
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

                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className={`relative w-10 h-5 rounded-full transition-colors ${cfg.ssl ? "" : "bg-white/10"}`}
                                    style={cfg.ssl ? { background: ACCENT } : undefined}>
                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${cfg.ssl ? "translate-x-5" : "translate-x-0.5"}`} />
                                </div>
                                <span className="text-sm text-neutral-300">Habilitar SSL</span>
                            </label>

                            {cfg.ssl && (
                                <>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className={`relative w-10 h-5 rounded-full transition-colors ${cfg.forceHttps ? "" : "bg-white/10"}`}
                                            style={cfg.forceHttps ? { background: ACCENT } : undefined}>
                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${cfg.forceHttps ? "translate-x-5" : "translate-x-0.5"}`} />
                                        </div>
                                        <span className="text-sm text-neutral-300">Forzar HTTPS (301)</span>
                                    </label>

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
                                <label key={feat.key} className="flex items-center gap-3 cursor-pointer"
                                    onClick={() => update({ [feat.key]: !cfg[feat.key] })}>
                                    <div className={`relative w-10 h-5 rounded-full transition-colors ${cfg[feat.key] ? "" : "bg-white/10"}`}
                                        style={cfg[feat.key] ? { background: ACCENT } : undefined}>
                                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${cfg[feat.key] ? "translate-x-5" : "translate-x-0.5"}`} />
                                    </div>
                                    <span className="text-sm text-neutral-300">{feat.label}</span>
                                </label>
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
                                    <button onClick={handleCopy}
                                        className="px-3 py-1 rounded-md text-xs font-medium text-white transition-colors"
                                        style={{ background: `${ACCENT}30` }}>
                                        {copied ? "✓ Copiado" : "Copiar"}
                                    </button>
                                    <button onClick={handleDownload}
                                        className="px-3 py-1 rounded-md text-xs font-medium text-white transition-colors"
                                        style={{ background: `${ACCENT}30` }}>
                                        Descargar
                                    </button>
                                </div>
                            </div>
                            <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-green-300 whitespace-pre leading-relaxed">
                                {output}
                            </pre>
                        </div>

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
