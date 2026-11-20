"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hash } from "argon2";
import { sanitizeQuotationHtml } from "@/lib/quotation-sanitizer";
import { generateSecureAccessCode } from "@/lib/secure-token";
import { MARCA_PORTAL, ARGON2_CODIGO } from "@/lib/quotation-signature";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from '@/generated/prisma/client';

// Código legible con ~62 bits (palabra + 3 grupos de 4), generado con crypto.
function generateSecureCode(): string {
    return generateSecureAccessCode();
}

// Create URL-friendly slug
function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 50);
}

// Calculate expiration date
function calculateExpiration(duration: string): Date | null {
    if (duration === "indefinite") return null;
    const days = { "7d": 7, "15d": 15, "30d": 30 }[duration] || 15;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}

export async function createQuotationAction(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado" };
    }

    // SECURITY: Check granular permission
    const canCreate = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "quotations.create"
    );
    if (!canCreate) {
        return { success: false, error: "Permiso denegado" };
    }

    const clientId = formData.get("clientId") as string;
    const folio = formData.get("folio") as string;
    const projectName = formData.get("projectName") as string;
    // Pesos sin decimales; vacío, negativo o no numérico queda en 0 (se puede escribir después al editar).
    const totalLeido = Number(formData.get("total"));
    const total = Number.isFinite(totalLeido) && totalLeido > 0 ? Math.min(Math.round(totalLeido), 1e12) : 0;
    const htmlContent = formData.get("htmlContent") as string;
    const accessMode = formData.get("accessMode") as "public" | "code" || "code";
    const codeDuration = formData.get("codeDuration") as string || "15d";

    if (!clientId || !folio || !projectName || !htmlContent) {
        return { success: false, error: "Faltan campos requeridos" };
    }

    try {
        const isSuperAdmin = session.user.role === "SUPERADMIN";

        // Resolve the client with ownership/sharing checks before creating data under it.
        const client = await prisma.quotationClient.findFirst({
            where: isSuperAdmin
                ? { id: clientId }
                : {
                    id: clientId,
                    OR: [
                        { userId: session.user.id },
                        {
                            sharedWith: {
                                some: {
                                    sharedWithUserId: session.user.id,
                                    permission: { in: ["EDIT", "FULL"] }
                                }
                            }
                        }
                    ]
                },
            include: {
                sharedWith: {
                    where: { sharedWithUserId: session.user.id },
                    select: { permission: true }
                }
            }
        });

        if (!client) {
            return { success: false, error: "Cliente no encontrado o sin permisos para crear cotizaciones" };
        }

        // Sanitize HTML Content (OWASP Security Measure)
        // Removes malicious scripts/events while preserving Tailwind/Fonts
        const cleanHtmlContent = sanitizeQuotationHtml(htmlContent);

        // Generate unique slug
        let slug = slugify(projectName);
        const existingSlug = await prisma.quotation.findFirst({
            where: { clientId, slug }
        });
        if (existingSlug) {
            slug = `${slug}-${Date.now().toString(36)}`;
        }

        // Prepare access control
        let accessCode: string | null = null;
        let accessCodePlain: string | undefined;
        let codeExpiresAt: Date | null = null;

        if (accessMode === "code") {
            accessCodePlain = generateSecureCode();
            accessCode = await hash(accessCodePlain, ARGON2_CODIGO);
            codeExpiresAt = calculateExpiration(codeDuration);
        }

        // Create quotation
        await prisma.quotation.create({
            data: {
                folio,
                slug,
                projectName,
                clientName: client.name,
                total,
                subtotal: total,
                items: [],
                htmlContent: cleanHtmlContent,
                status: "PENDING",
                validDays: 15,
                userId: client.userId,
                clientId,
                accessMode,
                accessCode,
                codeExpiresAt
            }
        });

        revalidatePath("/admin/cotizaciones");
        revalidatePath(`/admin/cotizaciones/${clientId}`);

        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const link = `${baseUrl}/cotizacion/${client.slug}/${slug}`;

        return {
            success: true,
            link,
            accessCode: accessCodePlain
        };
    } catch (error) {
        console.error("Error creating quotation:", error);
        if (
            error instanceof Error &&
            "code" in error &&
            (error as { code: string }).code === "P2002"
        ) {
            return { success: false, error: "El folio ya existe. Usa un folio diferente (ej: WEB-2026-IND02)." };
        }
        return { success: false, error: "Error al crear cotización" };
    }
}

export async function updateQuotationAccessAction(
    quotationId: string,
    mode: "public" | "code",
    duration?: string
) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado" };
    }

    // SECURITY: Check granular permission
    const canEdit = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "quotations.edit"
    );
    if (!canEdit) {
        return { success: false, error: "Permiso denegado" };
    }
    if (mode !== "public" && mode !== "code") {
        return { success: false, error: "Modo de acceso inválido" };
    }
    if (duration !== undefined && !["7d", "15d", "30d", "indefinite"].includes(duration)) {
        return { success: false, error: "Duración inválida" };
    }

    // Dueño del cliente o superadmin: sin esto, cualquier usuario del panel podía abrir o
    // rotar el código de una cotización ajena y quedarse con el código en texto plano.
    const propia = await prisma.quotation.findUnique({
        where: { id: quotationId },
        select: { clientId: true, client: { select: { userId: true } } },
    });
    if (!propia) return { success: false, error: "Cotización no encontrada" };
    if (session.user.role !== "SUPERADMIN" && propia.client?.userId !== session.user.id) {
        return { success: false, error: "No autorizado" };
    }

    try {
        let accessCode: string | null = null;
        let accessCodePlain: string | undefined;
        let codeExpiresAt: Date | null = null;

        if (mode === "code") {
            accessCodePlain = generateSecureCode();
            accessCode = await hash(accessCodePlain, ARGON2_CODIGO);
            codeExpiresAt = calculateExpiration(duration || "15d");
        }

        await prisma.quotation.update({
            where: { id: quotationId },
            data: {
                accessMode: mode,
                accessCode,
                codeExpiresAt
            },
            select: { id: true },
        });

        if (propia.clientId) revalidatePath(`/admin/cotizaciones/${propia.clientId}`);

        return {
            success: true,
            code: accessCodePlain
        };
    } catch (error) {
        console.error("Error updating access:", error);
        return { success: false, error: "Error al actualizar acceso" };
    }
}

export async function toggleVisibilityAction(
    quotationId: string,
    isVisible: boolean
) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado" };
    }

    // SECURITY: Check granular permission
    const canEdit = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "quotations.edit"
    );
    if (!canEdit) {
        return { success: false, error: "Permiso denegado" };
    }

    try {
        // Verify ownership (unless superadmin)
        const quotation = await prisma.quotation.findUnique({
            where: { id: quotationId },
            select: { id: true, clientId: true, client: { select: { userId: true } } }
        });

        if (!quotation) {
            return { success: false, error: "Cotización no encontrada" };
        }

        // Check ownership: user must own the client or be superadmin
        const isSuperAdmin = session.user.role === "SUPERADMIN";
        if (!isSuperAdmin && quotation.client?.userId !== session.user.id) {
            return { success: false, error: "No autorizado" };
        }

        await prisma.quotation.update({
            where: { id: quotationId },
            data: { isVisible }
        });

        revalidatePath("/admin/cotizaciones");
        if (quotation.clientId) revalidatePath(`/admin/cotizaciones/${quotation.clientId}`);

        return { success: true };
    } catch (error) {
        console.error("Error toggling visibility:", error);
        return { success: false, error: "Error al cambiar visibilidad" };
    }
}

export async function deleteQuotationAction(quotationId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado" };
    }

    // SECURITY: Check granular permission
    const canDelete = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "quotations.delete"
    );
    if (!canDelete) {
        return { success: false, error: "Permiso denegado" };
    }

    try {
        // Verify ownership (unless superadmin)
        const quotation = await prisma.quotation.findUnique({
            where: { id: quotationId },
            select: { id: true, clientId: true, slug: true, folio: true, client: { select: { userId: true, slug: true } } }
        });

        if (!quotation) {
            return { success: false, error: "Cotización no encontrada" };
        }

        // Check ownership: user must own the client or be superadmin
        const isSuperAdmin = session.user.role === "SUPERADMIN";
        if (!isSuperAdmin && quotation.client?.userId !== session.user.id) {
            return { success: false, error: "No autorizado" };
        }

        // Soft Delete (Business Requirement: Retention for backup/audit)
        await prisma.quotation.update({
            where: { id: quotationId },
            data: {
                isDeleted: true,
                deletedAt: new Date()
            }
        });

        revalidatePath("/admin/clientes");
        revalidatePath("/admin/cotizaciones");
        revalidatePath(`/admin/cotizaciones/${quotation.clientId}`);
        if (quotation.clientId) {
            revalidatePath(`/admin/clientes/${quotation.clientId}`);
        }
        if (quotation.client?.slug) {
            revalidatePath(`/cotizacion/${quotation.client.slug}/${quotation.slug || quotation.folio}`);
        }

        return { success: true };
    } catch (error) {
        console.error("Error deleting quotation:", error);
        return { success: false, error: "Error al eliminar cotización" };
    }
}

export async function getQuotationForEditAction(quotationId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado", data: null };
    }

    // SECURITY: Check granular permission
    const canView = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "quotations.view"
    );
    if (!canView) {
        return { success: false, error: "Permiso denegado", data: null };
    }

    try {
        const quotation = await prisma.quotation.findUnique({
            where: { id: quotationId },
            select: { id: true, clientId: true, folio: true, projectName: true, htmlContent: true, total: true, status: true, notes: true, client: { select: { userId: true } } }
        });

        if (!quotation) {
            return { success: false, error: "Cotización no encontrada", data: null };
        }

        // Check ownership: user must own the client or be superadmin
        const isSuperAdmin = session.user.role === "SUPERADMIN";
        if (!isSuperAdmin && quotation.client?.userId !== session.user.id) {
            return { success: false, error: "No autorizado", data: null };
        }

        return {
            success: true,
            data: {
                id: quotation.id,
                folio: quotation.folio,
                projectName: quotation.projectName,
                htmlContent: quotation.htmlContent,
                total: quotation.total,
                status: quotation.status,
                notes: quotation.notes
            }
        };
    } catch (error) {
        console.error("Error getting quotation:", error);
        return { success: false, error: "Error al obtener cotización", data: null };
    }
}

export async function updateQuotationAction(
    quotationId: string,
    data: {
        projectName?: string;
        htmlContent?: string;
        total?: number;
        notes?: string;
    }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado" };
    }

    // SECURITY: Check granular permission
    const canEdit = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "quotations.edit"
    );
    if (!canEdit) {
        return { success: false, error: "Permiso denegado" };
    }

    try {
        // Verify ownership (unless superadmin)
        const quotation = await prisma.quotation.findUnique({
            where: { id: quotationId },
            select: { id: true, clientId: true, client: { select: { userId: true } } }
        });

        if (!quotation) {
            return { success: false, error: "Cotización no encontrada" };
        }

        // Check ownership: user must own the client or be superadmin
        const isSuperAdmin = session.user.role === "SUPERADMIN";
        if (!isSuperAdmin && quotation.client?.userId !== session.user.id) {
            return { success: false, error: "No autorizado" };
        }

        // Sanitize HTML if provided
        const updateData: Record<string, unknown> = {};
        if (data.projectName) updateData.projectName = data.projectName.trim().slice(0, 200);
        if (data.htmlContent) updateData.htmlContent = sanitizeQuotationHtml(data.htmlContent);
        if (data.total !== undefined) {
            if (!Number.isFinite(data.total) || data.total < 0) return { success: false, error: "El total no es válido" };
            updateData.total = Math.min(Math.round(data.total), 1e12);
        }
        if (data.notes !== undefined) updateData.notes = data.notes?.trim().slice(0, 1000) || null;

        await prisma.quotation.update({
            where: { id: quotationId },
            data: updateData
        });

        revalidatePath("/admin/cotizaciones");
        if (quotation.clientId) revalidatePath(`/admin/cotizaciones/${quotation.clientId}`);

        return { success: true };
    } catch (error) {
        console.error("Error updating quotation:", error);
        return { success: false, error: "Error al actualizar cotización" };
    }
}

/**
 * Anula la firma vigente que el cliente hizo desde el portal (por ejemplo, si firmó la persona
 * equivocada). La firma queda en el registro como REVOKED, la cotización vuelve a PENDING y el
 * cliente puede firmar de nuevo.
 */
export async function anularFirmaAction(quotationId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado" };
    }
    const canEdit = await hasPermission(session.user.id, session.user.role as Role, "quotations.edit");
    if (!canEdit) {
        return { success: false, error: "Permiso denegado" };
    }

    const quotation = await prisma.quotation.findUnique({
        where: { id: quotationId },
        select: { id: true, status: true, clientId: true, userId: true, client: { select: { userId: true } } },
    });
    if (!quotation) {
        return { success: false, error: "Cotización no encontrada" };
    }
    const isSuperAdmin = session.user.role === "SUPERADMIN";
    if (!isSuperAdmin && quotation.client?.userId !== session.user.id) {
        return { success: false, error: "No autorizado" };
    }

    try {
        const anuladas = await prisma.$transaction(async (tx) => {
            const r = await tx.clientApproval.updateMany({
                where: {
                    quotationId,
                    status: "SIGNED",
                    type: "QUOTATION",
                    fingerprint: MARCA_PORTAL,
                    userId: quotation.userId,
                },
                data: { status: "REVOKED" },
            });
            if (r.count > 0 && quotation.status === "APPROVED") {
                await tx.quotation.update({ where: { id: quotationId }, data: { status: "PENDING" } });
                await tx.quotationStatusHistory.create({
                    data: {
                        quotationId,
                        fromStatus: "APPROVED",
                        toStatus: "PENDING",
                        changedBy: session.user.id,
                        reason: "Firma del cliente anulada desde el panel",
                    },
                });
            }
            return r.count;
        });
        if (anuladas === 0) {
            return { success: false, error: "No hay una firma vigente que anular" };
        }
        revalidatePath("/admin/cotizaciones");
        if (quotation.clientId) revalidatePath(`/admin/cotizaciones/${quotation.clientId}`);
        return { success: true };
    } catch (error) {
        console.error("Error anulando firma:", error);
        return { success: false, error: "Error al anular la firma" };
    }
}

/** Dueño del cliente (o superadmin) con el permiso indicado; devuelve la sesión y el cliente. */
async function autorizarCliente(clientId: string, permiso: "quotations.view" | "quotations.edit") {
    const session = await auth();
    if (!session?.user?.id) return { error: "No autorizado" as const };
    const puede = await hasPermission(session.user.id, session.user.role as Role, permiso);
    if (!puede) return { error: "Permiso denegado" as const };
    const cliente = await prisma.quotationClient.findUnique({
        where: { id: clientId },
        select: { id: true, slug: true, name: true, userId: true, isActive: true },
    });
    if (!cliente) return { error: "Cliente no encontrado" as const };
    if (session.user.role !== "SUPERADMIN" && cliente.userId !== session.user.id) return { error: "No autorizado" as const };
    return { session, cliente };
}

/** Abre el portal del cliente tal como él lo ve, en modo solo lectura, y lo deja en la auditoría. */
export async function verComoClienteAction(clientId: string) {
    const r = await autorizarCliente(clientId, "quotations.view");
    if ("error" in r) return { success: false as const, error: r.error };
    const { abrirVistaCliente } = await import("@/lib/portal-cliente");
    await abrirVistaCliente(r.cliente, r.session.user.id);
    await prisma.auditLog.create({
        data: {
            action: "portal.view_as_client",
            category: "clients",
            userId: r.session.user.id,
            targetId: r.cliente.id,
            targetType: "QuotationClient",
            metadata: { clientSlug: r.cliente.slug },
        },
    }).catch(() => null);
    return { success: true as const, url: `/cotizacion/${r.cliente.slug}` };
}

/** Activa o suspende el acceso del cliente a su portal (cierra al instante sus sesiones). */
export async function cambiarAccesoPortalAction(clientId: string, activo: boolean) {
    const r = await autorizarCliente(clientId, "quotations.edit");
    if ("error" in r) return { success: false as const, error: r.error };
    await prisma.quotationClient.update({ where: { id: clientId }, data: { isActive: Boolean(activo) } });
    await prisma.auditLog.create({
        data: {
            action: activo ? "portal.access_enabled" : "portal.access_disabled",
            category: "clients",
            userId: r.session.user.id,
            targetId: clientId,
            targetType: "QuotationClient",
        },
    }).catch(() => null);
    revalidatePath(`/admin/cotizaciones/${clientId}`);
    return { success: true as const };
}
