"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { QuotationForm } from "@/modules/quotations/components/QuotationForm";
import { QuotationPreview } from "@/modules/quotations/components/QuotationPreview";
import type { QuotationData } from "../new/client";
import Link from "next/link";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function EditQuotationPageClient({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const [data, setData] = useState<QuotationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<"edit" | "preview">("preview");

    useEffect(() => {
        loadQuotation();
    }, [id]);

    const loadQuotation = async () => {
        try {
            const res = await fetch(`/api/quotations/${id}`);
            if (res.ok) {
                const quotation = await res.json();
                // Transform API response to form data format
                setData({
                    folio: quotation.folio,
                    date: quotation.createdAt.split("T")[0],
                    validDays: quotation.validDays,
                    clientName: quotation.clientName,
                    clientEmail: quotation.clientEmail || "",
                    projectName: quotation.projectName,
                    projectDescription: quotation.projectDescription || "",
                    scope: quotation.scope || "",
                    // New fields
                    providerCosts: quotation.providerCosts || [],
                    professionalFees: quotation.professionalFees || [],
                    commercialConditions: quotation.commercialConditions || {
                        deadline: quotation.timeline || "18 días hábiles",
                        payments: quotation.paymentTerms || "50% Inicio / 50% entrega conforme",
                        revisions: "2 rondas de feedback incluidas",
                    },
                    warrantyDelivery: quotation.warrantyDelivery || {
                        training: "Sesión online de uso",
                        warranty: "30 días de soporte técnico post-entrega",
                        content: "Carga histórica a cargo del cliente",
                    },
                    footerNote: quotation.footerNote || quotation.notes || "",
                    // Legacy fields
                    items: quotation.items || [],
                    paymentTerms: quotation.paymentTerms || "",
                    timeline: quotation.timeline || "",
                    notes: quotation.notes || "",
                    exclusions: quotation.exclusions || [],
                });
            } else {
                router.push("/admin/quotations");
            }
        } catch (error) {
            console.error("Error loading quotation:", error);
            router.push("/admin/quotations");
        } finally {
            setLoading(false);
        }
    };

    const updateData = (updates: Partial<QuotationData>) => {
        setData((prev) => prev ? { ...prev, ...updates } : null);
    };

    const handleSave = async () => {
        if (!data) return;
        setSaving(true);

        try {
            const subtotal = data.items.reduce((sum, item) => sum + item.price, 0);
            const res = await fetch(`/api/quotations/${id}`, {
                method: "PATCH",
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
                }),
            });

            if (res.ok) {
                // Show success feedback
                setActiveTab("preview");
            }
        } catch (error) {
            console.error("Error saving quotation:", error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-neutral-500 mt-4">Cargando cotización...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-12">
                <p className="text-neutral-500">Cotización no encontrada</p>
                <Link href="/admin/quotations" className="text-accent-1 hover:underline mt-2 inline-block">
                    Volver a cotizaciones
                </Link>
            </div>
        );
    }

    const subtotal = data.items.reduce((sum, item) => sum + item.price, 0);

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
                        <h1 className="text-2xl font-bold text-white">Cotización #{data.folio}</h1>
                        <p className="text-neutral-400 mt-1">{data.clientName} · {data.projectName}</p>
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

            {/* Content */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
            >
                {activeTab === "edit" ? (
                    <div className="space-y-6">
                        <QuotationForm data={data} updateData={updateData} subtotal={subtotal} />
                        <div className="flex justify-end">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2.5 rounded-xl bg-accent-1 text-black font-semibold flex items-center gap-2 disabled:opacity-50"
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
                                        Guardar cambios
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </div>
                ) : (
                    <QuotationPreview data={data} subtotal={subtotal} />
                )}
            </motion.div>
        </div>
    );
}
