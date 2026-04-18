/**
 * MFA Verification API Endpoint
 * 
 * POST /api/auth/mfa/verify - Verify TOTP code (setup confirmation or login)
 * 
 * Security: NIST SP 800-63B, OWASP MFA Guidelines
 * Rate limiting: 5 attempts per 15 minutes per user
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyMFA, useRecoveryCode } from '@/lib/mfa'
import { SecurityLogger } from '@/lib/security-logger'

const getClientIP = (request: NextRequest): string => {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        '127.0.0.1'
}

// Rate limiting for MFA attempts (in-memory, per-process)
const mfaAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

function checkRateLimit(userId: string): { allowed: boolean; remainingAttempts: number } {
    const now = Date.now()
    const attempts = mfaAttempts.get(userId)

    if (!attempts) {
        mfaAttempts.set(userId, { count: 1, lastAttempt: now })
        return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 }
    }

    // Reset after lockout
    if (now - attempts.lastAttempt > LOCKOUT_DURATION) {
        mfaAttempts.set(userId, { count: 1, lastAttempt: now })
        return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 }
    }

    if (attempts.count >= MAX_ATTEMPTS) {
        return { allowed: false, remainingAttempts: 0 }
    }

    attempts.count++
    attempts.lastAttempt = now
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - attempts.count }
}

function resetRateLimit(userId: string): void {
    mfaAttempts.delete(userId)
}

export async function POST(request: NextRequest) {
    const clientIP = getClientIP(request)

    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            )
        }

        // Rate limit check
        const rateLimit = checkRateLimit(session.user.id)
        if (!rateLimit.allowed) {
            SecurityLogger.bruteForce({
                ipAddress: clientIP,
                userAgent: request.headers.get('user-agent') || 'unknown',
                targetResource: '/api/auth/mfa/verify',
                attemptCount: MAX_ATTEMPTS
            })

            return NextResponse.json(
                {
                    error: 'Demasiados intentos. Espera 15 minutos.',
                    lockedUntil: Date.now() + LOCKOUT_DURATION
                },
                { status: 429 }
            )
        }

        const body = await request.json()
        const { code, isRecoveryCode } = body

        if (!code || typeof code !== 'string') {
            return NextResponse.json(
                { error: 'Código requerido' },
                { status: 400 }
            )
        }

        // Sanitize code
        const sanitizedCode = code.replace(/[^0-9A-Za-z-]/g, '').slice(0, 20)

        // Get user MFA data
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                mfaSecret: true,
                mfaRecoveryCodes: true,
                mfaEnabled: true,
            }
        })

        if (!user?.mfaSecret) {
            return NextResponse.json(
                { error: 'MFA no está configurado. Inicia la configuración primero.' },
                { status: 400 }
            )
        }

        let verified = false

        if (isRecoveryCode) {
            // Verify recovery code
            const result = useRecoveryCode(sanitizedCode, user.mfaRecoveryCodes)

            if (result.valid) {
                // Update remaining codes
                await prisma.user.update({
                    where: { id: session.user.id },
                    data: {
                        mfaRecoveryCodes: result.remainingCodes,
                        mfaVerifiedAt: new Date(),
                        mfaEnabled: true,
                    }
                })
                verified = true

                SecurityLogger.auth({
                    success: true,
                    userId: session.user.id,
                    ipAddress: clientIP,
                    method: 'mfa_recovery_code_used',
                })
            }
        } else {
            // Verify TOTP code
            verified = verifyMFA(user.mfaSecret, sanitizedCode)

            if (verified) {
                await prisma.user.update({
                    where: { id: session.user.id },
                    data: {
                        mfaVerifiedAt: new Date(),
                        // Enable MFA on first successful verification (setup confirmation)
                        mfaEnabled: true,
                    }
                })

                SecurityLogger.auth({
                    success: true,
                    userId: session.user.id,
                    ipAddress: clientIP,
                    method: 'mfa_verified',
                })
            }
        }

        if (verified) {
            resetRateLimit(session.user.id)

            return NextResponse.json({
                success: true,
                message: user.mfaEnabled
                    ? 'Verificación exitosa'
                    : '¡MFA activado exitosamente! Tu cuenta está ahora protegida con autenticación de dos factores.',
            })
        } else {
            SecurityLogger.auth({
                success: false,
                userId: session.user.id,
                ipAddress: clientIP,
                reason: 'mfa_code_invalid',
            })

            return NextResponse.json({
                success: false,
                error: 'Código inválido',
                remainingAttempts: rateLimit.remainingAttempts,
            }, { status: 401 })
        }

    } catch (error) {
        console.error('Error verifying MFA:', error)
        return NextResponse.json(
            { error: 'Error verificando código' },
            { status: 500 }
        )
    }
}
