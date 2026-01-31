import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Helper to safely convert to number
function toNumber(value: number | { toNumber: () => number } | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value.toNumber === 'function') return value.toNumber();
    return Number(value) || 0;
}

interface Tip {
    id: string;
    type: "savings" | "investment" | "budgeting" | "debt" | "general";
    title: string;
    description: string;
    impact?: string;
    actionLabel?: string;
    actionUrl?: string;
    isPersonalized: boolean;
    priority: number;
}

// Default tips library
const defaultTips: Tip[] = [
    {
        id: "default-1",
        type: "savings",
        title: "Regla del 50/30/20",
        description: "Destina 50% de tus ingresos a necesidades, 30% a deseos y 20% a ahorro. Es una forma simple de mantener el equilibrio financiero.",
        impact: "Podrías ahorrar hasta un 20% más cada mes",
        isPersonalized: false,
        priority: 1,
    },
    {
        id: "default-2",
        type: "investment",
        title: "Empieza a invertir temprano",
        description: "El interés compuesto es tu mejor aliado. Incluso pequeñas inversiones pueden crecer significativamente con el tiempo.",
        impact: "Una inversión constante puede duplicarse en 7-10 años",
        actionLabel: "Explorar metas de ahorro",
        actionUrl: "/admin/finance/goals",
        isPersonalized: false,
        priority: 2,
    },
    {
        id: "default-3",
        type: "budgeting",
        title: "Revisa tus suscripciones",
        description: "Evalúa todos los servicios mensuales que pagas. Cancela aquellos que no uses regularmente.",
        impact: "Podrías ahorrar entre $10.000 y $50.000 mensuales",
        isPersonalized: false,
        priority: 3,
    },
    {
        id: "default-4",
        type: "debt",
        title: "Paga más del mínimo",
        description: "Si tienes deudas de tarjeta de crédito, intenta pagar más del mínimo. Esto reduce significativamente los intereses a largo plazo.",
        isPersonalized: false,
        priority: 4,
    },
    {
        id: "default-5",
        type: "savings",
        title: "Fondo de emergencia",
        description: "Mantén un fondo de emergencia equivalente a 3-6 meses de gastos. Te dará tranquilidad ante imprevistos.",
        actionLabel: "Crear meta de ahorro",
        actionUrl: "/admin/finance/goals/new",
        isPersonalized: false,
        priority: 5,
    },
    {
        id: "default-6",
        type: "general",
        title: "Automatiza tus ahorros",
        description: "Configura transferencias automáticas a tu cuenta de ahorros justo después de recibir tu sueldo.",
        isPersonalized: false,
        priority: 6,
    },
    {
        id: "default-7",
        type: "investment",
        title: "Diversifica tus inversiones",
        description: "No pongas todos los huevos en la misma canasta. Distribuye tu dinero entre diferentes tipos de inversiones.",
        isPersonalized: false,
        priority: 7,
    },
    {
        id: "default-8",
        type: "budgeting",
        title: "Registra cada gasto",
        description: "El seguimiento diario de tus gastos te ayuda a identificar patrones y encontrar áreas de mejora.",
        actionLabel: "Registrar gasto",
        actionUrl: "/admin/finance/transactions/new",
        isPersonalized: false,
        priority: 8,
    },
];

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const personalized = searchParams.get("personalized") === "true";
        const _currency = searchParams.get("currency") || "CLP";

        const userId = session.user.id;
        const tips: Tip[] = [...defaultTips];

        if (personalized) {
            // Fetch user data for personalized tips
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const [transactions, budgets, goals] = await Promise.all([
                prisma.transaction.findMany({
                    where: {
                        userId,
                        transactionDate: { gte: startOfMonth },
                    },
                    include: { category: true },
                }),
                prisma.budget.findMany({
                    where: { userId },
                }),
                prisma.savingsGoal.findMany({
                    where: { userId },
                }),
            ]);

            // Calculate spending patterns
            const totalExpenses = transactions
                .filter(t => t.type === "EXPENSE")
                .reduce((sum, t) => sum + toNumber(t.amount), 0);

            const totalIncome = transactions
                .filter(t => t.type === "INCOME")
                .reduce((sum, t) => sum + toNumber(t.amount), 0);

            const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

            // Category-based spending
            const categorySpending = transactions
                .filter(t => t.type === "EXPENSE" && t.category)
                .reduce((acc, t) => {
                    const catName = t.category?.name || "Otros";
                    acc[catName] = (acc[catName] || 0) + toNumber(t.amount);
                    return acc;
                }, {} as Record<string, number>);

            // Generate personalized tips based on user data

            // Low savings rate tip
            if (savingsRate < 10 && totalIncome > 0) {
                tips.unshift({
                    id: "personal-savings",
                    type: "savings",
                    title: "Tu tasa de ahorro está baja",
                    description: `Este mes has ahorrado solo ${savingsRate.toFixed(1)}% de tus ingresos. Intenta reducir gastos no esenciales para mejorar.`,
                    impact: `Podrías ahorrar ${Math.round(totalIncome * 0.2 - (totalIncome - totalExpenses))} extra si llegaras al 20%`,
                    isPersonalized: true,
                    priority: 0,
                });
            }

            // High spending category tip
            const topCategory = Object.entries(categorySpending)
                .sort(([, a], [, b]) => b - a)[0];

            if (topCategory && topCategory[1] > totalExpenses * 0.3) {
                tips.unshift({
                    id: "personal-category",
                    type: "budgeting",
                    title: `Alto gasto en ${topCategory[0]}`,
                    description: `Has gastado ${((topCategory[1] / totalExpenses) * 100).toFixed(0)}% de tus gastos en ${topCategory[0]}. Considera establecer un presupuesto para esta categoría.`,
                    actionLabel: "Crear presupuesto",
                    actionUrl: "/admin/finance/budgets/new",
                    isPersonalized: true,
                    priority: 0,
                });
            }

            // No goals tip
            if (goals.length === 0) {
                tips.unshift({
                    id: "personal-goals",
                    type: "investment",
                    title: "Establece metas de ahorro",
                    description: "No tienes metas de ahorro definidas. Establecer objetivos claros te ayudará a mantener la motivación.",
                    actionLabel: "Crear primera meta",
                    actionUrl: "/admin/finance/goals/new",
                    isPersonalized: true,
                    priority: 0,
                });
            }

            // Budget warning tip
            const overBudgetCategories = budgets.filter(b => toNumber(b.currentSpent) > toNumber(b.amount) * 0.9);
            if (overBudgetCategories.length > 0) {
                tips.unshift({
                    id: "personal-budget",
                    type: "budgeting",
                    title: "Presupuestos al límite",
                    description: `Tienes ${overBudgetCategories.length} presupuesto${overBudgetCategories.length > 1 ? "s" : ""} cerca del límite. Revisa tus gastos para no excederte.`,
                    actionLabel: "Ver presupuestos",
                    actionUrl: "/admin/finance/budgets",
                    isPersonalized: true,
                    priority: 0,
                });
            }
        }

        // Sort by priority and return
        tips.sort((a, b) => a.priority - b.priority);

        return NextResponse.json({ data: tips.slice(0, 10) });
    } catch (error) {
        console.error("Error fetching tips:", error);
        return NextResponse.json({ data: defaultTips.slice(0, 5) });
    }
}
