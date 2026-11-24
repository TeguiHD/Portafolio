"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, X, Filter, ChevronDown, ChevronLeft, ChevronRight, SortAsc, SortDesc } from "lucide-react";
import ClientCard from "./ClientCard";
import Ventana from "@/modules/quotations/components/Ventana";
import { BOTON_ICONO, BOTON_SEC, CAMPO, FOCO, SOBRE } from "@/modules/quotations/estilos";

interface Client {
    id: string;
    name: string;
    email: string | null;
    phone?: string | null;
    company?: string | null;
    slug: string;
    createdAt?: string | Date;
    _count: { quotations: number };
    user?: { id: string; name: string | null; email: string | null } | null;
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
                case "createdAt": {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    comparison = dateA - dateB;
                    break;
                }
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

    const ordenes: Record<SortField, string> = { name: "Nombre", quotations: "Propuestas", createdAt: "Fecha" };
    const pastilla = (activa: boolean) =>
        `inline-flex min-h-11 md:min-h-9 items-center gap-1 rounded-lg px-3 text-xs font-medium transition-colors duration-150 ${FOCO} ${activa
            ? "bg-[color-mix(in_srgb,var(--acento)_14%,transparent)] text-[var(--acento)]"
            : `text-[var(--mut)] hover:text-[var(--txt)] ${SOBRE}`}`;

    return (
        <Ventana
            titulo="Buscar clientes"
            descripcion={`${filteredClients.length} cliente${filteredClients.length !== 1 ? "s" : ""} encontrado${filteredClients.length !== 1 ? "s" : ""}`}
            alCerrar={onClose}
            ancho="max-w-6xl"
            cuerpo="p-0 flex flex-col"
        >
            <div className="shrink-0 space-y-3 border-b border-[var(--linea)] p-4 sm:px-6">
                <div className="relative">
                    <label htmlFor="buscar-clientes-propuestas" className="sr-only">Buscar por nombre, correo, empresa o usuario del portal</label>
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mut)]" size={16} aria-hidden="true" />
                    <input
                        id="buscar-clientes-propuestas"
                        type="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Nombre, correo, empresa o usuario"
                        className={`${CAMPO} pl-9 pr-11`}
                        data-autofocus
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm("")}
                            aria-label="Borrar la búsqueda"
                            className={`${BOTON_ICONO} absolute right-0 top-1/2 -translate-y-1/2`}
                        >
                            <X size={16} aria-hidden="true" />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        aria-expanded={showFilters}
                        aria-controls="filtros-clientes-propuestas"
                        className={BOTON_SEC}
                    >
                        <Filter size={16} aria-hidden="true" />
                        Filtros
                        <ChevronDown size={14} aria-hidden="true" className={`transition-transform duration-150 motion-reduce:transition-none ${showFilters ? "rotate-180" : ""}`} />
                    </button>

                    <div role="group" aria-label="Ordenar" className="ml-auto flex flex-wrap items-center gap-1">
                        <span className="hidden text-xs text-[var(--mut)] sm:block">Ordenar:</span>
                        {(["name", "quotations", "createdAt"] as SortField[]).map((field) => (
                            <button
                                type="button"
                                key={field}
                                onClick={() => toggleSort(field)}
                                aria-pressed={sortField === field}
                                className={pastilla(sortField === field)}
                            >
                                {ordenes[field]}
                                {sortField === field && (
                                    sortOrder === "asc"
                                        ? <><SortAsc size={12} aria-hidden="true" /><span className="sr-only">, ascendente</span></>
                                        : <><SortDesc size={12} aria-hidden="true" /><span className="sr-only">, descendente</span></>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {showFilters && (
                    <div id="filtros-clientes-propuestas" role="group" aria-labelledby="filtro-minimo" className="border-t border-[var(--linea)] pt-3">
                        <p id="filtro-minimo" className="mb-2 text-sm font-medium text-[var(--txt)]">Mínimo de propuestas</p>
                        <div className="flex flex-wrap gap-1">
                            {(["all", "1+", "5+", "10+"] as QuotationFilter[]).map((filter) => (
                                <button
                                    type="button"
                                    key={filter}
                                    onClick={() => setQuotationFilter(filter)}
                                    aria-pressed={quotationFilter === filter}
                                    className={pastilla(quotationFilter === filter)}
                                >
                                    {filter === "all" ? "Todos" : filter}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <p aria-live="polite" className="sr-only">
                {filteredClients.length} cliente{filteredClients.length !== 1 ? "s" : ""}
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                {paginatedClients.length === 0 ? (
                    <div className="py-14 text-center">
                        <Search className="mx-auto mb-3 text-[var(--mut)]" size={24} aria-hidden="true" />
                        <p className="font-semibold text-[var(--txt)]">Sin resultados</p>
                        <p className="mx-auto mt-1 max-w-md text-sm text-[var(--mut)]">
                            Ningún cliente coincide con la búsqueda o los filtros.
                        </p>
                    </div>
                ) : (
                    <ul className="border-t border-[var(--linea)]">
                        {paginatedClients.map((client) => (
                            <li key={client.id} className="border-b border-[var(--linea)]">
                                <ClientCard
                                    client={client}
                                    isSuperAdmin={isSuperAdmin}
                                    isSpyMode={isSpyMode}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {totalPages > 1 && (
                <nav aria-label="Páginas" className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--linea)] px-4 py-3 sm:px-6">
                    <p className="text-sm text-[var(--mut)]">
                        Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            aria-label="Página anterior"
                            className={BOTON_ICONO}
                        >
                            <ChevronLeft size={18} aria-hidden="true" />
                        </button>

                        <div className="hidden items-center gap-1 sm:flex">
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
                                        type="button"
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        aria-current={currentPage === pageNum ? "page" : undefined}
                                        aria-label={`Página ${pageNum}`}
                                        className={`size-10 rounded-lg text-sm font-medium tabular-nums transition-colors duration-150 ${FOCO} ${currentPage === pageNum
                                            ? "bg-[var(--acento)] text-[var(--acento-tinta)]"
                                            : `text-[var(--mut)] hover:text-[var(--txt)] ${SOBRE}`
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            aria-label="Página siguiente"
                            className={BOTON_ICONO}
                        >
                            <ChevronRight size={18} aria-hidden="true" />
                        </button>
                    </div>
                </nav>
            )}
        </Ventana>
    );
}
