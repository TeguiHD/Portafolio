import { requirePagePermission } from '@/lib/page-security'
import UsersPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
    // Server-side permission validation
    const session = await requirePagePermission('users.view')

    return <UsersPageClient currentUserRole={session.user.role} />
}
