"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";

// Character sets
const CHARSETS = {
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    numbers: "0123456789",
    symbols: "!@#$%^&*",
    brackets: "()[]{}",
    special: "~`|\\:;\"'<>,./?\\_+-=",
};

// Real-world attack scenarios based on Hashcat benchmarks 2024
// Sources: hashcat.net forums, Tom's Hardware 2024, onlinehashcrack.com
const ATTACK_SCENARIOS = {
    online_throttled: {
        speed: 100,
        label: "Online (protegido)",
        icon: "🌐",
        desc: "Con captcha y rate-limiting",
        detail: "~100 intentos/seg",
    },
    online_api: {
        speed: 1000,
        label: "API sin protección",
        icon: "🔌",
        desc: "Endpoint vulnerable",
        detail: "~1,000 intentos/seg",
    },
    credential_stuffing: {
        speed: 1e5,
        label: "Credential Stuffing",
        icon: "🤖",
        desc: "Botnets con listas filtradas",
        detail: "~100K intentos/seg",
    },
    bcrypt_gpu: {
        speed: 184000, // 184 kH/s per RTX 4090 (bcrypt cost 5)
        label: "Bcrypt (GPU)",
        icon: "🔐",
        desc: "Hash moderno con salt",
        detail: "~184K H/s (RTX 4090)",
        isSecure: true,
    },
    sha256_gpu: {
        speed: 21.6e9, // 21.6 GH/s per RTX 4090 
        label: "SHA-256 (GPU)",
        icon: "🎮",
        desc: "Hash sin salt",
        detail: "~21.6 GH/s (RTX 4090)",
    },
    md5_gpu: {
        speed: 164e9, // 164 GH/s per RTX 4090
        label: "MD5 (GPU)",
        icon: "⚡",
        desc: "Hash débil/legacy",
        detail: "~164 GH/s (RTX 4090)",
    },
    gpu_cluster: {
        speed: 164e9 * 12,
        label: "Cluster 12x GPUs",
        icon: "🖥️",
        desc: "Rig profesional MD5",
        detail: "~2 TH/s (12x 4090)",
    },
    nation_state: {
        speed: 1e18,
        label: "Estado-Nación",
        icon: "🏛️",
        desc: "Recursos ilimitados",
        detail: "~1 EH/s estimado",
    },
    quantum_grover: {
        speed: 0,
        label: "Cuántico (Grover)",
        icon: "⚛️",
        desc: "Algoritmo √n (NIST PQC)",
        detail: "Entropía efectiva ÷ 2",
        isQuantum: true,
    },
};

type AttackKey = keyof typeof ATTACK_SCENARIOS;

export default function PasswordGeneratorPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("claves");
    const [password, setPassword] = useState("");
    const [length, setLength] = useState(20);
    const [copied, setCopied] = useState(false);
    const [showPassword, setShowPassword] = useState(true);
    const [showTips, setShowTips] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showGlossary, setShowGlossary] = useState(false);
    const tipsRef = useRef<HTMLDivElement>(null);
    const glossaryRef = useRef<HTMLDivElement>(null);

    const [includeLowercase, setIncludeLowercase] = useState(true);
    const [includeUppercase, setIncludeUppercase] = useState(true);
    const [includeNumbers, setIncludeNumbers] = useState(true);
    const [includeSymbols, setIncludeSymbols] = useState(true);
    const [includeBrackets, setIncludeBrackets] = useState(false);
    const [includeSpecial, setIncludeSpecial] = useState(false);
    const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);

    const [attackScenario, setAttackScenario] = useState<AttackKey>("md5_gpu");

    const charset = useMemo(() => {
        let chars = "";
        if (includeLowercase) chars += CHARSETS.lowercase;
        if (includeUppercase) chars += CHARSETS.uppercase;
        if (includeNumbers) chars += CHARSETS.numbers;
        if (includeSymbols) chars += CHARSETS.symbols;
        if (includeBrackets) chars += CHARSETS.brackets;
        if (includeSpecial) chars += CHARSETS.special;
        if (excludeAmbiguous) chars = chars.replace(/[l1IO0oO]/g, "");
        return [...new Set(chars.split(""))].join("");
    }, [includeLowercase, includeUppercase, includeNumbers, includeSymbols, includeBrackets, includeSpecial, excludeAmbiguous]);

    const entropy = useMemo(() => {
        if (charset.length === 0) return 0;
        return length * Math.log2(charset.length);
    }, [length, charset]);

    const crackTime = useMemo(() => {
        if (entropy === 0) return { seconds: 0, display: "Instantáneo" };

        const scenario = ATTACK_SCENARIOS[attackScenario];

        if ('isQuantum' in scenario && scenario.isQuantum) {
            // Grover's algorithm: reduces search space to √n (entropy/2 bits effective)
            // Reference: NIST PQC, Grover 1996
            const effectiveEntropy = entropy / 2;
            const combinations = Math.pow(2, effectiveEntropy);
            // Assuming future quantum computer at 1 GHz
            const seconds = combinations / 1e9 / 2;
            return { seconds, display: formatTime(seconds) };
        }

        const combinations = Math.pow(2, entropy);
        const seconds = combinations / scenario.speed / 2;
        return { seconds, display: formatTime(seconds) };
    }, [entropy, attackScenario]);

    function formatTime(seconds: number): string {
        if (!isFinite(seconds) || seconds > 1e50) return "∞ (Prácticamente imposible)";
        if (seconds < 0.001) return "< 1 milisegundo";
        if (seconds < 1) return `${(seconds * 1000).toFixed(0)} ms`;
        if (seconds < 60) return `${seconds.toFixed(1)} segundos`;
        if (seconds < 3600) return `${(seconds / 60).toFixed(0)} minutos`;
        if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} horas`;
        if (seconds < 86400 * 30) return `${(seconds / 86400).toFixed(0)} días`;
        if (seconds < 86400 * 365) return `${(seconds / 86400 / 30).toFixed(1)} meses`;

        const years = seconds / 86400 / 365;
        if (years < 100) return `${years.toFixed(0)} años`;
        if (years < 1e3) return `${(years / 100).toFixed(0)} siglos`;
        if (years < 1e6) return `${(years / 1e3).toFixed(1)} milenios`;
        if (years < 1e9) return `${(years / 1e6).toFixed(1)} millones de años`;

        const universeAge = 1.38e10;
        if (years < universeAge) return `${(years / 1e9).toFixed(1)} billones de años`;
        if (years < universeAge * 100) return `${(years / universeAge).toFixed(0)}× edad del universo`;
        if (years < universeAge * 1e6) return `${(years / universeAge / 1e3).toFixed(0)} mil × edad universo`;
        if (years < universeAge * 1e12) return `${(years / universeAge / 1e6).toFixed(0)} M × edad universo`;
        if (years < 1e34) return `${(years / universeAge / 1e9).toFixed(0)} B × edad universo`;
        if (years < 1e100) return `Después de la desintegración de protones`;
        return "Más allá de la muerte térmica del universo";
    }

    // Professional security levels based on NIST SP 800-131A and industry standards
    // Reference: NIST PQC Categories, OWASP Password Guidelines
    const securityLevel = useMemo(() => {
        // NIST minimum: 112 bits for classical security
        // NIST PQC: 256 bits provides 128 bits of quantum-resistant security
        if (entropy < 28) return { label: "Crítica", color: "#DC2626", tip: "Vulnerable a ataques básicos" };
        if (entropy < 40) return { label: "Débil", color: "#F97316", tip: "Insuficiente para cuentas importantes" };
        if (entropy < 60) return { label: "Aceptable", color: "#EAB308", tip: "Mínimo para uso general" };
        if (entropy < 80) return { label: "Fuerte", color: "#22C55E", tip: "Recomendado para la mayoría de usos" };
        if (entropy < 112) return { label: "Muy fuerte", color: "#10B981", tip: "Supera el mínimo NIST (112 bits)" };
        if (entropy < 128) return { label: "Excelente", color: "#06B6D4", tip: "Nivel AES-128, estándar empresarial" };
        if (entropy < 192) return { label: "Superior", color: "#8B5CF6", tip: "Nivel AES-192, alta seguridad" };
        if (entropy < 256) return { label: "Máxima", color: "#EC4899", tip: "Nivel AES-256, estándar gubernamental" };
        // 256+ bits: provides 128 bits quantum-resistant (Grover reduces by √n)
        return { label: "Excepcional", color: "#F43F5E", tip: "256+ bits (128 bits efectivos post-cuánticos según NIST PQC)" };
    }, [entropy]);

    const generatePassword = useCallback(() => {
        if (charset.length === 0) { setPassword(""); return; }
        const array = new Uint32Array(length);
        crypto.getRandomValues(array);
        setPassword([...array].map(n => charset[n % charset.length]).join(""));
    }, [length, charset]);

    useEffect(() => { generatePassword(); }, [generatePassword]);

    const handleCopy = () => {
        navigator.clipboard.writeText(password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Generador de Claves"} />;
    }

    const currentScenario = ATTACK_SCENARIOS[attackScenario];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30 mb-3">
                        <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Generador de Contraseñas</h1>
                    <p className="text-neutral-500 text-sm">Criptográficamente seguro • Análisis basado en benchmarks reales</p>
                </div>

                {/* Password Display */}
                <div className="bg-[#0a0e17] rounded-2xl p-4 sm:p-5 border border-white/10 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="font-mono text-base sm:text-lg text-white break-all flex-1 select-all bg-black/40 rounded-lg p-3 min-h-[52px]" style={{ wordBreak: "break-all" }}>
                            {showPassword ? password : "•".repeat(password.length)}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <button onClick={() => setShowPassword(!showPassword)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors" title={showPassword ? "Ocultar" : "Mostrar"}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPassword ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} /></svg>
                            </button>
                            <button onClick={handleCopy} className={`p-2 rounded-lg transition-colors ${copied ? "bg-green-500/20 text-green-400" : "bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white"}`} title="Copiar">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={copied ? "M5 13l4 4L19 7" : "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"} /></svg>
                            </button>
                            <button onClick={generatePassword} className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors" title="Regenerar">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((entropy / 128) * 100, 100)}%`, background: securityLevel.color }} />
                        </div>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: `${securityLevel.color}15`, color: securityLevel.color }}>{securityLevel.label}</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-2">{length} chars • {charset.length} pool • <span className="text-white font-medium">{entropy.toFixed(0)} bits</span> • {securityLevel.tip}</p>
                </div>

                {/* Configuration */}
                <div className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10 mb-4">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-neutral-300">Longitud</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setLength(Math.max(8, length - 4))} className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white text-sm">−</button>
                            <span className="w-8 text-center font-bold text-green-400">{length}</span>
                            <button onClick={() => setLength(Math.min(128, length + 4))} className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white text-sm">+</button>
                        </div>
                    </div>
                    <input type="range" min="8" max="128" value={length} onChange={(e) => setLength(parseInt(e.target.value))} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-green-500 mb-4" />

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-3">
                        {[
                            { s: includeLowercase, set: setIncludeLowercase, l: "a-z" },
                            { s: includeUppercase, set: setIncludeUppercase, l: "A-Z" },
                            { s: includeNumbers, set: setIncludeNumbers, l: "0-9" },
                            { s: includeSymbols, set: setIncludeSymbols, l: "!@#" },
                            { s: includeBrackets, set: setIncludeBrackets, l: "()[]{" },
                            { s: includeSpecial, set: setIncludeSpecial, l: "~;:" },
                        ].map((o) => (
                            <button key={o.l} onClick={() => o.set(!o.s)} className={`py-2 rounded-lg text-xs font-mono transition-all ${o.s ? "bg-green-500/20 border border-green-500/40 text-green-400" : "bg-white/5 border border-white/10 text-neutral-500 hover:bg-white/10"}`}>{o.l}</button>
                        ))}
                    </div>

                    <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs text-neutral-500 hover:text-white flex items-center gap-1 mb-2">
                        <svg className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        Avanzado
                    </button>
                    {showAdvanced && (
                        <label className="flex items-center gap-2 text-xs text-neutral-400 mb-3">
                            <input type="checkbox" checked={excludeAmbiguous} onChange={(e) => setExcludeAmbiguous(e.target.checked)} className="w-3.5 h-3.5 rounded bg-white/10 text-green-500" />
                            Excluir ambiguos (l, 1, I, O, 0)
                        </label>
                    )}

                    <button onClick={generatePassword} disabled={charset.length === 0} className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-green-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Generar Nueva
                    </button>
                </div>

                {/* Attack Resistance */}
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/10 overflow-hidden mb-4">
                    <div className="p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center text-xs">⏱️</span>
                                Tiempo para descifrar
                            </h3>
                            <a href="https://hashcat.net/wiki/" target="_blank" rel="noopener noreferrer" className="text-[10px] text-neutral-500 hover:text-white">Hashcat 2024 →</a>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mb-4">
                            {(Object.entries(ATTACK_SCENARIOS) as [AttackKey, typeof ATTACK_SCENARIOS[AttackKey]][]).slice(0, 9).map(([key, s]) => (
                                <button key={key} onClick={() => setAttackScenario(key)} className={`p-2 rounded-lg text-left transition-all ${attackScenario === key ? "bg-orange-500/20 border-orange-500/50 ring-1 ring-orange-500/30" : "bg-white/5 border-white/10 hover:bg-white/10"} border`}>
                                    <div className="text-sm mb-0.5">{s.icon}</div>
                                    <div className={`text-[9px] font-medium leading-tight ${attackScenario === key ? "text-orange-400" : "text-neutral-400"}`}>{s.label}</div>
                                </button>
                            ))}
                        </div>

                        <div className="bg-black/30 rounded-xl p-4 text-center">
                            <div className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: securityLevel.color }}>{crackTime.display}</div>
                            <p className="text-xs text-neutral-500">{currentScenario.desc} • {currentScenario.detail}</p>

                            {'isQuantum' in currentScenario && currentScenario.isQuantum && (
                                <div className="mt-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-left">
                                    <p className="text-[10px] text-purple-300 leading-relaxed">
                                        <strong>Algoritmo de Grover (1996):</strong> Reduce la complejidad de búsqueda de O(N) a O(√N).
                                        Tu entropía efectiva post-cuántica: <strong>{(entropy / 2).toFixed(0)} bits</strong>.
                                        <br /><span className="text-purple-400">Ref: NIST SP 800-131A, PQC Categories</span>
                                    </p>
                                </div>
                            )}
                            {'isSecure' in currentScenario && currentScenario.isSecure && (
                                <p className="text-[10px] text-green-400 mt-2 bg-green-500/10 rounded-lg p-2">
                                    🔐 Bcrypt es una función memory-hard diseñada para resistir ataques GPU/ASIC
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Security Tips with smooth animation */}
                <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                    <button onClick={() => setShowTips(!showTips)} className="w-full p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-sm">💡</span>
                            <div className="text-left">
                                <div className="text-white font-medium text-sm">Mejores prácticas de seguridad</div>
                                <div className="text-[11px] text-neutral-500">Recomendaciones profesionales</div>
                            </div>
                        </div>
                        <svg className={`w-4 h-4 text-neutral-400 transition-transform duration-300 ${showTips ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    {/* Animated container */}
                    <div
                        ref={tipsRef}
                        className="overflow-hidden transition-all duration-300 ease-out"
                        style={{
                            maxHeight: showTips ? tipsRef.current?.scrollHeight ? `${tipsRef.current.scrollHeight + 100}px` : '1000px' : '0px',
                            opacity: showTips ? 1 : 0,
                        }}
                    >
                        <div className="px-4 pb-4 grid gap-2 text-xs">
                            {[
                                { icon: "🔄", title: "Rotación periódica", desc: "Cambia contraseñas críticas cada 90 días. Configura recordatorios en tu calendario." },
                                { icon: "📲", title: "2FA con apps dedicadas", desc: "Usa Authy, Google Authenticator o llaves FIDO2/WebAuthn. Evita SMS (vulnerable a SIM swapping)." },
                                { icon: "🔐", title: "Gestor de contraseñas", desc: "KeePass (offline, open-source), Bitwarden, o 1Password con cifrado AES-256. Nunca guardes en navegadores." },
                                { icon: "🚨", title: "Monitorea filtraciones", desc: "Registra tu email en HaveIBeenPwned.com, activa alertas en Google One o Firefox Monitor para breaches." },
                                { icon: "🚫", title: "Una por servicio", desc: "Nunca reutilices. Los ataques de credential stuffing usan bases de datos filtradas para probar en múltiples sitios." },
                                { icon: "🎯", title: "Verifica URLs", desc: "Revisa el dominio completo antes de ingresar credenciales. Los ataques de phishing clonan sitios con URLs similares." },
                            ].map((t) => (
                                <div key={t.title} className="flex gap-2 p-2.5 rounded-lg bg-white/5">
                                    <span className="text-sm flex-shrink-0">{t.icon}</span>
                                    <div><span className="text-white font-medium">{t.title}:</span> <span className="text-neutral-400">{t.desc}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Glossary Section */}
                <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden mt-4">
                    <button onClick={() => setShowGlossary(!showGlossary)} className="w-full p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm">📖</span>
                            <div className="text-left">
                                <div className="text-white font-medium text-sm">Glosario de términos</div>
                                <div className="text-[11px] text-neutral-500">Explicación de conceptos técnicos</div>
                            </div>
                        </div>
                        <svg className={`w-4 h-4 text-neutral-400 transition-transform duration-300 ${showGlossary ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    <div
                        ref={glossaryRef}
                        className="overflow-hidden transition-all duration-300 ease-out"
                        style={{ maxHeight: showGlossary ? '2000px' : '0px', opacity: showGlossary ? 1 : 0 }}
                    >
                        <div className="px-4 pb-4 space-y-3 text-xs">
                            {/* Brute force explanation */}
                            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <p className="text-amber-300 font-medium mb-1">⚠️ Sobre los tiempos de crackeo</p>
                                <p className="text-neutral-400 leading-relaxed">
                                    Los tiempos mostrados asumen <strong className="text-white">fuerza bruta pura</strong>: probar cada combinación posible contra un hash robado.
                                    Los ataques de <strong className="text-white">diccionario</strong> son más rápidos pero <strong className="text-amber-300">no aplican a contraseñas aleatorias</strong>.
                                    Sin embargo, una contraseña fuerte <strong className="text-red-400">NO protege contra otros vectores de ataque</strong> (ver abajo).
                                </p>
                            </div>

                            {/* Other attack vectors - IMPORTANT */}
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                <p className="text-red-400 font-medium mb-2">🚨 Otros vectores de ataque (tu contraseña NO te protege)</p>
                                <div className="space-y-2 text-neutral-400">
                                    <div><strong className="text-red-300">Nivel Usuario:</strong></div>
                                    <ul className="list-disc list-inside space-y-1 ml-2">
                                        <li><strong className="text-white">Phishing</strong> — Sitios clonados que capturan credenciales</li>
                                        <li><strong className="text-white">Keyloggers/Malware</strong> — Software que registra todo lo que tecleas</li>
                                        <li><strong className="text-white">Ingeniería social</strong> — Manipulación para revelar datos</li>
                                        <li><strong className="text-white">Shoulder surfing</strong> — Observación física de tu pantalla</li>
                                    </ul>

                                    <div className="pt-2"><strong className="text-orange-300">Nivel Aplicación/Frontend:</strong></div>
                                    <ul className="list-disc list-inside space-y-1 ml-2">
                                        <li><strong className="text-white">XSS (Cross-Site Scripting)</strong> — Inyección de scripts maliciosos</li>
                                        <li><strong className="text-white">CSRF</strong> — Peticiones falsificadas desde otro sitio</li>
                                        <li><strong className="text-white">Session Hijacking</strong> — Robo de cookies de sesión</li>
                                        <li><strong className="text-white">Man-in-the-Middle</strong> — Intercepción de comunicaciones</li>
                                    </ul>

                                    <div className="pt-2"><strong className="text-purple-300">Nivel Servidor/Base de datos:</strong></div>
                                    <ul className="list-disc list-inside space-y-1 ml-2">
                                        <li><strong className="text-white">SQL Injection</strong> — Acceso directo a la base de datos</li>
                                        <li><strong className="text-white">Data Breaches</strong> — Filtraciones masivas de datos</li>
                                        <li><strong className="text-white">Insecure storage</strong> — Contraseñas en texto plano o hash débil</li>
                                        <li><strong className="text-white">Server misconfiguration</strong> — Puertos abiertos, permisos incorrectos</li>
                                    </ul>
                                </div>
                                <p className="text-neutral-500 mt-2 text-[10px]">
                                    Por eso es crucial: 2FA, verificar URLs, usar HTTPS, mantener software actualizado, y confiar solo en servicios con buenas prácticas.
                                </p>
                            </div>

                            {/* Terms */}
                            {[
                                { term: "Entropía (bits)", def: "Medida de aleatoriedad. Fórmula: log₂(pool^longitud). Más bits = más combinaciones posibles = más seguro. 128 bits es el estándar AES." },
                                { term: "Pool (caracteres)", def: "Conjunto de caracteres posibles para cada posición. Con a-z, A-Z, 0-9 y símbolos tienes ~95 caracteres en el pool." },
                                { term: "Bits efectivos post-cuánticos", def: "Seguridad real contra computadoras cuánticas. El algoritmo de Grover reduce la entropía a la mitad. 256 bits clásicos = 128 bits cuánticos." },
                                { term: "Algoritmo de Grover (√n)", def: "Propuesto en 1996 por Lov Grover. Reduce búsqueda de O(N) a O(√N). Ejemplo: 2^128 combinaciones se reducen a 2^64 operaciones cuánticas." },
                                { term: "NIST PQC", def: "Post-Quantum Cryptography del NIST (Instituto Nacional de Estándares de EE.UU.). Define estándares para criptografía resistente a computadoras cuánticas." },
                                { term: "Hashcat", def: "Herramienta de código abierto para recuperación de contraseñas. Los benchmarks usados aquí provienen de pruebas reales con GPUs RTX 4090." },
                                { term: "Bcrypt", def: "Función hash diseñada para ser lenta y resistente a GPUs. Usa 'cost factor' para aumentar dificultad. Preferido para almacenar contraseñas." },
                                { term: "Phishing", def: "Ataque de ingeniería social donde se clona un sitio web legítimo para robar credenciales. Siempre verifica la URL antes de ingresar datos." },
                                { term: "Credential Stuffing", def: "Ataque automatizado que usa credenciales filtradas de un servicio para probar en otros. Por eso nunca debes reutilizar contraseñas." },
                                { term: "SIM Swapping", def: "Ataque donde un atacante convence a tu operador telefónico de transferir tu número a su SIM. Permite interceptar códigos SMS de 2FA." },
                            ].map((g) => (
                                <div key={g.term} className="flex gap-2">
                                    <span className="text-purple-400 font-medium min-w-[140px] sm:min-w-[180px]">{g.term}:</span>
                                    <span className="text-neutral-400">{g.def}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sources Section */}
                <div className="bg-white/5 rounded-2xl border border-white/10 p-4 mt-4">
                    <h4 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-xs">📚</span>
                        Fuentes y referencias
                    </h4>
                    <div className="grid gap-2 text-xs">
                        {[
                            { name: "NIST SP 800-131A Rev 2", url: "https://csrc.nist.gov/publications/detail/sp/800-131a/rev-2/final", desc: "Guía de transición criptográfica" },
                            { name: "NIST Post-Quantum Cryptography", url: "https://csrc.nist.gov/Projects/post-quantum-cryptography", desc: "Estándares PQC oficiales" },
                            { name: "Grover's Algorithm (1996)", url: "https://arxiv.org/abs/quant-ph/9605043", desc: "Paper original de Lov Grover" },
                            { name: "Hashcat Benchmarks", url: "https://hashcat.net/wiki/", desc: "Velocidades reales de crackeo por GPU" },
                            { name: "OWASP Password Guidelines", url: "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html", desc: "Mejores prácticas de la industria" },
                            { name: "Have I Been Pwned", url: "https://haveibeenpwned.com/", desc: "Verificador de filtraciones de datos" },
                        ].map((s) => (
                            <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
                                <div>
                                    <span className="text-cyan-400 group-hover:text-cyan-300">{s.name}</span>
                                    <span className="text-neutral-500 ml-2">— {s.desc}</span>
                                </div>
                                <svg className="w-3 h-3 text-neutral-500 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                        ))}
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <Link href="/herramientas" className="text-xs text-neutral-500 hover:text-white">← Volver a herramientas</Link>
                </div>
            </main>
        </div>
    );
}
