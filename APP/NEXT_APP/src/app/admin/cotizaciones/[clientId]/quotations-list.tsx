"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { BOTON_ICONO, CAMPO, TITULO_SECCION } from "@/modules/quotations/estilos";
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
    firma?: { nombre: string; fecha: string; documentoCambio: boolean } | null;
}

interface Props {
    quotations: Quotation[];
    clientId: string;
    clientName: string;
    clientSlug: string;
    baseUrl: string;
    canEdit?: boolean;
    canDelete?: boolean;
    canCobrar?: boolean;
}

const ITEMS_PER_PAGE = 9;

export default function QuotationsListClient({ quotations, clientId: _clientId, clientName: _clientName, clientSlug, baseUrl, canEdit = false, canDelete = false, canCobrar = false }: Props) {
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
        <section aria-labelledby="titulo-propuestas" className="space-y-4">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <h2 id="titulo-propuestas" className={TITULO_SECCION}>
                    Propuestas <span className="font-mono text-[13px] tabular-nums">{filtered.length}</span>
                </h2>

                <div className="relative w-full sm:w-72">
                    <label htmlFor="buscar-propuestas" className="sr-only">Buscar por proyecto o folio</label>
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mut)]" size={16} aria-hidden="true" />
                    <input
                        id="buscar-propuestas"
                        type="search"
                        placeholder="Proyecto o folio"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className={`${CAMPO} pl-9`}
                    />
                </div>
            </div>

            {filtered.length === 0 ? (
                <p className="border-y border-[var(--linea)] py-10 text-center text-[var(--mut)]">Ninguna propuesta coincide con la búsqueda.</p>
            ) : (
                <ul className="border-t border-[var(--linea)]">
                    {paginated.map((quotation) => (
                        <QuotationCard
                            key={quotation.id}
                            quotation={quotation}
                            clientSlug={clientSlug}
                            baseUrl={baseUrl}
                            canEdit={canEdit}
                            canDelete={canDelete}
                            canCobrar={canCobrar}
                        />
                    ))}
                </ul>
            )}

            {totalPages > 1 && (
                <nav aria-label="Páginas de propuestas" className="flex items-center justify-center gap-2 pt-2">
                    <button
                        type="button"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        aria-label="Página anterior"
                        className={BOTON_ICONO}
                    >
                        <ChevronLeft size={18} aria-hidden="true" />
                    </button>
                    <span className="text-sm tabular-nums text-[var(--mut)]">
                        Página {currentPage} de {totalPages}
                    </span>
                    <button
                        type="button"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        aria-label="Página siguiente"
                        className={BOTON_ICONO}
                    >
                        <ChevronRight size={18} aria-hidden="true" />
                    </button>
                </nav>
            )}
        </section>
    );
}
