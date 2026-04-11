import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { secureApiEndpoint, secureErrorResponse, secureJsonResponse } from "@/lib/api-security";
import { createAuditLog } from "@/lib/audit";

const statusSchema = z.object({
    status: z.enum(["PENDING", "INTERVIEW", "CLOSED"]),
    note: z.string().max(500).optional(),
    closureReason: z.string().max(500).optional(),
});

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    PENDING: ["INTERVIEW", "CLOSED"],
    INTERVIEW: ["CLOSED"],
    CLOSED: [],
};

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const security = await secureApiEndpoint(request, {
        requireAuth: true,
        requiredPermission: "jobs.applications.manage",
        rateLimit: { limit: 45, windowMs: 60_000 },
        allowedContentTypes: ["application/json"],
        maxBodySize: 50 * 1024,
        checkAnomalies: true,
        auditAccess: true,
    });

    if (security.error) {
        return security.error;
    }

    try {
        const userId = security.session!.user.id;
        const { id: applicationId } = await params;
        const body = statusSchema.parse(security.body || {});

        const existing = await prisma.jobApplication.findFirst({
            where: {
                id: applicationId,
                userId,
            },
            select: {
                id: true,
                status: true,
                vacancyId: true,
            },
        });

        if (!existing) {
            return secureJsonResponse({ error: "Application not found" }, 404);
        }

        if (existing.status === body.status) {
            return secureJsonResponse({ error: "Application already has that status" }, 400);
        }

        const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
        if (!allowed.includes(body.status)) {
            return secureJsonResponse({
                error: `Invalid status transition from ${existing.status} to ${body.status}`,
            }, 400);
        }

        const now = new Date();
        const note = body.note?.trim() || null;
        const closureReason = body.status === "CLOSED"
            ? body.closureReason?.trim() || null
            : null;

        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.jobApplication.update({
                where: { id: applicationId },
                data: {
                    status: body.status,
                    lastStatusAt: now,
                    closureReason,
                    updatedAt: now,
                },
                include: {
                    vacancy: {
                        select: {
                            id: true,
                            title: true,
                            company: true,
                        },
                    },
                    events: {
                        orderBy: { createdAt: "desc" },
                        take: 20,
                    },
                },
            });

            const event = await tx.jobApplicationEvent.create({
                data: {
                    userId,
                    applicationId,
                    fromStatus: existing.status,
                    toStatus: body.status,
                    note,
                    metadata: {
                        closureReason,
                        source: "jobs.applications.status",
                    } as Prisma.InputJsonValue,
                },
            });

            return { updated, event };
        });

        await createAuditLog({
            action: "jobs.application.status.changed",
            category: "users",
            userId,
            targetId: applicationId,
            targetType: "jobApplication",
            metadata: {
                vacancyId: existing.vacancyId,
                fromStatus: existing.status,
                toStatus: body.status,
                closureReason,
            },
            ipAddress: security.context.ipAddress,
            userAgent: security.context.userAgent,
        });

        return secureJsonResponse({
            item: result.updated,
            event: result.event,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return secureJsonResponse({ error: error.issues[0]?.message || "Invalid request" }, 400);
        }

        return secureErrorResponse("Failed to update application status", 500, error as Error);
    }
}
