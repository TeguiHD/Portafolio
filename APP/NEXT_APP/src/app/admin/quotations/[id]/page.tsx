import { requirePagePermission } from '@/lib/page-security'
import EditQuotationPageClient from './client'

export const dynamic = 'force-dynamic'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditQuotationPage({ params }: PageProps) {
    // Server-side permission validation
    await requirePagePermission('quotations.view')

    return <EditQuotationPageClient params={params} />
}
