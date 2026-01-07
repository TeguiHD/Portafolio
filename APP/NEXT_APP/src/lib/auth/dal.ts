/**
 * Data Access Layer (DAL) - Next.js 16 Security Pattern
 * 
 * Este archivo centraliza la verificación de sesión y autorización.
 * Debe ser llamado en layouts/pages de rutas protegidas.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/authentication
 */
import 'server-only'
import { auth } from '@/lib/auth'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { Role } from '@prisma/client'

// DTO seguro para datos del usuario (solo lo necesario)
export interface SessionUser {
    id: string
    email: string
    name: string | null
    role: Role
    avatar: string | null
}

export interface Session {
    user: SessionUser
}

/**
 * Verifica la sesión del usuario y retorna datos seguros.
 * Si no hay sesión válida, redirige al login.
 * 
 * Usar `cache()` de React para deduplicar llamadas dentro del mismo request.
 */
export const verifySession = cache(async (): Promise<Session> => {
    const session = await auth()

    if (!session?.user) {
        redirect('/acceso')
    }

    // Retornar solo datos seguros (DTO)
    return {
        user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name ?? null,
            role: session.user.role,
            avatar: session.user.avatar ?? null,
        }
    }
})

/**
 * Verificación opcional de sesión (no redirige).
 * Útil para páginas que muestran contenido diferente según auth.
 */
export const getSession = cache(async (): Promise<Session | null> => {
    const session = await auth()

    if (!session?.user) {
        return null
    }

    return {
        user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name ?? null,
            role: session.user.role,
            avatar: session.user.avatar ?? null,
        }
    }
})

/**
 * Verifica que el usuario esté autenticado para acceder al panel.
 * El control de acceso granular se maneja por permisos específicos.
 * Redirige a login si no está autenticado.
 */
export const verifyAdmin = cache(async (): Promise<Session> => {
    const session = await verifySession()

    // Todos los usuarios autenticados pueden acceder al panel
    // El sidebar y las páginas individuales filtran por permisos granulares
    return session
})

/**
 * Verifica que el usuario sea superadmin.
 * Redirige a login si no está autenticado.
 * Redirige a unauthorized si no es superadmin.
 */
export const verifySuperAdmin = cache(async (): Promise<Session> => {
    const session = await verifySession()

    if (session.user.role !== 'SUPERADMIN') {
        redirect('/acceso')
    }

    return session
})

/**
 * Verifica sesión y retorna 401 en lugar de redirect.
 * Útil para API routes que no deben redirigir.
 * 
 * @returns Session if valid, null if not authenticated
 */
export const verifySessionForApi = cache(async (): Promise<Session | null> => {
    const session = await auth()

    if (!session?.user) {
        return null
    }

    return {
        user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name ?? null,
            role: session.user.role,
            avatar: session.user.avatar ?? null,
        }
    }
})

/**
 * Verifica admin para API routes (retorna null en lugar de redirect).
 */
export const verifyAdminForApi = cache(async (): Promise<Session | null> => {
    const session = await verifySessionForApi()

    const adminRoles: Role[] = ['ADMIN', 'SUPERADMIN']
    if (!session || !adminRoles.includes(session.user.role)) {
        return null
    }

    return session
})

/**
 * Verifica superadmin para API routes (retorna null en lugar de redirect).
 */
export const verifySuperAdminForApi = cache(async (): Promise<Session | null> => {
    const session = await verifySessionForApi()

    if (!session || session.user.role !== 'SUPERADMIN') {
        return null
    }

    return session
})
