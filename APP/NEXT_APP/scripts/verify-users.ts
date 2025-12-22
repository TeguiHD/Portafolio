import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!
})
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('\n=== DATABASE USERS VERIFICATION ===\n')

    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
        }
    })

    console.log(`Total users in database: ${users.length}\n`)

    users.forEach((user, index) => {
        console.log(`User ${index + 1}:`)
        console.log(`  ID: ${user.id}`)
        console.log(`  Name: ${user.name}`)
        console.log(`  Email Hash: ${user.email.substring(0, 40)}...`)
        console.log(`  Role: ${user.role}`)
        console.log(`  Active: ${user.isActive}`)
        console.log(`  Created: ${user.createdAt.toISOString()}`)
        console.log('')
    })

    if (users.length === 1 && users[0].role === 'SUPERADMIN') {
        console.log('SUCCESS: Single SUPERADMIN user exists in database!')
    }
}

main()
    .catch((e) => {
        console.error('Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
