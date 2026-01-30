"use client";

import { useRef } from "react";
import { ArrowLeft, Printer, Share2 } from "lucide-react";

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
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handlePrint = () => {
        iframeRef.current?.contentWindow?.postMessage("print", "*");
    };

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            await navigator.share({
                title: `Cotización: ${quotation.projectName}`,
                url
            });
        } else {
            await navigator.clipboard.writeText(url);
            alert("Link copiado al portapapeles");
        }
    };

    // Inject print helper into content
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

                    <button
                        onClick={handleShare}
                        className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg transition-colors"
                        title="Compartir"
                    >
                        <Share2 size={18} />
                    </button>

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
                    sandbox="allow-scripts allow-modals allow-popups"
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
