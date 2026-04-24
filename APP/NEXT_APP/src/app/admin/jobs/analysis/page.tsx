import { requirePagePermission } from "@/lib/page-security";
import { prisma } from "@/lib/prisma";
import AnalysisClient from "./client";
import type { CvVersionOption } from "../types";

export const dynamic = "force-dynamic";

type SearchParams = { vacancyId?: string };

type VacancyLookup = {
    id: string;
    title: string;
    company: string;
    source: string;
    sourceUrl: string | null;
    location: string | null;
    description: string;
};

export type AnalysisSummary = {
    id: string;
    matchScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    recommendedSkills: string[];
    extractedKeywords: string[];
    summary: string | null;
    recommendations: string[];
    learningPlan: string[];
    createdAt: string;
};

export type AdaptationSummary = {
    id: string;
    mode: "ASSISTED" | "AUTO";
    baseCvVersionId: string;
    adaptedCvVersionId: string | null;
    // appliedChanges is a JSON column containing AI plan + extras
    appliedChanges: unknown;
    createdAt: string;
};

export default async function JobsAnalysisPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const session = await requirePagePermission("jobs.vacancies.view");

    const userId = session.user.id;
    const { vacancyId } = await searchParams;

    const [cvVersionsRaw, vacanciesRaw] = await Promise.all([
        prisma.cvVersion.findMany({
            where: { userId },
            select: { id: true, name: true, isDefault: true, updatedAt: true },
            orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
            take: 5,
        }),
        prisma.jobVacancy.findMany({
            where: { userId, isActive: true },
            select: {
                id: true,
                title: true,
                company: true,
                source: true,
                sourceUrl: true,
                location: true,
            },
            orderBy: { updatedAt: "desc" },
            take: 100,
        }),
    ]);

    const cvVersions: CvVersionOption[] = cvVersionsRaw.map((cv) => ({
        id: cv.id,
        name: cv.name,
        isDefault: cv.isDefault,
        updatedAt: cv.updatedAt.toISOString(),
    }));

    const vacancyOptions = vacanciesRaw.map((v) => ({
        id: v.id,
        title: v.title,
        company: v.company,
        source: v.source,
        sourceUrl: v.sourceUrl,
        location: v.location,
    }));

    let selectedVacancy: VacancyLookup | null = null;
    let latestAnalysis: AnalysisSummary | null = null;
    let latestAdaptation: AdaptationSummary | null = null;

    if (vacancyId) {
        const vacancy = await prisma.jobVacancy.findFirst({
            where: { id: vacancyId, userId },
            select: {
                id: true,
                title: true,
                company: true,
                source: true,
                sourceUrl: true,
                location: true,
                description: true,
            },
        });

        if (vacancy) {
            selectedVacancy = vacancy;

            const [analysis, adaptation] = await Promise.all([
                prisma.vacancyAnalysis.findFirst({
                    where: { userId, vacancyId: vacancy.id },
                    orderBy: { createdAt: "desc" },
                }),
                prisma.cvVacancyAdaptation.findFirst({
                    where: { vacancyId: vacancy.id },
                    orderBy: { createdAt: "desc" },
                }),
            ]);

            if (analysis) {
                latestAnalysis = {
                    id: analysis.id,
                    matchScore: analysis.matchScore,
                    matchedSkills: analysis.matchedSkills,
                    missingSkills: analysis.missingSkills,
                    recommendedSkills: analysis.recommendedSkills,
                    extractedKeywords: analysis.extractedKeywords,
                    summary: analysis.summary,
                    recommendations: Array.isArray(analysis.recommendations)
                        ? (analysis.recommendations as unknown as string[]).filter(
                              (item): item is string => typeof item === "string"
                          )
                        : [],
                    learningPlan: analysis.learningPlan,
                    createdAt: analysis.createdAt.toISOString(),
                };
            }

            if (adaptation) {
                latestAdaptation = {
                    id: adaptation.id,
                    mode: adaptation.mode,
                    baseCvVersionId: adaptation.baseCvVersionId,
                    adaptedCvVersionId: adaptation.adaptedCvVersionId,
                    appliedChanges: adaptation.appliedChanges,
                    createdAt: adaptation.createdAt.toISOString(),
                };
            }
        }
    }

    return (
        <AnalysisClient
            cvVersions={cvVersions}
            vacancyOptions={vacancyOptions}
            selectedVacancy={selectedVacancy}
            latestAnalysis={latestAnalysis}
            latestAdaptation={latestAdaptation}
        />
    );
}
