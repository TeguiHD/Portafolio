/**
 * MFA Setup API Endpoint
 * 
 * POST /api/auth/mfa/setup - Initialize MFA setup
 * GET  /api/auth/mfa/setup - Get setup status
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { initializeMFASetup } from '@/lib/mfa'
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
                // Agregar cuando existan en schema:
                // mfaEnabled: true,
                // mfaVerifiedAt: true,
            }
        })

        if (!user) {
            return NextResponse.json(
                { error: 'Usuario no encontrado' },
                { status: 404 }
            )
        }

        // TODO: Descomentar cuando se agreguen campos MFA al schema
        // return NextResponse.json({
        //     mfaEnabled: user.mfaEnabled,
        //     mfaVerifiedAt: user.mfaVerifiedAt,
        // })

        // Respuesta temporal mientras no existen los campos
        return NextResponse.json({
            mfaEnabled: false,
            mfaVerifiedAt: null,
            message: 'MFA no está habilitado aún. Agrega los campos MFA al schema.prisma',
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let session: any = null

    try {
        session = await auth()

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

        // Initialize MFA
        const mfaSetup = initializeMFASetup(session.user.email)

        // TODO: Guardar en DB cuando existan los campos
        // await prisma.user.update({
        //     where: { id: session.user.id },
        //     data: {
        //         mfaSecret: mfaSetup.secret,
        //         mfaRecoveryCodes: mfaSetup.recoveryHashes,
        //         mfaEnabled: false, // Se activa después de verificar primer código
        //     }
        // })

        SecurityLogger.auth({
            success: true,
            userId: session.user.id,
            ipAddress: clientIP,
            method: 'mfa_setup_initiated'
        })

        return NextResponse.json({
            success: true,
            qrCodeURI: mfaSetup.qrCodeURI,
            recoveryCodes: mfaSetup.recoveryCodes,
            message: 'Escanea el código QR con tu app de autenticación',
            warning: '⚠️ Guarda los códigos de recuperación en un lugar seguro. Solo se mostrarán una vez.',

            // Info para desarrollo
            _dev: {
                note: 'Para completar la implementación:',
                steps: [
                    '1. Agrega campos MFA al schema.prisma',
                    '2. Ejecuta: npx prisma migrate dev',
                    '3. Descomenta el código de guardado en DB',
                ]
            }
        })

    } catch (error) {
        console.error('Error setting up MFA:', error)
        SecurityLogger.auth({
            success: false,
            userId: session?.user?.id || '',
            ipAddress: clientIP,
            reason: 'mfa_setup_error'
        })

        return NextResponse.json(
            { error: 'Error configurando MFA' },
            { status: 500 }
        )
    }
}
