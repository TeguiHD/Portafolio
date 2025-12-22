"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { QuotationForm } from "@/modules/quotations/components/QuotationForm";
import { QuotationPreview } from "@/modules/quotations/components/QuotationPreview";
import { FloatingAIChat, INITIAL_CHAT_MESSAGES, type ChatMessage } from "@/modules/quotations/components/QuotationAIChat";
import { UnsavedChangesModal, useUnsavedChanges } from "@/modules/quotations/components/UnsavedChangesModal";

// ============= NEW DATA MODEL =============

export interface QuotationData {
    folio: string;
    date: string;
    validDays: number;

    // Header
    clientName: string;
    clientEmail: string;
    projectName: string;

    // Section 1: Project Scope (rich text HTML)
    scope: string;

    // Section 2a: Provider Costs
    providerCosts: ProviderCostItem[];

    // Section 2b: Professional Fees
    professionalFees: ProfessionalFeeItem[];

    // Section 3: Conditions
    commercialConditions: CommercialConditions;
    warrantyDelivery: WarrantyDelivery;

    // Footer note
    footerNote: string;

    // Legacy fields for backwards compatibility
    items: QuotationItem[];
    projectDescription: string;
    paymentTerms: string;
    timeline: string;
    notes: string;
    exclusions: string[];
}

export interface ProviderCostItem {
    id: string;
    name: string;
    provider: string;
    providerDetail?: string;  // e.g., "(Pago Anual)"
    costMin: number;
    costMax?: number;  // For ranges like ~$45.000 - $53.000
    isHighlighted: boolean;  // Yellow highlight for offers
    badge?: string;  // "OFERTA", "DOMINIO GRATIS"
}

export interface ProfessionalFeeItem {
    id: string;
    title: string;
    description: string;  // Rich text HTML with bullet points
    price: number;
}

export interface CommercialConditions {
    deadline: string;  // "18 días hábiles"
    payments: string;  // "50% Inicio / 50% entrega conforme"
    revisions: string;  // "2 rondas de feedback incluidas"
}

export interface WarrantyDelivery {
    training: string;  // "Sesión online de uso"
    warranty: string;  // "30 días de soporte técnico"
    content: string;  // "Carga histórica a cargo del cliente"
}

// Legacy interface for backwards compatibility
export interface QuotationItem {
    id: string;
    title: string;
    description: string;
    deliverables: string[];
    price: number;
}

const initialData: QuotationData = {
    folio: `WEB-${new Date().getFullYear()}-XXX`,
    date: new Date().toISOString().split("T")[0],
    validDays: 15,
    clientName: "",
    clientEmail: "",
    projectName: "",
    scope: "",
    providerCosts: [],
    professionalFees: [],
    commercialConditions: {
        deadline: "18 días hábiles",
        payments: "50% Inicio / 50% entrega conforme",
        revisions: "2 rondas de feedback incluidas",
    },
    warrantyDelivery: {
        training: "Sesión online de uso",
        warranty: "30 días de soporte técnico post-entrega",
        content: "Carga histórica a cargo del cliente",
    },
    footerNote: "",
    // Legacy
    items: [],
    projectDescription: "",
    paymentTerms: "",
    timeline: "",
    notes: "",
    exclusions: [],
};

export default function NewQuotationPageClient() {
    const router = useRouter();
    const [data, setData] = useState<QuotationData>(initialData);
    const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Chat state for persistence between tab switches
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
    const [usedActions, setUsedActions] = useState<Set<string>>(new Set());

    const updateData = (updates: Partial<QuotationData>) => {
        setData((prev) => ({ ...prev, ...updates }));
    };

    const subtotal = data.items.reduce((sum, item) => sum + item.price, 0);

    // Detect if form has unsaved changes
    const isDirty =
        data.clientName !== "" ||
        data.projectName !== "" ||
        data.items.length > 0 ||
        chatMessages.length > 1; // More than welcome message

    // Save as draft function
    const handleSaveDraft = async () => {
        if (!data.clientName && !data.projectName && data.items.length === 0) {
            return; // Nothing to save
        }

        setSaving(true);
        try {
            const res = await fetch("/api/quotations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    items: data.items,
                    subtotal,
                    total: subtotal,
                    status: "draft",
                }),
            });

            if (res.ok) {
                // Successfully saved
            }
        } catch (error) {
            console.error("Error saving draft:", error);
        } finally {
            setSaving(false);
        }
    };

    // Unsaved changes protection
    const {
        showModal: showUnsavedModal,
        handleClose: handleUnsavedClose,
        handleDiscard,
        handleSaveDraft: handleModalSaveDraft,
        isSaving: isModalSaving,
    } = useUnsavedChanges({ isDirty, onSaveDraft: handleSaveDraft });

    const handleSave = async (asDraft = false) => {
        if (!data.clientName || !data.projectName) {
            setSaveError("Por favor completa el nombre del cliente y el proyecto");
            return;
        }

        if (data.items.length === 0) {
            setSaveError("Agrega al menos un servicio a la cotización");
            return;
        }

        setSaving(true);
        setSaveError(null);

        try {
            const res = await fetch("/api/quotations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientName: data.clientName,
                    clientEmail: data.clientEmail,
                    projectName: data.projectName,
                    items: data.items,
                    subtotal,
                    total: subtotal,
                    validDays: data.validDays,
                    paymentTerms: data.paymentTerms,
                    timeline: data.timeline,
                    notes: data.notes,
                    status: asDraft ? "draft" : "sent",
                }),
            });

            if (res.ok) {
                const quotation = await res.json();
                router.push(`/admin/quotations/${quotation.id}`);
            } else {
                const error = await res.json();
                setSaveError(error.error || "Error al guardar la cotización");
            }
        } catch (error) {
            console.error("Error saving quotation:", error);
            setSaveError("Error de conexión. Intenta de nuevo.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/quotations"
                        className="p-2 rounded-lg bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Nueva Cotización</h1>
                        <p className="text-neutral-400 mt-1">Crea una propuesta comercial profesional</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab("edit")}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "edit"
                            ? "bg-accent-1 text-black"
                            : "bg-white/5 text-neutral-400 hover:text-white"
                            }`}
                    >
                        Editar
                    </button>
                    <button
                        onClick={() => setActiveTab("preview")}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "preview"
                            ? "bg-accent-1 text-black"
                            : "bg-white/5 text-neutral-400 hover:text-white"
                            }`}
                    >
                        Vista previa
                    </button>
                </div>
            </div>

            {/* Error message */}
            {saveError && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm"
                >
                    {saveError}
                </motion.div>
            )}

            {/* Content */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
            >
                {activeTab === "edit" ? (
                    <QuotationForm data={data} updateData={updateData} subtotal={subtotal} />
                ) : (
                    <QuotationPreview data={data} subtotal={subtotal} />
                )}
            </motion.div>

            {/* Save Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-accent-1/10">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-neutral-400 font-medium hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                >
                    Guardar como borrador
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-accent-1 text-black font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {saving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            Guardando...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Guardar y enviar
                        </>
                    )}
                </motion.button>
            </div>

            {/* Floating AI Chat */}
            <FloatingAIChat
                data={data}
                updateData={updateData}
                messages={chatMessages}
                setMessages={setChatMessages}
                usedActions={usedActions}
                setUsedActions={setUsedActions}
            />

            {/* Unsaved Changes Modal */}
            <UnsavedChangesModal
                isOpen={showUnsavedModal}
                onClose={handleUnsavedClose}
                onDiscard={handleDiscard}
                onSaveDraft={handleModalSaveDraft}
                isSaving={isModalSaving}
            />
        </div>
    );
}
