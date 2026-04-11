import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { secureApiEndpoint, secureErrorResponse, secureJsonResponse } from "@/lib/api-security";
import { createAuditLog } from "@/lib/audit";
import { buildVacancyAnalysis, type CvSnapshot } from "@/services/job-matching";
import { generateJobCvAiAdaptation, JOB_AI_MODEL_OPTIONS } from "@/services/job-ai-adaptation";

const DEFAULT_AI_PROVIDER = (
    process.env.JOBS_AI_PROVIDER_DEFAULT === "GROQ" ||
    process.env.JOBS_AI_PROVIDER_DEFAULT === "OPENROUTER"
)
    ? process.env.JOBS_AI_PROVIDER_DEFAULT
    : "AUTO";

const analyzeBodySchema = z.object({
    cvVersionId: z.string().cuid().optional(),
    mode: z.enum(["ASSISTED", "AUTO"]).default("ASSISTED"),
    aiProvider: z.enum(["AUTO", "GROQ", "OPENROUTER"]).default(DEFAULT_AI_PROVIDER),
    aiModel: z.string().min(3).max(120).optional(),
    createAdaptation: z.boolean().default(true),
    notes: z.string().max(2000).optional(),
});

type CvVersionWithDetails = Prisma.CvVersionGetPayload<{
    include: {
        skills: { orderBy: { sortOrder: "asc" } };
        experiences: { orderBy: { sortOrder: "asc" } };
        projects: { orderBy: { sortOrder: "asc" } };
        education: { orderBy: { sortOrder: "asc" } };
        certifications: { orderBy: { sortOrder: "asc" } };
        languages: { orderBy: { sortOrder: "asc" } };
    };
}>;

function toCvSnapshot(cv: CvVersionWithDetails): CvSnapshot {
    return {
        title: cv.title,
        summary: cv.summary,
        skills: cv.skills.map((section) => ({
            category: section.category,
            items: section.items,
        })),
        experiences: cv.experiences.map((item) => ({
            description: item.description,
            achievements: item.achievements,
        })),
        projects: cv.projects.map((item) => ({
            description: item.description,
            technologies: item.technologies,
        })),
    };
}

function buildAnalysisSourceText(vacancy: {
    title: string;
    company: string;
    location: string | null;
    description: string;
}) {
    return [
        vacancy.title,
        vacancy.company,
        vacancy.location || "",
        vacancy.description,
    ].join("\n");
}

function buildAutoSummary(baseSummary: string | null, vacancyTitle: string, company: string, matchedSkills: string[]): string {
    const focusSkills = matchedSkills.slice(0, 5).join(", ");
    const generatedBlock = [
        `Target role: ${vacancyTitle} at ${company}.`,
        focusSkills ? `Focus skills already present in CV: ${focusSkills}.` : "Focus on measurable impact from your existing experience.",
    ].join(" ");

    return [baseSummary?.trim(), generatedBlock].filter(Boolean).join("\n\n").slice(0, 6000);
}

function normalizeModelChoice(aiModel?: string): string | undefined {
    if (!aiModel) {
        return undefined;
    }

    const clean = aiModel.trim();
    if (!clean) {
        return undefined;
    }

    // Allow freeform provider model IDs in addition to curated options.
    const fromKnown = JOB_AI_MODEL_OPTIONS.find((item) => item.id === clean);
    return fromKnown ? fromKnown.id : clean.slice(0, 120);
}

async function loadCvVersionForAnalysis(userId: string, cvVersionId?: string): Promise<CvVersionWithDetails | null> {
    const include = {
        skills: { orderBy: { sortOrder: "asc" as const } },
        experiences: { orderBy: { sortOrder: "asc" as const } },
        projects: { orderBy: { sortOrder: "asc" as const } },
        education: { orderBy: { sortOrder: "asc" as const } },
        certifications: { orderBy: { sortOrder: "asc" as const } },
        languages: { orderBy: { sortOrder: "asc" as const } },
    };

    if (cvVersionId) {
        return prisma.cvVersion.findFirst({
            where: { id: cvVersionId, userId },
            include,
        });
    }

    const defaultCv = await prisma.cvVersion.findFirst({
        where: { userId, isDefault: true },
        include,
        orderBy: { updatedAt: "desc" },
    });

    if (defaultCv) {
        return defaultCv;
    }

    return prisma.cvVersion.findFirst({
        where: { userId },
        include,
        orderBy: { updatedAt: "desc" },
    });
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const security = await secureApiEndpoint(request, {
        requireAuth: true,
        requiredPermission: "jobs.matching.run",
        rateLimit: { limit: 30, windowMs: 60_000 },
        allowedContentTypes: ["application/json"],
        maxBodySize: 80 * 1024,
        checkAnomalies: true,
        auditAccess: true,
    });

    if (security.error) {
        return security.error;
    }

    try {
        const { id: vacancyId } = await params;
        const userId = security.session!.user.id;
        const body = analyzeBodySchema.parse(security.body || {});

        const vacancy = await prisma.jobVacancy.findFirst({
            where: {
                id: vacancyId,
                userId,
            },
            select: {
                id: true,
                title: true,
                company: true,
                location: true,
                description: true,
            },
        });

        if (!vacancy) {
            return secureJsonResponse({ error: "Vacancy not found" }, 404);
        }

        const cv = await loadCvVersionForAnalysis(userId, body.cvVersionId);
        if (!cv) {
            return secureJsonResponse({ error: "No CV version available for analysis" }, 404);
        }

        const analysisInput = buildAnalysisSourceText(vacancy);
        const analysisResult = buildVacancyAnalysis(toCvSnapshot(cv), analysisInput);

        const aiResult = await generateJobCvAiAdaptation({
            userId,
            providerPreference: body.aiProvider,
            model: normalizeModelChoice(body.aiModel),
            cv: toCvSnapshot(cv),
            vacancy,
            deterministic: analysisResult,
        });

        const aiPlan = aiResult.plan;

        const transactionResult = await prisma.$transaction(async (tx) => {
            const analysis = await tx.vacancyAnalysis.create({
                data: {
                    userId,
                    vacancyId: vacancy.id,
                    cvVersionId: cv.id,
                    matchScore: analysisResult.matchScore,
                    matchedSkills: analysisResult.matchedSkills,
                    missingSkills: analysisResult.missingSkills,
                    recommendedSkills: analysisResult.recommendedSkills,
                    extractedKeywords: analysisResult.extractedKeywords,
                    summary: analysisResult.summary,
                    recommendations: analysisResult.recommendations,
                    learningPlan: analysisResult.learningPlan,
                },
            });

            if (!body.createAdaptation) {
                return { analysis, adaptation: null, adaptedCvVersion: null };
            }

            if (body.mode === "ASSISTED") {
                const adaptation = await tx.cvVacancyAdaptation.create({
                    data: {
                        vacancyId: vacancy.id,
                        baseCvVersionId: cv.id,
                        mode: "ASSISTED",
                        notes: body.notes || null,
                        appliedChanges: {
                            strategy: "assisted",
                            ai: {
                                used: aiResult.used,
                                provider: aiResult.provider || null,
                                model: aiResult.model || null,
                                error: aiResult.error || null,
                                plan: aiPlan || null,
                            },
                            matchedSkills: analysisResult.matchedSkills,
                            recommendedSkills: analysisResult.recommendedSkills,
                            recommendations: analysisResult.recommendations,
                            learningPlan: analysisResult.learningPlan,
                        } as Prisma.InputJsonValue,
                    },
                });

                return { analysis, adaptation, adaptedCvVersion: null };
            }

            const experiencePatchBySortOrder = new Map(
                (aiPlan?.experiencePatches || []).map((patch) => [patch.sortOrder, patch])
            );
            const projectPatchBySortOrder = new Map(
                (aiPlan?.projectPatches || []).map((patch) => [patch.sortOrder, patch])
            );

            const fallbackSummary = buildAutoSummary(cv.summary, vacancy.title, vacancy.company, analysisResult.matchedSkills);
            const adaptedTitle = aiPlan?.title || cv.title;
            const adaptedSummary = aiPlan?.summary || fallbackSummary;

            const autoCv = await tx.cvVersion.create({
                data: {
                    userId,
                    isDefault: false,
                    name: `${cv.name} (Auto ${vacancy.company})`.slice(0, 180),
                    fullName: cv.fullName,
                    title: adaptedTitle,
                    email: cv.email,
                    phone: cv.phone,
                    location: cv.location,
                    orcid: cv.orcid,
                    linkedin: cv.linkedin,
                    github: cv.github,
                    website: cv.website,
                    summary: adaptedSummary,
                    latexCode: cv.latexCode,
                    pdfUrl: null,
                    experiences: {
                        create: cv.experiences.map((item) => {
                            const patch = experiencePatchBySortOrder.get(item.sortOrder);
                            return {
                                company: item.company,
                                position: item.position,
                                startDate: item.startDate,
                                endDate: item.endDate,
                                isCurrent: item.isCurrent,
                                description: patch?.description || item.description,
                                achievements: patch?.achievements?.length
                                    ? patch.achievements
                                    : item.achievements,
                                sortOrder: item.sortOrder,
                            };
                        }),
                    },
                    education: {
                        create: cv.education.map((item) => ({
                            institution: item.institution,
                            degree: item.degree,
                            field: item.field,
                            startDate: item.startDate,
                            endDate: item.endDate,
                            isCurrent: item.isCurrent,
                            sortOrder: item.sortOrder,
                        })),
                    },
                    skills: {
                        create: cv.skills.map((item) => ({
                            category: item.category,
                            items: item.items,
                            sortOrder: item.sortOrder,
                        })),
                    },
                    projects: {
                        create: cv.projects.map((item) => {
                            const patch = projectPatchBySortOrder.get(item.sortOrder);
                            return {
                                name: item.name,
                                description: patch?.description || item.description,
                                technologies: patch?.technologies?.length
                                    ? patch.technologies
                                    : item.technologies,
                                url: item.url,
                                year: item.year,
                                sortOrder: item.sortOrder,
                            };
                        }),
                    },
                    certifications: {
                        create: cv.certifications.map((item) => ({
                            name: item.name,
                            issuer: item.issuer,
                            year: item.year,
                            url: item.url,
                            sortOrder: item.sortOrder,
                        })),
                    },
                    languages: {
                        create: cv.languages.map((item) => ({
                            language: item.language,
                            level: item.level,
                            sortOrder: item.sortOrder,
                        })),
                    },
                },
                select: {
                    id: true,
                    name: true,
                    updatedAt: true,
                },
            });

            const adaptation = await tx.cvVacancyAdaptation.create({
                data: {
                    vacancyId: vacancy.id,
                    baseCvVersionId: cv.id,
                    adaptedCvVersionId: autoCv.id,
                    mode: "AUTO",
                    notes: body.notes || null,
                    appliedChanges: {
                        strategy: "auto",
                            ai: {
                                used: aiResult.used,
                                provider: aiResult.provider || null,
                                model: aiResult.model || null,
                                error: aiResult.error || null,
                                plan: aiPlan || null,
                            },
                            titleUpdated: adaptedTitle !== cv.title,
                            summaryUpdated: adaptedSummary !== (cv.summary || ""),
                        matchedSkills: analysisResult.matchedSkills,
                        recommendedSkills: analysisResult.recommendedSkills,
                        recommendations: analysisResult.recommendations,
                            learningPlan: analysisResult.learningPlan,
                            keywordHighlights: aiPlan?.keywordHighlights || [],
                            rationale: aiPlan?.rationale || [],
                    } as Prisma.InputJsonValue,
                },
            });

            return {
                analysis,
                adaptation,
                adaptedCvVersion: autoCv,
            };
        });

        await createAuditLog({
            action: "jobs.vacancy.analyzed",
            category: "users",
            userId,
            targetId: vacancy.id,
            targetType: "jobVacancy",
            metadata: {
                cvVersionId: cv.id,
                mode: body.mode,
                createAdaptation: body.createAdaptation,
                matchScore: analysisResult.matchScore,
                aiProvider: aiResult.provider || body.aiProvider,
                aiModel: aiResult.model || body.aiModel || null,
                aiUsed: aiResult.used,
                aiError: aiResult.error || null,
            },
            ipAddress: security.context.ipAddress,
            userAgent: security.context.userAgent,
        });

        return secureJsonResponse({
            vacancy,
            cvVersion: {
                id: cv.id,
                name: cv.name,
                isDefault: cv.isDefault,
            },
            analysis: transactionResult.analysis,
            adaptation: transactionResult.adaptation,
            adaptedCvVersion: transactionResult.adaptedCvVersion,
            ai: {
                used: aiResult.used,
                provider: aiResult.provider || null,
                model: aiResult.model || null,
                error: aiResult.error || null,
                plan: aiPlan || null,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return secureJsonResponse({ error: error.issues[0]?.message || "Invalid request" }, 400);
        }

        return secureErrorResponse("Failed to analyze vacancy", 500, error as Error);
    }
}
