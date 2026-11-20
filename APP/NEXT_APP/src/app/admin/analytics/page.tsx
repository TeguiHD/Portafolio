import { requirePagePermission } from '@/lib/page-security'
import { hasPermission } from '@/lib/permission-check'
import { datosVisitas } from './datos'
import AnalyticsPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
    const session = await requirePagePermission('analytics.view')
    // Los 7 días iniciales llegan con la página; los otros rangos se piden a /api/analytics.
    const verPropuestas = await hasPermission(session.user.id, session.user.role, 'quotations.view')
    const inicial = await datosVisitas(7, session.user.id, verPropuestas)

    return <AnalyticsPageClient inicial={inicial} />
}
