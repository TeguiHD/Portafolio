import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { secureApiEndpoint, secureErrorResponse, secureJsonResponse } from "@/lib/api-security";
import { createAuditLog } from "@/lib/audit";

const updateVacancySchema = z.object({
    sourceExternalId: z.string().max(180).optional().nullable(),
    sourceUrl: z.string().url().max(1200).optional().nullable(),
    title: z.string().min(3).max(260).optional(),
    company: z.string().min(2).max(260).optional(),
    location: z.string().max(260).optional().nullable(),
    employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN", "FREELANCE", "TEMPORARY", "OTHER"]).optional(),
    workMode: z.enum(["ONSITE", "HYBRID", "REMOTE", "UNSPECIFIED"]).optional(),
    salaryRange: z.string().max(140).optional().nullable(),
    postedAt: z.string().datetime().optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
    description: z.string().min(40).max(25000).optional(),
    isActive: z.boolean().optional(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

function cleanText(value: string, max: number): string {
    return value.trim().replace(/\s+/g, " ").slice(0, max);
}

function normalizeForSearch(value: string): string {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const security = await secureApiEndpoint(request, {
        requireAuth: true,
        requiredPermission: "jobs.vacancies.view",
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

        const item = await prisma.jobVacancy.findFirst({
            where: {
                id,
                userId,
            },
            include: {
                analyses: {
                    orderBy: { createdAt: "desc" },
                    take: 25,
                },
                adaptations: {
                    orderBy: { createdAt: "desc" },
                    take: 25,
                    select: {
                        id: true,
                        mode: true,
                        baseCvVersionId: true,
                        adaptedCvVersionId: true,
                        notes: true,
                        createdAt: true,
                    },
                },
                applications: {
                    orderBy: { lastStatusAt: "desc" },
                    take: 50,
                    include: {
                        events: {
                            orderBy: { createdAt: "desc" },
                            take: 5,
                        },
                    },
                },
            },
        });

        if (!item) {
            return secureJsonResponse({ error: "Vacancy not found" }, 404);
        }

        return secureJsonResponse({ item });
    } catch (error) {
        return secureErrorResponse("Failed to fetch vacancy", 500, error as Error);
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const security = await secureApiEndpoint(request, {
        requireAuth: true,
        requiredPermission: "jobs.vacancies.manage",
        rateLimit: { limit: 30, windowMs: 60_000 },
        allowedContentTypes: ["application/json"],
        maxBodySize: 120 * 1024,
        checkAnomalies: true,
        auditAccess: true,
    });

    if (security.error) {
        return security.error;
    }

    try {
        const userId = security.session!.user.id;
        const { id } = await params;
        const payload = updateVacancySchema.parse(security.body || {});

        const exists = await prisma.jobVacancy.findFirst({
            where: {
                id,
                userId,
            },
            select: {
                id: true,
            },
        });

        if (!exists) {
            return secureJsonResponse({ error: "Vacancy not found" }, 404);
        }

        const updateData: Record<string, unknown> = {
            ...(payload.sourceExternalId !== undefined && {
                sourceExternalId: payload.sourceExternalId ? cleanText(payload.sourceExternalId, 180) : null,
            }),
            ...(payload.sourceUrl !== undefined && { sourceUrl: payload.sourceUrl || null }),
            ...(payload.title !== undefined && { title: cleanText(payload.title, 260) }),
            ...(payload.company !== undefined && { company: cleanText(payload.company, 260) }),
            ...(payload.location !== undefined && { location: payload.location ? cleanText(payload.location, 260) : null }),
            ...(payload.employmentType !== undefined && { employmentType: payload.employmentType }),
            ...(payload.workMode !== undefined && { workMode: payload.workMode }),
            ...(payload.salaryRange !== undefined && { salaryRange: payload.salaryRange ? cleanText(payload.salaryRange, 140) : null }),
            ...(payload.postedAt !== undefined && {
                postedAt: payload.postedAt ? new Date(payload.postedAt) : null,
            }),
            ...(payload.expiresAt !== undefined && {
                expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
            }),
            ...(payload.description !== undefined && { description: payload.description.trim() }),
            ...(payload.isActive !== undefined && { isActive: payload.isActive }),
            ...(payload.metadata !== undefined && { metadata: payload.metadata || null }),
        };

        if (Object.keys(updateData).length === 0) {
            return secureJsonResponse({ error: "No fields to update" }, 400);
        }

        const titleForSearch = (updateData.title as string | undefined) || undefined;
        const companyForSearch = (updateData.company as string | undefined) || undefined;
        const descriptionForSearch = (updateData.description as string | undefined) || undefined;

        if (titleForSearch || companyForSearch || descriptionForSearch) {
            const current = await prisma.jobVacancy.findUnique({
                where: { id },
                select: { title: true, company: true, description: true },
            });

            if (current) {
                updateData.normalizedText = normalizeForSearch([
                    titleForSearch || current.title,
                    companyForSearch || current.company,
                    descriptionForSearch || current.description,
                ].join(" "));
            }
        }

        const item = await prisma.jobVacancy.update({
            where: { id },
            data: updateData,
        });

        await createAuditLog({
            action: "jobs.vacancy.updated",
            category: "users",
            userId,
            targetId: id,
            targetType: "jobVacancy",
            metadata: {
                updatedFields: Object.keys(updateData),
            },
            ipAddress: security.context.ipAddress,
            userAgent: security.context.userAgent,
        });

        return secureJsonResponse({ item });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return secureJsonResponse({ error: error.issues[0]?.message || "Invalid request body" }, 400);
        }

        return secureErrorResponse("Failed to update vacancy", 500, error as Error);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const security = await secureApiEndpoint(request, {
        requireAuth: true,
        requiredPermission: "jobs.vacancies.manage",
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

        const result = await prisma.jobVacancy.updateMany({
            where: {
                id,
                userId,
            },
            data: {
                isActive: false,
            },
        });

        if (result.count === 0) {
            return secureJsonResponse({ error: "Vacancy not found" }, 404);
        }

        await createAuditLog({
            action: "jobs.vacancy.archived",
            category: "users",
            userId,
            targetId: id,
            targetType: "jobVacancy",
            ipAddress: security.context.ipAddress,
            userAgent: security.context.userAgent,
        });

        return secureJsonResponse({ success: true });
    } catch (error) {
        return secureErrorResponse("Failed to archive vacancy", 500, error as Error);
    }
}
