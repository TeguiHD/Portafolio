/**
 * AI Service for Quotation Generation
 * Uses OpenRouter API to generate professional quotations
 */

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_NAME = "mistralai/mistral-small-24b-instruct-2501";

function getApiKey(): string {
    const key = process.env.DEEPSEEK_OPENROUTER_API_KEY;
    if (!key) {
        throw new Error("DEEPSEEK_OPENROUTER_API_KEY not configured");
    }
    return key;
}

// Sanitize input to prevent prompt injection
function sanitizeInput(input: string): string {
    return input
        .replace(/[<>{}[\]]/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, 2000);
}

// Project type descriptions for context
const PROJECT_TYPE_CONTEXT: Record<string, string> = {
    landing_page: "Landing page optimizada para conversión, diseño moderno y responsive",
    website: "Sitio web corporativo multi-página con CMS",
    ecommerce: "Tienda online con carrito, pagos y gestión de inventario",
    webapp: "Aplicación web personalizada con funcionalidades a medida",
    consulting: "Servicios de consultoría y asesoría técnica",
    maintenance: "Plan de mantenimiento y soporte continuo",
    redesign: "Rediseño y modernización de sitio existente",
};

// System prompt for quotation generation
const QUOTATION_SYSTEM_PROMPT = `Eres un consultor experto en desarrollo web creando cotizaciones profesionales en Chile.

REGLAS ESTRICTAS:
- Responde SOLO en JSON válido
- Precios en CLP (pesos chilenos)
- Servicios realistas y profesionales
- Timeline en días hábiles
- El scope debe ser 2-3 oraciones profesionales

FORMATO JSON EXACTO (nada más):
{
  "scope": "Descripción profesional del proyecto en 2-3 oraciones.",
  "services": [
    {
      "title": "Nombre del servicio",
      "description": "Descripción breve",
      "deliverables": ["Entregable 1", "Entregable 2"],
      "price": 200000
    }
  ],
  "exclusions": ["Lo que NO incluye"],
  "timeline": "X días hábiles",
  "paymentTerms": "50% inicio / 50% entrega"
}

RANGOS DE PRECIOS TÍPICOS (CLP):
- Diseño UI/UX: $150.000 - $400.000
- Desarrollo Frontend: $200.000 - $600.000
- Desarrollo Backend: $300.000 - $700.000
- E-commerce completo: $600.000 - $1.500.000
- Mantenimiento mensual: $80.000 - $200.000
- Consultoría (sesión): $50.000 - $100.000

Si la solicitud no es sobre cotización web, responde:
{"error": "Solo genero cotizaciones de desarrollo web"}`;

export interface QuotationAIResult {
    success: boolean;
    scope?: string;
    services?: Array<{
        title: string;
        description: string;
        deliverables: string[];
        price: number;
    }>;
    exclusions?: string[];
    timeline?: string;
    paymentTerms?: string;
    error?: string;
    latencyMs: number;
}

export interface GenerateQuotationInput {
    clientName: string;
    projectName: string;
    projectType: string;
    description: string;
    requirements?: string[];
}

export async function generateQuotationWithAI(
    input: GenerateQuotationInput
): Promise<QuotationAIResult> {
    const startTime = Date.now();

    try {
        const apiKey = getApiKey();

        // Sanitize inputs
        const clientName = sanitizeInput(input.clientName);
        const projectName = sanitizeInput(input.projectName);
        const description = sanitizeInput(input.description);
        const projectType = input.projectType || "website";
        const requirements = input.requirements?.map(r => sanitizeInput(r)).join(", ") || "Sin requisitos específicos";

        const projectContext = PROJECT_TYPE_CONTEXT[projectType] || PROJECT_TYPE_CONTEXT.website;

        const userPrompt = `CLIENTE: ${clientName}
PROYECTO: ${projectName}
TIPO: ${projectContext}
DESCRIPCIÓN: ${description}
REQUISITOS: ${requirements}

Genera una cotización profesional para este proyecto.`;

        const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://nicoholas.dev",
                "X-Title": "Quotation Generator",
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [
                    { role: "system", content: QUOTATION_SYSTEM_PROMPT },
                    { role: "user", content: userPrompt },
                ],
                max_tokens: 1500,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenRouter API error:", errorText);
            return {
                success: false,
                error: "Error al conectar con el servicio de IA",
                latencyMs: Date.now() - startTime,
            };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            return {
                success: false,
                error: "La IA no generó una respuesta",
                latencyMs: Date.now() - startTime,
            };
        }

        // Parse JSON response
        let parsed;
        try {
            // Clean potential markdown code blocks
            const cleanContent = content
                .replace(/```json\s*/gi, "")
                .replace(/```\s*/gi, "")
                .replace(/<think>[\s\S]*?<\/think>/gi, "")
                .trim();

            // Find JSON object
            const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("No JSON found in response");
            }

            parsed = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            console.error("Failed to parse AI response:", content);
            return {
                success: false,
                error: "Error al procesar la respuesta de IA",
                latencyMs: Date.now() - startTime,
            };
        }

        // Check for error response
        if (parsed.error) {
            return {
                success: false,
                error: parsed.error,
                latencyMs: Date.now() - startTime,
            };
        }

        // Validate required fields
        if (!parsed.scope || !parsed.services || !Array.isArray(parsed.services)) {
            return {
                success: false,
                error: "Respuesta incompleta de la IA",
                latencyMs: Date.now() - startTime,
            };
        }

        return {
            success: true,
            scope: parsed.scope,
            services: parsed.services.map((s: { title?: string; description?: string; deliverables?: string[]; price?: number }) => ({
                title: s.title || "Servicio",
                description: s.description || "",
                deliverables: Array.isArray(s.deliverables) ? s.deliverables : [],
                price: typeof s.price === "number" ? s.price : 100000,
            })),
            exclusions: Array.isArray(parsed.exclusions) ? parsed.exclusions : [],
            timeline: parsed.timeline || "15-20 días hábiles",
            paymentTerms: parsed.paymentTerms || "50% inicio / 50% entrega",
            latencyMs: Date.now() - startTime,
        };
    } catch (error) {
        console.error("Quotation AI error:", error);
        return {
            success: false,
            error: "Error interno del servicio de IA",
            latencyMs: Date.now() - startTime,
        };
    }
}
