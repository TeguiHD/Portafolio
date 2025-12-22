import { requirePagePermission } from '@/lib/page-security'
import AccountsPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function AccountsPage() {
    await requirePagePermission('finance.accounts.view')
    return <AccountsPageClient />
}
