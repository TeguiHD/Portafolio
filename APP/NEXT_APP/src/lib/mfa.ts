/**
 * Multi-Factor Authentication (MFA/2FA) System
 * 
 * Implementa TOTP (Time-based One-Time Password) compatible con:
 * - Google Authenticator
 * - Authy
 * - Microsoft Authenticator
 * - 1Password
 * 
 * NOTA: Este módulo está PREPARADO pero requiere:
 * 1. Instalar: npm install otplib qrcode
 * 2. Agregar campos MFA al schema.prisma
 * 3. Configurar servidor de correo para recovery codes
 * 
 * @module mfa
 */

import 'server-only'
import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv, scryptSync, timingSafeEqual } from 'crypto'
import { readSecret } from '@/lib/read-secret'

// ============= CONFIGURACIÓN =============

const MFA_CONFIG = {
    issuer: 'NicoholasDev',           // Nombre que aparece en la app
    algorithm: 'SHA1' as const,        // SHA1 es el estándar para TOTP
    digits: 6,                         // 6 dígitos es el estándar
    period: 30,                        // Segundos de validez
    window: 1,                         // Ventanas de tolerancia (30s antes/después)
    recoveryCodesCount: 10,            // Cantidad de códigos de recuperación
    recoveryCodeLength: 8,             // Caracteres por código
}

// ============= TOTP IMPLEMENTATION =============
// Implementación manual de TOTP sin dependencias externas

/**
 * Generate TOTP secret (base32 encoded)
 */
export function generateTOTPSecret(): string {
    const buffer = randomBytes(20)  // 160 bits
    return base32Encode(buffer)
}

/**
 * Generate TOTP code from secret
 */
export function generateTOTP(secret: string, timestamp?: number): string {
    const time = timestamp || Date.now()
    const counter = Math.floor(time / 1000 / MFA_CONFIG.period)

    const secretBuffer = base32Decode(secret)
    const counterBuffer = Buffer.alloc(8)
    counterBuffer.writeBigUInt64BE(BigInt(counter))

    const hmac = createHmac('sha1', secretBuffer)
    hmac.update(counterBuffer)
    const hash = hmac.digest()

    const offset = hash[hash.length - 1] & 0x0f
    const binary =
        ((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff)

    const otp = binary % Math.pow(10, MFA_CONFIG.digits)
    return otp.toString().padStart(MFA_CONFIG.digits, '0')
}

/**
 * Verify TOTP code with time window tolerance
 */
export function verifyTOTP(secret: string, token: string): boolean {
    const now = Date.now()

    // Check current and adjacent time windows
    for (let i = -MFA_CONFIG.window; i <= MFA_CONFIG.window; i++) {
        const timestamp = now + (i * MFA_CONFIG.period * 1000)
        const expected = generateTOTP(secret, timestamp)

        // Constant-time comparison
        if (timingSafeCompare(token, expected)) {
            return true
        }
    }

    return false
}

/**
 * Generate otpauth:// URI for QR code
 */
export function generateOTPAuthURI(
    secret: string,
    userEmail: string
): string {
    const params = new URLSearchParams({
        secret: secret,
        issuer: MFA_CONFIG.issuer,
        algorithm: MFA_CONFIG.algorithm,
        digits: MFA_CONFIG.digits.toString(),
        period: MFA_CONFIG.period.toString(),
    })

    const label = encodeURIComponent(`${MFA_CONFIG.issuer}:${userEmail}`)
    return `otpauth://totp/${label}?${params.toString()}`
}

// ============= RECOVERY CODES =============

/**
 * Generate recovery codes for account recovery
 */
export function generateRecoveryCodes(): string[] {
    const codes: string[] = []
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  // Sin I, O, 0, 1 para evitar confusión

    for (let i = 0; i < MFA_CONFIG.recoveryCodesCount; i++) {
        let code = ''
        const bytes = randomBytes(MFA_CONFIG.recoveryCodeLength)

        for (let j = 0; j < MFA_CONFIG.recoveryCodeLength; j++) {
            code += chars[bytes[j] % chars.length]
        }

        // Formato: XXXX-XXXX
        codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
    }

    return codes
}

/**
 * Hash recovery code for storage
 */
export function hashRecoveryCode(code: string, secret: string): string {
    const normalized = code.replace(/-/g, '').toUpperCase()
    return createHmac('sha256', secret).update(normalized).digest('hex')
}

/**
 * Verify recovery code
 */
export function verifyRecoveryCode(
    code: string,
    hashedCodes: string[],
    secret: string
): { valid: boolean; index: number } {
    const codeHash = hashRecoveryCode(code, secret)

    for (let i = 0; i < hashedCodes.length; i++) {
        if (timingSafeCompare(codeHash, hashedCodes[i])) {
            return { valid: true, index: i }
        }
    }

    return { valid: false, index: -1 }
}

// ============= ENCRYPTED STORAGE =============

let _mfaEncryptionKey: string | null = null

function getMfaEncryptionKey(): string {
    if (_mfaEncryptionKey) {
        return _mfaEncryptionKey
    }

    const key = readSecret('encryption-key', 'ENCRYPTION_KEY')
    if (!key || key.length < 32) {
        throw new Error('ENCRYPTION_KEY must be at least 32 characters')
    }

    _mfaEncryptionKey = key
    return key
}

function getMfaDerivedKey(): Buffer {
    const salt = createHash('sha256')
        .update(`portfolio-mfa-kdf-v2-${getMfaEncryptionKey()}`)
        .digest()
        .subarray(0, 16)

    return scryptSync(getMfaEncryptionKey(), salt, 32)
}

function getLegacyMfaKey(): Buffer {
    return scryptSync(getMfaEncryptionKey(), 'mfa-salt', 32)
}

/**
 * Encrypt MFA secret for database storage
 */
export function encryptMFASecret(secret: string): string {
    const key = getMfaDerivedKey()
    const iv = randomBytes(16)
    const cipher = createCipheriv('aes-256-gcm', key, iv)

    let encrypted = cipher.update(secret, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag()

    return `v2:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

/**
 * Decrypt MFA secret from database
 */
export function decryptMFASecret(encryptedSecret: string): string {
    const isV2 = encryptedSecret.startsWith('v2:')
    const payload = isV2 ? encryptedSecret.slice(3) : encryptedSecret
    const [ivBase64, authTagBase64, encrypted] = payload.split(':')

    const iv = Buffer.from(ivBase64, 'base64')
    const authTag = Buffer.from(authTagBase64, 'base64')

    if (isV2) {
        return decryptMfaWithKey(getMfaDerivedKey(), iv, authTag, encrypted)
    }

    try {
        return decryptMfaWithKey(getMfaDerivedKey(), iv, authTag, encrypted)
    } catch {
        return decryptMfaWithKey(getLegacyMfaKey(), iv, authTag, encrypted)
    }
}

function decryptMfaWithKey(key: Buffer, iv: Buffer, authTag: Buffer, encrypted: string): string {
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
}

// ============= BASE32 ENCODING =============

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(buffer: Buffer): string {
    let result = ''
    let bits = 0
    let value = 0

    for (const byte of buffer) {
        value = (value << 8) | byte
        bits += 8

        while (bits >= 5) {
            result += BASE32_CHARS[(value >>> (bits - 5)) & 0x1f]
            bits -= 5
        }
    }

    if (bits > 0) {
        result += BASE32_CHARS[(value << (5 - bits)) & 0x1f]
    }

    return result
}

function base32Decode(encoded: string): Buffer {
    const cleanedInput = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '')
    const bytes: number[] = []
    let bits = 0
    let value = 0

    for (const char of cleanedInput) {
        const index = BASE32_CHARS.indexOf(char)
        if (index === -1) continue

        value = (value << 5) | index
        bits += 5

        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 0xff)
            bits -= 8
        }
    }

    return Buffer.from(bytes)
}

// ============= TIMING-SAFE COMPARISON =============

function timingSafeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) {
        // Compare against self to maintain constant time, then return false
        timingSafeEqual(bufA, bufA)
        return false
    }
    return timingSafeEqual(bufA, bufB)
}

// ============= MFA SETUP FLOW =============

export interface MFASetupResult {
    encryptedSecret: string  // Encrypted secret for DB
    qrCodeURI: string        // otpauth:// URI for local QR rendering
    manualEntryKey: string   // Base32 secret for manual authenticator setup
    recoveryCodes: string[]  // Plain codes to show user ONCE
    recoveryHashes: string[] // Hashed codes for DB storage
}

/**
 * Initialize MFA setup for a user
 * Returns data needed for setup UI and database storage
 */
export function initializeMFASetup(userEmail: string): MFASetupResult {
    const secret = generateTOTPSecret()
    const recoveryCodes = generateRecoveryCodes()

    return {
        encryptedSecret: encryptMFASecret(secret),
        qrCodeURI: generateOTPAuthURI(secret, userEmail),
        manualEntryKey: secret,
        recoveryCodes: recoveryCodes,
        recoveryHashes: recoveryCodes.map(code =>
            hashRecoveryCode(code, getMfaEncryptionKey())
        ),
    }
}

function looksLikeEncryptedSecret(value: string): boolean {
    return value.split(':').length === 3
}

function decryptStoredMFASecret(encryptedSecret: string): string {
    const firstPass = decryptMFASecret(encryptedSecret)

    // Backward compatibility for secrets that were accidentally stored double-encrypted.
    if (looksLikeEncryptedSecret(firstPass)) {
        try {
            return decryptMFASecret(firstPass)
        } catch {
            return firstPass
        }
    }

    return firstPass
}

/**
 * Verify MFA during login
 */
export function verifyMFA(
    encryptedSecret: string,
    token: string
): boolean {
    try {
        const secret = decryptStoredMFASecret(encryptedSecret)
        return verifyTOTP(secret, token)
    } catch {
        return false
    }
}

/**
 * Use recovery code (marks it as used)
 */
export function useRecoveryCode(
    code: string,
    hashedCodes: string[]
): { valid: boolean; remainingCodes: string[] } {
    const result = verifyRecoveryCode(code, hashedCodes, getMfaEncryptionKey())

    if (result.valid) {
        // Remove used code
        const remainingCodes = [...hashedCodes]
        remainingCodes.splice(result.index, 1)
        return { valid: true, remainingCodes }
    }

    return { valid: false, remainingCodes: hashedCodes }
}

// ============= TYPES FOR PRISMA SCHEMA =============

/**
 * Campos a agregar al modelo User en schema.prisma:
 * 
 * ```prisma
 * model User {
 *   // ... campos existentes ...
 *   
 *   // MFA Fields
 *   mfaEnabled        Boolean   @default(false)
 *   mfaSecret         String?   // Encrypted TOTP secret
 *   mfaRecoveryCodes  String[]  // Hashed recovery codes
 *   mfaVerifiedAt     DateTime? // When MFA was last verified
 *   mfaBackupEmail    String?   // Backup email for recovery
 * }
 * ```
 */
export interface MFAUserFields {
    mfaEnabled: boolean
    mfaSecret: string | null
    mfaRecoveryCodes: string[]
    mfaVerifiedAt: Date | null
    mfaBackupEmail: string | null
}
