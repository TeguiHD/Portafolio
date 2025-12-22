import { requirePagePermission } from '@/lib/page-security'
import BudgetsPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function BudgetsPage() {
    await requirePagePermission('finance.budgets.view')
    return <BudgetsPageClient />
}
