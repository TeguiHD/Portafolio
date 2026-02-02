import { requirePagePermission } from '@/lib/page-security'
import ClientsPageClient from './client'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
    // Permission check
    await requirePagePermission('quotations.view') // Assuming 'quotations.view' or add 'clients.view' if specific

    // Get session for UI logic
    const { auth } = await import("@/lib/auth");
    const session = await auth();

    if (!session?.user?.id) return null;

    return <ClientsPageClient
        currentUserId={session.user.id}
        isSuperAdmin={session.user.role === "SUPERADMIN"}
    />
}
