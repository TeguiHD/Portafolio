import { ClientService } from "./client-service";
import { getRedisClient } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

export class QuotationSecureService {
    private static RATE_LIMIT_PREFIX = "rate_limit:quotation_access:";
    private static MAX_ATTEMPTS = 5;
    private static BLOCK_DURATION = 60 * 60; // 1 hour

    /**
     * Validate access code with Rate Limiting
     */
    static async validateAccess(slug: string, code: string, ip: string): Promise<{ success: boolean; error?: string }> {
        const key = `${this.RATE_LIMIT_PREFIX}${slug}:${ip}`;

        try {
            const redis = await getRedisClient();

            // Check rate limit
            const attempts = await redis.get(key);
            if (attempts && parseInt(attempts) >= this.MAX_ATTEMPTS) {
                return { success: false, error: "Demasiados intentos. Acceso bloqueado temporalmente." };
            }

            // Verify code
            const isValid = await ClientService.verifyAccess(slug, code);

            if (!isValid) {
                // Increment failure count
                const newCount = await redis.incr(key);
                if (newCount === 1) {
                    await redis.expire(key, this.BLOCK_DURATION);
                }
                return { success: false, error: "Código de acceso incorrecto." };
            }

            // Clear attempts on success
            await redis.del(key);
            return { success: true };
        } catch (error) {
            console.error("[QuotationSecureService] Redis error:", error);
            // Fallback: Allow access without rate limit if Redis is unavailable in dev
            if (process.env.NODE_ENV !== "production") {
                const isValid = await ClientService.verifyAccess(slug, code);
                return isValid ? { success: true } : { success: false, error: "Código de acceso incorrecto." };
            }
            return { success: false, error: "Error de servicio. Intente nuevamente." };
        }
    }

    /**
     * Get secure dashboard data (list of quotations)
     */
    static async getClientDashboard(slug: string) {
        const client = await prisma.quotationClient.findUnique({
            where: { slug },
            include: {
                quotations: {
                    where: { status: { not: "DRAFT" } }, // Only show sent/accepted
                    select: {
                        id: true,
                        folio: true,
                        projectName: true,
                        total: true,
                        status: true,
                        validDays: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: "desc" }
                }

            }
        });

        if (!client) return null;

        return {
            name: client.name,
            quotations: client.quotations
        };
    }

    /**
     * Get specific quotation details
     * Verifies that the quotation actually belongs to the client slug
     */
    static async getQuotation(slug: string, quotationId: string) {
        const client = await prisma.quotationClient.findUnique({
            where: { slug },
            select: { id: true }
        });

        if (!client) return null;

        return prisma.quotation.findFirst({
            where: {
                id: quotationId,
                clientId: client.id,
                status: { not: "DRAFT" }
            },
            select: {
                id: true,
                folio: true,
                htmlContent: true, // The raw HTML
                projectName: true,
                total: true,
                createdAt: true
            }
        });
    }
}
