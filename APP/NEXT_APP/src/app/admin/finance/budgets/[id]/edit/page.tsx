"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BudgetForm } from "@/modules/finance/components/BudgetForm";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function EditBudgetPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const [budget, setBudget] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBudget = async () => {
            try {
                const res = await fetch(`/api/finance/budgets/${id}`);
                if (!res.ok) throw new Error("Presupuesto no encontrado");
                const { data } = await res.json();
                setBudget(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error desconocido");
            } finally {
                setLoading(false);
            }
        };
        fetchBudget();
    }, [id]);

    const handleSubmit = async (data: any) => {
        setError(null);
        const res = await fetch(`/api/finance/budgets/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const { error } = await res.json();
            setError(error || "Error al actualizar presupuesto");
            return;
        }

        router.push("/admin/finance/budgets");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (error && !budget) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <Link
                        href="/admin/finance/budgets"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg"
                    >
                        Volver a presupuestos
                    </Link>
                </div>
            </div>
        );
    }

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
                <h1 className="text-2xl font-bold text-white">Editar presupuesto</h1>
                <p className="text-gray-400">{budget?.name}</p>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                    {error}
                </div>
            )}

            {/* Form */}
            <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6">
                <BudgetForm
                    budget={budget}
                    onSubmit={handleSubmit}
                    onCancel={() => router.push("/admin/finance/budgets")}
                />
            </div>
        </div>
    );
}
