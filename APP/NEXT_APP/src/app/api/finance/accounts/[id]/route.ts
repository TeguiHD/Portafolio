import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/client";
import { logFinanceEvent, AuditActions } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Editar y borrar una cuenta. La pantalla de cuentas ya llamaba a esta ruta (PUT y DELETE), pero no existía: daba 404.
 * Mismas reglas que crear (finance.accounts.manage o finance.view) y siempre solo sobre las cuentas propias.
 */
const updateSchema = z.object({
    name: z.string().trim().min(1, "El nombre es requerido").max(80).optional(),
    type: z.enum(["CASH", "CHECKING", "SAVINGS", "CREDIT_CARD", "INVESTMENT", "OTHER"]).optional(),
    initialBalance: z.number().finite().optional(),
    icon: z.string().max(16).nullable().optional(),
    color: z.string().max(32).nullable().optional(),
    isDefault: z.boolean().optional(),
});

type Contexto = { params: Promise<{ id: string }> };

async function sesionConPermiso() {
    const session = await auth();
    if (!session?.user) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) } as const;
    const rol = session.user.role as Role;
    const puede = (await hasPermission(session.user.id, rol, "finance.accounts.manage")) || (await hasPermission(session.user.id, rol, "finance.view"));
    if (!puede) return { error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }) } as const;
    return { userId: session.user.id } as const;
}

export async function PUT(request: Request, { params }: Contexto) {
    try {
        const s = await sesionConPermiso();
        if ("error" in s) return s.error;
        const { id } = await params;
        const data = updateSchema.parse(await request.json());

        const cuenta = await prisma.financeAccount.findFirst({ where: { id, userId: s.userId, isActive: true } });
        if (!cuenta) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

        if (data.name && data.name !== cuenta.name) {
            const repetida = await prisma.financeAccount.findFirst({ where: { userId: s.userId, name: data.name, NOT: { id } } });
            if (repetida) return NextResponse.json({ error: "Ya existe una cuenta con ese nombre" }, { status: 400 });
        }

        // Cambiar el saldo inicial corre el saldo actual en la misma diferencia (los movimientos no cambian).
        const delta = data.initialBalance !== undefined ? data.initialBalance - cuenta.initialBalance : 0;
        const actualizada = await prisma.$transaction(async (tx) => {
            if (data.isDefault) await tx.financeAccount.updateMany({ where: { userId: s.userId, NOT: { id } }, data: { isDefault: false } });
            return tx.financeAccount.update({
                where: { id },
                data: {
                    ...(data.name !== undefined ? { name: data.name } : {}),
                    ...(data.type !== undefined ? { type: data.type } : {}),
                    ...(data.icon !== undefined ? { icon: data.icon } : {}),
                    ...(data.color !== undefined ? { color: data.color } : {}),
                    ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
                    ...(data.initialBalance !== undefined ? { initialBalance: data.initialBalance, currentBalance: { increment: delta } } : {}),
                },
                include: { currency: true },
            });
        });

        await logFinanceEvent(AuditActions.ACCOUNT_UPDATED, s.userId, "account", id, { cambios: Object.keys(data) });
        return NextResponse.json({ data: actualizada });
    } catch (error) {
        if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
        console.error("Error updating account:", error);
        return NextResponse.json({ error: "Error al actualizar la cuenta" }, { status: 500 });
    }
}

export async function DELETE(_request: Request, { params }: Contexto) {
    try {
        const s = await sesionConPermiso();
        if ("error" in s) return s.error;
        const { id } = await params;

        const cuenta = await prisma.financeAccount.findFirst({ where: { id, userId: s.userId, isActive: true } });
        if (!cuenta) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

        // Borrado suave: los movimientos se conservan. El nombre se libera (la base exige nombres únicos por usuario).
        await prisma.$transaction(async (tx) => {
            await tx.financeAccount.update({
                where: { id },
                data: { isActive: false, isDefault: false, name: `${cuenta.name.slice(0, 60)} · eliminada ${Date.now().toString(36)}` },
            });
            if (cuenta.isDefault) {
                const otra = await tx.financeAccount.findFirst({ where: { userId: s.userId, isActive: true }, orderBy: { createdAt: "asc" } });
                if (otra) await tx.financeAccount.update({ where: { id: otra.id }, data: { isDefault: true } });
            }
        });

        await logFinanceEvent(AuditActions.ACCOUNT_DELETED, s.userId, "account", id, { name: cuenta.name });
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error deleting account:", error);
        return NextResponse.json({ error: "Error al eliminar la cuenta" }, { status: 500 });
    }
}
