import type { Role } from "@/generated/prisma/client";

type LandingRoute = {
    href: string;
    permission: string;
    roles?: Role[];
};

export const ADMIN_DASHBOARD_ROLES: Role[] = ["SUPERADMIN", "ADMIN", "MODERATOR"];

const adminPreferredRoutes: LandingRoute[] = [
    { href: "/admin", permission: "dashboard.view", roles: ADMIN_DASHBOARD_ROLES },
    { href: "/admin/cv-editor", permission: "cv.own.view" },
    { href: "/admin/jobs", permission: "jobs.vacancies.view" },
    { href: "/admin/jobs/pipeline", permission: "jobs.applications.view" },
    { href: "/admin/finance", permission: "finance.view" },
    { href: "/admin/gestion-comercial", permission: "crm.dashboard" },
    { href: "/admin/gestion-comercial/pipeline", permission: "crm.pipeline.view" },
    { href: "/admin/cotizaciones", permission: "quotations.view" },
    { href: "/admin/connections", permission: "connections.view" },
    { href: "/admin/herramientas", permission: "tools.view", roles: ["SUPERADMIN", "ADMIN", "MODERATOR"] },
    { href: "/admin/analytics", permission: "analytics.view", roles: ["SUPERADMIN", "ADMIN", "MODERATOR"] },
    { href: "/admin/users", permission: "users.view", roles: ["SUPERADMIN", "ADMIN"] },
    { href: "/admin/superadmin", permission: "superadmin.view", roles: ["SUPERADMIN"] },
];

export function canOpenAdminDashboard(userRole: Role): boolean {
    return ADMIN_DASHBOARD_ROLES.includes(userRole);
}

export function resolveAdminLandingPath(userRole: Role, permissions: Iterable<string>): string {
    const effectivePermissions = new Set(permissions);

    const route = adminPreferredRoutes.find((candidate) => {
        const roleAllowed = !candidate.roles || candidate.roles.includes(userRole);
        return roleAllowed && effectivePermissions.has(candidate.permission);
    });

    return route?.href ?? "/unauthorized";
}
