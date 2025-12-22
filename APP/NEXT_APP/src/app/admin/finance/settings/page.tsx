import { requirePagePermission } from '@/lib/page-security'
import SettingsPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
    await requirePagePermission('finance.view')
    return <SettingsPageClient />
}
