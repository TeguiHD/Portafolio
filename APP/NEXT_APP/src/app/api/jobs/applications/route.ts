import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { secureApiEndpoint, secureErrorResponse, secureJsonResponse } from "@/lib/api-security";
import { createAuditLog } from "@/lib/audit";

const listQuerySchema = z.object({
    status: z.enum(["PENDING", "INTERVIEW", "CLOSED"]).optional(),
    vacancyId: z.string().cuid().optional(),
    search: z.string().max(120).optional(),
});

const createApplicationSchema = z.object({
    vacancyId: z.string().cuid(),
    analysisId: z.string().cuid().optional(),
    adaptationId: z.string().cuid().optional(),
    cvVersionId: z.string().cuid().optional(),
    status: z.enum(["PENDING", "INTERVIEW", "CLOSED"]).default("PENDING"),
    company: z.string().max(260).optional(),
    roleTitle: z.string().max(260).optional(),
    sourceUrl: z.string().url().max(1200).optional(),
    notes: z.string().max(4000).optional(),
    appliedAt: z.string().datetime().optional(),
    eventNote: z.string().max(500).optional(),
});

function cleanText(value: string, max: number): string {
    return value.trim().replace(/\s+/g, " ").slice(0, max);
}

export async function GET(request: NextRequest) {
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
        const url = new URL(request.url);
        const parsed = listQuerySchema.parse({
            status: url.searchParams.get("status") || undefined,
            vacancyId: url.searchParams.get("vacancyId") || undefined,
            search: url.searchParams.get("search") || undefined,
        });

        const userId = security.session!.user.id;
        const where: Prisma.JobApplicationWhereInput = { userId };

        if (parsed.status) {
            where.status = parsed.status;
        }

        if (parsed.vacancyId) {
            where.vacancyId = parsed.vacancyId;
        }

        if (parsed.search) {
            const term = cleanText(parsed.search, 120);
            where.OR = [
                { roleTitle: { contains: term, mode: "insensitive" } },
                { company: { contains: term, mode: "insensitive" } },
                { vacancy: { title: { contains: term, mode: "insensitive" } } },
                { vacancy: { company: { contains: term, mode: "insensitive" } } },
            ];
        }

        const items = await prisma.jobApplication.findMany({
            where,
            include: {
                vacancy: {
                    select: {
                        id: true,
                        source: true,
                        sourceUrl: true,
                        title: true,
                        company: true,
                        location: true,
                        workMode: true,
                        employmentType: true,
                        isActive: true,
                    },
                },
                analysis: {
                    select: {
                        id: true,
                        matchScore: true,
                        missingSkills: true,
                        createdAt: true,
                    },
                },
                adaptation: {
                    select: {
                        id: true,
                        mode: true,
                        adaptedCvVersionId: true,
                        createdAt: true,
                    },
                },
                cvVersion: {
                    select: {
                        id: true,
                        name: true,
                        updatedAt: true,
                    },
                },
                events: {
                    orderBy: { createdAt: "desc" },
                    take: 10,
                },
            },
            orderBy: { lastStatusAt: "desc" },
            take: 200,
        });

        return secureJsonResponse({ items });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return secureJsonResponse({ error: "Invalid query parameters" }, 400);
        }

        return secureErrorResponse("Failed to list applications", 500, error as Error);
    }
}

export async function POST(request: NextRequest) {
    const security = await secureApiEndpoint(request, {
        requireAuth: true,
        requiredPermission: "jobs.applications.manage",
        rateLimit: { limit: 30, windowMs: 60_000 },
        allowedContentTypes: ["application/json"],
        maxBodySize: 100 * 1024,
        checkAnomalies: true,
        auditAccess: true,
    });

    if (security.error) {
        return security.error;
    }

    try {
        const body = createApplicationSchema.parse(security.body || {});
        const userId = security.session!.user.id;

        const vacancy = await prisma.jobVacancy.findFirst({
            where: {
                id: body.vacancyId,
                userId,
            },
            select: {
                id: true,
                title: true,
                company: true,
                sourceUrl: true,
            },
        });

        if (!vacancy) {
            return secureJsonResponse({ error: "Vacancy not found" }, 404);
        }

        if (body.analysisId) {
            const analysis = await prisma.vacancyAnalysis.findFirst({
                where: {
                    id: body.analysisId,
                    userId,
                    vacancyId: body.vacancyId,
                },
                select: { id: true },
            });

            if (!analysis) {
                return secureJsonResponse({ error: "Analysis not found for this vacancy" }, 400);
            }
        }

        if (body.adaptationId) {
            const adaptation = await prisma.cvVacancyAdaptation.findFirst({
                where: {
                    id: body.adaptationId,
                    vacancyId: body.vacancyId,
                },
                select: { id: true },
            });

            if (!adaptation) {
                return secureJsonResponse({ error: "Adaptation not found for this vacancy" }, 400);
            }
        }

        if (body.cvVersionId) {
            const cv = await prisma.cvVersion.findFirst({
                where: {
                    id: body.cvVersionId,
                    userId,
                },
                select: { id: true },
            });

            if (!cv) {
                return secureJsonResponse({ error: "CV version not found" }, 400);
            }
        }

        const txResult = await prisma.$transaction(async (tx) => {
            const application = await tx.jobApplication.create({
                data: {
                    userId,
                    vacancyId: body.vacancyId,
                    analysisId: body.analysisId || null,
                    adaptationId: body.adaptationId || null,
                    cvVersionId: body.cvVersionId || null,
                    status: body.status,
                    company: body.company ? cleanText(body.company, 260) : vacancy.company,
                    roleTitle: body.roleTitle ? cleanText(body.roleTitle, 260) : vacancy.title,
                    sourceUrl: body.sourceUrl || vacancy.sourceUrl || null,
                    notes: body.notes?.trim() || null,
                    appliedAt: body.appliedAt ? new Date(body.appliedAt) : new Date(),
                    lastStatusAt: new Date(),
                },
                include: {
                    vacancy: {
                        select: {
                            id: true,
                            title: true,
                            company: true,
                            sourceUrl: true,
                        },
                    },
                    analysis: {
                        select: {
                            id: true,
                            matchScore: true,
                            missingSkills: true,
                        },
                    },
                    adaptation: {
                        select: {
                            id: true,
                            mode: true,
                            adaptedCvVersionId: true,
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

            const initialEvent = await tx.jobApplicationEvent.create({
                data: {
                    userId,
                    applicationId: application.id,
                    fromStatus: null,
                    toStatus: body.status,
                    note: body.eventNote?.trim() || "Application created",
                    metadata: {
                        source: "jobs.applications.create",
                        analysisId: body.analysisId || null,
                        adaptationId: body.adaptationId || null,
                    } as Prisma.InputJsonValue,
                },
            });

            return { application, initialEvent };
        });

        await createAuditLog({
            action: "jobs.application.created",
            category: "users",
            userId,
            targetId: txResult.application.id,
            targetType: "jobApplication",
            metadata: {
                vacancyId: body.vacancyId,
                status: body.status,
                analysisId: body.analysisId || null,
                adaptationId: body.adaptationId || null,
                cvVersionId: body.cvVersionId || null,
            },
            ipAddress: security.context.ipAddress,
            userAgent: security.context.userAgent,
        });

        return secureJsonResponse({
            item: txResult.application,
            initialEvent: txResult.initialEvent,
        }, 201);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return secureJsonResponse({ error: error.issues[0]?.message || "Invalid request body" }, 400);
        }

        return secureErrorResponse("Failed to create application", 500, error as Error);
    }
}
