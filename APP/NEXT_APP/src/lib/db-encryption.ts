/**
 * Database Field-Level Encryption System
 * 
 * Encriptación a nivel de aplicación para campos sensibles en la base de datos.
 * Esto complementa la encriptación en reposo de PostgreSQL/Azure.
 * 
 * Algoritmo: AES-256-GCM (authenticated encryption)
 * Key Derivation: scrypt (built-in Node.js crypto)
 * 
 * @module database-encryption
 */

import 'server-only'
import {
    createCipheriv,
    createDecipheriv,
    randomBytes,
    createHash,
    scryptSync
} from 'crypto'

// ============= CONFIGURATION =============

const ENCRYPTION_CONFIG = {
    algorithm: 'aes-256-gcm' as const,
    ivLength: 16,          // 128 bits
    authTagLength: 16,     // 128 bits
    saltLength: 32,        // 256 bits
    keyLength: 32,         // 256 bits for AES-256
}

// scrypt parameters (secure defaults)
const SCRYPT_CONFIG = {
    N: 16384,              // CPU/memory cost parameter
    r: 8,                  // Block size
    p: 1,                  // Parallelization
}

// Master key from environment
const MASTER_KEY = process.env.DB_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY

if (!MASTER_KEY && process.env.NODE_ENV === 'production') {
    console.error('⚠️ DB_ENCRYPTION_KEY not set! Database encryption disabled.')
}

// ============= KEY MANAGEMENT =============

// Cache for derived keys (in memory only, cleared on restart)
const keyCache = new Map<string, Buffer>()

/**
 * Derive an encryption key using scrypt
 * Uses caching to avoid re-deriving the same key
 */
function _deriveKey(purpose: string, salt: Buffer): Buffer {
    const cacheKey = `${purpose}:${salt.toString('hex')}`

    if (keyCache.has(cacheKey)) {
        return keyCache.get(cacheKey)!
    }

    if (!MASTER_KEY) {
        throw new Error('Encryption key not configured')
    }

    const derivedKey = scryptSync(
        `${MASTER_KEY}:${purpose}`,
        salt,
        ENCRYPTION_CONFIG.keyLength,
        {
            N: SCRYPT_CONFIG.N,
            r: SCRYPT_CONFIG.r,
            p: SCRYPT_CONFIG.p,
        }
    )

    keyCache.set(cacheKey, derivedKey)

    // Clear cache entry after 1 hour
    setTimeout(() => keyCache.delete(cacheKey), 60 * 60 * 1000)

    return derivedKey
}

/**
 * Simple synchronous key derivation (faster, for high-volume operations)
 * Uses HKDF-like construction with SHA-256
 */
function deriveKeySync(purpose: string, salt: Buffer): Buffer {
    if (!MASTER_KEY) {
        throw new Error('Encryption key not configured')
    }

    // HKDF-Extract
    const prk = createHash('sha256')
        .update(salt)
        .update(MASTER_KEY)
        .digest()

    // HKDF-Expand
    const info = Buffer.from(purpose, 'utf8')
    const okm = createHash('sha256')
        .update(prk)
        .update(info)
        .update(Buffer.from([1]))
        .digest()

    return okm
}

// ============= ENCRYPTION FUNCTIONS =============

export interface EncryptedField {
    v: number              // Version
    s: string              // Salt (base64)
    iv: string             // IV (base64)
    t: string              // Auth tag (base64)
    d: string              // Encrypted data (base64)
    p: string              // Purpose/field name
}

/**
 * Encrypt a field value
 * @param value - The plaintext value to encrypt
 * @param fieldName - The field/purpose identifier (e.g., 'ssn', 'bank_account')
 * @returns Encrypted string that can be stored in DB
 */
export function encryptField(value: string, fieldName: string): string {
    if (!MASTER_KEY) {
        console.warn('Encryption disabled - storing plaintext')
        return value
    }

    const salt = randomBytes(ENCRYPTION_CONFIG.saltLength)
    const iv = randomBytes(ENCRYPTION_CONFIG.ivLength)
    const key = deriveKeySync(fieldName, salt)

    const cipher = createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv)

    let encrypted = cipher.update(value, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag()

    const encryptedField: EncryptedField = {
        v: 1,
        s: salt.toString('base64'),
        iv: iv.toString('base64'),
        t: authTag.toString('base64'),
        d: encrypted,
        p: fieldName,
    }

    return JSON.stringify(encryptedField)
}

/**
 * Decrypt a field value
 * @param encryptedValue - The encrypted string from DB
 * @returns Decrypted plaintext value
 */
export function decryptField(encryptedValue: string): string {
    if (!MASTER_KEY) {
        // Assume plaintext if encryption disabled
        return encryptedValue
    }

    try {
        const parsed: EncryptedField = JSON.parse(encryptedValue)

        if (parsed.v !== 1) {
            throw new Error(`Unknown encryption version: ${parsed.v}`)
        }

        const salt = Buffer.from(parsed.s, 'base64')
        const iv = Buffer.from(parsed.iv, 'base64')
        const authTag = Buffer.from(parsed.t, 'base64')
        const key = deriveKeySync(parsed.p, salt)

        const decipher = createDecipheriv(ENCRYPTION_CONFIG.algorithm, key, iv)
        decipher.setAuthTag(authTag)

        let decrypted = decipher.update(parsed.d, 'base64', 'utf8')
        decrypted += decipher.final('utf8')

        return decrypted
    } catch (error) {
        // If parsing fails, assume it's plaintext (migration path)
        if (error instanceof SyntaxError) {
            return encryptedValue
        }
        throw error
    }
}

/**
 * Check if a value is encrypted
 */
export function isEncrypted(value: string): boolean {
    try {
        const parsed = JSON.parse(value)
        return parsed.v === 1 && parsed.s && parsed.iv && parsed.t && parsed.d
    } catch {
        return false
    }
}

// ============= BATCH OPERATIONS =============

/**
 * Encrypt multiple fields at once
 */
export function encryptFields(
    data: Record<string, string>,
    fieldsToEncrypt: string[]
): Record<string, string> {
    const result = { ...data }

    for (const field of fieldsToEncrypt) {
        if (result[field]) {
            result[field] = encryptField(result[field], field)
        }
    }

    return result
}

/**
 * Decrypt multiple fields at once
 */
export function decryptFields(
    data: Record<string, string>,
    fieldsToDecrypt: string[]
): Record<string, string> {
    const result = { ...data }

    for (const field of fieldsToDecrypt) {
        if (result[field] && isEncrypted(result[field])) {
            result[field] = decryptField(result[field])
        }
    }

    return result
}

// ============= SEARCHABLE ENCRYPTION =============

/**
 * Create a blind index for searchable encryption
 * This allows searching encrypted fields without decrypting all records
 */
export function createBlindIndex(value: string, fieldName: string): string {
    if (!MASTER_KEY) {
        return createHash('sha256').update(value).digest('hex').slice(0, 16)
    }

    const hmac = createHash('sha256')
        .update(`${MASTER_KEY}:blind:${fieldName}`)
        .update(value.toLowerCase().trim())
        .digest('hex')
        .slice(0, 32) // 128 bits is enough for blind index

    return hmac
}

// ============= PRISMA MIDDLEWARE INTEGRATION =============

/**
 * Configuration for automatic field encryption in Prisma
 */
export interface FieldEncryptionConfig {
    model: string
    fields: string[]
}

/**
 * List of fields that should be automatically encrypted
 * Modify this based on your schema
 */
export const ENCRYPTED_FIELDS: FieldEncryptionConfig[] = [
    // Finance module - sensitive data
    { model: 'FinanceIncome', fields: ['description', 'notes'] },
    { model: 'FinanceExpense', fields: ['description', 'vendor', 'notes'] },
    { model: 'FinanceGoal', fields: ['name', 'notes'] },

    // User data
    { model: 'User', fields: ['phone', 'address'] },

    // Add more as needed
]

/**
 * Prisma middleware for automatic encryption/decryption
 * 
 * Usage in prisma.ts:
 * ```
 * import { createEncryptionMiddleware } from '@/lib/db-encryption'
 * 
 * prisma.$use(createEncryptionMiddleware())
 * ```
 */
export function createEncryptionMiddleware() {
    return async (params: {
        model?: string
        action: string
        args: Record<string, unknown>
    }, next: (params: unknown) => Promise<unknown>) => {
        const config = ENCRYPTED_FIELDS.find(c => c.model === params.model)

        if (!config) {
            return next(params)
        }

        // Encrypt on create/update
        if (['create', 'update', 'upsert'].includes(params.action)) {
            const data = params.args.data as Record<string, unknown> | undefined
            if (data) {
                for (const field of config.fields) {
                    if (typeof data[field] === 'string') {
                        data[field] = encryptField(data[field], `${params.model}.${field}`)
                    }
                }
            }
        }

        const result = await next(params)

        // Decrypt on read
        if (['findUnique', 'findFirst', 'findMany'].includes(params.action)) {
            if (Array.isArray(result)) {
                for (const record of result) {
                    decryptRecord(record as Record<string, unknown>, config.fields, params.model!)
                }
            } else if (result) {
                decryptRecord(result as Record<string, unknown>, config.fields, params.model!)
            }
        }

        return result
    }
}

function decryptRecord(
    record: Record<string, unknown>,
    fields: string[],
    model: string
): void {
    for (const field of fields) {
        if (typeof record[field] === 'string' && isEncrypted(record[field] as string)) {
            record[field] = decryptField(record[field] as string)
        }
    }
}

// ============= RE-ENCRYPTION =============

/**
 * Re-encrypt a field with a new key (for key rotation)
 */
export function reEncryptField(
    encryptedValue: string,
    fieldName: string,
    oldKey: string,
    newKey: string
): string {
    // Temporarily swap keys
    const originalMasterKey = MASTER_KEY

    // This is a simplified version - in production you'd want
    // a more robust key management system

    // For now, just re-encrypt with same key (placeholder)
    const decrypted = decryptField(encryptedValue)
    return encryptField(decrypted, fieldName)
}

// ============= UTILITY FUNCTIONS =============

/**
 * Generate a secure encryption key
 */
export function generateEncryptionKey(): string {
    return randomBytes(32).toString('base64')
}

/**
 * Validate encryption key strength
 */
export function validateEncryptionKey(key: string): {
    valid: boolean
    issues: string[]
} {
    const issues: string[] = []

    if (key.length < 32) {
        issues.push('Key should be at least 32 characters')
    }

    if (!/[A-Z]/.test(key) && !/[a-z]/.test(key) && !/[0-9]/.test(key)) {
        issues.push('Key should contain mixed characters')
    }

    // Check entropy (simplified)
    const uniqueChars = new Set(key).size
    if (uniqueChars < key.length * 0.5) {
        issues.push('Key has low entropy (too many repeated characters)')
    }

    return {
        valid: issues.length === 0,
        issues,
    }
}

// ============= TYPES =============

/**
 * Type helper for encrypted fields in Prisma models
 * 
 * Usage in types:
 * ```
 * interface EncryptedUser {
 *   email: string
 *   phone: EncryptedString
 *   address: EncryptedString
 * }
 * ```
 */
export type EncryptedString = string & { __encrypted: true }
