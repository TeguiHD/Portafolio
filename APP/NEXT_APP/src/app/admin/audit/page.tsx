import { requirePagePermission } from '@/lib/page-security'
import AuditPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function AuditPage() {
    // Server-side permission validation
    await requirePagePermission('audit.view')

    return <AuditPageClient />
}
