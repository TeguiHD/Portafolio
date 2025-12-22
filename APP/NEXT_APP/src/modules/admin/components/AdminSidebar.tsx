"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Role } from "@prisma/client";
import { useAdminLayout } from "@/modules/admin/context/AdminLayoutContext";

interface AdminSidebarProps {
    user: {
        id: string;
        name: string | null;
        email: string;
        role: Role;
    };
    permissions: string[];
}

const menuItems = [
    {
        name: "Dashboard",
        href: "/admin",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
        ),
        roles: ["SUPERADMIN", "ADMIN", "MODERATOR", "USER"] as const,
        requiredPermission: "dashboard.view",
    },
    {
        name: "Analytics",
        href: "/admin/analytics",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
        roles: ["SUPERADMIN", "ADMIN", "MODERATOR"] as const,
        requiredPermission: "analytics.view",
    },
    {
        name: "Notificaciones",
        href: "/admin/notifications",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
        ),
        roles: ["SUPERADMIN", "ADMIN", "MODERATOR"] as const,
        requiredPermission: "notifications.view",
    },
    {
        name: "Cotizaciones",
        href: "/admin/quotations",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
        roles: ["SUPERADMIN", "ADMIN", "MODERATOR"] as const,
        requiredPermission: "quotations.view",
    },
    {
        name: "Herramientas",
        href: "/admin/tools",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
        roles: ["SUPERADMIN", "ADMIN", "MODERATOR"] as const,
        requiredPermission: "tools.view",
    },
    {
        name: "Editor CV",
        href: "/admin/cv-editor",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
        ),
        roles: ["SUPERADMIN", "ADMIN", "MODERATOR", "USER"] as const,
        requiredPermission: "cv.own.view",
    },
    {
        name: "Finanzas",
        href: "/admin/finance",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        roles: ["SUPERADMIN", "ADMIN"] as const,
        requiredPermission: "finance.view",
    },
    {
        name: "Usuarios",
        href: "/admin/users",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        ),
        roles: ["SUPERADMIN", "ADMIN"] as const,
        requiredPermission: "users.view",
    },
    {
        name: "Auditoría",
        href: "/admin/audit",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
        ),
        roles: ["SUPERADMIN"] as const,
        requiredPermission: "audit.view",
    },
];

export function AdminSidebar({ user, permissions }: AdminSidebarProps) {
    const pathname = usePathname();
    const { isSidebarOpen, closeSidebar } = useAdminLayout();

    // Security: Filter menu items by actual user permissions (not just roles)
    // This ensures the UI matches what the user can actually access
    const filteredItems = menuItems.filter((item) =>
        permissions.includes(item.requiredPermission)
    );

    const sidebarContent = (
        <>
            {/* Logo */}
            <div className="p-6 border-b border-accent-1/10">
                <Link href="/" className="flex items-center gap-3 group" onClick={closeSidebar}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-1/20 to-accent-2/20 border border-accent-1/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <span className="text-lg font-bold text-accent-1">NL</span>
                    </div>
                    <div>
                        <h2 className="font-semibold text-white">Admin Panel</h2>
                        <p className="text-xs text-neutral-500">Nicoholas Lopetegui</p>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {filteredItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== "/admin" && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href as any}
                            onClick={closeSidebar}
                            className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                ? "text-accent-1 bg-accent-1/10"
                                : "text-neutral-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 rounded-xl bg-accent-1/10 border border-accent-1/20"
                                    transition={{ type: "spring", duration: 0.5 }}
                                />
                            )}
                            <span className="relative z-10">{item.icon}</span>
                            <span className="relative z-10 font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* User info */}
            <div className="p-4 border-t border-accent-1/10">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-1 to-accent-2 flex items-center justify-center text-black font-semibold shrink-0">
                        {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                            {user.name || user.email}
                        </p>
                        <p className="text-xs text-accent-1">{user.role}</p>
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="fixed inset-y-0 left-0 z-50 w-64 hidden lg:flex flex-col bg-[#0a0e1a]/95 border-r border-accent-1/10 backdrop-blur-xl">
                {sidebarContent}
            </aside>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                            onClick={closeSidebar}
                        />

                        {/* Drawer */}
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-[#0a0e1a] border-r border-accent-1/10 lg:hidden shadow-2xl"
                        >
                            {/* Close button */}
                            <button
                                onClick={closeSidebar}
                                className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                                aria-label="Cerrar menú"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            {sidebarContent}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
