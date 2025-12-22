import { requirePagePermission } from '@/lib/page-security'
import AnalyticsPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
    // Server-side permission validation
    await requirePagePermission('analytics.view')

    return <AnalyticsPageClient />
}
