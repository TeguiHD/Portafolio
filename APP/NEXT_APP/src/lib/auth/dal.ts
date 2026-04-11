/**
 * Data Access Layer (DAL) - Next.js 16 Security Pattern
 * 
 * Implementación "Zero Trust" (NIST SP 800-207):
 * No confiamos implícitamente en el token JWT para autorización crítica.
 * Verificamos el estado y rol del usuario contra la Base de Datos en Tiempo Real.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/authentication
 */
import 'server-only'
import { auth } from '@/lib/auth'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { Role } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { hashEmail } from '@/lib/security.server'

// DTO seguro para datos del usuario (solo lo necesario)
export interface SessionUser {
    id: string
    email: string
    name: string | null
    role: Role
    avatar: string | null
    mfaEnabled?: boolean
}

export interface Session {
    user: SessionUser
}

/**
 * 1. BASIC SESSION CHECK (Low Overhead)
 * Verifica solo la firma/encriptación del JWT.
 * Usado para rutas públicas autenticadas donde el rol no es crítico.
 */
export const verifySession = cache(async (): Promise<Session> => {
    const session = await auth()

    if (!session?.user?.email) {
        redirect('/acceso')
    }

    return {
        user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name ?? null,
            role: session.user.role,
            avatar: session.user.avatar ?? null,
            mfaEnabled: session.user.mfaEnabled,
        }
    }
})

/**
 * Helper interno para validación Zero Trust
 * Consulta la BD para confirmar rol y estado activo.
 */
async function validateUserRoleAgainstDb(email: string, requiredRoles: Role[]): Promise<SessionUser | null> {
    try {
        // Hash email for lookup (privacy by design)
        const emailHash = hashEmail(email)

        const user = await prisma.user.findUnique({
            where: { email: emailHash },
            select: {
                id: true,
                role: true,
                isActive: true,
                name: true,
                emailEncrypted: true,
                avatar: true, // Assuming avatar field exists or strict mapping needed
                mfaEnabled: true,
            }
        })

        // 1. User must exist
        if (!user) return null

        // 2. User must be verified active (Kill Switch)
        if (!user.isActive) return null

        // 3. User must have required role (Privilege Escalation Protection)
        if (!requiredRoles.includes(user.role)) return null

        // Return fresh data from DB
        return {
            id: user.id,
            email: email, // Keep original email from session
            name: user.name,
            role: user.role,
            avatar: null, // Avatar might not be in select, keeping clean
            mfaEnabled: user.mfaEnabled,
        }
    } catch (error) {
        console.error('Zero Trust Validation Failed:', error)
        return null
    }
}

/**
 * 2. ADMIN CHECK (Real-Time DB Verification)
 * Zero Trust: Ignora el rol del JWT, valida contra DB.
 */
export const verifyAdmin = cache(async (): Promise<Session> => {
    const session = await verifyAdminAllowMissingMfa()

    if (session.user.mfaEnabled !== true) {
        redirect('/admin/profile')
    }

    return session
})

export const verifyAdminAllowMissingMfa = cache(async (): Promise<Session> => {
    const session = await verifySession() // Get basics first

    // Real-time Check
    const dbUser = await validateUserRoleAgainstDb(session.user.email, ['ADMIN', 'SUPERADMIN'])

    if (!dbUser) {
        console.warn(`[SECURITY] Privilege Escalation Attempt or Stale Token: User ${session.user.id} tried to access ADMIN area.`)
        redirect('/unauthorized') // Or force logout
    }

    return { user: dbUser }
})

/**
 * 2b. ANY AUTHENTICATED USER (for admin layout)
 * Allows any role (USER, ADMIN, SUPERADMIN) — per-section permission checks handle access control.
 */
export const verifyAnyRole = cache(async (): Promise<Session> => {
    const session = await verifySession()

    try {
        const emailHash = hashEmail(session.user.email)
        const user = await prisma.user.findUnique({
            where: { email: emailHash },
            select: { id: true, role: true, isActive: true, name: true, emailEncrypted: true, avatar: true, mfaEnabled: true },
        })

        if (!user || !user.isActive) {
            redirect('/unauthorized')
        }

        return {
            user: {
                id: user.id,
                email: session.user.email,
                name: user.name,
                role: user.role,
                avatar: null,
                mfaEnabled: user.mfaEnabled,
            },
        }
    } catch {
        redirect('/acceso')
    }
})

/**
 * 3. SUPERADMIN CHECK (Real-Time DB Verification)
 * Zero Trust: Ignora el rol del JWT, valida contra DB.
 */
export const verifySuperAdmin = cache(async (): Promise<Session> => {
    const session = await verifySession()

    // Real-time Check
    const dbUser = await validateUserRoleAgainstDb(session.user.email, ['SUPERADMIN'])

    if (!dbUser) {
        console.warn(`[SECURITY] Privilege Escalation Attempt or Stale Token: User ${session.user.id} tried to access SUPERADMIN area.`)
        redirect('/unauthorized')
    }

    if (dbUser.mfaEnabled !== true) {
        redirect('/admin/profile')
    }

    return { user: dbUser }
})

/**
 * 4. API UTILS (Non-redirecting)
 */
export const verifySessionForApi = cache(async (): Promise<Session | null> => {
    const session = await auth()
    if (!session?.user) return null
    return {
        user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name ?? null,
            role: session.user.role,
            avatar: session.user.avatar ?? null,
            mfaEnabled: session.user.mfaEnabled,
        }
    }
})

export const verifyAdminForApi = cache(async (): Promise<Session | null> => {
    const session = await verifySessionForApi()
    if (!session?.user?.email) return null

    const dbUser = await validateUserRoleAgainstDb(session.user.email, ['ADMIN', 'SUPERADMIN'])
    if (!dbUser) return null // Access denied logic here
    if (dbUser.mfaEnabled !== true) return null

    return { user: dbUser }
})

export const verifySuperAdminForApi = cache(async (): Promise<Session | null> => {
    const session = await verifySessionForApi()
    if (!session?.user?.email) return null

    const dbUser = await validateUserRoleAgainstDb(session.user.email, ['SUPERADMIN'])
    if (!dbUser) return null
    if (dbUser.mfaEnabled !== true) return null

    return { user: dbUser }
})
