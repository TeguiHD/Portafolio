/**
 * AI Service for CV Enhancement
 * Uses Groq API (primary) with OpenRouter fallback
 * SECURITY: Implements prompt injection prevention & jailbreak detection
 */

// ============= AI PROVIDER CONFIGURATION =============
interface AIProvider {
    name: string;
    url: string;
    model: string;
    getApiKey: () => string | null;
    headers: (apiKey: string) => Record<string, string>;
}

const PROVIDERS: AIProvider[] = [
    {
        name: "Groq",
        url: "https://api.groq.com/openai/v1/chat/completions",
        model: "llama-3.1-8b-instant",
        getApiKey: () => process.env.GROQ_API_KEY || null,
        headers: (apiKey) => ({
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        }),
    },
    {
        name: "OpenRouter",
        url: "https://openrouter.ai/api/v1/chat/completions",
        model: "google/gemini-2.0-flash-exp:free",
        getApiKey: () => process.env.DEEPSEEK_OPENROUTER_API_KEY || null,
        headers: (apiKey) => ({
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://nicoholas.dev",
            "X-Title": "CV Editor Assistant",
        }),
    },
];

// ===========================================
// SECURITY: Jailbreak & prompt injection patterns
// ===========================================

const BLOCKED_PATTERNS = [
    // Prompt injection attempts
    /ignore\s*(all|previous|system|above)/gi,
    /forget\s*(all|previous|instructions)/gi,
    /you\s*are\s*(now|actually|really)/gi,
    /pretend\s*(to\s*be|you\s*are)/gi,
    /roleplay\s*as/gi,
    /act\s*as\s*(if|a|an)/gi,
    /new\s*instructions?/gi,
    /system\s*prompt/gi,
    /jailbreak/gi,
    /DAN\s*mode/gi,
    /bypass\s*(filter|safety|restriction)/gi,
    // Spanish variants
    /ignora\s*(todas?|las|tus)\s*(instrucciones|reglas)/gi,
    /olvida\s*(todo|las|tus)\s*(instrucciones|reglas)/gi,
    /ahora\s*eres/gi,
    /finge\s*(que|ser)/gi,
    /actúa\s*como/gi,
    /nuevas?\s*instrucciones/gi,
    // Grandma/story jailbreak
    /cuent[oa]\s*(de\s*la\s*abuela|historia|de|para\s*dormir)/gi,
    /abuela.*windows|windows.*abuela/gi,
    // Creative format jailbreaks
    /escrib[ea]\s*(un\s*)?(poema|canci[oó]n|historia|cuento|relato|verso)/gi,
    /en\s*forma\s*de\s*(poema|canci[oó]n|rap|verso|rima)/gi,
    /hazlo\s*(como|en)\s*(poema|canci[oó]n|rap|historia)/gi,
    /canta(me)?\s*(sobre|acerca|una)/gi,
    /recita(me)?\s*(un|una)/gi,
    /formato\s*(po[eé]tico|l[ií]rico|narrativo)/gi,
    // License/crack attempts
    /llave\s*de\s*(windows|producto|activaci[oó]n)/gi,
    /serial\s*(key|number)/gi,
    /crack|keygen|pirat[ea]/gi,
    /contrase[ñn]a\s*(de\s*)?(wifi|banco|cuenta)/gi,
];

const OFF_TOPIC_PATTERNS = [
    // Topics completely unrelated to CV editing
    /pol[ií]tic[ao]/gi,
    /religi[oó]n|iglesia|dios|ateo/gi,
    /sexo|porn|xxx|nsfw/gi,
    /drogas?|marihuana|coca[ií]na/gi,
    /armas?|pistola|rifle/gi,
    /hack(ear|ing)?|robar|estafar/gi,
    /c[oó]mo\s*(hackear|robar|piratear)/gi,
    // Political figures
    /trump|biden|boric|piñera|maduro/gi,
    /elecciones|votar\s*por|partido\s*pol/gi,
    // Non-CV related code requests
    /genera\s*c[oó]digo\s*(python|javascript|java|php|sql)/gi,
    /escribe\s*(un\s*)?(script|programa|bot)/gi,
];

// Personal data modification attempts (CV-specific)
const PERSONAL_DATA_PATTERNS = [
    /cambia(r)?\s*(mi\s*)?(nombre|email|correo|tel[eé]fono|direcci[oó]n|ubicaci[oó]n)/gi,
    /modifica(r)?\s*(mi\s*)?(nombre|email|correo|tel[eé]fono|direcci[oó]n)/gi,
    /actualiza(r)?\s*(mi\s*)?(nombre|email|correo|tel[eé]fono)/gi,
    /pon(er|me)?\s*(como\s*)?(nombre|email)/gi,
    /mi\s*nuevo\s*(nombre|email|correo)/gi,
];

export type SecurityCheckResult = {
    safe: boolean;
    reason?: "jailbreak" | "off_topic" | "personal_data";
    message?: string;
};

export function checkInputSecurity(input: string): SecurityCheckResult {
    // Check for jailbreak attempts
    for (const pattern of BLOCKED_PATTERNS) {
        if (pattern.test(input)) {
            return {
                safe: false,
                reason: "jailbreak",
                message: "Mantengamos el foco en mejorar tu CV. ¿Qué experiencia o proyecto quieres agregar?"
            };
        }
    }

    // Check for off-topic content
    for (const pattern of OFF_TOPIC_PATTERNS) {
        if (pattern.test(input)) {
            return {
                safe: false,
                reason: "off_topic",
                message: "Solo puedo ayudarte con experiencias laborales, proyectos y habilidades para tu CV. ¿En qué te ayudo?"
            };
        }
    }

    // Check for personal data modification attempts
    for (const pattern of PERSONAL_DATA_PATTERNS) {
        if (pattern.test(input)) {
            return {
                safe: false,
                reason: "personal_data",
                message: "No puedo modificar tu información personal (nombre, email, etc.). Esa sección se edita manualmente. ¿Te ayudo con experiencias o proyectos?"
            };
        }
    }

    return { safe: true };
}

// Sanitize input: remove dangerous chars, limit length
function sanitizeInput(input: string): string {
    return input
        .replace(/[<>{}[\]\\]/g, "")  // Remove dangerous chars
        .replace(/```/g, "")           // Remove code blocks that could escape
        .replace(/---/g, "")           // Remove markdown separators
        .replace(/\n{3,}/g, "\n\n")    // Collapse multiple newlines
        .trim()
        .slice(0, 1500);               // Reduced limit for tighter control
}

// System prompt for CV assistance - PROGRESSIVE FIELD UPDATES
const CV_SYSTEM_PROMPT = `Eres Asistente CV, especializado en ayudar a crear experiencias laborales y proyectos para CVs tech.

# TU ROL PRINCIPAL

Cuando el usuario describe su trabajo o proyecto, PROCESA INMEDIATAMENTE la información y actualiza los campos del formulario en tiempo real. NO pidas más info repetidamente - usa lo que tienes.

# FLUJO PROGRESIVO (MUY IMPORTANTE)

1. Usuario menciona algo → EXTRAE inmediatamente todos los datos posibles
2. Actualiza el borrador con action="update_draft"
3. Solo pregunta por campos CRÍTICOS que faltan (fechas, logros concretos)
4. Cuando tengas lo esencial, genera con action="add_experience" o "add_project"

# CAMPOS MÍNIMOS REQUERIDOS

## Experiencia:
- company (nombre empresa/cliente) ✓ REQUERIDO
- position (cargo) ✓ REQUERIDO  
- startDate (puede ser aproximado: "2023") → REQUERIDO
- description (1-2 líneas de lo que hizo)
- achievements (al menos 1 logro)
- technologies (si mencionó alguna)

## Proyecto:
- name ✓ REQUERIDO
- description (qué hace)
- technologies (al menos 1)

# FORMATO JSON

SIEMPRE responde con JSON válido:

## update_draft (USAR FRECUENTEMENTE - actualiza campos mientras conversas):
{
  "action": "update_draft",
  "data": {
    "company": "Valor extraído o null si no lo dijo",
    "position": "Valor extraído o null",
    "description": "Descripción basada en lo que dijo",
    "technologies": ["Tech1", "Tech2"],
    "achievements": ["Logro extraído"],
    "startDate": "2023-01 o null",
    "endDate": "2024-06 o null",
    "current": false
  },
  "message": "Pregunta específica sobre lo que falta (ej: ¿En qué fechas trabajaste ahí?)"
}

## add_experience (SOLO cuando tienes company, position y startDate):
{
  "action": "add_experience",
  "data": {
    "company": "Nombre empresa",
    "position": "Cargo",
    "startDate": "2023-01",
    "endDate": "2024-06",
    "current": false,
    "description": "Descripción pulida de 1-2 líneas",
    "achievements": ["Logro 1", "Logro 2", "Logro 3"]
  },
  "message": "¡Listo! He agregado tu experiencia en [empresa]."
}

## add_project (cuando tienes name y description):
{
  "action": "add_project",
  "data": {
    "name": "Nombre proyecto",
    "description": "Descripción clara",
    "technologies": ["Tech1", "Tech2"],
    "url": "",
    "highlights": ["Punto 1", "Punto 2"]
  },
  "message": "¡Proyecto agregado!"
}

# EJEMPLOS DE FLUJO CORRECTO

Usuario: "Trabajo como desarrollador freelance"
→ update_draft: { position: "Desarrollador Freelance" }
→ message: "¡Genial! ¿Con qué empresa o cliente has trabajado principalmente?"

Usuario: "hice una página ecommerce llamada Ele's"  
→ update_draft: { company: "Ele's", description: "Desarrollo de e-commerce" }
→ message: "Ele's, ¿en qué año fue esto?"

Usuario: "fui diseñador, desarrollador, incorporé webpay"
→ update_draft: { position: "Diseñador y Desarrollador Full Stack", technologies: ["Webpay"], achievements: ["Integración de pasarela de pagos Webpay"] }
→ message: "Excelente. ¿En qué período trabajaste en Ele's? (ej: 2023-2024)"

Usuario: "2023"
→ add_experience con todos los datos recopilados

# REGLAS CRÍTICAS

1. NUNCA respondas solo "Cuéntame más..." - siempre procesa algo
2. NUNCA inventes información - solo usa lo que el usuario dijo
3. SIEMPRE incluye "data" con los campos que pudiste extraer
4. Sé conciso en los mensajes - no más de 2 líneas
5. Si el usuario dice "eso" o "listo" = tiene suficiente info, genera el resultado

# RESTRICCIONES DE SEGURIDAD

- Solo CVs: experiencias y proyectos
- No generas código ejecutable
- No cambias información personal
- Respondes SOLO en JSON válido`;

export interface CvAIResult {
    success: boolean;
    action?: "add_experience" | "add_project" | "update_draft" | "improve_text" | "ask_details" | "conversation" | "error";
    data?: Record<string, unknown>;
    message?: string;
    error?: string;
    latencyMs: number;
}

export interface CvChatInput {
    userMessage: string;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
    currentContext?: {
        hasExperience: boolean;
        hasSkills: boolean;
        hasProjects: boolean;
        skillCategories: string[];
        activeSection?: "experience" | "projects";
    };
}

export async function generateCvSuggestion(
    input: CvChatInput
): Promise<CvAIResult> {
    const startTime = Date.now();

    try {
        const userMessage = sanitizeInput(input.userMessage);

        // Build context
        let contextInfo = "";
        if (input.currentContext) {
            const ctx = input.currentContext;
            contextInfo = `\n\nCONTEXTO ACTUAL DEL CV:
- Experiencias: ${ctx.hasExperience ? "Sí" : "No tiene"}
- Skills: ${ctx.hasSkills ? `Sí (${ctx.skillCategories.join(", ")})` : "No tiene"}
- Proyectos: ${ctx.hasProjects ? "Sí" : "No tiene"}
- Sección activa: ${ctx.activeSection === "experience" ? "EXPERIENCIAS" : "PROYECTOS"}`;
        }

        // Build messages array with conversation history
        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
            { role: "system", content: CV_SYSTEM_PROMPT },
        ];

        // Add conversation history (limit to last 6 messages to save tokens)
        if (input.conversationHistory && input.conversationHistory.length > 0) {
            const recentHistory = input.conversationHistory.slice(-6);
            for (const msg of recentHistory) {
                messages.push({ role: msg.role, content: msg.content });
            }
        }

        // Add current message with context
        messages.push({ role: "user", content: userMessage + contextInfo });

        // Try each provider with fallback
        let content: string | null = null;
        let usedProvider: string | null = null;

        for (const provider of PROVIDERS) {
            const apiKey = provider.getApiKey();
            if (!apiKey) continue;

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

                const response = await fetch(provider.url, {
                    method: "POST",
                    headers: provider.headers(apiKey),
                    body: JSON.stringify({
                        model: provider.model,
                        messages,
                        max_tokens: 500, // Reduced for security
                        temperature: 0.7,
                    }),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    const responseContent = data.choices?.[0]?.message?.content;
                    if (responseContent) {
                        content = responseContent;
                        usedProvider = provider.name;
                        break;
                    }
                }
            } catch (err) {
                console.error(`[CV-AI] ${provider.name} error:`, err);
            }
        }

        if (!content) {
            return {
                success: false,
                error: "No se pudo conectar con ningún proveedor de IA",
                latencyMs: Date.now() - startTime,
            };
        }

        console.log(`[CV-AI] Used provider: ${usedProvider}`);

        // Parse JSON response
        let parsed;
        try {
            // Clean potential markdown code blocks
            let cleanContent = content
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

        // Handle error response from AI
        if (parsed.action === "error") {
            return {
                success: false,
                action: "error",
                message: parsed.message || "No puedo realizar esa acción",
                error: parsed.data?.reason || "Solicitud no permitida",
                latencyMs: Date.now() - startTime,
            };
        }

        return {
            success: true,
            action: parsed.action,
            data: parsed.data,
            message: parsed.message,
            latencyMs: Date.now() - startTime,
        };
    } catch (error) {
        console.error("CV AI error:", error);
        return {
            success: false,
            error: "Error interno del servicio de IA",
            latencyMs: Date.now() - startTime,
        };
    }
}

// ===========================================
// OUTPUT SANITIZATION
// ===========================================

/**
 * Patterns that should never appear in AI output
 */
const DANGEROUS_OUTPUT_PATTERNS = [
    /<script\b[^>]*>/gi,           // Script tags
    /javascript:/gi,                // JS protocol
    /on\w+\s*=/gi,                  // Event handlers (onclick, onerror, etc)
    /data:text\/html/gi,            // Data URLs with HTML
    /<iframe\b[^>]*>/gi,            // Iframes
    /<object\b[^>]*>/gi,            // Object tags
    /<embed\b[^>]*>/gi,             // Embed tags
    /eval\s*\(/gi,                  // Eval calls
    /document\.(cookie|write)/gi,   // Document manipulation
    /window\.(location|open)/gi,    // Window manipulation
];

/**
 * Sanitize a string value from AI output
 */
function sanitizeOutputString(value: string): string {
    let sanitized = value;

    // Check for and remove dangerous patterns
    for (const pattern of DANGEROUS_OUTPUT_PATTERNS) {
        sanitized = sanitized.replace(pattern, "[BLOCKED]");
    }

    // Remove any HTML-like tags that slipped through
    sanitized = sanitized.replace(/<[^>]*>/g, "");

    return sanitized;
}

/**
 * Recursively sanitize an object's string values
 */
function sanitizeOutputObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "string") {
            result[key] = sanitizeOutputString(value);
        } else if (Array.isArray(value)) {
            result[key] = value.map(item =>
                typeof item === "string"
                    ? sanitizeOutputString(item)
                    : typeof item === "object" && item !== null
                        ? sanitizeOutputObject(item as Record<string, unknown>)
                        : item
            );
        } else if (typeof value === "object" && value !== null) {
            result[key] = sanitizeOutputObject(value as Record<string, unknown>);
        } else {
            result[key] = value;
        }
    }

    return result;
}

/**
 * Sanitize the entire AI response before sending to client
 * Prevents potential XSS or injection through AI-generated content
 */
export function sanitizeAIOutput(result: CvAIResult): CvAIResult {
    const sanitized: CvAIResult = {
        success: result.success,
        latencyMs: result.latencyMs,
    };

    // Sanitize message
    if (result.message) {
        sanitized.message = sanitizeOutputString(result.message);
    }

    // Sanitize error
    if (result.error) {
        sanitized.error = sanitizeOutputString(result.error);
    }

    // Sanitize action (should be from allowed list anyway)
    if (result.action) {
        const allowedActions = [
            "add_experience", "add_project", "update_draft",
            "improve_text", "ask_details", "conversation", "error"
        ];
        sanitized.action = allowedActions.includes(result.action)
            ? result.action
            : "error";
    }

    // Sanitize data object
    if (result.data) {
        sanitized.data = sanitizeOutputObject(result.data);
    }

    return sanitized;
}

