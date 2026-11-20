"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TransactionForm } from "@/modules/finance";
import { useFinance } from "@/modules/finance/context/FinanceContext";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";
import { CabeceraFinanzas } from "@/modules/finance/components/Piezas";
import { TARJETA } from "@/modules/finance/components/estilos";
import { useMemo } from "react";
import { hoyChile } from "@/modules/finance/fechas";

const TRANSACTIONS_PATH = "/admin/finance/transactions";

export default function NewTransactionPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { triggerRefresh } = useFinance();

    // Parse initial data from query params (from OCR scanner)
    const initialData = useMemo(() => {
        const amount = searchParams.get("amount");
        const description = searchParams.get("description");
        const merchant = searchParams.get("merchant");
        const categoryId = searchParams.get("categoryId");
        const date = searchParams.get("date");
        const source = searchParams.get("source");
        const rut = searchParams.get("rut");
        const documentNumber = searchParams.get("documentNumber");
        const documentType = searchParams.get("documentType") as "boleta" | "factura" | "ticket" | undefined;
        const subtotal = searchParams.get("subtotal");
        const tax = searchParams.get("tax");

        // Only return initial data if we have OCR source
        if (source === "ocr" && (amount || description)) {
            return {
                type: "EXPENSE" as const,
                amount: amount || "",
                description: description || merchant || "",
                merchant: merchant || description || "",
                categoryId: categoryId || "",
                transactionDate: date || hoyChile(),
                rut: rut || undefined,
                documentNumber: documentNumber || undefined,
                documentType: documentType || undefined,
                subtotal: subtotal ? parseFloat(subtotal) : undefined,
                tax: tax ? parseFloat(tax) : undefined,
            };
        }

        return undefined;
    }, [searchParams]);

    const handleSuccess = () => {
        triggerRefresh();
        router.push(TRANSACTIONS_PATH);
    };

    const handleCancel = () => {
        router.back();
    };

    return (
        <div className="max-w-2xl pb-8">
            <FinanceBreadcrumbs />

            <CabeceraFinanzas titulo="Nueva transacción" bajada="Registra un nuevo ingreso o gasto" />

            <div className={`${TARJETA} mt-6 p-4 sm:p-6`}>
                <TransactionForm
                    initialData={initialData}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    );
}
