import { NextRequest } from "next/server";
import { secureApiEndpoint, secureJsonResponse, secureErrorResponse } from "@/lib/api-security";
import { SecurityLogger } from "@/lib/security-logger";
import { generateCvSuggestion, checkInputSecurity, sanitizeAIOutput } from "@/services/cv-ai";

// Input constraints
const MAX_MESSAGE_LENGTH = 2000;
const MAX_CONVERSATION_HISTORY = 10;

export async function POST(request: NextRequest) {
    // ===== 1. CENTRALIZED SECURITY CHECKS =====
    const security = await secureApiEndpoint(request, {
        requireAuth: true,
        rateLimit: {
            limit: 20,       // 20 requests
            windowMs: 60000, // per minute
        },
        maxBodySize: 50 * 1024, // 50KB max
        allowedContentTypes: ["application/json"],
        auditAccess: true,
        checkAnomalies: true,
    });

    if (security.error) {
        return security.error;
    }

    const { context, session, body } = security;
    const userId = session?.user?.id || "unknown";

    try {
        // ===== 2. VALIDATE INPUT STRUCTURE =====
        const typedBody = body as {
            message?: unknown;
            context?: unknown;
            conversationHistory?: unknown;
        };

        if (!typedBody?.message || typeof typedBody.message !== "string") {
            return secureJsonResponse(
                { error: "Message is required and must be a string" },
                400
            );
        }

        const message = typedBody.message;

        // ===== 3. INPUT LENGTH VALIDATION =====
        if (message.length > MAX_MESSAGE_LENGTH) {
            SecurityLogger.apiAbuse({
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                userId,
                endpoint: "/api/cv/chat",
                abuseType: "MESSAGE_TOO_LONG",
                details: { length: message.length, max: MAX_MESSAGE_LENGTH },
            });

            return secureJsonResponse(
                { error: "Message too long", maxLength: MAX_MESSAGE_LENGTH },
                400
            );
        }

        // Validate conversation history
        const conversationHistory = Array.isArray(typedBody.conversationHistory)
            ? typedBody.conversationHistory.slice(-MAX_CONVERSATION_HISTORY)
            : [];

        // ===== 4. JAILBREAK/INJECTION DETECTION =====
        const securityCheck = checkInputSecurity(message);
        if (!securityCheck.safe) {
            // Log the attempt for security analysis
            SecurityLogger.injectionAttempt({
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                type: securityCheck.reason === "jailbreak" ? "COMMAND" : "XSS",
                payload: message.slice(0, 100), // First 100 chars for forensics
                location: "/api/cv/chat",
            });

            return secureJsonResponse({
                success: false,
                action: "error",
                message: securityCheck.message,
                error: securityCheck.reason,
            });
        }

        // ===== 5. GENERATE AI RESPONSE =====
        const result = await generateCvSuggestion({
            userMessage: message,
            conversationHistory,
            currentContext: typedBody.context as {
                hasExperience: boolean;
                hasSkills: boolean;
                hasProjects: boolean;
                skillCategories: string[];
                activeSection?: "experience" | "projects";
            },
        });

        // ===== 6. SANITIZE AI OUTPUT =====
        const sanitizedResult = sanitizeAIOutput(result);

        return secureJsonResponse(sanitizedResult);
    } catch (error) {
        // Don't leak internal error details
        return secureErrorResponse(
            "Error processing request",
            500,
            error instanceof Error ? error : new Error(String(error))
        );
    }
}
