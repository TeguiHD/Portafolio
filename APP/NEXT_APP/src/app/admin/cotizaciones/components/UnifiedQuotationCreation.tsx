"use client";

import { useState, useTransition, useRef, useCallback, useEffect, useMemo } from "react";
import {
    Plus, Search, ArrowRight, X, Code, Globe, Lock, Loader2,
    Copy, Check, ExternalLink, Sparkles, FileText, SearchIcon,
    ChevronDown, ChevronUp, AlertTriangle, Eye, RefreshCw, Maximize2, Minimize2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createInitialQuotationData, QuotationData } from "../../../../modules/quotations/types";
import QuotationWorkspace from "../quotation-workspace";
import { createQuotationAction } from "../[clientId]/actions";
import { toast } from "sonner";
import { transpileLatexToHtml } from "@/lib/latex-to-html";

interface Client {
    id: string;
    name: string;
    email: string | null;
    slug: string;
}

interface Props {
    clients?: Client[];
    preSelectedClient?: Client;
    onClose: () => void;
    onSuccess?: () => void;
}

type Step = "select-client" | "choose-mode" | "workspace" | "code-embed" | "latex-embed";

// ─────────────────────────────────────────────
// Quick-start LaTeX template (uses commands the transpiler supports well).
// ─────────────────────────────────────────────
const LATEX_STARTER_TEMPLATE = String.raw`\documentclass{article}
\usepackage{xcolor}

\definecolor{brandblue}{HTML}{4F46E5}
\definecolor{cardbg}{HTML}{F8FAFC}
\definecolor{cardborder}{HTML}{E2E8F0}
\definecolor{textlight}{HTML}{64748B}

\begin{document}

\begin{center}
    {\LARGE \textbf{\textcolor{brandblue}{Propuesta Comercial}}}\\[4pt]
    {\small \textcolor{textlight}{Folio TEX-2026-001 \textbar{} Nicoholas Lopetegui}}
\end{center}

\vspace{0.5cm}

\section*{Alcance del proyecto}
Desarrollo de plataforma web con arquitectura Next.js 15 (App Router),
Prisma y PostgreSQL. Incluye panel administrativo, auth segura y deploy a VPS.

\begin{tcbraster}[raster columns=2]

\begin{tcolorbox}[colback=cardbg, colframe=cardborder, arc=8pt]
    \textbf{Entregables}
    \begin{itemize}
        \item Frontend responsive (mobile + desktop)
        \item Panel admin con RBAC
        \item CI/CD + deploy automatizado
        \item 1 mes soporte post-lanzamiento
    \end{itemize}
\end{tcolorbox}

\begin{tcolorbox}[colback=cardbg, colframe=cardborder, arc=8pt]
    \textbf{Inversión}\\[6pt]
    {\Large \textbf{\textcolor{brandblue}{\$1.200.000 CLP}}}\\[4pt]
    {\footnotesize Pagadero en 2 cuotas: 50\% al iniciar, 50\% al entregar.}
\end{tcolorbox}

\end{tcbraster}

\vspace{0.6cm}

\section*{Garantía y soporte}
\begin{itemize}
    \item \textbf{Propiedad 100\% del cliente:} transferencia total de
      dominio, hosting y código al segundo pago.
    \item \textbf{Soporte técnico:} 1 mes gratuito para ajustes menores.
    \item \textbf{Actualizaciones de seguridad:} parches críticos cubiertos
      durante el primer trimestre.
\end{itemize}

\vspace{0.5cm}

\noindent\textcolor{cardborder}{\rule{\textwidth}{0.5pt}}\\[4pt]
{\footnotesize \textcolor{textlight}{Nicoholas Lopetegui \textbullet{} Soluciones Digitales 2026}}

\end{document}`;

// ─────────────────────────────────────────────
// Code editor with line numbers + Ctrl+F finder
// ─────────────────────────────────────────────
function CodeFinder({
    value,
    onChange,
    placeholder,
    rows = 14,
    className,
    name,
    required,
    showLineNumbers = true,
    highlightLines,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    rows?: number;
    className?: string;
    name?: string;
    required?: boolean;
    showLineNumbers?: boolean;
    highlightLines?: number[];
}) {
    const [showFinder, setShowFinder] = useState(false);
    const [query, setQuery] = useState("");
    const [matchIdx, setMatchIdx] = useState(0);
    const [matches, setMatches] = useState<number[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const queryRef = useRef<HTMLInputElement>(null);
    const gutterRef = useRef<HTMLDivElement>(null);

    // Build match list whenever query/value change
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

    // Jump to match in textarea
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

    // Ctrl+F intercept; Tab inserts spaces instead of losing focus
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
            e.preventDefault();
            setShowFinder(v => {
                if (!v) setTimeout(() => queryRef.current?.focus(), 50);
                return !v;
            });
            return;
        }
        if (e.key === "Tab") {
            e.preventDefault();
            const ta = e.currentTarget;
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            const newVal = value.substring(0, start) + "  " + value.substring(end);
            onChange(newVal);
            requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
            return;
        }
        if (e.key === "Escape" && showFinder) {
            e.preventDefault();
            setShowFinder(false);
            setQuery("");
        }
    };

    const handleFinderKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            if (e.shiftKey) prev(); else next();
        }
        if (e.key === "Escape") { setShowFinder(false); setQuery(""); }
    };

    const syncGutterScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    };

    const lineCount = Math.max(value.split("\n").length, rows);
    const lineSet = new Set(highlightLines || []);

    return (
        <div className="relative">
            {/* Finder bar */}
            {showFinder && (
                <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 shadow-xl">
                    <SearchIcon size={13} className="text-slate-400 shrink-0" />
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

            <div className="flex rounded-lg overflow-hidden border border-slate-800 bg-slate-950 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500">
                {showLineNumbers && (
                    <div
                        ref={gutterRef}
                        aria-hidden="true"
                        className="select-none text-right font-mono text-[11px] leading-[18px] text-slate-600 bg-slate-900/80 border-r border-slate-800 px-2 py-4 overflow-hidden"
                        style={{ minWidth: "3ch" }}
                    >
                        {Array.from({ length: lineCount }).map((_, i) => (
                            <div
                                key={i}
                                className={lineSet.has(i + 1) ? "text-red-400 font-bold" : ""}
                            >{i + 1}</div>
                        ))}
                    </div>
                )}
                <textarea
                    ref={textareaRef}
                    name={name}
                    required={required}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onScroll={syncGutterScroll}
                    rows={rows}
                    placeholder={placeholder}
                    spellCheck={false}
                    className={className + " leading-[18px]"}
                />
            </div>
            <p className="text-[10px] text-slate-600 mt-1 text-right">
                {value.length > 0 ? `${lineCount} líneas · ${value.length} caracteres · ` : ""}
                Ctrl+F para buscar · Tab inserta 2 espacios
            </p>
        </div>
    );
}

// ─────────────────────────────────────────────
// LaTeX live preview using custom transpiler (no latex.js).
// Renders a fully-styled HTML document inside a sandboxed iframe.
// ─────────────────────────────────────────────
type PreviewResult = {
    html: string;
    warnings: string[];
    errors: Array<{ line: number; message: string }>;
};

function LatexPreviewFrame({
    latex,
    onResult,
}: {
    latex: string;
    onResult?: (r: PreviewResult) => void;
}) {
    const [result, setResult] = useState<PreviewResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);

    const compile = useCallback(() => {
        if (!latex.trim()) { setResult(null); onResult?.({ html: "", warnings: [], errors: [] }); return; }
        setLoading(true);
        try {
            const out = transpileLatexToHtml(latex, { standalone: true });
            const payload = { html: out.html, warnings: out.warnings, errors: out.errors };
            setResult(payload);
            onResult?.(payload);
        } finally {
            setLoading(false);
        }
    }, [latex, onResult]);

    useEffect(() => {
        const t = setTimeout(compile, 400);
        return () => clearTimeout(t);
    }, [compile]);

    const box = (
        <div className={`flex flex-col bg-slate-950 rounded-xl border border-slate-800 overflow-hidden ${fullscreen ? "fixed inset-4 z-[60]" : "h-full min-h-[300px]"}`}>
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                    <span className="ml-2 text-[11px] text-slate-500 font-mono">nicoholas-latex engine · HTML</span>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={compile}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors">
                        <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                        {loading ? "Compilando…" : "Re-compilar"}
                    </button>
                    <button type="button" onClick={() => setFullscreen(f => !f)}
                        className="text-slate-400 hover:text-white transition-colors"
                        aria-label="Pantalla completa">
                        {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    </button>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden">
                {!latex.trim() && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 gap-2">
                        <FileText size={28} strokeWidth={1.2} />
                        <p className="text-sm">El preview aparece aquí</p>
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

            {result && (result.warnings.length > 0 || result.errors.length > 0) && (
                <div className="border-t border-slate-800 max-h-28 overflow-y-auto px-3 py-2 text-[11px] font-mono bg-slate-900/60 shrink-0">
                    {result.errors.map((e, i) => (
                        <div key={`e${i}`} className="text-red-400 flex gap-2">
                            <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                            <span>Línea {e.line}: {e.message}</span>
                        </div>
                    ))}
                    {result.warnings.slice(0, 8).map((w, i) => (
                        <div key={`w${i}`} className="text-amber-400/80">⚠ {w}</div>
                    ))}
                    {result.warnings.length > 8 && (
                        <div className="text-slate-500">+{result.warnings.length - 8} avisos más</div>
                    )}
                </div>
            )}
        </div>
    );
    return box;
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function UnifiedQuotationCreation({ clients = [], preSelectedClient, onClose, onSuccess }: Props) {
    const router = useRouter();
    const [step, setStep] = useState<Step>(preSelectedClient ? "choose-mode" : "select-client");
    const [selectedClient, setSelectedClient] = useState<Client | null>(preSelectedClient || null);

    // Search state for client selection
    const [searchTerm, setSearchTerm] = useState("");

    // Initial Data State for Workspace
    const [initialData, setInitialData] = useState<QuotationData>(createInitialQuotationData());

    // Filter clients
    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleClientSelect = (client: Client) => {
        setSelectedClient(client);
        setInitialData(prev => ({
            ...prev,
            clientName: client.name,
            clientEmail: client.email || ""
        }));
        setStep("choose-mode");
    };

    const handleCreateClient = () => {
        router.push("/admin/clientes");
    };

    // --- SHARED SUBMIT LOGIC ---
    const [accessMode, setAccessMode] = useState<"public" | "code">("code");
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<{ link: string; code?: string } | null>(null);
    const [copied, setCopied] = useState(false);

    // HTML embed state
    const [htmlCode, setHtmlCode] = useState("");

    // LaTeX embed state
    const [latexCode, setLatexCode] = useState("");
    const [isConvertingLatex, setIsConvertingLatex] = useState(false);
    const [latexPreview, setLatexPreview] = useState<PreviewResult | null>(null);
    const latexErrorLines = useMemo(
        () => (latexPreview?.errors || []).map(e => e.line),
        [latexPreview]
    );

    // Shared form state (folio / projectName / codeDuration)
    const [folio, setFolio] = useState("");
    const [projectName, setProjectName] = useState("");
    const [codeDuration, setCodeDuration] = useState("15d");

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Open code in Overleaf
    const openOverleaf = () => {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = "https://www.overleaf.com/docs";
        form.target = "_blank";
        form.style.display = "none";
        const snip = document.createElement("input");
        snip.type = "hidden";
        snip.name = "snip";
        snip.value = latexCode;
        form.appendChild(snip);
        const eng = document.createElement("input");
        eng.type = "hidden";
        eng.name = "engine";
        eng.value = "lualatex";
        form.appendChild(eng);
        document.body.appendChild(form);
        form.submit();
        setTimeout(() => document.body.removeChild(form), 1000);
    };

    // Build FormData and call action
    const submitWithHtml = (htmlContent: string) => {
        if (!selectedClient) return;
        if (!folio.trim() || !projectName.trim() || !htmlContent.trim()) {
            toast.error("Completa todos los campos requeridos");
            return;
        }
        const fd = new FormData();
        fd.set("clientId", selectedClient.id);
        fd.set("folio", folio.trim());
        fd.set("projectName", projectName.trim());
        fd.set("htmlContent", htmlContent);
        fd.set("accessMode", accessMode);
        fd.set("codeDuration", codeDuration);

        startTransition(async () => {
            const res = await createQuotationAction(fd);
            if (res.success) {
                toast.success("¡Cotización creada!");
                setResult({ link: res.link!, code: res.accessCode });
                if (onSuccess) onSuccess();
            } else {
                toast.error(res.error || "Error al crear");
            }
        });
    };

    const handleHtmlSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submitWithHtml(htmlCode);
    };

    const handleLatexSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!latexCode.trim()) { toast.error("Pega tu código LaTeX primero"); return; }
        setIsConvertingLatex(true);
        try {
            const out = transpileLatexToHtml(latexCode, { standalone: true });
            if (out.errors.length > 0) {
                toast.warning(`Se publicará con ${out.errors.length} error(es) detectado(s). Revisa el preview.`);
            }
            setIsConvertingLatex(false);
            submitWithHtml(out.html);
        } catch (err: unknown) {
            setIsConvertingLatex(false);
            toast.error("Error al compilar LaTeX: " + (err instanceof Error ? err.message : "desconocido"));
        }
    };
    // ─────────────────────────────────────────────

    // SUCCESS VIEW (shared)
    if (result) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-6">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-8 h-8 text-green-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">¡Cotización Publicada!</h2>
                        <p className="text-slate-400">Comparte el enlace con tu cliente</p>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-4">
                        <p className="text-xs text-slate-500 mb-2">Enlace de acceso:</p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-indigo-400 text-sm break-all">{result.link}</code>
                            <button onClick={() => copyToClipboard(result.link)} className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg transition-colors">
                                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                            </button>
                            <a href={result.link} target="_blank" className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg transition-colors">
                                <ExternalLink size={16} />
                            </a>
                        </div>
                    </div>
                    {result.code && (
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-center">
                            <p className="text-xs text-orange-400 mb-1">Código de acceso (compartir con cliente):</p>
                            <code className="text-2xl font-bold text-white">{result.code}</code>
                        </div>
                    )}
                    <button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-medium transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>
        );
    }

    // ─── STEP 1: SELECT CLIENT ───
    if (step === "select-client") {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl h-[600px]">
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white">Nueva Cotización</h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8">
                        <h3 className="text-2xl font-bold text-white mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Selecciona un Cliente</h3>
                        <div className="relative mb-6 group">
                            <Search className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-lg transition-all"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {filteredClients.map(client => (
                                <button
                                    key={client.id}
                                    onClick={() => handleClientSelect(client)}
                                    className="w-full text-left p-4 rounded-xl bg-slate-800/30 hover:bg-indigo-600/10 border border-transparent hover:border-indigo-500/30 transition-all group flex items-center justify-between"
                                >
                                    <div>
                                        <p className="font-semibold text-white group-hover:text-indigo-300 transition-colors text-lg">{client.name}</p>
                                        <p className="text-sm text-slate-500">{client.email || "Sin email registrado"}</p>
                                    </div>
                                    <div className="bg-slate-800 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
                                        <ArrowRight size={16} className="text-indigo-400" />
                                    </div>
                                </button>
                            ))}
                            {filteredClients.length === 0 && (
                                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
                                    <p className="text-slate-500 mb-4">No se encontraron clientes</p>
                                    <button onClick={handleCreateClient} className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center justify-center gap-2 mx-auto">
                                        <Plus size={16} /> Crear nuevo cliente
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── STEP 2: CHOOSE MODE ───
    if (step === "choose-mode" && selectedClient) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-8 shadow-2xl relative overflow-hidden">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-colors">
                        <X size={24} />
                    </button>
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-white mb-2">Crear Nueva Cotización</h2>
                        <p className="text-slate-400 text-lg">Para: <span className="text-indigo-400 font-semibold">{selectedClient.name}</span></p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
                        {/* Option 1: Builder */}
                        <button
                            onClick={() => setStep("workspace")}
                            className="group relative bg-slate-800/50 hover:bg-indigo-600/10 border border-slate-700 hover:border-indigo-500 rounded-2xl p-7 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col items-center text-center"
                        >
                            <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                                <Sparkles className="w-8 h-8 text-indigo-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-300">Constructor Visual</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Editor inteligente con <strong>Asistencia IA</strong> para crear cotizaciones paso a paso.
                            </p>
                        </button>

                        {/* Option 2: HTML Embedder */}
                        <button
                            onClick={() => setStep("code-embed")}
                            className="group relative bg-slate-800/50 hover:bg-emerald-600/10 border border-slate-700 hover:border-emerald-500 rounded-2xl p-7 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col items-center text-center"
                        >
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                                <Code className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-300">Incrustar HTML</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Pega tu código <strong>HTML/Tailwind</strong> directamente y publícalo al instante.
                            </p>
                        </button>

                        {/* Option 3: LaTeX Embedder */}
                        <button
                            onClick={() => setStep("latex-embed")}
                            className="group relative bg-slate-800/50 hover:bg-violet-600/10 border border-slate-700 hover:border-violet-500 rounded-2xl p-7 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/10 flex flex-col items-center text-center"
                        >
                            <div className="w-16 h-16 bg-violet-500/20 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                                <FileText className="w-8 h-8 text-violet-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-violet-300">Incrustar LaTeX</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Pega código <strong>LaTeX</strong> y previsualiza el documento tipograficamente.
                            </p>
                            <span className="mt-3 px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-400 text-[10px] font-semibold tracking-wide uppercase">Nuevo</span>
                        </button>
                    </div>
                    <div className="mt-8 text-center">
                        <button
                            onClick={() => preSelectedClient ? onClose() : setStep("select-client")}
                            className="text-slate-500 hover:text-white text-sm transition-colors"
                        >
                            Volver atrás
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── STEP 3A: WORKSPACE (Builder) ───
    if (step === "workspace" && selectedClient) {
        return (
            <div className="fixed inset-0 bg-black z-50 animate-in fade-in duration-300">
                <QuotationWorkspace
                    initialData={initialData}
                    clientId={selectedClient.id}
                    clientName={selectedClient.name}
                    onClose={onClose}
                />
            </div>
        );
    }

    // ─── STEP 3B: CODE EMBED (HTML) ───
    if (step === "code-embed" && selectedClient) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-6 border-b border-slate-800">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Code className="text-emerald-400" /> Incrustar Código HTML
                            </h2>
                            <p className="text-sm text-slate-400">Para: {selectedClient.name}</p>
                        </div>
                        <button onClick={() => setStep("choose-mode")} className="text-slate-400 hover:text-white p-2 transition-colors"><X size={20} /></button>
                    </div>

                    <form onSubmit={handleHtmlSubmit} className="p-6 space-y-5">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Folio (ID único)</label>
                                <input
                                    value={folio} onChange={e => setFolio(e.target.value)}
                                    required placeholder="WEB-2026-001"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Nombre del Proyecto</label>
                                <input
                                    value={projectName} onChange={e => setProjectName(e.target.value)}
                                    required placeholder="Plataforma Web"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Access */}
                        <AccessModeSelector mode={accessMode} setMode={setAccessMode} duration={codeDuration} setDuration={setCodeDuration} accentClass="emerald" />

                        {/* HTML Code */}
                        <div>
                            <label className="block text-sm text-slate-400 mb-1 flex items-center gap-2">
                                <Code size={14} /> Código HTML de la Cotización
                            </label>
                            <CodeFinder
                                value={htmlCode}
                                onChange={setHtmlCode}
                                name="htmlContent"
                                required
                                rows={13}
                                placeholder={'<!DOCTYPE html>\n<html>\n  <head>...</head>\n  <body>...</body>\n</html>'}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs font-mono text-green-400 placeholder:text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                            />
                            <p className="text-xs text-slate-500 mt-1">CDNs como Tailwind CSS están permitidos.</p>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-800">
                            <button type="button" onClick={() => setStep("choose-mode")} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-medium transition-colors">Volver</button>
                            <button type="submit" disabled={isPending} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</> : "Publicar Cotización"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // ─── STEP 3C: LATEX EMBED ───
    if (step === "latex-embed" && selectedClient) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-hidden">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl shadow-violet-950/20">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <FileText className="text-violet-400" /> Incrustar Código LaTeX
                            </h2>
                            <p className="text-sm text-slate-400">Para: {selectedClient.name}</p>
                        </div>
                        <button onClick={() => setStep("choose-mode")} className="text-slate-400 hover:text-white p-2 transition-colors"><X size={20} /></button>
                    </div>

                    <form onSubmit={handleLatexSubmit} className="flex flex-col flex-1 overflow-hidden">
                        {/* Meta fields */}
                        <div className="px-6 pt-4 pb-3 border-b border-slate-800/60 shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Folio</label>
                                <input value={folio} onChange={e => setFolio(e.target.value)} required placeholder="TEX-2026-001"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:border-violet-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Nombre del Proyecto</label>
                                <input value={projectName} onChange={e => setProjectName(e.target.value)} required placeholder="Propuesta Técnica"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:border-violet-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Modo de Acceso</label>
                                <select value={accessMode} onChange={e => setAccessMode(e.target.value as "public" | "code")}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-violet-500 outline-none">
                                    <option value="code">Privado (con código)</option>
                                    <option value="public">Público (sin código)</option>
                                </select>
                            </div>
                            {accessMode === "code" && (
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Validez del Código</label>
                                    <select value={codeDuration} onChange={e => setCodeDuration(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-violet-500 outline-none">
                                        <option value="7d">1 Semana</option>
                                        <option value="15d">15 Días</option>
                                        <option value="30d">1 Mes</option>
                                        <option value="indefinite">Indefinido</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Split pane: editor | preview */}
                        <div className="flex flex-1 overflow-hidden">
                            {/* LEFT: Editor */}
                            <div className="flex flex-col w-1/2 border-r border-slate-800 overflow-hidden">
                                {/* Editor toolbar */}
                                <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-800 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Editor LaTeX</span>
                                        <button type="button"
                                            onClick={() => setLatexCode(LATEX_STARTER_TEMPLATE)}
                                            disabled={!!latexCode.trim()}
                                            className="text-[11px] text-violet-400 hover:text-violet-300 border border-violet-500/30 rounded px-2 py-0.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                            Plantilla
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={openOverleaf}
                                            className="flex items-center gap-1.5 text-[11px] text-green-400 hover:text-green-300 border border-green-500/30 rounded px-2 py-1 transition-colors">
                                            <ExternalLink size={11} /> Abrir en Overleaf
                                        </button>
                                        <button type="button" onClick={() => copyToClipboard(latexCode)}
                                            className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white border border-slate-700 rounded px-2 py-1 transition-colors">
                                            {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />} Copiar
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 p-3 overflow-y-auto">
                                    <CodeFinder
                                        value={latexCode}
                                        onChange={setLatexCode}
                                        rows={28}
                                        highlightLines={latexErrorLines}
                                        placeholder={`\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\\begin{document}\n\n\\section{Alcance del Proyecto}\n% Tu contenido aqui\n\n\\end{document}`}
                                        className="flex-1 bg-transparent p-3 text-xs font-mono text-violet-200 placeholder:text-slate-700 outline-none resize-none w-full"
                                    />
                                </div>
                            </div>

                            {/* RIGHT: Preview */}
                            <div className="flex flex-col w-1/2 overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 border-b border-slate-800 shrink-0">
                                    <Eye size={13} className="text-slate-400" />
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Vista Previa</span>
                                    {latexPreview && (
                                        <span className="text-[10px] text-slate-500 ml-2">
                                            {latexPreview.errors.length > 0 && <span className="text-red-400">{latexPreview.errors.length} error(es)</span>}
                                            {latexPreview.errors.length > 0 && latexPreview.warnings.length > 0 && " · "}
                                            {latexPreview.warnings.length > 0 && <span className="text-amber-400/80">{latexPreview.warnings.length} aviso(s)</span>}
                                        </span>
                                    )}
                                    <span className="text-[10px] text-slate-600 ml-auto">400ms debounce</span>
                                </div>
                                <div className="flex-1 p-3 overflow-y-auto">
                                    <LatexPreviewFrame latex={latexCode} onResult={setLatexPreview} />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 px-6 py-4 border-t border-slate-800 shrink-0">
                            <button type="button" onClick={() => setStep("choose-mode")} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-medium transition-colors">
                                Volver
                            </button>
                            <button type="submit" disabled={isPending || isConvertingLatex} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                {(isPending || isConvertingLatex) ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> {isConvertingLatex ? "Compilando LaTeX…" : "Guardando…"}</>
                                ) : (
                                    "Compilar y Publicar"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return null;
}

// ─────────────────────────────────────────────
// Reusable access mode selector
// ─────────────────────────────────────────────
function AccessModeSelector({
    mode, setMode, duration, setDuration, accentClass
}: {
    mode: "public" | "code";
    setMode: (m: "public" | "code") => void;
    duration: string;
    setDuration: (d: string) => void;
    accentClass: string;
}) {
    const accent = {
        emerald: { active: "border-emerald-500 bg-emerald-500/10", icon: "text-emerald-400" },
        violet: { active: "border-violet-500 bg-violet-500/10", icon: "text-violet-400" },
    }[accentClass] ?? { active: "border-indigo-500 bg-indigo-500/10", icon: "text-indigo-400" };

    return (
        <div>
            <label className="block text-sm text-slate-400 mb-3">Modo de Acceso</label>
            <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setMode("public")}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${mode === "public" ? accent.active : "border-slate-700 bg-slate-800/50 hover:border-slate-600"}`}>
                    <Globe className={`w-5 h-5 mb-2 ${mode === "public" ? "text-green-400" : "text-slate-400"}`} />
                    <p className="font-semibold text-white text-sm">Público</p>
                    <p className="text-xs text-slate-400">Sin código requerido</p>
                </button>
                <button type="button" onClick={() => setMode("code")}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${mode === "code" ? accent.active : "border-slate-700 bg-slate-800/50 hover:border-slate-600"}`}>
                    <Lock className={`w-5 h-5 mb-2 ${mode === "code" ? accent.icon : "text-slate-400"}`} />
                    <p className="font-semibold text-white text-sm">Privado</p>
                    <p className="text-xs text-slate-400">Requiere código</p>
                </button>
            </div>
            {mode === "code" && (
                <div className="mt-3">
                    <label className="block text-sm text-slate-400 mb-1">Validez del Código</label>
                    <select value={duration} onChange={e => setDuration(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 outline-none">
                        <option value="7d">1 Semana (7 días)</option>
                        <option value="15d">15 Días</option>
                        <option value="30d">1 Mes (30 días)</option>
                        <option value="indefinite">Indefinido</option>
                    </select>
                </div>
            )}
        </div>
    );
}
