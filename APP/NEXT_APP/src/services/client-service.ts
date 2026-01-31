import { prisma } from "@/lib/prisma";
import { hash, verify } from "argon2";

export type CreateClientInput = {
    name: string;
    slug: string;
    email?: string;
    accessCode: string; // Plain text code provided by admin
    userId: string; // Required: owner of this client
};

export class ClientService {
    /**
     * Create a new client with a secure hashed access code
     */
    static async createClient(data: CreateClientInput) {
        const accessCodeHash = await hash(data.accessCode);

        return prisma.quotationClient.create({
            data: {
                name: data.name,
                slug: data.slug,
                email: data.email,
                accessCode: accessCodeHash,
                user: { connect: { id: data.userId } },
            },
        });
    }

    /**
     * Update a client's access code
     */
    static async updateAccessCode(clientId: string, newCode: string) {
        const accessCodeHash = await hash(newCode);
        return prisma.quotationClient.update({
            where: { id: clientId },
            data: { accessCode: accessCodeHash },
        });
    }

    /**
     * Get client by slug (public info only)
     */
    static async getClientBySlug(slug: string) {
        return prisma.quotationClient.findUnique({
            where: { slug },
            select: {
                id: true,
                name: true,
                slug: true,
                isActive: true,
            },
        });
    }

    /**
     * Verify access code for a client
     */
    static async verifyAccess(slug: string, code: string): Promise<boolean> {
        const client = await prisma.quotationClient.findUnique({
            where: { slug },
        });

        if (!client || !client.isActive) return false;

        return verify(client.accessCode, code);
    }

    /**
     * Get client details with quotations (Admin only)
     */
    static async getClientWithQuotations(id: string) {
        return prisma.quotationClient.findUnique({
            where: { id },
            include: {
                quotations: {
                    orderBy: { createdAt: "desc" },
                },
            },
        });
    }

    /**
     * List all clients (Admin)
     */
    static async getAllClients() {
        return prisma.quotationClient.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: { quotations: true },
                },
            },
        });
    }
}
