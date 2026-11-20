"use client";

import { useState } from "react";
import { Sparkles, Code, Eye, X, MessageSquare, ChevronDown, ChevronRight } from "lucide-react";
import { QuotationData } from "../../../modules/quotations/types";
import QuotationForm from "./components/quotation-form";
import QuotationPreview from "./components/quotation-preview";
import QuotationFinalizer from "./quotation-finalizer";
import { QuotationAIChat } from "../../../modules/quotations/components/QuotationAIChat";
import { cn } from "../../../lib/utils";
import { BOTON, BOTON_ICONO, FOCO } from "@/modules/quotations/estilos";

interface Props {
    initialData: QuotationData;
    clientId: string;
    clientName: string;
    onClose: () => void;
    /** Ya publicada: quien la contiene deja de advertir «¿salir sin publicar?». */
    onPublished?: () => void;
}

export default function QuotationWorkspace({ initialData, clientId, clientName, onClose, onPublished }: Props) {
    const [draft, setDraft] = useState<QuotationData>(initialData);
    const [viewMode, setViewMode] = useState<"visual" | "code">("visual");
    const [showAi, setShowAi] = useState(false);
    const [showPreview, _setShowPreview] = useState(true); // For mobile/tablet toggling
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
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8">
                <div className="mx-auto max-w-2xl">
                    <QuotationFinalizer
                        clientId={clientId}
                        draft={{
                            ...draft,
                            // Ensure compatibility for Finalizer
                            // El mismo total que la vista previa (con los servicios que agrega el asistente).
                            total: (draft.providerCosts.reduce((s, i) => s + i.costMin, 0) +
                                draft.professionalFees.reduce((s, i) => s + i.price, 0) +
                                (draft.items || []).reduce((s, i) => s + (i.price || (i.unitPrice ?? 0) * (i.quantity ?? 0) || 0), 0)),
                            items: [
                                // Map our provider/fee items to legacy items for the finalizer view compatibility if needed
                                // OR better: update finalizer to handle complex data. For now, let's keep it simple.
                                ...draft.items || []
                            ]
                        }}
                        onBack={() => setIsFinalizing(false)}
                        onPublished={onPublished}
                        onSuccess={() => {
                            // Ya quedó publicada: se recarga para ver la lista al día (cerrar antes preguntaría
                            // «¿salir sin publicar?» en vano).
                            window.location.reload();
                        }}
                    />
                </div>
            </div>
        );
    }

    const vista = (activa: boolean) => cn(
        "inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-xs font-medium transition-colors duration-150",
        FOCO,
        activa ? "bg-[color-mix(in_srgb,var(--txt)_8%,transparent)] text-[var(--txt)]" : "text-[var(--mut)] hover:text-[var(--txt)]"
    );

    return (
        <div className="relative flex min-h-0 flex-1 overflow-hidden bg-[var(--fondo)]">

            {/* Panel izquierdo: formulario */}
            <div className={cn(
                "z-10 flex w-full shrink-0 flex-col border-r border-[var(--linea)] bg-[var(--sup)] lg:w-[450px]",
                !showPreview && "lg:w-full"
            )}>
                <div className="flex h-16 shrink-0 items-center gap-2 border-b border-[var(--linea)] px-3">
                    <button type="button" onClick={onClose} aria-label="Cerrar el constructor" className={BOTON_ICONO}>
                        <X size={18} aria-hidden="true" />
                    </button>
                    <p className="min-w-0 truncate font-semibold text-[var(--txt)]">{clientName}</p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                    <QuotationForm data={draft} onChange={handleDraftUpdate} />
                </div>

                <div className="shrink-0 border-t border-[var(--linea)] p-4">
                    <button type="button" onClick={() => setIsFinalizing(true)} className={`${BOTON} w-full`}>
                        Revisar y publicar
                        <ChevronRight size={16} aria-hidden="true" />
                    </button>
                </div>
            </div>

            {/* Panel derecho: vista previa (solo en pantallas anchas) */}
            <div className="relative hidden flex-1 flex-col overflow-hidden lg:flex">
                <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--linea)] px-6">
                    <div role="group" aria-label="Qué mostrar" className="flex rounded-lg border border-[var(--linea-2)] p-0.5">
                        <button type="button" onClick={() => setViewMode("visual")} aria-pressed={viewMode === "visual"} className={vista(viewMode === "visual")}>
                            <Eye size={14} aria-hidden="true" /> Vista previa
                        </button>
                        <button type="button" onClick={() => setViewMode("code")} aria-pressed={viewMode === "code"} className={vista(viewMode === "code")}>
                            <Code size={14} aria-hidden="true" /> Datos
                        </button>
                    </div>
                    <p className="text-xs text-[var(--mut)]">Se actualiza mientras escribes</p>
                </div>

                <div className="flex flex-1 justify-center overflow-y-auto p-8">
                    <div className="w-full max-w-4xl origin-top scale-[0.85]">
                        {viewMode === "visual" ? (
                            <QuotationPreview data={draft} />
                        ) : (
                            <pre className="h-full overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--linea-2)] bg-[var(--fondo-2)] p-6 font-mono text-xs text-[var(--txt)]">
                                {"<!-- El HTML final se genera al publicar -->\n"}
                                {JSON.stringify(draft, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>
            </div>

            {/* Botón del asistente */}
            <button
                type="button"
                onClick={() => setShowAi(!showAi)}
                aria-expanded={showAi}
                aria-controls="asistente-propuesta"
                className={cn(
                    "absolute bottom-24 right-4 z-[60] grid size-14 place-items-center rounded-full shadow-xl transition-colors duration-150 lg:bottom-6 lg:right-6",
                    FOCO,
                    showAi
                        ? "border border-[var(--linea-2)] bg-[var(--sup)] text-[var(--mut)] hover:text-[var(--txt)]"
                        : "bg-[var(--acento)] text-[var(--acento-tinta)] hover:bg-[color-mix(in_srgb,var(--acento)_86%,var(--txt))]"
                )}
                aria-label={showAi ? "Cerrar el asistente" : "Abrir el asistente de IA"}
            >
                {showAi ? <X size={22} aria-hidden="true" /> : <MessageSquare size={22} aria-hidden="true" />}
            </button>

            {/* Panel del asistente: queda montado (guarda la conversación) e inerte mientras está oculto */}
            <section
                id="asistente-propuesta"
                aria-labelledby="asistente-propuesta-titulo"
                inert={!showAi}
                className={cn(
                    "absolute bottom-40 right-4 z-50 flex h-[600px] max-h-[calc(100dvh-200px)] w-[400px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-[var(--linea-2)] bg-[var(--sup)] shadow-2xl transition-opacity duration-200 motion-reduce:transition-none lg:bottom-24 lg:right-6 lg:max-h-[calc(100dvh-150px)]",
                    showAi ? "opacity-100" : "pointer-events-none opacity-0"
                )}
            >
                <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--linea)] px-4">
                    <h2 id="asistente-propuesta-titulo" className="flex items-center gap-2 font-semibold text-[var(--txt)]">
                        <Sparkles size={16} aria-hidden="true" className="text-[var(--acento)]" />
                        Asistente
                    </h2>
                    <button type="button" onClick={() => setShowAi(false)} aria-label="Minimizar el asistente" className={BOTON_ICONO}>
                        <ChevronDown size={18} aria-hidden="true" />
                    </button>
                </div>
                <div className="relative flex-1 overflow-hidden">
                    <QuotationAIChat
                        data={draft}
                        updateData={handleAiUpdate}
                    />
                </div>
            </section>

        </div>
    );
}
