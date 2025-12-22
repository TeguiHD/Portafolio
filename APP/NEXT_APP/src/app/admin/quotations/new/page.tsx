import { requirePagePermission } from '@/lib/page-security'
import NewQuotationPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function NewQuotationPage() {
    // Server-side permission validation
    await requirePagePermission('quotations.create')

    return <NewQuotationPageClient />
}
