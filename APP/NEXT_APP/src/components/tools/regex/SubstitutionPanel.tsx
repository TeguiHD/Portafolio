"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Types
export type RegexMode = 'match' | 'substitution' | 'list';

interface SubstitutionPanelProps {
    regex: string;
    flags: string;
    testString: string;
    mode: RegexMode;
    onModeChange: (mode: RegexMode) => void;
}

// Constants
const MAX_REPLACEMENT_LENGTH = 500;
const MAX_REPLACEMENTS = 10000;

/**
 * Safe substitution with limits
 */
function safeSubstitute(
    text: string,
    regex: RegExp,
    replacement: string
): { result: string; count: number; error?: string } {
    try {
        let count = 0;

        // Sanitize replacement (prevent template literal injection)
        const safeReplacement = replacement
            .slice(0, MAX_REPLACEMENT_LENGTH);

        const result = text.replace(regex, (...args) => {
            count++;
            if (count > MAX_REPLACEMENTS) {
                throw new Error('Demasiados reemplazos');
            }
            // Support group references $1, $2, etc.
            let output = safeReplacement;
            // Named groups are in the last argument if present
            const groups = args[args.length - 1];
            if (typeof groups === 'object' && groups !== null) {
                // Replace named group references
                Object.entries(groups).forEach(([name, value]) => {
                    output = output.replace(new RegExp(`\\$<${name}>`, 'g'), value as string || '');
                });
            }
            // Replace numbered groups $1, $2, etc.
            for (let i = 1; i < args.length - 2; i++) {
                output = output.replace(new RegExp(`\\$${i}`, 'g'), args[i] || '');
            }
            // $0 or $& for full match
            output = output.replace(/\$0|\$&/g, args[0]);
            return output;
        });

        return { result, count };
    } catch (err) {
        return {
            result: text,
            count: 0,
            error: err instanceof Error ? err.message : 'Error en el reemplazo'
        };
    }
}

/**
 * Extract list of matches
 */
function extractList(text: string, regex: RegExp): string[] {
    const matches: string[] = [];
    const safeRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
    let match;

    while ((match = safeRegex.exec(text)) !== null) {
        matches.push(match[0]);
        if (match[0].length === 0) safeRegex.lastIndex++;
        if (matches.length >= 1000) break;
    }

    return matches;
}

export function SubstitutionPanel({ regex, flags, testString, mode, onModeChange }: SubstitutionPanelProps) {
    const [replacement, setReplacement] = useState('');
    const [copied, setCopied] = useState(false);

    // Compute result based on mode
    const result = useMemo(() => {
        if (!regex || !testString) return null;

        try {
            const re = new RegExp(regex, flags);

            if (mode === 'substitution') {
                return safeSubstitute(testString, re, replacement);
            }

            if (mode === 'list') {
                const list = extractList(testString, re);
                return { list, count: list.length };
            }

            return null;
        } catch (err) {
            return { error: err instanceof Error ? err.message : 'Error' };
        }
    }, [regex, flags, testString, mode, replacement]);

    // Copy result
    const copyResult = useCallback(() => {
        if (!result) return;

        let text = '';
        if ('result' in result) {
            text = result.result;
        } else if ('list' in result && result.list) {
            text = result.list.join('\\n');
        }

        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }, [result]);

    return (
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            {/* Mode Toggle */}
            <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center text-xs">⚡</span>
                <h3 className="text-sm font-medium text-white">Modo</h3>
                <div className="ml-auto flex rounded-lg bg-black/30 p-0.5">
                    {(['match', 'substitution', 'list'] as RegexMode[]).map((m) => (
                        <button
                            key={m}
                            onClick={() => onModeChange(m)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mode === m
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                : 'text-neutral-500 hover:text-neutral-300'
                                }`}
                        >
                            {m === 'match' && '🔍 Match'}
                            {m === 'substitution' && '🔄 Replace'}
                            {m === 'list' && '📋 List'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Substitution Mode Content */}
            <AnimatePresence mode="wait">
                {mode === 'substitution' && (
                    <motion.div
                        key="substitution"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                    >
                        {/* Replacement Input */}
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1.5">
                                Patrón de reemplazo
                                <span className="text-neutral-600 ml-2">$1, $2... para grupos</span>
                            </label>
                            <input
                                type="text"
                                value={replacement}
                                onChange={(e) => setReplacement(e.target.value)}
                                placeholder="Ej: [$1] en [$2]"
                                maxLength={MAX_REPLACEMENT_LENGTH}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-neutral-600 focus:ring-2 focus:ring-orange-500/50 outline-none"
                            />
                            <p className="text-[10px] text-neutral-600 mt-1">
                                {replacement.length}/{MAX_REPLACEMENT_LENGTH} caracteres
                            </p>
                        </div>

                        {/* Result */}
                        {result && 'result' in result && (
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs text-neutral-500">
                                        Resultado
                                        <span className="text-green-400 ml-2">{result.count} reemplazo{result.count !== 1 ? 's' : ''}</span>
                                    </label>
                                    <button
                                        onClick={copyResult}
                                        className={`text-xs px-2 py-1 rounded transition-colors ${copied ? 'text-green-400' : 'text-neutral-500 hover:text-white'
                                            }`}
                                    >
                                        {copied ? '✓ Copiado' : 'Copiar'}
                                    </button>
                                </div>
                                <div className="bg-black/40 border border-white/10 rounded-lg p-3 max-h-32 overflow-auto">
                                    <pre className="text-sm text-white font-mono whitespace-pre-wrap break-all">
                                        {result.result}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {result && 'error' in result && (
                            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                                {result.error}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* List Mode Content */}
                {mode === 'list' && (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                    >
                        {result && 'list' in result && result.list && (
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs text-neutral-500">
                                        Coincidencias extraídas
                                        <span className="text-blue-400 ml-2">{result.count} elementos</span>
                                    </label>
                                    <button
                                        onClick={copyResult}
                                        className={`text-xs px-2 py-1 rounded transition-colors ${copied ? 'text-green-400' : 'text-neutral-500 hover:text-white'
                                            }`}
                                    >
                                        {copied ? '✓ Copiado' : 'Copiar lista'}
                                    </button>
                                </div>
                                <div className="bg-black/40 border border-white/10 rounded-lg p-3 max-h-40 overflow-auto">
                                    {result.list.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {result.list.slice(0, 100).map((item, i) => (
                                                <span
                                                    key={i}
                                                    className="px-2 py-1 rounded bg-blue-500/10 text-xs font-mono text-blue-400 border border-blue-500/20"
                                                >
                                                    {item.length > 30 ? item.slice(0, 30) + '…' : item}
                                                </span>
                                            ))}
                                            {result.list.length > 100 && (
                                                <span className="px-2 py-1 text-xs text-neutral-500">
                                                    +{result.list.length - 100} más
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-neutral-600">No hay coincidencias</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Match Mode - Just info */}
                {mode === 'match' && (
                    <motion.div
                        key="match"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-neutral-500"
                    >
                        Modo Match: Los resultados se muestran en el panel de texto.
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
