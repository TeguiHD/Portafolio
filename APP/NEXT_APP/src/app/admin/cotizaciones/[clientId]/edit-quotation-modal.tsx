"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import { X, Save, Loader2, Code, FileText, Eye, RefreshCw, AlertTriangle, Copy, Check, ExternalLink, Search, ChevronUp, ChevronDown } from "lucide-react";
import { getQuotationForEditAction, updateQuotationAction } from "./actions";
import { toast } from "sonner";
import { transpileLatexToHtml } from "@/lib/latex-to-html";
import { copiarTexto } from "@/lib/tools/copiar";
import { confirmar } from "@/modules/admin/confirmar/confirmar";
import Ventana from "@/modules/quotations/components/Ventana";
import { AREA, AYUDA, BOTON, BOTON_MINI, BOTON_SEC, CAMPO, CODIGO, ETIQUETA, FOCO } from "@/modules/quotations/estilos";

interface EditQuotationModalProps {
    isOpen: boolean;
    quotationId: string;
    onClose: () => void;
    /** Tras guardar: la tarjeta se pone al día (nombre, total). */
    onSaved?: () => void;
}

// ─── Ctrl+F Finder ────────────────────────────────────────
function CodeFinder({
    value,
    onChange,
    placeholder,
    rows = 14,
    className,
    etiqueta,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    rows?: number;
    /** Nombre accesible del área de código. */
    etiqueta: string;
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
        // Enter salta a la coincidencia siguiente (sin enviar el formulario).
        if (e.key === "Enter") { e.preventDefault(); if (e.shiftKey) prev(); else next(); }
        // Escape cierra solo el buscador, no la ventana.
        if (e.key === "Escape") { e.preventDefault(); setShowFinder(false); setQuery(""); }
    };

    const mini = `grid size-8 place-items-center rounded text-[var(--mut)] transition-colors duration-150 hover:text-[var(--txt)] disabled:opacity-30 ${FOCO}`;

    return (
        <div className="relative">
            {showFinder && (
                <div role="search" className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-lg border border-[var(--linea-2)] bg-[var(--sup)] py-1 pl-2 pr-1 shadow-xl">
                    <Search size={14} aria-hidden="true" className="shrink-0 text-[var(--mut)]" />
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
            <textarea
                ref={textareaRef}
                value={value}
                onChange={e => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={rows}
                placeholder={placeholder}
                className={className}
                spellCheck={false}
                aria-label={etiqueta}
            />
            <p className="mt-1 select-none text-right text-[11px] text-[var(--mut)]">Ctrl+F para buscar</p>
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
        <div className="flex h-64 flex-col overflow-hidden rounded-xl border border-[var(--linea-2)] bg-[var(--fondo-2)]">
            <div className="flex items-center justify-between border-b border-[var(--linea)] px-3 py-1">
                <span className="font-mono text-[11px] text-[var(--mut)]">LaTeX a HTML</span>
                <button type="button" onClick={compile} className={`flex min-h-8 items-center gap-1 rounded px-1 text-[11px] text-[var(--mut)] transition-colors duration-150 hover:text-[var(--txt)] ${FOCO}`}>
                    <RefreshCw size={12} aria-hidden="true" className={loading ? "animate-spin motion-reduce:animate-none" : ""} />
                    {loading ? "Compilando…" : "Volver a compilar"}
                </button>
            </div>
            <div className="relative flex-1 overflow-hidden">
                {!latex.trim() && <p className="absolute inset-0 flex items-center justify-center text-sm text-[var(--mut)]">Aquí aparece la vista previa</p>}
                {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-[color-mix(in_srgb,var(--fondo-2)_80%,transparent)]"><Loader2 className="animate-spin text-[var(--acento)] motion-reduce:animate-none" size={22} aria-hidden="true" /></div>}
                {result?.errors && result.errors.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-red-400/30 bg-[var(--sup)] px-3 py-1.5">
                        {result.errors.slice(0, 2).map((e, i) => (
                            <div key={i} className="flex items-center gap-1 font-mono text-[11px] text-red-400">
                                <AlertTriangle size={11} aria-hidden="true" className="shrink-0" />
                                Línea {e.line}: {e.message}
                            </div>
                        ))}
                    </div>
                )}
                {result && (
                    <iframe
                        srcDoc={result.html}
                        className="w-full h-full border-0 bg-white"
                        title="Vista previa LaTeX"
                        sandbox="allow-same-origin"
                    />
                )}
            </div>
        </div>
    );
}

// ─── Main edit modal ────────────────────────────────────────
export default function EditQuotationModal({ isOpen, quotationId, onClose }: EditQuotationModalProps) {
    if (!isOpen) return null;
    // Se monta al abrir: siempre carga lo último guardado.
    return <Editor quotationId={quotationId} onClose={onClose} />;
}

function Editor({ quotationId, onClose, onSaved }: Omit<EditQuotationModalProps, "isOpen">) {
    const [isPending, startTransition] = useTransition();
    const [isLoading, setIsLoading] = useState(true);
    const [tab, setTab] = useState<"html" | "latex">("html");
    const [latexCode, setLatexCode] = useState("");
    const [isConvertingLatex, setIsConvertingLatex] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        projectName: "",
        total: 0,
        notes: "",
        htmlContent: "",
    });
    const [folio, setFolio] = useState("");
    // Lo cargado, para saber si hay cambios sin guardar al cerrar.
    const original = useRef("");
    // El padre pasa una función nueva en cada render: con la referencia, la carga corre una vez y no pisa lo editado.
    const alCerrarRef = useRef(onClose);
    useEffect(() => { alCerrarRef.current = onClose; });

    useEffect(() => {
        setIsLoading(true);
        getQuotationForEditAction(quotationId).then((result) => {
            if (result.success && result.data) {
                const datos = {
                    projectName: result.data.projectName || "",
                    total: result.data.total || 0,
                    notes: result.data.notes || "",
                    htmlContent: result.data.htmlContent || "",
                };
                setFormData(datos);
                original.current = JSON.stringify(datos);
                setFolio(result.data.folio || "");
            } else {
                toast.error(result.error || "No se pudo cargar la propuesta");
                alCerrarRef.current();
            }
            setIsLoading(false);
        });
    }, [quotationId]);

    const hayCambios = () => !isLoading && (JSON.stringify(formData) !== original.current || latexCode.trim() !== "");

    const antesDeCerrar = async () =>
        !hayCambios() || confirmar({ titulo: "¿Cerrar sin guardar?", detalle: "Se pierden los cambios de esta propuesta.", accion: "Cerrar sin guardar", peligro: true });

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
        if (!(await copiarTexto(latexCode))) { setError("No se pudo copiar el código LaTeX"); return; }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (tab === "latex") {
            if (!latexCode.trim()) { setError("El editor LaTeX está vacío"); return; }
            setIsConvertingLatex(true);
            try {
                const out = transpileLatexToHtml(latexCode, { standalone: true });
                if (out.errors.length > 0) {
                    toast.warning(`Se guardará con ${out.errors.length} error(es) detectado(s). Revisa la vista previa.`);
                }
                setIsConvertingLatex(false);
                saveHtml(out.html);
            } catch (e: unknown) {
                setIsConvertingLatex(false);
                setError("Error de LaTeX: " + (e instanceof Error ? e.message : "desconocido"));
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
                toast.success("Propuesta actualizada");
                onSaved?.();
                onClose();
            } else {
                setError(result.error || "No se pudo guardar la propuesta");
            }
        });
    };

    const pestana = (activa: boolean) =>
        `inline-flex min-h-11 md:min-h-10 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors duration-150 ${FOCO} ${activa
            ? "border-[var(--acento)] text-[var(--txt)]"
            : "border-transparent text-[var(--mut)] hover:text-[var(--txt)]"}`;

    const ocupado = isPending || isConvertingLatex;

    return (
        <Ventana
            titulo={<>Editar propuesta {folio && <span className="ml-1 font-mono text-base font-normal text-[var(--mut)]">{folio}</span>}</>}
            alCerrar={onClose}
            antesDeCerrar={antesDeCerrar}
            ancho="max-w-3xl"
            cuerpo="p-0 flex flex-col"
        >
            {(cerrar) => isLoading ? (
                <div role="status" className="flex items-center justify-center gap-2 p-12 text-sm text-[var(--mut)]">
                    <Loader2 size={20} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    Cargando la propuesta…
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                        <div>
                            <label htmlFor={`proyecto-${quotationId}`} className={ETIQUETA}>Nombre del proyecto</label>
                            <input
                                id={`proyecto-${quotationId}`}
                                type="text"
                                value={formData.projectName}
                                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                className={CAMPO}
                                required maxLength={200}
                                data-autofocus
                            />
                        </div>

                        <div>
                            <label htmlFor={`total-${quotationId}`} className={ETIQUETA}>Total (CLP)</label>
                            <input
                                id={`total-${quotationId}`}
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                value={formData.total ? Math.round(formData.total).toLocaleString("es-CL") : ""}
                                // Pesos sin decimales y con puntos de miles: «1.190.000». Antes era type=number y no aceptaba el punto chileno.
                                onChange={(e) => setFormData({ ...formData, total: Number(e.target.value.replace(/\D/g, "").slice(0, 13)) || 0 })}
                                placeholder="0"
                                className={`${CAMPO} tabular-nums`}
                            />
                        </div>

                        <div>
                            <label htmlFor={`notas-${quotationId}`} className={ETIQUETA}>Notas internas</label>
                            <textarea
                                id={`notas-${quotationId}`}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className={`${AREA} min-h-[80px]`}
                                maxLength={1000}
                                placeholder="El cliente no las ve"
                            />
                        </div>

                        <div>
                            <div role="group" aria-label="Contenido" className="mb-3 flex items-center gap-1 border-b border-[var(--linea)]">
                                <button type="button" onClick={() => setTab("html")} aria-pressed={tab === "html"} className={pestana(tab === "html")}>
                                    <Code size={14} aria-hidden="true" /> Contenido HTML
                                </button>
                                <button type="button" onClick={() => setTab("latex")} aria-pressed={tab === "latex"} className={pestana(tab === "latex")}>
                                    <FileText size={14} aria-hidden="true" /> Editor LaTeX
                                </button>
                            </div>

                            {tab === "html" && (
                                <div>
                                    <CodeFinder
                                        value={formData.htmlContent}
                                        onChange={(v) => setFormData({ ...formData, htmlContent: v })}
                                        rows={12}
                                        etiqueta="Contenido HTML"
                                        placeholder="<div>Contenido de la propuesta…</div>"
                                        className={CODIGO}
                                    />
                                    <p className={AYUDA}>Solo se guardan etiquetas HTML seguras.</p>
                                </div>
                            )}

                            {tab === "latex" && (
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-xs text-[var(--mut)]">Pega tu código LaTeX: al guardar se convierte a HTML.</p>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={openOverleaf} className={BOTON_MINI}>
                                                <ExternalLink size={12} aria-hidden="true" /> Overleaf
                                            </button>
                                            <button type="button" onClick={copyLatex} className={BOTON_MINI}>
                                                {copied ? <Check size={12} aria-hidden="true" className="text-emerald-400" /> : <Copy size={12} aria-hidden="true" />}
                                                {copied ? "Copiado" : "Copiar"}
                                            </button>
                                        </div>
                                    </div>
                                    <CodeFinder
                                        value={latexCode}
                                        onChange={setLatexCode}
                                        rows={12}
                                        etiqueta="Código LaTeX"
                                        placeholder={`\\documentclass{article}\n\\begin{document}\n\\title{Propuesta}\n\\maketitle\n\\section{Alcance}\n\\end{document}`}
                                        className={CODIGO}
                                    />
                                    <div>
                                        <p className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--mut)]">
                                            <Eye size={14} aria-hidden="true" /> Vista previa en vivo
                                        </p>
                                        <LatexPreviewPane latex={latexCode} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--linea)] px-4 py-3 sm:px-6">
                        {error && <p role="alert" className="mr-auto text-sm text-red-400">{error}</p>}
                        <button type="button" onClick={cerrar} disabled={ocupado} className={BOTON_SEC}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={ocupado} className={BOTON}>
                            {ocupado ? (
                                <><Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />{isConvertingLatex ? "Compilando…" : "Guardando…"}</>
                            ) : (
                                <><Save size={16} aria-hidden="true" />Guardar cambios</>
                            )}
                        </button>
                    </div>
                </form>
            )}
        </Ventana>
    );
}
