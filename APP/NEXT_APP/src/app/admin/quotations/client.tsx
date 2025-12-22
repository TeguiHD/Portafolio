"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { QuotationsPageSkeleton } from "@/components/ui/Skeleton";

interface Quotation {
    id: string;
    folio: string;
    clientName: string;
    projectName: string;
    total: number;
    status: string;
    createdAt: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: "Borrador", color: "bg-neutral-500/20 text-neutral-400" },
    sent: { label: "Enviada", color: "bg-blue-500/20 text-blue-400" },
    accepted: { label: "Aceptada", color: "bg-green-500/20 text-green-400" },
    rejected: { label: "Rechazada", color: "bg-red-500/20 text-red-400" },
};

export default function QuotationsPageClient() {
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");

    useEffect(() => {
        loadQuotations();
    }, []);

    const loadQuotations = async () => {
        try {
            const res = await fetch("/api/quotations");
            if (res.ok) {
                const data = await res.json();
                setQuotations(data);
            }
        } catch (error) {
            console.error("Error loading quotations:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar esta cotización?")) return;

        try {
            const res = await fetch(`/api/quotations/${id}`, { method: "DELETE" });
            if (res.ok) {
                setQuotations(prev => prev.filter(q => q.id !== id));
            }
        } catch (error) {
            console.error("Error deleting quotation:", error);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/quotations/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                setQuotations(prev => prev.map(q =>
                    q.id === id ? { ...q, status: newStatus } : q
                ));
            }
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const filteredQuotations = filter === "all"
        ? quotations
        : quotations.filter(q => q.status === filter);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("es-CL", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    if (loading) {
        return <QuotationsPageSkeleton />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Cotizaciones</h1>
                    <p className="text-neutral-400 mt-1">Gestiona tus propuestas comerciales</p>
                </div>
                <Link
                    href="/admin/quotations/new"
                    className="px-4 py-2.5 rounded-xl bg-accent-1 text-black font-semibold flex items-center gap-2 hover:bg-accent-1/90 transition-colors w-fit"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nueva Cotización
                </Link>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {[
                    { value: "all", label: "Todas" },
                    { value: "draft", label: "Borradores" },
                    { value: "sent", label: "Enviadas" },
                    { value: "accepted", label: "Aceptadas" },
                    { value: "rejected", label: "Rechazadas" },
                ].map(f => (
                    <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f.value
                            ? "bg-accent-1/20 text-accent-1 border border-accent-1/40"
                            : "bg-white/5 text-neutral-400 hover:text-white border border-transparent"
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="glass-panel rounded-2xl border border-accent-1/20 overflow-hidden">
                {filteredQuotations.length === 0 ? (
                    <div className="p-12 text-center">
                        <svg className="w-12 h-12 text-neutral-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-neutral-500">No hay cotizaciones {filter !== "all" && `en estado "${statusLabels[filter]?.label}"`}</p>
                        <Link href="/admin/quotations/new" className="text-accent-1 hover:underline text-sm mt-2 inline-block">
                            Crear primera cotización
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-accent-1/10">
                                    <th className="text-left p-4 text-xs uppercase tracking-wider text-neutral-500">Folio</th>
                                    <th className="text-left p-4 text-xs uppercase tracking-wider text-neutral-500">Cliente</th>
                                    <th className="text-left p-4 text-xs uppercase tracking-wider text-neutral-500 hidden md:table-cell">Proyecto</th>
                                    <th className="text-right p-4 text-xs uppercase tracking-wider text-neutral-500">Total</th>
                                    <th className="text-center p-4 text-xs uppercase tracking-wider text-neutral-500">Estado</th>
                                    <th className="text-right p-4 text-xs uppercase tracking-wider text-neutral-500">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredQuotations.map((quote, idx) => (
                                    <motion.tr
                                        key={quote.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="border-b border-accent-1/10 hover:bg-white/5 transition-colors"
                                    >
                                        <td className="p-4">
                                            <span className="font-mono text-accent-1 text-sm">#{quote.folio}</span>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-white font-medium">{quote.clientName}</p>
                                            <p className="text-xs text-neutral-500">{formatDate(quote.createdAt)}</p>
                                        </td>
                                        <td className="p-4 hidden md:table-cell">
                                            <p className="text-neutral-300 truncate max-w-[200px]">{quote.projectName}</p>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="font-semibold text-white">${quote.total.toLocaleString("es-CL")}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <select
                                                value={quote.status}
                                                onChange={(e) => handleStatusChange(quote.id, e.target.value)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer bg-transparent border-0 ${statusLabels[quote.status]?.color || statusLabels.draft.color}`}
                                            >
                                                <option value="draft" className="bg-neutral-900">Borrador</option>
                                                <option value="sent" className="bg-neutral-900">Enviada</option>
                                                <option value="accepted" className="bg-neutral-900">Aceptada</option>
                                                <option value="rejected" className="bg-neutral-900">Rechazada</option>
                                            </select>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                {/* View */}
                                                <Link
                                                    href={`/admin/quotations/${quote.id}`}
                                                    className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                                                    title="Ver"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </Link>
                                                {/* Duplicate */}
                                                <Link
                                                    href={`/admin/quotations/new?duplicate=${quote.id}`}
                                                    className="p-2 rounded-lg text-neutral-400 hover:text-accent-2 hover:bg-accent-2/10 transition-colors"
                                                    title="Duplicar"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                </Link>
                                                {/* Delete */}
                                                <button
                                                    onClick={() => handleDelete(quote.id)}
                                                    className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Stats */}
            {quotations.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: "Total", value: quotations.length, color: "text-white" },
                        { label: "Aceptadas", value: quotations.filter(q => q.status === "accepted").length, color: "text-green-400" },
                        { label: "Pendientes", value: quotations.filter(q => q.status === "sent").length, color: "text-blue-400" },
                        {
                            label: "Valor Total",
                            value: `$${quotations.filter(q => q.status === "accepted").reduce((sum, q) => sum + q.total, 0).toLocaleString("es-CL")}`,
                            color: "text-accent-1"
                        },
                    ].map((stat, i) => (
                        <div key={i} className="glass-panel rounded-xl border border-accent-1/10 p-4 text-center">
                            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                            <p className="text-xs text-neutral-500 mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
