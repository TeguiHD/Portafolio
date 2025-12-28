import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { logFinanceEvent, AuditActions } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createAccountSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    type: z.enum(["CASH", "CHECKING", "SAVINGS", "CREDIT_CARD", "INVESTMENT", "OTHER"]),
    currencyId: z.string().optional(),
    currency: z.string().optional(), // Currency code (CLP, USD, etc.) - resolved to currencyId
    initialBalance: z.number().default(0),
    icon: z.string().optional(),
    color: z.string().optional(),
    isDefault: z.boolean().optional(),
});

// GET - List user accounts
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canView = await hasPermission(session.user.id, session.user.role as Role, "finance.accounts.view");
        if (!canView) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const accounts = await prisma.financeAccount.findMany({
            where: {
                userId: session.user.id,
                isActive: true,
            },
            include: {
                currency: { select: { id: true, code: true, symbol: true, name: true } },
            },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        });

        return NextResponse.json({ data: accounts });
    } catch (error) {
        console.error("Error fetching accounts:", error);
        return NextResponse.json({ error: "Error al obtener cuentas" }, { status: 500 });
    }
}

// POST - Create new account
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Allow account creation with finance.accounts.manage OR finance.view (for onboarding)
        const canCreate = await hasPermission(session.user.id, session.user.role as Role, "finance.accounts.manage");
        const canView = await hasPermission(session.user.id, session.user.role as Role, "finance.view");

        if (!canCreate && !canView) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const body = await request.json();
        // SECURITY: Do not log request body in production

        const data = createAccountSchema.parse(body);

        // Resolve currencyId from currency code if needed
        let currencyId = data.currencyId;
        if (!currencyId && data.currency) {
            const currency = await prisma.currency.findUnique({
                where: { code: data.currency },
            });
            if (!currency) {
                return NextResponse.json({ error: `Moneda ${data.currency} no encontrada` }, { status: 400 });
            }
            currencyId = currency.id;
        }

        // Default to CLP if no currency specified
        if (!currencyId) {
            const defaultCurrency = await prisma.currency.findUnique({
                where: { code: "CLP" },
            });
            if (!defaultCurrency) {
                return NextResponse.json({ error: "Moneda por defecto (CLP) no configurada" }, { status: 500 });
            }
            currencyId = defaultCurrency.id;
        }

        // Check for duplicate name
        const existing = await prisma.financeAccount.findFirst({
            where: { userId: session.user.id, name: data.name, isActive: true },
        });

        if (existing) {
            return NextResponse.json({ error: "Ya existe una cuenta con ese nombre" }, { status: 400 });
        }

        // Check if this should be default (first account or explicitly set)
        const accountCount = await prisma.financeAccount.count({
            where: { userId: session.user.id, isActive: true },
        });
        const isDefault = data.isDefault ?? accountCount === 0;

        const account = await prisma.financeAccount.create({
            data: {
                userId: session.user.id,
                name: data.name,
                type: data.type,
                currencyId: currencyId,
                initialBalance: data.initialBalance,
                currentBalance: data.initialBalance,
                icon: data.icon,
                color: data.color,
                isDefault,
            },
            include: {
                currency: true,
            },
        });

        // Audit log for account creation
        await logFinanceEvent(
            AuditActions.ACCOUNT_CREATED,
            session.user.id,
            "account",
            account.id,
            {
                name: account.name,
                type: account.type,
                currency: account.currency?.code,
                initialBalance: account.initialBalance,
            }
        );

        return NextResponse.json({ data: account }, { status: 201 });
    } catch (error) {
        console.error("Error creating account:", error);
        if (error instanceof z.ZodError) {
            // SECURITY: Only log validation details in development
            if (process.env.NODE_ENV !== 'production') {
                console.error("[Finance Accounts] Zod validation error:", JSON.stringify(error.issues, null, 2));
            }
            return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: "Error al crear cuenta" }, { status: 500 });
    }
}
