import { NextRequest, NextResponse } from "next/server";
import { ipCliente } from "@/lib/ip-cliente";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/redis";
import { SecurityLogger } from "@/lib/security-logger";
import { logger } from "@/lib/logger";
import crypto from "crypto";

// Rate limit: 3 messages per hour per IP
const RATE_LIMIT = 3;
const RATE_WINDOW_SECONDS = 3600;

// Minimum time to fill form (anti-bot)
const MIN_FORM_TIME_MS = 3000;

// Maximum message length
const MAX_MESSAGE_LENGTH = 2000;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;

// Email regex for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Spam keywords (basic scoring)
const SPAM_KEYWORDS = [
    "cryptocurrency", "crypto", "bitcoin", "investment opportunity",
    "make money fast", "click here", "free money", "lottery",
    "winner", "prize", "casino", "viagra", "pharmacy",
];

/**
 * Calculate spam score based on content analysis
 */
function calculateSpamScore(message: string, email: string): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    const lowerMessage = message.toLowerCase();
    const lowerEmail = email.toLowerCase();

    // Check for spam keywords
    for (const keyword of SPAM_KEYWORDS) {
        if (lowerMessage.includes(keyword)) {
            score += 20;
            reasons.push(`Keyword: ${keyword}`);
        }
    }

    // Excessive links
    const linkCount = (message.match(/https?:\/\//gi) || []).length;
    if (linkCount > 3) {
        score += 30;
        reasons.push(`Too many links: ${linkCount}`);
    }

    // All caps
    const capsRatio = (message.match(/[A-Z]/g) || []).length / message.length;
    if (capsRatio > 0.5 && message.length > 50) {
        score += 15;
        reasons.push("Excessive caps");
    }

    // Disposable email domains
    const disposableDomains = ["tempmail", "guerrillamail", "10minutemail", "mailinator"];
    for (const domain of disposableDomains) {
        if (lowerEmail.includes(domain)) {
            score += 40;
            reasons.push("Disposable email");
        }
    }

    // Repeated characters
    if (/(.)\1{4,}/.test(message)) {
        score += 10;
        reasons.push("Repeated characters");
    }

    return { score: Math.min(score, 100), reasons };
}

/**
 * Hash IP address for GDPR compliance
 */
function hashIP(ip: string): string {
    return crypto.createHash("sha256").update(ip + process.env.NEXTAUTH_SECRET).digest("hex").substring(0, 32);
}

/**
 * Get client IP from request
 */
function getClientIP(request: NextRequest): string {
    return ipCliente(request.headers);
}

export async function POST(request: NextRequest) {
    try {
        const ip = getClientIP(request);
        const ipHash = hashIP(ip);
        const userAgent = request.headers.get("user-agent") || undefined;

        // 1. Rate limiting
        const rateKey = `contact:${ipHash}`;
        const { allowed, remaining } = await checkRateLimit(rateKey, RATE_LIMIT, RATE_WINDOW_SECONDS);

        if (!allowed) {
            SecurityLogger.rateLimited({
                ipAddress: ip,
                userAgent,
                endpoint: "/api/contact",
                limit: RATE_LIMIT,
                window: RATE_WINDOW_SECONDS,
            });

            return NextResponse.json(
                { error: "Demasiados mensajes. Intenta de nuevo más tarde." },
                { status: 429 }
            );
        }

        // 2. Parse body
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
        }

        // 3. Honeypot check - if filled, it's a bot
        if (body.website) {
            SecurityLogger.apiAbuse({
                ipAddress: ip,
                userAgent,
                endpoint: "/api/contact",
                abuseType: "honeypot_triggered",
                details: { field: "website" },
            });

            // Return fake success to confuse bots
            return NextResponse.json({ success: true });
        }

        // 4. Timing check - too fast = bot
        if (body.formStartTime) {
            const formTime = Date.now() - body.formStartTime;
            if (formTime < MIN_FORM_TIME_MS) {
                SecurityLogger.apiAbuse({
                    ipAddress: ip,
                    userAgent,
                    endpoint: "/api/contact",
                    abuseType: "fast_form_submission",
                    details: { formTime },
                });

                // Return fake success
                return NextResponse.json({ success: true });
            }
        }

        // 5. Validate required fields
        const { email, name, message } = body;

        if (!email || typeof email !== "string") {
            return NextResponse.json(
                { error: "Email es requerido" },
                { status: 400 }
            );
        }

        if (!message || typeof message !== "string") {
            return NextResponse.json(
                { error: "Mensaje es requerido" },
                { status: 400 }
            );
        }

        // 6. Validate formats
        // Los largos se miden sobre lo que la persona escribió, igual que el formulario (maxLength): medidos después de
        // escapar, cada «/» o comilla sumaba 5 caracteres y un mensaje de 1.990 con un par de enlaces se rechazaba por «largo».
        // Los saltos de línea se cuentan como uno (\r\n → \n), como los cuenta el navegador.
        const rawEmail = email.trim();
        const rawName = typeof name === "string" ? name.trim() : "";
        const rawMessage = message.replace(/\r\n?/g, "\n").trim();

        if (!EMAIL_REGEX.test(rawEmail)) {
            return NextResponse.json(
                { error: "Email inválido" },
                { status: 400 }
            );
        }

        if (rawEmail.length > MAX_EMAIL_LENGTH) {
            return NextResponse.json(
                { error: "Email demasiado largo" },
                { status: 400 }
            );
        }

        if (rawName.length > MAX_NAME_LENGTH) {
            return NextResponse.json(
                { error: "Nombre demasiado largo" },
                { status: 400 }
            );
        }

        if (rawMessage.length < 10) {
            return NextResponse.json(
                { error: "Mensaje muy corto (mínimo 10 caracteres)" },
                { status: 400 }
            );
        }

        if (rawMessage.length > MAX_MESSAGE_LENGTH) {
            return NextResponse.json(
                { error: `Mensaje muy largo (máximo ${MAX_MESSAGE_LENGTH} caracteres)` },
                { status: 400 }
            );
        }

        // Se guarda el texto tal cual (sin caracteres de control): el panel lo muestra con React, que ya escapa. Escaparlo
        // aquí dejaba «https:&#x2F;&#x2F;…» y «O&#x27;Higgins» a la vista y rompía la búsqueda en el panel.
        // Fuera los caracteres de control (salvo tabulación y saltos de línea).
        const sinControl = (texto: string) => Array.from(texto).filter((c) => { const n = c.codePointAt(0)!; return n === 9 || n === 10 || n === 13 || (n >= 32 && n !== 127); }).join("");
        const sanitizedEmail = sinControl(rawEmail);
        const sanitizedName = rawName ? sinControl(rawName) : null;
        const sanitizedMessage = sinControl(rawMessage);

        // 7. Spam detection
        // Sobre el texto sin escapar: escapado, «https://» queda «https:&#x2F;&#x2F;» y los enlaces nunca se contaban.
        const { score: spamScore, reasons: spamReasons } = calculateSpamScore(rawMessage, rawEmail);
        const isSpam = spamScore >= 50;

        if (isSpam) {
            SecurityLogger.apiAbuse({
                ipAddress: ip,
                userAgent,
                endpoint: "/api/contact",
                abuseType: "spam_contact",
                details: { spamScore, reasons: spamReasons },
            });
        }

        // 8. Create message in database
        const _contactMessage = await prisma.contactMessage.create({
            data: {
                email: sanitizedEmail,
                name: sanitizedName,
                message: sanitizedMessage,
                ipHash,
                userAgent,
                source: "landing",
                isSpam,
                spamScore,
                spamReason: spamReasons.length > 0 ? spamReasons.join(", ") : null,
            },
        });

        // 9. Log successful submission
        logger.info("[Contact] Message received", { ipHash, isSpam, spamScore });

        return NextResponse.json({
            success: true,
            message: "Mensaje enviado correctamente. Te responderé pronto.",
            remaining,
        });

    } catch (error) {
        logger.error("[Contact] Error", error);

        return NextResponse.json(
            { error: "Error al enviar el mensaje. Intenta de nuevo." },
            { status: 500 }
        );
    }
}
