/**
 * Key Rotation Admin API
 * 
 * GET    /api/admin/key-rotation - Get rotation status
 * POST   /api/admin/key-rotation - Trigger manual rotation
 * DELETE /api/admin/key-rotation - Revoke a key
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { 
    getRotationStatus, 
    triggerRotation, 
    revokeKeyById,
    getAllKeyVersions,
    startAutoRotation,
    stopAutoRotation
} from '@/lib/key-rotation'
import { SecurityLogger } from '@/lib/security-logger'

const getClientIP = (request: NextRequest): string => {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
           request.headers.get('x-real-ip') ||
           '127.0.0.1'
}

async function isAdmin(): Promise<{ isAdmin: boolean; userId?: string }> {
    const session = await auth()
    return {
        isAdmin: session?.user?.role === 'ADMIN',
        userId: session?.user?.id,
    }
}

// GET - Get rotation status
export async function GET(request: NextRequest) {
    const { isAdmin: admin, userId } = await isAdmin()
    const clientIP = getClientIP(request)

    if (!admin) {
        SecurityLogger.auth('key_rotation_access_denied', userId || '', clientIP, false)
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const status = getRotationStatus()
    const keys = getAllKeyVersions()

    return NextResponse.json({
        success: true,
        status,
        keys: keys.map(k => ({
            ...k,
            // Add human-readable times
            createdAgo: formatTimeAgo(k.createdAt),
            expiresIn: formatTimeUntil(k.expiresAt),
        })),
        config: {
            note: 'Para cambiar la configuración, modifica las variables de entorno',
            currentSettings: {
                rotationIntervalDays: 90,
                overlapDays: 7,
                maxVersions: 3,
            }
        }
    })
}

// POST - Trigger manual rotation or start/stop auto-rotation
export async function POST(request: NextRequest) {
    const { isAdmin: admin, userId } = await isAdmin()
    const clientIP = getClientIP(request)

    if (!admin) {
        SecurityLogger.auth('key_rotation_action_denied', userId || '', clientIP, false)
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    try {
        const body = await request.json().catch(() => ({}))
        const { action = 'rotate' } = body

        switch (action) {
            case 'rotate': {
                const result = await triggerRotation()
                
                if (result.success) {
                    SecurityLogger.auth('key_rotation_manual', userId!, clientIP, true, {
                        newKeyId: result.newKeyId,
                        deprecatedKeyId: result.deprecatedKeyId,
                    })
                }

                return NextResponse.json({
                    success: result.success,
                    message: result.success 
                        ? `Nueva clave creada: ${result.newKeyId}`
                        : `Error: ${result.error}`,
                    ...result,
                })
            }

            case 'start-auto': {
                const hours = body.checkIntervalHours || 1
                startAutoRotation(hours)
                
                return NextResponse.json({
                    success: true,
                    message: `Auto-rotación iniciada. Verificación cada ${hours} hora(s)`,
                })
            }

            case 'stop-auto': {
                stopAutoRotation()
                
                return NextResponse.json({
                    success: true,
                    message: 'Auto-rotación detenida',
                })
            }

            default:
                return NextResponse.json(
                    { error: 'Acción no válida. Usa: rotate, start-auto, stop-auto' },
                    { status: 400 }
                )
        }

    } catch (error) {
        console.error('Key rotation error:', error)
        return NextResponse.json(
            { error: 'Error en rotación de claves' },
            { status: 500 }
        )
    }
}

// DELETE - Revoke a specific key
export async function DELETE(request: NextRequest) {
    const { isAdmin: admin, userId } = await isAdmin()
    const clientIP = getClientIP(request)

    if (!admin) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(request.url)
        const keyId = searchParams.get('keyId')

        if (!keyId) {
            return NextResponse.json(
                { error: 'keyId es requerido' },
                { status: 400 }
            )
        }

        const success = revokeKeyById(keyId)

        if (success) {
            SecurityLogger.auth('key_revoked', userId!, clientIP, true, { keyId })
        }

        return NextResponse.json({
            success,
            message: success 
                ? `Clave revocada: ${keyId}`
                : 'No se pudo revocar la clave (puede ser la clave activa actual)',
        })

    } catch (error) {
        console.error('Key revocation error:', error)
        return NextResponse.json(
            { error: 'Error revocando clave' },
            { status: 500 }
        )
    }
}

// Utility functions
function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    
    if (seconds < 60) return 'hace menos de un minuto'
    if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} minutos`
    if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} horas`
    return `hace ${Math.floor(seconds / 86400)} días`
}

function formatTimeUntil(date: Date): string {
    const seconds = Math.floor((new Date(date).getTime() - Date.now()) / 1000)
    
    if (seconds < 0) return 'expirada'
    if (seconds < 3600) return `en ${Math.floor(seconds / 60)} minutos`
    if (seconds < 86400) return `en ${Math.floor(seconds / 3600)} horas`
    return `en ${Math.floor(seconds / 86400)} días`
}
