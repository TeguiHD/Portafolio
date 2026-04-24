import { redirect } from "next/navigation";
import { verifyAnyRole } from "@/lib/auth/dal";
import { getUserEffectivePermissions } from "@/lib/permission-check";
import { canOpenAdminDashboard, resolveAdminLandingPath } from "@/lib/admin-landing";
import { DashboardStats } from "@/modules/admin/components/DashboardStats";
import { RecentActivity } from "@/modules/admin/components/RecentActivity";
import { QuickActions } from "@/modules/admin/components/QuickActions";
import { VpsControlSummary } from "@/modules/admin/components/VpsControlSummary";

// Force dynamic rendering - this page requires authentication
export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const session = await verifyAnyRole();
  if (session.user.mfaEnabled !== true) {
    redirect("/admin/profile");
  }

  const permissionsSet = await getUserEffectivePermissions(session.user.id, session.user.role);

  const canViewDashboard = canOpenAdminDashboard(session.user.role) && permissionsSet.has("dashboard.view");
  if (!canViewDashboard) {
    const landingPath = resolveAdminLandingPath(session.user.role, permissionsSet);
    redirect(landingPath === "/admin" ? "/unauthorized" : landingPath);
  }

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

      {session.user.role === "SUPERADMIN" && <VpsControlSummary />}

      {/* Quick Actions - filtered by permissions */}
      <QuickActions permissions={permissions} />

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  );
}
