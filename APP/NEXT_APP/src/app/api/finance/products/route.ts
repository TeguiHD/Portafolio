import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const querySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    search: z.string().optional(),
    sortBy: z.enum(["name", "purchaseCount", "lastPurchased", "avgPrice"]).default("purchaseCount"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    category: z.string().optional(),
});

// GET - List products in user's catalog
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canView = await hasPermission(session.user.id, session.user.role as Role, "finance.view");
        if (!canView) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const params = querySchema.parse(Object.fromEntries(searchParams));

        const where: any = {
            userId: session.user.id,
        };

        if (params.search) {
            where.OR = [
                { name: { contains: params.search, mode: "insensitive" } },
                { category: { contains: params.search, mode: "insensitive" } },
            ];
        }

        if (params.category) {
            where.category = params.category;
        }

        const total = await prisma.product.count({ where });

        const products = await prisma.product.findMany({
            where,
            orderBy: { [params.sortBy]: params.sortOrder },
            skip: (params.page - 1) * params.limit,
            take: params.limit,
            include: {
                items: {
                    take: 5,
                    orderBy: { createdAt: "desc" },
                    include: {
                        transaction: {
                            select: {
                                id: true,
                                merchant: true,
                                transactionDate: true,
                            },
                        },
                    },
                },
            },
        });

        // Get category distribution
        const categories = await prisma.product.groupBy({
            by: ["category"],
            where: { userId: session.user.id, category: { not: null } },
            _count: true,
        });

        // Get stats
        const statsAggregate = await prisma.product.aggregate({
            where: { userId: session.user.id },
            _avg: { avgPrice: true },
        });
        
        const totalProducts = await prisma.product.count({
            where: { userId: session.user.id },
        });

        return NextResponse.json({
            data: products,
            pagination: {
                page: params.page,
                limit: params.limit,
                total,
                totalPages: Math.ceil(total / params.limit),
            },
            categories: categories.map((c: { category: string | null; _count: number }) => ({
                category: c.category || "Sin categoría",
                count: c._count,
            })),
            stats: {
                totalProducts: totalProducts,
                avgPrice: statsAggregate._avg.avgPrice,
            },
        });
    } catch (error) {
        console.error("[Products GET] Error:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
        }
        return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 });
    }
}

// PUT - Update product details
export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canManage = await hasPermission(session.user.id, session.user.role as Role, "finance.manage");
        if (!canManage) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const body = await request.json();
        const { id, category, name } = body;

        if (!id) {
            return NextResponse.json({ error: "ID de producto requerido" }, { status: 400 });
        }

        // Verify product belongs to user
        const product = await prisma.product.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!product) {
            return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
        }

        const updated = await prisma.product.update({
            where: { id },
            data: {
                category: category !== undefined ? category : undefined,
                name: name !== undefined ? name : undefined,
                normalizedName: name !== undefined ? name.toLowerCase().trim() : undefined,
            },
        });

        return NextResponse.json({ data: updated });
    } catch (error) {
        console.error("[Products PUT] Error:", error);
        return NextResponse.json({ error: "Error al actualizar producto" }, { status: 500 });
    }
}

// DELETE - Remove product from catalog
export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canManage = await hasPermission(session.user.id, session.user.role as Role, "finance.manage");
        if (!canManage) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID de producto requerido" }, { status: 400 });
        }

        // Verify product belongs to user
        const product = await prisma.product.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!product) {
            return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
        }

        await prisma.product.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Products DELETE] Error:", error);
        return NextResponse.json({ error: "Error al eliminar producto" }, { status: 500 });
    }
}
