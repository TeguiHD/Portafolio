import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { secureApiEndpoint, secureErrorResponse, secureJsonResponse } from "@/lib/api-security";
import { createAuditLog } from "@/lib/audit";
import { scrapeVacancyFromUrl } from "@/services/job-scraper";

const importBodySchema = z.object({
    url: z.string().url().max(2000),
    forceCreate: z.boolean().default(false),
});

function normalizeForSearch(value: string): string {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function mapScrapeErrorToMessage(errorCode: string): string {
    switch (errorCode) {
        case "INVALID_URL":
            return "Invalid URL";
        case "INVALID_PROTOCOL":
            return "Only HTTP/HTTPS URLs are supported";
        case "HTTPS_REQUIRED":
            return "HTTPS URL is required";
        case "BLOCKED_HOST":
            return "Blocked or private host";
        case "UNSUPPORTED_SOURCE":
            return "Source host is not supported";
        case "NON_STANDARD_PORT":
            return "URL port is not allowed";
        case "SCRAPE_TIMEOUT":
            return "Fetching vacancy timed out";
        case "SCRAPE_UNSUPPORTED_CONTENT_TYPE":
            return "Source page is not HTML";
        case "SCRAPE_HTML_TOO_LARGE":
            return "Source page is too large";
        case "INVALID_SCRAPED_TITLE":
        case "INVALID_SCRAPED_DESCRIPTION":
            return "Could not extract enough vacancy details from source";
        default:
            if (errorCode.startsWith("SCRAPE_HTTP_")) {
                return `Source returned HTTP ${errorCode.replace("SCRAPE_HTTP_", "")}`;
            }
            return "Failed to import vacancy from URL";
    }
}

export async function POST(request: NextRequest) {
    const security = await secureApiEndpoint(request, {
        requireAuth: true,
        requiredPermission: "jobs.vacancies.manage",
        rateLimit: { limit: 15, windowMs: 60_000 },
        allowedContentTypes: ["application/json"],
        maxBodySize: 30 * 1024,
        checkAnomalies: true,
        auditAccess: true,
    });

    if (security.error) {
        return security.error;
    }

    try {
        const body = importBodySchema.parse(security.body || {});
        const userId = security.session!.user.id;

        const scraped = await scrapeVacancyFromUrl(body.url);

        if (scraped.sourceExternalId && !body.forceCreate) {
            const existing = await prisma.jobVacancy.findFirst({
                where: {
                    userId,
                    source: scraped.source,
                    sourceExternalId: scraped.sourceExternalId,
                },
                select: {
                    id: true,
                    title: true,
                    company: true,
                    updatedAt: true,
                },
            });

            if (existing) {
                return secureJsonResponse({
                    error: "Vacancy already imported",
                    existing,
                }, 409);
            }
        }

        const item = await prisma.jobVacancy.create({
            data: {
                userId,
                source: scraped.source,
                sourceExternalId: scraped.sourceExternalId,
                sourceUrl: scraped.sourceUrl,
                title: scraped.title,
                company: scraped.company,
                location: scraped.location,
                description: scraped.description,
                normalizedText: normalizeForSearch([
                    scraped.title,
                    scraped.company,
                    scraped.description,
                ].join(" ")),
                metadata: scraped.metadata as Prisma.InputJsonValue,
                isActive: true,
                lastSyncedAt: new Date(),
            },
            include: {
                _count: {
                    select: {
                        analyses: true,
                        applications: true,
                    },
                },
            },
        });

        await createAuditLog({
            action: "jobs.vacancy.imported",
            category: "users",
            userId,
            targetId: item.id,
            targetType: "jobVacancy",
            metadata: {
                source: item.source,
                sourceExternalId: item.sourceExternalId,
                sourceUrl: item.sourceUrl,
            },
            ipAddress: security.context.ipAddress,
            userAgent: security.context.userAgent,
        });

        return secureJsonResponse({ item }, 201);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return secureJsonResponse({ error: error.issues[0]?.message || "Invalid request body" }, 400);
        }

        const message = error instanceof Error ? mapScrapeErrorToMessage(error.message) : "Failed to import vacancy";
        if (message !== "Failed to import vacancy") {
            return secureJsonResponse({ error: message }, 400);
        }

        return secureErrorResponse("Failed to import vacancy", 500, error as Error);
    }
}
