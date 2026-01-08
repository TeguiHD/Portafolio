import { requirePagePermission } from '@/lib/page-security'
import CvEditorPageClientEnhanced from './client-enhanced'

export const dynamic = 'force-dynamic'

export default async function CvEditorPage() {
    // Server-side permission validation
    await requirePagePermission('cv.own.view')

    // Use enhanced client with RenderCV-inspired features
    return <CvEditorPageClientEnhanced />
}
