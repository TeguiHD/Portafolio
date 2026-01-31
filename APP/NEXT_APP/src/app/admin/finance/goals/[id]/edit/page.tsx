"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GoalForm, type GoalData } from "@/modules/finance/components/GoalForm";

interface PageProps {
    params: Promise<{ id: string }>;
}

interface Goal extends GoalData {
    id: string;
}

export default function EditGoalPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const [goal, setGoal] = useState<Goal | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchGoal = async () => {
            try {
                const res = await fetch(`/api/finance/goals/${id}`);
                if (!res.ok) throw new Error("Meta no encontrada");
                const { data } = await res.json();
                setGoal(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error desconocido");
            } finally {
                setLoading(false);
            }
        };
        fetchGoal();
    }, [id]);

    const handleSubmit = async (data: GoalData) => {
        setError(null);
        const res = await fetch(`/api/finance/goals/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const { error } = await res.json();
            setError(error || "Error al actualizar meta");
            return;
        }

        router.push("/admin/finance/goals");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (error && !goal) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <Link
                        href="/admin/finance/goals"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg"
                    >
                        Volver a metas
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
                    href="/admin/finance/goals"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver a metas
                </Link>
                <h1 className="text-2xl font-bold text-white">Editar meta</h1>
                <p className="text-gray-400 flex items-center gap-2">
                    <span className="text-xl">{goal?.icon}</span>
                    {goal?.name}
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                    {error}
                </div>
            )}

            {/* Form */}
            <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6">
                <GoalForm goal={goal || undefined} onSubmit={handleSubmit} onCancel={() => router.push("/admin/finance/goals")} />
            </div>
        </div>
    );
}
