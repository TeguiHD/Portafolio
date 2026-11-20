import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/client";
import { logFinanceEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Editar y borrar una categoría propia. La pantalla ya llamaba a esta ruta y daba 404.
 * Las categorías globales (sin dueño) no se tocan desde aquí.
 */
const updateSchema = z.object({
    name: z.string().trim().min(1, "El nombre es requerido").max(60).optional(),
    icon: z.string().max(16).optional(),
    color: z.string().max(32).nullable().optional(),
    type: z.enum(["INCOME", "EXPENSE"]).optional(),
    keywords: z.array(z.string().max(40)).max(50).optional(),
});

type Contexto = { params: Promise<{ id: string }> };

async function propia(id: string) {
    const session = await auth();
    if (!session?.user) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) } as const;
    if (!(await hasPermission(session.user.id, session.user.role as Role, "finance.categories.manage"))) {
        return { error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }) } as const;
    }
    const categoria = await prisma.financeCategory.findFirst({ where: { id, isActive: true } });
    if (!categoria) return { error: NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 }) } as const;
    if (categoria.userId !== session.user.id) return { error: NextResponse.json({ error: "Las categorías del sistema no se pueden modificar" }, { status: 403 }) } as const;
    return { userId: session.user.id, categoria } as const;
}

export async function PUT(request: Request, { params }: Contexto) {
    try {
        const { id } = await params;
        const r = await propia(id);
        if ("error" in r) return r.error;
        const data = updateSchema.parse(await request.json());
        const nombre = data.name ?? r.categoria.name, tipo = data.type ?? r.categoria.type;
        if (nombre !== r.categoria.name || tipo !== r.categoria.type) {
            const repetida = await prisma.financeCategory.findFirst({ where: { userId: r.userId, name: nombre, type: tipo, NOT: { id } } });
            if (repetida) return NextResponse.json({ error: "Ya existe una categoría con ese nombre" }, { status: 400 });
        }
        const actualizada = await prisma.financeCategory.update({ where: { id }, data });
        await logFinanceEvent("finance.category.updated", r.userId, "category", id, { cambios: Object.keys(data) });
        return NextResponse.json({ data: actualizada });
    } catch (error) {
        if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
        console.error("Error updating category:", error);
        return NextResponse.json({ error: "Error al actualizar la categoría" }, { status: 500 });
    }
}

export async function DELETE(_request: Request, { params }: Contexto) {
    try {
        const { id } = await params;
        const r = await propia(id);
        if ("error" in r) return r.error;
        // Borrado suave: los movimientos ya clasificados la conservan. Se libera el nombre (único por usuario y tipo).
        await prisma.financeCategory.update({ where: { id }, data: { isActive: false, name: `${r.categoria.name.slice(0, 40)} · eliminada ${Date.now().toString(36)}` } });
        await logFinanceEvent("finance.category.deleted", r.userId, "category", id, { name: r.categoria.name });
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error deleting category:", error);
        return NextResponse.json({ error: "Error al eliminar la categoría" }, { status: 500 });
    }
}
