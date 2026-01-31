"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { QuotationData, ProfessionalFeeItem } from "../types";
import { v4 as uuidv4 } from "uuid";
import {
    projectTypes,
    serviceTemplates,
    type ProjectType,
    type ServiceTemplate,
} from "../templates/quotation-templates";
import { RichTextEditor } from "./RichTextEditor";
import { ProviderCostsTable } from "./ProviderCostsTable";
import { ProfessionalFeesSection } from "./ProfessionalFeesSection";
import { CommercialConditionsSection } from "./CommercialConditionsSection";

interface QuotationFormProps {
    data: QuotationData;
    updateData: (updates: Partial<QuotationData>) => void;
    subtotal: number; // Reserved for potential future use
}

export function QuotationForm({ data, updateData, subtotal: _subtotal }: QuotationFormProps) {
    const [selectedProjectType, setSelectedProjectType] = useState<ProjectType | null>(null);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    // Calculate totals
    const providerTotal = data.providerCosts.reduce((sum, item) => {
        const avg = item.costMax ? (item.costMin + item.costMax) / 2 : item.costMin;
        return sum + avg;
    }, 0);
    const feesTotal = data.professionalFees.reduce((sum, item) => sum + item.price, 0);
    const _grandTotal = feesTotal; // Provider costs are separate (paid by client directly)

    // Legacy functions for template modal
    const addFromTemplate = (template: ServiceTemplate) => {
        const newItem: ProfessionalFeeItem = {
            id: uuidv4(),
            title: template.title,
            description: `<ul>${template.deliverables.map(d => `<li>${d}</li>`).join("")}</ul>`,
            price: template.basePrice,
        };
        updateData({ professionalFees: [...data.professionalFees, newItem] });
        setShowTemplateModal(false);
    };

    const _handleProjectTypeSelect = (type: ProjectType) => {
        setSelectedProjectType(type);
        const projectInfo = projectTypes.find(pt => pt.id === type);
        if (projectInfo) {
            updateData({
                commercialConditions: {
                    ...data.commercialConditions,
                    deadline: projectInfo.defaultTimeline,
                    payments: projectInfo.defaultPaymentTerms,
                },
            });
        }
    };

    const generateWithAI = async () => {
        if (!data.clientName || !data.projectName || !data.projectDescription) {
            setAiError("Completa el nombre del cliente, proyecto y descripción");
            return;
        }

        setIsGeneratingAI(true);
        setAiError(null);

        try {
            const res = await fetch("/api/quotations/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientName: data.clientName,
                    projectName: data.projectName,
                    projectType: selectedProjectType || "website",
                    description: data.projectDescription,
                }),
            });

            const result = await res.json();

            if (!res.ok) {
                setAiError(result.error || "Error al generar cotización");
                return;
            }

            // Apply AI results to new structure
            const newFees: ProfessionalFeeItem[] = result.services.map((s: { title: string; description: string; deliverables: string[]; price: number }) => ({
                id: uuidv4(),
                title: s.title,
                description: `<ul>${s.deliverables.map((d: string) => `<li>${d}</li>`).join("")}</ul>`,
                price: s.price,
            }));

            updateData({
                scope: result.scope,
                professionalFees: [...data.professionalFees, ...newFees],
            });
        } catch (error) {
            console.error("AI generation error:", error);
            setAiError("Error de conexión. Intenta de nuevo.");
        } finally {
            setIsGeneratingAI(false);
        }
    };

    return (
        <>
            <div className="space-y-8">
                {/* ============ HEADER SECTION ============ */}
                <div className="glass-panel rounded-2xl border border-accent-1/20 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-purple-400">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <h2 className="text-lg font-semibold text-white">Información de la Cotización</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Client */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-neutral-400 mb-2">Cliente</label>
                                <input
                                    type="text"
                                    value={data.clientName}
                                    onChange={(e) => updateData({ clientName: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white placeholder-neutral-500 focus:outline-none focus:border-accent-1/50 transition-all text-lg font-medium"
                                    placeholder="Nombre del Cliente o Empresa"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-neutral-400 mb-2">Email (opcional)</label>
                                <input
                                    type="email"
                                    value={data.clientEmail}
                                    onChange={(e) => updateData({ clientEmail: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white placeholder-neutral-500 focus:outline-none focus:border-accent-1/50 transition-all"
                                    placeholder="contacto@empresa.cl"
                                />
                            </div>
                        </div>
                        {/* Project */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-neutral-400 mb-2">Proyecto</label>
                                <input
                                    type="text"
                                    value={data.projectName}
                                    onChange={(e) => updateData({ projectName: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white placeholder-neutral-500 focus:outline-none focus:border-accent-1/50 transition-all text-lg font-medium"
                                    placeholder="Nombre del Proyecto"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-neutral-400 mb-2">Validez</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={data.validDays}
                                        onChange={(e) => updateData({ validDays: parseInt(e.target.value) || 15 })}
                                        className="w-20 px-3 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50 transition-all text-center"
                                    />
                                    <span className="text-neutral-400">días</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ============ SECTION 1: SCOPE ============ */}
                <div className="glass-panel rounded-2xl border border-accent-1/20 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-blue-400">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <h2 className="text-lg font-semibold text-white">1. Alcance del Proyecto</h2>
                    </div>
                    <RichTextEditor
                        content={data.scope}
                        onChange={(html) => updateData({ scope: html })}
                        placeholder="Describe el alcance del proyecto: objetivos, funcionalidades principales, tecnologías a utilizar..."
                        minHeight="200px"
                    />
                </div>

                {/* ============ SECTION 2: INVESTMENT DETAILS ============ */}
                <div className="glass-panel rounded-2xl border border-accent-1/20 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-green-400">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h2 className="text-lg font-semibold text-white">2. Detalle de Inversión</h2>
                    </div>

                    <div className="space-y-8">
                        {/* 2a. Provider Costs */}
                        <ProviderCostsTable
                            items={data.providerCosts}
                            onChange={(items) => updateData({ providerCosts: items })}
                        />

                        {/* 2b. Professional Fees */}
                        <ProfessionalFeesSection
                            items={data.professionalFees}
                            onChange={(items) => updateData({ professionalFees: items })}
                        />
                    </div>
                </div>

                {/* ============ SECTION 3: CONDITIONS ============ */}
                <div className="glass-panel rounded-2xl border border-accent-1/20 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-xl">📋</span>
                        <h2 className="text-lg font-semibold text-white">3. Condiciones</h2>
                    </div>
                    <CommercialConditionsSection
                        conditions={data.commercialConditions}
                        warranty={data.warrantyDelivery}
                        footerNote={data.footerNote}
                        onConditionsChange={(c) => updateData({ commercialConditions: c })}
                        onWarrantyChange={(w) => updateData({ warrantyDelivery: w })}
                        onFooterNoteChange={(n) => updateData({ footerNote: n })}
                    />
                </div>

                {/* ============ TOTALS ============ */}
                <div className="glass-panel rounded-2xl border border-accent-1/20 p-6">
                    <div className="space-y-3">
                        {data.providerCosts.length > 0 && (
                            <div className="flex items-center justify-between text-neutral-400">
                                <span>Costos Proveedores (referencial)</span>
                                <span>~${providerTotal.toLocaleString("es-CL")}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                            <span className="text-lg font-medium text-white">Total Honorarios</span>
                            <span className="text-3xl font-bold text-accent-1">
                                ${feesTotal.toLocaleString("es-CL")} CLP
                            </span>
                        </div>
                    </div>
                </div>

                {/* ============ AI HELPER SIDEBAR ============ */}
                <div className="glass-panel rounded-2xl border border-purple-500/20 p-6 bg-gradient-to-br from-purple-900/10 to-transparent">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">✨</span>
                        <h3 className="font-semibold text-white">Generar con IA</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">Describe el proyecto</label>
                            <textarea
                                value={data.projectDescription}
                                onChange={(e) => updateData({ projectDescription: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-purple-500/20 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/50 transition-all resize-none"
                                placeholder="Describe el proyecto: qué necesita el cliente, funcionalidades clave, tecnologías preferidas..."
                                rows={3}
                            />
                        </div>

                        {aiError && (
                            <p className="text-red-400 text-sm">{aiError}</p>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={generateWithAI}
                            disabled={isGeneratingAI || !data.projectDescription}
                            className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-500 hover:to-indigo-500 transition-all"
                        >
                            {isGeneratingAI ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Generando...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Generar Servicios
                                </>
                            )}
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Template Modal */}
            <AnimatePresence>
                {showTemplateModal && selectedProjectType && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowTemplateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-neutral-900 rounded-2xl border border-accent-1/20 p-6 max-w-2xl w-full max-h-[80vh] overflow-auto"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Agregar desde Plantilla</h2>
                                    <p className="text-sm text-neutral-400 mt-1">
                                        Servicios sugeridos para {projectTypes.find(pt => pt.id === selectedProjectType)?.name}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowTemplateModal(false)}
                                    className="p-2 text-neutral-400 hover:text-white transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-3">
                                {serviceTemplates[selectedProjectType]?.map((template) => (
                                    <div
                                        key={template.id}
                                        className="p-4 rounded-xl border border-accent-1/20 bg-white/5 hover:bg-white/10 transition-colors group"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-white">{template.title}</h3>
                                                <p className="text-sm text-neutral-400 mb-2">{template.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-accent-1">
                                                    ${template.basePrice.toLocaleString("es-CL")}
                                                </p>
                                                <button
                                                    onClick={() => addFromTemplate(template)}
                                                    className="mt-2 px-3 py-1.5 rounded-lg bg-accent-1/20 text-accent-1 text-sm font-medium hover:bg-accent-1/30 transition-colors"
                                                >
                                                    Agregar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
