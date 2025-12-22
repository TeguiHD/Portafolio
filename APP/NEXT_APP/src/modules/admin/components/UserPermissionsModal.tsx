"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Permission {
    code: string;
    name: string;
    category: string;
    hasPermission: boolean;
    source: "role" | "granted" | "revoked";
}

interface UserPermissionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userName: string | null;
    userRole: string;
}

const CATEGORY_INFO: Record<string, { name: string; icon: string }> = {
    dashboard: { name: "Dashboard", icon: "📊" },
    analytics: { name: "Analytics", icon: "📈" },
    tools: { name: "Herramientas", icon: "🛠️" },
    quotations: { name: "Cotizaciones", icon: "📄" },
    users: { name: "Usuarios", icon: "👥" },
    cv: { name: "Editor CV", icon: "📝" },
    notifications: { name: "Notificaciones", icon: "🔔" },
};

export function UserPermissionsModal({
    isOpen,
    onClose,
    userId,
    userName,
    userRole,
}: UserPermissionsModalProps) {
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && userId) {
            loadPermissions();
        }
    }, [isOpen, userId]);

    const loadPermissions = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/users/${userId}/permissions`);
            if (!res.ok) throw new Error("Failed to load permissions");
            const data = await res.json();
            setPermissions(data.permissions || []);
        } catch (err) {
            setError("Error cargando permisos");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const updatePermission = async (
        permissionCode: string,
        action: "grant" | "revoke" | "reset"
    ) => {
        setUpdating(permissionCode);
        try {
            const res = await fetch(`/api/admin/users/${userId}/permissions`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ permissionCode, action }),
            });
            if (!res.ok) throw new Error("Failed to update permission");
            const data = await res.json();
            setPermissions(data.permissions || []);
        } catch (err) {
            console.error(err);
        } finally {
            setUpdating(null);
        }
    };

    // Group permissions by category
    const groupedPermissions = permissions.reduce(
        (acc, perm) => {
            if (!acc[perm.category]) acc[perm.category] = [];
            acc[perm.category].push(perm);
            return acc;
        },
        {} as Record<string, Permission[]>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal Container - centered with flexbox */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-2xl max-h-[85vh] bg-[#0f1420] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
                                <div>
                                    <h2 className="text-xl font-bold text-white">
                                        Permisos de {userName || "Usuario"}
                                    </h2>
                                    <p className="text-sm text-neutral-400 mt-1">
                                        Rol: <span className="text-accent-1">{userRole}</span>
                                        {" · "}Los cambios se aplican inmediatamente
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {loading ? (
                                    <div className="flex items-center justify-center h-40">
                                        <div className="w-8 h-8 border-2 border-accent-1/30 border-t-accent-1 rounded-full animate-spin" />
                                    </div>
                                ) : error ? (
                                    <div className="text-center py-12 text-red-400">{error}</div>
                                ) : (
                                    <div className="space-y-6">
                                        {Object.entries(groupedPermissions).map(([category, perms]) => (
                                            <div key={category}>
                                                <h3 className="text-sm font-semibold text-accent-1 mb-3 flex items-center gap-2">
                                                    <span>{CATEGORY_INFO[category]?.icon || "📋"}</span>
                                                    {CATEGORY_INFO[category]?.name || category}
                                                </h3>
                                                <div className="space-y-2">
                                                    {perms.map((perm) => (
                                                        <div
                                                            key={perm.code}
                                                            className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                {/* Status indicator */}
                                                                <div
                                                                    className={`w-3 h-3 rounded-full ${perm.hasPermission
                                                                        ? perm.source === "granted"
                                                                            ? "bg-green-400"
                                                                            : "bg-accent-1"
                                                                        : "bg-red-400"
                                                                        }`}
                                                                />
                                                                <div>
                                                                    <p className="text-sm font-medium text-white">
                                                                        {perm.name}
                                                                    </p>
                                                                    <p className="text-xs text-neutral-500">
                                                                        {perm.source === "role"
                                                                            ? "Por rol"
                                                                            : perm.source === "granted"
                                                                                ? "✓ Otorgado manualmente"
                                                                                : "✗ Revocado manualmente"}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="flex items-center gap-1">
                                                                {updating === perm.code ? (
                                                                    <div className="w-6 h-6 border-2 border-accent-1/30 border-t-accent-1 rounded-full animate-spin" />
                                                                ) : (
                                                                    <>
                                                                        {!perm.hasPermission && (
                                                                            <button
                                                                                onClick={() => updatePermission(perm.code, "grant")}
                                                                                className="px-2 py-1 text-xs rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                                                                                title="Otorgar permiso"
                                                                            >
                                                                                Otorgar
                                                                            </button>
                                                                        )}
                                                                        {perm.hasPermission && perm.source !== "revoked" && (
                                                                            <button
                                                                                onClick={() => updatePermission(perm.code, "revoke")}
                                                                                className="px-2 py-1 text-xs rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                                                                title="Revocar permiso"
                                                                            >
                                                                                Revocar
                                                                            </button>
                                                                        )}
                                                                        {perm.source !== "role" && (
                                                                            <button
                                                                                onClick={() => updatePermission(perm.code, "reset")}
                                                                                className="px-2 py-1 text-xs rounded-lg bg-white/10 text-neutral-400 hover:bg-white/20 transition-colors"
                                                                                title="Restaurar a valor por rol"
                                                                            >
                                                                                Reset
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-white/10 shrink-0">
                                <div className="flex items-center justify-between text-xs text-neutral-500">
                                    <div className="flex items-center gap-4">
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-accent-1" /> Por rol
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-green-400" /> Otorgado
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-red-400" /> Revocado
                                        </span>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 rounded-xl bg-accent-1 text-black font-medium hover:bg-accent-1/90 transition-colors"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
