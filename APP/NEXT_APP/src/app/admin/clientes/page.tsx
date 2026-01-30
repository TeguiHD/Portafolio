import { requirePagePermission } from '@/lib/page-security'
import ClientsPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
    // Permission check
    await requirePagePermission('quotations.view') // Assuming 'quotations.view' or add 'clients.view' if specific

    return <ClientsPageClient />
}
