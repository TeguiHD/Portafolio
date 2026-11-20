"use client";

import { useState, useEffect, useCallback, useId } from "react";
import {
    ArrowDownLeft,
    ArrowLeftRight,
    ArrowUpRight,
    ChevronLeft,
    ChevronRight,
    Pencil,
    Search,
    SlidersHorizontal,
    Trash2,
    type LucideIcon,
} from "lucide-react";
import { formatCurrency, type SupportedCurrency } from "@/lib/currency";
import { confirmar } from "@/modules/admin/confirmar/confirmar";
import { useFinance } from "../context/FinanceContext";
import type { TransactionType } from "../types";
import { CargandoFinanzas } from "./Piezas";
import { diaGuardado, diasEntre, fechaDia, hoyChile } from "../fechas";
import {
    BAJA,
    BOTON_SEC,
    CAMPO,
    CIFRA,
    ERROR,
    ETIQUETA,
    FICHA,
    FILA,
    FOCO,
    ICONO,
    ICONO_PELIGRO,
    LISTA,
    OPCION,
    OPCION_NO,
    OPCION_SI,
    SUAVE,
    SUBE,
    TARJETA,
    VACIO,
} from "./estilos";

export interface TransactionListItem {
    id: string;
    type: TransactionType;
    amount: number;
    description: string | null;
    merchant: string | null;
    /** La API de la lista devuelve las notas; editar sin ellas las borraría. */
    notes?: string | null;
    transactionDate: string;
    category: { id: string; name: string; icon: string | null } | null;
    account: { id: string; name: string; currency: { code: string; symbol: string } };
    currency: { id: string; code: string; symbol: string };
}

interface TransactionListProps {
    onEdit?: (transaction: TransactionListItem) => void;
    onDelete?: (id: string) => void;
}

interface Filters {
    type: TransactionType | "";
    categoryId: string;
    accountId: string;
    startDate: string;
    endDate: string;
    search: string;
}

/** Cómo se muestra cada tipo: el signo y el color van con el nombre del tipo en texto. */
const TIPO: Record<TransactionType, { label: string; sign: string; monto: string; Icono: LucideIcon }> = {
    EXPENSE: { label: "Gasto", sign: "−", monto: BAJA, Icono: ArrowUpRight },
    INCOME: { label: "Ingreso", sign: "+", monto: SUBE, Icono: ArrowDownLeft },
    TRANSFER: { label: "Transferencia", sign: "", monto: "text-[var(--txt)]", Icono: ArrowLeftRight },
};

/** Buscador: como CAMPO, con espacio a la izquierda para la lupa. */
const CAMPO_BUSCAR = `block min-h-11 w-full rounded-lg border border-[var(--linea-2)] bg-[var(--fondo-2)] py-2 pr-3 pl-9 text-[15px] text-[var(--txt)] placeholder:text-[var(--mut)] sm:min-h-10 ${FOCO}`;

export function TransactionList({ onEdit, onDelete }: TransactionListProps) {
    const { baseCurrency: _baseCurrency, refreshKey } = useFinance();  // baseCurrency reserved for future formatting
    const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [filters, setFilters] = useState<Filters>({
        type: "",
        categoryId: "",
        accountId: "",
        startDate: "",
        endDate: "",
        search: "",
    });
    const [showFilters, setShowFilters] = useState(false);
    const [categories, setCategories] = useState<{ id: string; name: string; icon: string | null }[]>([]);
    const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const idBase = useId();

    const fetchTransactions = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: "15" });

            if (filters.type) params.set("type", filters.type);
            if (filters.categoryId) params.set("categoryId", filters.categoryId);
            if (filters.accountId) params.set("accountId", filters.accountId);
            if (filters.startDate) params.set("startDate", filters.startDate);
            if (filters.endDate) params.set("endDate", filters.endDate);
            if (filters.search) params.set("search", filters.search);

            const response = await fetch(`/api/finance/transactions?${params}`);
            if (response.ok) {
                const { data, pagination: pag } = await response.json();
                setTransactions(data);
                setPagination(pag);
            }
        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Fetch filter options
    useEffect(() => {
        async function fetchOptions() {
            try {
                const [catRes, accRes] = await Promise.all([
                    fetch("/api/finance/categories"),
                    fetch("/api/finance/accounts"),
                ]);
                if (catRes.ok) {
                    const { data } = await catRes.json();
                    setCategories(data || []);
                }
                if (accRes.ok) {
                    const { data } = await accRes.json();
                    setAccounts(data || []);
                }
            } catch (error) {
                console.error("Error fetching filter options:", error);
            }
        }
        fetchOptions();
    }, []);

    // Fetch transactions when filters or page changes
    useEffect(() => {
        fetchTransactions(pagination.page);
        // pagination.page is passed as parameter, fetchTransactions already handles it
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchTransactions, refreshKey]);

    const handleFilterChange = (name: keyof Filters, value: string) => {
        setFilters(prev => ({ ...prev, [name]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const clearFilters = () => {
        setFilters({
            type: "",
            categoryId: "",
            accountId: "",
            startDate: "",
            endDate: "",
            search: "",
        });
    };

    const handleDelete = async (id: string) => {
        if (!(await confirmar({
            titulo: "¿Eliminar transacción?",
            detalle: "Esta acción revertirá los cambios en el balance de tu cuenta.",
            accion: "Eliminar",
            peligro: true,
        }))) return;

        setDeleteError(null);
        try {
            const response = await fetch(`/api/finance/transactions/${id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                setTransactions(prev => prev.filter(t => t.id !== id));
                setPagination(prev => ({ ...prev, total: prev.total - 1 }));
                onDelete?.(id);
            } else {
                setDeleteError("No se pudo eliminar la transacción. Inténtalo de nuevo.");
            }
        } catch (error) {
            console.error("Error deleting transaction:", error);
            setDeleteError("No se pudo eliminar la transacción. Inténtalo de nuevo.");
        }
    };

    // El día guardado se compara con el de hoy en Chile, por fecha de calendario (no por horas transcurridas).
    const formatDate = (dateStr: string) => {
        const dia = diaGuardado(dateStr);
        const hoy = hoyChile();
        const diffDays = diasEntre(dia, hoy);

        if (diffDays === 0) return "Hoy";
        if (diffDays === 1) return "Ayer";

        return fechaDia(dateStr, { day: "numeric", month: "short", year: dia.slice(0, 4) !== hoy.slice(0, 4) ? "numeric" : undefined });
    };

    const activeFiltersCount = Object.values(filters).filter(v => v !== "").length;
    const idFiltros = `${idBase}-filtros`;

    return (
        <div className="space-y-4">
            {/* Búsqueda y filtros */}
            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                    <label htmlFor={`${idBase}-buscar`} className="sr-only">
                        Buscar transacciones
                    </label>
                    <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--mut)]" />
                    <input
                        id={`${idBase}-buscar`}
                        type="search"
                        value={filters.search}
                        onChange={(e) => handleFilterChange("search", e.target.value)}
                        placeholder="Buscar transacciones..."
                        className={CAMPO_BUSCAR}
                    />
                </div>

                <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    aria-expanded={showFilters}
                    aria-controls={showFilters ? idFiltros : undefined}
                    className={`${OPCION} ${showFilters || activeFiltersCount > 0 ? OPCION_SI : OPCION_NO}`}
                >
                    <SlidersHorizontal aria-hidden="true" className="size-4" />
                    <span>Filtros</span>
                    {activeFiltersCount > 0 && (
                        <span className={`grid h-5 min-w-5 place-items-center rounded-full bg-[var(--acento)] px-1 text-xs font-semibold text-[var(--acento-tinta)] ${CIFRA}`}>
                            {activeFiltersCount}
                            <span className="sr-only"> activos</span>
                        </span>
                    )}
                </button>
            </div>

            {/* Filtros desplegados */}
            {showFilters && (
                <div id={idFiltros} className={`${TARJETA} grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5`}>
                    <div className="min-w-0">
                        <label htmlFor={`${idBase}-tipo`} className={ETIQUETA}>Tipo</label>
                        <select
                            id={`${idBase}-tipo`}
                            value={filters.type}
                            onChange={(e) => handleFilterChange("type", e.target.value)}
                            className={CAMPO}
                        >
                            <option value="">Todos los tipos</option>
                            <option value="EXPENSE">Gastos</option>
                            <option value="INCOME">Ingresos</option>
                            <option value="TRANSFER">Transferencias</option>
                        </select>
                    </div>

                    <div className="min-w-0">
                        <label htmlFor={`${idBase}-categoria`} className={ETIQUETA}>Categoría</label>
                        <select
                            id={`${idBase}-categoria`}
                            value={filters.categoryId}
                            onChange={(e) => handleFilterChange("categoryId", e.target.value)}
                            className={CAMPO}
                        >
                            <option value="">Todas las categorías</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="min-w-0">
                        <label htmlFor={`${idBase}-cuenta`} className={ETIQUETA}>Cuenta</label>
                        <select
                            id={`${idBase}-cuenta`}
                            value={filters.accountId}
                            onChange={(e) => handleFilterChange("accountId", e.target.value)}
                            className={CAMPO}
                        >
                            <option value="">Todas las cuentas</option>
                            {accounts.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="min-w-0">
                        <label htmlFor={`${idBase}-desde`} className={ETIQUETA}>Desde</label>
                        <input
                            id={`${idBase}-desde`}
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange("startDate", e.target.value)}
                            className={CAMPO}
                        />
                    </div>

                    <div className="min-w-0">
                        <label htmlFor={`${idBase}-hasta`} className={ETIQUETA}>Hasta</label>
                        <input
                            id={`${idBase}-hasta`}
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange("endDate", e.target.value)}
                            className={CAMPO}
                        />
                    </div>

                    {activeFiltersCount > 0 && (
                        <div className="col-span-full">
                            <button type="button" onClick={clearFilters} className={BOTON_SEC}>
                                Limpiar filtros
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Cantidad de resultados */}
            <p aria-live="polite" className={`${SUAVE} ${CIFRA}`}>
                {pagination.total} {pagination.total === 1 ? "transacción encontrada" : "transacciones encontradas"}
            </p>

            {deleteError && (
                <p role="alert" className={ERROR}>
                    {deleteError}
                </p>
            )}

            {/* Lista */}
            {loading ? (
                <CargandoFinanzas texto="Cargando transacciones…" />
            ) : transactions.length === 0 ? (
                <div className={VACIO}>
                    <p className="font-medium text-[var(--txt)]">No hay transacciones</p>
                    <p className="mt-1 text-sm">
                        {activeFiltersCount > 0 ? "Ninguna coincide con la búsqueda o los filtros." : "Registra tu primera transacción para comenzar"}
                    </p>
                </div>
            ) : (
                <ul className={`${LISTA} m-0 list-none p-0`}>
                    {transactions.map((transaction) => {
                        const tipo = TIPO[transaction.type];
                        const Icono = tipo.Icono;
                        const nombre = transaction.description || transaction.merchant || transaction.category?.name || "Sin descripción";
                        return (
                            <li key={transaction.id} className={FILA}>
                                {/* Emoji de la categoría (dato del usuario) o el ícono del tipo */}
                                <span aria-hidden="true" className={FICHA}>
                                    {transaction.category?.icon || <Icono className="size-[18px]" />}
                                </span>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium text-[var(--txt)]">{nombre}</p>
                                    <p className="truncate text-sm text-[var(--mut)]">
                                        {tipo.label} · {transaction.account.name} · {formatDate(transaction.transactionDate)}
                                    </p>
                                </div>

                                {/* En celular el monto va sobre las acciones para dejar más ancho al texto */}
                                <div className="flex shrink-0 flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                                    <span className={`text-right font-semibold whitespace-nowrap sm:min-w-28 ${CIFRA} ${tipo.monto}`}>
                                        {tipo.sign}{formatCurrency(transaction.amount, transaction.currency.code as SupportedCurrency)}
                                    </span>
                                    <div className="flex">
                                        {onEdit && (
                                            <button
                                                type="button"
                                                onClick={() => onEdit(transaction)}
                                                aria-label={`Editar ${nombre}`}
                                                className={ICONO}
                                            >
                                                <Pencil aria-hidden="true" className="size-4" />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => void handleDelete(transaction.id)}
                                            aria-label={`Eliminar ${nombre}`}
                                            className={ICONO_PELIGRO}
                                        >
                                            <Trash2 aria-hidden="true" className="size-4" />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {/* Paginación */}
            {pagination.totalPages > 1 && (
                <nav aria-label="Páginas de transacciones" className="flex items-center justify-center gap-2 pt-2">
                    <button
                        type="button"
                        onClick={() => fetchTransactions(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        aria-label="Página anterior"
                        className={`${ICONO} disabled:cursor-not-allowed`}
                    >
                        <ChevronLeft aria-hidden="true" className="size-5" />
                    </button>

                    <span className={`${SUAVE} ${CIFRA} px-2`}>
                        Página {pagination.page} de {pagination.totalPages}
                    </span>

                    <button
                        type="button"
                        onClick={() => fetchTransactions(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        aria-label="Página siguiente"
                        className={`${ICONO} disabled:cursor-not-allowed`}
                    >
                        <ChevronRight aria-hidden="true" className="size-5" />
                    </button>
                </nav>
            )}
        </div>
    );
}
