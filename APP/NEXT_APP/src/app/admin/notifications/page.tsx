import { requirePagePermission } from '@/lib/page-security'
import NotificationsPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
    // Server-side permission validation
    await requirePagePermission('notifications.view')

    return <NotificationsPageClient />
}
