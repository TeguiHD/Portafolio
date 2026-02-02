"use client";

import { useState } from "react";
import { FileText, Search, ChevronLeft, ChevronRight } from "lucide-react";
import QuotationCard from "./quotation-card";
import { useRouter } from "next/navigation";

interface Quotation {
    id: string;
    folio: string;
    projectName: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    total: number;
    totalPaid?: number;
    accessMode: string;
    isActive: boolean;
    isVisible: boolean;
    slug: string;
    codeExpiresAt: Date | null;
}

interface Props {
    quotations: Quotation[];
    clientId: string;
    clientName: string;
    clientSlug: string;
    baseUrl: string;
    canEdit?: boolean;
    canDelete?: boolean;
}

const ITEMS_PER_PAGE = 9;

export default function QuotationsListClient({ quotations, clientId: _clientId, clientName: _clientName, clientSlug, baseUrl, canEdit = false, canDelete = false }: Props) {
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const _router = useRouter();

    // Filter
    const filtered = quotations.filter(q =>
        q.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.folio.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="text-indigo-400" size={20} />
                    Cotizaciones ({filtered.length})
                </h2>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:flex-initial sm:w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por proyecto o folio..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-12 border border-slate-800 rounded-xl bg-slate-900/30">
                    <p className="text-slate-400">No se encontraron cotizaciones</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {paginated.map((quotation) => (
                        <QuotationCard
                            key={quotation.id}
                            quotation={quotation}
                            clientSlug={clientSlug}
                            baseUrl={baseUrl}
                            canEdit={canEdit}
                            canDelete={canDelete}
                        />
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 pt-4">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-50"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-sm text-slate-400">
                        Página {currentPage} de {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-50"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}
        </div>
    );
}
