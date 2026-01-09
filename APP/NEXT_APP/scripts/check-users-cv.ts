import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { createHash, scryptSync, createDecipheriv } from 'crypto'

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!
})
const prisma = new PrismaClient({ adapter })

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY

function requireEncryptionKey(): string {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
        console.error('❌ ENCRYPTION_KEY is required (min 32 chars).')
        process.exit(1)
    }
    return ENCRYPTION_KEY
}

// Derive key for encryption
function getKey(): Buffer {
    return scryptSync(requireEncryptionKey(), 'salt', 32)
}

// Decrypt email
function decryptEmail(encrypted: string): string {
    try {
        const [ivB64, authTagB64, dataB64] = encrypted.split(':')
        const iv = Buffer.from(ivB64, 'base64')
        const authTag = Buffer.from(authTagB64, 'base64')
        const data = Buffer.from(dataB64, 'base64')
        const key = getKey()
        const decipher = createDecipheriv('aes-256-gcm', key, iv)
        decipher.setAuthTag(authTag)
        let decrypted = decipher.update(data)
        decrypted = Buffer.concat([decrypted, decipher.final()])
        return decrypted.toString('utf8')
    } catch {
        return '[decrypt-error]'
    }
}

// Hash email for lookup
function hashEmail(email: string): string {
    const normalizedEmail = email.toLowerCase().trim()
    return createHash('sha256').update(normalizedEmail + requireEncryptionKey()).digest('hex')
}

async function main() {
    console.log('🔍 Checking users and CV versions...\n')

    // Find all users
    const users = await prisma.user.findMany({
        select: { id: true, email: true, emailEncrypted: true, name: true, role: true }
    })

    console.log('📋 Users found:')
    for (const user of users) {
        const realEmail = user.emailEncrypted ? decryptEmail(user.emailEncrypted) : '[no encrypted email]'
        console.log(`  - ID: ${user.id}`)
        console.log(`    Name: ${user.name || '[no name]'}`)
        console.log(`    Email: ${realEmail}`)
        console.log(`    Role: ${user.role}`)
        console.log()
    }

    // Check hash for superadmin1@nicoholas.dev
    const targetEmail = 'superadmin1@nicoholas.dev'
    const targetHash = hashEmail(targetEmail)
    console.log(`🔎 Looking for: ${targetEmail}`)
    console.log(`   Hash: ${targetHash}`)

    const targetUser = await prisma.user.findUnique({
        where: { email: targetHash }
    })

    if (targetUser) {
        console.log(`✅ User found: ${targetUser.id}`)

        // Check CV versions for this user
        const cvVersions = await prisma.cvVersion.findMany({
            where: { userId: targetUser.id },
            include: {
                experiences: true,
                education: true,
                skills: true,
                projects: true,
                certifications: true,
                languages: true,
            }
        })

        console.log(`\n📄 CV Versions for this user: ${cvVersions.length}`)
        for (const cv of cvVersions) {
            console.log(`  - Version: ${cv.name} (ID: ${cv.id})`)
            console.log(`    Full Name: ${cv.fullName}`)
            console.log(`    Title: ${cv.title}`)
            console.log(`    Experiences: ${cv.experiences.length}`)
            console.log(`    Education: ${cv.education.length}`)
            console.log(`    Skills: ${cv.skills.length}`)
            console.log(`    Projects: ${cv.projects.length}`)
        }
    } else {
        console.log('❌ User not found with that email')
    }

    await prisma.$disconnect()
}

main().catch(console.error)
