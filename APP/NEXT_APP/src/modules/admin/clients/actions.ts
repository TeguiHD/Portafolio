"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permission-check";
import { logger } from "@/lib/logger";
import type { Role } from '@/generated/prisma/client';
import { validateRut, cleanRut } from "@/lib/rut";

/**
 * Quien llama tiene que estar en el panel, poder editar cotizaciones y ser dueño del cliente
 * (o superadministrador). Las acciones de servidor se pueden invocar sin pasar por la interfaz.
 */
async function autorizarSobreCliente(id: string): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, error: "No autorizado" };
    const puede = await hasPermission(session.user.id, session.user.role as Role, "quotations.edit");
    if (!puede) return { ok: false, error: "Permiso denegado" };
    const cliente = await prisma.quotationClient.findUnique({ where: { id }, select: { userId: true } });
    if (!cliente) return { ok: false, error: "Cliente no encontrado" };
    if (session.user.role !== "SUPERADMIN" && cliente.userId !== session.user.id) {
        return { ok: false, error: "No autorizado" };
    }
    return { ok: true, userId: session.user.id };
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function getClientsWithSearchAction(query: string = "") {
    const session = await auth();
    if (!session?.user?.id) return [];

    const clients = await prisma.quotationClient.findMany({
        where: {
            userId: session.user.id,
            ...(query.trim()
                ? {
                      OR: [
                          { name: { contains: query, mode: "insensitive" } },
                          { slug: { contains: query, mode: "insensitive" } },
                          { email: { contains: query, mode: "insensitive" } },
                          { company: { contains: query, mode: "insensitive" } },
                      ],
                  }
                : {}),
        },
        orderBy: { updatedAt: "desc" },
        take: 100,
        // Sin accessCode ni notas internas: el resultado llega al navegador.
        select: {
            id: true, name: true, slug: true, email: true, isActive: true, createdAt: true, updatedAt: true,
            userId: true, company: true, rut: true, address: true, contactName: true, contactEmail: true,
            contactPhone: true, contactRole: true, workType: true,

            _count: {
                select: {
                    quotations: {
                        where: { isDeleted: false }
                    }
                }
            }
        }
    });

    return clients;
}

export async function deleteClientAction(id: string) {
    if (!id) return { success: false, error: "Falta el cliente" };

    // Permiso fino y dueño ANTES de tocar nada (antes las propuestas se borraban y recién después se comprobaba).
    const permiso = await autorizarSobreCliente(id);
    if (!permiso.ok) return { success: false, error: permiso.error };
    const session = await auth();

    // Get active quotations count (ignoring soft-deleted)
    const activeQuotationsCount = await prisma.quotation.count({
        where: {
            clientId: id,
            isDeleted: false
        }
    });

    if (activeQuotationsCount > 0) {
        // Solo el superadministrador puede borrar un cliente con propuestas: se archivan (borrado lógico), no se pierden.
        if (session?.user?.role !== "SUPERADMIN") {
            return {
                success: false,
                error: `No se puede eliminar: el cliente tiene ${activeQuotationsCount} propuesta(s) activas. Solo un superadministrador puede eliminar clientes con datos asociados.`
            };
        }

        try {
            await prisma.quotation.updateMany({
                where: { clientId: id, isDeleted: false },
                data: { isDeleted: true, deletedAt: new Date() }
            });
        } catch (error) {
            logger.error("Error cleaning up client quotations", error);
            return { success: false, error: "Error al limpiar datos asociados del cliente" };
        }
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
        // P2003: oportunidades, contratos o gastos siguen apuntando al cliente.
        if ((error as { code?: string })?.code === "P2003") {
            return { success: false, error: "El cliente tiene oportunidades, contratos o gastos asociados. Elimínalos primero." };
        }
        logger.error("[Client Action] Delete failed", error);
        return { success: false, error: "Error al eliminar cliente" };
    }
}

export async function rotateClientCodeAction(id: string, newCode: string) {
    if (!id || !newCode) return { success: false, error: "Datos incompletos" };
    const permiso = await autorizarSobreCliente(id);
    if (!permiso.ok) return { success: false, error: permiso.error };

    // Validate minimum strength
    // La misma regla que muestra el formulario (8): antes el servidor aceptaba 6.
    if (typeof newCode !== "string" || newCode.trim().length < 8 || newCode.length > 200) {
        return { success: false, error: "La contraseña debe tener al menos 8 caracteres" };
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
        logger.error("Error rotating code", e);
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
}

export async function createClientAction(data: CreateClientData) {
    if (!data.name?.trim()) {
        return { success: false, error: "El nombre es requerido" };
    }

    if (data.rut && !validateRut(data.rut)) {
        return { success: false, error: "El RUT ingresado no es válido" };
    }

    if (data.email && !isValidEmail(data.email)) {
        return { success: false, error: "El email del sistema no es válido" };
    }

    if (data.contactEmail && !isValidEmail(data.contactEmail)) {
        return { success: false, error: "El email de contacto no es válido" };
    }

    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "Usuario no autorizado" };
    }

    const canCreateClient = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "quotations.create"
    );

    if (!canCreateClient) {
        return { success: false, error: "No tienes permisos para crear clientes" };
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
                // Normalizar RUT: guardar siempre en formato limpio con guión (sin puntos)
                rut: data.rut ? cleanRut(data.rut).replace(/^(.+)(.)$/, "$1-$2") : undefined,
                address: data.address?.trim(),
                contactName: data.contactName?.trim(),
                contactEmail: data.contactEmail?.trim(),
                contactPhone: data.contactPhone?.trim(),
                contactRole: data.contactRole?.trim(),
                accessCode: hashedCode,
                userId: session.user.id,
            },
        });

        revalidatePath("/admin/clientes");
        revalidatePath("/admin/cotizaciones");

        // El hash del código no sale del servidor; el código en claro se muestra una sola vez al crear.
        return {
            success: true,
            client: { id: client.id, name: client.name, slug: client.slug },
            accessCode,
        };
    } catch (e) {
        logger.error("Error creating client", e);
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
    if (!id) return { success: false, error: "Falta el cliente" };
    const permiso = await autorizarSobreCliente(id);
    if (!permiso.ok) return { success: false, error: permiso.error };
    if (!data.name?.trim()) return { success: false, error: "El nombre es requerido" };

    if (data.rut && !validateRut(data.rut)) {
        return { success: false, error: "El RUT ingresado no es válido" };
    }

    if (data.email && !isValidEmail(data.email)) {
        return { success: false, error: "El email del sistema no es válido" };
    }

    if (data.contactEmail && !isValidEmail(data.contactEmail)) {
        return { success: false, error: "El email de contacto no es válido" };
    }

    try {
        await prisma.quotationClient.update({
            where: { id },
            data: {
                name: data.name.trim(),
                company: data.company?.trim() || null,
                rut: data.rut ? cleanRut(data.rut).replace(/^(.+)(.)$/, "$1-$2") : null,
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
        logger.error("Error updating client contact", e);
        return { success: false, error: "Error al actualizar información de contacto" };
    }
}
