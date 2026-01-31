"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BudgetForm, type BudgetData } from "@/modules/finance/components/BudgetForm";

export default function NewBudgetPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (data: BudgetData) => {
        setError(null);
        const res = await fetch("/api/finance/budgets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const { error } = await res.json();
            setError(error || "Error al crear presupuesto");
            return;
        }

        router.push("/admin/finance/budgets");
    };

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/admin/finance/budgets"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver a presupuestos
                </Link>
                <h1 className="text-2xl font-bold text-white">Nuevo presupuesto</h1>
                <p className="text-gray-400">Define un límite de gasto para controlar tus finanzas</p>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                    {error}
                </div>
            )}

            {/* Form */}
            <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6">
                <BudgetForm onSubmit={handleSubmit} onCancel={() => router.push("/admin/finance/budgets")} />
            </div>
        </div>
    );
}
