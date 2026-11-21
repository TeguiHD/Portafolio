"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";
import { useCopiar } from "@/lib/tools/copiar";
import {
    GRUPOS_CLAVE, type GrupoClave, gruposElegidos, generarClave, entropiaClave,
    SEPARADORES_FRASE, generarFrase, entropiaFrase, TOTAL_PALABRAS, BITS_POR_PALABRA,
    log10SegundosPromedio, tiempoLegible,
} from "@/lib/tools/claves";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";

const GRUPOS: { id: GrupoClave; etiqueta: string; nombre: string }[] = [
    { id: "lowercase", etiqueta: "a-z", nombre: "Minúsculas a-z" },
    { id: "uppercase", etiqueta: "A-Z", nombre: "Mayúsculas A-Z" },
    { id: "numbers", etiqueta: "0-9", nombre: "Números 0-9" },
    { id: "symbols", etiqueta: "!@#", nombre: `Símbolos ${GRUPOS_CLAVE.symbols}` },
    { id: "brackets", etiqueta: "()[]{", nombre: "Paréntesis, corchetes y llaves" },
    { id: "special", etiqueta: "~;:", nombre: "Otros signos de puntuación" },
];

const LARGO_MIN = 8;
const LARGO_MAX = 128;
const PALABRAS_MIN = 3;
const PALABRAS_MAX = 12;
const entero = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 });

// Real-world attack scenarios based on Hashcat benchmarks 2024
// Sources: hashcat.net forums, Tom's Hardware 2024, onlinehashcrack.com
const ATTACK_SCENARIOS = {
    online_throttled: {
        speed: 100,
        label: "En línea (protegido)",
        icon: "🌐",
        desc: "Con captcha y límite de intentos",
        detail: "~100 intentos/s",
    },
    online_api: {
        speed: 1000,
        label: "API sin protección",
        icon: "🔌",
        desc: "Servicio sin límite de intentos",
        detail: "~1.000 intentos/s",
    },
    credential_stuffing: {
        speed: 1e5,
        label: "Botnet",
        icon: "🤖",
        desc: "Muchos equipos probando contra un servicio",
        detail: "~100 mil intentos/s",
    },
    bcrypt_gpu: {
        speed: 184000, // 184 kH/s per RTX 4090 (bcrypt cost 5)
        label: "Bcrypt (GPU)",
        icon: "🔐",
        desc: "Hash lento con sal",
        detail: "~184 mil H/s con costo 5 (RTX 4090)",
        isSecure: true,
    },
    sha256_gpu: {
        speed: 21.6e9, // 21.6 GH/s per RTX 4090
        label: "SHA-256 (GPU)",
        icon: "🎮",
        desc: "Hash rápido sin sal",
        detail: "~21,6 GH/s (RTX 4090)",
    },
    md5_gpu: {
        speed: 164e9, // 164 GH/s per RTX 4090
        label: "MD5 (GPU)",
        icon: "⚡",
        desc: "Hash débil y antiguo",
        detail: "~164 GH/s (RTX 4090)",
    },
    gpu_cluster: {
        speed: 164e9 * 12,
        label: "12 GPU",
        icon: "🖥️",
        desc: "Equipo profesional contra MD5",
        detail: "~2 TH/s (12 RTX 4090)",
    },
    nation_state: {
        speed: 1e18,
        label: "Estado-nación",
        icon: "🏛️",
        desc: "Estimación gruesa, sin respaldo público",
        detail: "~1 EH/s supuesto",
    },
    quantum_grover: {
        speed: 0,
        label: "Cuántico (Grover)",
        icon: "⚛️",
        desc: "Computador cuántico hipotético a 10⁹ pasos/s",
        detail: "Entropía efectiva ÷ 2",
        isQuantum: true,
    },
};

type AttackKey = keyof typeof ATTACK_SCENARIOS;
type Modo = "caracteres" | "palabras";

const iconButton = "flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors";

export default function PasswordGeneratorPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("claves");
    const [modo, setModo] = useState<Modo>("caracteres");
    const [password, setPassword] = useState("");
    const [length, setLength] = useState(20);
    const [showPassword, setShowPassword] = useState(true);
    const [showTips, setShowTips] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showGlossary, setShowGlossary] = useState(false);
    const [activos, setActivos] = useState<Record<GrupoClave, boolean>>({ lowercase: true, uppercase: true, numbers: true, symbols: true, brackets: false, special: false });
    const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
    const [numPalabras, setNumPalabras] = useState(6);
    const [separador, setSeparador] = useState<string>("-");
    const [mayuscula, setMayuscula] = useState(true);
    const [conNumero, setConNumero] = useState(true);
    const [attackScenario, setAttackScenario] = useState<AttackKey>("md5_gpu");
    const { copiado, fallo, copiar } = useCopiar();

    const grupos = useMemo(() => gruposElegidos(activos, excludeAmbiguous), [activos, excludeAmbiguous]);
    const charsetSize = useMemo(() => grupos.reduce((total, g) => total + g.length, 0), [grupos]);
    const sinGrupos = modo === "caracteres" && grupos.length === 0;

    const entropy = useMemo(() => modo === "palabras"
        ? entropiaFrase({ palabras: numPalabras, numero: conNumero })
        : entropiaClave(grupos, length),
    [modo, numPalabras, conNumero, grupos, length]);

    const crackTime = useMemo(() => {
        if (entropy === 0) return { texto: "Instantáneo", universo: null };
        const scenario = ATTACK_SCENARIOS[attackScenario];
        // Grover: la búsqueda cuántica toma ~√N pasos, como si la entropía fuera la mitad (Grover 1996).
        const log10s = "isQuantum" in scenario
            ? log10SegundosPromedio(entropy / 2, 1e9)
            : log10SegundosPromedio(entropy, scenario.speed);
        return tiempoLegible(log10s);
    }, [entropy, attackScenario]);

    // Niveles orientativos. Los 112 bits son el mínimo que NIST SP 800-131A pide a las claves criptográficas.
    const securityLevel = useMemo(() => {
        if (entropy < 28) return { label: "Crítica", color: "#DC2626", tip: "Cae ante ataques básicos" };
        if (entropy < 40) return { label: "Débil", color: "#F97316", tip: "Insuficiente para cuentas importantes" };
        if (entropy < 60) return { label: "Aceptable", color: "#EAB308", tip: "Solo si el servicio limita los intentos" };
        if (entropy < 80) return { label: "Fuerte", color: "#22C55E", tip: "Recomendado para la mayoría de usos" };
        if (entropy < 112) return { label: "Muy fuerte", color: "#10B981", tip: "Sobra para casi cualquier cuenta" };
        if (entropy < 128) return { label: "Excelente", color: "#06B6D4", tip: "Sobre los 112 bits que NIST pide a una clave criptográfica" };
        if (entropy < 256) return { label: "Superior", color: "#8B5CF6", tip: "Al nivel de una clave AES-128 o más" };
        return { label: "Máxima", color: "#EC4899", tip: "Al nivel de AES-256; con Grover quedarían unos 128 bits" };
    }, [entropy]);

    const generatePassword = useCallback(() => {
        setPassword(modo === "palabras"
            ? generarFrase({ palabras: numPalabras, separador, mayuscula, numero: conNumero })
            : generarClave(grupos, length));
    }, [modo, numPalabras, separador, mayuscula, conNumero, grupos, length]);

    useEffect(() => { generatePassword(); }, [generatePassword]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Generador de contraseñas"} />;
    }

    const currentScenario = ATTACK_SCENARIOS[attackScenario];
    const bits = entero.format(entropy);
    const toggleClass = (on: boolean) => on
        ? "bg-teal-500/20 border border-teal-500/40 text-teal-400"
        : "bg-white/5 border border-white/10 text-neutral-500 hover:bg-white/10";

    return (
        <div className="tool-page">
            <main className="tool-main pt-20 pb-12 sm:pt-24 sm:pb-16">
                {/* Header */}
                <ToolPageHeader slug="claves" />

                {/* Password Display */}
                <div className="bg-[#0a0e17] rounded-2xl p-4 sm:p-5 border border-white/10 mb-4">
                    <h2 className="sr-only">Clave generada</h2>
                    <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-stretch">
                        <div id="clave-generada" className={`font-mono text-base sm:text-lg text-white flex-1 select-all bg-black/40 rounded-lg p-3 min-h-[52px] ${modo === "palabras" ? "break-words" : "break-all"}`}>
                            {showPassword ? password : "•".repeat(password.length)}
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-col">
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className={`${iconButton} bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white`} aria-label={showPassword ? "Ocultar clave" : "Mostrar clave"}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPassword ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} /></svg>
                            </button>
                            <button type="button" onClick={() => { void copiar(password, "clave"); }} disabled={!password} className={`${iconButton} disabled:opacity-50 ${copiado === "clave" ? "bg-teal-500/20 text-teal-400" : "bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white"}`} aria-label="Copiar clave">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={copiado === "clave" ? "M5 13l4 4L19 7" : "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"} /></svg>
                            </button>
                            <button type="button" onClick={generatePassword} disabled={sinGrupos} className={`${iconButton} bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 disabled:opacity-50`} aria-label="Generar otra clave">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                        </div>
                    </div>
                    <p role="status" className="sr-only">{copiado === "clave" ? "Clave copiada" : ""}</p>
                    {fallo === "clave" && <p role="alert" className="mb-2 text-xs text-red-300">No se pudo copiar. Selecciona la clave y cópiala a mano.</p>}

                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden" aria-hidden="true">
                            <div className="h-full rounded-full transition-all duration-500 motion-reduce:transition-none" style={{ width: `${Math.min((entropy / 128) * 100, 100)}%`, background: securityLevel.color }} />
                        </div>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: `${securityLevel.color}15`, color: securityLevel.color }}>{securityLevel.label}</span>
                    </div>
                    <p aria-live="polite" className="text-[11px] text-neutral-500 mt-2">
                        {modo === "palabras"
                            ? <>{numPalabras} palabras{conNumero ? " y un número" : ""} • <span className="text-white font-medium">{bits} bits</span> • {securityLevel.tip}</>
                            : <>{length} caracteres • {charsetSize} posibles por posición • <span className="text-white font-medium">{bits} bits</span> • {securityLevel.tip}{grupos.length > 1 ? " • Lleva al menos uno de cada grupo elegido" : ""}</>}
                    </p>
                </div>

                {/* Configuration */}
                <div className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10 mb-4">
                    <div role="group" aria-label="Tipo de clave" className="grid grid-cols-2 gap-1 rounded-xl bg-black/20 p-1 mb-4">
                        <button type="button" aria-pressed={modo === "caracteres"} onClick={() => setModo("caracteres")} className={`min-h-11 rounded-lg text-sm transition-colors ${modo === "caracteres" ? "bg-teal-500/20 text-teal-400" : "text-neutral-400 hover:text-white"}`}>Caracteres al azar</button>
                        <button type="button" aria-pressed={modo === "palabras"} onClick={() => setModo("palabras")} className={`min-h-11 rounded-lg text-sm transition-colors ${modo === "palabras" ? "bg-teal-500/20 text-teal-400" : "text-neutral-400 hover:text-white"}`}>Frase de palabras</button>
                    </div>

                    {modo === "caracteres" ? (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <label htmlFor="clave-largo" className="text-sm text-neutral-300">Longitud</label>
                                <div className="flex items-center gap-2">
                                    <button type="button" aria-label="Cuatro caracteres menos" disabled={length <= LARGO_MIN} onClick={() => setLength(Math.max(LARGO_MIN, length - 4))} className="h-11 w-11 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm disabled:opacity-40">−</button>
                                    <span className="w-8 text-center font-bold text-teal-400" aria-hidden="true">{length}</span>
                                    <button type="button" aria-label="Cuatro caracteres más" disabled={length >= LARGO_MAX} onClick={() => setLength(Math.min(LARGO_MAX, length + 4))} className="h-11 w-11 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm disabled:opacity-40">+</button>
                                </div>
                            </div>
                            <input id="clave-largo" type="range" min={LARGO_MIN} max={LARGO_MAX} value={length} aria-valuetext={`${length} caracteres`} onChange={(e) => setLength(parseInt(e.target.value, 10))} className="w-full h-11 bg-transparent cursor-pointer accent-teal-500 mb-3" />

                            <div role="group" aria-label="Grupos de caracteres" className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-3">
                                {GRUPOS.map((g) => (
                                    <button key={g.id} type="button" aria-pressed={activos[g.id]} aria-label={g.nombre} onClick={() => setActivos((a) => ({ ...a, [g.id]: !a[g.id] }))} className={`min-h-11 rounded-lg text-xs font-mono transition-all motion-reduce:transition-none ${toggleClass(activos[g.id])}`}>{g.etiqueta}</button>
                                ))}
                            </div>
                            {sinGrupos && <p role="alert" className="mb-3 text-xs text-amber-300">Elige al menos un grupo de caracteres.</p>}

                            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} aria-expanded={showAdvanced} aria-controls="clave-avanzado" className="min-h-11 text-xs text-neutral-400 hover:text-white flex items-center gap-1">
                                <svg className={`w-3 h-3 transition-transform motion-reduce:transition-none ${showAdvanced ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                Avanzado
                            </button>
                            <div id="clave-avanzado" hidden={!showAdvanced}>
                                <label className="flex min-h-11 items-center gap-2 text-xs text-neutral-400 mb-3">
                                    <input type="checkbox" checked={excludeAmbiguous} onChange={(e) => setExcludeAmbiguous(e.target.checked)} className="w-4 h-4 rounded bg-white/10 accent-teal-500" />
                                    Excluir caracteres que se confunden (l, 1, I, |, o, O, 0)
                                </label>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <label htmlFor="clave-palabras" className="text-sm text-neutral-300">Palabras</label>
                                <div className="flex items-center gap-2">
                                    <button type="button" aria-label="Una palabra menos" disabled={numPalabras <= PALABRAS_MIN} onClick={() => setNumPalabras(Math.max(PALABRAS_MIN, numPalabras - 1))} className="h-11 w-11 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm disabled:opacity-40">−</button>
                                    <span className="w-8 text-center font-bold text-teal-400" aria-hidden="true">{numPalabras}</span>
                                    <button type="button" aria-label="Una palabra más" disabled={numPalabras >= PALABRAS_MAX} onClick={() => setNumPalabras(Math.min(PALABRAS_MAX, numPalabras + 1))} className="h-11 w-11 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm disabled:opacity-40">+</button>
                                </div>
                            </div>
                            <input id="clave-palabras" type="range" min={PALABRAS_MIN} max={PALABRAS_MAX} value={numPalabras} aria-valuetext={`${numPalabras} palabras`} onChange={(e) => setNumPalabras(parseInt(e.target.value, 10))} className="w-full h-11 bg-transparent cursor-pointer accent-teal-500 mb-3" />

                            <div className="grid gap-3 sm:grid-cols-2 mb-3">
                                <label className="flex flex-col gap-1.5 text-xs text-neutral-400">
                                    Separador
                                    <select value={separador} onChange={(e) => setSeparador(e.target.value)} className="min-h-11 rounded-lg bg-white/5 border border-white/10 px-3 text-sm text-white">
                                        {SEPARADORES_FRASE.map((s) => <option key={s.nombre} value={s.valor} className="bg-[#0F1724]">{s.nombre}</option>)}
                                    </select>
                                </label>
                                <div className="flex flex-col justify-end">
                                    <label className="flex min-h-11 items-center gap-2 text-xs text-neutral-300">
                                        <input type="checkbox" checked={mayuscula} onChange={(e) => setMayuscula(e.target.checked)} className="w-4 h-4 rounded bg-white/10 accent-teal-500" />
                                        Mayúscula inicial en cada palabra
                                    </label>
                                    <label className="flex min-h-11 items-center gap-2 text-xs text-neutral-300">
                                        <input type="checkbox" checked={conNumero} onChange={(e) => setConNumero(e.target.checked)} className="w-4 h-4 rounded bg-white/10 accent-teal-500" />
                                        Agregar un número del 0 al 99
                                    </label>
                                </div>
                            </div>
                            <p className="text-[11px] leading-relaxed text-neutral-500 mb-3">
                                Lista de {entero.format(TOTAL_PALABRAS)} palabras comunes sin tildes ni ñ, para escribirlas en cualquier teclado. Cada palabra suma {decimal.format(BITS_POR_PALABRA)} bits; el número va en una posición al azar. La mayúscula y el separador no suman entropía, pero ayudan con los sitios que los exigen.
                            </p>
                        </>
                    )}

                    <button type="button" onClick={generatePassword} disabled={sinGrupos} className="w-full min-h-11 py-3 rounded-xl bg-[var(--boton)] text-[var(--boton-tinta)] font-semibold text-sm hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Generar otra
                    </button>
                </div>

                {/* Attack Resistance */}
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/10 overflow-hidden mb-4">
                    <div className="p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center text-xs" aria-hidden="true">⏱️</span>
                                Tiempo para descifrar
                            </h2>
                            <a href="https://hashcat.net/wiki/" target="_blank" rel="noopener noreferrer" className="text-[11px] text-neutral-500 hover:text-white">Hashcat 2024 →</a>
                        </div>

                        <div role="group" aria-label="Escenario de ataque" className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mb-4">
                            {(Object.entries(ATTACK_SCENARIOS) as [AttackKey, typeof ATTACK_SCENARIOS[AttackKey]][]).map(([key, s]) => (
                                <button key={key} type="button" aria-pressed={attackScenario === key} onClick={() => setAttackScenario(key)} className={`min-h-11 p-2 rounded-lg text-left transition-all motion-reduce:transition-none ${attackScenario === key ? "bg-orange-500/20 border-orange-500/50 ring-1 ring-orange-500/30" : "bg-white/5 border-white/10 hover:bg-white/10"} border`}>
                                    <div className="text-sm mb-0.5" aria-hidden="true">{s.icon}</div>
                                    <div className={`text-[11px] font-medium leading-tight ${attackScenario === key ? "text-orange-400" : "text-neutral-400"}`}>{s.label}</div>
                                </button>
                            ))}
                        </div>

                        <div className="bg-black/30 rounded-xl p-4 text-center" aria-live="polite">
                            <div className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: securityLevel.color }}>{crackTime.texto}</div>
                            {crackTime.universo && <p className="text-xs text-neutral-400 mb-1">{crackTime.universo}</p>}
                            <p className="text-xs text-neutral-500">{currentScenario.desc} • {currentScenario.detail} • tiempo promedio (la mitad de las combinaciones)</p>
                            {modo === "palabras" && <p className="text-[11px] text-neutral-500 mt-2">Supone que el atacante conoce la lista y el formato: la fuerza sale solo del azar.</p>}

                            {"isQuantum" in currentScenario && currentScenario.isQuantum && (
                                <div className="mt-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-left">
                                    <p className="text-[11px] text-purple-300 leading-relaxed">
                                        <strong>Algoritmo de Grover (1996):</strong> reduce la búsqueda de O(N) a O(√N) pasos.
                                        Tu entropía efectiva ante un ataque cuántico: <strong>{entero.format(entropy / 2)} bits</strong>. Hoy no existe un computador cuántico capaz de esto; la velocidad es un supuesto.
                                        <br /><span className="text-purple-400">Ref: Grover, «A fast quantum mechanical algorithm for database search», 1996</span>
                                    </p>
                                </div>
                            )}
                            {"isSecure" in currentScenario && currentScenario.isSecure && (
                                <p className="text-[11px] text-teal-400 mt-2 bg-teal-500/10 rounded-lg p-2">
                                    🔐 Bcrypt es lento a propósito: su factor de costo multiplica el trabajo por intento y frena a las GPU. No exige mucha memoria, a diferencia de Argon2 o scrypt.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Security Tips */}
                <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                    <button type="button" onClick={() => setShowTips(!showTips)} aria-expanded={showTips} aria-controls="clave-consejos" className="w-full min-h-11 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-sm" aria-hidden="true">💡</span>
                            <div className="text-left">
                                <div className="text-white font-medium text-sm">Mejores prácticas de seguridad</div>
                                <div className="text-[11px] text-neutral-500">Recomendaciones</div>
                            </div>
                        </div>
                        <svg className={`w-4 h-4 text-neutral-400 transition-transform duration-300 motion-reduce:transition-none ${showTips ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    <div
                        id="clave-consejos"
                        inert={!showTips}
                        className="overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none"
                        style={{ maxHeight: showTips ? "1000px" : "0px", opacity: showTips ? 1 : 0 }}
                    >
                        <div className="px-4 pb-4 grid gap-2 text-xs">
                            {[
                                { icon: "🔄", title: "Cambia solo con motivo", desc: "NIST SP 800-63B pide no forzar cambios periódicos: empujan a variaciones predecibles. Cámbiala si se filtró o sospechas que alguien la vio." },
                                { icon: "📲", title: "2FA con apps dedicadas", desc: "Usa Authy, Google Authenticator o llaves FIDO2/WebAuthn. Evita SMS (vulnerable a SIM swapping)." },
                                { icon: "🔐", title: "Gestor de contraseñas", desc: "KeePass (offline, open-source), Bitwarden, o 1Password con cifrado AES-256. Nunca guardes en navegadores." },
                                { icon: "🚨", title: "Monitorea filtraciones", desc: "Registra tu email en HaveIBeenPwned.com, activa alertas en Google One o Firefox Monitor para breaches." },
                                { icon: "🚫", title: "Una por servicio", desc: "Nunca reutilices. Los ataques de credential stuffing usan bases de datos filtradas para probar en múltiples sitios." },
                                { icon: "🎯", title: "Verifica URLs", desc: "Revisa el dominio completo antes de ingresar credenciales. Los ataques de phishing clonan sitios con URLs similares." },
                            ].map((t) => (
                                <div key={t.title} className="flex gap-2 p-2.5 rounded-lg bg-white/5">
                                    <span className="text-sm flex-shrink-0" aria-hidden="true">{t.icon}</span>
                                    <div><span className="text-white font-medium">{t.title}:</span> <span className="text-neutral-400">{t.desc}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Glossary Section */}
                <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden mt-4">
                    <button type="button" onClick={() => setShowGlossary(!showGlossary)} aria-expanded={showGlossary} aria-controls="clave-glosario" className="w-full min-h-11 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm" aria-hidden="true">📖</span>
                            <div className="text-left">
                                <div className="text-white font-medium text-sm">Glosario de términos</div>
                                <div className="text-[11px] text-neutral-500">Explicación de conceptos técnicos</div>
                            </div>
                        </div>
                        <svg className={`w-4 h-4 text-neutral-400 transition-transform duration-300 motion-reduce:transition-none ${showGlossary ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    <div
                        id="clave-glosario"
                        inert={!showGlossary}
                        className="overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none"
                        style={{ maxHeight: showGlossary ? "2400px" : "0px", opacity: showGlossary ? 1 : 0 }}
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
                                <p className="text-neutral-500 mt-2 text-[11px]">
                                    Por eso es crucial: 2FA, verificar URLs, usar HTTPS, mantener software actualizado, y confiar solo en servicios con buenas prácticas.
                                </p>
                            </div>

                            {/* Terms */}
                            {[
                                { term: "Entropía (bits)", def: "Medida de aleatoriedad. Fórmula: log₂(pool^longitud). Más bits = más combinaciones posibles = más seguro. 128 bits es el estándar AES. Exigir un carácter de cada grupo descarta algunas combinaciones, y la cifra de arriba ya lo descuenta." },
                                { term: "Pool (caracteres)", def: "Conjunto de caracteres posibles para cada posición. Aquí, con a-z, A-Z, 0-9 y !@# son 70; con los seis grupos, 94 (todo el ASCII imprimible salvo el espacio)." },
                                { term: "Frase de contraseña", def: `Varias palabras al azar de una lista. Su entropía es log₂(tamaño de la lista) × palabras: con ${entero.format(TOTAL_PALABRAS)} palabras, cada una aporta ${decimal.format(BITS_POR_PALABRA)} bits. Se recuerda y se teclea mejor que una clave de caracteres con la misma entropía.` },
                                { term: "Bits efectivos post-cuánticos", def: "Seguridad real contra computadoras cuánticas. El algoritmo de Grover reduce la entropía a la mitad. 256 bits clásicos = 128 bits cuánticos." },
                                { term: "Algoritmo de Grover (√n)", def: "Propuesto en 1996 por Lov Grover. Reduce búsqueda de O(N) a O(√N). Ejemplo: 2^128 combinaciones se reducen a 2^64 operaciones cuánticas." },
                                { term: "NIST PQC", def: "Post-Quantum Cryptography del NIST (Instituto Nacional de Estándares de EE.UU.). Define estándares para criptografía resistente a computadoras cuánticas." },
                                { term: "Hashcat", def: "Herramienta de código abierto para recuperación de contraseñas. Las velocidades de ataque usadas aquí son las que publica para GPUs RTX 4090." },
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
                    <h2 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-xs" aria-hidden="true">📚</span>
                        Fuentes y referencias
                    </h2>
                    <div className="grid gap-2 text-xs">
                        {[
                            { name: "NIST SP 800-131A Rev 2", url: "https://csrc.nist.gov/publications/detail/sp/800-131a/rev-2/final", desc: "Guía de transición criptográfica" },
                            { name: "NIST Post-Quantum Cryptography", url: "https://csrc.nist.gov/Projects/post-quantum-cryptography", desc: "Estándares PQC oficiales" },
                            { name: "Grover's Algorithm (1996)", url: "https://arxiv.org/abs/quant-ph/9605043", desc: "Paper original de Lov Grover" },
                            { name: "Hashcat: velocidades por GPU", url: "https://hashcat.net/wiki/", desc: "Velocidades reales de crackeo por GPU" },
                            { name: "OWASP Password Guidelines", url: "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html", desc: "Mejores prácticas de la industria" },
                            { name: "Have I Been Pwned", url: "https://haveibeenpwned.com/", desc: "Verificador de filtraciones de datos" },
                        ].map((s) => (
                            <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
                                <div>
                                    <span className="text-cyan-400 group-hover:text-cyan-300">{s.name}</span>
                                    <span className="text-neutral-500 ml-2">— {s.desc}</span>
                                </div>
                                <svg className="w-3 h-3 text-neutral-500 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                        ))}
                    </div>
                </div>

            </main>
        </div>
    );
}
