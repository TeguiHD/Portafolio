/**
 * OCR Service for Receipt Scanning
 * Uses OpenRouter API with Vision models for text extraction
 * Parses Chilean receipt formats (SII)
 * Includes validation, document type detection, and barcode extraction
 * 
 * SECURITY: Includes protection against prompt injection and malicious content
 */

// OpenRouter API configuration
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
// Use a vision-capable model
const VISION_MODEL = "google/gemini-2.0-flash-001";

// Document types
export type DocumentType = "boleta" | "factura" | "ticket" | "unknown";

// ============================================================================
// SECURITY: Patterns to detect and block malicious content
// These patterns are designed to catch intentional injection attempts
// while allowing normal receipt/invoice content to pass through
// ============================================================================
const SECURITY = {
    // Patterns that indicate prompt injection attempts
    // These are phrases that would only appear in intentional manipulation
    PROMPT_INJECTION_PATTERNS: [
        /ignore\s+(all\s+)?(previous|above)\s+(instructions?|prompts?)/i,
        /disregard\s+(all\s+)?(previous|above)/i,
        /new\s+instructions?\s*:/i,
        /\bsystem\s*:\s*\[/i, // system: [ - typical prompt injection format
        /you\s+are\s+now\s+(a|an)\s+/i,
        /pretend\s+(you\s+are|to\s+be)\s+(a|an)/i,
        /act\s+as\s+(if\s+you|a\s+different)/i,
        /forget\s+(everything|all|your)\s+(about|previous|instructions)/i,
        /override\s+(your\s+)?(previous|system)\s+/i,
        /\bjailbreak\b/i,
        /\bDAN\s+mode\b/i,
        /\bdeveloper\s+mode\s+enabled\b/i,
        /respond\s+without\s+(any\s+)?restrictions/i,
    ],

    // Script/code injection patterns - only actual code/HTML injection
    SCRIPT_INJECTION_PATTERNS: [
        /<script[\s>]/i,
        /<\/script>/i,
        /javascript\s*:/i,
        /(onclick|onerror|onload|onmouseover)\s*=/i, // Specific event handlers only
        /\beval\s*\(\s*['"]/i, // eval(" or eval('
        /document\s*\.\s*(cookie|write|location)/i,
        /window\s*\.\s*(location|open)\s*=/i,
        /\.innerHTML\s*=/i,
    ],

    // SQL injection patterns (extra protection, we use parameterized queries)
    SQL_INJECTION_PATTERNS: [
        /'\s*OR\s*'1'\s*=\s*'1/i,
        /"\s*OR\s*"1"\s*=\s*"1/i,
        /UNION\s+ALL\s+SELECT/i,
        /;\s*DROP\s+TABLE/i,
        /;\s*DELETE\s+FROM\s+/i,
        /;\s*UPDATE\s+\w+\s+SET\s+/i,
        /--\s*$/m, // SQL comment at end of line
    ],

    // Maximum lengths for each field
    MAX_LENGTHS: {
        merchant: 100,
        description: 200,
        documentNumber: 50,
        barcodeData: 100,
        siiCode: 100,
        rut: 15,
        category: 50,
        rawText: 1000,
        itemDescription: 100,
    },

    // Allowed characters for specific fields
    ALLOWED_PATTERNS: {
        documentNumber: /^[A-Za-z0-9_-]+$/,
        barcodeData: /^[A-Za-z0-9_-]+$/,
        rut: /^[\d.Kk-]+$/,
        amount: /^[\d.,]+$/,
    },
};

// Types for OCR extracted items
export interface OCRItem {
    code?: string;           // Código del producto
    description: string;     // Descripción del producto/servicio
    quantity: number;        // Cantidad
    unitPrice: number;       // Precio unitario
    discount?: number;       // Descuento si aplica
    additionalTax?: number;  // Impuesto adicional (ej: impuesto específico)
    total: number;           // Valor total de la línea
}

// Types for location info
export interface OCRLocation {
    city?: string;           // Ciudad
    commune?: string;        // Comuna
    address?: string;        // Dirección
    region?: string;         // Región
}

// Types for merchant/business info
export interface OCRMerchant {
    name: string;            // Nombre del comercio
    businessName?: string;   // Razón social
    rut: string | null;      // RUT del emisor
    businessType?: string;   // Giro/tipo de negocio
    phone?: string;          // Teléfono
    email?: string;          // Email
    location?: OCRLocation;  // Ubicación
}

// Types for financial breakdown
export interface OCRFinancials {
    subtotal: number;        // Monto neto (sin IVA)
    tax: number;             // IVA (19%)
    additionalTaxes?: Array<{
        name: string;        // Nombre del impuesto
        rate?: number;       // Tasa (%)
        amount: number;      // Monto
    }>;
    discount?: number;       // Descuento total
    tip?: number;            // Propina si aplica
    total: number;           // Total final
}

// Types for customer info (for facturas)
export interface OCRCustomer {
    name?: string;           // Nombre del cliente
    rut?: string;            // RUT del cliente
    address?: string;        // Dirección
    businessType?: string;   // Giro
}

export interface OCRResult {
    success: boolean;
    data?: {
        // Document validation
        isValidDocument: boolean;
        documentType: DocumentType;
        validationMessage?: string;

        // Document info
        documentNumber: { value: string | null; confidence: number }; // Folio
        emissionDate: { value: string; confidence: number };          // Fecha emisión
        paymentDate?: string;                                          // Fecha de pago (si difiere)

        // Merchant/Business info
        merchant: { value: OCRMerchant; confidence: number };

        // Customer info (mainly for facturas)
        customer?: OCRCustomer;

        // Transaction details
        purchaseType?: string;    // Tipo de venta (DEL GIRO, etc.)
        paymentMethod?: string;   // Forma de pago (Crédito, Débito, Efectivo, etc.)

        // Items/Products
        items: OCRItem[];

        // Financial breakdown
        financials: OCRFinancials;

        // Legacy fields (for compatibility)
        amount: { value: number; confidence: number };
        date: { value: string; confidence: number };
        rut: { value: string | null; confidence: number };
        suggestedCategory: { value: string; confidence: number };

        // Document identifiers
        barcodeData: { value: string | null; confidence: number };
        siiCode: { value: string | null; confidence: number };

        // Deprecated - use financials instead
        subtotal?: number;
        tax?: number;

        rawText: string;
    };
    error?: string;
    processingTime: number;
    securityFlags?: string[];
}

// Validation thresholds
const VALIDATION = {
    MIN_AMOUNT: 10, // Minimum amount in CLP
    MAX_AMOUNT: 100000000, // Maximum realistic amount
    MIN_CONFIDENCE_FOR_VALID: 0.5, // Minimum confidence to consider valid
    REQUIRED_FIELDS_FOR_VALID: ["amount", "merchant"], // Must have these
};

// ============================================================================
// SECURITY FUNCTIONS
// ============================================================================

/**
 * Check for prompt injection attempts in text
 */
function detectPromptInjection(text: string): boolean {
    if (!text) return false;
    return SECURITY.PROMPT_INJECTION_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Check for script/code injection attempts
 */
function detectScriptInjection(text: string): boolean {
    if (!text) return false;
    return SECURITY.SCRIPT_INJECTION_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Check for SQL injection attempts
 */
function detectSQLInjection(text: string): boolean {
    if (!text) return false;
    return SECURITY.SQL_INJECTION_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Sanitize a string by removing potentially dangerous content
 */
function sanitizeString(text: string | null | undefined, maxLength: number = 200): string {
    if (!text) return "";

    let sanitized = String(text)
        // Remove null bytes
        .replace(/\0/g, "")
        // Remove control characters except newlines and tabs
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        // Remove HTML tags
        .replace(/<[^>]*>/g, "")
        // Escape HTML entities
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        // Remove potential script injections
        .replace(/javascript:/gi, "")
        .replace(/on\w+=/gi, "")
        // Trim whitespace
        .trim();

    // Truncate to max length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
}

/**
 * Sanitize a code/identifier field (more restrictive)
 */
function sanitizeCode(text: string | null | undefined, maxLength: number = 50): string | null {
    if (!text) return null;

    // Only allow alphanumeric, hyphens, and underscores
    const sanitized = String(text)
        .replace(/[^A-Za-z0-9\-_]/g, "")
        .substring(0, maxLength);

    return sanitized.length > 0 ? sanitized : null;
}

/**
 * Comprehensive security check on all extracted data
 * Returns an array of security flags if issues found
 */
function securityCheck(data: Record<string, unknown>): string[] {
    const flags: string[] = [];
    const jsonStr = JSON.stringify(data);

    // Check for prompt injection
    if (detectPromptInjection(jsonStr)) {
        flags.push("PROMPT_INJECTION_DETECTED");
        // Log which pattern matched for debugging
        SECURITY.PROMPT_INJECTION_PATTERNS.forEach((pattern, i) => {
            if (pattern.test(jsonStr)) {
                console.warn(`[OCR Security] Prompt injection pattern ${i} matched: ${pattern}`);
            }
        });
    }

    // Check for script injection
    if (detectScriptInjection(jsonStr)) {
        flags.push("SCRIPT_INJECTION_DETECTED");
        // Log which pattern matched for debugging
        SECURITY.SCRIPT_INJECTION_PATTERNS.forEach((pattern, i) => {
            if (pattern.test(jsonStr)) {
                console.warn(`[OCR Security] Script injection pattern ${i} matched: ${pattern}`);
            }
        });
    }

    // Check for SQL injection (don't block, just log)
    if (detectSQLInjection(jsonStr)) {
        flags.push("SQL_INJECTION_WARNING");
        console.warn("[OCR Security] SQL injection pattern detected - logging only");
    }

    // Check for suspiciously long fields
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === "string" && value.length > 500) {
            flags.push(`SUSPICIOUS_LENGTH:${key}`);
            console.warn(`[OCR Security] Suspiciously long field: ${key} (${value.length} chars)`);
        }
    }

    return flags;
}

/**
 * Process image with OpenRouter Vision API (Gemini)
 */
export async function processReceiptOCR(imageBase64: string): Promise<OCRResult> {
    const startTime = Date.now();

    try {
        const apiKey = process.env.DEEPSEEK_OPENROUTER_API_KEY;

        if (!apiKey) {
            console.error("[OCR] No OpenRouter API key configured");
            return {
                success: false,
                error: "Servicio de escaneo no configurado. Contacta al administrador.",
                processingTime: Date.now() - startTime,
            };
        }

        // Clean base64 image
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const imageMediaType = imageBase64.match(/^data:(image\/\w+);base64,/)?.[1] || "image/jpeg";

        // Call OpenRouter Vision API with enhanced prompt
        const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                "X-Title": "Finance OCR Scanner",
            },
            body: JSON.stringify({
                model: VISION_MODEL,
                messages: [
                    {
                        role: "system",
                        content: `Eres un experto en OCR de documentos financieros chilenos (facturas, boletas, tickets).
Tu tarea es extraer TODOS los datos posibles del documento de forma estructurada.

CRITERIOS DE DOCUMENTO VÁLIDO:
- Facturas electrónicas del SII
- Boletas electrónicas del SII  
- Boletas/tickets de cualquier comercio
- Comprobantes de pago con monto visible

NO SON VÁLIDOS: fotos de productos, menús, capturas de apps sin datos de transacción.

TIPOS DE DOCUMENTO:
- "boleta": Boleta de venta (consumidor final)
- "factura": Factura (con IVA desglosado, para empresas)
- "ticket": Ticket de máquina, estacionamiento, peaje
- "unknown": No es documento financiero

Responde SOLO con JSON válido usando esta estructura exacta:
{
  "isValidDocument": true,
  "documentType": "factura",
  "documentNumber": "221",
  "emissionDate": "2023-01-25",
  "paymentDate": null,
  
  "merchant": {
    "name": "ASESORIAS E INVERSIONES DN SPA",
    "businessName": "ASESORIAS E INVERSIONES DN SPA",
    "rut": "77.526.796-8",
    "businessType": "ASESORIA EN EMPRENDIMIENTO Y VENTA DE PRODUCTOS TECNOLOGICOS ON LINE",
    "phone": null,
    "email": "rodrigo@denegocios.cl",
    "location": {
      "address": "AHUMADA 254 806",
      "city": "SANTIAGO",
      "commune": "SANTIAGO CENTRO",
      "region": "Metropolitana"
    }
  },
  
  "customer": {
    "name": null,
    "rut": null,
    "address": "PUERTO MONTT",
    "businessType": "DEL GIRO"
  },
  
  "purchaseType": "DEL GIRO",
  "paymentMethod": "Crédito",
  
  "items": [
    {
      "code": "GENERICO-8",
      "description": "Asesoría 1 - Creación de Empresa en 1 día",
      "quantity": 1,
      "unitPrice": 38655,
      "discount": 0,
      "additionalTax": 0,
      "total": 38655
    }
  ],
  
  "financials": {
    "subtotal": 38655,
    "tax": 7344,
    "additionalTaxes": [],
    "discount": 0,
    "tip": 0,
    "total": 45999
  },
  
  "barcodeData": null,
  "siiCode": "Timbre Electrónico SII - Res.99 de 2014",
  "category": "Servicios Profesionales",
  
  "confidence": {
    "merchant": 0.95,
    "items": 0.90,
    "financials": 0.95,
    "documentNumber": 0.98
  }
}`
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `Analiza este documento chileno y extrae TODA la información disponible.

IMPORTANTE: Si es una FACTURA o BOLETA (electrónica o física), ES VÁLIDO.

Extrae estos datos si están disponibles:

1. INFORMACIÓN DEL DOCUMENTO:
   - Tipo (factura/boleta/ticket)
   - Número de folio
   - Fecha de emisión
   - Fecha de pago (si difiere)

2. INFORMACIÓN DEL EMISOR (MERCHANT):
   - Nombre comercial
   - Razón social
   - RUT
   - Giro/actividad
   - Dirección completa (calle, ciudad, comuna, región)
   - Teléfono y email si aparecen

3. INFORMACIÓN DEL CLIENTE (si es factura):
   - Nombre/Razón social
   - RUT
   - Dirección
   - Giro

4. DETALLE DE PRODUCTOS/SERVICIOS:
   - Código del producto
   - Descripción
   - Cantidad
   - Precio unitario
   - Descuento (si aplica)
   - Impuesto adicional (si aplica)
   - Total de línea

5. TOTALES:
   - Monto Neto (subtotal sin IVA)
   - IVA (19%)
   - Impuestos adicionales
   - Descuentos
   - Propina
   - TOTAL

6. OTROS:
   - Forma de pago
   - Tipo de venta
   - Código de barras
   - Timbre SII

Responde ÚNICAMENTE con el JSON, sin explicaciones adicionales.`
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${imageMediaType};base64,${cleanBase64}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 3000,
                temperature: 0.1,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("[OCR] API Error:", response.status, errorData);
            throw new Error(`Error de API: ${response.status}`);
        }

        const result = await response.json();
        const content = result.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error("No se recibió respuesta del modelo de visión");
        }

        // Parse and validate the response
        const parsed = parseAndValidateResponse(content);

        return {
            success: parsed.data?.isValidDocument ?? false,
            data: parsed.data,
            error: parsed.error,
            processingTime: Date.now() - startTime,
        };
    } catch (error) {
        console.error("[OCR] Error:", error);
        return {
            success: false,
            error: (error as Error).message || "Error al procesar la imagen",
            processingTime: Date.now() - startTime,
        };
    }
}

/**
 * Parse AI response and validate document
 * SECURITY: Applies sanitization and injection detection
 */
function parseAndValidateResponse(content: string): {
    data: OCRResult["data"] | undefined;
    error?: string;
    securityFlags?: string[];
} {
    const securityFlags: string[] = [];

    try {
        // Clean up potential markdown code blocks
        let jsonStr = content
            .replace(/```json\s*/gi, "")
            .replace(/```\s*/gi, "")
            .trim();

        // Try to extract JSON from the response
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }

        const data = JSON.parse(jsonStr);

        // Debug: Log what the AI returned
        console.log("[OCR] AI Response parsed:", {
            isValidDocument: data.isValidDocument,
            documentType: data.documentType,
            merchant: data.merchant?.name || data.merchant,
            financials: data.financials,
            items: data.items?.length || 0,
        });

        // ====================================================================
        // SECURITY: Check for injection attempts in the raw data
        // ====================================================================
        const rawSecurityFlags = securityCheck(data);
        securityFlags.push(...rawSecurityFlags);

        // If critical security issues detected, reject the data
        if (rawSecurityFlags.some(f =>
            f.includes("PROMPT_INJECTION") ||
            f.includes("SCRIPT_INJECTION")
        )) {
            console.error("[OCR Security] Rejecting response due to injection attempt");
            return {
                data: undefined,
                error: "Se detectó contenido sospechoso en la imagen. Por seguridad, no se procesará.",
                securityFlags,
            };
        }

        // Check if it's a valid document
        const isValidDocument = data.isValidDocument === true;
        const documentType = validateDocumentType(data.documentType);

        // If not valid, return early with validation message (sanitized)
        if (!isValidDocument) {
            return {
                data: createEmptyResponse(data.validationMessage || "La imagen no parece ser una boleta o factura válida"),
                error: sanitizeString(data.validationMessage, 100) || "Documento no válido",
                securityFlags,
            };
        }

        // Parse financials from new format or legacy format
        const financials = parseFinancials(data);
        const totalAmount = financials.total;

        // Validate amount
        if (totalAmount < VALIDATION.MIN_AMOUNT) {
            return {
                data: createEmptyResponse(`El monto (${totalAmount}) es muy bajo. Verifica que la imagen muestre claramente el total.`),
                error: "No se pudo detectar un monto válido",
                securityFlags,
            };
        }

        if (totalAmount > VALIDATION.MAX_AMOUNT) {
            return {
                data: undefined,
                error: `El monto detectado (${totalAmount.toLocaleString("es-CL")}) parece demasiado alto.`,
                securityFlags,
            };
        }

        // Parse merchant info
        const merchantInfo = parseMerchant(data);

        // Parse customer info (mainly for facturas)
        const customerInfo = parseCustomer(data);

        // Parse items
        const items = parseItems(data.items);

        // Parse confidence values
        const confidence = data.confidence || {};

        // Build validated and sanitized response
        const validatedData: OCRResult["data"] = {
            isValidDocument: true,
            documentType,

            // Document info
            documentNumber: {
                value: sanitizeCode(data.documentNumber, SECURITY.MAX_LENGTHS.documentNumber),
                confidence: Math.min(1, Math.max(0, Number(confidence.documentNumber) || 0.85)),
            },
            emissionDate: {
                value: normalizeDate(data.emissionDate || data.date),
                confidence: Math.min(1, Math.max(0, Number(confidence.date) || 0.8)),
            },
            paymentDate: data.paymentDate ? normalizeDate(data.paymentDate) : undefined,

            // Merchant info
            merchant: {
                value: merchantInfo,
                confidence: Math.min(1, Math.max(0, Number(confidence.merchant) || 0.85)),
            },

            // Customer info
            customer: customerInfo,

            // Transaction details
            purchaseType: sanitizeString(data.purchaseType, 50) || undefined,
            paymentMethod: sanitizeString(data.paymentMethod, 50) || undefined,

            // Items
            items,

            // Financials
            financials,

            // Legacy fields for compatibility
            amount: {
                value: totalAmount,
                confidence: Math.min(1, Math.max(0, Number(confidence.financials) || 0.9)),
            },
            date: {
                value: normalizeDate(data.emissionDate || data.date),
                confidence: Math.min(1, Math.max(0, Number(confidence.date) || 0.8)),
            },
            rut: {
                value: merchantInfo.rut,
                confidence: merchantInfo.rut ? 0.95 : 0,
            },
            suggestedCategory: {
                value: sanitizeString(data.category, SECURITY.MAX_LENGTHS.category) || "Otros",
                confidence: Math.min(1, Math.max(0, Number(confidence.category) || 0.7)),
            },

            // Document identifiers
            barcodeData: {
                value: sanitizeCode(data.barcodeData, SECURITY.MAX_LENGTHS.barcodeData),
                confidence: data.barcodeData ? 0.8 : 0,
            },
            siiCode: {
                value: sanitizeString(data.siiCode, SECURITY.MAX_LENGTHS.siiCode),
                confidence: data.siiCode ? 0.75 : 0,
            },

            // Legacy
            subtotal: financials.subtotal,
            tax: financials.tax,

            rawText: "",
        };

        return { data: validatedData, securityFlags };
    } catch (error) {
        console.error("[OCR] Parse error:", error);
        return {
            data: undefined,
            error: "No se pudo interpretar la respuesta del análisis. Intenta con una imagen más clara.",
        };
    }
}

/**
 * Create empty response for invalid documents
 */
function createEmptyResponse(validationMessage: string): OCRResult["data"] {
    return {
        isValidDocument: false,
        documentType: "unknown",
        validationMessage: sanitizeString(validationMessage, SECURITY.MAX_LENGTHS.description),
        documentNumber: { value: null, confidence: 0 },
        emissionDate: { value: new Date().toISOString().split("T")[0], confidence: 0 },
        merchant: {
            value: { name: "", rut: null },
            confidence: 0,
        },
        items: [],
        financials: { subtotal: 0, tax: 0, total: 0 },
        amount: { value: 0, confidence: 0 },
        date: { value: new Date().toISOString().split("T")[0], confidence: 0 },
        rut: { value: null, confidence: 0 },
        suggestedCategory: { value: "Otros", confidence: 0 },
        barcodeData: { value: null, confidence: 0 },
        siiCode: { value: null, confidence: 0 },
        rawText: "",
    };
}

/**
 * Parse financials from response data
 */
function parseFinancials(data: Record<string, unknown>): OCRFinancials {
    // Check for new format first
    if (data.financials && typeof data.financials === "object") {
        const fin = data.financials as Record<string, unknown>;
        return {
            subtotal: parseNumber(fin.subtotal) || 0,
            tax: parseNumber(fin.tax) || 0,
            additionalTaxes: parseAdditionalTaxes(fin.additionalTaxes),
            discount: parseNumber(fin.discount) || 0,
            tip: parseNumber(fin.tip) || 0,
            total: parseNumber(fin.total) || parseNumber(data.amount) || 0,
        };
    }

    // Legacy format
    const total = parseNumber(data.amount) || 0;
    const subtotal = parseNumber(data.subtotal) || Math.round(total / 1.19);
    const tax = parseNumber(data.tax) || Math.round(total - subtotal);

    return {
        subtotal,
        tax,
        total,
    };
}

/**
 * Parse additional taxes array
 */
function parseAdditionalTaxes(taxes: unknown): OCRFinancials["additionalTaxes"] {
    if (!Array.isArray(taxes)) return undefined;

    return taxes
        .filter((t): t is Record<string, unknown> => typeof t === "object" && t !== null)
        .map(t => ({
            name: sanitizeString(String(t.name || "Impuesto"), 50),
            rate: parseNumber(t.rate),
            amount: parseNumber(t.amount) || 0,
        }))
        .filter(t => t.amount > 0);
}

/**
 * Parse merchant info from response data
 */
function parseMerchant(data: Record<string, unknown>): OCRMerchant {
    // Check for new format
    if (data.merchant && typeof data.merchant === "object" && !Array.isArray(data.merchant)) {
        const m = data.merchant as Record<string, unknown>;
        const location = m.location as Record<string, unknown> | undefined;

        return {
            name: sanitizeString(String(m.name || m.businessName || ""), SECURITY.MAX_LENGTHS.merchant) || "Comercio",
            businessName: sanitizeString(String(m.businessName || ""), SECURITY.MAX_LENGTHS.merchant) || undefined,
            rut: normalizeRUT(String(m.rut || "")),
            businessType: sanitizeString(String(m.businessType || ""), 100) || undefined,
            phone: sanitizeString(String(m.phone || ""), 20) || undefined,
            email: sanitizeString(String(m.email || ""), 100) || undefined,
            location: location ? {
                address: sanitizeString(String(location.address || ""), 200) || undefined,
                city: sanitizeString(String(location.city || ""), 50) || undefined,
                commune: sanitizeString(String(location.commune || ""), 50) || undefined,
                region: sanitizeString(String(location.region || ""), 50) || undefined,
            } : undefined,
        };
    }

    // Legacy format - merchant is just a string
    return {
        name: sanitizeString(String(data.merchant || ""), SECURITY.MAX_LENGTHS.merchant) || "Comercio",
        rut: normalizeRUT(String(data.rut || "")),
    };
}

/**
 * Parse customer info from response data
 */
function parseCustomer(data: Record<string, unknown>): OCRCustomer | undefined {
    if (!data.customer || typeof data.customer !== "object") return undefined;

    const c = data.customer as Record<string, unknown>;
    const hasData = c.name || c.rut || c.address || c.businessType;

    if (!hasData) return undefined;

    return {
        name: sanitizeString(String(c.name || ""), 100) || undefined,
        rut: normalizeRUT(String(c.rut || "")) || undefined,
        address: sanitizeString(String(c.address || ""), 200) || undefined,
        businessType: sanitizeString(String(c.businessType || ""), 100) || undefined,
    };
}

/**
 * Parse number from various formats
 */
function parseNumber(value: unknown): number | undefined {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
        const cleaned = value.replace(/[^0-9.,-]/g, "").replace(/\./g, "").replace(",", ".");
        const num = parseFloat(cleaned);
        return isNaN(num) ? undefined : num;
    }
    return undefined;
}

/**
 * Validate and normalize document type
 */
function validateDocumentType(type: string | undefined): DocumentType {
    const normalized = String(type || "").toLowerCase();
    if (normalized === "boleta") return "boleta";
    if (normalized === "factura") return "factura";
    if (normalized === "ticket") return "ticket";
    return "unknown";
}

// Note: parseAmount removed - parseNumber handles all amount parsing

/**
 * Normalize date to YYYY-MM-DD format
 */
function normalizeDate(dateStr: string | undefined): string {
    if (!dateStr) {
        return new Date().toISOString().split("T")[0];
    }

    // Already in correct format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }

    // Try DD-MM-YYYY or DD/MM/YYYY
    const match1 = dateStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (match1) {
        const [, day, month, year] = match1;
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    // Try DD-MM-YY
    const match2 = dateStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
    if (match2) {
        const [, day, month, year] = match2;
        const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
        return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    return new Date().toISOString().split("T")[0];
}

/**
 * Normalize Chilean RUT format
 */
function normalizeRUT(rut: string | null | undefined): string | null {
    if (!rut) return null;

    const match = rut.match(/(\d{1,2})\.?(\d{3})\.?(\d{3})-?([\dKk])/);
    if (match) {
        const [, p1, p2, p3, dv] = match;
        const formatted = `${p1}.${p2}.${p3}-${dv.toUpperCase()}`;

        // Validate RUT
        if (validateChileanRUT(formatted)) {
            return formatted;
        }
    }

    return null;
}

/**
 * Validate Chilean RUT checksum
 */
function validateChileanRUT(rut: string): boolean {
    const cleanRut = rut.replace(/[.-]/g, "").toUpperCase();
    const body = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1);

    let sum = 0;
    let multiplier = 2;

    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const expectedDV = 11 - (sum % 11);
    const calculatedDV = expectedDV === 11 ? "0" : expectedDV === 10 ? "K" : String(expectedDV);

    return dv === calculatedDV;
}

/**
 * Parse items array from AI response
 * SECURITY: Sanitizes all item descriptions
 */
function parseItems(items: unknown): OCRItem[] {
    if (!Array.isArray(items) || items.length === 0) {
        return [];
    }

    // Limit to max 50 items to prevent DOS
    const limitedItems = items.slice(0, 50);

    return limitedItems
        .filter((item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null
        )
        .map(item => {
            // Sanitize all fields
            const code = sanitizeCode(String(item.code || ""), 20) || undefined;
            const description = sanitizeString(
                String(item.description || "Item"),
                SECURITY.MAX_LENGTHS.itemDescription
            ) || "Item";

            // Validate numeric values
            const quantity = Math.max(0, Math.min(10000, Number(item.quantity) || 1));
            const unitPrice = Math.max(0, Math.min(VALIDATION.MAX_AMOUNT, Number(item.unitPrice) || 0));
            const discount = Math.max(0, Math.min(VALIDATION.MAX_AMOUNT, Number(item.discount) || 0));
            const additionalTax = Math.max(0, Math.min(VALIDATION.MAX_AMOUNT, Number(item.additionalTax) || 0));
            const total = Math.max(0, Math.min(VALIDATION.MAX_AMOUNT, Number(item.total) || 0));

            return {
                code,
                description,
                quantity,
                unitPrice,
                discount: discount > 0 ? discount : undefined,
                additionalTax: additionalTax > 0 ? additionalTax : undefined,
                total
            };
        })
        .filter(item => item.total > 0 || item.unitPrice > 0);
}

/**
 * Store receipt image and get URL
 */
export async function storeReceiptImage(
    _imageBase64: string,
    _transactionId: string
): Promise<{ url: string; thumbnailUrl: string } | null> {
    // TODO: Implement with Cloudinary/S3
    // Parameters prefixed with _ until implementation
    return null;
}
