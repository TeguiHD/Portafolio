import { verifySuperAdmin } from '@/lib/auth/dal'
import SuperAdminClient from './client'

export const dynamic = 'force-dynamic'

export default async function SuperAdminPage() {
    await verifySuperAdmin()

    return <SuperAdminClient />
}
