import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permission-check";
import { Role } from "@prisma/client";
import { processReceiptOCR } from "@/services/ocr-service";
import { z } from "zod";
import { validateBase64Image, sanitizeObject } from "@/lib/security-hardened";
import { SecurityLogger } from "@/lib/security-logger";
import { headers } from "next/headers";

const ocrSchema = z.object({
    image: z.string().min(100), // Base64 image
});

// Rate limiting: Track OCR requests per user
const ocrRateLimit = new Map<string, { count: number; resetAt: number }>();
const MAX_OCR_PER_HOUR = 15;

// POST /api/finance/ocr - Process receipt image
export async function POST(request: NextRequest) {
    const startTime = Date.now();
    
    // Get request context for security logging
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 
                     headersList.get('x-real-ip') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    try {
        const session = await auth();
        if (!session?.user?.id) {
            SecurityLogger.unauthorized({
                ipAddress,
                userAgent,
                resource: '/api/finance/ocr',
                requiredPermission: 'authentication'
            });
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canAccess = await hasPermission(session.user.id, session.user.role as Role, "finance.manage");
        if (!canAccess) {
            SecurityLogger.unauthorized({
                ipAddress,
                userAgent,
                userId: session.user.id,
                resource: '/api/finance/ocr',
                requiredPermission: 'finance.manage'
            });
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        // Rate limiting check
        const userId = session.user.id;
        const now = Date.now();
        const userLimit = ocrRateLimit.get(userId);

        if (userLimit) {
            if (now < userLimit.resetAt) {
                if (userLimit.count >= MAX_OCR_PER_HOUR) {
                    SecurityLogger.rateLimited({
                        ipAddress,
                        userAgent,
                        endpoint: '/api/finance/ocr',
                        limit: MAX_OCR_PER_HOUR,
                        window: 3600000
                    });
                    return NextResponse.json(
                        {
                            error: "Límite de escaneos alcanzado",
                            message: `Máximo ${MAX_OCR_PER_HOUR} escaneos por hora`,
                            retryAfter: Math.ceil((userLimit.resetAt - now) / 1000),
                        },
                        { status: 429 }
                    );
                }
                userLimit.count++;
            } else {
                ocrRateLimit.set(userId, { count: 1, resetAt: now + 3600000 });
            }
        } else {
            ocrRateLimit.set(userId, { count: 1, resetAt: now + 3600000 });
        }

        const body = await request.json();
        // Sanitize input to prevent prototype pollution
        const sanitizedBody = sanitizeObject(body);
        const validation = ocrSchema.safeParse(sanitizedBody);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Imagen requerida", details: validation.error.issues },
                { status: 400 }
            );
        }

        const { image } = validation.data;

        // Validate image size (max 5MB base64 ≈ 6.67MB)
        if (image.length > 7000000) {
            return NextResponse.json(
                { error: "Imagen muy grande", message: "Máximo 5MB" },
                { status: 400 }
            );
        }

        // SECURITY: Validate image using magic bytes (military-grade validation)
        const imageValidation = validateBase64Image(image);
        
        if (!imageValidation.valid) {
            SecurityLogger.suspiciousUpload({
                ipAddress,
                userAgent,
                userId,
                filename: 'receipt-upload',
                declaredType: image.substring(5, 30),
                reason: imageValidation.reason || 'INVALID_IMAGE'
            });
            
            await prisma.financeAuditLog.create({
                data: {
                    userId,
                    action: "ocr.security_blocked",
                    entityType: "receipt",
                    newValue: {
                        reason: imageValidation.reason,
                        timestamp: new Date().toISOString(),
                    },
                },
            });
            
            return NextResponse.json(
                { error: "Imagen bloqueada por seguridad", message: imageValidation.reason },
                { status: 400 }
            );
        }

        // SECURITY: Basic check for embedded scripts in base64
        const base64Part = image.split(",")[1] || "";
        const suspiciousPatterns = [
            "PHNjcmlwdD4", // <script>
            "amF2YXNjcmlwdDo", // javascript:
            "b25lcnJvcj0", // onerror=
            "b25sb2FkPQ", // onload=
            "ZXZhbCg", // eval(
            "YXRvYig", // atob(
        ];
        
        if (suspiciousPatterns.some(pattern => base64Part.includes(pattern))) {
            SecurityLogger.injectionAttempt({
                ipAddress,
                userAgent,
                type: 'XSS',
                payload: base64Part.substring(0, 100),
                location: '/api/finance/ocr'
            });
            
            await prisma.financeAuditLog.create({
                data: {
                    userId,
                    action: "ocr.xss_blocked",
                    entityType: "receipt",
                    newValue: {
                        reason: "XSS pattern detected in base64",
                        timestamp: new Date().toISOString(),
                    },
                },
            });
            
            console.error(`[OCR Security] Blocked XSS attempt from user ${userId}, IP: ${ipAddress}`);
            
            return NextResponse.json(
                { error: "Imagen bloqueada por seguridad" },
                { status: 400 }
            );
        }

        // Process OCR
        const result = await processReceiptOCR(image);

        // SECURITY: Check for security flags
        if (result.securityFlags && result.securityFlags.length > 0) {
            // Log security incident
            await prisma.financeAuditLog.create({
                data: {
                    userId,
                    action: "ocr.security_alert",
                    entityType: "receipt",
                    newValue: {
                        securityFlags: result.securityFlags,
                        timestamp: new Date().toISOString(),
                        processingTime: result.processingTime,
                    },
                },
            });
            
            console.warn(`[OCR Security] User ${userId} triggered security flags:`, result.securityFlags);
        }

        // Check if document is invalid
        if (!result.success || !result.data?.isValidDocument) {
            // Still log the attempt
            await prisma.financeAuditLog.create({
                data: {
                    userId,
                    action: "ocr.invalid_document",
                    entityType: "receipt",
                    newValue: {
                        success: false,
                        isValidDocument: result.data?.isValidDocument || false,
                        documentType: result.data?.documentType || "unknown",
                        validationMessage: result.data?.validationMessage || result.error,
                        securityFlags: result.securityFlags || [],
                        processingTime: result.processingTime,
                    },
                },
            });

            return NextResponse.json(
                {
                    success: false,
                    error: result.error || result.data?.validationMessage || "Documento no válido",
                    data: result.data ? {
                        isValidDocument: false,
                        documentType: result.data.documentType,
                        validationMessage: result.data.validationMessage,
                    } : undefined,
                    processingTime: result.processingTime,
                },
                { status: 422 }
            );
        }

        // Get categories for mapping
        const categories = await prisma.financeCategory.findMany({
            where: {
                OR: [{ userId }, { userId: null }],
                type: "EXPENSE",
                isActive: true,
            },
            select: { id: true, name: true },
        });

        // Find matching category
        const suggestedCategoryName = result.data?.suggestedCategory.value || "Otros";
        const matchedCategory = categories.find(
            (c) => c.name.toLowerCase() === suggestedCategoryName.toLowerCase()
        ) || categories.find((c) => c.name === "Otros");

        // Get default account
        const defaultAccount = await prisma.financeAccount.findFirst({
            where: { userId, isActive: true },
            orderBy: { isDefault: "desc" },
            select: { id: true, name: true },
        });

        // Log OCR usage for analytics
        await prisma.financeAuditLog.create({
            data: {
                userId,
                action: "ocr.processed",
                entityType: "receipt",
                newValue: {
                    success: true,
                    isValidDocument: true,
                    documentType: result.data.documentType,
                    documentNumber: result.data.documentNumber?.value,
                    itemsCount: result.data.items?.length || 0,
                    total: result.data.financials?.total || result.data.amount?.value,
                    processingTime: result.processingTime,
                },
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                // Validation fields
                isValidDocument: result.data.isValidDocument,
                documentType: result.data.documentType,
                
                // Document info
                documentNumber: result.data.documentNumber,
                emissionDate: result.data.emissionDate,
                paymentDate: result.data.paymentDate,
                
                // Merchant/Business info
                merchant: result.data.merchant,
                
                // Customer info (for facturas)
                customer: result.data.customer,
                
                // Transaction details
                purchaseType: result.data.purchaseType,
                paymentMethod: result.data.paymentMethod,
                
                // Items
                items: result.data.items || [],
                
                // Financials
                financials: result.data.financials,
                
                // Legacy fields for compatibility
                amount: result.data.amount,
                date: result.data.date,
                rut: result.data.rut,
                subtotal: result.data.subtotal,
                tax: result.data.tax,
                
                // Category suggestion
                suggestedCategory: {
                    ...result.data.suggestedCategory,
                    categoryId: matchedCategory?.id,
                    categoryName: matchedCategory?.name,
                },
                
                // Document identifiers
                barcodeData: result.data.barcodeData,
                siiCode: result.data.siiCode,
                
                // Account suggestion
                defaultAccountId: defaultAccount?.id,
                defaultAccountName: defaultAccount?.name,
            },
            processingTime: result.processingTime,
            totalTime: Date.now() - startTime,
        });
    } catch (error) {
        console.error("[OCR POST] Error:", error);
        return NextResponse.json(
            { error: "Error al procesar imagen", details: (error as Error).message },
            { status: 500 }
        );
    }
}