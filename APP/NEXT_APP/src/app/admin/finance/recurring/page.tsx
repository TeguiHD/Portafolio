import { requirePagePermission } from '@/lib/page-security'
import RecurringPaymentsPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function RecurringPage() {
    await requirePagePermission('finance.recurring.view')
    return <RecurringPaymentsPageClient />
}
