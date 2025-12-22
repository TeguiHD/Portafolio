/**
 * MFA Verification API Endpoint
 * 
 * POST /api/auth/mfa/verify - Verify TOTP code during login
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

// Rate limiting for MFA attempts
const mfaAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutos

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
            SecurityLogger.bruteForce('mfa', clientIP, MAX_ATTEMPTS, {
                userId: session.user.id
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

        // TODO: Obtener datos MFA del usuario cuando existan los campos
        // const user = await prisma.user.findUnique({
        //     where: { id: session.user.id },
        //     select: {
        //         mfaSecret: true,
        //         mfaRecoveryCodes: true,
        //         mfaEnabled: true,
        //     }
        // })
        
        // if (!user?.mfaEnabled || !user.mfaSecret) {
        //     return NextResponse.json(
        //         { error: 'MFA no está habilitado' },
        //         { status: 400 }
        //     )
        // }

        // Respuesta temporal mientras no existen los campos
        return NextResponse.json({
            success: false,
            message: 'MFA no está habilitado aún. Agrega los campos MFA al schema.prisma',
            remainingAttempts: rateLimit.remainingAttempts,
            _dev: {
                note: 'Código que verificaría:',
                isRecoveryCode,
                codeLength: sanitizedCode.length,
            }
        })

        // TODO: Descomentar cuando existan los campos
        /*
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
                    }
                })
                verified = true
                
                SecurityLogger.auth('mfa_recovery_code_used', session.user.id, clientIP, true, {
                    remainingCodes: result.remainingCodes.length
                })
            }
        } else {
            // Verify TOTP code
            verified = verifyMFA(user.mfaSecret, sanitizedCode)
            
            if (verified) {
                await prisma.user.update({
                    where: { id: session.user.id },
                    data: { mfaVerifiedAt: new Date() }
                })
            }
        }

        if (verified) {
            resetRateLimit(session.user.id)
            SecurityLogger.auth('mfa_verified', session.user.id, clientIP, true)
            
            return NextResponse.json({
                success: true,
                message: 'Verificación exitosa'
            })
        } else {
            SecurityLogger.auth('mfa_failed', session.user.id, clientIP, false, {
                remainingAttempts: rateLimit.remainingAttempts
            })
            
            return NextResponse.json({
                success: false,
                error: 'Código inválido',
                remainingAttempts: rateLimit.remainingAttempts
            }, { status: 401 })
        }
        */

    } catch (error) {
        console.error('Error verifying MFA:', error)
        return NextResponse.json(
            { error: 'Error verificando código' },
            { status: 500 }
        )
    }
}
