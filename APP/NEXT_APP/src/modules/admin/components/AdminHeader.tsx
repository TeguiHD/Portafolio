"use client";

import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import type { Role } from "@prisma/client";
import { useAdminLayout } from "@/modules/admin/context/AdminLayoutContext";
import { NotificationButton } from "@/modules/admin/components/NotificationPanel";

interface AdminHeaderProps {
    user: {
        id: string;
        name: string | null;
        email: string;
        role: Role;
    };
}

// Map routes to display names for breadcrumbs
const routeNames: Record<string, string> = {
    "/admin": "Dashboard",
    "/admin/analytics": "Analytics",
    "/admin/quotations": "Cotizaciones",
    "/admin/quotations/new": "Nueva Cotización",
    "/admin/cv-editor": "Editor CV",
    "/admin/users": "Usuarios",
    "/admin/tools": "Herramientas",
};

function getBreadcrumbs(pathname: string): { name: string; href: string }[] {
    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs: { name: string; href: string }[] = [];

    let currentPath = "";
    for (const segment of segments) {
        currentPath += `/${segment}`;
        const name = routeNames[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
        breadcrumbs.push({ name, href: currentPath });
    }

    return breadcrumbs;
}

export function AdminHeader({ user }: AdminHeaderProps) {
    const pathname = usePathname();
    const { toggleSidebar } = useAdminLayout();
    const breadcrumbs = getBreadcrumbs(pathname);
    const currentPage = breadcrumbs[breadcrumbs.length - 1]?.name || "Dashboard";

    // Scroll hide/show logic for mobile
    const [isVisible, setIsVisible] = useState(true);
    const [isLargeScreen, setIsLargeScreen] = useState(false);

    useEffect(() => {
        // Check if we're on a large screen (lg breakpoint = 1024px)
        const checkScreenSize = () => {
            setIsLargeScreen(window.innerWidth >= 1024);
        };

        checkScreenSize();
        window.addEventListener("resize", checkScreenSize);

        return () => window.removeEventListener("resize", checkScreenSize);
    }, []);

    useEffect(() => {
        // Only apply scroll behavior on mobile/tablet
        if (isLargeScreen) {
            setIsVisible(true);
            return;
        }

        let lastY = window.scrollY;
        let ticking = false;

        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const y = window.scrollY;

                    // Show on scroll up, hide on scroll down (after 50px threshold)
                    if (y > 50) {
                        const scrollingDown = y > lastY;
                        const scrollDelta = Math.abs(y - lastY);

                        // Only trigger if scroll delta is significant (> 5px)
                        if (scrollDelta > 5) {
                            setIsVisible(!scrollingDown);
                        }
                    } else {
                        // Always show when near top
                        setIsVisible(true);
                    }

                    lastY = y;
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [isLargeScreen]);

    return (
        <header
            className={`sticky z-40 bg-[#0a0e1a]/80 backdrop-blur-xl border-b border-accent-1/10 transition-all duration-300 ease-in-out ${isVisible ? 'top-0' : '-top-16 sm:-top-20'
                }`}
        >
            <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 lg:px-8">
                {/* Left side: Menu button + Breadcrumbs */}
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    {/* Mobile menu button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleSidebar}
                        className="lg:hidden p-2 -ml-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                        aria-label="Abrir menú"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </motion.button>

                    {/* Breadcrumbs - Hidden on mobile, show current page only */}
                    <div className="flex items-center gap-2 min-w-0">
                        {/* Mobile: Just show current page */}
                        <h1 className="text-base sm:text-lg font-semibold text-white truncate sm:hidden">
                            {currentPage}
                        </h1>

                        {/* Desktop: Full breadcrumbs */}
                        <nav className="hidden sm:flex items-center gap-2 text-sm">
                            {breadcrumbs.map((crumb, index) => (
                                <div key={crumb.href} className="flex items-center gap-2">
                                    {index > 0 && (
                                        <svg className="w-4 h-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    )}
                                    <span
                                        className={`${index === breadcrumbs.length - 1
                                            ? "text-white font-semibold"
                                            : "text-neutral-400"
                                            }`}
                                    >
                                        {crumb.name}
                                    </span>
                                </div>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2 sm:gap-4">
                    {/* Notifications */}
                    <NotificationButton />

                    {/* Visit site - Hidden on very small screens */}
                    <a
                        href="/"
                        target="_blank"
                        className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span className="hidden md:inline">Ver sitio</span>
                    </a>

                    {/* User info + Logout */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* User name - Hidden on mobile */}
                        <div className="hidden md:block text-right">
                            <p className="text-sm font-medium text-white">{user.name || "Admin"}</p>
                            <p className="text-xs text-neutral-500">{user.role}</p>
                        </div>

                        {/* Logout button */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => signOut({ callbackUrl: "/" })}
                            className="p-2 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Cerrar sesión"
                            aria-label="Cerrar sesión"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </motion.button>
                    </div>
                </div>
            </div>
        </header>
    );
}

