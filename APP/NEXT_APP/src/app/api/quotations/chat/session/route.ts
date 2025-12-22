import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Get or create session for a specific quotation (or fresh for new)
// Query params:
//   - quotationId: optional - link to specific quotation
//   - fresh: optional - force create new session (closes existing active sessions)
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const quotationId = searchParams.get("quotationId");
        const fresh = searchParams.get("fresh") === "true";

        // If fresh=true, close all active sessions for this user first
        if (fresh) {
            await prisma.quotationChatSession.updateMany({
                where: {
                    userId: session.user.id,
                    isActive: true,
                },
                data: {
                    isActive: false,
                },
            });

            // Create new empty session
            const chatSession = await prisma.quotationChatSession.create({
                data: {
                    userId: session.user.id,
                    quotationId: quotationId || null,
                },
                include: {
                    messages: true,
                },
            });

            return NextResponse.json({
                sessionId: chatSession.id,
                messages: [],
            });
        }

        // If quotationId provided, look for existing session for that quotation
        if (quotationId) {
            let chatSession = await prisma.quotationChatSession.findFirst({
                where: {
                    userId: session.user.id,
                    quotationId: quotationId,
                },
                include: {
                    messages: {
                        orderBy: { createdAt: "asc" },
                        take: 50,
                    },
                },
            });

            if (!chatSession) {
                // Create new session linked to this quotation
                chatSession = await prisma.quotationChatSession.create({
                    data: {
                        userId: session.user.id,
                        quotationId: quotationId,
                    },
                    include: {
                        messages: true,
                    },
                });
            }

            return NextResponse.json({
                sessionId: chatSession.id,
                messages: chatSession.messages.map((m) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    actions: m.actions,
                })),
            });
        }

        // No quotationId - this is a new quotation, always return empty session
        // Close any existing active sessions first
        await prisma.quotationChatSession.updateMany({
            where: {
                userId: session.user.id,
                isActive: true,
                quotationId: null, // Only close sessions without linked quotation
            },
            data: {
                isActive: false,
            },
        });

        // Create fresh session
        const chatSession = await prisma.quotationChatSession.create({
            data: {
                userId: session.user.id,
            },
            include: {
                messages: true,
            },
        });

        return NextResponse.json({
            sessionId: chatSession.id,
            messages: [],
        });
    } catch (error) {
        console.error("[ChatSession] Error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

// POST: Save message to session
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { sessionId, message } = await request.json();

        if (!sessionId || !message) {
            return NextResponse.json({ error: "Datos requeridos" }, { status: 400 });
        }

        // Verify session belongs to user
        const chatSession = await prisma.quotationChatSession.findFirst({
            where: {
                id: sessionId,
                userId: session.user.id,
            },
        });

        if (!chatSession) {
            return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
        }

        // Save message
        const savedMessage = await prisma.quotationChatMessage.create({
            data: {
                sessionId,
                role: message.role,
                content: message.content,
                actions: message.actions || null,
            },
        });

        return NextResponse.json({
            id: savedMessage.id,
            success: true,
        });
    } catch (error) {
        console.error("[ChatSession] Save error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

// DELETE: Close/archive session and optionally generate summary
export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get("sessionId");
        const generateSummary = searchParams.get("summary") === "true";

        if (!sessionId) {
            return NextResponse.json({ error: "sessionId requerido" }, { status: 400 });
        }

        // If summary requested, get messages first to generate summary
        let summary = null;
        if (generateSummary) {
            const chatSession = await prisma.quotationChatSession.findFirst({
                where: {
                    id: sessionId,
                    userId: session.user.id,
                },
                include: {
                    messages: {
                        orderBy: { createdAt: "asc" },
                    },
                },
            });

            if (chatSession && chatSession.messages.length > 0) {
                // Generate compact summary from messages
                const userMessages = chatSession.messages
                    .filter((m) => m.role === "user")
                    .map((m) => m.content.slice(0, 100))
                    .join("; ");
                summary = userMessages.slice(0, 500);
            }
        }

        // Close session
        await prisma.quotationChatSession.updateMany({
            where: {
                id: sessionId,
                userId: session.user.id,
            },
            data: {
                isActive: false,
                summary: summary,
            },
        });

        return NextResponse.json({ success: true, summary });
    } catch (error) {
        console.error("[ChatSession] Delete error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
