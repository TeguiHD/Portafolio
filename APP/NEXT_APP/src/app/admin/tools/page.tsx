import { requirePagePermission } from '@/lib/page-security'
import ToolsPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function ToolsPage() {
    // Server-side permission validation
    await requirePagePermission('tools.view')

    return <ToolsPageClient />
}
