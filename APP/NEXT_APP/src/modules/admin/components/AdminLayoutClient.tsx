"use client";

import { ReactNode, useEffect } from "react";
import { AdminLayoutProvider } from "@/modules/admin/context/AdminLayoutContext";
import { AdminSidebar } from "@/modules/admin/components/AdminSidebar";
import { AdminHeader } from "@/modules/admin/components/AdminHeader";
import type { Role } from '@/generated/prisma/client';
import { usePathname, useRouter } from "next/navigation";

const MFA_RETURN_TO_KEY = "admin-mfa-return-to";

interface AdminLayoutClientProps {
    children: ReactNode;
    user: {
        id: string;
        name: string | null;
        email: string;
        role: Role;
        mfaEnabled?: boolean;
    };
    permissions: string[];
}

export function AdminLayoutClient({ children, user, permissions }: AdminLayoutClientProps) {
    const pathname = usePathname();
    const router = useRouter();
    const requiresMfaSetup = user.mfaEnabled !== true && pathname !== "/admin/profile";

    useEffect(() => {
        if (requiresMfaSetup) {
            if (pathname && pathname.startsWith("/admin") && pathname !== "/admin/profile") {
                window.sessionStorage.setItem(MFA_RETURN_TO_KEY, pathname);
            }
            router.replace("/admin/profile");
        }
    }, [pathname, requiresMfaSetup, router]);

    if (requiresMfaSetup) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#050912] via-[#0c1224] to-[#050912] px-6 text-center">
                <div className="max-w-md rounded-3xl border border-accent-1/20 bg-white/[0.03] p-8 shadow-2xl">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-1/10 text-accent-1">
                        <span className="text-lg font-semibold">2FA</span>
                    </div>
                    <h1 className="text-xl font-semibold text-white">Redirigiendo a seguridad</h1>
                    <p className="mt-2 text-sm text-neutral-400">
                        El panel administrativo queda bloqueado hasta que completes la autenticacion de dos factores.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <AdminLayoutProvider>
            <div className="min-h-screen bg-gradient-to-br from-[#050912] via-[#0c1224] to-[#050912]">
                <AdminSidebar user={user} permissions={permissions} />
                <div className="lg:ml-64 transition-all duration-300">
                    <AdminHeader user={user} />
                    <main className="p-4 sm:p-6 lg:p-8">
                        {children}
                    </main>
                </div>
            </div>
        </AdminLayoutProvider>
    );
}

