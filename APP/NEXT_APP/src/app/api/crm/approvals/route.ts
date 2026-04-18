import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { secureApiEndpoint } from "@/lib/api-security";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";

/**
 * CRM Approvals API – Digital signatures and contract/quotation approvals.
 * 
 * Security model (NIST SP 800-53 AU-3, OWASP):
 * - Each approval has a unique access token (hashed with SHA-256)
 * - Document integrity verified via hash comparison (sign-time vs send-time)
 * - IP, User-Agent, and timestamp recorded for non-repudiation
 * - Signature images stored as base64 data URIs (drawn via canvas)
 */

const createApprovalSchema = z.object({
    clientId: z.string().min(1),
    quotationId: z.string().optional(),
    contractId: z.string().optional(),
    type: z.enum(["QUOTATION", "CONTRACT", "OTHER"]),
    documentContent: z.string().min(1), // HTML/text content to hash
    expiresInDays: z.number().int().min(1).max(90).default(30),
});

const signApprovalSchema = z.object({
    token: z.string().min(1),
    signerName: z.string().min(1).max(200),
    signerRut: z.string().max(20).optional(),
    signerEmail: z.string().email().optional(),
    signatureImage: z.string().optional(), // base64 PNG from canvas
    signatureMethod: z.enum(["DRAWN", "TYPED", "BOTH"]),
    clientComments: z.string().max(2000).optional(),
    documentContent: z.string().min(1), // For hash verification
});

function hashDocument(content: string): string {
    return createHash("sha256").update(content, "utf8").digest("hex");
}

function hashToken(token: string): string {
    return createHash("sha256").update(token, "utf8").digest("hex");
}

// ─── GET: Fetch approval by token (public for clients) ─────────────

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const adminMode = searchParams.get("admin") === "true";

    // Admin mode: fetch approvals for a contract/quotation
    if (adminMode) {
        const security = await secureApiEndpoint(request, { requireAuth: true });
        if (security.error) return security.error;
        const userId = security.session!.user.id;

        const contractId = searchParams.get("contractId");
        const quotationId = searchParams.get("quotationId");

        const approvals = await prisma.clientApproval.findMany({
            where: {
                userId,
                ...(contractId && { contractId }),
                ...(quotationId && { quotationId }),
            },
            include: {
                client: { select: { name: true, company: true, rut: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(approvals);
    }

    // Public mode: fetch by access token
    if (!token) {
        return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const tokenHash = hashToken(token);
    const approval = await prisma.clientApproval.findUnique({
        where: { accessToken: tokenHash },
        include: {
            client: { select: { name: true, company: true } },
            quotation: { select: { projectName: true, total: true, folio: true } },
            contract: { select: { title: true, contractNumber: true, totalAmount: true } },
        },
    });

    if (!approval) {
        return NextResponse.json({ error: "Aprobación no encontrada" }, { status: 404 });
    }

    if (approval.expiresAt && new Date() > approval.expiresAt) {
        return NextResponse.json({ error: "Este enlace ha expirado" }, { status: 410 });
    }

    if (approval.status !== "PENDING") {
        return NextResponse.json({
            approval: {
                status: approval.status,
                signedAt: approval.signedAt,
                signerName: approval.signerName,
                type: approval.type,
            },
            alreadyProcessed: true,
        });
    }

    // Return approval details for signing UI (don't expose internal IDs)
    return NextResponse.json({
        approval: {
            type: approval.type,
            status: approval.status,
            documentHash: approval.documentHash,
            clientName: approval.client.name,
            clientCompany: approval.client.company,
            quotation: approval.quotation,
            contract: approval.contract,
            sentAt: approval.sentAt,
            expiresAt: approval.expiresAt,
        },
    });
}

// ─── POST: Create approval request (admin) ─────────────────────────

export async function POST(request: NextRequest) {
    try {
        const security = await secureApiEndpoint(request, { requireAuth: true });
        if (security.error) return security.error;
        const userId = security.session!.user.id;

        const body = await request.json();
        const action = body.action;

        if (action === "sign") {
            // Client signing (public endpoint via POST for CSRF protection)
            return handleSign(request, body);
        }

        // Create new approval request
        const data = createApprovalSchema.parse(body);

        const rawToken = randomBytes(32).toString("hex");
        const tokenHashed = hashToken(rawToken);
        const docHash = hashDocument(data.documentContent);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays || 30));

        const approval = await prisma.clientApproval.create({
            data: {
                clientId: data.clientId,
                quotationId: data.quotationId,
                contractId: data.contractId,
                userId,
                type: data.type,
                documentHash: docHash,
                accessToken: tokenHashed,
                expiresAt,
            },
        });

        // Return the raw token (only time it's visible)
        return NextResponse.json({
            id: approval.id,
            accessUrl: `/aprobar?token=${rawToken}`,
            rawToken,
            expiresAt: expiresAt.toISOString(),
        }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
        }
        console.error("[CRM Approvals POST]", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

// ─── Sign Handler ──────────────────────────────────────────────────

async function handleSign(request: NextRequest, body: Record<string, unknown>) {
    try {
        const data = signApprovalSchema.parse(body);

        const tokenHash = hashToken(data.token);
        const approval = await prisma.clientApproval.findUnique({
            where: { accessToken: tokenHash },
        });

        if (!approval) {
            return NextResponse.json({ error: "Aprobación no encontrada" }, { status: 404 });
        }

        if (approval.status !== "PENDING") {
            return NextResponse.json({ error: "Esta aprobación ya fue procesada" }, { status: 400 });
        }

        if (approval.expiresAt && new Date() > approval.expiresAt) {
            return NextResponse.json({ error: "Enlace expirado" }, { status: 410 });
        }

        // Verify document integrity
        const currentDocHash = hashDocument(data.documentContent);

        // Capture audit data (NIST SP 800-53 AU-3)
        const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] ||
            request.headers.get("x-real-ip") || "unknown";
        const userAgent = request.headers.get("user-agent") || "unknown";

        const updated = await prisma.clientApproval.update({
            where: { id: approval.id },
            data: {
                status: "SIGNED",
                signerName: data.signerName,
                signerRut: data.signerRut,
                signerEmail: data.signerEmail,
                signatureImage: data.signatureImage,
                signatureMethod: data.signatureMethod,
                clientComments: data.clientComments,
                signedDocumentHash: currentDocHash,
                signedAt: new Date(),
                ipAddress,
                userAgent,
            },
        });

        return NextResponse.json({
            success: true,
            signedAt: updated.signedAt,
            documentIntegrity: currentDocHash === approval.documentHash ? "VERIFIED" : "MODIFIED",
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
        }
        console.error("[CRM Approvals Sign]", error);
        return NextResponse.json({ error: "Error al firmar" }, { status: 500 });
    }
}
