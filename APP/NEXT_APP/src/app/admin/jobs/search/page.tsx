import { verifyAdmin } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SearchClient from "./client";
import type { CvVersionOption, VacancyItem } from "../types";

export const dynamic = "force-dynamic";

export default async function JobsSearchPage() {
    const session = await verifyAdmin();

    const canView = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "jobs.vacancies.view"
    );
    if (!canView) redirect("/admin/jobs");

    const userId = session.user.id;

    const [vacanciesRaw, cvVersionsRaw] = await Promise.all([
        prisma.jobVacancy.findMany({
            where: { userId, isActive: true },
            include: {
                analyses: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: { id: true, matchScore: true, createdAt: true },
                },
                _count: { select: { analyses: true, applications: true } },
            },
            orderBy: { updatedAt: "desc" },
            take: 120,
        }),
        prisma.cvVersion.findMany({
            where: { userId },
            select: { id: true, name: true, isDefault: true, updatedAt: true },
            orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
            take: 5,
        }),
    ]);

    const vacancies: VacancyItem[] = vacanciesRaw.map((v) => ({
        id: v.id,
        source: v.source,
        sourceUrl: v.sourceUrl,
        title: v.title,
        company: v.company,
        location: v.location,
        isActive: v.isActive,
        updatedAt: v.updatedAt.toISOString(),
        analyses: v.analyses.map((a) => ({
            id: a.id,
            matchScore: a.matchScore,
            createdAt: a.createdAt.toISOString(),
        })),
        _count: v._count,
    }));

    const cvVersions: CvVersionOption[] = cvVersionsRaw.map((cv) => ({
        id: cv.id,
        name: cv.name,
        isDefault: cv.isDefault,
        updatedAt: cv.updatedAt.toISOString(),
    }));

    return <SearchClient initialVacancies={vacancies} cvVersions={cvVersions} />;
}
