"use client";

import { useState, useRef } from "react";
import { ArrowLeft, Printer, Share2, Mail, MessageSquare, Copy, Check } from "lucide-react";

interface QuotationViewerProps {
    quotation: {
        folio: string;
        projectName: string;
        client?: { name: string; slug: string } | null;
        clientName: string;
    };
    htmlContent: string;
}

export default function QuotationViewer({ quotation, htmlContent }: QuotationViewerProps) {
    const [showShareModal, setShowShareModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handlePrint = () => {
        iframeRef.current?.contentWindow?.postMessage("print", "*");
    };

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareText = `Hola, revisa esta cotización: ${quotation.projectName} - ${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    const emailUrl = `mailto:?subject=Cotización: ${encodeURIComponent(quotation.projectName)}&body=${encodeURIComponent(shareText)}`;

    // Inject print helper
    const enhancedContent = htmlContent.includes("</body>")
        ? htmlContent.replace(
            "</body>",
            `<script>
                window.addEventListener('message', function(e) {
                    if (e.data === 'print') window.print();
                });
            </script></body>`
        )
        : htmlContent + `<script>window.addEventListener('message', function(e) { if (e.data === 'print') window.print(); });</script>`;

    return (
        <div className="min-h-screen bg-slate-100">
            {/* Toolbar */}
            <div className="print:hidden fixed top-0 left-0 right-0 bg-slate-900 text-white p-4 z-50 flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-4">
                    <a
                        href="/"
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={18} />
                        <span className="hidden sm:inline">Inicio</span>
                    </a>
                    <div className="hidden md:block h-6 w-px bg-slate-700" />
                    <div className="hidden md:block">
                        <p className="text-xs text-slate-500">Cliente</p>
                        <p className="text-sm font-medium">{quotation.client?.name || quotation.clientName}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-400 font-mono hidden md:inline">
                        {quotation.folio}
                    </span>

                    <div className="relative">
                        <button
                            onClick={() => setShowShareModal(!showShareModal)}
                            className={`p-2 rounded-lg transition-colors ${showShareModal ? "bg-indigo-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-white"}`}
                            title="Compartir"
                        >
                            <Share2 size={18} />
                        </button>

                        {/* Share Popup */}
                        {showShareModal && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowShareModal(false)} />
                                <div className="absolute right-0 top-12 z-50 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200">
                                    <h3 className="text-white font-semibold mb-4 text-sm">Compartir Cotización</h3>
                                    <div className="space-y-2">
                                        <a
                                            href={whatsappUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 w-full p-3 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                                        >
                                            <MessageSquare size={18} />
                                            <span className="text-sm font-medium">WhatsApp</span>
                                        </a>

                                        <a
                                            href={emailUrl}
                                            className="flex items-center gap-3 w-full p-3 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                        >
                                            <Mail size={18} />
                                            <span className="text-sm font-medium">Correo Electrónico</span>
                                        </a>

                                        <button
                                            onClick={copyToClipboard}
                                            className="flex items-center gap-3 w-full p-3 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                                        >
                                            {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                                            <span className="text-sm font-medium">{copied ? "Enlace Copiado" : "Copiar Enlace"}</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <button
                        onClick={handlePrint}
                        className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                        <Printer size={16} />
                        <span className="hidden sm:inline">Imprimir / PDF</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="pt-20 pb-8 print:p-0">
                <iframe
                    ref={iframeRef}
                    srcDoc={enhancedContent}
                    className="w-full border-0 bg-white mx-auto shadow-2xl print:shadow-none"
                    style={{
                        minHeight: "100vh",
                        width: "100%",
                        display: "block"
                    }}
                    title={quotation.projectName}
                    sandbox="allow-same-origin allow-scripts"
                    onLoad={(e) => {
                        const iframe = e.target as HTMLIFrameElement;
                        try {
                            const height = iframe.contentWindow?.document?.body?.scrollHeight;
                            if (height) iframe.style.height = Math.max(height, 800) + "px";
                        } catch { }
                    }}
                />
            </div>
        </div>
    );
}
