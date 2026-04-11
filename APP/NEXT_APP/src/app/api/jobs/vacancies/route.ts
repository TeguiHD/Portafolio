import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { secureApiEndpoint, secureJsonResponse, secureErrorResponse } from "@/lib/api-security";
import { createAuditLog } from "@/lib/audit";

const listQuerySchema = z.object({
    search: z.string().max(120).optional(),
    activeOnly: z.enum(["0", "1"]).optional(),
    source: z.enum(["MANUAL", "LINKEDIN", "COMPUTRABAJO", "LABORUM", "FIRSTJOB", "CHILE_EMPLEOS", "INDEED", "OTHER"]).optional(),
});

const createVacancySchema = z.object({
    source: z.enum(["MANUAL", "LINKEDIN", "COMPUTRABAJO", "LABORUM", "FIRSTJOB", "CHILE_EMPLEOS", "INDEED", "OTHER"]).default("MANUAL"),
    sourceExternalId: z.string().max(180).optional(),
    sourceUrl: z.string().url().max(1200).optional(),
    title: z.string().min(3).max(260),
    company: z.string().min(2).max(260),
    location: z.string().max(260).optional(),
    employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN", "FREELANCE", "TEMPORARY", "OTHER"]).default("OTHER"),
    workMode: z.enum(["ONSITE", "HYBRID", "REMOTE", "UNSPECIFIED"]).default("UNSPECIFIED"),
    salaryRange: z.string().max(140).optional(),
    postedAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),
    description: z.string().min(40).max(25000),
    metadata: z.record(z.string(), z.unknown()).optional(),
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

export async function GET(request: NextRequest) {
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
        const url = new URL(request.url);
        const parsed = listQuerySchema.parse({
            search: url.searchParams.get("search") || undefined,
            activeOnly: url.searchParams.get("activeOnly") || undefined,
            source: url.searchParams.get("source") || undefined,
        });

        const userId = security.session!.user.id;
        const where: Prisma.JobVacancyWhereInput = { userId };

        if (parsed.activeOnly !== "0") {
            where.isActive = true;
        }

        if (parsed.source) {
            where.source = parsed.source;
        }

        if (parsed.search) {
            const term = cleanText(parsed.search, 120);
            where.OR = [
                { title: { contains: term, mode: "insensitive" } },
                { company: { contains: term, mode: "insensitive" } },
                { description: { contains: term, mode: "insensitive" } },
            ];
        }

        const items = await prisma.jobVacancy.findMany({
            where,
            include: {
                analyses: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: {
                        id: true,
                        matchScore: true,
                        createdAt: true,
                    },
                },
                _count: {
                    select: {
                        analyses: true,
                        applications: true,
                    },
                },
            },
            orderBy: { updatedAt: "desc" },
            take: 120,
        });

        return secureJsonResponse({ items });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return secureJsonResponse({ error: "Parametros invalidos" }, 400);
        }

        return secureErrorResponse("Error al listar vacantes", 500, error as Error);
    }
}

export async function POST(request: NextRequest) {
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
        const body = createVacancySchema.parse(security.body || {});
        const userId = security.session!.user.id;

        const title = cleanText(body.title, 260);
        const company = cleanText(body.company, 260);
        const description = body.description.trim();

        const vacancy = await prisma.jobVacancy.create({
            data: {
                userId,
                source: body.source,
                sourceExternalId: body.sourceExternalId ? cleanText(body.sourceExternalId, 180) : null,
                sourceUrl: body.sourceUrl || null,
                title,
                company,
                location: body.location ? cleanText(body.location, 260) : null,
                employmentType: body.employmentType,
                workMode: body.workMode,
                salaryRange: body.salaryRange ? cleanText(body.salaryRange, 140) : null,
                postedAt: body.postedAt ? new Date(body.postedAt) : null,
                expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
                description,
                normalizedText: normalizeForSearch([title, company, description].join(" ")),
                metadata: body.metadata
                    ? (body.metadata as Prisma.InputJsonValue)
                    : Prisma.JsonNull,
                isActive: true,
            },
        });

        await createAuditLog({
            action: "jobs.vacancy.created",
            category: "users",
            userId,
            targetId: vacancy.id,
            targetType: "jobVacancy",
            metadata: {
                source: vacancy.source,
                company: vacancy.company,
                title: vacancy.title,
            },
            ipAddress: security.context.ipAddress,
            userAgent: security.context.userAgent,
        });

        return secureJsonResponse({ item: vacancy }, 201);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return secureJsonResponse({ error: error.issues[0]?.message || "Datos invalidos" }, 400);
        }

        return secureErrorResponse("Error al crear vacante", 500, error as Error);
    }
}
