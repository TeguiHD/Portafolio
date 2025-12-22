import { requirePagePermission } from '@/lib/page-security'
import CategoriesPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
    await requirePagePermission('finance.categories.view')
    return <CategoriesPageClient />
}
