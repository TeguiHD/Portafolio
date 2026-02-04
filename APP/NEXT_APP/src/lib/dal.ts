import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Role } from '@prisma/client'

/**
 * Data Access Layer (DAL)
 * 
 * Central security verification layer for Next.js App Router (2026 standard).
 * Replaces unreliable middleware-only protection with per-request verification.
 * 
 * @see SEGURIDAD2.TXT (Section 2)
 */

export type SessionPayload = {
    userId: string
    role: Role
    email: string
    isVerified: boolean
}

/**
 * Verify session and return safe user data.
 * Must be called in EVERY Server Action and Data Fetching function.
 * 
 * Uses React cache() to deduplicate requests during a single render pass.
 */
export const verifySession = cache(async (): Promise<SessionPayload> => {
    // 1. Get session from Auth.js
    const session = await auth()

    // 2. Strict validation
    if (!session || !session.user?.id) {
        redirect('/acceso')
    }

    // 3. Construct Safe Payload (Exclude sensitive fields)
    return {
        userId: session.user.id,
        role: session.user.role || 'USER',
        email: session.user.email || '',
        isVerified: true
    }
})

/**
 * Verify if the current user has the required role.
 * Throws error if unauthorized.
 */
export const requireRole = async (allowedRoles: Role[]) => {
    const session = await verifySession()

    if (!allowedRoles.includes(session.role)) {
        throw new Error(`Unauthorized: Role ${session.role} insufficient`)
    }

    return session
}

/**
 * Securely verify ownership of a resource
 */
export const verifyOwnership = async (resourceUserId: string) => {
    const session = await verifySession()

    if (session.role !== 'SUPERADMIN' && session.userId !== resourceUserId) {
        throw new Error('Forbidden: You do not own this resource')
    }

    return session
}
