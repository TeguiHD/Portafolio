import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { secureApiEndpoint } from "@/lib/api-security";
import { sanitizeInput } from "@/lib/security";
import { z } from "zod";

// Validation schemas
const connectionRequestSchema = z.object({
    sharingCode: z.string().min(1),
});

const connectionUpdateSchema = z.object({
    status: z.enum(["ACCEPTED", "REJECTED"]),
});

export async function GET(request: NextRequest) {
    try {
        const security = await secureApiEndpoint(request, {
            requireAuth: true,
        });

        if (security.error) return security.error;
        const session = security.session!;

        const connections = await prisma.userConnection.findMany({
            where: {
                OR: [
                    { requesterId: session.user.id },
                    { addresseeId: session.user.id },
                ],
            },
            include: {
                requester: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
                addressee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(connections);
    } catch (error) {
        console.error("Connection fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch connections" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const security = await secureApiEndpoint(request, {
            requireAuth: true,
        });

        if (security.error) return security.error;
        const session = security.session!;

        const body = await request.json();
        const validation = connectionRequestSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Invalid input" },
                { status: 400 }
            );
        }

        const { sharingCode } = validation.data;

        // Find user by sharing code
        const targetUser = await prisma.user.findUnique({
            where: { sharingCode },
        });

        if (!targetUser) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        if (targetUser.id === session.user.id) {
            return NextResponse.json(
                { error: "Cannot connect with yourself" },
                { status: 400 }
            );
        }

        // Check if connection already exists
        const existingConnection = await prisma.userConnection.findUnique({
            where: {
                requesterId_addresseeId: {
                    requesterId: session.user.id,
                    addresseeId: targetUser.id,
                },
            },
        });

        if (existingConnection) {
            return NextResponse.json(
                { error: "Connection request already sent or exists" },
                { status: 400 }
            );
        }

        // Check reverse connection too (if they already requested us)
        const reverseConnection = await prisma.userConnection.findUnique({
            where: {
                requesterId_addresseeId: {
                    requesterId: targetUser.id,
                    addresseeId: session.user.id,
                },
            },
        });

        if (reverseConnection) {
            return NextResponse.json(
                { error: "This user has already sent you a request. Please check your incoming requests." },
                { status: 400 }
            );
        }

        const connection = await prisma.userConnection.create({
            data: {
                requesterId: session.user.id,
                addresseeId: targetUser.id,
                status: "PENDING",
            },
        });

        return NextResponse.json(connection, { status: 201 });
    } catch (error) {
        console.error("Connection request error:", error);
        return NextResponse.json(
            { error: "Failed to send connection request" },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const security = await secureApiEndpoint(request, {
            requireAuth: true,
        });

        if (security.error) return security.error;
        const session = security.session!;

        const { searchParams } = new URL(request.url);
        const connectionId = searchParams.get("id");

        if (!connectionId) {
            return NextResponse.json({ error: "Connection ID required" }, { status: 400 });
        }

        const body = await request.json();
        const validation = connectionUpdateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Invalid status" },
                { status: 400 }
            );
        }

        const { status } = validation.data;

        // Verify ownership (must be addressee to accept/reject)
        const connection = await prisma.userConnection.findUnique({
            where: { id: connectionId },
        });

        if (!connection) {
            return NextResponse.json({ error: "Connection not found" }, { status: 404 });
        }

        if (connection.addresseeId !== session.user.id) {
            return NextResponse.json(
                { error: "Unauthorized to update this connection" },
                { status: 403 }
            );
        }

        const updatedConnection = await prisma.userConnection.update({
            where: { id: connectionId },
            data: { status },
        });

        return NextResponse.json(updatedConnection);
    } catch (error) {
        console.error("Connection update error:", error);
        return NextResponse.json(
            { error: "Failed to update connection" },
            { status: 500 }
        );
    }
}
