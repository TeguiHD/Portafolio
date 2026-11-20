"use client";

import { useState, useEffect, useCallback, useId } from "react";
import Link from "next/link";
import { Check, ChevronRight, CircleAlert, LoaderCircle, X } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { useFinance } from "@/modules/finance/context/FinanceContext";
import type { OCRData } from "@/modules/finance/components/OCRResultDisplay";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";
import { CabeceraFinanzas, CifrasFinanzas } from "@/modules/finance/components/Piezas";
import {
    AYUDA, BOTON, BOTON_SEC, CAMPO, CIFRA, ERROR, ETIQUETA, FOCO, GIRA, ICONO_PELIGRO, LISTA, MARCA, MARCA_NEUTRA,
    SECCION, SOBRE, TARJETA, VACIO,
} from "@/modules/finance/components/estilos";
import { hoyChile } from "@/modules/finance/fechas";

interface BatchResult {
    data: OCRData;
    imageData: string;
}

interface BatchTransaction {
    id: string;
    ocrData: OCRData;
    imageData: string;
    status: "pending" | "saving" | "saved" | "error";
    error?: string;
    // Form data
    amount: number;
    description: string;
    merchant: string;
    categoryId: string;
    accountId: string;
    transactionDate: string;
    notes: string;
}

interface Account {
    id: string;
    name: string;
    currency: { code: string; symbol: string };
}

interface Category {
    id: string;
    name: string;
    icon: string | null;
    type: "INCOME" | "EXPENSE";
}

/** «2026-11-19» → «19 nov 2026»; si no es una fecha válida, la deja como vino. */
function fechaCorta(fecha: string) {
    const d = new Date(`${fecha}T00:00:00`);
    return Number.isNaN(d.getTime())
        ? fecha
        : d.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

/** Estado de guardado de una boleta: con palabra además del color. */
function EstadoGuardado({ status }: { status: BatchTransaction["status"] }) {
    if (status === "saved") {
        return (
            <span className={`${MARCA} bg-emerald-500/10 text-emerald-400`}>
                <Check aria-hidden="true" className="size-3" />
                Guardado
            </span>
        );
    }
    if (status === "error") {
        return (
            <span className={`${MARCA} bg-red-500/10 text-red-400`}>
                <CircleAlert aria-hidden="true" className="size-3" />
                Error
            </span>
        );
    }
    if (status === "saving") {
        return (
            <span className={MARCA_NEUTRA}>
                <LoaderCircle aria-hidden="true" className="size-3 animate-spin motion-reduce:animate-none" />
                Guardando
            </span>
        );
    }
    return null;
}

export default function BatchTransactionsPage() {
    const { triggerRefresh } = useFinance();
    const [transactions, setTransactions] = useState<BatchTransaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [defaultAccountId, setDefaultAccountId] = useState<string>("");
    const base = useId();

    // Load batch results from sessionStorage
    useEffect(() => {
        const stored = sessionStorage.getItem("batchOCRResults");
        if (stored) {
            try {
                const results: BatchResult[] = JSON.parse(stored);
                const batchTransactions: BatchTransaction[] = results.map((result, index) => ({
                    id: `batch-${index}-${Date.now()}`,
                    ocrData: result.data,
                    imageData: result.imageData,
                    status: "pending" as const,
                    amount: result.data.financials?.total || result.data.amount?.value || 0,
                    description: result.data.merchant?.value?.name || "",
                    merchant: result.data.merchant?.value?.name || "",
                    categoryId: result.data.suggestedCategory?.categoryId || "",
                    accountId: "",
                    transactionDate: result.data.emissionDate?.value || result.data.date?.value || hoyChile(),
                    notes: buildNotes(result.data),
                }));
                setTransactions(batchTransactions);
                if (batchTransactions.length > 0) {
                    setSelectedId(batchTransactions[0].id);
                }
                // Clear sessionStorage
                sessionStorage.removeItem("batchOCRResults");
            } catch (err) {
                console.error("Error loading batch results:", err);
            }
        }
    }, []);

    // Fetch accounts and categories
    useEffect(() => {
        async function fetchData() {
            try {
                const [accountsRes, categoriesRes] = await Promise.all([
                    fetch("/api/finance/accounts"),
                    fetch("/api/finance/categories"),
                ]);

                if (accountsRes.ok) {
                    const { data } = await accountsRes.json();
                    setAccounts(data || []);
                    if (data?.length > 0) {
                        setDefaultAccountId(data[0].id);
                        // Set default account for all transactions
                        setTransactions(prev => prev.map(t => ({
                            ...t,
                            accountId: t.accountId || data[0].id,
                        })));
                    }
                }

                if (categoriesRes.ok) {
                    const { data } = await categoriesRes.json();
                    setCategories(data || []);
                }
            } catch (err) {
                console.error("Error fetching form data:", err);
            }
        }
        fetchData();
    }, []);

    // Build notes from OCR data
    function buildNotes(ocrData: OCRData): string {
        const parts: string[] = [];

        if (ocrData.documentType && ocrData.documentType !== "unknown") {
            const typeLabels: Record<string, string> = {
                boleta: "Boleta Electrónica",
                factura: "Factura Electrónica",
                ticket: "Ticket",
            };
            parts.push(`📄 ${typeLabels[ocrData.documentType] || ocrData.documentType}`);
        }

        if (ocrData.documentNumber?.value) {
            parts.push(`Folio: ${ocrData.documentNumber.value}`);
        }

        if (ocrData.merchant?.value?.rut) {
            parts.push(`RUT: ${ocrData.merchant.value.rut}`);
        }

        if (ocrData.merchant?.value?.location) {
            const loc = ocrData.merchant.value.location;
            const locationParts = [loc.city, loc.commune].filter(Boolean);
            if (locationParts.length > 0) {
                parts.push(`📍 ${locationParts.join(", ")}`);
            }
        }

        return parts.join(" | ");
    }

    // Update a transaction
    const updateTransaction = useCallback((id: string, updates: Partial<BatchTransaction>) => {
        setTransactions(prev => prev.map(t =>
            t.id === id ? { ...t, ...updates } : t
        ));
    }, []);

    // Remove a transaction
    const removeTransaction = useCallback((id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
        if (selectedId === id) {
            setSelectedId(transactions.find(t => t.id !== id)?.id || null);
        }
    }, [selectedId, transactions]);

    // Save a single transaction
    const saveTransaction = useCallback(async (transaction: BatchTransaction) => {
        updateTransaction(transaction.id, { status: "saving" });

        try {
            const response = await fetch("/api/finance/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "EXPENSE",
                    amount: transaction.amount,
                    description: transaction.description,
                    merchant: transaction.merchant,
                    categoryId: transaction.categoryId || undefined,
                    accountId: transaction.accountId,
                    transactionDate: transaction.transactionDate,
                    notes: transaction.notes,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Error al guardar");
            }

            updateTransaction(transaction.id, { status: "saved" });
            return true;
        } catch (err) {
            updateTransaction(transaction.id, {
                status: "error",
                error: err instanceof Error ? err.message : "Error desconocido"
            });
            return false;
        }
    }, [updateTransaction]);

    // Save all pending transactions
    const saveAll = useCallback(async () => {
        setIsSaving(true);

        const pendingTransactions = transactions.filter(t => t.status === "pending");

        for (const transaction of pendingTransactions) {
            await saveTransaction(transaction);
        }

        setIsSaving(false);
        triggerRefresh();
    }, [transactions, saveTransaction, triggerRefresh]);

    // Get selected transaction
    const selectedTransaction = transactions.find(t => t.id === selectedId);

    // Get expense categories
    const expenseCategories = categories.filter(c => c.type === "EXPENSE");

    // Stats
    const stats = {
        total: transactions.length,
        pending: transactions.filter(t => t.status === "pending").length,
        saved: transactions.filter(t => t.status === "saved").length,
        errors: transactions.filter(t => t.status === "error").length,
        totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
    };

    if (transactions.length === 0) {
        return (
            <div className="max-w-[1180px] pb-8">
                <CabeceraFinanzas titulo="Registrar transacciones" />
                <div className={`${VACIO} mt-8`}>
                    <p className="font-medium text-[var(--txt)]">Sin transacciones</p>
                    <p className="mt-1 text-sm">No hay boletas escaneadas para procesar.</p>
                    <Link href="/admin/finance" className={`${BOTON_SEC} mt-4`}>
                        Volver a Finanzas
                    </Link>
                </div>
            </div>
        );
    }

    const bloqueado = selectedTransaction?.status === "saved";

    return (
        <div className="max-w-[1180px] pb-8">
            <FinanceBreadcrumbs backUrl="/admin/finance" />

            <CabeceraFinanzas
                titulo="Registrar transacciones"
                bajada="Revisa los datos leídos de cada boleta y guárdalos como gastos."
            >
                <Link href="/admin/finance" className={BOTON_SEC}>
                    {stats.saved === stats.total ? "Finalizar" : "Cancelar"}
                </Link>
                {stats.pending > 0 && (
                    <button type="button" onClick={() => void saveAll()} disabled={isSaving} className={BOTON}>
                        {isSaving ? (
                            <>
                                <span aria-hidden="true" className={GIRA} />
                                Guardando…
                            </>
                        ) : (
                            <>
                                <Check aria-hidden="true" className="size-4" />
                                Guardar todo ({stats.pending})
                            </>
                        )}
                    </button>
                )}
            </CabeceraFinanzas>

            <div className="mt-8">
                <CifrasFinanzas
                    etiqueta="Resumen del lote"
                    cifras={[
                        {
                            nombre: `Boleta${stats.total !== 1 ? "s" : ""} escaneada${stats.total !== 1 ? "s" : ""}`,
                            valor: stats.total,
                        },
                        {
                            nombre: "Guardadas",
                            valor: `${stats.saved} de ${stats.total}`,
                            nota: stats.errors > 0 ? <span className="text-red-400">{stats.errors} con error</span> : undefined,
                        },
                        { nombre: "Total", valor: formatCurrency(stats.totalAmount) },
                    ]}
                />
                <p aria-live="polite" className="sr-only">
                    {isSaving ? "Guardando transacciones." : `${stats.saved} de ${stats.total} guardadas.`}
                    {stats.errors > 0 ? ` ${stats.errors} con error.` : ""}
                </p>
            </div>

            <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-12">
                {/* Lista de boletas */}
                <section aria-labelledby={`${base}-lista`} className="min-w-0">
                    <h2 id={`${base}-lista`} className={`${SECCION} mb-3`}>Boletas</h2>

                    <div className="mb-5">
                        <label htmlFor={`${base}-cuenta-defecto`} className={ETIQUETA}>Cuenta por defecto</label>
                        <select
                            id={`${base}-cuenta-defecto`}
                            value={defaultAccountId}
                            onChange={(e) => {
                                setDefaultAccountId(e.target.value);
                                setTransactions(prev => prev.map(t => ({
                                    ...t,
                                    accountId: t.accountId || e.target.value,
                                })));
                            }}
                            className={CAMPO}
                        >
                            <option value="">Seleccionar</option>
                            {accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.name} ({account.currency.code})
                                </option>
                            ))}
                        </select>
                        <p className={AYUDA}>Se aplica a las boletas que aún no tienen cuenta.</p>
                    </div>

                    <ul className={`${LISTA} m-0 list-none p-0`}>
                        {transactions.map((transaction) => {
                            const elegida = selectedId === transaction.id;
                            const nombre = transaction.merchant || "Sin comercio";
                            return (
                                <li
                                    key={transaction.id}
                                    className={`flex items-center gap-1 border-b border-[var(--linea)] ${elegida ? "bg-[color-mix(in_srgb,var(--acento)_10%,transparent)]" : ""}`}
                                >
                                    <button
                                        type="button"
                                        aria-pressed={elegida}
                                        onClick={() => setSelectedId(transaction.id)}
                                        className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-3 text-left transition-colors duration-150 motion-reduce:transition-none ${SOBRE} ${FOCO}`}
                                    >
                                        {/* Miniatura de la boleta (decorativa: el nombre va al lado) */}
                                        <img
                                            src={transaction.imageData}
                                            alt=""
                                            className="size-12 shrink-0 rounded-lg bg-[var(--fondo-2)] object-cover"
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <span className="truncate font-medium text-[var(--txt)]">{nombre}</span>
                                                <EstadoGuardado status={transaction.status} />
                                            </span>
                                            <span className={`block font-semibold text-[var(--txt)] ${CIFRA}`}>
                                                {formatCurrency(transaction.amount)}
                                            </span>
                                            <span className="block text-xs text-[var(--mut)]">
                                                {fechaCorta(transaction.transactionDate)}
                                            </span>
                                        </span>
                                        {elegida ? (
                                            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-[var(--acento)]" />
                                        ) : null}
                                    </button>

                                    {transaction.status !== "saved" && (
                                        <button
                                            type="button"
                                            onClick={() => removeTransaction(transaction.id)}
                                            aria-label={`Quitar ${nombre}`}
                                            className={ICONO_PELIGRO}
                                        >
                                            <X aria-hidden="true" className="size-4" />
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </section>

                {/* Formulario de la boleta elegida */}
                <section aria-labelledby={`${base}-editar`} className="min-w-0">
                    <h2 id={`${base}-editar`} className={`${SECCION} mb-3`}>Datos de la boleta</h2>

                    {selectedTransaction ? (
                        <div className={`${TARJETA} overflow-hidden`}>
                            {/* Imagen de la boleta, con su fondo propio */}
                            <div className="h-48 border-b border-[var(--linea)] bg-[var(--fondo-2)]">
                                <img
                                    src={selectedTransaction.imageData}
                                    alt="Imagen de la boleta"
                                    className="h-full w-full object-contain"
                                />
                            </div>

                            <div className="space-y-4 p-4 sm:p-6">
                                {selectedTransaction.status === "error" && (
                                    <p role="alert" className={ERROR}>
                                        {selectedTransaction.error}
                                    </p>
                                )}

                                {bloqueado && (
                                    <p className="flex items-center gap-1.5 text-sm text-emerald-400">
                                        <Check aria-hidden="true" className="size-4" />
                                        Transacción guardada.
                                    </p>
                                )}

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor={`${base}-monto`} className={ETIQUETA}>Monto</label>
                                        <input
                                            id={`${base}-monto`}
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="off"
                                            // Pesos con puntos de miles: con type=number, «12.990» se leía como 12,99.
                                            value={selectedTransaction.amount ? Math.round(selectedTransaction.amount).toLocaleString("es-CL") : ""}
                                            onChange={(e) => updateTransaction(selectedTransaction.id, {
                                                amount: Number(e.target.value.replace(/\D/g, "").slice(0, 13)) || 0
                                            })}
                                            disabled={bloqueado}
                                            className={`${CAMPO} ${CIFRA}`}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor={`${base}-fecha`} className={ETIQUETA}>Fecha</label>
                                        <input
                                            id={`${base}-fecha`}
                                            type="date"
                                            value={selectedTransaction.transactionDate}
                                            onChange={(e) => updateTransaction(selectedTransaction.id, {
                                                transactionDate: e.target.value
                                            })}
                                            disabled={bloqueado}
                                            className={CAMPO}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor={`${base}-comercio`} className={ETIQUETA}>Comercio</label>
                                    <input
                                        id={`${base}-comercio`}
                                        type="text"
                                        value={selectedTransaction.merchant}
                                        onChange={(e) => updateTransaction(selectedTransaction.id, {
                                            merchant: e.target.value,
                                            description: e.target.value,
                                        })}
                                        disabled={bloqueado}
                                        className={CAMPO}
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor={`${base}-cuenta`} className={ETIQUETA}>Cuenta</label>
                                        <select
                                            id={`${base}-cuenta`}
                                            value={selectedTransaction.accountId}
                                            onChange={(e) => updateTransaction(selectedTransaction.id, {
                                                accountId: e.target.value
                                            })}
                                            disabled={bloqueado}
                                            className={CAMPO}
                                        >
                                            <option value="">Seleccionar</option>
                                            {accounts.map((account) => (
                                                <option key={account.id} value={account.id}>
                                                    {account.name} ({account.currency.code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor={`${base}-categoria`} className={ETIQUETA}>Categoría</label>
                                        <select
                                            id={`${base}-categoria`}
                                            value={selectedTransaction.categoryId}
                                            onChange={(e) => updateTransaction(selectedTransaction.id, {
                                                categoryId: e.target.value
                                            })}
                                            disabled={bloqueado}
                                            className={CAMPO}
                                        >
                                            <option value="">Sin categoría</option>
                                            {expenseCategories.map((category) => (
                                                <option key={category.id} value={category.id}>
                                                    {category.icon} {category.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor={`${base}-notas`} className={ETIQUETA}>Notas</label>
                                    <textarea
                                        id={`${base}-notas`}
                                        value={selectedTransaction.notes}
                                        onChange={(e) => updateTransaction(selectedTransaction.id, {
                                            notes: e.target.value
                                        })}
                                        disabled={bloqueado}
                                        rows={2}
                                        className={`${CAMPO} resize-none`}
                                    />
                                </div>

                                {/* Guardar solo esta */}
                                {!bloqueado && (
                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => void saveTransaction(selectedTransaction)}
                                            disabled={selectedTransaction.status === "saving" || !selectedTransaction.accountId}
                                            className={`${BOTON_SEC} w-full`}
                                        >
                                            {selectedTransaction.status === "saving" ? "Guardando…" : "Guardar esta transacción"}
                                        </button>
                                        {!selectedTransaction.accountId && (
                                            <p className={AYUDA}>Elige una cuenta para poder guardarla.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className={VACIO}>Selecciona una boleta para editar.</p>
                    )}
                </section>
            </div>
        </div>
    );
}
