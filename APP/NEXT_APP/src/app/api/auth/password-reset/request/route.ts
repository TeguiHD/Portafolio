import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/redis";
import { hashEmail, hashIdentifier } from "@/lib/security.server";
import { SecurityLogger } from "@/lib/security-logger";
import { logger } from "@/lib/logger";

const requestSchema = z.object({
    email: z.string().email().max(254),
});

const MAX_REQUESTS_PER_EMAIL_PER_HOUR = 3;
const MAX_REQUESTS_PER_IP_PER_HOUR = 20;
const RESET_WINDOW_SECONDS = 60 * 60;

function getClientIp(request: NextRequest): string {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown"
    );
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validation = requestSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
        }

        const normalizedEmail = validation.data.email.trim().toLowerCase();
        const ipAddress = getClientIp(request);
        const userAgent = request.headers.get("user-agent") || undefined;
        const emailRateKey = `password-reset:${hashIdentifier(normalizedEmail)}`;
        const ipRateKey = `password-reset:ip:${hashIdentifier(ipAddress)}`;

        const [emailRate, ipRate] = await Promise.all([
            checkRateLimit(
                emailRateKey,
                MAX_REQUESTS_PER_EMAIL_PER_HOUR,
                RESET_WINDOW_SECONDS
            ),
            checkRateLimit(
                ipRateKey,
                MAX_REQUESTS_PER_IP_PER_HOUR,
                RESET_WINDOW_SECONDS
            ),
        ]);

        if (!emailRate.allowed || !ipRate.allowed) {
            SecurityLogger.rateLimited({
                ipAddress,
                userAgent,
                endpoint: "/api/auth/password-reset/request",
                limit: !emailRate.allowed
                    ? MAX_REQUESTS_PER_EMAIL_PER_HOUR
                    : MAX_REQUESTS_PER_IP_PER_HOUR,
                window: RESET_WINDOW_SECONDS,
            });

            const retryAfter = Math.max(emailRate.resetIn || 0, ipRate.resetIn || 0);

            return NextResponse.json(
                { error: "Demasiadas solicitudes. Intenta nuevamente más tarde." },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(retryAfter),
                    },
                }
            );
        }

        const emailHash = hashEmail(normalizedEmail);
        const user = await prisma.user.findUnique({
            where: { email: emailHash },
            select: { id: true, isActive: true },
        });

        if (user?.isActive) {
            logger.info("[PasswordReset] Request accepted", {
                userId: user.id,
                ipHash: hashIdentifier(ipAddress),
            });

            // TODO: Generate single-use reset token + send email.
            // Keep response generic to prevent account enumeration.
        }

        return NextResponse.json({
            success: true,
            message: "Si el correo existe, recibirás instrucciones para restablecer tu contraseña.",
        });
    } catch (error) {
        logger.error("[PasswordReset] Request error", error);
        return NextResponse.json(
            { error: "Error al procesar la solicitud" },
            { status: 500 }
        );
    }
}
