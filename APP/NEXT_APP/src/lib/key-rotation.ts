/**
 * Automatic Key Rotation System
 * 
 * Gestiona la rotación automática de claves de encriptación.
 * Soporta múltiples versiones de claves para migración gradual.
 * 
 * Características:
 * - Rotación automática programada
 * - Soporte para múltiples claves activas
 * - Re-encriptación gradual de datos
 * - Auditoría de rotaciones
 * 
 * @module key-rotation
 */

import 'server-only'
import { randomBytes, createCipheriv, createDecipheriv, scryptSync, createHash } from 'crypto'

// ============= TYPES =============

export interface KeyVersion {
    id: string              // Unique key identifier
    version: number         // Version number
    key: string             // Encrypted key (encrypted with master key)
    createdAt: Date
    expiresAt: Date
    status: 'active' | 'rotating' | 'deprecated' | 'revoked'
    usageCount: number      // Number of encryptions with this key
}

export interface RotationConfig {
    rotationIntervalDays: number    // Days between rotations
    overlapDays: number             // Days to keep old key active during rotation
    maxVersions: number             // Max key versions to keep
    autoRotate: boolean             // Enable automatic rotation
}

export interface RotationEvent {
    timestamp: Date
    type: 'rotation_started' | 'rotation_completed' | 'key_deprecated' | 'key_revoked'
    keyId: string
    details: Record<string, unknown>
}

// ============= CONFIGURATION =============

const DEFAULT_CONFIG: RotationConfig = {
    rotationIntervalDays: 90,       // Rotate every 90 days
    overlapDays: 7,                 // 7-day overlap for gradual migration
    maxVersions: 3,                 // Keep last 3 versions
    autoRotate: true,
}

const MASTER_KEY = process.env.KEY_ROTATION_MASTER || process.env.ENCRYPTION_KEY || ''

// ============= IN-MEMORY KEY STORE =============
// In production, use a proper key management system (AWS KMS, Azure Key Vault, etc.)

class KeyStore {
    private keys: Map<string, KeyVersion> = new Map()
    private rotationLog: RotationEvent[] = []
    private currentKeyId: string | null = null
    private config: RotationConfig = DEFAULT_CONFIG

    constructor() {
        this.initializeFromEnv()
    }

    /**
     * Initialize keys from environment variables
     */
    private initializeFromEnv(): void {
        const envKeys = process.env.ENCRYPTION_KEYS
        
        if (envKeys) {
            try {
                const parsed = JSON.parse(envKeys) as KeyVersion[]
                for (const key of parsed) {
                    key.createdAt = new Date(key.createdAt)
                    key.expiresAt = new Date(key.expiresAt)
                    this.keys.set(key.id, key)
                    
                    if (key.status === 'active') {
                        this.currentKeyId = key.id
                    }
                }
            } catch {
                console.warn('Failed to parse ENCRYPTION_KEYS, using default')
            }
        }

        // Create initial key if none exists
        if (this.keys.size === 0) {
            this.createInitialKey()
        }
    }

    /**
     * Create initial encryption key
     */
    private createInitialKey(): void {
        const key = this.generateKey()
        const keyVersion: KeyVersion = {
            id: this.generateKeyId(),
            version: 1,
            key: this.encryptKeyWithMaster(key),
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + this.config.rotationIntervalDays * 24 * 60 * 60 * 1000),
            status: 'active',
            usageCount: 0,
        }

        this.keys.set(keyVersion.id, keyVersion)
        this.currentKeyId = keyVersion.id
        
        console.log(`🔐 Initial encryption key created: ${keyVersion.id}`)
    }

    /**
     * Generate a new encryption key
     */
    private generateKey(): string {
        return randomBytes(32).toString('base64')
    }

    /**
     * Generate a unique key ID
     */
    private generateKeyId(): string {
        const timestamp = Date.now().toString(36)
        const random = randomBytes(4).toString('hex')
        return `key_${timestamp}_${random}`
    }

    /**
     * Encrypt a key with the master key
     */
    private encryptKeyWithMaster(key: string): string {
        if (!MASTER_KEY) {
            return key // Store plaintext if no master key (dev mode)
        }

        const iv = randomBytes(16)
        const derivedKey = scryptSync(MASTER_KEY, 'key-encryption', 32)
        const cipher = createCipheriv('aes-256-gcm', derivedKey, iv)
        
        let encrypted = cipher.update(key, 'utf8', 'base64')
        encrypted += cipher.final('base64')
        
        const authTag = cipher.getAuthTag()
        
        return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
    }

    /**
     * Decrypt a key with the master key
     */
    private decryptKeyWithMaster(encryptedKey: string): string {
        if (!MASTER_KEY || !encryptedKey.includes(':')) {
            return encryptedKey // Plaintext key
        }

        const [ivB64, tagB64, encrypted] = encryptedKey.split(':')
        const iv = Buffer.from(ivB64, 'base64')
        const authTag = Buffer.from(tagB64, 'base64')
        const derivedKey = scryptSync(MASTER_KEY, 'key-encryption', 32)
        
        const decipher = createDecipheriv('aes-256-gcm', derivedKey, iv)
        decipher.setAuthTag(authTag)
        
        let decrypted = decipher.update(encrypted, 'base64', 'utf8')
        decrypted += decipher.final('utf8')
        
        return decrypted
    }

    /**
     * Get the current active key for encryption
     */
    getCurrentKey(): { id: string; key: Buffer } | null {
        if (!this.currentKeyId) return null
        
        const keyVersion = this.keys.get(this.currentKeyId)
        if (!keyVersion || keyVersion.status !== 'active') return null

        keyVersion.usageCount++
        
        return {
            id: keyVersion.id,
            key: Buffer.from(this.decryptKeyWithMaster(keyVersion.key), 'base64'),
        }
    }

    /**
     * Get a specific key by ID (for decryption)
     */
    getKeyById(keyId: string): Buffer | null {
        const keyVersion = this.keys.get(keyId)
        if (!keyVersion) return null
        
        // Only allow active, rotating, or deprecated keys for decryption
        if (keyVersion.status === 'revoked') return null
        
        return Buffer.from(this.decryptKeyWithMaster(keyVersion.key), 'base64')
    }

    /**
     * Rotate to a new key
     */
    async rotateKey(): Promise<{
        success: boolean
        newKeyId?: string
        deprecatedKeyId?: string
        error?: string
    }> {
        try {
            // Mark current key as rotating
            if (this.currentKeyId) {
                const currentKey = this.keys.get(this.currentKeyId)
                if (currentKey) {
                    currentKey.status = 'rotating'
                }
            }

            // Generate new key
            const newKey = this.generateKey()
            const maxVersion = Math.max(...Array.from(this.keys.values()).map(k => k.version), 0)
            
            const newKeyVersion: KeyVersion = {
                id: this.generateKeyId(),
                version: maxVersion + 1,
                key: this.encryptKeyWithMaster(newKey),
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + this.config.rotationIntervalDays * 24 * 60 * 60 * 1000),
                status: 'active',
                usageCount: 0,
            }

            this.keys.set(newKeyVersion.id, newKeyVersion)
            
            const oldKeyId = this.currentKeyId
            this.currentKeyId = newKeyVersion.id

            // Log rotation event
            this.logEvent({
                timestamp: new Date(),
                type: 'rotation_started',
                keyId: newKeyVersion.id,
                details: {
                    previousKeyId: oldKeyId,
                    newVersion: newKeyVersion.version,
                },
            })

            // Schedule deprecation of old key
            if (oldKeyId) {
                setTimeout(() => {
                    this.deprecateKey(oldKeyId)
                }, this.config.overlapDays * 24 * 60 * 60 * 1000)
            }

            // Clean up old versions
            this.cleanupOldKeys()

            console.log(`🔄 Key rotated: ${oldKeyId} → ${newKeyVersion.id}`)

            return {
                success: true,
                newKeyId: newKeyVersion.id,
                deprecatedKeyId: oldKeyId || undefined,
            }

        } catch (error) {
            console.error('Key rotation failed:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }
        }
    }

    /**
     * Deprecate a key (can still be used for decryption)
     */
    private deprecateKey(keyId: string): void {
        const key = this.keys.get(keyId)
        if (key && key.status !== 'revoked') {
            key.status = 'deprecated'
            
            this.logEvent({
                timestamp: new Date(),
                type: 'key_deprecated',
                keyId,
                details: { usageCount: key.usageCount },
            })

            console.log(`⚠️ Key deprecated: ${keyId}`)
        }
    }

    /**
     * Revoke a key (can no longer be used)
     */
    revokeKey(keyId: string): boolean {
        const key = this.keys.get(keyId)
        if (!key) return false
        
        // Cannot revoke active key
        if (key.status === 'active' && keyId === this.currentKeyId) {
            return false
        }

        key.status = 'revoked'
        
        this.logEvent({
            timestamp: new Date(),
            type: 'key_revoked',
            keyId,
            details: { previousStatus: key.status },
        })

        console.log(`🚫 Key revoked: ${keyId}`)
        return true
    }

    /**
     * Clean up old key versions
     */
    private cleanupOldKeys(): void {
        const allKeys = Array.from(this.keys.values())
            .sort((a, b) => b.version - a.version)

        // Keep only maxVersions
        const keysToRemove = allKeys.slice(this.config.maxVersions)
        
        for (const key of keysToRemove) {
            if (key.status === 'deprecated' || key.status === 'revoked') {
                this.keys.delete(key.id)
            }
        }
    }

    /**
     * Log a rotation event
     */
    private logEvent(event: RotationEvent): void {
        this.rotationLog.push(event)
        
        // Keep only last 100 events
        if (this.rotationLog.length > 100) {
            this.rotationLog.shift()
        }
    }

    /**
     * Get rotation status
     */
    getStatus(): {
        currentKeyId: string | null
        totalKeys: number
        keysByStatus: Record<string, number>
        nextRotation: Date | null
        recentEvents: RotationEvent[]
    } {
        const keysByStatus: Record<string, number> = {}
        
        for (const key of this.keys.values()) {
            keysByStatus[key.status] = (keysByStatus[key.status] || 0) + 1
        }

        const currentKey = this.currentKeyId ? this.keys.get(this.currentKeyId) : null
        
        return {
            currentKeyId: this.currentKeyId,
            totalKeys: this.keys.size,
            keysByStatus,
            nextRotation: currentKey?.expiresAt || null,
            recentEvents: this.rotationLog.slice(-10),
        }
    }

    /**
     * Check if rotation is needed
     */
    needsRotation(): boolean {
        if (!this.currentKeyId) return true
        
        const currentKey = this.keys.get(this.currentKeyId)
        if (!currentKey) return true
        
        return new Date() >= currentKey.expiresAt
    }

    /**
     * Get all keys (for admin view)
     */
    getAllKeys(): Omit<KeyVersion, 'key'>[] {
        return Array.from(this.keys.values())
            .map(({ key, ...rest }) => rest) // Remove actual key from response
            .sort((a, b) => b.version - a.version)
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<RotationConfig>): void {
        this.config = { ...this.config, ...newConfig }
    }

    /**
     * Export keys for backup (encrypted)
     */
    exportKeys(): string {
        const keys = Array.from(this.keys.values())
        return JSON.stringify(keys)
    }
}

// Singleton instance
export const keyStore = new KeyStore()

// ============= AUTOMATIC ROTATION =============

let rotationInterval: NodeJS.Timeout | null = null

/**
 * Start automatic key rotation
 */
export function startAutoRotation(checkIntervalHours: number = 1): void {
    if (rotationInterval) {
        clearInterval(rotationInterval)
    }

    rotationInterval = setInterval(async () => {
        if (keyStore.needsRotation()) {
            console.log('🔄 Automatic key rotation triggered')
            await keyStore.rotateKey()
        }
    }, checkIntervalHours * 60 * 60 * 1000)

    console.log(`⏰ Auto rotation check scheduled every ${checkIntervalHours} hour(s)`)
}

/**
 * Stop automatic key rotation
 */
export function stopAutoRotation(): void {
    if (rotationInterval) {
        clearInterval(rotationInterval)
        rotationInterval = null
        console.log('⏹️ Auto rotation stopped')
    }
}

// ============= KEY-AWARE ENCRYPTION =============

/**
 * Encrypt with current key (includes key ID in output)
 */
export function encryptWithRotatingKey(plaintext: string): string {
    const keyInfo = keyStore.getCurrentKey()
    
    if (!keyInfo) {
        throw new Error('No active encryption key available')
    }

    const iv = randomBytes(16)
    const cipher = createCipheriv('aes-256-gcm', keyInfo.key, iv)
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64')
    encrypted += cipher.final('base64')
    
    const authTag = cipher.getAuthTag()

    // Format: version:keyId:iv:tag:data
    return `v1:${keyInfo.id}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

/**
 * Decrypt with appropriate key (reads key ID from input)
 */
export function decryptWithRotatingKey(ciphertext: string): string {
    const parts = ciphertext.split(':')
    
    if (parts[0] !== 'v1' || parts.length !== 5) {
        throw new Error('Invalid encrypted format')
    }

    const [, keyId, ivB64, tagB64, encrypted] = parts
    
    const key = keyStore.getKeyById(keyId)
    if (!key) {
        throw new Error(`Key not found or revoked: ${keyId}`)
    }

    const iv = Buffer.from(ivB64, 'base64')
    const authTag = Buffer.from(tagB64, 'base64')
    
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
}

/**
 * Check if ciphertext needs re-encryption with current key
 */
export function needsReEncryption(ciphertext: string): boolean {
    const parts = ciphertext.split(':')
    
    if (parts[0] !== 'v1' || parts.length !== 5) {
        return true // Unknown format, should re-encrypt
    }

    const keyId = parts[1]
    const currentKey = keyStore.getCurrentKey()
    
    return keyId !== currentKey?.id
}

/**
 * Re-encrypt with current key
 */
export function reEncrypt(ciphertext: string): string {
    const plaintext = decryptWithRotatingKey(ciphertext)
    return encryptWithRotatingKey(plaintext)
}

// ============= API ENDPOINTS HELPERS =============

/**
 * Get rotation status for admin API
 */
export function getRotationStatus() {
    return keyStore.getStatus()
}

/**
 * Trigger manual rotation
 */
export async function triggerRotation() {
    return keyStore.rotateKey()
}

/**
 * Revoke a specific key
 */
export function revokeKeyById(keyId: string) {
    return keyStore.revokeKey(keyId)
}

/**
 * Get all keys for admin
 */
export function getAllKeyVersions() {
    return keyStore.getAllKeys()
}
