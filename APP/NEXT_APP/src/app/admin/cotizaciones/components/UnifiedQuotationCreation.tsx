"use client";

import { useState, useTransition, useRef, useCallback, useEffect, useMemo } from "react";
import {
    Plus, Search, ArrowRight, ArrowLeft, X, Code, Globe, Lock, Loader2,
    Copy, Check, ExternalLink, Sparkles, FileText, SearchIcon, Info,
    ChevronDown, ChevronUp, AlertTriangle, Eye, RefreshCw, Maximize2, Minimize2
} from "lucide-react";
import { createInitialQuotationData, QuotationData } from "../../../../modules/quotations/types";
import QuotationWorkspace from "../quotation-workspace";
import CreateClientModal from "./CreateClientModal";
import { createQuotationAction } from "../[clientId]/actions";
import { toast } from "sonner";
import { transpileLatexToHtml } from "@/lib/latex-to-html";
import { copiarTexto } from "@/lib/tools/copiar";
import { confirmar } from "@/modules/admin/confirmar/confirmar";
import Ventana from "@/modules/quotations/components/Ventana";
import { AYUDA, BOTON, BOTON_ICONO, BOTON_MINI, BOTON_SEC, BOTON_SUAVE, CAMPO, ETIQUETA, FOCO, OPCION, SOBRE } from "@/modules/quotations/estilos";

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
    etiqueta,
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
    /** Nombre accesible del área de código. */
    etiqueta: string;
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
        // Escape con el buscador abierto lo cierra a él, no la ventana.
        if (e.key === "Escape" && showFinder) {
            e.preventDefault();
            setShowFinder(false);
            setQuery("");
        }
    };

    const handleFinderKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) prev(); else next();
        }
        if (e.key === "Escape") { e.preventDefault(); setShowFinder(false); setQuery(""); }
    };

    const syncGutterScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    };

    const lineCount = Math.max(value.split("\n").length, rows);
    const lineSet = new Set(highlightLines || []);
    const mini = `grid size-8 place-items-center rounded text-[var(--mut)] transition-colors duration-150 hover:text-[var(--txt)] disabled:opacity-30 ${FOCO}`;

    return (
        <div className="relative">
            {showFinder && (
                <div role="search" className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-lg border border-[var(--linea-2)] bg-[var(--sup)] py-1 pl-2 pr-1 shadow-xl">
                    <SearchIcon size={14} aria-hidden="true" className="shrink-0 text-[var(--mut)]" />
                    <input
                        ref={queryRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleFinderKey}
                        placeholder="Buscar…"
                        aria-label="Buscar en el código"
                        className="w-32 bg-transparent text-xs text-[var(--txt)] outline-none placeholder:text-[var(--mut)]"
                    />
                    {query && (
                        <span aria-live="polite" className="min-w-[48px] shrink-0 text-center text-[11px] tabular-nums text-[var(--mut)]">
                            {matches.length === 0 ? "0/0" : `${matchIdx + 1}/${matches.length}`}
                        </span>
                    )}
                    <button type="button" onClick={prev} disabled={matches.length === 0} aria-label="Coincidencia anterior" className={mini}><ChevronUp size={14} aria-hidden="true" /></button>
                    <button type="button" onClick={next} disabled={matches.length === 0} aria-label="Coincidencia siguiente" className={mini}><ChevronDown size={14} aria-hidden="true" /></button>
                    <button type="button" onClick={() => { setShowFinder(false); setQuery(""); }} aria-label="Cerrar búsqueda" className={mini}><X size={14} aria-hidden="true" /></button>
                </div>
            )}

            <div className="flex overflow-hidden rounded-lg border border-[var(--linea-2)] bg-[var(--fondo-2)] focus-within:border-[var(--acento)]">
                {showLineNumbers && (
                    <div
                        ref={gutterRef}
                        aria-hidden="true"
                        className="select-none overflow-hidden border-r border-[var(--linea)] px-2 py-3 text-right font-mono text-[11px] leading-[18px] text-[var(--mut)]"
                        style={{ minWidth: "3ch" }}
                    >
                        {Array.from({ length: lineCount }).map((_, i) => (
                            <div
                                key={i}
                                className={lineSet.has(i + 1) ? "font-bold text-red-400" : ""}
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
                    aria-label={etiqueta}
                    className={className + " leading-[18px]"}
                />
            </div>
            <p className="mt-1 text-right text-[11px] text-[var(--mut)]">
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

    return (
        <div className={`flex flex-col overflow-hidden rounded-xl border border-[var(--linea-2)] bg-[var(--fondo-2)] ${fullscreen ? "fixed inset-4 z-[60] shadow-2xl" : "h-full min-h-[300px]"}`}>
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--linea)] px-3 py-1">
                <span className="font-mono text-[11px] text-[var(--mut)]">LaTeX a HTML</span>
                <div className="flex items-center gap-1">
                    <button type="button" onClick={compile}
                        className={`flex min-h-8 items-center gap-1 rounded px-1 text-[11px] text-[var(--mut)] transition-colors duration-150 hover:text-[var(--txt)] ${FOCO}`}>
                        <RefreshCw size={12} aria-hidden="true" className={loading ? "animate-spin motion-reduce:animate-none" : ""} />
                        {loading ? "Compilando…" : "Volver a compilar"}
                    </button>
                    <button type="button" onClick={() => setFullscreen(f => !f)}
                        className={`grid size-8 place-items-center rounded text-[var(--mut)] transition-colors duration-150 hover:text-[var(--txt)] ${FOCO}`}
                        aria-label={fullscreen ? "Salir de pantalla completa" : "Vista previa a pantalla completa"}
                        aria-pressed={fullscreen}>
                        {fullscreen ? <Minimize2 size={14} aria-hidden="true" /> : <Maximize2 size={14} aria-hidden="true" />}
                    </button>
                </div>
            </div>

            <div className="relative flex-1 overflow-hidden">
                {!latex.trim() && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[var(--mut)]">
                        <FileText size={24} strokeWidth={1.4} aria-hidden="true" />
                        <p className="text-sm">La vista previa aparece aquí</p>
                    </div>
                )}
                {result && (
                    <iframe
                        srcDoc={result.html}
                        className="h-full w-full border-0 bg-white"
                        title="Vista previa LaTeX"
                        sandbox="allow-same-origin"
                    />
                )}
            </div>

            {result && (result.warnings.length > 0 || result.errors.length > 0) && (
                <div className="max-h-28 shrink-0 overflow-y-auto border-t border-[var(--linea)] bg-[var(--sup)] px-3 py-2 font-mono text-[11px]">
                    {result.errors.map((e, i) => (
                        <div key={`e${i}`} className="flex gap-2 text-red-400">
                            <AlertTriangle size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
                            <span>Línea {e.line}: {e.message}</span>
                        </div>
                    ))}
                    {result.warnings.slice(0, 8).map((w, i) => (
                        <div key={`w${i}`} className="flex gap-2 text-amber-400">
                            <Info size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
                            <span>{w}</span>
                        </div>
                    ))}
                    {result.warnings.length > 8 && (
                        <div className="text-[var(--mut)]">Y {result.warnings.length - 8} avisos más</div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function UnifiedQuotationCreation({ clients = [], preSelectedClient, onClose, onSuccess }: Props) {
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

    // El cliente se crea aquí mismo y queda elegido: antes «Crear cliente» llevaba a otra página y se perdía el asistente.
    const [creandoCliente, setCreandoCliente] = useState(false);
    const handleCreateClient = () => setCreandoCliente(true);

    // --- SHARED SUBMIT LOGIC ---
    const [accessMode, setAccessMode] = useState<"public" | "code">("code");
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<{ link: string; code?: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    // Shared form state (folio / projectName / total / codeDuration)
    const [folio, setFolio] = useState("");
    const [projectName, setProjectName] = useState("");
    // Total en pesos (solo dígitos). Sin él la propuesta queda en $0 y no se le pueden registrar pagos.
    const [totalTexto, setTotalTexto] = useState("");
    const [codeDuration, setCodeDuration] = useState("15d");
    // Publicada desde el constructor: cerrar ya no pregunta «¿salir sin publicar?».
    const [publicadaEnConstructor, setPublicadaEnConstructor] = useState(false);
    const [codigoCopiado, setCodigoCopiado] = useState(false);

    const copyToClipboard = async (text: string) => {
        if (!(await copiarTexto(text))) { setError("No se pudo copiar: selecciónalo y cópialo a mano."); return; }
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
        setError(null);
        if (!folio.trim() || !projectName.trim() || !htmlContent.trim()) {
            setError("Completa el folio, el nombre del proyecto y el contenido.");
            return;
        }
        const fd = new FormData();
        fd.set("clientId", selectedClient.id);
        fd.set("folio", folio.trim());
        fd.set("projectName", projectName.trim());
        fd.set("htmlContent", htmlContent);
        fd.set("total", totalTexto || "0");
        fd.set("accessMode", accessMode);
        fd.set("codeDuration", codeDuration);

        startTransition(async () => {
            const res = await createQuotationAction(fd);
            if (res.success) {
                toast.success("Propuesta publicada");
                setResult({ link: res.link!, code: res.accessCode });
                if (onSuccess) onSuccess();
            } else {
                setError(res.error || "No se pudo publicar la propuesta");
            }
        });
    };

    const handleHtmlSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submitWithHtml(htmlCode);
    };

    const handleLatexSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!latexCode.trim()) { setError("Pega tu código LaTeX primero."); return; }
        setIsConvertingLatex(true);
        try {
            const out = transpileLatexToHtml(latexCode, { standalone: true });
            if (out.errors.length > 0) {
                toast.warning(`Se publicará con ${out.errors.length} error(es) detectado(s). Revisa la vista previa.`);
            }
            setIsConvertingLatex(false);
            submitWithHtml(out.html);
        } catch (err: unknown) {
            setIsConvertingLatex(false);
            setError("Error al compilar LaTeX: " + (err instanceof Error ? err.message : "desconocido"));
        }
    };

    // Lo escrito se pierde al cerrar: Escape y la X preguntan antes si hay trabajo sin publicar.
    const hayTrabajo = () =>
        !result && !publicadaEnConstructor && (
            step === "workspace" ||
            (step === "code-embed" && !!(htmlCode.trim() || folio.trim() || projectName.trim() || totalTexto)) ||
            (step === "latex-embed" && !!(latexCode.trim() || folio.trim() || projectName.trim() || totalTexto))
        );
    const antesDeCerrar = async () =>
        !hayTrabajo() || confirmar({ titulo: "¿Salir sin publicar?", detalle: "Se pierde lo que escribiste en esta propuesta.", accion: "Salir sin publicar", peligro: true });

    const irA = (destino: Step) => { setError(null); setStep(destino); };
    const ocupado = isPending || isConvertingLatex;
    const para = selectedClient ? `Para ${selectedClient.name}` : undefined;
    // Es una sola ventana que cambia de contenido: la clave del paso mueve el foco al cambiar.
    const pasoClave = result ? "resultado" : step;
    // ─────────────────────────────────────────────

    // SUCCESS VIEW (shared)
    if (result) {
        return (
            <Ventana paso={pasoClave} titulo="Propuesta publicada" descripcion="Comparte el enlace con tu cliente." icono={<Check size={18} className="text-emerald-400" />} alCerrar={onClose}>
                {(cerrar) => (
                    <div className="space-y-5">
                        <div>
                            <p className="mb-1.5 text-sm font-medium text-[var(--txt)]">Enlace</p>
                            <div className="flex items-center gap-2 rounded-lg border border-[var(--linea-2)] bg-[var(--fondo-2)] py-1 pl-3 pr-1">
                                <code className="min-w-0 flex-1 select-all break-all font-mono text-sm text-[var(--acento)]">{result.link}</code>
                                <button type="button" onClick={() => copyToClipboard(result.link)} aria-label={copied ? "Enlace copiado" : "Copiar enlace"} className={BOTON_ICONO}>
                                    {copied ? <Check size={16} aria-hidden="true" className="text-emerald-400" /> : <Copy size={16} aria-hidden="true" />}
                                </button>
                                <a href={result.link} target="_blank" rel="noreferrer" aria-label="Abrir la propuesta (se abre en otra pestaña)" className={BOTON_ICONO}>
                                    <ExternalLink size={16} aria-hidden="true" />
                                </a>
                            </div>
                        </div>
                        {result.code && (
                            <div className="rounded-lg bg-amber-500/10 p-4 text-center">
                                <p className="text-sm text-[var(--txt)]">Código de acceso para el cliente</p>
                                <code className="mt-1 block select-all break-all font-mono text-2xl font-bold text-[var(--txt)]">{result.code}</code>
                                <p className="mt-1 text-xs text-[var(--mut)]">Se muestra una sola vez. Si lo pierdes, genera otro en «Acceso».</p>
                                <div className="mt-3 flex flex-wrap justify-center gap-2">
                                    <button type="button" className={BOTON_MINI}
                                        onClick={async () => {
                                            if (!(await copiarTexto(result.code!))) { setError("No se pudo copiar: selecciónalo y cópialo a mano."); return; }
                                            setCodigoCopiado(true);
                                            toast.success("Código copiado");
                                        }}>
                                        {codigoCopiado ? <Check size={12} aria-hidden="true" className="text-emerald-400" /> : <Copy size={12} aria-hidden="true" />}
                                        {codigoCopiado ? "Código copiado" : "Copiar código"}
                                    </button>
                                    <button type="button" className={BOTON_MINI}
                                        onClick={async () => {
                                            if (!(await copiarTexto(`${result.link}\nCódigo de acceso: ${result.code}`))) { setError("No se pudo copiar: selecciónalo y cópialo a mano."); return; }
                                            toast.success("Enlace y código copiados para enviarlos");
                                        }}>
                                        <Copy size={12} aria-hidden="true" /> Copiar enlace y código
                                    </button>
                                </div>
                            </div>
                        )}
                        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
                        <button type="button" onClick={cerrar} className={`${BOTON_SEC} w-full`} data-autofocus>
                            Cerrar
                        </button>
                    </div>
                )}
            </Ventana>
        );
    }

    // ─── STEP 1: SELECT CLIENT ───
    if (step === "select-client") {
        return (
            <Ventana paso={pasoClave} titulo="Nueva propuesta" descripcion="Elige el cliente." alCerrar={onClose} ancho="max-w-2xl" clase="h-[min(92dvh,640px)]" cuerpo="p-0 flex flex-col">
                <div className="flex shrink-0 items-center gap-2 p-4 sm:px-6">
                    <label htmlFor="buscar-cliente-propuesta" className="sr-only">Buscar cliente por nombre o correo</label>
                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mut)]" size={16} aria-hidden="true" />
                        <input
                            id="buscar-cliente-propuesta"
                            type="search"
                            placeholder="Nombre o correo"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`${CAMPO} pl-9`}
                            data-autofocus
                        />
                    </div>
                    <button type="button" onClick={handleCreateClient} className={BOTON_SEC} aria-label="Cliente nuevo">
                        <Plus size={16} aria-hidden="true" />
                        <span className="hidden sm:inline">Cliente nuevo</span>
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
                    {filteredClients.length > 0 ? (
                        <ul className="border-t border-[var(--linea)]">
                            {filteredClients.map(client => (
                                <li key={client.id} className="border-b border-[var(--linea)]">
                                    <button
                                        type="button"
                                        onClick={() => handleClientSelect(client)}
                                        className={`group flex w-full items-center justify-between gap-3 px-2 py-3 text-left transition-colors duration-150 ${SOBRE} ${FOCO}`}
                                    >
                                        <span className="min-w-0">
                                            <span className="block truncate font-medium text-[var(--txt)]">{client.name}</span>
                                            <span className="block truncate text-sm text-[var(--mut)]">{client.email || "Sin correo registrado"}</span>
                                        </span>
                                        <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-[var(--mut)] transition-colors duration-150 group-hover:text-[var(--acento)]" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="border-y border-[var(--linea)] py-10 text-center">
                            <p className="mb-4 text-[var(--mut)]">{clients.length === 0 ? "Todavía no tienes clientes." : "Ningún cliente coincide."}</p>
                            <button type="button" onClick={handleCreateClient} className={BOTON_SEC}>
                                <Plus size={16} aria-hidden="true" /> Crear cliente nuevo
                            </button>
                        </div>
                    )}
                </div>
                <CreateClientModal
                    isOpen={creandoCliente}
                    onClose={() => setCreandoCliente(false)}
                    onSuccess={(_id, cliente) => {
                        setCreandoCliente(false);
                        // La lista de fondo se pone al día y el cliente nuevo queda elegido para seguir con la propuesta.
                        onSuccess?.();
                        handleClientSelect(cliente);
                    }}
                />
            </Ventana>
        );
    }

    // ─── STEP 2: CHOOSE MODE ───
    if (step === "choose-mode" && selectedClient) {
        const modos: { paso: Step; Icono: typeof Sparkles; titulo: string; texto: string }[] = [
            { paso: "workspace", Icono: Sparkles, titulo: "Constructor visual", texto: "Formulario paso a paso con un asistente de IA que propone servicios y textos." },
            { paso: "code-embed", Icono: Code, titulo: "Pegar HTML", texto: "Pega el HTML de la propuesta (con Tailwind si quieres) y publícalo tal cual." },
            { paso: "latex-embed", Icono: FileText, titulo: "Pegar LaTeX", texto: "Pega código LaTeX, revisa la vista previa y se publica convertido a HTML." },
        ];
        return (
            <Ventana paso={pasoClave} titulo="Nueva propuesta" descripcion={para} alCerrar={onClose} ancho="max-w-4xl">
                <p className="mb-4 text-sm text-[var(--mut)]">¿Cómo quieres armarla?</p>
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {modos.map(({ paso, Icono, titulo, texto }) => (
                        <li key={paso} className="flex">
                            <button
                                type="button"
                                onClick={() => irA(paso)}
                                className={`group flex w-full flex-col items-start rounded-xl border border-[var(--linea-2)] p-5 text-left transition-colors duration-150 hover:border-[var(--acento)] ${SOBRE} ${FOCO}`}
                            >
                                <Icono size={20} aria-hidden="true" className="mb-3 text-[var(--acento)]" />
                                <span className="font-semibold text-[var(--txt)]">{titulo}</span>
                                <span className="mt-1 text-sm text-[var(--mut)]">{texto}</span>
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={() => preSelectedClient ? onClose() : irA("select-client")}
                        className={BOTON_SUAVE}
                    >
                        <ArrowLeft size={16} aria-hidden="true" /> {preSelectedClient ? "Cancelar" : "Elegir otro cliente"}
                    </button>
                </div>
            </Ventana>
        );
    }

    // ─── STEP 3A: WORKSPACE (Builder) ───
    if (step === "workspace" && selectedClient) {
        return (
            <Ventana paso={pasoClave} titulo={`Constructor de propuestas: ${selectedClient.name}`} sinCabecera pantallaCompleta alCerrar={onClose} antesDeCerrar={antesDeCerrar} cuerpo="p-0 flex flex-col">
                {(cerrar) => (
                    <QuotationWorkspace
                        initialData={initialData}
                        clientId={selectedClient.id}
                        clientName={selectedClient.name}
                        onClose={cerrar}
                        onPublished={() => setPublicadaEnConstructor(true)}
                    />
                )}
            </Ventana>
        );
    }

    // ─── STEP 3B: CODE EMBED (HTML) ───
    if (step === "code-embed" && selectedClient) {
        return (
            <Ventana paso={pasoClave} titulo="Pegar HTML" descripcion={para} icono={<Code size={18} />} alCerrar={onClose} antesDeCerrar={antesDeCerrar} ancho="max-w-2xl" cuerpo="p-0">
                <form onSubmit={handleHtmlSubmit} className="space-y-5 p-4 sm:p-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="html-folio" className={ETIQUETA}>Folio (único)</label>
                            <input id="html-folio" value={folio} onChange={e => setFolio(e.target.value)} required placeholder="WEB-2026-001" className={CAMPO} data-autofocus />
                        </div>
                        <div>
                            <label htmlFor="html-proyecto" className={ETIQUETA}>Nombre del proyecto</label>
                            <input id="html-proyecto" value={projectName} onChange={e => setProjectName(e.target.value)} required placeholder="Plataforma web" className={CAMPO} />
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor="html-total" className={ETIQUETA}>Total (CLP)</label>
                            <input id="html-total" type="text" inputMode="numeric" autoComplete="off" placeholder="1.190.000" className={`${CAMPO} tabular-nums`}
                                value={totalTexto ? Number(totalTexto).toLocaleString("es-CL") : ""}
                                onChange={e => setTotalTexto(e.target.value.replace(/\D/g, "").slice(0, 13))}
                                aria-describedby="html-total-ayuda" />
                            <p id="html-total-ayuda" className={AYUDA}>Lo que se cobra en total: con él se registran los pagos y las cuotas.</p>
                        </div>
                    </div>

                    <AccessModeSelector mode={accessMode} setMode={setAccessMode} duration={codeDuration} setDuration={setCodeDuration} />

                    <div>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span id="html-codigo" className="flex items-center gap-2 text-sm font-medium text-[var(--txt)]">
                                <Code size={14} aria-hidden="true" /> HTML de la propuesta
                            </span>
                            <button type="button"
                                onClick={async () => {
                                    const { PROPUESTA_HTML_TEMPLATE } = await import("@/modules/quotations/templates/propuesta-html");
                                    setHtmlCode(PROPUESTA_HTML_TEMPLATE);
                                }}
                                disabled={!!htmlCode.trim()}
                                title="Carga el diseño de propuesta con los datos por completar"
                                className={BOTON_MINI}>
                                Usar plantilla
                            </button>
                        </div>
                        <CodeFinder
                            value={htmlCode}
                            onChange={setHtmlCode}
                            name="htmlContent"
                            required
                            rows={13}
                            etiqueta="HTML de la propuesta"
                            placeholder={'<!DOCTYPE html>\n<html>\n  <head>...</head>\n  <body>...</body>\n</html>'}
                            className="w-full resize-none bg-transparent p-3 font-mono text-xs text-[var(--txt)] outline-none placeholder:text-[var(--mut)]"
                        />
                        <p className={AYUDA}>Se permiten CDN como Tailwind.</p>
                    </div>

                    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

                    <div className="flex gap-2 border-t border-[var(--linea)] pt-4">
                        <button type="button" onClick={() => irA("choose-mode")} className={`${BOTON_SEC} flex-1`}>Volver</button>
                        <button type="submit" disabled={isPending} className={`${BOTON} flex-1`}>
                            {isPending ? <><Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Publicando…</> : "Publicar propuesta"}
                        </button>
                    </div>
                </form>
            </Ventana>
        );
    }

    // ─── STEP 3C: LATEX EMBED ───
    if (step === "latex-embed" && selectedClient) {
        return (
            <Ventana paso={pasoClave} titulo="Pegar LaTeX" descripcion={para} icono={<FileText size={18} />} alCerrar={onClose} antesDeCerrar={antesDeCerrar} ancho="max-w-6xl" clase="h-[min(92dvh,900px)]" cuerpo="p-0 flex flex-col">
                <form onSubmit={handleLatexSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="grid shrink-0 grid-cols-2 gap-3 border-b border-[var(--linea)] px-4 py-3 sm:px-6 md:grid-cols-3 lg:grid-cols-5">
                        <div>
                            <label htmlFor="tex-folio" className={ETIQUETA}>Folio</label>
                            <input id="tex-folio" value={folio} onChange={e => setFolio(e.target.value)} required placeholder="TEX-2026-001" className={CAMPO} data-autofocus />
                        </div>
                        <div>
                            <label htmlFor="tex-proyecto" className={ETIQUETA}>Nombre del proyecto</label>
                            <input id="tex-proyecto" value={projectName} onChange={e => setProjectName(e.target.value)} required placeholder="Propuesta técnica" className={CAMPO} />
                        </div>
                        <div>
                            <label htmlFor="tex-total" className={ETIQUETA}>Total (CLP)</label>
                            <input id="tex-total" type="text" inputMode="numeric" autoComplete="off" placeholder="1.190.000" className={`${CAMPO} tabular-nums`}
                                value={totalTexto ? Number(totalTexto).toLocaleString("es-CL") : ""}
                                onChange={e => setTotalTexto(e.target.value.replace(/\D/g, "").slice(0, 13))} />
                        </div>
                        <div>
                            <label htmlFor="tex-acceso" className={ETIQUETA}>Acceso</label>
                            <select id="tex-acceso" value={accessMode} onChange={e => setAccessMode(e.target.value as "public" | "code")} className={CAMPO}>
                                <option value="code">Privada (con código)</option>
                                <option value="public">Pública (sin código)</option>
                            </select>
                        </div>
                        {accessMode === "code" && (
                            <div>
                                <label htmlFor="tex-validez" className={ETIQUETA}>Validez del código</label>
                                <select id="tex-validez" value={codeDuration} onChange={e => setCodeDuration(e.target.value)} className={CAMPO}>
                                    <option value="7d">1 semana</option>
                                    <option value="15d">15 días</option>
                                    <option value="30d">1 mes</option>
                                    <option value="indefinite">Sin vencimiento</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Editor y vista previa: lado a lado en pantallas anchas, uno bajo el otro en celular */}
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
                        <section aria-labelledby="tex-editor" className="flex min-h-[60dvh] flex-col border-[var(--linea)] md:min-h-0 md:w-1/2 md:border-r">
                            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--linea)] px-4 py-2">
                                <div className="flex items-center gap-2">
                                    <h3 id="tex-editor" className="text-sm font-medium text-[var(--mut)]">Editor LaTeX</h3>
                                    <button type="button"
                                        onClick={() => setLatexCode(LATEX_STARTER_TEMPLATE)}
                                        disabled={!!latexCode.trim()}
                                        className={BOTON_MINI}>
                                        Usar plantilla
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={openOverleaf} className={BOTON_MINI}>
                                        <ExternalLink size={12} aria-hidden="true" /> Abrir en Overleaf
                                    </button>
                                    <button type="button" onClick={() => copyToClipboard(latexCode)} className={BOTON_MINI}>
                                        {copied ? <Check size={12} aria-hidden="true" className="text-emerald-400" /> : <Copy size={12} aria-hidden="true" />} {copied ? "Copiado" : "Copiar"}
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3">
                                <CodeFinder
                                    value={latexCode}
                                    onChange={setLatexCode}
                                    rows={28}
                                    etiqueta="Código LaTeX"
                                    highlightLines={latexErrorLines}
                                    placeholder={`\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\\begin{document}\n\n\\section{Alcance del Proyecto}\n% Tu contenido aqui\n\n\\end{document}`}
                                    className="w-full flex-1 resize-none bg-transparent p-3 font-mono text-xs text-[var(--txt)] outline-none placeholder:text-[var(--mut)]"
                                />
                            </div>
                        </section>

                        <section aria-labelledby="tex-vista" className="flex min-h-[60dvh] flex-col md:min-h-0 md:w-1/2">
                            <div className="flex shrink-0 items-center gap-2 border-b border-[var(--linea)] px-4 py-2">
                                <Eye size={14} aria-hidden="true" className="text-[var(--mut)]" />
                                <h3 id="tex-vista" className="text-sm font-medium text-[var(--mut)]">Vista previa</h3>
                                {latexPreview && (
                                    <span className="ml-2 text-xs" aria-live="polite">
                                        {latexPreview.errors.length > 0 && <span className="text-red-400">{latexPreview.errors.length} error(es)</span>}
                                        {latexPreview.errors.length > 0 && latexPreview.warnings.length > 0 && <span className="text-[var(--mut)]"> · </span>}
                                        {latexPreview.warnings.length > 0 && <span className="text-amber-400">{latexPreview.warnings.length} aviso(s)</span>}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto p-3">
                                <LatexPreviewFrame latex={latexCode} onResult={setLatexPreview} />
                            </div>
                        </section>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-[var(--linea)] px-4 py-3 sm:px-6">
                        {error && <p role="alert" className="basis-full text-sm text-red-400">{error}</p>}
                        <button type="button" onClick={() => irA("choose-mode")} className={`${BOTON_SEC} flex-1`}>
                            Volver
                        </button>
                        <button type="submit" disabled={ocupado} className={`${BOTON} flex-1`}>
                            {ocupado ? (
                                <><Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> {isConvertingLatex ? "Compilando LaTeX…" : "Publicando…"}</>
                            ) : (
                                "Compilar y publicar"
                            )}
                        </button>
                    </div>
                </form>
            </Ventana>
        );
    }

    return null;
}

// ─────────────────────────────────────────────
// Reusable access mode selector
// ─────────────────────────────────────────────
function AccessModeSelector({
    mode, setMode, duration, setDuration
}: {
    mode: "public" | "code";
    setMode: (m: "public" | "code") => void;
    duration: string;
    setDuration: (d: string) => void;
}) {
    return (
        <fieldset>
            <legend className={ETIQUETA}>Acceso</legend>
            <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setMode("public")} aria-pressed={mode === "public"} className={`${OPCION} p-4`}>
                    <Globe size={18} aria-hidden="true" className={`mb-2 ${mode === "public" ? "text-[var(--acento)]" : "text-[var(--mut)]"}`} />
                    <span className="block text-sm font-semibold text-[var(--txt)]">Pública</span>
                    <span className="block text-xs text-[var(--mut)]">Sin código</span>
                </button>
                <button type="button" onClick={() => setMode("code")} aria-pressed={mode === "code"} className={`${OPCION} p-4`}>
                    <Lock size={18} aria-hidden="true" className={`mb-2 ${mode === "code" ? "text-[var(--acento)]" : "text-[var(--mut)]"}`} />
                    <span className="block text-sm font-semibold text-[var(--txt)]">Privada</span>
                    <span className="block text-xs text-[var(--mut)]">Pide un código</span>
                </button>
            </div>
            {mode === "code" && (
                <div className="mt-3">
                    <label htmlFor="html-validez" className={ETIQUETA}>Validez del código</label>
                    <select id="html-validez" value={duration} onChange={e => setDuration(e.target.value)} className={CAMPO}>
                        <option value="7d">1 semana (7 días)</option>
                        <option value="15d">15 días</option>
                        <option value="30d">1 mes (30 días)</option>
                        <option value="indefinite">Sin vencimiento</option>
                    </select>
                </div>
            )}
        </fieldset>
    );
}
