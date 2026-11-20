import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

function createPrismaClient() {
    // En el VPS (1 GB, con swap) cada conexión nueva pide «db» al DNS de Docker, que bajo presión
    // de memoria responde tarde (EAI_AGAIN). Pocas conexiones, que duran: menos DNS y menos RAM
    // en Postgres (cada conexión es un proceso propio).
    const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL!,
        max: 5,
        idleTimeoutMillis: 5 * 60_000,
        keepAlive: true,
        // Con las 5 conexiones ocupadas, esperar a lo más 5 s por una (antes, sin tope); y ninguna consulta pasa de 15 s.
        connectionTimeoutMillis: 5_000,
        statement_timeout: 15_000,
    })
    return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
