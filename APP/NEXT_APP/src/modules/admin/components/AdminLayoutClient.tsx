"use client";

import { ReactNode } from "react";
import { AdminLayoutProvider } from "@/modules/admin/context/AdminLayoutContext";
import { AdminSidebar } from "@/modules/admin/components/AdminSidebar";
import { AdminHeader } from "@/modules/admin/components/AdminHeader";
import type { Role } from "@prisma/client";

interface AdminLayoutClientProps {
    children: ReactNode;
    user: {
        id: string;
        name: string | null;
        email: string;
        role: Role;
    };
    permissions: string[];
}

export function AdminLayoutClient({ children, user, permissions }: AdminLayoutClientProps) {
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

