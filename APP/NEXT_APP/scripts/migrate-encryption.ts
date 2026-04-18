/**
 * Migration Script: Re-encrypt all user emails from legacy salt to v2 derived salt
 * 
 * SELF-CONTAINED: Includes its own crypto and Prisma init for Docker container use.
 * 
 * Run: npx tsx scripts/migrate-encryption.ts
 * 
 * Security: NIST SP 800-132 / OWASP 2025 A04: Cryptographic Failures
 */
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'crypto'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ============= CRYPTO FUNCTIONS (self-contained) =============

const ALGORITHM = 'aes-256-gcm'

function requireEncryptionKey(): string {
    const key = process.env.ENCRYPTION_KEY
    if (!key || key.length < 32) {
        throw new Error('ENCRYPTION_KEY is missing or too short (min 32 chars)')
    }
    return key
}

function getDerivedKey(): Buffer {
    const derivedSalt = createHash('sha256')
        .update(`portfolio-kdf-v2-${requireEncryptionKey()}`)
        .digest()
        .subarray(0, 16)
    return scryptSync(requireEncryptionKey(), derivedSalt, 32)
}

function getLegacyKey(): Buffer {
    return scryptSync(requireEncryptionKey(), 'salt', 32)
}

function decryptWithKey(key: Buffer, iv: Buffer, authTag: Buffer, encryptedData: string): string {
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
}

function decryptData(encryptedString: string): string {
    const isV2 = encryptedString.startsWith('v2:')
    const payload = isV2 ? encryptedString.slice(3) : encryptedString

    const parts = payload.split(':')
    if (parts.length < 3) throw new Error('Invalid encrypted string format')

    const [ivBase64, authTagBase64, ...encryptedParts] = parts
    const encryptedData = encryptedParts.join(':')
    const iv = Buffer.from(ivBase64!, 'base64')
    const authTag = Buffer.from(authTagBase64!, 'base64')

    if (isV2) return decryptWithKey(getDerivedKey(), iv, authTag, encryptedData)

    try {
        return decryptWithKey(getDerivedKey(), iv, authTag, encryptedData)
    } catch {
        return decryptWithKey(getLegacyKey(), iv, authTag, encryptedData)
    }
}

function encryptData(plaintext: string): string {
    const key = getDerivedKey()
    const iv = randomBytes(16)
    const cipher = createCipheriv(ALGORITHM, key, iv)
    let encrypted = cipher.update(plaintext, 'utf8', 'base64')
    encrypted += cipher.final('base64')
    const authTag = cipher.getAuthTag()
    return `v2:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

// ============= MIGRATION =============

async function migrateEncryption() {
    console.log('🔐 Starting encryption migration (legacy salt → v2 derived salt)\n')

    const users = await prisma.user.findMany({
        where: { emailEncrypted: { not: null } },
        select: { id: true, emailEncrypted: true },
    })

    console.log(`📋 Found ${users.length} users with encrypted emails\n`)

    let migrated = 0
    let alreadyV2 = 0
    let errors = 0

    for (const user of users) {
        if (!user.emailEncrypted) continue

        try {
            if (user.emailEncrypted.startsWith('v2:')) {
                alreadyV2++
                continue
            }

            const plaintext = decryptData(user.emailEncrypted)
            const newEncrypted = encryptData(plaintext)

            await prisma.user.update({
                where: { id: user.id },
                data: { emailEncrypted: newEncrypted },
            })

            migrated++
            console.log(`  ✅ User ${user.id} migrated`)
        } catch (err) {
            errors++
            console.error(`  ❌ User ${user.id} FAILED:`, err instanceof Error ? err.message : err)
        }
    }

    console.log('\n📊 Migration Summary:')
    console.log(`   Migrated:    ${migrated}`)
    console.log(`   Already v2:  ${alreadyV2}`)
    console.log(`   Errors:      ${errors}`)
    console.log(`   Total:       ${users.length}`)

    if (errors > 0) {
        console.error('\n⚠️  Some records failed!')
        process.exit(1)
    }

    console.log('\n🎉 Migration complete!')
    await prisma.$disconnect()
}

migrateEncryption().catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
})
