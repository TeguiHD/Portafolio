import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { secureApiEndpoint } from "@/lib/api-security";
import { z } from "zod";

const shareClientSchema = z.object({
    clientId: z.string().min(1),
    targetUserId: z.string().min(1),
    permission: z.enum(["VIEW", "COMMENT", "EDIT", "FULL"]).default("VIEW"),
});

const revokeShareSchema = z.object({
    clientId: z.string().min(1),
    targetUserId: z.string().min(1),
});

export async function POST(request: NextRequest) {
    try {
        const security = await secureApiEndpoint(request, {
            requireAuth: true,
        });

        if (security.error) return security.error;
        const session = security.session!;

        const body = await request.json();
        const validation = shareClientSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Invalid input" },
                { status: 400 }
            );
        }

        const { clientId, targetUserId, permission } = validation.data;

        // Verify ownership of the client
        const client = await prisma.quotationClient.findUnique({
            where: { id: clientId },
        });

        if (!client) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        if (client.userId !== session.user.id) {
            // Check if user has FULL permission on this client to share it further? 
            // For now, only owner can share.
            return NextResponse.json(
                { error: "Only the owner can share this client" },
                { status: 403 }
            );
        }

        // Verify that target user is a connected user
        const isConnected = await prisma.userConnection.findFirst({
            where: {
                OR: [
                    { requesterId: session.user.id, addresseeId: targetUserId, status: "ACCEPTED" },
                    { requesterId: targetUserId, addresseeId: session.user.id, status: "ACCEPTED" },
                ],
            },
        });

        if (!isConnected) {
            return NextResponse.json(
                { error: "You can only share with connected users" },
                { status: 403 }
            );
        }

        // Create or update share
        const share = await prisma.sharedClient.upsert({
            where: {
                clientId_sharedWithUserId: {
                    clientId,
                    sharedWithUserId: targetUserId,
                },
            },
            update: {
                permission,
                updatedAt: new Date(),
            },
            create: {
                clientId,
                sharedWithUserId: targetUserId,
                sharedByUserId: session.user.id,
                permission,
            },
        });

        return NextResponse.json(share);
    } catch (error) {
        console.error("Share client error:", error);
        return NextResponse.json(
            { error: "Failed to share client" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const security = await secureApiEndpoint(request, {
            requireAuth: true,
        });

        if (security.error) return security.error;
        const session = security.session!;

        const body = await request.json();
        const validation = revokeShareSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Invalid input" },
                { status: 400 }
            );
        }

        const { clientId, targetUserId } = validation.data;

        // Verify ownership
        const client = await prisma.quotationClient.findUnique({
            where: { id: clientId },
        });

        if (!client) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        if (client.userId !== session.user.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        await prisma.sharedClient.deleteMany({
            where: {
                clientId,
                sharedWithUserId: targetUserId,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Revoke share error:", error);
        return NextResponse.json(
            { error: "Failed to revoke share" },
            { status: 500 }
        );
    }
}
