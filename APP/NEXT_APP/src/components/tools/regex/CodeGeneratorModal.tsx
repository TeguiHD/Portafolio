"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CodeGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    regex: string;
    flags: string;
    mode: 'match' | 'substitution' | 'list';
    replacement?: string;
    onGenerateCode: (language: string) => Promise<string | null>;
    isGenerating: boolean;
}

const LANGUAGES = [
    { id: 'javascript', name: 'JavaScript', icon: '🟨' },
    { id: 'typescript', name: 'TypeScript', icon: '🔷' },
    { id: 'python', name: 'Python', icon: '🐍' },
    { id: 'php', name: 'PHP', icon: '🐘' },
    { id: 'java', name: 'Java', icon: '☕' },
    { id: 'csharp', name: 'C#', icon: '🟣' },
];

export function CodeGeneratorModal({
    isOpen,
    onClose,
    regex,
    flags,
    mode,
    replacement,
    onGenerateCode,
    isGenerating,
}: CodeGeneratorModalProps) {
    const [selectedLanguage, setSelectedLanguage] = useState('javascript');
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setError(null);
        setGeneratedCode(null);

        const code = await onGenerateCode(selectedLanguage);
        if (code) {
            setGeneratedCode(code);
        } else {
            setError('No se pudo generar el código. Intenta de nuevo.');
        }
    };

    const copyCode = () => {
        if (!generatedCode) return;
        navigator.clipboard.writeText(generatedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const handleClose = () => {
        setGeneratedCode(null);
        setError(null);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl"
                    >
                        <div className="bg-[#0F1724] border border-white/10 rounded-2xl shadow-2xl overflow-hidden m-4">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center text-sm">💻</span>
                                    <div>
                                        <h2 className="text-white font-medium">Generar Código</h2>
                                        <p className="text-xs text-neutral-500">Genera código listo para usar</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-4">
                                {/* Regex Preview */}
                                <div className="bg-black/30 rounded-lg p-3">
                                    <p className="text-[10px] text-neutral-600 mb-1">REGEX</p>
                                    <code className="text-sm font-mono text-blue-400">
                                        /{regex}/{flags}
                                    </code>
                                    {mode === 'substitution' && replacement && (
                                        <>
                                            <p className="text-[10px] text-neutral-600 mt-2 mb-1">REEMPLAZO</p>
                                            <code className="text-sm font-mono text-orange-400">{replacement}</code>
                                        </>
                                    )}
                                </div>

                                {/* Language Selection */}
                                <div>
                                    <p className="text-xs text-neutral-500 mb-2">Selecciona el lenguaje:</p>
                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                        {LANGUAGES.map((lang) => (
                                            <button
                                                key={lang.id}
                                                onClick={() => setSelectedLanguage(lang.id)}
                                                className={`p-2 rounded-lg text-center transition-all ${selectedLanguage === lang.id
                                                        ? 'bg-purple-500/20 border-2 border-purple-500/50 text-white'
                                                        : 'bg-white/5 border border-white/10 text-neutral-400 hover:bg-white/10'
                                                    }`}
                                            >
                                                <span className="text-lg">{lang.icon}</span>
                                                <p className="text-[10px] mt-1">{lang.name}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Generate Button */}
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !regex}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                >
                                    {isGenerating ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Generando con IA...
                                        </>
                                    ) : (
                                        <>✨ Generar Código</>
                                    )}
                                </button>

                                {/* Error */}
                                {error && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                        {error}
                                    </div>
                                )}

                                {/* Generated Code */}
                                {generatedCode && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-green-400">✓ Código generado</p>
                                            <button
                                                onClick={copyCode}
                                                className={`text-xs px-3 py-1 rounded-lg transition-colors ${copied
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-white/10 text-neutral-400 hover:text-white'
                                                    }`}
                                            >
                                                {copied ? '✓ Copiado' : 'Copiar código'}
                                            </button>
                                        </div>
                                        <div className="bg-[#0a0e17] rounded-lg border border-white/10 max-h-64 overflow-auto">
                                            <pre className="p-4 text-sm font-mono text-neutral-300 whitespace-pre-wrap">
                                                {generatedCode}
                                            </pre>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-white/10 bg-black/20">
                                <p className="text-[10px] text-neutral-600 text-center">
                                    💡 El código generado es un punto de partida. Revisa y adapta según tus necesidades.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
