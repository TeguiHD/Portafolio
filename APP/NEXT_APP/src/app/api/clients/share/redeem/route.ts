import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { redeemShareCode } from "@/services/sharing-service";

/**
 * POST /api/clients/share/redeem - Redeem a share code to import a client
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
        const { code } = body;

        if (!code || typeof code !== "string") {
            return NextResponse.json(
                { error: "Código es requerido" },
                { status: 400 }
            );
        }

        // Basic input sanitization
        const cleanCode = code.trim().slice(0, 100);

        if (cleanCode.length < 10) {
            return NextResponse.json(
                { error: "Código inválido" },
                { status: 400 }
            );
        }

        // Advanced Security: Atomic Rate Limiting (DB-backed)
        // Max 5 attempts per 15 minutes per IP/User to prevent brute force
        const { checkRateLimitAtomic } = await import("@/lib/rate-limit");
        const { SecurityLogger, shouldBlockIp } = await import("@/lib/security-logger");

        const ip = request.headers.get("x-forwarded-for") || "unknown";

        // Check if IP is already blocked due to threat score
        if (shouldBlockIp(ip)) {
            return NextResponse.json(
                { error: "Acceso denegado por seguridad" },
                { status: 403 }
            );
        }

        const rateLimit = await checkRateLimitAtomic({
            limit: 5,
            windowMs: 15 * 60 * 1000, // 15 minutes
            identifier: `redeem_${session.user.id}`, // Rate limit by User ID (more robust than IP for auth'd limits)
            metadata: { ip }
        });

        if (!rateLimit.allowed) {
            SecurityLogger.rateLimited({
                ipAddress: ip,
                endpoint: "/api/clients/share/redeem",
                limit: 5,
                window: 15 * 60 * 1000
            });

            return NextResponse.json(
                { error: "Demasiados intentos. Por favor espera 15 minutos." },
                { status: 429 }
            );
        }

        const result = await redeemShareCode({
            code: cleanCode,
            redeemedByUserId: session.user.id,
        });

        if (!result.success) {
            // Log security event for failures
            SecurityLogger.auth({
                success: false,
                userId: session.user.id,
                ipAddress: ip,
                reason: result.error,
                method: "REDEEM_SHARE_CODE"
            });

            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        // Log success
        SecurityLogger.auth({
            success: true,
            userId: session.user.id,
            ipAddress: ip,
            method: "REDEEM_SHARE_CODE"
        });

        return NextResponse.json({
            success: true,
            clientId: result.clientId,
            clientName: result.clientName,
            permission: result.permission,
        });
    } catch (error) {
        console.error("Error redeeming code:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
