import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateCvSuggestion, checkInputSecurity } from "@/services/cv-ai";

// Rate limiting (simple in-memory, use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 20; // requests per window
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const record = rateLimitMap.get(userId);

    if (!record || now > record.resetTime) {
        rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
    }

    if (record.count >= RATE_LIMIT_MAX) {
        return { allowed: false, remaining: 0 };
    }

    record.count++;
    return { allowed: true, remaining: RATE_LIMIT_MAX - record.count };
}

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate limiting
        const { allowed, remaining } = checkRateLimit(session.user.id);
        if (!allowed) {
            return NextResponse.json({
                success: false,
                action: "error",
                message: "Has enviado muchas solicitudes. Espera un momento antes de continuar.",
                error: "rate_limited"
            }, { 
                status: 429,
                headers: { "X-RateLimit-Remaining": "0" }
            });
        }

        const body = await request.json();
        const { message, context, conversationHistory } = body;

        if (!message || typeof message !== "string") {
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 }
            );
        }

        // SECURITY: Check for jailbreak/injection attempts BEFORE sending to AI
        const securityCheck = checkInputSecurity(message);
        if (!securityCheck.safe) {
            console.log(`[CV Chat] Blocked ${securityCheck.reason}:`, message.slice(0, 100));
            return NextResponse.json({
                success: false,
                action: "error",
                message: securityCheck.message,
                error: securityCheck.reason
            }, {
                headers: { "X-RateLimit-Remaining": String(remaining) }
            });
        }

        // Generate AI suggestion with conversation history
        const result = await generateCvSuggestion({
            userMessage: message,
            conversationHistory: conversationHistory || [],
            currentContext: context,
        });

        return NextResponse.json(result, {
            headers: { "X-RateLimit-Remaining": String(remaining) }
        });
    } catch (error) {
        console.error("CV chat error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
