import { requirePagePermission } from '@/lib/page-security'
import ReportsPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
    await requirePagePermission('finance.reports.view')
    return <ReportsPageClient />
}
