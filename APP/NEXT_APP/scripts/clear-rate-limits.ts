import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!
})
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('\n=== CLEARING RATE LIMIT ENTRIES ===\n')

    // Count existing entries
    const count = await prisma.rateLimitEntry.count()
    console.log(`Found ${count} rate limit entries`)

    // Delete all rate limit entries
    const result = await prisma.rateLimitEntry.deleteMany({})
    console.log(`Deleted ${result.count} rate limit entries`)

    console.log('\nRate limiting cleared! You can now try logging in again.\n')
}

main()
    .catch((e) => {
        console.error('Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
