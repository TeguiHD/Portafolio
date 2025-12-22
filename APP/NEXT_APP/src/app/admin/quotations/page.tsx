import { requirePagePermission } from '@/lib/page-security'
import QuotationsPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function QuotationsPage() {
    // Server-side permission validation
    await requirePagePermission('quotations.view')

    return <QuotationsPageClient />
}
