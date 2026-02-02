"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getClientsWithSearchAction(query: string = "") {
    const clients = await prisma.quotationClient.findMany({
        where: {
            OR: [
                { name: { contains: query, mode: "insensitive" } },
                { slug: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } }
            ]
        },
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: { quotations: true }
            }
        }
    });

    return clients;
}

export async function deleteClientAction(id: string) {
    if (!id) return { success: false, error: "ID required" };

    // Check for existing quotations
    const client = await prisma.quotationClient.findUnique({
        where: { id },
    });

    if (!client) return { success: false, error: "Cliente no encontrado" };

    // Get active quotations count (ignoring soft-deleted)
    const activeQuotationsCount = await prisma.quotation.count({
        where: {
            clientId: id,
            isDeleted: false
        }
    });

    // Get session for permission check and audit logging
    const { auth } = await import("@/lib/auth");
    const session = await auth();



    if (activeQuotationsCount > 0) {
        // [SECURITY] Strict check: Only SUPERADMIN can delete clients with data
        if (session?.user?.role !== "SUPERADMIN") {
            return {
                success: false,
                error: `No se puede eliminar: El cliente tiene ${activeQuotationsCount} cotización(es) activas. Solo un Superadministrador puede eliminar clientes con datos asociados.`
            };
        }

        // Cascade delete (soft delete) if superadmin deletes a client with quotations?
        // Or hard delete quotations? User said "se espera que esos datos realmente no se borren".
        // But if we delete the CLIENT, the linkage is gone unless we soft-delete the client too.
        // Assuming for now we hard-delete the associations or soft-delete them.
        // Given the prompt "las cotizaciones se pueden borrar... se entiende que se borra... pero no se borren", 
        // implies we should SOFT DELETE the quotations when deleting the client.

        try {
            // Soft delete all active quotations for this client
            await prisma.quotation.updateMany({
                where: { clientId: id, isDeleted: false },
                data: { isDeleted: true, deletedAt: new Date() }
            });
        } catch (error) {
            console.error("Error cleaning up client quotations:", error);
            return { success: false, error: "Error al limpiar datos asociados del cliente" };
        }
    }

    // [SECURITY] Ownership check
    // If not superadmin, must be owner
    if (session?.user?.role !== "SUPERADMIN" && client.userId !== session?.user?.id) {
        return { success: false, error: "No tienes permiso para eliminar este cliente" };
    }

    try {
        await prisma.quotationClient.delete({ where: { id } });

        // [AUDIT] Log the deletion
        await prisma.auditLog.create({
            data: {
                action: "DELETE_CLIENT",
                category: "clients",
                userId: session?.user?.id,
                targetId: id,
                targetType: "QuotationClient",
                metadata: {
                    deletedByRole: session?.user?.role,
                    hadQuotations: activeQuotationsCount > 0
                }
            }
        });

        revalidatePath("/admin/clientes");
        return { success: true };
    } catch (error) {
        console.error('[Client Action] Delete failed:', error instanceof Error ? error.message : error);
        return { success: false, error: "Error al eliminar cliente" };
    }
}

export async function rotateClientCodeAction(id: string, newCode: string) {
    if (!id || !newCode) return { success: false, error: "Datos incompletos" };

    // Validate minimum strength
    if (newCode.length < 6) {
        return { success: false, error: "El código debe tener al menos 6 caracteres" };
    }

    const { hash } = await import("argon2");

    try {
        const hashedCode = await hash(newCode);
        await prisma.quotationClient.update({
            where: { id },
            data: { accessCode: hashedCode }
        });
        revalidatePath("/admin/clientes");
        return { success: true };
    } catch (e) {
        console.error("Error rotating code:", e);
        return { success: false, error: "Error al actualizar código" };
    }
}

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, "") // Trim hyphens
        .substring(0, 50); // Limit length
}

function generateAccessCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

interface CreateClientData {
    name: string;
    company?: string;
    rut?: string;
    address?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactRole?: string;
    email?: string;
    userId: string;
}

export async function createClientAction(data: CreateClientData) {
    if (!data.name?.trim()) {
        return { success: false, error: "El nombre es requerido" };
    }

    if (!data.userId) {
        return { success: false, error: "Usuario no autorizado" };
    }

    const { hash } = await import("argon2");

    try {
        // Generate unique slug
        const baseSlug = generateSlug(data.name);
        let slug = baseSlug;
        let counter = 1;

        while (await prisma.quotationClient.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        // Generate and hash access code
        const accessCode = generateAccessCode();
        const hashedCode = await hash(accessCode);

        const client = await prisma.quotationClient.create({
            data: {
                name: data.name.trim(),
                slug,
                email: data.email?.trim() || null,
                company: data.company?.trim(),
                rut: data.rut?.trim(),
                address: data.address?.trim(),
                contactName: data.contactName?.trim(),
                contactEmail: data.contactEmail?.trim(),
                contactPhone: data.contactPhone?.trim(),
                contactRole: data.contactRole?.trim(),
                accessCode: hashedCode,
                userId: data.userId,
            },
        });

        revalidatePath("/admin/clientes");
        revalidatePath("/admin/cotizaciones");

        return {
            success: true,
            client,
            accessCode, // Return plain code for display
        };
    } catch (e) {
        console.error("Error creating client:", e);
        return { success: false, error: "Error al crear cliente" };
    }
}

export interface UpdateClientContactData {
    name: string;
    company?: string;
    rut?: string;
    address?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactRole?: string;
    email?: string;
}

export async function updateClientContactAction(id: string, data: UpdateClientContactData) {
    if (!id) return { success: false, error: "ID required" };
    if (!data.name?.trim()) return { success: false, error: "El nombre es requerido" };

    try {
        await prisma.quotationClient.update({
            where: { id },
            data: {
                name: data.name.trim(),
                company: data.company?.trim() || null,
                rut: data.rut?.trim() || null,
                address: data.address?.trim() || null,
                contactName: data.contactName?.trim() || null,
                contactEmail: data.contactEmail?.trim() || null,
                contactPhone: data.contactPhone?.trim() || null,
                contactRole: data.contactRole?.trim() || null,
                email: data.email?.trim() || null,
            }
        });

        revalidatePath("/admin/clientes");
        return { success: true };
    } catch (e) {
        console.error("Error updating client contact:", e);
        return { success: false, error: "Error al actualizar información de contacto" };
    }
}
