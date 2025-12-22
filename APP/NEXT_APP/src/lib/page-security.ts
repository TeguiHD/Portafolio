/**
 * Page Security - Server-side permission enforcement
 * 
 * Use this in Server Components to validate permissions before rendering.
 * This prevents users from bypassing the sidebar by typing URLs directly.
 * 
 * @module page-security
 */

import 'server-only'
import { verifySession, type Session } from '@/lib/auth/dal'
import { hasPermission } from '@/lib/permission-check'
import { redirect } from 'next/navigation'
import { SecurityLogger } from '@/lib/security-logger'
import { headers } from 'next/headers'

/**
 * Require a specific permission to access a page.
 * Redirects to /unauthorized if permission is denied.
 * Logs all unauthorized access attempts.
 * 
 * @example
 * ```typescript
 * // In a Server Component page.tsx
 * export default async function FinancePage() {
 *     const session = await requirePagePermission('finance.view')
 *     return <FinancePageClient user={session.user} />
 * }
 * ```
 */
export async function requirePagePermission(permissionCode: string): Promise<Session> {
    const session = await verifySession()

    // Get request context for logging
    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headersList.get('x-real-ip') || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    // Check permission
    const allowed = await hasPermission(
        session.user.id,
        session.user.role,
        permissionCode
    )

    if (!allowed) {
        // Log attempted bypass - this is a security event
        SecurityLogger.unauthorized({
            ipAddress,
            userAgent,
            userId: session.user.id,
            resource: `page:${permissionCode}`,
            requiredPermission: permissionCode
        })

        // Redirect to unauthorized page
        redirect('/unauthorized' as any)
    }

    return session
}

/**
 * Check multiple permissions (user needs ALL of them)
 */
export async function requireAllPermissions(permissionCodes: string[]): Promise<Session> {
    const session = await verifySession()

    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headersList.get('x-real-ip') || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    for (const code of permissionCodes) {
        const allowed = await hasPermission(session.user.id, session.user.role, code)

        if (!allowed) {
            SecurityLogger.unauthorized({
                ipAddress,
                userAgent,
                userId: session.user.id,
                resource: `page:${code}`,
                requiredPermission: code
            })
            redirect('/unauthorized' as any)
        }
    }

    return session
}

/**
 * Check multiple permissions (user needs ANY of them)
 */
export async function requireAnyPermission(permissionCodes: string[]): Promise<Session> {
    const session = await verifySession()

    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headersList.get('x-real-ip') || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    for (const code of permissionCodes) {
        const allowed = await hasPermission(session.user.id, session.user.role, code)
        if (allowed) {
            return session
        }
    }

    // None of the permissions were granted
    SecurityLogger.unauthorized({
        ipAddress,
        userAgent,
        userId: session.user.id,
        resource: `page:${permissionCodes.join('|')}`,
        requiredPermission: permissionCodes.join(' OR ')
    })
    redirect('/unauthorized' as any)
}
