import { NextRequest, NextResponse } from "next/server";
import { generateRegexWithAI, generateExamplesForRegex, generateCodeForRegex } from "@/services/gemini";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

// Configuration
const RATE_LIMIT = 5;  // requests per window
const RATE_WINDOW_MS = 5 * 60 * 1000;  // 5 minutes
const COOKIE_NAME = "__rl_id";

// Generate a simple hash
function hash(input: string): string {
    return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

// Extract client IP
function getClientIP(request: NextRequest): string {
    return request.headers.get("x-forwarded-for")?.split(",")[0].trim()
        || request.headers.get("x-real-ip")
        || "unknown";
}

// Generate browser fingerprint from headers
function getFingerprint(request: NextRequest): string {
    const parts = [
        request.headers.get("user-agent") || "",
        request.headers.get("accept-language") || "",
        request.headers.get("accept-encoding") || "",
        request.headers.get("sec-ch-ua") || "",
        request.headers.get("sec-ch-ua-platform") || "",
    ];
    return hash(parts.join("|"));
}

// Get or create cookie ID
function getCookieId(request: NextRequest): string {
    const existing = request.cookies.get(COOKIE_NAME)?.value;
    if (existing) return existing;
    // Generate new ID (will be set in response)
    return hash(Date.now().toString() + Math.random().toString());
}

// Database-backed rate limiting with fingerprinting
async function checkRateLimitDB(
    ip: string,
    fingerprint: string,
    cookieId: string
): Promise<{ allowed: boolean; remaining: number; resetIn: number; isNewCookie: boolean }> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - RATE_WINDOW_MS);

    // Create combined identifier (any match will trigger rate limit)
    const identifier = hash(`${ip}|${fingerprint}|${cookieId}`);

    try {
        // Check for existing entry
        const existing = await prisma.rateLimitEntry.findUnique({
            where: { identifier }
        });

        // If exists and within window
        if (existing && existing.windowStart > windowStart) {
            if (existing.count >= RATE_LIMIT) {
                const resetIn = existing.windowStart.getTime() + RATE_WINDOW_MS - now.getTime();
                return { allowed: false, remaining: 0, resetIn, isNewCookie: false };
            }

            // Increment count
            await prisma.rateLimitEntry.update({
                where: { identifier },
                data: { count: existing.count + 1 }
            });

            const resetIn = existing.windowStart.getTime() + RATE_WINDOW_MS - now.getTime();
            return {
                allowed: true,
                remaining: RATE_LIMIT - existing.count - 1,
                resetIn,
                isNewCookie: false
            };
        }

        // Create or reset entry
        await prisma.rateLimitEntry.upsert({
            where: { identifier },
            create: {
                identifier,
                ip: ip.slice(0, 45),
                fingerprint,
                cookieId,
                count: 1,
                windowStart: now
            },
            update: {
                count: 1,
                windowStart: now,
                ip: ip.slice(0, 45),
                fingerprint,
                cookieId
            }
        });

        return {
            allowed: true,
            remaining: RATE_LIMIT - 1,
            resetIn: RATE_WINDOW_MS,
            isNewCookie: !existing
        };

    } catch (error) {
        console.error("[RateLimit] Database error:", error);
        // Fallback: allow request on DB error (don't block users due to our issues)
        return { allowed: true, remaining: RATE_LIMIT - 1, resetIn: RATE_WINDOW_MS, isNewCookie: false };
    }
}

export async function POST(request: NextRequest) {
    const ip = getClientIP(request);
    const fingerprint = getFingerprint(request);
    const cookieId = getCookieId(request);
    const isNewCookie = !request.cookies.get(COOKIE_NAME)?.value;

    // Check rate limit with database
    const rateCheck = await checkRateLimitDB(ip, fingerprint, cookieId);

    // Build response headers
    const responseHeaders: Record<string, string> = {
        "X-RateLimit-Limit": RATE_LIMIT.toString(),
        "X-RateLimit-Remaining": rateCheck.remaining.toString(),
        "X-RateLimit-Reset": Math.ceil(rateCheck.resetIn / 1000).toString(),
    };

    // Set cookie if new
    if (isNewCookie) {
        responseHeaders["Set-Cookie"] = `${COOKIE_NAME}=${cookieId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`;
    }

    if (!rateCheck.allowed) {
        return NextResponse.json(
            {
                error: "Límite de solicitudes excedido",
                message: `Espera ${Math.ceil(rateCheck.resetIn / 1000)} segundos`,
                retryAfter: Math.ceil(rateCheck.resetIn / 1000)
            },
            { status: 429, headers: responseHeaders }
        );
    }

    try {
        const body = await request.json();
        const { prompt, action, regex, flags } = body;

        // Handle EXAMPLES generation (separate action)
        if (action === "examples") {
            if (!regex || typeof regex !== "string") {
                return NextResponse.json(
                    { error: "Se requiere un patrón regex válido" },
                    { status: 400, headers: responseHeaders }
                );
            }

            const examplesResult = await generateExamplesForRegex(regex, flags || "g");

            // Log examples generation
            try {
                const tool = await prisma.tool.findUnique({ where: { slug: "regex-tester" } });
                if (tool) {
                    await prisma.toolUsage.create({
                        data: {
                            toolId: tool.id,
                            action: "ai_examples",
                            ip: ip.slice(0, 45),
                            metadata: {
                                regex: regex.slice(0, 100),
                                examplesCount: examplesResult.examples?.length || 0,
                                success: examplesResult.success,
                                latencyMs: examplesResult.latencyMs,
                            }
                        }
                    });
                }
            } catch (prismaError) {
                console.error("Failed to log examples usage:", prismaError);
            }

            if (!examplesResult.success) {
                return NextResponse.json(
                    { error: examplesResult.error, latencyMs: examplesResult.latencyMs },
                    { status: 422, headers: responseHeaders }
                );
            }

            return NextResponse.json({
                examples: examplesResult.examples,
                latencyMs: examplesResult.latencyMs
            }, { headers: responseHeaders });
        }

        // Handle CODE generation (separate action)
        if (action === "generate_code") {
            const { language, mode, replacement } = body;

            if (!regex || typeof regex !== "string") {
                return NextResponse.json(
                    { error: "Se requiere un patrón regex válido" },
                    { status: 400, headers: responseHeaders }
                );
            }

            if (!language || typeof language !== "string") {
                return NextResponse.json(
                    { error: "Se requiere un lenguaje de programación" },
                    { status: 400, headers: responseHeaders }
                );
            }

            const codeResult = await generateCodeForRegex(
                regex,
                flags || "g",
                language,
                mode || "match",
                replacement
            );

            // Log code generation
            try {
                const tool = await prisma.tool.findUnique({ where: { slug: "regex-tester" } });
                if (tool) {
                    await prisma.toolUsage.create({
                        data: {
                            toolId: tool.id,
                            action: "ai_code",
                            ip: ip.slice(0, 45),
                            metadata: {
                                regex: regex.slice(0, 100),
                                language,
                                mode: mode || "match",
                                success: codeResult.success,
                                latencyMs: codeResult.latencyMs,
                            }
                        }
                    });
                }
            } catch (prismaError) {
                console.error("Failed to log code generation usage:", prismaError);
            }

            if (!codeResult.success) {
                return NextResponse.json(
                    { error: codeResult.error, latencyMs: codeResult.latencyMs },
                    { status: 422, headers: responseHeaders }
                );
            }

            return NextResponse.json({
                code: codeResult.code,
                language: codeResult.language,
                latencyMs: codeResult.latencyMs
            }, { headers: responseHeaders });
        }

        // Default: Handle REGEX generation
        if (!prompt || typeof prompt !== "string") {
            return NextResponse.json(
                { error: "Se requiere un prompt válido" },
                { status: 400, headers: responseHeaders }
            );
        }

        if (prompt.length > 200) {
            return NextResponse.json(
                { error: "El prompt es demasiado largo (máx 200 caracteres)" },
                { status: 400, headers: responseHeaders }
            );
        }

        // Generate regex with AI
        const result = await generateRegexWithAI(prompt);

        // Log to ToolUsage for metrics
        try {
            const tool = await prisma.tool.findUnique({ where: { slug: "regex-tester" } });
            if (tool) {
                await prisma.toolUsage.create({
                    data: {
                        toolId: tool.id,
                        action: "ai_generate",
                        ip: ip.slice(0, 45),  // Privacy: truncate
                        metadata: {
                            prompt: prompt.slice(0, 100),  // Store truncated prompt
                            regex: result.regex || null,
                            success: result.success,
                            latencyMs: result.latencyMs,
                            error: result.error || null,
                        }
                    }
                });
            }
        } catch (prismaError) {
            console.error("Failed to log AI usage:", prismaError);
            // Non-blocking: continue even if logging fails
        }

        if (!result.success) {
            return NextResponse.json(
                {
                    error: result.error,
                    suggestion: result.suggestion,
                    latencyMs: result.latencyMs
                },
                { status: 422, headers: responseHeaders }
            );
        }

        return NextResponse.json({
            regex: result.regex,
            flags: result.flags,
            explanation: result.explanation,
            examples: result.examples,
            latencyMs: result.latencyMs
        }, { headers: responseHeaders });

    } catch (error) {
        console.error("Regex AI endpoint error:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500, headers: responseHeaders }
        );
    }
}
