import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permission-check";
import { Role, TransactionType, AccountType, BudgetPeriod } from "@prisma/client";
import { z } from "zod";

const importTransactionSchema = z.object({
    date: z.string(),
    type: z.enum(["INCOME", "EXPENSE", "TRANSFER", "Ingreso", "Gasto", "Transferencia"]),
    amount: z.union([z.number(), z.string()]),
    description: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    account: z.string().optional().nullable(),
    currency: z.string().optional().default("CLP"),
    merchant: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

const importSchema = z.object({
    transactions: z.array(importTransactionSchema).optional(),
    accounts: z
        .array(
            z.object({
                name: z.string(),
                type: z.enum(["CHECKING", "SAVINGS", "CASH", "CREDIT", "INVESTMENT", "OTHER"]).optional(),
                currency: z.string().optional(),
                initialBalance: z.number().optional(),
                color: z.string().optional().nullable(),
                icon: z.string().optional().nullable(),
            })
        )
        .optional(),
    categories: z
        .array(
            z.object({
                name: z.string(),
                icon: z.string().optional(),
                color: z.string().optional().nullable(),
                type: z.enum(["INCOME", "EXPENSE"]),
                keywords: z.array(z.string()).optional(),
            })
        )
        .optional(),
    budgets: z
        .array(
            z.object({
                name: z.string(),
                amount: z.number(),
                period: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]).optional(),
                category: z.string().optional().nullable(),
                periodStart: z.string(),
                periodEnd: z.string().optional().nullable(),
            })
        )
        .optional(),
    goals: z
        .array(
            z.object({
                name: z.string(),
                targetAmount: z.number(),
                currentAmount: z.number().optional(),
                deadline: z.string().optional().nullable(),
                color: z.string().optional().nullable(),
                icon: z.string().optional().nullable(),
            })
        )
        .optional(),
});

// POST /api/finance/import - Import financial data
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canManage = await hasPermission(session.user.id, session.user.role as Role, "finance.manage");
        if (!canManage) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const contentType = request.headers.get("content-type") || "";
        const userId = session.user.id;

        let data: z.infer<typeof importSchema>;

        if (contentType.includes("multipart/form-data")) {
            // Handle file upload
            const formData = await request.formData();
            const file = formData.get("file") as File;
            if (!file) {
                return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
            }

            const text = await file.text();
            const filename = file.name.toLowerCase();

            if (filename.endsWith(".csv")) {
                data = { transactions: parseCSV(text) };
            } else if (filename.endsWith(".json")) {
                try {
                    data = JSON.parse(text);
                } catch {
                    return NextResponse.json({ error: "Archivo JSON inválido o malformado" }, { status: 400 });
                }
            } else {
                return NextResponse.json({ error: "Formato no soportado. Use CSV o JSON" }, { status: 400 });
            }
        } else {
            data = await request.json();
        }

        const validation = importSchema.safeParse(data);
        if (!validation.success) {
            return NextResponse.json(
                { error: "Datos inválidos", details: validation.error.issues },
                { status: 400 }
            );
        }

        const importedData = validation.data;
        const results = {
            accounts: { imported: 0, skipped: 0, errors: [] as string[] },
            categories: { imported: 0, skipped: 0, errors: [] as string[] },
            transactions: { imported: 0, skipped: 0, errors: [] as string[] },
            budgets: { imported: 0, skipped: 0, errors: [] as string[] },
            goals: { imported: 0, skipped: 0, errors: [] as string[] },
        };

        // Get default currency
        const defaultCurrency = await prisma.currency.findFirst({ where: { code: "CLP" } });
        if (!defaultCurrency) {
            return NextResponse.json({ error: "Moneda CLP no configurada" }, { status: 500 });
        }

        // 1. Import Accounts
        if (importedData.accounts) {
            for (const acc of importedData.accounts) {
                try {
                    const existing = await prisma.financeAccount.findUnique({
                        where: { userId_name: { userId, name: acc.name } },
                    });

                    if (existing) {
                        results.accounts.skipped++;
                        continue;
                    }

                    let currencyId = defaultCurrency.id;
                    if (acc.currency) {
                        const currency = await prisma.currency.findUnique({ where: { code: acc.currency } });
                        if (currency) currencyId = currency.id;
                    }

                    await prisma.financeAccount.create({
                        data: {
                            userId,
                            name: acc.name,
                            type: (acc.type as AccountType) || "CHECKING",
                            currencyId,
                            initialBalance: acc.initialBalance || 0,
                            currentBalance: acc.initialBalance || 0,
                            color: acc.color,
                            icon: acc.icon,
                        },
                    });
                    results.accounts.imported++;
                } catch (err) {
                    results.accounts.errors.push(`Cuenta "${acc.name}": ${(err as Error).message}`);
                }
            }
        }

        // 2. Import Categories
        if (importedData.categories) {
            for (const cat of importedData.categories) {
                try {
                    const existing = await prisma.financeCategory.findFirst({
                        where: { userId, name: cat.name, type: cat.type as TransactionType },
                    });

                    if (existing) {
                        results.categories.skipped++;
                        continue;
                    }

                    await prisma.financeCategory.create({
                        data: {
                            userId,
                            name: cat.name,
                            icon: cat.icon || "📁",
                            color: cat.color,
                            type: cat.type as TransactionType,
                            keywords: cat.keywords || [],
                        },
                    });
                    results.categories.imported++;
                } catch (err) {
                    results.categories.errors.push(`Categoría "${cat.name}": ${(err as Error).message}`);
                }
            }
        }

        // Get user's accounts and categories for transaction mapping
        const accounts = await prisma.financeAccount.findMany({ where: { userId } });
        const categories = await prisma.financeCategory.findMany({
            where: { OR: [{ userId }, { userId: null }] },
        });
        const defaultAccount = accounts.find((a) => a.isDefault) || accounts[0];

        // 3. Import Transactions
        if (importedData.transactions) {
            for (const tx of importedData.transactions) {
                try {
                    // Map type
                    let type: TransactionType;
                    if (tx.type === "Ingreso" || tx.type === "INCOME") type = "INCOME";
                    else if (tx.type === "Gasto" || tx.type === "EXPENSE") type = "EXPENSE";
                    else type = "TRANSFER";

                    // Find account
                    const account = tx.account
                        ? accounts.find((a) => a.name.toLowerCase() === tx.account!.toLowerCase())
                        : defaultAccount;

                    if (!account) {
                        results.transactions.errors.push(`Transacción sin cuenta: ${tx.description}`);
                        results.transactions.skipped++;
                        continue;
                    }

                    // Find category
                    const category = tx.category
                        ? categories.find(
                            (c) =>
                                c.name.toLowerCase() === tx.category!.toLowerCase() &&
                                (c.type === type || type === "TRANSFER")
                        )
                        : null;

                    // Parse amount
                    const amount =
                        typeof tx.amount === "string"
                            ? parseFloat(tx.amount.replace(/[^0-9.-]/g, ""))
                            : tx.amount;

                    // Find currency
                    let currencyId = defaultCurrency.id;
                    if (tx.currency) {
                        const currency = await prisma.currency.findUnique({ where: { code: tx.currency } });
                        if (currency) currencyId = currency.id;
                    }

                    await prisma.transaction.create({
                        data: {
                            userId,
                            accountId: account.id,
                            categoryId: category?.id,
                            currencyId,
                            type,
                            amount: Math.abs(amount),
                            description: tx.description || null,
                            transactionDate: new Date(tx.date),
                            merchant: tx.merchant || null,
                            notes: tx.notes || null,
                        },
                    });
                    results.transactions.imported++;
                } catch (err) {
                    results.transactions.errors.push(`Transacción: ${(err as Error).message}`);
                    results.transactions.skipped++;
                }
            }
        }

        // 4. Import Budgets
        if (importedData.budgets) {
            for (const budget of importedData.budgets) {
                try {
                    const category = budget.category
                        ? categories.find((c) => c.name.toLowerCase() === budget.category!.toLowerCase())
                        : null;

                    await prisma.budget.create({
                        data: {
                            userId,
                            name: budget.name,
                            amount: budget.amount,
                            period: (budget.period as BudgetPeriod) || "MONTHLY",
                            categoryId: category?.id,
                            periodStart: new Date(budget.periodStart),
                            periodEnd: new Date(budget.periodEnd || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)),
                        },
                    });
                    results.budgets.imported++;
                } catch (err) {
                    results.budgets.errors.push(`Presupuesto "${budget.name}": ${(err as Error).message}`);
                }
            }
        }

        // 5. Import Goals
        if (importedData.goals) {
            for (const goal of importedData.goals) {
                try {
                    await prisma.savingsGoal.create({
                        data: {
                            userId,
                            name: goal.name,
                            targetAmount: goal.targetAmount,
                            currentAmount: goal.currentAmount || 0,
                            deadline: goal.deadline ? new Date(goal.deadline) : null,
                            color: goal.color,
                            icon: goal.icon,
                        },
                    });
                    results.goals.imported++;
                } catch (err) {
                    results.goals.errors.push(`Meta "${goal.name}": ${(err as Error).message}`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            results,
            summary: {
                totalImported:
                    results.accounts.imported +
                    results.categories.imported +
                    results.transactions.imported +
                    results.budgets.imported +
                    results.goals.imported,
                totalSkipped:
                    results.accounts.skipped +
                    results.categories.skipped +
                    results.transactions.skipped +
                    results.budgets.skipped +
                    results.goals.skipped,
            },
        });
    } catch (error) {
        console.error("[Import POST] Error:", error);
        return NextResponse.json({ error: "Error al importar datos" }, { status: 500 });
    }
}

function parseCSV(text: string): z.infer<typeof importTransactionSchema>[] {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];

    // Detect separator
    const separator = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(separator).map((h) => h.trim().toLowerCase().replace(/"/g, ""));

    // Map header names
    const headerMap: Record<string, string> = {
        fecha: "date",
        date: "date",
        tipo: "type",
        type: "type",
        monto: "amount",
        amount: "amount",
        valor: "amount",
        descripcion: "description",
        descripción: "description",
        description: "description",
        concepto: "description",
        categoria: "category",
        categoría: "category",
        category: "category",
        cuenta: "account",
        account: "account",
        moneda: "currency",
        currency: "currency",
        comercio: "merchant",
        merchant: "merchant",
        notas: "notes",
        notes: "notes",
        etiquetas: "tags",
        tags: "tags",
    };

    const normalizedHeaders = headers.map((h) => headerMap[h] || h);

    const transactions: z.infer<typeof importTransactionSchema>[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i], separator);
        if (values.length !== headers.length) continue;

        const tx: Record<string, unknown> = {};
        normalizedHeaders.forEach((header, idx) => {
            tx[header] = values[idx]?.replace(/^"|"$/g, "").trim() || null;
        });

        // Infer type from amount if not specified
        if (!tx.type && tx.amount) {
            const amount = parseFloat(String(tx.amount).replace(/[^0-9.-]/g, ""));
            tx.type = amount < 0 ? "EXPENSE" : "INCOME";
        }

        if (tx.date && tx.amount) {
            transactions.push(tx as z.infer<typeof importTransactionSchema>);
        }
    }

    return transactions;
}

function parseCSVLine(line: string, separator: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === separator && !inQuotes) {
            result.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    result.push(current);

    return result;
}
