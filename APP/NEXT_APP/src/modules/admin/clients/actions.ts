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
        include: { _count: { select: { quotations: true } } }
    });

    if (!client) return { success: false, error: "Cliente no encontrado" };

    if (client._count.quotations > 0) {
        return {
            success: false,
            error: `No se puede eliminar: El cliente tiene ${client._count.quotations} cotización(es) asociada(s). Elimínalas primero.`
        };
    }

    try {
        await prisma.quotationClient.delete({ where: { id } });
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
