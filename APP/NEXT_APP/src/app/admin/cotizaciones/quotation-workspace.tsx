"use client";

import { useState } from "react";
import { Sparkles, Layout, Code, Eye, X, MessageSquare, ChevronRight, ChevronLeft } from "lucide-react";
import { QuotationData } from "../../../modules/quotations/types";
import QuotationForm from "./components/quotation-form";
import QuotationPreview from "./components/quotation-preview";
import QuotationFinalizer from "./quotation-finalizer";
import { QuotationAIChat } from "../../../modules/quotations/components/QuotationAIChat";
import { cn } from "../../../lib/utils";

interface Props {
    initialData: QuotationData;
    clientId: string;
    clientName: string;
    onClose: () => void;
}

export default function QuotationWorkspace({ initialData, clientId, clientName, onClose }: Props) {
    const [draft, setDraft] = useState<QuotationData>(initialData);
    const [viewMode, setViewMode] = useState<"visual" | "code">("visual");
    const [showAi, setShowAi] = useState(false);
    const [showPreview, setShowPreview] = useState(true); // For mobile/tablet toggling
    const [isFinalizing, setIsFinalizing] = useState(false);

    // Update draft wrapper to maintain QuotationDraft compatibility
    const handleDraftUpdate = (data: QuotationData) => {
        setDraft(data);
    };

    // AI Helper function to bridge AI chat update format with our data structure
    const handleAiUpdate = (updates: Partial<QuotationData>) => {
        setDraft(prev => ({ ...prev, ...updates }));
    };

    if (isFinalizing) {
        return (
            <div className="h-full animate-in fade-in slide-in-from-bottom-4 p-8">
                <div className="max-w-2xl mx-auto">
                    <QuotationFinalizer
                        clientId={clientId}
                        draft={{
                            ...draft,
                            // Ensure compatibility for Finalizer
                            total: (draft.providerCosts.reduce((s, i) => s + i.costMin, 0) +
                                draft.professionalFees.reduce((s, i) => s + i.price, 0)),
                            items: [
                                // Map our provider/fee items to legacy items for the finalizer view compatibility if needed
                                // OR better: update finalizer to handle complex data. For now, let's keep it simple.
                                ...draft.items || []
                            ]
                        }}
                        onBack={() => setIsFinalizing(false)}
                        onSuccess={() => {
                            // Close modal
                            onClose();
                            // Ideally trigger a refresh
                            window.location.reload();
                        }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-slate-950 overflow-hidden relative">

            {/* LEFT PANEL: Editor Form */}
            <div className={cn(
                "w-full lg:w-[450px] flex flex-col border-r border-slate-800 bg-slate-950 shrink-0 transition-all duration-300 z-10",
                !showPreview && "lg:w-full"
            )}>
                {/* Toolbar */}
                <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900/50 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
                            <X size={18} />
                        </button>
                        <span className="font-semibold text-white truncate max-w-[200px]">{clientName}</span>
                    </div>
                    <div className="flex gap-2">

                    </div>
                </div>

                {/* Form Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <QuotationForm data={draft} onChange={handleDraftUpdate} />
                </div>

                {/* Bottom Bar */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                    <button
                        onClick={() => setIsFinalizing(true)}
                        className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-900/20 transition-all flex items-center justify-center gap-2"
                    >
                        <span>Finalizar Cotización</span>
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* RIGHT PANEL: Preview */}
            <div className={cn(
                "flex-1 bg-slate-900 relative overflow-hidden transition-all duration-300 flex flex-col",
                "hidden lg:flex" // Hide on mobile defaults
            )}>
                {/* Toolbar */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/50">
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode("visual")}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all",
                                viewMode === "visual" ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-white"
                            )}
                        >
                            <Eye size={14} /> Vista Previa
                        </button>
                        <button
                            onClick={() => setViewMode("code")}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all",
                                viewMode === "code" ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-white"
                            )}
                        >
                            <Code size={14} /> Código HTML
                        </button>
                    </div>
                    <div className="text-xs text-slate-500">
                        Live Preview
                    </div>
                </div>

                {/* Preview Content */}
                <div className="flex-1 overflow-y-auto bg-slate-900/50 p-8 flex justify-center">
                    <div className="w-full max-w-4xl scale-[0.85] origin-top transition-all duration-500">
                        {viewMode === "visual" ? (
                            <QuotationPreview data={draft} />
                        ) : (
                            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap h-full overflow-auto">
                                {/* In real implementaton, generateHTML(draft) goes here */}
                                {"<!-- El código HTML final se generará al finalizar -->"}
                                <br />
                                {JSON.stringify(draft, null, 2)}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* FLOATING ACTION BUTTON */}
            <button
                onClick={() => setShowAi(!showAi)}
                className={cn(
                    "absolute bottom-6 right-6 p-4 rounded-full shadow-2xl z-[60] transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center",
                    showAi
                        ? "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rotate-90"
                        : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/25"
                )}
                title={showAi ? "Cerrar asistente" : "Abrir asistente IA"}
            >
                {showAi ? <X size={24} /> : <MessageSquare size={24} />}
                {!showAi && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                    </span>
                )}
            </button>

            {/* FLOATING AI PANEL */}
            <div className={cn(
                "absolute bottom-24 right-6 w-[400px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-150px)] bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl rounded-2xl overflow-hidden z-50 flex flex-col transition-all duration-300 origin-bottom-right",
                showAi
                    ? "opacity-100 scale-100 translate-y-0"
                    : "opacity-0 scale-95 translate-y-8 pointer-events-none"
            )}>
                <div className="h-14 border-b border-slate-700/50 flex items-center justify-between px-4 bg-indigo-600/10">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold">
                        <Sparkles size={18} />
                        Asistente IA
                    </div>
                    {/* Botón minimizar/cerrar */}
                    <button onClick={() => setShowAi(false)} className="p-1 hover:bg-slate-800 rounded text-slate-400">
                        <ChevronRight size={20} className="rotate-90" />
                    </button>
                </div>
                <div className="flex-1 overflow-hidden relative">
                    <QuotationAIChat
                        data={draft}
                        updateData={handleAiUpdate}
                    />
                </div>
            </div>

        </div>
    );
}
