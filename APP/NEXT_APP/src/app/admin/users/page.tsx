import { requirePagePermission } from '@/lib/page-security'
import { getUserEffectivePermissions } from '@/lib/permission-check'
import UsersPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
    // Server-side permission validation
    const session = await requirePagePermission('users.view')

    // La API vuelve a comprobar cada permiso; esto solo esconde los botones que no servirían.
    const efectivos = await getUserEffectivePermissions(session.user.id, session.user.role)
    const puede = (codigo: string) => session.user.role === 'SUPERADMIN' || efectivos.has(codigo)
    const permisos = {
        crear: puede('users.create'),
        rol: puede('users.role.edit'),
        clave: puede('users.edit'),
        suspender: puede('users.suspend'),
        borrar: puede('users.delete'),
        permisos: puede('users.permissions.edit'),
    }

    return <UsersPageClient currentUserRole={session.user.role} currentUserId={session.user.id} permisos={permisos} />
}
