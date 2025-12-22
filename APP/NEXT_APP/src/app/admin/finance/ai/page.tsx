import { requirePagePermission } from '@/lib/page-security'
import AIAnalysisPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function AIPage() {
    await requirePagePermission('finance.view')
    return <AIAnalysisPageClient />
}
