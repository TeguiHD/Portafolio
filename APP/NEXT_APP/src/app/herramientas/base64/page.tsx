"use client";

import { useMemo, useState } from "react";
import { Copy, Download, ArrowLeftRight, FileText, ImageIcon, Check, X, AlertCircle } from "lucide-react";
import { ToolPageHeader } from "@/components/tools/ToolPageHeader";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { useToolTracking } from "@/hooks/useDebounce";
import { decodeUtf8Base64, encodeUtf8Base64 } from "@/lib/base64-utf8";

export default function ImageBase64Page() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("base64");
    const { trackImmediate } = useToolTracking("base64", { trackViewOnMount: true });
    const [tab, setTab] = useState<"text" | "image">("text");
    const [mode, setMode] = useState<"encode" | "decode">("encode");
    const [input, setInput] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [imageName, setImageName] = useState("");
    const [feedback, setFeedback] = useState("");
    const result = useMemo(() => {
        if (tab === "image") return { output: image ?? "", error: "" };
        if (!input) return { output: "", error: "" };
        try { return { output: mode === "encode" ? encodeUtf8Base64(input) : decodeUtf8Base64(input), error: "" }; }
        catch { return { output: "", error: "El contenido no es Base64 de texto UTF-8 válido. Revisa lo que pegaste o cambia a Codificar." }; }
    }, [input, mode, tab, image]);
    if (isLoading) return <div role="status" className="p-8 text-sm text-slate-400">Cargando conversor…</div>;
    if (!isAuthorized) return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Conversor Base64"} />;

    async function copy() {
        try { await navigator.clipboard.writeText(result.output); setFeedback("Copiado al portapapeles."); trackImmediate("copy"); }
        catch { setFeedback("No pudimos copiar. Selecciona el resultado y cópialo manualmente."); }
    }
    function download() {
        const url = URL.createObjectURL(new Blob([result.output], { type: "text/plain;charset=utf-8" }));
        const link = document.createElement("a"); link.href = url; link.download = tab === "image" ? "imagen-base64.txt" : mode === "encode" ? "texto-base64.txt" : "texto-decodificado.txt";
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000); trackImmediate("download");
    }
    return (
        <div className="tool-page"><main className="tool-main mx-auto max-w-6xl px-4 sm:px-8">
            <ToolPageHeader slug="base64" title="Conversor Base64" description="Codifica y decodifica texto UTF-8, o convierte una imagen a una URL de datos. Todo se procesa en tu navegador." />
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex rounded-xl border border-white/10 p-1" role="group" aria-label="Tipo de conversión"><button type="button" className="studio-segment flex items-center gap-2" aria-pressed={tab === "text"} onClick={() => { setTab("text"); setFeedback(""); }}><FileText size={15} aria-hidden="true" />Texto</button><button type="button" className="studio-segment flex items-center gap-2" aria-pressed={tab === "image"} onClick={() => { setTab("image"); setFeedback(""); }}><ImageIcon size={15} aria-hidden="true" />Imagen a Base64</button></div>
                {tab === "text" && <div className="flex gap-1" role="group" aria-label="Operación"><button type="button" className="studio-segment" aria-pressed={mode === "encode"} onClick={() => { setMode("encode"); setFeedback(""); }}>Codificar</button><button type="button" className="studio-segment" aria-pressed={mode === "decode"} onClick={() => { setMode("decode"); setFeedback(""); }}>Decodificar</button></div>}
            </div>
            <div className="grid items-start gap-5 lg:grid-cols-2">
                <section className="studio-panel overflow-hidden">
                    <div className="studio-panel-heading flex items-center justify-between"><h2 className="text-sm font-medium text-white">{tab === "image" ? "Imagen original" : mode === "encode" ? "Texto original" : "Entrada Base64"}</h2>{tab === "text" && <button type="button" onClick={() => { setInput(""); setFeedback(""); }} className="studio-icon-button -my-3" aria-label="Limpiar entrada"><X size={16} /></button>}</div>
                    <div className="p-4">
                        {tab === "text" ? <><textarea aria-label="Entrada" value={input} maxLength={1_000_000} onChange={(event) => { setInput(event.target.value); setFeedback(""); }} placeholder={mode === "encode" ? "Escribe o pega tu texto. También admite ñ, tildes y emojis…" : "Pega aquí el texto Base64…"} className="min-h-[290px] w-full resize-y rounded-xl border border-white/[0.08] bg-[#0b111a] p-4 font-mono text-sm leading-relaxed text-slate-200 placeholder:text-slate-600" spellCheck={false} /><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500"><span>{new TextEncoder().encode(input).byteLength.toLocaleString("es-CL")} bytes UTF-8 · máx. 1 M de caracteres</span><button type="button" className="min-h-11 text-teal-300" onClick={() => { setInput(mode === "encode" ? "Hola, mundo. ¡Diseña y crea! 🚀" : "SG9sYSwgbXVuZG8u"); setFeedback(""); }}>Cargar ejemplo</button></div></> : <ImageDropzone currentImage={image} onImageLoad={(file, data) => { setImage(data); setImageName(file.name); setFeedback(""); trackImmediate("convert", { mode: "image" }); }} onClear={() => { setImage(null); setImageName(""); setFeedback(""); }} maxSize={20 * 1024 * 1024} accentColor="#5eead4" />}
                    </div>
                </section>
                <section className="studio-panel overflow-hidden">
                    <div className="studio-panel-heading flex items-center justify-between"><h2 className="text-sm font-medium text-white">{tab === "image" ? "URL de datos" : mode === "encode" ? "Resultado Base64" : "Texto decodificado"}</h2><span className="text-[11px] text-teal-300">{result.output ? "Resultado listo" : "Vista en vivo"}</span></div>
                    <div className="space-y-4 p-4">
                        {result.error ? <p role="alert" className="flex min-h-[290px] items-center justify-center gap-3 rounded-xl border border-amber-300/20 bg-amber-300/5 p-6 text-sm leading-relaxed text-amber-200"><AlertCircle size={20} className="shrink-0" aria-hidden="true" />{result.error}</p> : <textarea aria-label="Resultado" readOnly value={result.output} placeholder="Tu resultado aparecerá aquí." className="min-h-[290px] w-full resize-y rounded-xl border border-white/[0.08] bg-[#0b111a] p-4 font-mono text-sm leading-relaxed text-slate-300 placeholder:text-slate-600" spellCheck={false} />}
                        <div className="flex flex-wrap gap-2"><button type="button" className="studio-button studio-button-primary" disabled={!result.output} onClick={copy}>{feedback.startsWith("Copiado") ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}Copiar resultado</button><button type="button" disabled={!result.output} onClick={download} className="studio-button"><Download size={15} aria-hidden="true" />Descargar .txt</button>{tab === "text" && <button type="button" disabled={!result.output} onClick={() => { setInput(result.output); setMode(mode === "encode" ? "decode" : "encode"); setFeedback(""); }} className="studio-button"><ArrowLeftRight size={15} aria-hidden="true" />Invertir</button>}</div>
                        <p role="status" className="min-h-4 text-xs text-teal-200">{feedback}</p>
                        {tab === "image" && imageName && <p className="break-all text-xs text-slate-400">Resultado de {imageName}. Incluye el prefijo data:image para usarlo en HTML o CSS.</p>}
                    </div>
                </section>
            </div>
            <p className="mt-6 max-w-3xl text-xs leading-relaxed text-slate-500">Base64 es una codificación, no un cifrado: cualquiera puede recuperar el contenido. Las imágenes codificadas suelen ocupar más que el archivo original; úsalo cuando necesites un recurso incrustado.</p>
        </main></div>
    );
}
