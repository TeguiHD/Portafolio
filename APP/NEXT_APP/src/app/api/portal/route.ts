import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash as hashAccessCode, verify } from "argon2";
import { timingSafeEqual } from "crypto";
import { checkRateLimit } from "@/lib/redis";
import { hashIdentifier } from "@/lib/security.server";

/**
 * Project Portal API – Public endpoint for client portal access.
 * 
 * GET /api/portal?slug=...&code=...
 * Returns portal data with milestones visible to the client.
 * 
 * Security:
 * - Access code is hashed with argon2 (same as passwords)
 * - Rate limit by IP and slug
 * - Only isVisibleToClient milestones are returned
 * - Portal must be active and not expired
 */

const PORTAL_ACCESS_WINDOW_SECONDS = 60 * 60;
const MAX_PORTAL_REQUESTS_PER_IP_PER_HOUR = 60;
const MAX_PORTAL_ATTEMPTS_PER_SLUG_IP_PER_HOUR = 20;

function getClientIp(request: NextRequest): string {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown"
    );
}

function isLikelyArgonHash(value: string): boolean {
    return value.startsWith("$argon2");
}

function timingSafeEquals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const code = searchParams.get("code");

    if (!slug) {
        return NextResponse.json({ error: "Slug requerido" }, { status: 400 });
    }

    const ipAddress = getClientIp(request);
    const [ipRate, slugRate] = await Promise.all([
        checkRateLimit(
            `portal:ip:${hashIdentifier(ipAddress)}`,
            MAX_PORTAL_REQUESTS_PER_IP_PER_HOUR,
            PORTAL_ACCESS_WINDOW_SECONDS
        ),
        checkRateLimit(
            `portal:slug:${hashIdentifier(`${slug}:${ipAddress}`)}`,
            MAX_PORTAL_ATTEMPTS_PER_SLUG_IP_PER_HOUR,
            PORTAL_ACCESS_WINDOW_SECONDS
        ),
    ]);

    if (!ipRate.allowed || !slugRate.allowed) {
        const retryAfter = Math.max(ipRate.resetIn || 0, slugRate.resetIn || 0);
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

    const portal = await prisma.projectPortal.findUnique({
        where: { slug },
        include: {
            client: { select: { name: true, company: true } },
            contract: {
                select: {
                    title: true,
                    contractNumber: true,
                    status: true,
                    totalAmount: true,
                    startDate: true,
                    endDate: true,
                    type: true,
                },
            },
            milestones: {
                where: { isVisibleToClient: true },
                orderBy: { sortOrder: "asc" },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    status: true,
                    type: true,
                    icon: true,
                    sortOrder: true,
                    estimatedDate: true,
                    completedAt: true,
                },
            },
        },
    });

    if (!portal) {
        return NextResponse.json({ error: "Portal no encontrado" }, { status: 404 });
    }

    if (!portal.isActive) {
        return NextResponse.json({ error: "Este portal está desactivado" }, { status: 403 });
    }

    if (portal.expiresAt && new Date() > portal.expiresAt) {
        return NextResponse.json({ error: "Este portal ha expirado" }, { status: 410 });
    }

    // Verify access code if required
    if (portal.accessMode === "code") {
        if (!code) {
            return NextResponse.json({
                requiresCode: true,
                portalTitle: portal.title,
                clientName: portal.client.name,
            });
        }

        let isValid = false;
        const storedCode = portal.accessCode;

        if (isLikelyArgonHash(storedCode)) {
            isValid = await verify(storedCode, code);
        } else {
            // Legacy fallback: support plaintext access codes and migrate them in-place.
            isValid = timingSafeEquals(storedCode, code);

            if (isValid) {
                const upgradedHash = await hashAccessCode(code);
                await prisma.projectPortal.update({
                    where: { id: portal.id },
                    data: { accessCode: upgradedHash },
                });
            }
        }

        if (!isValid) {
            return NextResponse.json({ error: "Código de acceso incorrecto" }, { status: 401 });
        }
    }

    // Update analytics
    await prisma.projectPortal.update({
        where: { id: portal.id },
        data: {
            lastAccessedAt: new Date(),
            accessCount: { increment: 1 },
        },
    });

    // Calculate progress
    const totalMilestones = portal.milestones.length;
    const completedMilestones = portal.milestones.filter((m) => m.status === "COMPLETED").length;
    const currentMilestone = portal.milestones.find((m) => m.status === "IN_PROGRESS") || null;

    return NextResponse.json({
        portal: {
            title: portal.title,
            description: portal.description,
            client: portal.client,
            contract: portal.contract,
        },
        milestones: portal.milestones,
        progress: {
            total: totalMilestones,
            completed: completedMilestones,
            percentage: totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0,
            currentMilestone: currentMilestone?.title || null,
        },
    });
}
