"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { TransactionForm } from "@/modules/finance";
import { useFinance } from "@/modules/finance/context/FinanceContext";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";
import { useMemo } from "react";

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
                transactionDate: date || new Date().toISOString().split("T")[0],
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
        <div className="max-w-2xl mx-auto">
            <FinanceBreadcrumbs />
            
            {/* Header */}
            <div className="mb-6">
                <motion.h1
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-bold text-white"
                >
                    ➕ Nueva Transacción
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-neutral-400 text-sm mt-1"
                >
                    Registra un nuevo ingreso, gasto o transferencia
                </motion.p>
            </div>

            {/* Form */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6"
            >
                <TransactionForm
                    initialData={initialData}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                />
            </motion.div>
        </div>
    );
}
