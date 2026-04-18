// Server-only security functions - DO NOT import in client components
import 'server-only'
import argon2 from 'argon2'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'crypto'
import { readSecret } from '@/lib/read-secret'

// ============= ARGON2ID PASSWORD HASHING =============

const ARGON2_OPTIONS: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 65536,     // 64 MB
    timeCost: 3,           // 3 iterations
    parallelism: 1,        // 1 thread
    hashLength: 32,
}

// 🛡️ Defense in Depth: Pepper
// Read from Docker Secret (/run/secrets/password-pepper) with env var fallback.
// NIST SP 800-132: secrets must never be hardcoded.
function getPepperedPassword(password: string): string {
    const pepper = readSecret('password-pepper', 'PASSWORD_PEPPER')
    if (!pepper) {
        return password
    }
    return `${password}${pepper}`
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
// NIST SP 800-132: Salt must be at least 128 bits for key derivation
// OWASP 2025 A04: Cryptographic Failures — fixed salt → derived salt

const ALGORITHM = 'aes-256-gcm'

/** Cache resolved encryption key (immutable during process lifetime) */
let _resolvedEncryptionKey: string | null = null

function requireEncryptionKey(): string {
    if (_resolvedEncryptionKey) return _resolvedEncryptionKey

    // Read from Docker Secret first (/run/secrets/encryption-key), then env var.
    // NIST SP 800-57: encryption keys must be stored separate from application data.
    const key = readSecret('encryption-key', 'ENCRYPTION_KEY')
    if (!key || key.length < 32) {
        throw new Error('ENCRYPTION_KEY is missing or too short (min 32 chars)')
    }
    _resolvedEncryptionKey = key
    return key
}

/**
 * Derive encryption key with a proper salt (NIST SP 800-132).
 * The salt is derived from the ENCRYPTION_KEY itself, making it
 * unique per installation but deterministic (required for AES-GCM).
 */
function getDerivedKey(): Buffer {
    const derivedSalt = createHash('sha256')
        .update(`portfolio-kdf-v2-${requireEncryptionKey()}`)
        .digest()
        .subarray(0, 16) // 128-bit salt per NIST SP 800-132
    return scryptSync(requireEncryptionKey(), derivedSalt, 32)
}

/**
 * Legacy key derivation (hardcoded salt 'salt').
 * Used ONLY for decrypting data encrypted before the migration.
 * @deprecated Will be removed after full data migration.
 */
function getLegacyKey(): Buffer {
    return scryptSync(requireEncryptionKey(), 'salt', 32)
}

/**
 * Encrypt data using AES-256-GCM with derived salt.
 * All NEW encryptions use the secure derived key.
 */
export function encryptData(plaintext: string): string {
    const key = getDerivedKey()
    const iv = randomBytes(16)
    const cipher = createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(plaintext, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag()
    // Prefix 'v2:' to identify new-format ciphertexts
    return `v2:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

/**
 * Decrypt data with automatic version detection.
 * - 'v2:...' → new derived salt
 * - Legacy format → try derived key first, fallback to legacy key
 * 
 * This ensures backward compatibility with existing production data
 * while all new writes use the secure key derivation.
 */
export function decryptData(encryptedString: string): string {
    const isV2 = encryptedString.startsWith('v2:')
    const payload = isV2 ? encryptedString.slice(3) : encryptedString

    const parts = payload.split(':')
    if (parts.length < 3) {
        throw new Error('Invalid encrypted string format')
    }

    const [ivBase64, authTagBase64, ...encryptedParts] = parts
    const encryptedData = encryptedParts.join(':')
    const iv = Buffer.from(ivBase64!, 'base64')
    const authTag = Buffer.from(authTagBase64!, 'base64')

    // V2: only use derived key
    if (isV2) {
        return decryptWithKey(getDerivedKey(), iv, authTag, encryptedData)
    }

    // Legacy: try derived key first (in case data was re-encrypted), then legacy
    try {
        return decryptWithKey(getDerivedKey(), iv, authTag, encryptedData)
    } catch {
        // Fallback to legacy key for pre-migration data
        return decryptWithKey(getLegacyKey(), iv, authTag, encryptedData)
    }
}

function decryptWithKey(key: Buffer, iv: Buffer, authTag: Buffer, encryptedData: string): string {
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedData, 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
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

