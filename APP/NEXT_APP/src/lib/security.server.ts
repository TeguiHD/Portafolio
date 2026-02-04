// Server-only security functions - DO NOT import in client components
import 'server-only'
import argon2 from 'argon2'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'crypto'

// ============= ARGON2ID PASSWORD HASHING =============

const ARGON2_OPTIONS: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 65536,     // 64 MB
    timeCost: 3,           // 3 iterations
    parallelism: 1,        // 1 thread
    hashLength: 32,
}

// 🛡️ Defense in Depth: Pepper
// A secret key stored ONLY in environment (not DB) combined with password
const PEPPER = process.env.PASSWORD_PEPPER

function getPepperedPassword(password: string): string {
    if (!PEPPER) {
        // Fallback for dev, or throw in prod
        if (process.env.NODE_ENV === 'production') {
            throw new Error('CRITICAL: PASSWORD_PEPPER is not configured.')
        }
        return password
    }
    return `${password}${PEPPER}`
}

export async function hashPassword(password: string): Promise<string> {
    const peppered = getPepperedPassword(password)
    return argon2.hash(peppered, ARGON2_OPTIONS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
        const peppered = getPepperedPassword(password)
        if (await argon2.verify(hash, peppered)) {
            return true
        }
    } catch {
        // Ignore error, proceed to fallback
    }

    // Fallback: Check without pepper (for migration / legacy hashes)
    try {
        return await argon2.verify(hash, password)
    } catch {
        return false
    }
}

export async function needsRehash(hash: string): Promise<boolean> {
    return argon2.needsRehash(hash, ARGON2_OPTIONS)
}

// ============= AES-256-GCM ENCRYPTION =============

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
const ALGORITHM = 'aes-256-gcm'

function requireEncryptionKey(): string {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
        throw new Error('ENCRYPTION_KEY is missing or too short (min 32 chars)')
    }
    return ENCRYPTION_KEY
}

function getKey(): Buffer {
    return scryptSync(requireEncryptionKey(), 'salt', 32)
}

export function encryptData(plaintext: string): string {
    const key = getKey()
    const iv = randomBytes(16)
    const cipher = createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(plaintext, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag()
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

export function decryptData(encryptedString: string): string {
    try {
        const [ivBase64, authTagBase64, encryptedData] = encryptedString.split(':')

        if (!ivBase64 || !authTagBase64 || !encryptedData) {
            throw new Error('Invalid encrypted string format')
        }

        const key = getKey()
        const iv = Buffer.from(ivBase64, 'base64')
        const authTag = Buffer.from(authTagBase64, 'base64')

        const decipher = createDecipheriv(ALGORITHM, key, iv)
        decipher.setAuthTag(authTag)

        let decrypted = decipher.update(encryptedData, 'base64', 'utf8')
        decrypted += decipher.final('utf8')

        return decrypted
    } catch {
        throw new Error('Failed to decrypt data')
    }
}

// ============= EMAIL ENCRYPTION =============

export function hashEmail(email: string): string {
    const normalizedEmail = email.toLowerCase().trim()
    return createHash('sha256').update(normalizedEmail + requireEncryptionKey()).digest('hex')
}

// Hash any identifier (IP/user-agent/etc) with the same server-side secret
export function hashIdentifier(value: string): string {
    return createHash('sha256').update(value + requireEncryptionKey()).digest('hex')
}

export function encryptEmail(email: string): { encrypted: string; hash: string } {
    const normalizedEmail = email.toLowerCase().trim()
    return {
        encrypted: encryptData(normalizedEmail),
        hash: hashEmail(normalizedEmail)
    }
}

export function decryptEmail(encryptedEmail: string): string {
    return decryptData(encryptedEmail)
}

// ============= RATE LIMITING =============

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
    identifier: string,
    maxAttempts: number = 5,
    windowMs: number = 15 * 60 * 1000
): { allowed: boolean; remainingAttempts: number } {
    const now = Date.now()
    const record = rateLimitMap.get(identifier)

    if (!record || now > record.resetTime) {
        rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
        return { allowed: true, remainingAttempts: maxAttempts - 1 }
    }

    if (record.count >= maxAttempts) {
        return { allowed: false, remainingAttempts: 0 }
    }

    record.count++
    return { allowed: true, remainingAttempts: maxAttempts - record.count }
}

export function resetRateLimit(identifier: string): void {
    rateLimitMap.delete(identifier)
}

