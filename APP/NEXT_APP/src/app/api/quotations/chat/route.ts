import { NextRequest, NextResponse } from "next/server";
import { secureApiEndpoint } from "@/lib/api-security";

// ============= AI PROVIDER CONFIGURATION =============
// Primary: Groq (fast, free tier)
// Fallback: OpenRouter (more models, paid)

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
            "X-Title": "Quotation Chat",
        }),
    },
];

const IS_DEV = process.env.NODE_ENV !== 'production';

// ===========================================
// SECURITY: Input sanitization
// ===========================================

const BLOCKED_PATTERNS = [
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
    /cuent[oa]\s*(de\s*la\s*abuela|historia|de|para\s*dormir)/gi,
    /llave\s*de\s*(windows|producto|activaci[oó]n)/gi,
    /serial\s*(key|number)/gi,
    /crack|keygen|pirat[ea]/gi,
    // Poem/song/story-based jailbreak attempts
    /escrib[ea]\s*(un\s*)?(poema|canci[oó]n|historia|cuento|relato|verso)/gi,
    /en\s*forma\s*de\s*(poema|canci[oó]n|rap|verso|rima)/gi,
    /hazlo\s*(como|en)\s*(poema|canci[oó]n|rap|historia)/gi,
    /canta(me)?\s*(sobre|acerca|una)/gi,
    /recita(me)?\s*(un|una)/gi,
    /formato\s*(po[eé]tico|l[ií]rico|narrativo)/gi,
    /estilo\s*(shakesp|homer|dante|neruda)/gi,
    /como\s*si\s*fueras\s*(poeta|cantante|escritor)/gi,
    /write\s*(a\s*)?(poem|song|story|tale)/gi,
    /in\s*the\s*form\s*of\s*(a\s*)?(poem|song|rap)/gi,
    /sing\s*(me\s*)?(about|a)/gi,
];

const OFF_TOPIC_PATTERNS = [
    /pol[ií]tic[ao]/gi,
    /religi[oó]n|iglesia|dios|ateo/gi,
    /sexo|porn|xxx|nsfw/gi,
    /drogas?|marihuana|coca[ií]na/gi,
    /armas?|pistola|rifle/gi,
    /hack(ear|ing)?|robar|estafar/gi,
    /contrase[ñn]a\s*(de\s*)?(wifi|banco|cuenta)/gi,
    /c[oó]mo\s*(hackear|robar|piratear)/gi,
    // Political figures
    /trump|biden|boric|piñera|maduro/gi,
    /elecciones|votar\s*por|partido\s*pol/gi,
];

function sanitizeInput(input: string): { sanitized: string; blocked: boolean; reason?: string } {
    // Check for blocked patterns
    for (const pattern of BLOCKED_PATTERNS) {
        if (pattern.test(input)) {
            return {
                sanitized: "",
                blocked: true,
                reason: "prompt_injection"
            };
        }
    }

    // Check for off-topic patterns
    for (const pattern of OFF_TOPIC_PATTERNS) {
        if (pattern.test(input)) {
            return {
                sanitized: "",
                blocked: true,
                reason: "off_topic"
            };
        }
    }

    // Sanitize: limit length, remove potential injections
    let sanitized = input.slice(0, 2000); // Max 2000 chars

    // Remove any markdown that could try to escape context
    sanitized = sanitized.replace(/```/g, "");
    sanitized = sanitized.replace(/---/g, "");

    return { sanitized, blocked: false };
}

// ===========================================
// Parser for AI response (handles JSON and text)
// ===========================================

function parseTOON(text: string): Record<string, unknown> | null {
    // TOON = Text Object Oriented Notation (fallback parser)
    const result: Record<string, unknown> = {};

    // Try to extract message
    const messageMatch = text.match(/message[:\s]*["']?([^"'\n]+)["']?/i);
    if (messageMatch) {
        result.message = messageMatch[1].trim();
    }

    // Try to extract actions array pattern
    const actionsMatch = text.match(/actions[:\s]*\[([\s\S]*?)\]/i);
    if (actionsMatch) {
        try {
            // Try to parse as JSON array
            const actionsStr = `[${actionsMatch[1]}]`.replace(/'/g, '"');
            result.actions = JSON.parse(actionsStr);
        } catch {
            result.actions = [];
        }
    }

    // Try to extract autoApply
    const autoApplyMatch = text.match(/autoApply[:\s]*(\{[^}]+\})/i);
    if (autoApplyMatch) {
        try {
            result.autoApply = JSON.parse(autoApplyMatch[1].replace(/'/g, '"'));
        } catch {
            result.autoApply = null;
        }
    }

    return Object.keys(result).length > 0 ? result : null;
}

function _parseAIResponse(content: string): {
    message: string;
    actions: Array<{
        type: string;
        label: string;
        data: Record<string, unknown>;
    }>;
    autoApply?: Record<string, unknown>;
} {
    // Clean the content first
    const cleanContent = content
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/gi, "")
        .trim();

    // Try to find JSON object
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                message: parsed.message || content,
                actions: parsed.actions || [],
                autoApply: parsed.autoApply || undefined,
            };
        } catch {
            // Try TOON parser
            const toonResult = parseTOON(cleanContent);
            if (toonResult) {
                return {
                    message: (toonResult.message as string) || content,
                    actions: (toonResult.actions as Array<{ type: string; label: string; data: Record<string, unknown> }>) || [],
                    autoApply: toonResult.autoApply as Record<string, unknown> | undefined,
                };
            }
        }
    }

    // Fallback: return as plain message
    return {
        message: cleanContent || content,
        actions: [],
    };
}

// ===========================================
// SYSTEM PROMPT: State-based conversation flow
// ===========================================

const SYSTEM_PROMPT = `Eres QuoteBot, un asistente experto en cotizaciones de desarrollo web para Chile.

# FLUJO DE ESTADOS (sigue ESTRICTAMENTE este orden)

Estados en orden: TIPO → CLIENTE → PROYECTO → SERVICIOS → ALCANCE → COMPLETO

Para cada estado, pregunta SOLO lo que falta. Usa el campo [ESTADO ACTUAL] para saber qué está pendiente.

# COMPORTAMIENTO POR ESTADO

## Estado TIPO (si no hay tipo definido):
- Si el usuario menciona "e-commerce", "landing", "sitio web", etc → el tipo YA está detectado, pasa al siguiente
- Si es ambiguo → pregunta con botones: E-commerce, Sitio Web, Landing Page, Aplicación Web

## Estado CLIENTE (si cliente está ❌):
Pregunta: "¿Nombre del cliente o empresa?"
Botón: {"type":"fill_field","label":"📝 Ingresar nombre","data":{}}

## Estado PROYECTO (si proyecto está ❌):
Pregunta: "¿Cómo se llama el proyecto?"
Botón: {"type":"fill_field","label":"📝 Ingresar nombre","data":{}}

## Estado SERVICIOS (si servicios está ❌):
Ofrece servicios según el tipo de proyecto como botones add_service con precios:

Para E-COMMERCE:
- Diseño UI/UX: $400.000
- Desarrollo E-commerce: $600.000
- Pasarela de pagos: $180.000
- Panel admin: $200.000
- SEO básico: $120.000

Para SITIO WEB:
- Diseño web: $350.000
- Desarrollo frontend: $450.000
- CMS personalizado: $150.000
- SEO: $120.000

Para LANDING PAGE:
- Diseño landing: $180.000
- Desarrollo: $220.000
- Formulario contacto: $60.000

Ejemplo botón servicio:
{"type":"add_service","label":"🛒 E-commerce $600.000","data":{"title":"Desarrollo E-commerce","description":"Tienda online completa","deliverables":["Catálogo","Carrito","Checkout"],"price":600000}}

IMPORTANTE sobre servicios:
- Si el usuario dice "todo incluido en X" o da un precio total → crea UN servicio con ese precio total llamado "Proyecto completo" 
- Si el usuario lista varios servicios sin precios → agrégalos todos con el precio dividido equitativamente
- Ofrece también: {"type":"fill_field","label":"💰 Precio total del proyecto","data":{}}

## Estado ALCANCE (si alcance está ❌):
Pregunta: "¿Cuál es el alcance del proyecto?"
Ofrece opciones comunes:
{"type":"fill_field","label":"🌐 Venta online","data":{"scope":"Plataforma de venta por internet con catálogo, carrito y pagos"}}
{"type":"fill_field","label":"📱 Responsive","data":{"scope":"Sitio adaptable a móviles, tablets y desktop"}}
{"type":"fill_field","label":"✍️ Describir alcance","data":{}}

## Estado COMPLETO (todos los campos ✅):
Responde: "¡Cotización lista! 🎉"
Botón: {"type":"fill_field","label":"✅ Revisar cotización","data":{}}

# REGLAS DE REDIRECCIÓN

Si el usuario se desvía del tema O dice algo que no entiendes:
→ Responde brevemente y redirige: "Entendido. Continuemos: [pregunta del campo pendiente]"

Si el usuario dice "no sé" o pide ayuda:
→ Ofrece opciones predefinidas como botones

Si el usuario corrige algo ya completado:
→ Usa autoApply para corregirlo y continúa al siguiente campo

# FORMATO DE RESPUESTA (JSON obligatorio)

{
  "message": "Pregunta breve (máx 1 línea)",
  "actions": [array de botones],
  "autoApply": {"campo": "valor"} // si hay que guardar algo
}

# REGLAS CRÍTICAS

1. SIEMPRE responde en JSON válido
2. Máximo 1-2 líneas de mensaje
3. SIEMPRE ofrece botones, NUNCA listas de texto
4. NUNCA confirmes que algo se guardó - solo pregunta el siguiente
5. Si el usuario da información → usa autoApply y pregunta el SIGUIENTE campo
6. Lee el [ESTADO ACTUAL] para saber qué está pendiente`;




interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

export async function POST(request: NextRequest) {
    try {
        // SECURITY: Verify session + permission
        const security = await secureApiEndpoint(request, {
            requireAuth: true,
            requiredPermission: "quotations.create",
        });

        if (security.error) return security.error;

        const body = await request.json();
        const { messages, currentData } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Mensajes requeridos" }, { status: 400 });
        }

        // Rate limiting check (simple in-memory, enhance with Redis in production)
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage?.content) {
            return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
        }

        // Security: Sanitize user input
        const { blocked, sanitized: _sanitized, reason } = sanitizeInput(lastMessage.content);

        if (blocked) {
            if (reason === "prompt_injection") {
                return NextResponse.json({
                    message: "Por favor, mantengamos la conversación enfocada en tu proyecto de desarrollo web. ¿Qué tipo de sitio necesitas?",
                    actions: [],
                    autoApply: null,
                });
            }
            if (reason === "off_topic") {
                return NextResponse.json({
                    message: "Solo puedo ayudarte con cotizaciones de desarrollo web. ¿Tienes algún proyecto en mente?",
                    actions: [],
                    autoApply: null,
                });
            }
        }

        // Build detailed context from form data showing what's filled vs pending
        let contextInfo = "\n[ESTADO ACTUAL DEL FORMULARIO:";
        if (currentData) {
            // If projectType is set, tell the AI explicitly to NOT ask about it
            if (currentData.projectType) {
                contextInfo += `\n- Tipo de proyecto: ✅ ${currentData.projectType} (YA CONFIGURADO - NO preguntar)`;
            }
            contextInfo += `\n- Cliente: ${currentData.clientName ? `✅ ${currentData.clientName}` : "❌ PENDIENTE"}`;
            contextInfo += `\n- Proyecto: ${currentData.projectName ? `✅ ${currentData.projectName}` : "❌ PENDIENTE"}`;
            contextInfo += `\n- Servicios: ${currentData.itemsCount > 0 ? `✅ ${currentData.itemsCount} (${(currentData.items || []).join(", ")})` : "❌ PENDIENTE"}`;
            contextInfo += `\n- Alcance: ${currentData.scope ? `✅ (definido)` : "❌ PENDIENTE"}`;
            contextInfo += `\n- Plazo: ${currentData.timeline ? `✅ ${currentData.timeline}` : "❌ PENDIENTE"}`;
            contextInfo += `\n- Pago: ${currentData.paymentTerms ? `✅ ${currentData.paymentTerms}` : "❌ PENDIENTE"}`;
        }
        contextInfo += "\n]";
        contextInfo += "\n⚠️ SOLO pregunta por el PRIMER campo PENDIENTE (❌). NO repitas campos marcados con ✅.";

        // MEMORY MANAGEMENT: Summarize older messages when conversation gets long
        let conversationContext = "";
        let recentMessages: ChatMessage[];

        if (messages.length > 8) {
            // Summarize older messages (everything except last 4)
            const olderMessages = messages.slice(0, -4);
            const summary = olderMessages
                .filter((m: ChatMessage) => m.role === "user")
                .map((m: ChatMessage) => m.content.slice(0, 50))
                .join("; ");
            conversationContext = `\n[Historial resumido: ${summary.slice(0, 200)}...]`;
            recentMessages = messages.slice(-4).map((m: ChatMessage) => ({
                role: m.role,
                content: m.role === "user" ? sanitizeInput(m.content).sanitized : m.content,
            }));
        } else {
            // Use last 6 messages when conversation is short
            recentMessages = messages.slice(-6).map((m: ChatMessage) => ({
                role: m.role,
                content: m.role === "user" ? sanitizeInput(m.content).sanitized : m.content,
            }));
        }

        const apiMessages: ChatMessage[] = [
            { role: "system", content: SYSTEM_PROMPT + contextInfo + conversationContext },
            ...recentMessages,
        ];

        // SECURITY: Only log in development
        if (IS_DEV) console.log('[QuotationChat] Sending request, messages:', apiMessages.length);

        // Try each provider with fallback
        let response: Response | null = null;
        let responseData: Record<string, unknown> | null = null;
        let usedProvider: AIProvider | null = null;

        for (const provider of PROVIDERS) {
            const apiKey = provider.getApiKey();
            if (!apiKey) {
                if (IS_DEV) console.log(`[QuotationChat] Skipping ${provider.name}: no API key`);
                continue;
            }

            try {
                if (IS_DEV) console.log(`[QuotationChat] Trying ${provider.name}...`);

                response = await fetch(provider.url, {
                    signal: AbortSignal.timeout(60_000),
                    method: "POST",
                    headers: provider.headers(apiKey),
                    body: JSON.stringify({
                        model: provider.model,
                        messages: apiMessages,
                        max_tokens: 800,
                        temperature: 0.7,
                    }),
                });

                responseData = await response.json() as Record<string, unknown>;

                // Check if response is valid
                const choices = responseData.choices as Array<{ message?: { content?: string } }> | undefined;
                if (response.ok && choices?.[0]?.message?.content) {
                    usedProvider = provider;
                    if (IS_DEV) console.log(`[QuotationChat] Success with ${provider.name}`);
                    break;
                }

                // Provider returned error, try next
                const error = responseData.error as { message?: string } | undefined;
                if (IS_DEV) console.log(`[QuotationChat] ${provider.name} failed:`, error?.message || 'Unknown error');

            } catch (err) {
                if (IS_DEV) console.log(`[QuotationChat] ${provider.name} error:`, err);
            }
        }

        if (!responseData || !usedProvider) {
            return NextResponse.json({
                message: "Error: No se pudo conectar con ningún proveedor de IA. Intenta de nuevo.",
                actions: [],
            });
        }

        // SECURITY: Never log full API responses in production
        if (IS_DEV) console.log('[QuotationChat] Final provider:', usedProvider.name);

        // Extract content from response
        const choices = responseData.choices as Array<{ message?: { content?: string } }> | undefined;
        const content = choices?.[0]?.message?.content;

        // DEBUG: Log raw response
        if (IS_DEV) {
            console.log('[QuotationChat] Raw content:', JSON.stringify(content).slice(0, 500));
        }

        if (!content) {
            console.error('[QuotationChat] No content in response:', JSON.stringify(responseData));
            return NextResponse.json({
                message: "El modelo no generó una respuesta. ¿Puedes reformular tu pregunta?",
                actions: []
            });
        }

        // Parse TOON or JSON response
        try {
            // Clean up the content
            const cleanContent = content
                .replace(/```toon\s*/gi, "")
                .replace(/```json\s*/gi, "")
                .replace(/```\s*/gi, "")
                .replace(/<think>[\s\S]*?<\/think>/gi, "")
                .replace(/\[TOOL_CALLS?\]/gi, "")
                .replace(/\[\/TOOL_CALLS?\]/gi, "")
                .trim();

            // Try TOON format first (more token-efficient)
            const toonParsed = parseTOON(cleanContent);
            if (toonParsed) {
                return NextResponse.json({
                    message: toonParsed.message || content,
                    actions: toonParsed.actions || [],
                    autoApply: toonParsed.autoApply || null,
                });
            }

            // Fallback to JSON parsing with enhanced cleaning
            const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                // Clean trailing commas before ] and } which cause JSON.parse to fail
                const cleanedJson = jsonMatch[0]
                    .replace(/,\s*]/g, "]")  // Remove trailing comma before ]
                    .replace(/,\s*}/g, "}")  // Remove trailing comma before }
                    .replace(/[\r\n]+/g, " ") // Replace newlines with spaces
                    .replace(/\s+/g, " ");    // Collapse multiple spaces

                try {
                    const parsed = JSON.parse(cleanedJson);
                    return NextResponse.json({
                        message: parsed.message || content,
                        actions: parsed.actions || [],
                        autoApply: parsed.autoApply || null,
                    });
                } catch {
                    if (IS_DEV) console.log('[QuotationChat] JSON parse fallback applied');
                }
            }
        } catch {
            // Parsing failed, will return as plain message
        }

        // Fallback: clean raw content before returning
        const fallbackMessage = content
            .replace(/```toon\s*/gi, "")
            .replace(/```\s*/gi, "")
            .replace(/message:\s*/i, "")
            .replace(/actions\[\d*\]:[\s\S]*/i, "")
            .replace(/autoApply:[\s\S]*/i, "")
            .trim();

        return NextResponse.json({
            message: fallbackMessage,
            actions: [],
        });
    } catch (error) {
        console.error('[QuotationChat] Chat error:', error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: "Error interno" },
            { status: 500 }
        );
    }
}
