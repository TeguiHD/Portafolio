"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface AdminLayoutContextType {
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    closeSidebar: () => void;
    openSidebar: () => void;
}

const AdminLayoutContext = createContext<AdminLayoutContextType | undefined>(undefined);

export function AdminLayoutProvider({ children }: { children: ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen((prev) => !prev);
    }, []);

    const closeSidebar = useCallback(() => {
        setIsSidebarOpen(false);
    }, []);

    const openSidebar = useCallback(() => {
        setIsSidebarOpen(true);
    }, []);

    return (
        <AdminLayoutContext.Provider
            value={{ isSidebarOpen, toggleSidebar, closeSidebar, openSidebar }}
        >
            {children}
        </AdminLayoutContext.Provider>
    );
}

export function useAdminLayout() {
    const context = useContext(AdminLayoutContext);
    if (context === undefined) {
        throw new Error("useAdminLayout must be used within an AdminLayoutProvider");
    }
    return context;
}
