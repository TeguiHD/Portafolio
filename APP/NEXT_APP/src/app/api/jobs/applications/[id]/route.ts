import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { secureApiEndpoint, secureErrorResponse, secureJsonResponse } from "@/lib/api-security";
import { createAuditLog } from "@/lib/audit";

const updateApplicationSchema = z.object({
    company: z.string().max(260).optional().nullable(),
    roleTitle: z.string().max(260).optional().nullable(),
    sourceUrl: z.string().url().max(1200).optional().nullable(),
    notes: z.string().max(4000).optional().nullable(),
    appliedAt: z.string().datetime().optional().nullable(),
    cvVersionId: z.string().cuid().optional().nullable(),
});

function cleanText(value: string, max: number): string {
    return value.trim().replace(/\s+/g, " ").slice(0, max);
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const security = await secureApiEndpoint(request, {
        requireAuth: true,
        requiredPermission: "jobs.applications.view",
        rateLimit: { limit: 90, windowMs: 60_000 },
        checkAnomalies: true,
        auditAccess: true,
    });

    if (security.error) {
        return security.error;
    }

    try {
        const userId = security.session!.user.id;
        const { id } = await params;

        const item = await prisma.jobApplication.findFirst({
            where: {
                id,
                userId,
            },
            include: {
                vacancy: true,
                analysis: true,
                adaptation: true,
                cvVersion: {
                    select: {
                        id: true,
                        name: true,
                        updatedAt: true,
                    },
                },
                events: {
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        if (!item) {
            return secureJsonResponse({ error: "Application not found" }, 404);
        }

        return secureJsonResponse({ item });
    } catch (error) {
        return secureErrorResponse("Failed to fetch application", 500, error as Error);
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const security = await secureApiEndpoint(request, {
        requireAuth: true,
        requiredPermission: "jobs.applications.manage",
        rateLimit: { limit: 40, windowMs: 60_000 },
        allowedContentTypes: ["application/json"],
        maxBodySize: 80 * 1024,
        checkAnomalies: true,
        auditAccess: true,
    });

    if (security.error) {
        return security.error;
    }

    try {
        const userId = security.session!.user.id;
        const { id } = await params;
        const payload = updateApplicationSchema.parse(security.body || {});

        const existing = await prisma.jobApplication.findFirst({
            where: {
                id,
                userId,
            },
            select: {
                id: true,
                cvVersionId: true,
            },
        });

        if (!existing) {
            return secureJsonResponse({ error: "Application not found" }, 404);
        }

        if (payload.cvVersionId) {
            const cv = await prisma.cvVersion.findFirst({
                where: {
                    id: payload.cvVersionId,
                    userId,
                },
                select: { id: true },
            });

            if (!cv) {
                return secureJsonResponse({ error: "CV version not found" }, 400);
            }
        }

        const data: Record<string, unknown> = {
            ...(payload.company !== undefined && {
                company: payload.company ? cleanText(payload.company, 260) : null,
            }),
            ...(payload.roleTitle !== undefined && {
                roleTitle: payload.roleTitle ? cleanText(payload.roleTitle, 260) : null,
            }),
            ...(payload.sourceUrl !== undefined && {
                sourceUrl: payload.sourceUrl || null,
            }),
            ...(payload.notes !== undefined && {
                notes: payload.notes?.trim() || null,
            }),
            ...(payload.appliedAt !== undefined && {
                appliedAt: payload.appliedAt ? new Date(payload.appliedAt) : null,
            }),
            ...(payload.cvVersionId !== undefined && {
                cvVersionId: payload.cvVersionId || null,
            }),
        };

        if (Object.keys(data).length === 0) {
            return secureJsonResponse({ error: "No fields to update" }, 400);
        }

        const item = await prisma.jobApplication.update({
            where: {
                id,
            },
            data,
            include: {
                vacancy: {
                    select: {
                        id: true,
                        title: true,
                        company: true,
                    },
                },
                cvVersion: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        await createAuditLog({
            action: "jobs.application.updated",
            category: "users",
            userId,
            targetId: id,
            targetType: "jobApplication",
            metadata: {
                updatedFields: Object.keys(data),
                prevCvVersionId: existing.cvVersionId,
                nextCvVersionId: payload.cvVersionId || null,
            },
            ipAddress: security.context.ipAddress,
            userAgent: security.context.userAgent,
        });

        return secureJsonResponse({ item });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return secureJsonResponse({ error: error.issues[0]?.message || "Invalid request body" }, 400);
        }

        return secureErrorResponse("Failed to update application", 500, error as Error);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const security = await secureApiEndpoint(request, {
        requireAuth: true,
        requiredPermission: "jobs.applications.manage",
        rateLimit: { limit: 20, windowMs: 60_000 },
        checkAnomalies: true,
        auditAccess: true,
    });

    if (security.error) {
        return security.error;
    }

    try {
        const userId = security.session!.user.id;
        const { id } = await params;

        const deleted = await prisma.jobApplication.deleteMany({
            where: {
                id,
                userId,
            },
        });

        if (deleted.count === 0) {
            return secureJsonResponse({ error: "Application not found" }, 404);
        }

        await createAuditLog({
            action: "jobs.application.deleted",
            category: "users",
            userId,
            targetId: id,
            targetType: "jobApplication",
            ipAddress: security.context.ipAddress,
            userAgent: security.context.userAgent,
        });

        return secureJsonResponse({ success: true });
    } catch (error) {
        return secureErrorResponse("Failed to delete application", 500, error as Error);
    }
}
