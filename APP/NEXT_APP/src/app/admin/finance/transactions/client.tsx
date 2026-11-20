"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import DialogoFormulario from "@/app/admin/gestion-comercial/dialogo-formulario";
import { TransactionList, TransactionForm, type TransactionListItem } from "@/modules/finance";
import { useFinance } from "@/modules/finance/context/FinanceContext";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";
import { CabeceraFinanzas } from "@/modules/finance/components/Piezas";
import { BOTON, FOCO, SUAVE } from "@/modules/finance/components/estilos";

// Note: Extended transaction type handled in TransactionList via props

// Form data type matching TransactionForm's Partial<TransactionFormData> & { id?: string }
interface TransactionFormData {
    id?: string;
    type?: "INCOME" | "EXPENSE";
    amount?: string;         // String as expected by TransactionForm
    displayAmount?: string;  // For display formatting
    description?: string;
    merchant?: string;
    notes?: string;
    categoryId?: string;
    accountId?: string;
    currencyId?: string;
    transactionDate?: string;
}

export default function TransactionsPageClient() {
    const { triggerRefresh } = useFinance();
    const [showForm, setShowForm] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<TransactionFormData | undefined>(undefined);
    const [aviso, setAviso] = useState<string | null>(null);

    const handleSuccess = () => {
        setShowForm(false);
        setEditingTransaction(undefined);
        triggerRefresh();
    };

    const handleEdit = (transaction: TransactionListItem) => {
        // El formulario solo maneja gastos e ingresos: abrir una transferencia la guardaba como gasto.
        if (transaction.type === "TRANSFER") {
            setAviso("Las transferencias no se editan desde este formulario. Si está mal, elimínala (se revierten los saldos de ambas cuentas) y regístrala de nuevo.");
            return;
        }
        setAviso(null);
        const amountStr = String(Number(transaction.amount));

        setEditingTransaction({
            id: transaction.id,
            type: transaction.type,
            amount: amountStr,
            displayAmount: amountStr,
            description: transaction.description || "",
            merchant: transaction.merchant || "",
            // Las notas vienen en la lista: si se mandaran vacías, guardar la edición las borraría.
            notes: transaction.notes || "",
            categoryId: transaction.category?.id || "",
            accountId: transaction.account.id,
            // El formulario y la API esperan el id de la moneda, no su código.
            currencyId: transaction.currency.id,
            transactionDate: new Date(transaction.transactionDate).toISOString().split("T")[0],
        });
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingTransaction(undefined);
    };

    return (
        <div className="max-w-[1180px] pb-8">
            <FinanceBreadcrumbs />

            <CabeceraFinanzas titulo="Transacciones" bajada="Gestiona tus ingresos, gastos y transferencias">
                <button
                    type="button"
                    onClick={() => {
                        setEditingTransaction(undefined);
                        setShowForm(true);
                    }}
                    className={BOTON}
                >
                    <Plus aria-hidden="true" className="size-4" />
                    Nueva transacción
                </button>
            </CabeceraFinanzas>

            <div className="mt-8">
                {aviso && (
                    <p role="status" className={`${SUAVE} mb-4 flex flex-wrap items-center gap-x-2`}>
                        <span>{aviso}</span>
                        <button
                            type="button"
                            onClick={() => setAviso(null)}
                            className={`inline-flex min-h-11 items-center rounded-lg px-1 text-sm text-[var(--acento)] underline-offset-4 hover:underline sm:min-h-10 ${FOCO}`}
                        >
                            Entendido
                        </button>
                    </p>
                )}
                <TransactionList
                    onEdit={handleEdit}
                    onDelete={() => triggerRefresh()}
                />
            </div>

            {/* Formulario en un <dialog> nativo: Esc o «Cancelar» lo cierran y el foco vuelve al botón que lo abrió */}
            {showForm && (
                <DialogoFormulario
                    titulo={editingTransaction ? "Editar transacción" : "Nueva transacción"}
                    alCerrar={handleCancel}
                >
                    {(cerrar) => (
                        <TransactionForm
                            initialData={editingTransaction}
                            onSuccess={() => {
                                cerrar();
                                handleSuccess();
                            }}
                            onCancel={cerrar}
                        />
                    )}
                </DialogoFormulario>
            )}
        </div>
    );
}
