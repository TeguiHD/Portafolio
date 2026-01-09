"use client";

import { useState, useRef } from "react";
import { useToolTracking } from "@/hooks/useDebounce";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";

export default function ImageBase64Page() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("base64");
    const [activeTab, setActiveTab] = useState<"image" | "text">("image");
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [fileName, setFileName] = useState("");
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { trackImmediate } = useToolTracking("base64", { trackViewOnMount: true });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Conversor Base64"} />;
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onload = (ev) => {
                const result = ev.target?.result as string;
                setInput(result);
                setOutput(result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleTextConvert = (text: string, mode: "encode" | "decode") => {
        setInput(text);
        try {
            if (mode === "encode") {
                setOutput(btoa(text));
            } else {
                setOutput(atob(text));
            }
        } catch {
            setOutput("Error: Texto inválido para decodificar");
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(output);
        setCopied(true);
        trackImmediate("copy_base64");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center">
                            <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Conversor Base64</h1>
                            <p className="text-sm text-neutral-400">Codifica y decodifica texto e imágenes al instante</p>
                        </div>
                    </div>

                    {/* Info Banner */}
                    <div className="mt-4 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                        <div className="flex gap-3">
                            <div className="shrink-0 mt-0.5">
                                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="text-sm text-neutral-300">
                                <p className="font-medium text-cyan-400 mb-1">¿Qué es Base64?</p>
                                <p className="text-neutral-400">
                                    Base64 es un sistema de codificación que convierte datos binarios en texto ASCII.
                                    Es ideal para <span className="text-white">incrustar imágenes en HTML/CSS</span>,
                                    <span className="text-white"> enviar archivos en JSON</span>, o
                                    <span className="text-white"> almacenar datos en URLs</span> sin caracteres especiales.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
                    {/* Tabs */}
                    <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-8 w-fit">
                        <button
                            onClick={() => { setActiveTab("image"); setInput(""); setOutput(""); }}
                            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "image"
                                ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25"
                                : "text-neutral-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Imagen a Base64
                        </button>
                        <button
                            onClick={() => { setActiveTab("text"); setInput(""); setOutput(""); }}
                            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "text"
                                ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25"
                                : "text-neutral-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Texto Encoder/Decoder
                        </button>
                    </div>

                    {activeTab === "image" ? (
                        <div className="space-y-6">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-white/20 rounded-xl p-10 text-center cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group"
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                    accept="image/*"
                                    className="hidden"
                                />
                                {input ? (
                                    <div className="flex flex-col items-center">
                                        <img src={input} alt="Preview" className="max-h-48 rounded-lg mb-4 shadow-xl" />
                                        <p className="text-white font-medium">{fileName}</p>
                                        <p className="text-sm text-neutral-400 mt-1">Clic para cambiar imagen</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <p className="text-white font-medium mb-1">Arrastra una imagen o haz clic para subir</p>
                                        <p className="text-sm text-neutral-500">PNG, JPG, GIF, SVG, WEBP</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-neutral-400">Entrada</label>
                                <textarea
                                    value={input}
                                    onChange={(e) => handleTextConvert(e.target.value, "encode")}
                                    placeholder="Escribe texto para codificar..."
                                    className="w-full h-64 bg-[#0F1724] border border-white/10 rounded-xl p-4 text-white font-mono text-sm focus:ring-2 focus:ring-accent-1 outline-none resize-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-neutral-400">Salida (Base64)</label>
                                <textarea
                                    value={output}
                                    readOnly
                                    className="w-full h-64 bg-[#0F1724] border border-white/10 rounded-xl p-4 text-neutral-400 font-mono text-sm outline-none resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Output Area for Image */}
                    {activeTab === "image" && output && (
                        <div className="mt-6 space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-white">Resultado Base64</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                        {(output.length / 1024).toFixed(1)} KB
                                    </span>
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${copied
                                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                        : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20"
                                        }`}
                                >
                                    {copied ? (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            ¡Copiado!
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            Copiar código
                                        </>
                                    )}
                                </button>
                            </div>
                            <textarea
                                value={output}
                                readOnly
                                className="w-full h-32 bg-[#0a0e17] border border-white/10 rounded-xl p-4 text-neutral-400 font-mono text-xs outline-none resize-none focus:border-cyan-500/30"
                            />
                            <p className="text-xs text-neutral-500">
                                💡 Tip: Usa este código en <code className="text-cyan-400">src=&quot;data:image/...&quot;</code> para incrustar la imagen directamente en HTML
                            </p>
                        </div>
                    )}
                </div>

                {/* Use Cases Section */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
                            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                        </div>
                        <h3 className="font-medium text-white text-sm mb-1">HTML/CSS Inline</h3>
                        <p className="text-xs text-neutral-500">Incrusta imágenes sin archivos externos</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
                            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="font-medium text-white text-sm mb-1">APIs y JSON</h3>
                        <p className="text-xs text-neutral-500">Transmite datos binarios de forma segura</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-3">
                            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                            </svg>
                        </div>
                        <h3 className="font-medium text-white text-sm mb-1">Data URIs</h3>
                        <p className="text-xs text-neutral-500">Almacena en localStorage o URLs</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
