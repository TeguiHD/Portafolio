import { requirePagePermission } from '@/lib/page-security'
import TransactionsPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
    await requirePagePermission('finance.transactions.view')
    return <TransactionsPageClient />
}
