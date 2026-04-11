import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    // Verify the CV version belongs to this user
    const cv = await prisma.cvVersion.findFirst({
        where: { id, userId },
        select: { id: true },
    });
    if (!cv) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [analyses, adaptations] = await Promise.all([
        prisma.vacancyAnalysis.findMany({
            where: { cvVersionId: id, userId },
            select: {
                matchScore: true,
                vacancy: { select: { title: true, company: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
        }),
        prisma.cvVacancyAdaptation.count({
            where: { baseCvVersionId: id },
        }),
    ]);

    const analysisCount = analyses.length;
    const adaptationCount = adaptations;
    const avgMatchScore =
        analysisCount > 0
            ? analyses.reduce((sum, a) => sum + a.matchScore, 0) / analysisCount
            : null;
    const latestAnalysisVacancy =
        analyses[0] ? `${analyses[0].vacancy.title} · ${analyses[0].vacancy.company}` : null;

    return NextResponse.json({
        analysisCount,
        adaptationCount,
        avgMatchScore,
        latestAnalysisVacancy,
    });
}
