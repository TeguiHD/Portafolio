"use client";

import { useMemo } from "react";

type TokenType = "anchor" | "quantifier" | "character" | "group" | "escape" | "class" | "literal" | "flag";

interface RegexToken {
    token: string;
    explanation: string;
    type: TokenType;
    /** Nivel de anidamiento: las partes dentro de un grupo se sangran. */
    depth: number;
}

interface PatternExplainerProps {
    regex: string;
    flags: string;
}

/** Más partes que esto no se leen en una lista; el resto se resume. */
const MAX_TOKENS = 300;

const CHARACTER_ESCAPES: Record<string, string> = {
    d: "Un dígito (0-9)",
    D: "Un carácter que no sea dígito",
    w: "Una letra sin tilde, dígito o _ (a-z, A-Z, 0-9, _)",
    W: "Un carácter que no sea letra sin tilde, dígito ni _",
    s: "Un espacio en blanco (espacio, tabulación, salto de línea…)",
    S: "Un carácter que no sea espacio en blanco",
};

const CONTROL_ESCAPES: Record<string, string> = {
    n: "Salto de línea",
    r: "Retorno de carro",
    t: "Tabulación",
    f: "Salto de página",
    v: "Tabulación vertical",
    "0": "Carácter nulo (U+0000)",
};

const CLASS_ESCAPES: Record<string, string> = {
    d: "dígitos", D: "no dígitos", w: "letras sin tilde, dígitos o _", W: "lo que no sea \\w",
    s: "espacios en blanco", S: "lo que no sea espacio", n: "salto de línea", r: "retorno de carro", t: "tabulación",
};

const FLAG_MAP: Record<string, string> = {
    d: "Índices: guarda dónde empieza y termina cada grupo",
    g: "Global: busca todas las coincidencias",
    i: "Sin distinguir mayúsculas de minúsculas",
    m: "Multilínea: ^ y $ marcan cada línea",
    s: "dotAll: el punto también acepta saltos de línea",
    u: "Unicode: lee el texto por puntos de código",
    v: "Unicode ampliado: clases con operaciones de conjuntos",
    y: "Pegajosa: la coincidencia debe empezar justo en lastIndex",
};

const TYPE_COLORS: Record<TokenType, string> = {
    anchor: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    quantifier: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    character: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    group: "text-pink-400 bg-pink-500/10 border-pink-500/30",
    escape: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    class: "text-green-400 bg-green-500/10 border-green-500/30",
    literal: "text-neutral-300 bg-white/5 border-white/10",
    flag: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
};

function codePointName(cp: number): string {
    return `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
}

/** Explica un escape que empieza en `pattern[i] === "\\"`. Devuelve el texto exacto que consume. */
function explainEscape(pattern: string, i: number): Omit<RegexToken, "depth"> {
    const next = pattern[i + 1];
    if (next === undefined) return { token: "\\", explanation: "Barra invertida sin completar", type: "escape" };
    const rest = pattern.slice(i);

    if (next in CHARACTER_ESCAPES) return { token: `\\${next}`, explanation: CHARACTER_ESCAPES[next], type: "character" };
    if (next === "b") return { token: "\\b", explanation: "Límite de palabra", type: "anchor" };
    if (next === "B") return { token: "\\B", explanation: "Dentro de una palabra (no es límite)", type: "anchor" };

    const backref = rest.match(/^\\([1-9]\d*)/);
    if (backref) return { token: backref[0], explanation: `Repite el texto que capturó el grupo ${backref[1]}`, type: "group" };
    const namedRef = rest.match(/^\\k<([^>]+)>/);
    if (namedRef) return { token: namedRef[0], explanation: `Repite el texto que capturó el grupo «${namedRef[1]}»`, type: "group" };

    const property = rest.match(/^\\([pP])\{([^}]*)\}/);
    if (property) {
        const negated = property[1] === "P";
        return { token: property[0], explanation: `Un carácter ${negated ? "sin" : "con"} la propiedad Unicode ${property[2]} (requiere u o v)`, type: "character" };
    }

    const unicodeBraces = rest.match(/^\\u\{([0-9a-fA-F]+)\}/);
    const unicode4 = rest.match(/^\\u([0-9a-fA-F]{4})/);
    const hex = rest.match(/^\\x([0-9a-fA-F]{2})/);
    const code = unicodeBraces ?? unicode4 ?? hex;
    if (code) {
        const cp = parseInt(code[1], 16);
        const shown = cp <= 0x10ffff && cp > 0x20 ? ` «${String.fromCodePoint(cp)}»` : "";
        return { token: code[0], explanation: `El carácter ${codePointName(cp)}${shown}`, type: "escape" };
    }

    const control = rest.match(/^\\c([A-Za-z])/);
    if (control) return { token: control[0], explanation: `Control-${control[1].toUpperCase()}`, type: "escape" };

    if (next in CONTROL_ESCAPES) return { token: `\\${next}`, explanation: CONTROL_ESCAPES[next], type: "escape" };

    const cp = rest.codePointAt(1) ?? 0;
    const ch = String.fromCodePoint(cp);
    return { token: `\\${ch}`, explanation: `«${ch}» literal`, type: "escape" };
}

/** Describe el contenido de una clase [...] por elementos: rangos, escapes y caracteres sueltos. */
function describeClass(content: string): string {
    const items: string[] = [];
    let i = 0;
    while (i < content.length) {
        let item: string;
        let width: number;
        if (content[i] === "\\" && i + 1 < content.length) {
            const esc = content[i + 1];
            item = CLASS_ESCAPES[esc] ?? `«${esc}»`;
            width = 2;
        } else if (content[i] === "[") {
            // Clase anidada (bandera v): se muestra tal cual.
            let depth = 0;
            let j = i;
            for (; j < content.length; j++) {
                if (content[j] === "\\") { j++; continue; }
                if (content[j] === "[") depth++;
                else if (content[j] === "]" && --depth === 0) break;
            }
            item = content.slice(i, j + 1);
            width = j + 1 - i;
        } else {
            const ch = String.fromCodePoint(content.codePointAt(i) ?? 0);
            width = ch.length;
            const after = content[i + width];
            const endChar = after === "-" && i + width + 1 < content.length && content[i + width + 1] !== "\\" ? String.fromCodePoint(content.codePointAt(i + width + 1) ?? 0) : null;
            if (endChar) {
                item = `${ch}–${endChar}`;
                width += 1 + endChar.length;
            } else {
                item = `«${ch}»`;
            }
        }
        items.push(item);
        i += width;
    }
    return items.join(", ");
}

/** Une letras literales seguidas en un solo bloque, salvo la última si la sigue un cuantificador (solo se aplica a ella). */
function mergeLiterals(tokens: RegexToken[]): RegexToken[] {
    const out: RegexToken[] = [];
    let open = false;
    tokens.forEach((t, k) => {
        const quantified = tokens[k + 1]?.type === "quantifier";
        const prev = out[out.length - 1];
        if (t.type === "literal" && !quantified && open && prev && prev.depth === t.depth) {
            prev.token += t.token;
            prev.explanation = `Texto literal «${prev.token}»`;
            return;
        }
        out.push({ ...t });
        open = t.type === "literal" && !quantified;
    });
    return out;
}

/** Lee el patrón (sin ejecutarlo) y lo parte en piezas explicadas. */
function parseRegex(pattern: string, flags: string): RegexToken[] {
    const multiline = flags.includes("m");
    const dotAll = flags.includes("s");
    const unicodeSets = flags.includes("v");
    const tokens: RegexToken[] = [];
    const openGroups: string[] = [];
    let groupNumber = 0;
    let i = 0;
    const push = (token: string, explanation: string, type: TokenType) => tokens.push({ token, explanation, type, depth: openGroups.length });

    while (i < pattern.length) {
        const c = pattern[i];

        if (c === "\\") {
            const t = explainEscape(pattern, i);
            push(t.token, t.explanation, t.type);
            i += t.token.length;
            continue;
        }

        if (c === "[") {
            let j = i + 1;
            const negated = pattern[j] === "^";
            if (negated) j++;
            const contentStart = j;
            let depth = 1;
            while (j < pattern.length) {
                if (pattern[j] === "\\") { j += 2; continue; }
                if (pattern[j] === "[" && unicodeSets) depth++;
                else if (pattern[j] === "]" && --depth === 0) break;
                j++;
            }
            const content = pattern.slice(contentStart, j);
            let explanation: string;
            if (!content) explanation = negated ? "Cualquier carácter, incluido el salto de línea" : "Clase vacía: nunca coincide";
            else explanation = negated ? `Un carácter que no sea: ${describeClass(content)}` : `Un carácter de: ${describeClass(content)}`;
            if (j >= pattern.length) explanation += " (falta cerrar el corchete)";
            push(pattern.slice(i, j + 1), explanation, "class");
            i = j + 1;
            continue;
        }

        if (c === "(") {
            const rest = pattern.slice(i);
            const lookaround: [string, string, string][] = [
                ["(?<=", "Comprueba que justo antes haya esto (lookbehind)", "la comprobación hacia atrás"],
                ["(?<!", "Comprueba que justo antes no haya esto (lookbehind negativo)", "la comprobación hacia atrás"],
                ["(?=", "Comprueba que a continuación venga esto, sin consumirlo (lookahead)", "la comprobación hacia adelante"],
                ["(?!", "Comprueba que a continuación no venga esto (lookahead negativo)", "la comprobación hacia adelante"],
                ["(?:", "Grupo sin captura: agrupa sin guardar el texto", "el grupo sin captura"],
            ];
            const special = lookaround.find(([open]) => rest.startsWith(open));
            if (special) {
                push(special[0], special[1], "group");
                openGroups.push(special[2]);
                i += special[0].length;
                continue;
            }
            const named = rest.match(/^\(\?<([^>]+)>/);
            if (named) {
                groupNumber++;
                push(named[0], `Grupo ${groupNumber} «${named[1]}»: captura este texto`, "group");
                openGroups.push(`el grupo ${groupNumber}`);
                i += named[0].length;
                continue;
            }
            const modifiers = rest.match(/^\(\?([a-z]*)(?:-([a-z]+))?:/);
            if (modifiers) {
                const parts = [modifiers[1] && `activa ${modifiers[1]}`, modifiers[2] && `desactiva ${modifiers[2]}`].filter(Boolean).join(" y ");
                push(modifiers[0], `Grupo sin captura que ${parts || "no cambia modificadores"}`, "group");
                openGroups.push("el grupo con modificadores");
                i += modifiers[0].length;
                continue;
            }
            groupNumber++;
            push("(", `Grupo ${groupNumber}: captura este texto`, "group");
            openGroups.push(`el grupo ${groupNumber}`);
            i++;
            continue;
        }

        if (c === ")") {
            const closing = openGroups.pop();
            push(")", closing ? `Cierra ${closing}` : "Paréntesis de cierre sin abrir", "group");
            i++;
            continue;
        }

        const brace = c === "{" ? pattern.slice(i).match(/^\{(\d+)(?:,(\d*))?\}/) : null;
        if (c === "*" || c === "+" || c === "?" || brace) {
            const base = brace ? brace[0] : c;
            const lazy = pattern[i + base.length] === "?";
            let explanation: string;
            if (brace) {
                const [, min, max] = brace;
                explanation = max === undefined ? `Exactamente ${min} veces lo anterior` : max === "" ? `${min} o más veces lo anterior` : `Entre ${min} y ${max} veces lo anterior`;
            } else {
                explanation = c === "*" ? "Cero o más veces lo anterior" : c === "+" ? "Una o más veces lo anterior" : "Lo anterior es opcional (cero o una vez)";
            }
            if (lazy) explanation += ", lo menos posible (perezoso)";
            push(lazy ? `${base}?` : base, explanation, "quantifier");
            i += base.length + (lazy ? 1 : 0);
            continue;
        }

        if (c === "^") { push("^", multiline ? "Inicio de línea" : "Inicio del texto", "anchor"); i++; continue; }
        if (c === "$") { push("$", multiline ? "Fin de línea" : "Fin del texto", "anchor"); i++; continue; }
        if (c === ".") { push(".", dotAll ? "Cualquier carácter, incluido el salto de línea" : "Cualquier carácter salvo el salto de línea", "character"); i++; continue; }
        if (c === "|") { push("|", "O bien: alternativa a lo que va antes", "group"); i++; continue; }

        const ch = String.fromCodePoint(pattern.codePointAt(i) ?? 0);
        push(ch, `Carácter «${ch}»`, "literal");
        i += ch.length;
    }

    return mergeLiterals(tokens);
}

export function PatternExplainer({ regex, flags }: PatternExplainerProps) {
    const tokens = useMemo(() => parseRegex(regex, flags), [regex, flags]);
    const flagTokens = useMemo(() => [...flags].map((f) => ({ token: f, explanation: FLAG_MAP[f] ?? `Modificador ${f}` })), [flags]);
    const shown = tokens.slice(0, MAX_TOKENS);

    return (
        <section aria-labelledby="regex-explicacion" className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
                <span aria-hidden="true" className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-xs">📖</span>
                <h3 id="regex-explicacion" className="text-sm font-medium text-white">Explicación del patrón</h3>
            </div>

            {!regex ? (
                <p className="text-xs text-neutral-500">Escribe una regex para ver qué hace cada parte.</p>
            ) : (
                <>
                    <ol aria-label="Partes de la expresión" className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                        {shown.map((token, i) => (
                            <li key={i} className="flex items-start gap-3" style={{ paddingInlineStart: `${Math.min(token.depth, 8) * 14}px` }}>
                                <code className={`font-mono text-xs px-2 py-1 rounded border min-w-[60px] text-center break-all ${TYPE_COLORS[token.type]}`}>
                                    {token.token}
                                </code>
                                <span className="text-xs text-neutral-400 pt-1">{token.explanation}</span>
                            </li>
                        ))}
                    </ol>
                    {tokens.length > MAX_TOKENS && (
                        <p className="mt-2 text-[11px] text-neutral-500">Y {(tokens.length - MAX_TOKENS).toLocaleString("es-CL")} partes más.</p>
                    )}
                </>
            )}

            {flagTokens.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-[11px] text-neutral-500 mb-2">Modificadores</p>
                    <ul className="flex flex-wrap gap-x-3 gap-y-2">
                        {flagTokens.map((flag) => (
                            <li key={flag.token} className="flex items-center gap-1.5">
                                <code className={`font-mono text-xs px-2 py-0.5 rounded border ${TYPE_COLORS.flag}`}>{flag.token}</code>
                                <span className="text-[11px] text-neutral-400">{flag.explanation}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
