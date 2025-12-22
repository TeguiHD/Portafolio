import { requirePagePermission } from '@/lib/page-security'
import CvEditorPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function CvEditorPage() {
    // Server-side permission validation
    await requirePagePermission('cv.own.view')

    return <CvEditorPageClient />
}
