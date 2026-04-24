import { requirePagePermission } from "@/lib/page-security";
import { prisma } from "@/lib/prisma";
import { ExpensesList } from "./expenses-list";

export const dynamic = "force-dynamic";

export default async function GastosPage() {
    const session = await requirePagePermission("crm.expenses.view");

    const [expenses, clients, contracts] = await Promise.all([
        prisma.clientExpense.findMany({
            where: { userId: session.user.id, isDeleted: false },
            include: {
                client: { select: { id: true, name: true } },
                contract: { select: { id: true, title: true, contractNumber: true } },
            },
            orderBy: { expenseDate: "desc" },
        }),
        prisma.quotationClient.findMany({
            where: { userId: session.user.id, isActive: true },
            select: { id: true, name: true, workType: true },
            orderBy: { name: "asc" },
        }),
        prisma.contract.findMany({
            where: { userId: session.user.id, isDeleted: false },
            select: { id: true, title: true, contractNumber: true, clientId: true },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    const serialized = expenses.map(e => ({
        ...e,
        expenseDate: e.expenseDate.toISOString(),
    }));

    return <ExpensesList initialExpenses={serialized} clients={clients} contracts={contracts} />;
}
