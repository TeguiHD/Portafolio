/**
 * Finance AI Analysis Service
 * Uses OpenRouter API for intelligent financial analysis
 */

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_NAME = "mistralai/mistral-small-24b-instruct-2501";

function getApiKey(): string {
    const key = process.env.DEEPSEEK_OPENROUTER_API_KEY || "";
    if (!key) {
        throw new Error("No API key configured for AI analysis");
    }
    return key;
}

const FINANCE_SYSTEM_PROMPT = `Eres un asesor financiero personal experto. Analiza los datos financieros del usuario y proporciona consejos prácticos y personalizados.

REGLAS:
- Responde SIEMPRE en español de Chile
- Sé conciso pero útil
- Da consejos accionables y específicos
- Usa emojis para hacer el análisis más visual
- No inventes datos, solo analiza lo que se te proporciona
- Prioriza la seguridad financiera del usuario
- NO des consejos de inversión específicos, solo educación general

FORMATO DE RESPUESTA (JSON):
{
  "resumen": "Resumen ejecutivo de 1-2 oraciones",
  "puntuacion": 0-100,
  "puntos_fuertes": ["punto 1", "punto 2"],
  "areas_mejora": ["area 1", "area 2"],
  "consejos": [
    {"titulo": "Consejo 1", "descripcion": "Detalle", "prioridad": "alta|media|baja", "categoria": "ahorro|gastos|ingresos|deuda"},
    ...
  ],
  "alertas": ["alerta importante si existe"],
  "siguiente_paso": "Una acción concreta a tomar esta semana"
}`.trim();

export interface FinancialData {
    period: {
        month: string;
        year: number;
    };
    totals: {
        income: number;
        expenses: number;
        balance: number;
    };
    categories: Array<{
        name: string;
        amount: number;
        percentage: number;
        type: "INCOME" | "EXPENSE";
    }>;
    accounts: Array<{
        name: string;
        balance: number;
        type: string;
    }>;
    budgets?: Array<{
        name: string;
        amount: number;
        spent: number;
        percentage: number;
    }>;
    goals?: Array<{
        name: string;
        target: number;
        current: number;
        percentage: number;
    }>;
    trends?: {
        incomeChange: number;
        expenseChange: number;
        savingsRate: number;
    };
    recurringExpenses?: number;
}

export interface AnalysisResult {
    success: boolean;
    analysis?: {
        resumen: string;
        puntuacion: number;
        puntos_fuertes: string[];
        areas_mejora: string[];
        consejos: Array<{
            titulo: string;
            descripcion: string;
            prioridad: "alta" | "media" | "baja";
            categoria: "ahorro" | "gastos" | "ingresos" | "deuda";
        }>;
        alertas: string[];
        siguiente_paso: string;
    };
    error?: string;
    latencyMs: number;
}

export async function analyzeFinancesWithAI(data: FinancialData): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
        const apiKey = getApiKey();

        // Build the analysis prompt
        const userPrompt = buildAnalysisPrompt(data);

        const response = await fetch(OPENROUTER_API_URL, {
            signal: AbortSignal.timeout(60_000),
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000",
                "X-Title": "Finance AI Analysis",
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [
                    { role: "system", content: FINANCE_SYSTEM_PROMPT },
                    { role: "user", content: userPrompt },
                ],
                temperature: 0.3, // Lower for more consistent analysis
                max_tokens: 1500,
                response_format: { type: "json_object" },
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();
        const content = result.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error("Empty response from AI");
        }

        // Parse JSON response
        const analysis = JSON.parse(content);

        return {
            success: true,
            analysis,
            latencyMs: Date.now() - startTime,
        };
    } catch (error) {
        console.error("[Finance AI] Analysis error:", error);
        return {
            success: false,
            error: (error as Error).message,
            latencyMs: Date.now() - startTime,
        };
    }
}

function buildAnalysisPrompt(data: FinancialData): string {
    const formatMoney = (n: number) => `$${n.toLocaleString("es-CL")}`;

    let prompt = `Analiza mis finanzas personales de ${data.period.month} ${data.period.year}:

📊 RESUMEN DEL MES:
- Ingresos totales: ${formatMoney(data.totals.income)}
- Gastos totales: ${formatMoney(data.totals.expenses)}
- Balance: ${formatMoney(data.totals.balance)}
- Tasa de ahorro: ${data.totals.income > 0 ? ((data.totals.balance / data.totals.income) * 100).toFixed(1) : 0}%

📂 GASTOS POR CATEGORÍA:`;

    data.categories
        .filter((c) => c.type === "EXPENSE")
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 8)
        .forEach((c) => {
            prompt += `\n- ${c.name}: ${formatMoney(c.amount)} (${c.percentage.toFixed(1)}%)`;
        });

    if (data.accounts.length > 0) {
        prompt += "\n\n🏦 CUENTAS:";
        data.accounts.forEach((a) => {
            prompt += `\n- ${a.name} (${a.type}): ${formatMoney(a.balance)}`;
        });
    }

    if (data.budgets && data.budgets.length > 0) {
        prompt += "\n\n📋 PRESUPUESTOS:";
        data.budgets.forEach((b) => {
            const status = b.percentage > 100 ? "⚠️ EXCEDIDO" : b.percentage > 80 ? "⚡ CASI LÍMITE" : "✅";
            prompt += `\n- ${b.name}: ${formatMoney(b.spent)}/${formatMoney(b.amount)} (${b.percentage.toFixed(0)}%) ${status}`;
        });
    }

    if (data.goals && data.goals.length > 0) {
        prompt += "\n\n🎯 METAS DE AHORRO:";
        data.goals.forEach((g) => {
            prompt += `\n- ${g.name}: ${formatMoney(g.current)}/${formatMoney(g.target)} (${g.percentage.toFixed(0)}%)`;
        });
    }

    if (data.trends) {
        prompt += `\n\n📈 TENDENCIAS VS MES ANTERIOR:
- Cambio en ingresos: ${data.trends.incomeChange > 0 ? "+" : ""}${data.trends.incomeChange.toFixed(1)}%
- Cambio en gastos: ${data.trends.expenseChange > 0 ? "+" : ""}${data.trends.expenseChange.toFixed(1)}%`;
    }

    if (data.recurringExpenses) {
        prompt += `\n\n🔄 Gastos fijos mensuales: ${formatMoney(data.recurringExpenses)}`;
    }

    prompt += "\n\nProporciona un análisis completo con consejos personalizados para mejorar mi situación financiera.";

    return prompt;
}

// Quick analysis for specific questions
export async function askFinanceQuestion(
    question: string,
    context: FinancialData
): Promise<{ success: boolean; answer?: string; error?: string }> {
    try {
        const apiKey = getApiKey();

        const systemPrompt = `Eres un asesor financiero. Responde preguntas sobre finanzas personales de forma clara y concisa en español.
IMPORTANTE: Basa tu respuesta en los datos proporcionados. No inventes información.
Mantén la respuesta en 2-3 párrafos máximo.`;

        const contextSummary = `Datos del usuario:
- Ingresos: $${context.totals.income.toLocaleString()}
- Gastos: $${context.totals.expenses.toLocaleString()}
- Balance: $${context.totals.balance.toLocaleString()}
- Categorías principales: ${context.categories
                .filter((c) => c.type === "EXPENSE")
                .slice(0, 3)
                .map((c) => c.name)
                .join(", ")}`;

        const response = await fetch(OPENROUTER_API_URL, {
            signal: AbortSignal.timeout(60_000),
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000",
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `${contextSummary}\n\nPregunta: ${question}` },
                ],
                temperature: 0.5,
                max_tokens: 500,
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();
        const answer = result.choices?.[0]?.message?.content;

        return { success: true, answer };
    } catch (error) {
        console.error("[Finance AI] Question error:", error);
        return { success: false, error: (error as Error).message };
    }
}
