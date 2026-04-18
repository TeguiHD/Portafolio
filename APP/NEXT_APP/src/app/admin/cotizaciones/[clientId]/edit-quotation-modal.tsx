"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import { X, Save, Loader2, Code, FileText, Eye, RefreshCw, AlertTriangle, Copy, Check, ExternalLink, Search, ChevronUp, ChevronDown } from "lucide-react";
import { getQuotationForEditAction, updateQuotationAction } from "./actions";
import { toast } from "sonner";
import { transpileLatexToHtml } from "@/lib/latex-to-html";

interface EditQuotationModalProps {
    isOpen: boolean;
    quotationId: string;
    onClose: () => void;
}

// ─── Ctrl+F Finder ────────────────────────────────────────
function CodeFinder({
    value,
    onChange,
    placeholder,
    rows = 14,
    className,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    rows?: number;
    className?: string;
}) {
    const [showFinder, setShowFinder] = useState(false);
    const [query, setQuery] = useState("");
    const [matchIdx, setMatchIdx] = useState(0);
    const [matches, setMatches] = useState<number[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const queryRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!query) { setMatches([]); setMatchIdx(0); return; }
        const q = query.toLowerCase();
        const text = value.toLowerCase();
        const found: number[] = [];
        let start = 0;
        while (true) {
            const idx = text.indexOf(q, start);
            if (idx === -1) break;
            found.push(idx);
            start = idx + 1;
        }
        setMatches(found);
        setMatchIdx(0);
    }, [query, value]);

    const jumpTo = useCallback((idx: number) => {
        const ta = textareaRef.current;
        if (!ta || matches.length === 0) return;
        const pos = matches[idx];
        ta.focus();
        ta.setSelectionRange(pos, pos + query.length);
        const lineHeight = 18;
        const lines = value.substring(0, pos).split("\n").length - 1;
        ta.scrollTop = Math.max(0, lines * lineHeight - ta.clientHeight / 2);
    }, [matches, query, value]);

    useEffect(() => { if (matches.length > 0) jumpTo(matchIdx); }, [matchIdx, matches, jumpTo]);

    const next = () => setMatchIdx(i => (i + 1) % matches.length);
    const prev = () => setMatchIdx(i => (i - 1 + matches.length) % matches.length);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "f") {
            e.preventDefault();
            setShowFinder(v => {
                if (!v) setTimeout(() => queryRef.current?.focus(), 50);
                return !v;
            });
        }
    };

    const handleFinderKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") { if (e.shiftKey) prev(); else next(); }
        if (e.key === "Escape") { setShowFinder(false); setQuery(""); }
    };

    return (
        <div className="relative">
            {showFinder && (
                <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 shadow-xl">
                    <Search size={13} className="text-slate-400 shrink-0" />
                    <input
                        ref={queryRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleFinderKey}
                        placeholder="Buscar..."
                        className="bg-transparent text-white text-xs outline-none w-32 placeholder:text-slate-500"
                    />
                    {query && (
                        <span className="text-[10px] text-slate-400 shrink-0 min-w-[48px] text-center">
                            {matches.length === 0 ? "0/0" : `${matchIdx + 1}/${matches.length}`}
                        </span>
                    )}
                    <button type="button" onClick={prev} disabled={matches.length === 0} className="p-0.5 hover:text-white text-slate-400 disabled:opacity-30"><ChevronUp size={14} /></button>
                    <button type="button" onClick={next} disabled={matches.length === 0} className="p-0.5 hover:text-white text-slate-400 disabled:opacity-30"><ChevronDown size={14} /></button>
                    <button type="button" onClick={() => { setShowFinder(false); setQuery(""); }} className="p-0.5 hover:text-white text-slate-400 ml-1"><X size={13} /></button>
                </div>
            )}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={e => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={rows}
                placeholder={placeholder}
                className={className}
            />
            <p className="text-[10px] text-slate-600 mt-1 text-right select-none">Ctrl+F para buscar</p>
        </div>
    );
}

// ─── LaTeX live preview ────────────────────────────────────
function LatexPreviewPane({ latex }: { latex: string }) {
    const [result, setResult] = useState<{ html: string; errors: Array<{ line: number; message: string }>; warnings: string[] } | null>(null);
    const [loading, setLoading] = useState(false);

    const compile = useCallback(() => {
        if (!latex.trim()) { setResult(null); return; }
        setLoading(true);
        try {
            const out = transpileLatexToHtml(latex, { standalone: true });
            setResult({ html: out.html, errors: out.errors, warnings: out.warnings });
        } finally {
            setLoading(false);
        }
    }, [latex]);

    useEffect(() => {
        const t = setTimeout(compile, 400);
        return () => clearTimeout(t);
    }, [compile]);

    return (
        <div className="flex flex-col h-64 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800">
                <span className="text-[11px] text-slate-500 font-mono">nicoholas-latex engine · HTML</span>
                <button type="button" onClick={compile} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors">
                    <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                    {loading ? "Compilando…" : "Re-compilar"}
                </button>
            </div>
            <div className="flex-1 relative overflow-hidden">
                {!latex.trim() && <p className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm">Preview aquí</p>}
                {loading && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-10"><Loader2 className="animate-spin text-violet-400" size={22} /></div>}
                {result?.errors && result.errors.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-red-950/80 px-3 py-1.5 z-10">
                        {result.errors.slice(0, 2).map((e, i) => (
                            <div key={i} className="flex items-center gap-1 text-[10px] text-red-400 font-mono">
                                <AlertTriangle size={10} className="shrink-0" />
                                Línea {e.line}: {e.message}
                            </div>
                        ))}
                    </div>
                )}
                {result && (
                    <iframe
                        srcDoc={result.html}
                        className="w-full h-full border-0 bg-white"
                        title="LaTeX Preview"
                        sandbox="allow-same-origin"
                    />
                )}
            </div>
        </div>
    );
}

// ─── Main edit modal ────────────────────────────────────────
export default function EditQuotationModal({ isOpen, quotationId, onClose }: EditQuotationModalProps) {
    const [isPending, startTransition] = useTransition();
    const [isLoading, setIsLoading] = useState(true);
    const [tab, setTab] = useState<"html" | "latex">("html");
    const [latexCode, setLatexCode] = useState("");
    const [isConvertingLatex, setIsConvertingLatex] = useState(false);
    const [copied, setCopied] = useState(false);

    const [formData, setFormData] = useState({
        projectName: "",
        total: 0,
        notes: "",
        htmlContent: "",
    });
    const [folio, setFolio] = useState("");

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            getQuotationForEditAction(quotationId).then((result) => {
                if (result.success && result.data) {
                    setFormData({
                        projectName: result.data.projectName || "",
                        total: result.data.total || 0,
                        notes: result.data.notes || "",
                        htmlContent: result.data.htmlContent || "",
                    });
                    setFolio(result.data.folio || "");
                } else {
                    toast.error(result.error || "Error al cargar cotización");
                    onClose();
                }
                setIsLoading(false);
            });
        }
    }, [isOpen, quotationId, onClose]);

    const openOverleaf = () => {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = "https://www.overleaf.com/docs";
        form.target = "_blank";
        form.style.display = "none";
        const snip = document.createElement("input");
        snip.type = "hidden"; snip.name = "snip"; snip.value = latexCode;
        form.appendChild(snip);
        const eng = document.createElement("input");
        eng.type = "hidden"; eng.name = "engine"; eng.value = "lualatex";
        form.appendChild(eng);
        document.body.appendChild(form);
        form.submit();
        setTimeout(() => document.body.removeChild(form), 1000);
    };

    const copyLatex = async () => {
        await navigator.clipboard.writeText(latexCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (tab === "latex") {
            if (!latexCode.trim()) { toast.error("El editor LaTeX está vacío"); return; }
            setIsConvertingLatex(true);
            try {
                const out = transpileLatexToHtml(latexCode, { standalone: true });
                if (out.errors.length > 0) {
                    toast.warning(`Se guardará con ${out.errors.length} error(es) detectado(s). Revisa el preview.`);
                }
                setIsConvertingLatex(false);
                saveHtml(out.html);
            } catch (e: unknown) {
                setIsConvertingLatex(false);
                toast.error("Error LaTeX: " + (e instanceof Error ? e.message : "desconocido"));
            }
            return;
        }

        saveHtml(formData.htmlContent);
    };

    const saveHtml = (htmlContent: string) => {
        startTransition(async () => {
            const result = await updateQuotationAction(quotationId, {
                projectName: formData.projectName,
                total: formData.total,
                notes: formData.notes || undefined,
                htmlContent: htmlContent || undefined,
            });
            if (result.success) {
                toast.success("Cotización actualizada correctamente");
                onClose();
            } else {
                toast.error(result.error || "Error al actualizar cotización");
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
                    <h3 className="text-xl font-bold text-white">
                        Editar Cotización {folio && <span className="text-slate-400 font-mono text-base ml-2">#{folio}</span>}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 size={32} className="animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {/* Project Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Nombre del Proyecto</label>
                                <input
                                    type="text"
                                    value={formData.projectName}
                                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required maxLength={200}
                                />
                            </div>

                            {/* Total */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Total (CLP)</label>
                                <input
                                    type="number"
                                    value={formData.total}
                                    onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    min={0} required
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Notas internas</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px] resize-none"
                                    maxLength={1000}
                                    placeholder="Notas privadas (no visibles para el cliente)"
                                />
                            </div>

                            {/* Code Content: Tabs */}
                            <div>
                                <div className="flex items-center gap-1 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setTab("html")}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "html"
                                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                            : "text-slate-400 hover:text-white border border-transparent"}`}
                                    >
                                        <Code size={14} /> Contenido HTML
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTab("latex")}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "latex"
                                            ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                                            : "text-slate-400 hover:text-white border border-transparent"}`}
                                    >
                                        <FileText size={14} /> Editor LaTeX
                                        <span className="px-1.5 py-0.5 rounded-full bg-violet-500/30 text-violet-400 text-[9px] font-bold">NUEVO</span>
                                    </button>
                                </div>

                                {tab === "html" && (
                                    <div>
                                        <CodeFinder
                                            value={formData.htmlContent}
                                            onChange={(v) => setFormData({ ...formData, htmlContent: v })}
                                            rows={12}
                                            placeholder="<div>Contenido de la cotización...</div>"
                                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm resize-none"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">Solo se permiten etiquetas HTML seguras.</p>
                                    </div>
                                )}

                                {tab === "latex" && (
                                    <div className="space-y-3">
                                        {/* LaTeX toolbar */}
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-slate-400">Pega tu código LaTeX. Al guardar se compilará a HTML automáticamente.</p>
                                            <div className="flex gap-2">
                                                <button type="button" onClick={openOverleaf}
                                                    className="flex items-center gap-1.5 text-[11px] text-green-400 hover:text-green-300 border border-green-500/30 rounded px-2 py-1 transition-colors">
                                                    <ExternalLink size={11} /> Overleaf
                                                </button>
                                                <button type="button" onClick={copyLatex}
                                                    className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white border border-slate-700 rounded px-2 py-1 transition-colors">
                                                    {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />} Copiar
                                                </button>
                                            </div>
                                        </div>
                                        <CodeFinder
                                            value={latexCode}
                                            onChange={setLatexCode}
                                            rows={12}
                                            placeholder={`\\documentclass{article}\n\\begin{document}\n\\title{Cotización}\n\\maketitle\n\\section{Alcance}\n\\end{document}`}
                                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-violet-300 placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-sm resize-none"
                                        />
                                        {/* Live preview */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Eye size={13} className="text-slate-400" />
                                                <span className="text-xs text-slate-400 font-medium">Vista Previa (live, 900ms debounce)</span>
                                            </div>
                                            <LatexPreviewPane latex={latexCode} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 p-4 border-t border-slate-700 shrink-0">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isPending || isConvertingLatex}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isPending || isConvertingLatex}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {(isPending || isConvertingLatex) ? (
                                    <><Loader2 size={16} className="animate-spin" />{isConvertingLatex ? "Compilando…" : "Guardando…"}</>
                                ) : (
                                    <><Save size={16} />Guardar cambios</>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
