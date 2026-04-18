/**
 * MFA Setup API Endpoint
 * 
 * POST   /api/auth/mfa/setup - Initialize MFA setup (generate secret + QR)
 * GET    /api/auth/mfa/setup - Get MFA status
 * DELETE /api/auth/mfa/setup - Disable MFA (requires current TOTP code)
 * 
 * Security: NIST SP 800-63B, OWASP MFA Guidelines
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { initializeMFASetup, verifyMFA } from '@/lib/mfa'
import { verifyPassword } from '@/lib/security.server'
import { SecurityLogger } from '@/lib/security-logger'

const getClientIP = (request: NextRequest): string => {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        '127.0.0.1'
}

// GET - Check MFA status
export async function GET(_request: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                email: true,
                mfaEnabled: true,
                mfaVerifiedAt: true,
            }
        })

        if (!user) {
            return NextResponse.json(
                { error: 'Usuario no encontrado' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            mfaEnabled: user.mfaEnabled,
            mfaVerifiedAt: user.mfaVerifiedAt?.toISOString() || null,
        })

    } catch (error) {
        console.error('Error checking MFA status:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}

// POST - Start MFA setup
export async function POST(request: NextRequest) {
    const clientIP = getClientIP(request)

    try {
        const session = await auth()

        if (!session?.user?.id || !session.user.email) {
            SecurityLogger.auth({
                success: false,
                userId: '',
                ipAddress: clientIP,
                reason: 'mfa_setup_unauthorized'
            })
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            )
        }

        const userId = session.user.id
        const userEmail = session.user.email

        // Require password verification before MFA setup (prevents account takeover via stolen session)
        const body = await request.json()
        const { password } = body

        if (!password || typeof password !== 'string') {
            return NextResponse.json(
                { error: 'Se requiere la contraseña actual para configurar MFA' },
                { status: 400 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { password: true, mfaEnabled: true }
        })

        if (!user) {
            return NextResponse.json(
                { error: 'Usuario no encontrado' },
                { status: 404 }
            )
        }

        const isPasswordValid = await verifyPassword(password, user.password)
        if (!isPasswordValid) {
            SecurityLogger.auth({
                success: false,
                userId,
                ipAddress: clientIP,
                reason: 'mfa_setup_wrong_password'
            })
            return NextResponse.json(
                { error: 'Contraseña incorrecta' },
                { status: 401 }
            )
        }

        if (user.mfaEnabled) {
            return NextResponse.json(
                { error: 'MFA ya está habilitado. Desactívalo primero para reconfigurarlo.' },
                { status: 409 }
            )
        }

        // Initialize MFA
        const mfaSetup = initializeMFASetup(userEmail)

        // Save encrypted secret and hashed recovery codes to DB
        // MFA is NOT enabled yet — it will be enabled after first verification
        await prisma.user.update({
            where: { id: userId },
            data: {
                mfaSecret: mfaSetup.encryptedSecret,
                mfaRecoveryCodes: mfaSetup.recoveryHashes,
                mfaEnabled: false,
            }
        })

        SecurityLogger.auth({
            success: true,
            userId,
            ipAddress: clientIP,
            method: 'mfa_setup_initiated'
        })

        return NextResponse.json({
            success: true,
            qrCodeURI: mfaSetup.qrCodeURI,
            manualEntryKey: mfaSetup.manualEntryKey,
            recoveryCodes: mfaSetup.recoveryCodes,
            message: 'Escanea el código QR con tu app de autenticación',
            warning: '⚠️ Guarda los códigos de recuperación en un lugar seguro. Solo se mostrarán una vez.',
        })

    } catch (error) {
        console.error('Error setting up MFA:', error)
        SecurityLogger.auth({
            success: false,
            userId: '',
            ipAddress: clientIP,
            reason: 'mfa_setup_error'
        })

        return NextResponse.json(
            { error: 'Error configurando MFA' },
            { status: 500 }
        )
    }
}

// DELETE - Disable MFA (requires current TOTP code for security)
export async function DELETE(request: NextRequest) {
    const clientIP = getClientIP(request)

    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { code } = body

        if (!code || typeof code !== 'string') {
            return NextResponse.json(
                { error: 'Código TOTP requerido para desactivar MFA' },
                { status: 400 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                mfaEnabled: true,
                mfaSecret: true,
            }
        })

        if (!user?.mfaEnabled || !user.mfaSecret) {
            return NextResponse.json(
                { error: 'MFA no está habilitado' },
                { status: 400 }
            )
        }

        // Verify current TOTP code before disabling
        const sanitizedCode = code.replace(/[^0-9]/g, '').slice(0, 6)
        const isValid = verifyMFA(user.mfaSecret, sanitizedCode)

        if (!isValid) {
            SecurityLogger.auth({
                success: false,
                userId: session.user.id,
                ipAddress: clientIP,
                reason: 'mfa_disable_invalid_code'
            })
            return NextResponse.json(
                { error: 'Código inválido. Verifica e intenta nuevamente.' },
                { status: 401 }
            )
        }

        // Disable MFA and revoke all other sessions atomically
        await prisma.$transaction([
            prisma.user.update({
                where: { id: session.user.id },
                data: {
                    mfaEnabled: false,
                    mfaSecret: null,
                    mfaRecoveryCodes: [],
                    mfaVerifiedAt: null,
                    mfaBackupEmail: null,
                },
            }),
            // Revoke all other active sessions (security-critical change)
            prisma.userSession.updateMany({
                where: {
                    userId: session.user.id,
                    isActive: true,
                },
                data: {
                    isActive: false,
                    revokedAt: new Date(),
                    revokeReason: 'mfa_disabled',
                },
            }),
        ])

        SecurityLogger.auth({
            success: true,
            userId: session.user.id,
            ipAddress: clientIP,
            method: 'mfa_disabled'
        })

        return NextResponse.json({
            success: true,
            message: 'MFA desactivado exitosamente',
        })

    } catch (error) {
        console.error('Error disabling MFA:', error)
        return NextResponse.json(
            { error: 'Error desactivando MFA' },
            { status: 500 }
        )
    }
}
