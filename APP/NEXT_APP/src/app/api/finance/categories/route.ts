import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import { Prisma, type Role } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET - List categories (global + user's custom)
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canView = await hasPermission(session.user.id, session.user.role as Role, "finance.view");
        if (!canView) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type"); // INCOME or EXPENSE

        const where: Prisma.FinanceCategoryWhereInput = {
            isActive: true,
            OR: [
                { userId: null }, // Global/system categories
                { userId: session.user.id },
            ],
        };

        if (type === "INCOME" || type === "EXPENSE") {
            where.type = type;
        }

        const categories = await prisma.financeCategory.findMany({
            where,
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: {
                id: true,
                name: true,
                icon: true,
                color: true,
                type: true,
                userId: true, // null = global, otherwise user-specific
                parentId: true,
            },
        });

        return NextResponse.json({ data: categories });
    } catch (error) {
        console.error("Error fetching categories:", error);
        return NextResponse.json({ error: "Error al obtener categorías" }, { status: 500 });
    }
}

// POST - Create custom category
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canCreate = await hasPermission(session.user.id, session.user.role as Role, "finance.categories.manage");
        if (!canCreate) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const body = await request.json();
        const { name, icon, color, type, parentId, keywords } = body;

        if (!name || !type) {
            return NextResponse.json({ error: "Nombre y tipo son requeridos" }, { status: 400 });
        }

        // Check for duplicate name (user's own categories only)
        const existing = await prisma.financeCategory.findFirst({
            where: { userId: session.user.id, name, type, isActive: true },
        });

        if (existing) {
            return NextResponse.json({ error: "Ya existe una categoría con ese nombre" }, { status: 400 });
        }

        const category = await prisma.financeCategory.create({
            data: {
                userId: session.user.id,
                name,
                icon: icon || "💰",
                color,
                type,
                parentId,
                keywords: keywords || [],
            },
        });

        return NextResponse.json({ data: category }, { status: 201 });
    } catch (error) {
        console.error("Error creating category:", error);
        return NextResponse.json({ error: "Error al crear categoría" }, { status: 500 });
    }
}
