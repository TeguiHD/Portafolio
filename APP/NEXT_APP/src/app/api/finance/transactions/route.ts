import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import { convertCurrency, type SupportedCurrency } from "@/services/exchange-rate";
import { z } from "zod";
import { Prisma, type Role } from "@prisma/client";
import { logFinanceEvent, AuditActions } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Validation schema
const transactionItemSchema = z.object({
    description: z.string().max(200),
    quantity: z.number().positive().default(1),
    unitPrice: z.number().min(0),
    totalPrice: z.number().min(0),
});

const createTransactionSchema = z.object({
    type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
    amount: z.number().positive("El monto debe ser positivo"),
    description: z.string().optional(),
    merchant: z.string().optional(),
    notes: z.string().optional(),
    categoryId: z.string().optional(),
    accountId: z.string(),
    toAccountId: z.string().optional(),
    currencyId: z.string(),
    transactionDate: z.string().transform(s => new Date(s)),
    receiptId: z.string().optional(),
    source: z.string().default("manual"),
    // Document identification from OCR
    documentType: z.enum(["boleta", "factura", "ticket", "unknown"]).optional(),
    documentNumber: z.string().max(50).optional(),
    merchantRut: z.string().max(15).optional(),
    // Line items
    items: z.array(transactionItemSchema).optional(),
});

const querySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).optional(),
    categoryId: z.string().optional(),
    accountId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.enum(["transactionDate", "amount", "createdAt"]).default("transactionDate"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// GET - List transactions with filters and pagination
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canView = await hasPermission(session.user.id, session.user.role as Role, "finance.transactions.view");
        if (!canView) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const params = querySchema.parse(Object.fromEntries(searchParams));

        const where: Prisma.TransactionWhereInput = {
            userId: session.user.id,
            isDeleted: false,
        };

        // Apply filters
        if (params.type) where.type = params.type;
        if (params.categoryId) where.categoryId = params.categoryId;
        if (params.accountId) where.accountId = params.accountId;

        if (params.startDate || params.endDate) {
            where.transactionDate = {};
            if (params.startDate) where.transactionDate.gte = new Date(params.startDate);
            if (params.endDate) where.transactionDate.lte = new Date(params.endDate);
        }

        if (params.search) {
            where.OR = [
                { description: { contains: params.search, mode: "insensitive" } },
                { merchant: { contains: params.search, mode: "insensitive" } },
                { notes: { contains: params.search, mode: "insensitive" } },
            ];
        }

        // Get total count for pagination
        const total = await prisma.transaction.count({ where });

        // Get transactions
        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                category: { select: { id: true, name: true, icon: true, type: true } },
                account: { select: { id: true, name: true, type: true, currency: true } },
                toAccount: { select: { id: true, name: true } },
                currency: { select: { id: true, code: true, symbol: true } },
                receipt: { select: { id: true, filename: true } },
            },
            orderBy: { [params.sortBy]: params.sortOrder },
            skip: (params.page - 1) * params.limit,
            take: params.limit,
        });

        return NextResponse.json({
            data: transactions,
            pagination: {
                page: params.page,
                limit: params.limit,
                total,
                totalPages: Math.ceil(total / params.limit),
            },
        });
    } catch (error) {
        console.error("Error fetching transactions:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Parámetros inválidos", details: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: "Error al obtener transacciones" }, { status: 500 });
    }
}

// POST - Create new transaction
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canCreate = await hasPermission(session.user.id, session.user.role as Role, "finance.transactions.create");
        if (!canCreate) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const body = await request.json();
        const data = createTransactionSchema.parse(body);

        // Verify account belongs to user
        const account = await prisma.financeAccount.findFirst({
            where: { id: data.accountId, userId: session.user.id },
            include: { currency: true },
        });

        if (!account) {
            return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
        }

        // For transfers, verify destination account
        if (data.type === "TRANSFER" && data.toAccountId) {
            const toAccount = await prisma.financeAccount.findFirst({
                where: { id: data.toAccountId, userId: session.user.id },
            });
            if (!toAccount) {
                return NextResponse.json({ error: "Cuenta destino no encontrada" }, { status: 404 });
            }
        }

        // Get exchange rate if currencies differ
        let exchangeRate: number | null = null;
        let originalAmount: number | null = null;

        const transactionCurrency = await prisma.currency.findUnique({
            where: { id: data.currencyId },
        });

        if (transactionCurrency && transactionCurrency.code !== account.currency.code) {
            originalAmount = data.amount;
            // Convert to account currency
            const convertedAmount = await convertCurrency(
                data.amount,
                transactionCurrency.code as SupportedCurrency,
                account.currency.code as SupportedCurrency
            );
            exchangeRate = convertedAmount / data.amount;
        }

        // Auto-categorize if no category provided
        let categoryId = data.categoryId;
        let autoCategorizationScore: number | null = null;

        if (!categoryId && data.type !== "TRANSFER") {
            const suggestion = await suggestCategory(
                session.user.id,
                data.description || "",
                data.merchant || "",
                data.type
            );
            if (suggestion) {
                categoryId = suggestion.categoryId;
                autoCategorizationScore = suggestion.score;
            }
        }

        // SECURITY: Atomic transaction creation + balance update to prevent race conditions
        // This ensures balance is updated in the same database transaction as the record creation
        const transaction = await prisma.$transaction(async (tx) => {
            // Create the transaction record
            const newTransaction = await tx.transaction.create({
                data: {
                    userId: session.user.id,
                    type: data.type,
                    amount: data.amount,
                    description: data.description,
                    merchant: data.merchant,
                    notes: data.notes,
                    categoryId,
                    accountId: data.accountId,
                    toAccountId: data.toAccountId,
                    currencyId: data.currencyId,
                    transactionDate: data.transactionDate,
                    receiptId: data.receiptId,
                    source: data.source,
                    originalAmount,
                    exchangeRate,
                    autoCategorizationScore,
                    // Document identification
                    documentType: data.documentType,
                    documentNumber: data.documentNumber,
                    merchantRut: data.merchantRut,
                    // Create items if provided
                    items: data.items && data.items.length > 0 ? {
                        create: data.items.map(item => ({
                            description: item.description,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.totalPrice,
                        })),
                    } : undefined,
                },
                include: {
                    category: true,
                    account: { include: { currency: true } },
                    currency: true,
                    items: true,
                },
            });

            // Update account balance atomically within the same transaction
            if (data.type === "INCOME") {
                await tx.financeAccount.update({
                    where: { id: data.accountId },
                    data: { currentBalance: { increment: data.amount } },
                });
            } else if (data.type === "EXPENSE") {
                await tx.financeAccount.update({
                    where: { id: data.accountId },
                    data: { currentBalance: { decrement: data.amount } },
                });
            } else if (data.type === "TRANSFER" && data.toAccountId) {
                await tx.financeAccount.update({
                    where: { id: data.accountId },
                    data: { currentBalance: { decrement: data.amount } },
                });
                await tx.financeAccount.update({
                    where: { id: data.toAccountId },
                    data: { currentBalance: { increment: data.amount } },
                });
            }

            return newTransaction;
        });

        // Non-critical: Update product catalog (outside transaction - can fail independently)
        if (data.items && data.items.length > 0 && data.merchant) {
            await updateProductCatalog(session.user.id, data.items, data.merchant);
        }

        // Audit log for transaction creation
        await logFinanceEvent(
            AuditActions.TRANSACTION_CREATED,
            session.user.id,
            "transaction",
            transaction.id,
            {
                type: transaction.type,
                amount: transaction.amount,
                currency: transaction.currency?.code,
                category: transaction.category?.name,
                merchant: transaction.merchant,
                source: transaction.source,
            }
        );

        return NextResponse.json({ data: transaction }, { status: 201 });
    } catch (error) {
        console.error("Error creating transaction:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: "Error al crear transacción" }, { status: 500 });
    }
}

// Helper: Suggest category based on description/merchant
async function suggestCategory(
    userId: string,
    description: string,
    merchant: string,
    type: "INCOME" | "EXPENSE" | "TRANSFER"
): Promise<{ categoryId: string; score: number } | null> {
    const searchText = `${description} ${merchant}`.toLowerCase();

    // First check user's custom rules
    const userRule = await prisma.userCategorizationRule.findFirst({
        where: {
            userId,
            isActive: true,
            OR: [
                { merchantPattern: { contains: merchant, mode: "insensitive" } },
                { descriptionPattern: { contains: description, mode: "insensitive" } },
            ],
        },
        orderBy: { priority: "asc" },
    });

    if (userRule) {
        return { categoryId: userRule.categoryId, score: 0.95 };
    }

    // Then check global categories with keywords
    const categories = await prisma.financeCategory.findMany({
        where: {
            type: type === "INCOME" ? "INCOME" : "EXPENSE",
            isActive: true,
            OR: [
                { userId: null }, // Global categories
                { userId },
            ],
        },
    });

    let bestMatch: { categoryId: string; score: number } | null = null;

    for (const category of categories) {
        if (!category.keywords || category.keywords.length === 0) continue;

        for (const keyword of category.keywords) {
            if (searchText.includes(keyword.toLowerCase())) {
                const score = keyword.length / searchText.length; // Simple scoring
                if (!bestMatch || score > bestMatch.score) {
                    bestMatch = { categoryId: category.id, score: Math.min(score * 2, 0.8) };
                }
            }
        }
    }

    return bestMatch;
}

// Helper: Update product catalog with items from transaction
// SECURITY: Uses atomic operations to prevent race conditions with concurrent transactions
async function updateProductCatalog(
    userId: string,
    items: Array<{ description: string; quantity: number; unitPrice: number; totalPrice: number }>,
    merchant: string
) {
    try {
        for (const item of items) {
            const normalizedName = item.description.toLowerCase().trim();

            // Skip items with very short or generic names
            if (normalizedName.length < 3 || normalizedName === "item") continue;

            try {
                // ATOMIC UPSERT: Create or update product in one operation to prevent race conditions
                // Use raw SQL for atomic calculation of avg/min/max to avoid lost updates
                await prisma.$executeRaw`
                    INSERT INTO "Product" (
                        "id", "userId", "name", "normalizedName", "lastPrice", 
                        "avgPrice", "minPrice", "maxPrice", "priceCount", 
                        "purchaseCount", "lastPurchased", "commonMerchants", "createdAt", "updatedAt"
                    )
                    VALUES (
                        gen_random_uuid()::text,
                        ${userId},
                        ${item.description},
                        ${normalizedName},
                        ${item.unitPrice},
                        ${item.unitPrice},
                        ${item.unitPrice},
                        ${item.unitPrice},
                        1,
                        1,
                        NOW(),
                        ARRAY[${merchant}]::text[],
                        NOW(),
                        NOW()
                    )
                    ON CONFLICT ("userId", "normalizedName") DO UPDATE SET
                        "lastPrice" = ${item.unitPrice},
                        "avgPrice" = (("Product"."avgPrice" * "Product"."priceCount") + ${item.unitPrice}) / ("Product"."priceCount" + 1),
                        "minPrice" = LEAST("Product"."minPrice", ${item.unitPrice}),
                        "maxPrice" = GREATEST("Product"."maxPrice", ${item.unitPrice}),
                        "priceCount" = "Product"."priceCount" + 1,
                        "purchaseCount" = "Product"."purchaseCount" + 1,
                        "lastPurchased" = NOW(),
                        "commonMerchants" = CASE 
                            WHEN NOT ${merchant} = ANY("Product"."commonMerchants") 
                            THEN array_append("Product"."commonMerchants", ${merchant})
                            ELSE "Product"."commonMerchants"
                        END,
                        "updatedAt" = NOW()
                `;
            } catch (itemError) {
                // Log individual item errors but continue with other items
                console.warn(`[ProductCatalog] Failed to upsert product "${normalizedName}":`, itemError);
            }
        }
    } catch (error) {
        // Don't fail the transaction if product catalog update fails
        console.error("Error updating product catalog:", error);
    }
}
