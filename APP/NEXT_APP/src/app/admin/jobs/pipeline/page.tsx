import { verifyAdmin } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PipelineClient from "./client";
import type { ApplicationItem } from "../types";

export const dynamic = "force-dynamic";

export default async function JobsPipelinePage() {
    const session = await verifyAdmin();

    const canView = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "jobs.applications.view"
    );
    if (!canView) redirect("/admin/jobs");

    const userId = session.user.id;

    const applicationsRaw = await prisma.jobApplication.findMany({
        where: { userId },
        include: {
            vacancy: {
                select: { id: true, title: true, company: true, sourceUrl: true, source: true  },
            },
            analysis: {
                select: { id: true, matchScore: true, missingSkills: true },
            },
            adaptation: {
                select: { id: true, mode: true },
            },
            cvVersion: {
                select: { id: true, name: true },
            },
            events: {
                orderBy: { createdAt: "desc" },
                take: 20,
                select: {
                    id: true,
                    fromStatus: true,
                    toStatus: true,
                    note: true,
                    createdAt: true,
                },
            },
        },
        orderBy: { lastStatusAt: "desc" },
        take: 200,
    });

    const applications: ApplicationItem[] = applicationsRaw.map((app) => ({
        id: app.id,
        status: app.status,
        company: app.company,
        roleTitle: app.roleTitle,
        notes: app.notes,
        sourceUrl: app.sourceUrl,
        lastStatusAt: app.lastStatusAt.toISOString(),
        appliedAt: app.appliedAt?.toISOString() || null,
        vacancy: {
            id: app.vacancy.id,
            title: app.vacancy.title,
            company: app.vacancy.company,
            sourceUrl: app.vacancy.sourceUrl,
            source: app.vacancy.source,
        },
        analysis: app.analysis
            ? {
                  id: app.analysis.id,
                  matchScore: app.analysis.matchScore,
                  missingSkills: app.analysis.missingSkills,
              }
            : null,
        adaptation: app.adaptation
            ? { id: app.adaptation.id, mode: app.adaptation.mode }
            : null,
        cvVersion: app.cvVersion
            ? { id: app.cvVersion.id, name: app.cvVersion.name }
            : null,
        events: app.events.map((e) => ({
            id: e.id,
            fromStatus: e.fromStatus,
            toStatus: e.toStatus,
            note: e.note,
            createdAt: e.createdAt.toISOString(),
        })),
    }));

    return <PipelineClient initialApplications={applications} />;
}
