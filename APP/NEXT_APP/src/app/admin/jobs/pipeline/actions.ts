"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permission-check";
import { createAuditLog } from "@/lib/audit";
import type { Role, JobApplicationStatus } from "@/generated/prisma/client";

const ALLOWED_TRANSITIONS: Record<JobApplicationStatus, JobApplicationStatus[]> = {
    PENDING: ["CV_ADAPTED", "CV_SENT", "INTERVIEW", "REJECTED", "CLOSED"],
    CV_ADAPTED: ["CV_SENT", "INTERVIEW", "REJECTED", "CLOSED"],
    CV_SENT: ["INTERVIEW", "REJECTED", "CLOSED"],
    INTERVIEW: ["ACCEPTED", "REJECTED", "CLOSED"],
    ACCEPTED: [],
    REJECTED: [],
    CLOSED: [],
};

type ActionResult = { success: true } | { error: string };

type AuthCheck =
    | { ok: false; error: string }
    | { ok: true; userId: string };

async function assertManagePermission(): Promise<AuthCheck> {
    const session = await auth();
    if (!session?.user?.id) {
        return { ok: false, error: "Unauthorized" };
    }
    const can = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "jobs.applications.manage"
    );
    if (!can) {
        return { ok: false, error: "Forbidden" };
    }
    return { ok: true, userId: session.user.id };
}

export async function moveApplicationStatusAction(
    applicationId: string,
    targetStatus: JobApplicationStatus,
    note?: string,
    closureReason?: string
): Promise<ActionResult> {
    const authCheck = await assertManagePermission();
    if (!authCheck.ok) return { error: authCheck.error };
    const { userId } = authCheck;

    const existing = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId },
        select: { id: true, status: true },
    });
    if (!existing) return { error: "Postulacion no encontrada" };

    if (existing.status === targetStatus) {
        return { error: "La postulacion ya tiene ese estado" };
    }

    const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(targetStatus)) {
        return { error: `Transicion no permitida: ${existing.status} -> ${targetStatus}` };
    }

    if (targetStatus === "CLOSED" && closureReason && closureReason.length > 500) {
        return { error: "Motivo de cierre demasiado largo" };
    }

    try {
        await prisma.$transaction(async (tx) => {
            await tx.jobApplication.update({
                where: { id: applicationId },
                data: {
                    status: targetStatus,
                    lastStatusAt: new Date(),
                    closureReason: targetStatus === "CLOSED" ? closureReason || null : null,
                },
            });

            await tx.jobApplicationEvent.create({
                data: {
                    userId,
                    applicationId,
                    fromStatus: existing.status,
                    toStatus: targetStatus,
                    note: note?.slice(0, 500) || null,
                    metadata: targetStatus === "CLOSED" && closureReason
                        ? { closureReason: closureReason.slice(0, 500) }
                        : undefined,
                },
            });
        });

        await createAuditLog({
            action: "jobs.application.status_changed",
            category: "users",
            userId,
            targetId: applicationId,
            targetType: "jobApplication",
            metadata: {
                fromStatus: existing.status,
                toStatus: targetStatus,
                closureReason: closureReason || null,
            },
        });

        revalidatePath("/admin/jobs/pipeline");
        return { success: true };
    } catch (error) {
        console.error("[pipeline.moveStatus]", error);
        return { error: "No se pudo actualizar el estado" };
    }
}

export async function addApplicationNoteAction(
    applicationId: string,
    note: string
): Promise<ActionResult> {
    const authCheck = await assertManagePermission();
    if (!authCheck.ok) return { error: authCheck.error };
    const { userId } = authCheck;

    const trimmed = note.trim().slice(0, 500);
    if (!trimmed) return { error: "La nota no puede estar vacia" };

    const existing = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId },
        select: { id: true, status: true },
    });
    if (!existing) return { error: "Postulacion no encontrada" };

    try {
        await prisma.jobApplicationEvent.create({
            data: {
                userId,
                applicationId,
                fromStatus: existing.status,
                toStatus: existing.status,
                note: trimmed,
            },
        });

        revalidatePath("/admin/jobs/pipeline");
        return { success: true };
    } catch (error) {
        console.error("[pipeline.addNote]", error);
        return { error: "No se pudo agregar la nota" };
    }
}

export async function deleteApplicationAction(applicationId: string): Promise<ActionResult> {
    const authCheck = await assertManagePermission();
    if (!authCheck.ok) return { error: authCheck.error };
    const { userId } = authCheck;

    const existing = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId },
        select: { id: true },
    });
    if (!existing) return { error: "Postulacion no encontrada" };

    try {
        await prisma.jobApplication.delete({ where: { id: applicationId } });

        await createAuditLog({
            action: "jobs.application.deleted",
            category: "users",
            userId,
            targetId: applicationId,
            targetType: "jobApplication",
        });

        revalidatePath("/admin/jobs/pipeline");
        return { success: true };
    } catch (error) {
        console.error("[pipeline.delete]", error);
        return { error: "No se pudo eliminar la postulacion" };
    }
}
