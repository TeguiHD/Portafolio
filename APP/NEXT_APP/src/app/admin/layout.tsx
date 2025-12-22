import { verifyAdmin } from "@/lib/auth/dal";
import { AdminLayoutClient } from "@/modules/admin/components/AdminLayoutClient";
import { getUserEffectivePermissions } from "@/lib/permission-check";

// Force dynamic rendering - admin pages require authentication
export const dynamic = 'force-dynamic';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // DAL pattern: Auth verification happens close to data access
    const session = await verifyAdmin();

    // Load user's effective permissions server-side for secure UI filtering
    const userPermissions = await getUserEffectivePermissions(
        session.user.id,
        session.user.role
    );

    return (
        <AdminLayoutClient
            user={session.user}
            permissions={Array.from(userPermissions)}
        >
            {children}
        </AdminLayoutClient>
    );
}
