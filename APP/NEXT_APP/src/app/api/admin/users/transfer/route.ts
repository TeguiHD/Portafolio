
import { NextResponse } from "next/server";
import { verifySuperAdminForApi } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AuditActions } from "@/lib/audit";
import { z } from "zod";

const transferSchema = z.object({
    sourceUserId: z.string().min(1),
    targetUserId: z.string().min(1),
    mode: z.enum(["ALL_CLIENTS"]), // Extensible for future modes
});

export async function POST(request: Request) {
    const session = await verifySuperAdminForApi();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const validation = transferSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        const { sourceUserId, targetUserId, mode } = validation.data;

        if (sourceUserId === targetUserId) {
            return NextResponse.json({ error: "Cannot transfer to same user" }, { status: 400 });
        }

        // Verify users exist
        const [sourceUser, targetUser] = await Promise.all([
            prisma.user.findUnique({ where: { id: sourceUserId } }),
            prisma.user.findUnique({ where: { id: targetUserId } }),
        ]);

        if (!sourceUser || !targetUser) {
            return NextResponse.json({ error: "One or both users not found" }, { status: 404 });
        }

        // Perform Transfer
        await prisma.$transaction(async (tx) => {
            if (mode === "ALL_CLIENTS") {
                // 1. Transfer Clients
                const updatedClients = await tx.quotationClient.updateMany({
                    where: { userId: sourceUserId },
                    data: { userId: targetUserId },
                });

                // 2. Transfer Quotations
                const updatedQuotations = await tx.quotation.updateMany({
                    where: { userId: sourceUserId },
                    data: { userId: targetUserId },
                });

                // 3. Log Audit
                await createAuditLog({
                    action: "DATA_TRANSFER",
                    category: "admin",
                    userId: session.user.id,
                    targetId: targetUserId,
                    targetType: "user",
                    metadata: {
                        sourceUserId,
                        sourceUserName: sourceUser.name,
                        clientsMoved: updatedClients.count,
                        quotationsMoved: updatedQuotations.count,
                    },
                });
            }
        });

        return NextResponse.json({ success: true, message: "Transferencia completada correctamente" });
    } catch (error) {
        console.error("Transfer error:", error);
        return NextResponse.json({ error: "Error transferring data" }, { status: 500 });
    }
}
