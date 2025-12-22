"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useToolTracking } from "@/hooks/useDebounce";
import { useToolAccess } from "@/hooks/useToolAccess";

export default function ImageBase64Page() {
    const { isLoading } = useToolAccess("image-base64");
    const [activeTab, setActiveTab] = useState<"image" | "text">("image");
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [fileName, setFileName] = useState("");
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { trackImmediate } = useToolTracking("image-base64", { trackViewOnMount: true });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
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
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-white/10 mb-8">
                        <button
                            onClick={() => { setActiveTab("image"); setInput(""); setOutput(""); }}
                            className={`pb-4 px-2 text-sm font-medium transition-colors relative ${activeTab === "image" ? "text-accent-1" : "text-neutral-400 hover:text-white"
                                }`}
                        >
                            Imagen a Base64
                            {activeTab === "image" && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-1" />
                            )}
                        </button>
                        <button
                            onClick={() => { setActiveTab("text"); setInput(""); setOutput(""); }}
                            className={`pb-4 px-2 text-sm font-medium transition-colors relative ${activeTab === "text" ? "text-accent-1" : "text-neutral-400 hover:text-white"
                                }`}
                        >
                            Texto Encoder/Decoder
                            {activeTab === "text" && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-1" />
                            )}
                        </button>
                    </div>

                    {activeTab === "image" ? (
                        <div className="space-y-6">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center cursor-pointer hover:border-accent-1/50 hover:bg-white/5 transition-all"
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
                                        <img src={input} alt="Preview" className="max-h-48 rounded-lg mb-4" />
                                        <p className="text-white font-medium">{fileName}</p>
                                        <p className="text-sm text-neutral-400">Clic para cambiar imagen</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <svg className="w-12 h-12 text-neutral-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-white font-medium">Arrastra una imagen o haz clic para subir</p>
                                        <p className="text-sm text-neutral-400 mt-2">Soporta PNG, JPG, GIF, SVG</p>
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
                        <div className="mt-6 space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-neutral-400">Cadena Base64</label>
                                <button
                                    onClick={handleCopy}
                                    className="text-sm text-accent-1 hover:text-white transition-colors flex items-center gap-1"
                                >
                                    {copied ? "Copiado!" : "Copiar código"}
                                </button>
                            </div>
                            <textarea
                                value={output}
                                readOnly
                                className="w-full h-32 bg-[#0F1724] border border-white/10 rounded-xl p-4 text-neutral-400 font-mono text-xs outline-none resize-none"
                            />
                        </div>
                    )}
                </div>

                {/* Back Link */}
                <div className="mt-8 text-center">
                    <Link
                        href="/tools"
                        className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver a herramientas
                    </Link>
                </div>
            </main>
        </div>
    );
}
