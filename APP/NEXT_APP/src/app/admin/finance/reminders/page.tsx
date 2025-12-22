import { requirePagePermission } from '@/lib/page-security'
import RemindersPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function RemindersPage() {
    await requirePagePermission('finance.view')
    return <RemindersPageClient />
}
