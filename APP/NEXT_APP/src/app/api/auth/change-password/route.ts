/**
 * Cambio de contraseña del propio usuario.
 *
 * POST /api/auth/change-password
 *
 * Pensado para el caso de la clave temporal: un administrador entrega una, el usuario
 * queda marcado con `mustChangePassword` y no puede usar el panel hasta reemplazarla.
 * También sirve para un cambio voluntario.
 *
 * Reglas, en orden de importancia:
 *   · Se exige la clave actual. Sin eso, una sesión robada bastaría para quedarse con
 *     la cuenta de forma permanente.
 *   · La nueva no puede ser la misma ni parecerse al correo.
 *   · Al cambiarla se cierran las demás sesiones: si la temporal circuló por algún lado,
 *     esa puerta se cierra también.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword, hashEmail } from '@/lib/security.server'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { revokeAllOtherSessions } from '@/lib/session-manager'

export const dynamic = 'force-dynamic'

const MINIMO = 8

/** Intentos por usuario: cambiar la clave no es algo que se haga veinte veces seguidas. */
const intentos = new Map<string, { n: number; desde: number }>()
const MAX_INTENTOS = 5
const VENTANA = 15 * 60 * 1000

function demasiados(userId: string): boolean {
    const ahora = Date.now()
    const registro = intentos.get(userId)
    if (!registro || ahora - registro.desde > VENTANA) {
        intentos.set(userId, { n: 1, desde: ahora })
        return false
    }
    registro.n += 1
    return registro.n > MAX_INTENTOS
}

function revisar(nueva: string, actual: string, correo: string): string | null {
    if (nueva.length < MINIMO) return `La nueva clave debe tener al menos ${MINIMO} caracteres.`
    if (nueva.length > 200) return 'La nueva clave es demasiado larga.'
    if (nueva === actual) return 'La nueva clave no puede ser la misma que la actual.'
    const usuario = correo.split('@')[0]?.toLowerCase() || ''
    if (usuario.length > 3 && nueva.toLowerCase().includes(usuario)) {
        return 'La clave no puede contener tu correo.'
    }
    return null
}

export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }

    let cuerpo: { actual?: unknown; nueva?: unknown }
    try {
        cuerpo = await request.json()
    } catch {
        return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
    }

    const actual = typeof cuerpo.actual === 'string' ? cuerpo.actual : ''
    const nueva = typeof cuerpo.nueva === 'string' ? cuerpo.nueva : ''
    if (!actual || !nueva) {
        return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 })
    }

    const usuario = await prisma.user.findUnique({
        where: { email: hashEmail(session.user.email) },
        select: { id: true, password: true },
    })
    if (!usuario) {
        return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }

    if (demasiados(usuario.id)) {
        return NextResponse.json(
            { error: 'Demasiados intentos. Espera quince minutos.' },
            { status: 429 }
        )
    }

    if (!(await verifyPassword(actual, usuario.password))) {
        await createAuditLog({
            action: AuditActions.PASSWORD_CHANGE_FAILED,
            category: 'security',
            userId: usuario.id,
            metadata: { motivo: 'clave actual incorrecta' },
        })
        return NextResponse.json({ error: 'La clave actual no es correcta.' }, { status: 400 })
    }

    const problema = revisar(nueva, actual, session.user.email)
    if (problema) {
        return NextResponse.json({ error: problema }, { status: 400 })
    }

    await prisma.user.update({
        where: { id: usuario.id },
        data: {
            password: await hashPassword(nueva),
            mustChangePassword: false,
            passwordChangedAt: new Date(),
        },
    })
    intentos.delete(usuario.id)

    // La clave vieja pudo haber circulado: las demás sesiones se cierran.
    try {
        // El identificador de la sesión actual viaja en session.user, para no cerrar
        // justamente la sesión desde la que se está cambiando la clave.
        const token = (session.user as typeof session.user & { sessionTokenId?: string })
            .sessionTokenId
        if (token) await revokeAllOtherSessions(usuario.id, token)
    } catch {
        // Que falle el cierre de otras sesiones no invalida el cambio de clave.
    }

    await createAuditLog({
        action: AuditActions.PASSWORD_CHANGED,
        category: 'security',
        userId: usuario.id,
    })

    return NextResponse.json({ ok: true })
}
