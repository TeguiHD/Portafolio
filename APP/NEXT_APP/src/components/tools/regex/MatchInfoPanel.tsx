"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Types
export interface MatchInfo {
    fullMatch: string;
    index: number;
    length: number;
    groups: Record<string, string>;
    groupsArray: string[];
}

interface MatchInfoPanelProps {
    regex: string;
    flags: string;
    testString: string;
    onMatchClick?: (index: number, length: number) => void;
}

// Constants
const MAX_MATCHES = 1000;
const MAX_DISPLAY_LENGTH = 50;

/**
 * Extract matches with full details including groups
 */
function extractMatches(regex: RegExp, text: string): MatchInfo[] {
    const matches: MatchInfo[] = [];

    try {
        // Clone regex to avoid issues with global flag
        const safeRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
        let match;

        while ((match = safeRegex.exec(text)) !== null) {
            matches.push({
                fullMatch: match[0],
                index: match.index,
                length: match[0].length,
                groups: match.groups || {},
                groupsArray: match.slice(1),
            });

            // Prevent infinite loop for zero-width matches
            if (match[0].length === 0) {
                safeRegex.lastIndex++;
            }

            // Safety limit
            if (matches.length >= MAX_MATCHES) break;
        }
    } catch {
        // Invalid regex - return empty
    }

    return matches;
}

/**
 * Truncate text with ellipsis
 */
function truncate(text: string, maxLength: number = MAX_DISPLAY_LENGTH): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 1) + "…";
}

export function MatchInfoPanel({ regex, flags, testString, onMatchClick }: MatchInfoPanelProps) {
    // Extract matches
    const matchDetails = useMemo(() => {
        if (!regex || !testString) return [];

        try {
            const re = new RegExp(regex, flags);
            return extractMatches(re, testString);
        } catch {
            return [];
        }
    }, [regex, flags, testString]);

    // No matches state
    if (!regex || !testString) {
        return (
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-xs">📊</span>
                    <h3 className="text-sm font-medium text-white">Match Information</h3>
                </div>
                <p className="text-xs text-neutral-500">Ingresa una regex y texto para ver detalles de coincidencias.</p>
            </div>
        );
    }

    // Error or no matches
    if (matchDetails.length === 0) {
        return (
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-xs">📊</span>
                    <h3 className="text-sm font-medium text-white">Match Information</h3>
                </div>
                <p className="text-xs text-neutral-500">No hay coincidencias.</p>
            </div>
        );
    }

    return (
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-xs">📊</span>
                    <h3 className="text-sm font-medium text-white">Match Information</h3>
                </div>
                <span className="text-xs text-blue-400">
                    {matchDetails.length} coincidencia{matchDetails.length !== 1 ? 's' : ''}
                    {matchDetails.length >= MAX_MATCHES && <span className="text-orange-400"> (máx)</span>}
                </span>
            </div>

            {/* Matches List */}
            <div className="max-h-64 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <AnimatePresence mode="popLayout">
                    {matchDetails.map((match, i) => (
                        <motion.div
                            key={`${i}-${match.index}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: Math.min(i * 0.03, 0.5) }}
                            onClick={() => onMatchClick?.(match.index, match.length)}
                            className="bg-black/30 rounded-lg p-3 border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all cursor-pointer group"
                        >
                            {/* Match Header */}
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-blue-400">Match {i + 1}</span>
                                <span className="text-[10px] text-neutral-600 group-hover:text-neutral-400 transition-colors">
                                    Índice: {match.index}-{match.index + match.length}
                                </span>
                            </div>

                            {/* Full Match */}
                            <div className="font-mono text-sm text-white bg-blue-500/10 rounded px-2 py-1 break-all">
                                {truncate(match.fullMatch)}
                            </div>

                            {/* Groups */}
                            {match.groupsArray.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                                    {match.groupsArray.map((group, gi) => (
                                        <div key={gi} className="flex items-center gap-2 text-xs">
                                            <span className="text-neutral-500 min-w-[60px]">Grupo {gi + 1}:</span>
                                            <span className="font-mono text-green-400 bg-green-500/10 rounded px-1.5 py-0.5 break-all">
                                                {group ? truncate(group, 30) : <span className="text-neutral-600 italic">vacío</span>}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Named Groups */}
                            {Object.keys(match.groups).length > 0 && (
                                <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                                    {Object.entries(match.groups).map(([name, value]) => (
                                        <div key={name} className="flex items-center gap-2 text-xs">
                                            <span className="text-cyan-400 min-w-[60px]">{name}:</span>
                                            <span className="font-mono text-green-400 bg-green-500/10 rounded px-1.5 py-0.5">
                                                {value ? truncate(value, 30) : <span className="text-neutral-600 italic">vacío</span>}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
