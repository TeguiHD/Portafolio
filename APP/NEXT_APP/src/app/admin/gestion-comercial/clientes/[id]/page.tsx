import { verifyAdmin } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from '@/generated/prisma/client';
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ClientDetailClient from "./client";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
    const { id } = await params;
    const session = await verifyAdmin();

    const canView = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "quotations.view"
    );
    if (!canView) redirect("/admin/gestion-comercial/clientes");

    const client = await prisma.quotationClient.findFirst({
        where: { id, userId: session.user.id },
        include: {
            quotations: {
                where: { isDeleted: false },
                orderBy: { createdAt: "desc" },
                take: 20,
                select: {
                    id: true,
                    folio: true,
                    projectName: true,
                    status: true,
                    total: true,
                    createdAt: true,
                },
            },
            contracts: {
                where: { isDeleted: false },
                orderBy: { createdAt: "desc" },
                take: 20,
                include: {
                    milestones: {
                        orderBy: { sortOrder: "asc" },
                    },
                    portals: {
                        select: { id: true, slug: true, isActive: true, accessCount: true },
                    },
                    paymentPlans: true,
                    approvals: {
                        orderBy: { createdAt: "desc" },
                        select: {
                            id: true,
                            type: true,
                            status: true,
                            signerName: true,
                            signerRut: true,
                            signedAt: true,
                            createdAt: true,
                        },
                    },
                },
            },
            deals: {
                orderBy: { updatedAt: "desc" },
                take: 10,
                select: {
                    id: true,
                    title: true,
                    stage: true,
                    priority: true,
                    estimatedValue: true,
                    updatedAt: true,
                },
            },
            expenses: {
                where: { isDeleted: false },
                orderBy: { expenseDate: "desc" },
                take: 20,
                select: {
                    id: true,
                    description: true,
                    amount: true,
                    category: true,
                    expenseDate: true,
                },
            },
        },
    });

    if (!client) notFound();

    // Serialize dates
    const serialized = JSON.parse(JSON.stringify(client));

    return <ClientDetailClient client={serialized} />;
}
