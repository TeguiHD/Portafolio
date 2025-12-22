import { requirePagePermission } from '@/lib/page-security'
import GoalsPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function GoalsPage() {
    await requirePagePermission('finance.goals.view')
    return <GoalsPageClient />
}
