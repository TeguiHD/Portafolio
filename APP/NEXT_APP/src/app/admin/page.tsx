import { requirePagePermission } from "@/lib/page-security";
import { getUserEffectivePermissions } from "@/lib/permission-check";
import { DashboardStats } from "@/modules/admin/components/DashboardStats";
import { RecentActivity } from "@/modules/admin/components/RecentActivity";
import { QuickActions } from "@/modules/admin/components/QuickActions";

// Force dynamic rendering - this page requires authentication
export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  // Server-side permission validation
  const session = await requirePagePermission('dashboard.view');

  // Load permissions for QuickActions filtering
  const permissionsSet = await getUserEffectivePermissions(session.user.id, session.user.role);
  const permissions = Array.from(permissionsSet);

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Bienvenido, {session.user.name || "Admin"} 👋
        </h1>
        <p className="text-neutral-400 mt-2">
          Aquí tienes un resumen de la actividad de tu portafolio.
        </p>
      </div>

      {/* Stats Grid */}
      <DashboardStats />

      {/* Quick Actions - filtered by permissions */}
      <QuickActions permissions={permissions} />

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  );
}

