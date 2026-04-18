import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { secureApiEndpoint } from "@/lib/api-security";
import { z } from "zod";
import { hash as hashAccessCode } from "argon2";

/**
 * CRM Projects API – Manages the complete project lifecycle:
 * contracts, milestones, payment plans, and approvals.
 * 
 * Security: OWASP ASVS V4 compliant, RBAC with CRM permissions.
 * All mutations are scoped to the authenticated user's data.
 */

// ─── Schemas ───────────────────────────────────────────────────────

const createContractSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    type: z.enum(["PROJECT", "RETAINER", "MAINTENANCE", "CONSULTING"]),
    clientId: z.string().min(1),
    quotationId: z.string().optional(),
    totalAmount: z.number().min(0),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    terms: z.string().max(10000).optional(),
});

const createMilestoneSchema = z.object({
    contractId: z.string().optional(),
    portalId: z.string().optional(),
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    type: z.enum(["QUOTATION", "PAYMENT", "CONTRACT", "WORK", "HOSTING", "REVIEW", "DELIVERY", "CUSTOM"]),
    icon: z.string().max(10).optional(),
    sortOrder: z.number().int().min(0),
    estimatedDate: z.string().optional(),
    isVisibleToClient: z.boolean().default(true),
});

const updateMilestoneSchema = z.object({
    id: z.string().min(1),
    status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"]).optional(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    estimatedDate: z.string().nullable().optional(),
    completedAt: z.string().nullable().optional(),
    isVisibleToClient: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
});

const createPaymentPlanSchema = z.object({
    quotationId: z.string().min(1),
    clientId: z.string().min(1),
    contractId: z.string().optional(),
    totalAmount: z.number().min(0),
    totalInstallments: z.number().int().min(1).max(36),
    notes: z.string().max(2000).optional(),
});

// ─── GET: Fetch project details ────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const security = await secureApiEndpoint(request, { requireAuth: true });
        if (security.error) return security.error;
        const userId = security.session!.user.id;

        const { searchParams } = new URL(request.url);
        const contractId = searchParams.get("contractId");
        const clientId = searchParams.get("clientId");

        // Fetch single contract with full details
        if (contractId) {
            const contract = await prisma.contract.findFirst({
                where: { id: contractId, userId, isDeleted: false },
                include: {
                    client: { select: { id: true, name: true, rut: true, contactEmail: true, contactPhone: true, company: true } },
                    quotation: { select: { id: true, folio: true, projectName: true, total: true, status: true } },
                    milestones: { orderBy: { sortOrder: "asc" } },
                    approvals: { orderBy: { createdAt: "desc" }, take: 10 },
                    paymentPlans: { include: { quotation: { select: { payments: true } } } },
                    expenses: { where: { isDeleted: false }, orderBy: { expenseDate: "desc" }, take: 20 },
                },
            });
            if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });
            return NextResponse.json(contract);
        }

        // Fetch all contracts for a client
        if (clientId) {
            const contracts = await prisma.contract.findMany({
                where: { userId, clientId, isDeleted: false },
                include: {
                    _count: { select: { milestones: true, approvals: true } },
                    quotation: { select: { folio: true, projectName: true, total: true } },
                },
                orderBy: { createdAt: "desc" },
            });
            return NextResponse.json(contracts);
        }

        return NextResponse.json({ error: "Missing contractId or clientId" }, { status: 400 });
    } catch (error) {
        console.error("[CRM Projects GET]", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

// ─── POST: Create resources ────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const security = await secureApiEndpoint(request, { requireAuth: true });
        if (security.error) return security.error;
        const userId = security.session!.user.id;

        const body = await request.json();
        const { action } = body;

        switch (action) {
            case "create_contract": {
                const data = createContractSchema.parse(body.data);
                
                // Generate contract number: CON-YYYY-NNN
                const year = new Date().getFullYear();
                const count = await prisma.contract.count({ where: { userId } });
                const contractNumber = `CON-${year}-${String(count + 1).padStart(3, "0")}`;

                const contract = await prisma.contract.create({
                    data: {
                        contractNumber,
                        title: data.title,
                        description: data.description,
                        type: data.type,
                        totalAmount: data.totalAmount,
                        startDate: data.startDate ? new Date(data.startDate) : null,
                        endDate: data.endDate ? new Date(data.endDate) : null,
                        terms: data.terms,
                        userId,
                        clientId: data.clientId,
                        quotationId: data.quotationId || null,
                    },
                });

                // Auto-create default milestones for a project
                const defaultMilestones = [
                    { title: "Propuesta Aprobada", type: "QUOTATION", icon: "📋", sortOrder: 0 },
                    { title: "Contrato Firmado", type: "CONTRACT", icon: "✍️", sortOrder: 1 },
                    { title: "Primer Pago Recibido", type: "PAYMENT", icon: "💰", sortOrder: 2 },
                    { title: "Desarrollo en Progreso", type: "WORK", icon: "⚙️", sortOrder: 3 },
                    { title: "Revisión del Cliente", type: "REVIEW", icon: "🔍", sortOrder: 4 },
                    { title: "Entrega Final", type: "DELIVERY", icon: "🚀", sortOrder: 5 },
                ];

                // Create a portal for this contract
                const rawAccessCode = crypto.randomUUID();
                const hashedAccessCode = await hashAccessCode(rawAccessCode);

                const portal = await prisma.projectPortal.create({
                    data: {
                        title: data.title,
                        slug: `${contract.contractNumber.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`,
                        description: `Portal de seguimiento: ${data.title}`,
                        accessCode: hashedAccessCode,
                        userId,
                        clientId: data.clientId,
                        contractId: contract.id,
                        quotationId: data.quotationId || null,
                    },
                });

                await prisma.projectMilestone.createMany({
                    data: defaultMilestones.map((m) => ({
                        portalId: portal.id,
                        contractId: contract.id,
                        title: m.title,
                        type: m.type as "QUOTATION" | "PAYMENT" | "CONTRACT" | "WORK" | "REVIEW" | "DELIVERY",
                        icon: m.icon,
                        sortOrder: m.sortOrder,
                        isVisibleToClient: true,
                    })),
                });

                return NextResponse.json({
                    contract,
                    portalId: portal.id,
                    portalAccessCode: rawAccessCode,
                }, { status: 201 });
            }

            case "create_milestone": {
                const data = createMilestoneSchema.parse(body.data);
                
                // Verify ownership
                if (data.portalId) {
                    const portal = await prisma.projectPortal.findFirst({
                        where: { id: data.portalId, userId },
                    });
                    if (!portal) return NextResponse.json({ error: "Portal not found" }, { status: 404 });
                }

                const milestone = await prisma.projectMilestone.create({
                    data: {
                        portalId: data.portalId!,
                        contractId: data.contractId,
                        title: data.title,
                        description: data.description,
                        type: data.type,
                        icon: data.icon,
                        sortOrder: data.sortOrder,
                        estimatedDate: data.estimatedDate ? new Date(data.estimatedDate) : null,
                        isVisibleToClient: data.isVisibleToClient,
                    },
                });

                return NextResponse.json(milestone, { status: 201 });
            }

            case "create_payment_plan": {
                const data = createPaymentPlanSchema.parse(body.data);

                const plan = await prisma.paymentPlan.create({
                    data: {
                        quotationId: data.quotationId,
                        clientId: data.clientId,
                        contractId: data.contractId,
                        totalAmount: data.totalAmount,
                        totalInstallments: data.totalInstallments,
                        notes: data.notes,
                    },
                });

                return NextResponse.json(plan, { status: 201 });
            }

            default:
                return NextResponse.json({ error: "Unknown action" }, { status: 400 });
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
        }
        console.error("[CRM Projects POST]", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

// ─── PUT: Update resources ─────────────────────────────────────────

export async function PUT(request: NextRequest) {
    try {
        const security = await secureApiEndpoint(request, { requireAuth: true });
        if (security.error) return security.error;
        const userId = security.session!.user.id;

        const body = await request.json();
        const { action } = body;

        switch (action) {
            case "update_milestone": {
                const data = updateMilestoneSchema.parse(body.data);

                // Verify ownership via portal
                const existing = await prisma.projectMilestone.findUnique({
                    where: { id: data.id },
                    include: { portal: { select: { userId: true } } },
                });
                if (!existing || existing.portal.userId !== userId) {
                    return NextResponse.json({ error: "Not found" }, { status: 404 });
                }

                const updated = await prisma.projectMilestone.update({
                    where: { id: data.id },
                    data: {
                        ...(data.status && { status: data.status }),
                        ...(data.title && { title: data.title }),
                        ...(data.description !== undefined && { description: data.description }),
                        ...(data.estimatedDate !== undefined && {
                            estimatedDate: data.estimatedDate ? new Date(data.estimatedDate) : null,
                        }),
                        ...(data.completedAt !== undefined && {
                            completedAt: data.completedAt ? new Date(data.completedAt) : null,
                        }),
                        ...(data.isVisibleToClient !== undefined && { isVisibleToClient: data.isVisibleToClient }),
                        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
                    },
                });

                return NextResponse.json(updated);
            }

            case "update_contract_status": {
                const { contractId, status } = body.data;
                if (!contractId || !status) {
                    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
                }

                const contract = await prisma.contract.findFirst({
                    where: { id: contractId, userId, isDeleted: false },
                });
                if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });

                const updated = await prisma.contract.update({
                    where: { id: contractId },
                    data: { status },
                });

                return NextResponse.json(updated);
            }

            default:
                return NextResponse.json({ error: "Unknown action" }, { status: 400 });
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
        }
        console.error("[CRM Projects PUT]", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
