import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
    generateShareCode,
    getClientSharingStats,
    revokeAllShareCodes,
    removeSharedAccess,
} from "@/services/sharing-service";
import type { PermissionLevel } from "@prisma/client";

/**
 * POST /api/clients/share - Generate a share code for a client
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { clientId, permission = "VIEW", expiresInHours = 24, maxUses = 1 } = body;

        if (!clientId) {
            return NextResponse.json(
                { error: "clientId es requerido" },
                { status: 400 }
            );
        }

        // Validate permission level
        const validPermissions: PermissionLevel[] = ["VIEW", "COMMENT", "EDIT", "FULL"];
        if (!validPermissions.includes(permission)) {
            return NextResponse.json(
                { error: "Nivel de permiso inválido" },
                { status: 400 }
            );
        }

        // Validate expiration
        const validExpirations = [1, 24, 168, 720]; // 1h, 1d, 7d, 30d
        if (!validExpirations.includes(expiresInHours) && expiresInHours !== 0) {
            return NextResponse.json(
                { error: "Tiempo de expiración inválido" },
                { status: 400 }
            );
        }

        const result = await generateShareCode({
            clientId,
            createdById: session.user.id,
            permission: permission as PermissionLevel,
            expiresInHours: expiresInHours === 0 ? 8760 : expiresInHours, // 0 = 1 year
            maxUses,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            code: result.formattedCode,
            expiresAt: result.expiresAt,
        });
    } catch (error) {
        console.error("Error in share endpoint:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/clients/share?clientId=xxx - Get sharing stats for a client
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get("clientId");

        if (!clientId) {
            return NextResponse.json(
                { error: "clientId es requerido" },
                { status: 400 }
            );
        }

        const result = await getClientSharingStats(clientId, session.user.id);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error getting sharing stats:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/clients/share - Revoke share codes or remove shared access
 */
export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { clientId, action, sharedWithUserId } = body;

        if (!clientId) {
            return NextResponse.json(
                { error: "clientId es requerido" },
                { status: 400 }
            );
        }

        if (action === "revoke-codes") {
            const result = await revokeAllShareCodes(clientId, session.user.id);
            if (!result.success) {
                return NextResponse.json(
                    { error: result.error },
                    { status: 400 }
                );
            }
            return NextResponse.json({
                success: true,
                revokedCount: result.revokedCount
            });
        } else if (action === "remove-access" && sharedWithUserId) {
            const result = await removeSharedAccess(clientId, sharedWithUserId, session.user.id);
            if (!result.success) {
                return NextResponse.json(
                    { error: result.error },
                    { status: 400 }
                );
            }
            return NextResponse.json({ success: true });
        }

        return NextResponse.json(
            { error: "Acción inválida" },
            { status: 400 }
        );
    } catch (error) {
        console.error("Error in delete share:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
