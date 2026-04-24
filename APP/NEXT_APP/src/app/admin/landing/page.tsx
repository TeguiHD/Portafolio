import { redirect } from "next/navigation";
import { verifyAnyRole } from "@/lib/auth/dal";
import { getUserEffectivePermissions } from "@/lib/permission-check";
import { resolveAdminLandingPath } from "@/lib/admin-landing";

export const dynamic = "force-dynamic";

export default async function AdminLandingPage() {
    const session = await verifyAnyRole();
    if (session.user.mfaEnabled !== true) {
        redirect("/admin/profile");
    }

    const permissions = await getUserEffectivePermissions(session.user.id, session.user.role);

    redirect(resolveAdminLandingPath(session.user.role, permissions));
}
