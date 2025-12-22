"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RecurringForm } from "@/modules/finance/components";

interface RecurringPayment {
    id: string;
    name: string;
    description: string | null;
    amount: number;
    type: "INCOME" | "EXPENSE";
    frequency: string;
    dayOfMonth: number | null;
    startDate: string;
    endDate: string | null;
    nextDueDate: string | null;
    isActive: boolean;
    autoCreate: boolean;
    notifyDaysBefore: number | null;
    categoryId: string | null;
    accountId: string | null;
}

export default function EditRecurringPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [payment, setPayment] = useState<RecurringPayment | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchPayment() {
            try {
                const res = await fetch(`/api/finance/recurring/${id}`);
                if (!res.ok) throw new Error("No se pudo cargar el pago");
                const data = await res.json();
                setPayment(data.data);
            } catch (err) {
                setError((err as Error).message);
            } finally {
                setLoading(false);
            }
        }
        fetchPayment();
    }, [id]);

    const handleSuccess = () => {
        router.push("/admin/finance/recurring");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !payment) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Error al cargar</h2>
                <p className="text-gray-400 mb-6">{error || "Pago no encontrado"}</p>
                <Link href="/admin/finance/recurring" className="text-blue-400 hover:text-blue-300">
                    Volver a pagos recurrentes
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/finance/recurring"
                    className="p-2 bg-gray-800/50 rounded-xl hover:bg-gray-700/50 transition-colors"
                >
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-white">Editar Pago Recurrente</h1>
                    <p className="text-gray-400 mt-1">{payment.name}</p>
                </div>
            </div>

            {/* Form */}
            <div className="max-w-2xl">
                <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6 md:p-8">
                    <RecurringForm
                        initialData={{
                            id: payment.id,
                            name: payment.name,
                            description: payment.description || "",
                            amount: payment.amount,
                            type: payment.type,
                            frequency: payment.frequency,
                            dayOfMonth: payment.dayOfMonth,
                            startDate: payment.startDate.split("T")[0],
                            endDate: payment.endDate?.split("T")[0] || "",
                            isActive: payment.isActive,
                            autoCreate: payment.autoCreate,
                            notifyDaysBefore: payment.notifyDaysBefore,
                            categoryId: payment.categoryId || "",
                            accountId: payment.accountId || "",
                        }}
                        onSuccess={handleSuccess}
                    />
                </div>
            </div>
        </div>
    );
}
