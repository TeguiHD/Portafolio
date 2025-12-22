"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RecurringForm } from "@/modules/finance/components";

export default function NewRecurringPage() {
    const router = useRouter();

    const handleSuccess = () => {
        router.push("/admin/finance/recurring");
    };

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
                    <h1 className="text-3xl font-bold text-white">Nuevo Pago Recurrente</h1>
                    <p className="text-gray-400 mt-1">Configura un gasto o ingreso que se repite periódicamente</p>
                </div>
            </div>

            {/* Form */}
            <div className="max-w-2xl">
                <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6 md:p-8">
                    <RecurringForm onSuccess={handleSuccess} />
                </div>
            </div>
        </div>
    );
}
