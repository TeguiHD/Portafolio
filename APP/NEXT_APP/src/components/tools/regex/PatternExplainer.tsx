"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Types
interface RegexToken {
    token: string;
    explanation: string;
    type: 'anchor' | 'quantifier' | 'character' | 'group' | 'escape' | 'class' | 'literal' | 'flag';
}

interface PatternExplainerProps {
    regex: string;
    flags: string;
}

// Token explanations
const TOKEN_MAP: Record<string, Omit<RegexToken, 'token'>> = {
    // Anchors
    '^': { explanation: 'Inicio de línea', type: 'anchor' },
    '$': { explanation: 'Fin de línea', type: 'anchor' },
    '\\b': { explanation: 'Límite de palabra', type: 'anchor' },
    '\\B': { explanation: 'No límite de palabra', type: 'anchor' },

    // Character classes
    '.': { explanation: 'Cualquier carácter (excepto \\n)', type: 'character' },
    '\\d': { explanation: 'Dígito (0-9)', type: 'character' },
    '\\D': { explanation: 'No dígito', type: 'character' },
    '\\w': { explanation: 'Alfanumérico (a-z, A-Z, 0-9, _)', type: 'character' },
    '\\W': { explanation: 'No alfanumérico', type: 'character' },
    '\\s': { explanation: 'Espacio en blanco', type: 'character' },
    '\\S': { explanation: 'No espacio en blanco', type: 'character' },

    // Escaped characters
    '\\n': { explanation: 'Salto de línea', type: 'escape' },
    '\\t': { explanation: 'Tabulación', type: 'escape' },
    '\\r': { explanation: 'Retorno de carro', type: 'escape' },
    '\\.': { explanation: 'Punto literal', type: 'escape' },
    '\\\\': { explanation: 'Barra invertida literal', type: 'escape' },
    '\\[': { explanation: 'Corchete literal', type: 'escape' },
    '\\]': { explanation: 'Corchete literal', type: 'escape' },
    '\\(': { explanation: 'Paréntesis literal', type: 'escape' },
    '\\)': { explanation: 'Paréntesis literal', type: 'escape' },
    '\\{': { explanation: 'Llave literal', type: 'escape' },
    '\\}': { explanation: 'Llave literal', type: 'escape' },
    '\\+': { explanation: 'Signo más literal', type: 'escape' },
    '\\*': { explanation: 'Asterisco literal', type: 'escape' },
    '\\?': { explanation: 'Signo de interrogación literal', type: 'escape' },
    '\\^': { explanation: 'Circunflejo literal', type: 'escape' },
    '\\$': { explanation: 'Signo de dólar literal', type: 'escape' },
    '\\|': { explanation: 'Barra vertical literal', type: 'escape' },

    // Quantifiers
    '*': { explanation: 'Cero o más repeticiones', type: 'quantifier' },
    '+': { explanation: 'Una o más repeticiones', type: 'quantifier' },
    '?': { explanation: 'Cero o una repetición (opcional)', type: 'quantifier' },
    '*?': { explanation: 'Cero o más (no codicioso)', type: 'quantifier' },
    '+?': { explanation: 'Una o más (no codicioso)', type: 'quantifier' },
    '??': { explanation: 'Opcional (no codicioso)', type: 'quantifier' },

    // Groups
    '|': { explanation: 'Alternativa (OR)', type: 'group' },
};

// Flag explanations
const FLAG_MAP: Record<string, string> = {
    'g': 'Global: busca todas las coincidencias',
    'i': 'Insensible: ignora mayúsculas/minúsculas',
    'm': 'Multilínea: ^ y $ por cada línea',
    's': 'DotAll: el punto incluye \\n',
    'u': 'Unicode: soporte completo UTF-16',
    'y': 'Sticky: busca desde lastIndex',
};

// Type colors
const TYPE_COLORS: Record<string, string> = {
    anchor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    quantifier: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    character: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    group: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
    escape: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    class: 'text-green-400 bg-green-500/10 border-green-500/30',
    literal: 'text-neutral-300 bg-white/5 border-white/10',
    flag: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
};

/**
 * Parse regex into tokens with explanations
 */
function parseRegex(pattern: string): RegexToken[] {
    const tokens: RegexToken[] = [];
    let i = 0;

    while (i < pattern.length) {
        // Check for escaped characters (2-char tokens)
        if (pattern[i] === '\\' && i + 1 < pattern.length) {
            const escaped = pattern.slice(i, i + 2);
            const info = TOKEN_MAP[escaped];
            if (info) {
                tokens.push({ token: escaped, ...info });
            } else {
                tokens.push({
                    token: escaped,
                    explanation: `Carácter escapado: ${pattern[i + 1]}`,
                    type: 'escape'
                });
            }
            i += 2;
            continue;
        }

        // Check for non-greedy quantifiers
        if ((pattern[i] === '*' || pattern[i] === '+' || pattern[i] === '?') && pattern[i + 1] === '?') {
            const combo = pattern.slice(i, i + 2);
            const info = TOKEN_MAP[combo];
            if (info) {
                tokens.push({ token: combo, ...info });
                i += 2;
                continue;
            }
        }

        // Check for quantifier ranges {n} or {n,m}
        if (pattern[i] === '{') {
            const endBrace = pattern.indexOf('}', i);
            if (endBrace !== -1) {
                const quantifier = pattern.slice(i, endBrace + 1);
                const match = quantifier.match(/^\{(\d+)(?:,(\d*))?\}$/);
                if (match) {
                    const min = match[1];
                    const max = match[2];
                    let explanation: string;
                    if (max === undefined) {
                        explanation = `Exactamente ${min} veces`;
                    } else if (max === '') {
                        explanation = `${min} o más veces`;
                    } else {
                        explanation = `Entre ${min} y ${max} veces`;
                    }
                    tokens.push({ token: quantifier, explanation, type: 'quantifier' });
                    i = endBrace + 1;
                    continue;
                }
            }
        }

        // Check for character classes [...]
        if (pattern[i] === '[') {
            let j = i + 1;
            let negated = false;
            if (pattern[j] === '^') {
                negated = true;
                j++;
            }
            // Find closing bracket (handle escaped brackets)
            while (j < pattern.length) {
                if (pattern[j] === '\\' && j + 1 < pattern.length) {
                    j += 2;
                } else if (pattern[j] === ']') {
                    break;
                } else {
                    j++;
                }
            }
            const charClass = pattern.slice(i, j + 1);
            const content = charClass.slice(negated ? 2 : 1, -1);
            tokens.push({
                token: charClass,
                explanation: negated ? `Excepto: ${content}` : `Uno de: ${content}`,
                type: 'class'
            });
            i = j + 1;
            continue;
        }

        // Check for groups (...)
        if (pattern[i] === '(') {
            // Check for special group types
            if (pattern.slice(i, i + 3) === '(?:') {
                tokens.push({ token: '(?:', explanation: 'Grupo sin captura', type: 'group' });
                i += 3;
                continue;
            }
            if (pattern.slice(i, i + 4) === '(?=') {
                tokens.push({ token: '(?=', explanation: 'Lookahead positivo', type: 'group' });
                i += 4;
                continue;
            }
            if (pattern.slice(i, i + 4) === '(?!') {
                tokens.push({ token: '(?!', explanation: 'Lookahead negativo', type: 'group' });
                i += 4;
                continue;
            }
            if (pattern.slice(i, i + 4) === '(?<=') {
                tokens.push({ token: '(?<=', explanation: 'Lookbehind positivo', type: 'group' });
                i += 5;
                continue;
            }
            if (pattern.slice(i, i + 4) === '(?<!') {
                tokens.push({ token: '(?<!', explanation: 'Lookbehind negativo', type: 'group' });
                i += 5;
                continue;
            }
            // Named group (?<name>...)
            const namedMatch = pattern.slice(i).match(/^\(\?<([^>]+)>/);
            if (namedMatch) {
                tokens.push({
                    token: namedMatch[0],
                    explanation: `Grupo nombrado: ${namedMatch[1]}`,
                    type: 'group'
                });
                i += namedMatch[0].length;
                continue;
            }
            // Regular capture group
            tokens.push({ token: '(', explanation: 'Inicio de grupo de captura', type: 'group' });
            i++;
            continue;
        }

        if (pattern[i] === ')') {
            tokens.push({ token: ')', explanation: 'Fin de grupo', type: 'group' });
            i++;
            continue;
        }

        // Single character tokens
        const info = TOKEN_MAP[pattern[i]];
        if (info) {
            tokens.push({ token: pattern[i], ...info });
        } else {
            // Literal character
            tokens.push({
                token: pattern[i],
                explanation: `Literal: "${pattern[i]}"`,
                type: 'literal'
            });
        }
        i++;
    }

    return tokens;
}

export function PatternExplainer({ regex, flags }: PatternExplainerProps) {
    // Parse the pattern
    const tokens = useMemo(() => parseRegex(regex), [regex]);

    // Parse flags
    const flagTokens = useMemo(() => {
        return flags.split('').map(f => ({
            token: f,
            explanation: FLAG_MAP[f] || `Flag: ${f}`,
            type: 'flag' as const
        }));
    }, [flags]);

    if (!regex) {
        return (
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-xs">📖</span>
                    <h3 className="text-sm font-medium text-white">Explicación del Patrón</h3>
                </div>
                <p className="text-xs text-neutral-500">Ingresa una regex para ver su explicación.</p>
            </div>
        );
    }

    return (
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-xs">📖</span>
                <h3 className="text-sm font-medium text-white">Explicación del Patrón</h3>
            </div>

            {/* Token List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <AnimatePresence mode="popLayout">
                    {tokens.map((token, i) => (
                        <motion.div
                            key={`${i}-${token.token}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(i * 0.02, 0.3) }}
                            className="flex items-center gap-3"
                        >
                            <code className={`font-mono text-xs px-2 py-1 rounded border min-w-[60px] text-center ${TYPE_COLORS[token.type]}`}>
                                {token.token}
                            </code>
                            <span className="text-xs text-neutral-400">{token.explanation}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Flags */}
            {flags && (
                <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-[10px] text-neutral-600 mb-2">FLAGS</p>
                    <div className="flex flex-wrap gap-2">
                        {flagTokens.map((flag) => (
                            <div
                                key={flag.token}
                                className="flex items-center gap-1.5"
                                title={flag.explanation}
                            >
                                <code className={`font-mono text-xs px-2 py-0.5 rounded border ${TYPE_COLORS.flag}`}>
                                    {flag.token}
                                </code>
                                <span className="text-[10px] text-neutral-500">{flag.explanation.split(':')[0]}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
