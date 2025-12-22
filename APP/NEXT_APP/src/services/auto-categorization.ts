/**
 * Auto-categorization Service
 * Classifies transactions based on merchant patterns, keywords, and user history
 */

import { prisma } from "@/lib/prisma";

// Known merchant patterns for auto-categorization
const MERCHANT_PATTERNS: Record<string, { keywords: string[]; category: string; confidence: number }> = {
    // Alimentación
    supermercados: {
        keywords: ["lider", "jumbo", "santa isabel", "unimarc", "tottus", "acuenta", "ekono", "mayorista"],
        category: "Alimentación",
        confidence: 0.95,
    },
    fastfood: {
        keywords: ["mcdonalds", "burger king", "kfc", "subway", "dominos", "pizza hut", "papa johns", "starbucks", "dunkin"],
        category: "Alimentación",
        confidence: 0.9,
    },
    delivery: {
        keywords: ["rappi", "uber eats", "pedidosya", "cornershop", "didi food"],
        category: "Alimentación",
        confidence: 0.85,
    },

    // Transporte
    transporte: {
        keywords: ["metro", "bip", "red", "transantiago", "uber", "didi", "cabify", "beat", "indriver"],
        category: "Transporte",
        confidence: 0.95,
    },
    gasolina: {
        keywords: ["copec", "shell", "petrobras", "enex", "terpel", "gasolinera", "combustible"],
        category: "Transporte",
        confidence: 0.9,
    },

    // Entretenimiento
    streaming: {
        keywords: ["netflix", "spotify", "disney", "hbo", "amazon prime", "youtube premium", "apple music", "deezer"],
        category: "Entretenimiento",
        confidence: 0.95,
    },
    gaming: {
        keywords: ["playstation", "xbox", "steam", "nintendo", "epic games", "riot games"],
        category: "Entretenimiento",
        confidence: 0.9,
    },
    cine: {
        keywords: ["cinemark", "cineplanet", "cinepolis", "cine hoyts"],
        category: "Entretenimiento",
        confidence: 0.95,
    },

    // Salud
    farmacias: {
        keywords: ["cruz verde", "ahumada", "salcobrand", "farmacia", "dr simi"],
        category: "Salud",
        confidence: 0.9,
    },
    salud: {
        keywords: ["clinica", "hospital", "doctor", "medico", "laboratorio", "fonasa", "isapre"],
        category: "Salud",
        confidence: 0.85,
    },

    // Servicios
    servicios: {
        keywords: ["movistar", "claro", "entel", "vtr", "wom", "enel", "aguas andinas", "metrogas", "essal"],
        category: "Servicios",
        confidence: 0.95,
    },

    // Hogar
    hogar: {
        keywords: ["sodimac", "easy", "ikea", "homy", "falabella home", "casa ideas", "construmart"],
        category: "Hogar",
        confidence: 0.9,
    },

    // Ropa
    ropa: {
        keywords: ["falabella", "paris", "ripley", "h&m", "zara", "nike", "adidas", "tricot", "fashion"],
        category: "Ropa",
        confidence: 0.8,
    },

    // Tecnología
    tecnologia: {
        keywords: ["pc factory", "microplay", "wei", "sp digital", "mac store", "samsung", "apple store"],
        category: "Tecnología",
        confidence: 0.9,
    },

    // Educación
    educacion: {
        keywords: ["universidad", "colegio", "instituto", "curso", "udemy", "coursera", "platzi", "duolingo"],
        category: "Educación",
        confidence: 0.85,
    },

    // Ingresos
    salario: {
        keywords: ["sueldo", "salario", "remuneracion", "nomina", "liquidacion", "honorarios"],
        category: "Salario",
        confidence: 0.9,
    },
};

// Amount-based category hints
const AMOUNT_HINTS: Array<{
    min: number;
    max: number;
    type: "income" | "expense";
    suggestedCategory: string;
    confidence: number;
}> = [
    { min: 500000, max: Infinity, type: "income", suggestedCategory: "Salario", confidence: 0.7 },
    { min: 1000, max: 5000, type: "expense", suggestedCategory: "Transporte", confidence: 0.5 },
    { min: 5000, max: 15000, type: "expense", suggestedCategory: "Alimentación", confidence: 0.4 },
];

interface CategorizationResult {
    categoryId: string | null;
    categoryName: string;
    confidence: number;
    source: "pattern" | "history" | "amount" | "default";
    alternativeCategories?: Array<{ name: string; confidence: number }>;
}

interface TransactionInput {
    description: string;
    amount: number;
    type: "income" | "expense";
    merchantName?: string;
}

/**
 * Main categorization function
 */
export async function categorizeTransaction(
    transaction: TransactionInput,
    userId: string
): Promise<CategorizationResult> {
    const { description, amount, type, merchantName } = transaction;
    const searchText = `${description} ${merchantName || ""}`.toLowerCase();

    // 1. Try pattern matching first
    const patternMatch = matchMerchantPattern(searchText);
    if (patternMatch && patternMatch.confidence >= 0.8) {
        const category = await findUserCategory(userId, patternMatch.category, type);
        if (category) {
            return {
                categoryId: category.id,
                categoryName: category.name,
                confidence: patternMatch.confidence,
                source: "pattern",
            };
        }
    }

    // 2. Try user's transaction history
    const historyMatch = await matchFromHistory(userId, searchText, type);
    if (historyMatch && historyMatch.confidence >= 0.7) {
        return historyMatch;
    }

    // 3. Fall back to pattern match with lower confidence
    if (patternMatch) {
        const category = await findUserCategory(userId, patternMatch.category, type);
        if (category) {
            return {
                categoryId: category.id,
                categoryName: category.name,
                confidence: patternMatch.confidence * 0.8,
                source: "pattern",
            };
        }
    }

    // 4. Try amount-based hints
    const amountMatch = matchByAmount(amount, type);
    if (amountMatch) {
        const category = await findUserCategory(userId, amountMatch.suggestedCategory, type);
        if (category) {
            return {
                categoryId: category.id,
                categoryName: category.name,
                confidence: amountMatch.confidence,
                source: "amount",
            };
        }
    }

    // 5. Return default category
    const defaultCategory = await getDefaultCategory(userId, type);
    return {
        categoryId: defaultCategory?.id || null,
        categoryName: defaultCategory?.name || (type === "income" ? "Otros ingresos" : "Otros"),
        confidence: 0.3,
        source: "default",
    };
}

/**
 * Match against known merchant patterns
 */
function matchMerchantPattern(text: string): { category: string; confidence: number } | null {
    let bestMatch: { category: string; confidence: number } | null = null;

    for (const [, pattern] of Object.entries(MERCHANT_PATTERNS)) {
        for (const keyword of pattern.keywords) {
            if (text.includes(keyword.toLowerCase())) {
                if (!bestMatch || pattern.confidence > bestMatch.confidence) {
                    bestMatch = {
                        category: pattern.category,
                        confidence: pattern.confidence,
                    };
                }
            }
        }
    }

    return bestMatch;
}

/**
 * Match from user's transaction history
 */
async function matchFromHistory(
    userId: string,
    searchText: string,
    type: "income" | "expense"
): Promise<CategorizationResult | null> {
    try {
        const typeUpper = type.toUpperCase() as "INCOME" | "EXPENSE";
        
        // Find similar transactions from user's history
        const similarTransactions = await prisma.transaction.findMany({
            where: {
                userId,
                type: typeUpper,
                categoryId: { not: null },
            },
            select: {
                description: true,
                category: {
                    select: { id: true, name: true },
                },
            },
            take: 100,
            orderBy: { transactionDate: "desc" },
        });

        // Calculate similarity scores
        const categoryScores: Record<string, { id: string; name: string; score: number; count: number }> = {};

        for (const tx of similarTransactions) {
            if (!tx.category || !tx.description) continue;

            const similarity = calculateSimilarity(searchText, tx.description.toLowerCase());
            if (similarity > 0.5) {
                if (!categoryScores[tx.category.id]) {
                    categoryScores[tx.category.id] = {
                        id: tx.category.id,
                        name: tx.category.name,
                        score: 0,
                        count: 0,
                    };
                }
                categoryScores[tx.category.id].score += similarity;
                categoryScores[tx.category.id].count += 1;
            }
        }

        // Find best match
        let bestMatch: { id: string; name: string; avgScore: number } | null = null;
        for (const [, data] of Object.entries(categoryScores)) {
            const avgScore = data.score / data.count;
            if (!bestMatch || avgScore > bestMatch.avgScore) {
                bestMatch = {
                    id: data.id,
                    name: data.name,
                    avgScore,
                };
            }
        }

        if (bestMatch && bestMatch.avgScore > 0.6) {
            return {
                categoryId: bestMatch.id,
                categoryName: bestMatch.name,
                confidence: Math.min(bestMatch.avgScore * 0.9, 0.95),
                source: "history",
            };
        }

        return null;
    } catch (error) {
        console.error("Error matching from history:", error);
        return null;
    }
}

/**
 * Match based on amount ranges
 */
function matchByAmount(
    amount: number,
    type: "income" | "expense"
): { suggestedCategory: string; confidence: number } | null {
    for (const hint of AMOUNT_HINTS) {
        if (hint.type === type && amount >= hint.min && amount <= hint.max) {
            return {
                suggestedCategory: hint.suggestedCategory,
                confidence: hint.confidence,
            };
        }
    }
    return null;
}

/**
 * Find user's category by name
 */
async function findUserCategory(
    userId: string,
    categoryName: string,
    type: "income" | "expense"
): Promise<{ id: string; name: string } | null> {
    try {
        const typeEnum = type === "income" ? "INCOME" : "EXPENSE";
        const category = await prisma.financeCategory.findFirst({
            where: {
                userId,
                type: typeEnum,
                name: {
                    contains: categoryName,
                    mode: "insensitive",
                },
            },
            select: { id: true, name: true },
        });

        return category;
    } catch (error) {
        console.error("Error finding category:", error);
        return null;
    }
}

/**
 * Get default category for type
 */
async function getDefaultCategory(
    userId: string,
    type: "income" | "expense"
): Promise<{ id: string; name: string } | null> {
    try {
        const typeEnum = type === "income" ? "INCOME" : "EXPENSE";
        const category = await prisma.financeCategory.findFirst({
            where: {
                userId,
                type: typeEnum,
                OR: [
                    { name: { contains: "otros", mode: "insensitive" } },
                    { name: { contains: "other", mode: "insensitive" } },
                ],
            },
            select: { id: true, name: true },
        });

        if (category) return category;

        // Get any category of this type
        return await prisma.financeCategory.findFirst({
            where: { userId, type: typeEnum },
            select: { id: true, name: true },
        });
    } catch (error) {
        console.error("Error getting default category:", error);
        return null;
    }
}

/**
 * Simple text similarity (Jaccard-like)
 */
function calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/).filter((w) => w.length > 2));
    const words2 = new Set(text2.split(/\s+/).filter((w) => w.length > 2));

    if (words1.size === 0 || words2.size === 0) return 0;

    let intersection = 0;
    for (const word of words1) {
        if (words2.has(word)) intersection++;
    }

    const union = words1.size + words2.size - intersection;
    return intersection / union;
}

/**
 * Batch categorize multiple transactions
 */
export async function batchCategorize(
    transactions: TransactionInput[],
    userId: string
): Promise<CategorizationResult[]> {
    const results: CategorizationResult[] = [];

    for (const tx of transactions) {
        const result = await categorizeTransaction(tx, userId);
        results.push(result);
    }

    return results;
}

/**
 * Learn from user correction (improves future predictions)
 */
export async function learnFromCorrection(
    userId: string,
    description: string,
    correctCategoryId: string
): Promise<void> {
    // This would store the correction for future ML training
    // For now, the history-based matching naturally learns from user corrections
    console.log(`Learning: User ${userId} categorized "${description}" as ${correctCategoryId}`);
}
