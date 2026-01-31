"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GoalForm, type GoalData } from "@/modules/finance/components/GoalForm";

export default function NewGoalPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (data: GoalData) => {
        setError(null);
        const res = await fetch("/api/finance/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const { error } = await res.json();
            setError(error || "Error al crear meta");
            return;
        }

        router.push("/admin/finance/goals");
    };

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/admin/finance/goals"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver a metas
                </Link>
                <h1 className="text-2xl font-bold text-white">Nueva meta de ahorro</h1>
                <p className="text-gray-400">Define un objetivo financiero y empieza a ahorrar</p>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                    {error}
                </div>
            )}

            {/* Form */}
            <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6">
                <GoalForm onSubmit={handleSubmit} onCancel={() => router.push("/admin/finance/goals")} />
            </div>
        </div>
    );
}
