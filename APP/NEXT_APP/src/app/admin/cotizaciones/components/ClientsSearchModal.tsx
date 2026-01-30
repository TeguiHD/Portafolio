"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, X, Filter, ChevronDown, ChevronLeft, ChevronRight, SortAsc, SortDesc } from "lucide-react";
import ClientCard from "./ClientCard";

interface Client {
    id: string;
    name: string;
    email: string | null;
    phone?: string | null;
    company?: string | null;
    slug: string;
    createdAt?: string | Date;
    _count: { quotations: number };
    user?: { name: string | null; email: string | null } | null;
}

interface Props {
    clients: Client[];
    isSuperAdmin: boolean;
    isSpyMode?: boolean;
    isOpen: boolean;
    onClose: () => void;
}

type SortField = "name" | "quotations" | "createdAt";
type SortOrder = "asc" | "desc";
type QuotationFilter = "all" | "1+" | "5+" | "10+";

const ITEMS_PER_PAGE = 9;

export default function ClientsSearchModal({ clients, isSuperAdmin, isSpyMode, isOpen, onClose }: Props) {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
    const [quotationFilter, setQuotationFilter] = useState<QuotationFilter>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, sortField, sortOrder, quotationFilter]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    // Filter and sort clients
    const filteredClients = useMemo(() => {
        let result = [...clients];

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(c =>
                c.name.toLowerCase().includes(term) ||
                c.email?.toLowerCase().includes(term) ||
                c.slug.toLowerCase().includes(term) ||
                c.company?.toLowerCase().includes(term)
            );
        }

        // Quotation count filter
        if (quotationFilter !== "all") {
            const minCount = parseInt(quotationFilter.replace("+", ""));
            result = result.filter(c => c._count.quotations >= minCount);
        }

        // Sort
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case "name":
                    comparison = a.name.localeCompare(b.name);
                    break;
                case "quotations":
                    comparison = a._count.quotations - b._count.quotations;
                    break;
                case "createdAt":
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    comparison = dateA - dateB;
                    break;
            }
            return sortOrder === "asc" ? comparison : -comparison;
        });

        return result;
    }, [clients, searchTerm, sortField, sortOrder, quotationFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
    const paginatedClients = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredClients.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredClients, currentPage]);

    const toggleSort = useCallback((field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortOrder("asc");
        }
    }, [sortField]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-800 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">Buscar Clientes</h2>
                        <p className="text-sm text-slate-400">
                            {filteredClients.length} cliente{filteredClients.length !== 1 ? "s" : ""} encontrado{filteredClients.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search and Filters */}
                <div className="p-4 md:p-6 border-b border-slate-800 space-y-4 shrink-0">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por nombre, email, empresa o slug..."
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                            autoFocus
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Filters Toggle */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showFilters
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                }`}
                        >
                            <Filter size={16} />
                            Filtros
                            <ChevronDown size={14} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
                        </button>

                        {/* Quick Sort Buttons */}
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-xs text-slate-500 hidden sm:block">Ordenar:</span>
                            {(["name", "quotations", "createdAt"] as SortField[]).map((field) => (
                                <button
                                    key={field}
                                    onClick={() => toggleSort(field)}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sortField === field
                                        ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                        : "bg-slate-800 text-slate-400 hover:text-white"
                                        }`}
                                >
                                    {field === "name" && "Nombre"}
                                    {field === "quotations" && "Cotizaciones"}
                                    {field === "createdAt" && "Fecha"}
                                    {sortField === field && (
                                        sortOrder === "asc" ? <SortAsc size={12} /> : <SortDesc size={12} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Extended Filters */}
                    {showFilters && (
                        <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-200">
                            <div>
                                <label className="block text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">
                                    Mínimo de cotizaciones
                                </label>
                                <div className="flex gap-2">
                                    {(["all", "1+", "5+", "10+"] as QuotationFilter[]).map((filter) => (
                                        <button
                                            key={filter}
                                            onClick={() => setQuotationFilter(filter)}
                                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${quotationFilter === filter
                                                ? "bg-indigo-600 text-white"
                                                : "bg-slate-800 text-slate-400 hover:text-white"
                                                }`}
                                        >
                                            {filter === "all" ? "Todos" : filter}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Grid */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {paginatedClients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <Search className="text-slate-600" size={24} />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">Sin resultados</h3>
                            <p className="text-slate-400 max-w-md">
                                No se encontraron clientes con los filtros seleccionados.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {paginatedClients.map((client) => (
                                <ClientCard
                                    key={client.id}
                                    client={client}
                                    isSuperAdmin={isSuperAdmin}
                                    isSpyMode={isSpyMode}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 md:p-6 border-t border-slate-800 shrink-0">
                        <p className="text-sm text-slate-400">
                            Página {currentPage} de {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>

                            {/* Page numbers */}
                            <div className="hidden sm:flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum: number;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = currentPage - 2 + i;
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-10 h-10 rounded-lg font-medium transition-colors ${currentPage === pageNum
                                                ? "bg-indigo-600 text-white"
                                                : "bg-slate-800 text-slate-400 hover:text-white"
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
