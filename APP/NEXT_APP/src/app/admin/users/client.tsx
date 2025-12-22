"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, X, ShieldCheck, Ban, CheckCircle, Key, AlertTriangle, Search, ChevronLeft, ChevronRight, Filter, Shield, Eye, EyeOff } from "lucide-react";
import { UserPermissionsModal } from "@/modules/admin/components/UserPermissionsModal";
import { Select } from "@/components/ui/Select";
import { UsersPageSkeleton } from "@/components/ui/Skeleton";

type User = {
    id: string;
    name: string | null;
    email: string;
    role: "SUPERADMIN" | "ADMIN" | "MODERATOR" | "USER";
    isActive: boolean;
    avatar: string | null;
    createdAt: string;
    _count: { quotations: number; sessions: number };
};

type RoleFilter = "ALL" | "SUPERADMIN" | "ADMIN" | "MODERATOR" | "USER";
type StatusFilter = "ALL" | "ACTIVE" | "SUSPENDED";

const USERS_PER_PAGE = 10;

const roleColors = {
    SUPERADMIN: "from-purple-500 to-pink-500",
    ADMIN: "from-blue-500 to-cyan-500",
    MODERATOR: "from-green-500 to-emerald-500",
    USER: "from-gray-500 to-gray-600",
};

const roleLabels = {
    SUPERADMIN: "Super Admin",
    ADMIN: "Administrador",
    MODERATOR: "Moderador",
    USER: "Usuario",
};

export default function UsersPageClient() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Search and Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
    const [currentPage, setCurrentPage] = useState(1);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        action: () => Promise<void>;
        type: "danger" | "warning" | "info";
    }>({ isOpen: false, title: "", message: "", action: async () => { }, type: "info" });

    // Password Change Modal State
    const [passwordModal, setPasswordModal] = useState<{
        isOpen: boolean;
        userId: string | null;
        userName: string;
    }>({ isOpen: false, userId: null, userName: "" });
    const [newPassword, setNewPassword] = useState("");
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    // New User Form State
    const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "USER" });
    const [showNewUserPassword, setShowNewUserPassword] = useState(false);

    // Permissions Modal State
    const [permissionsModal, setPermissionsModal] = useState<{
        isOpen: boolean;
        userId: string;
        userName: string | null;
        userRole: string;
    }>({ isOpen: false, userId: "", userName: null, userRole: "" });

    useEffect(() => {
        fetchUsers();
    }, []);

    // Filtered and paginated users
    const filteredUsers = useMemo(() => {
        let result = users;

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(user =>
                user.name?.toLowerCase().includes(query) ||
                user.email.toLowerCase().includes(query)
            );
        }

        // Filter by role
        if (roleFilter !== "ALL") {
            result = result.filter(user => user.role === roleFilter);
        }

        // Filter by status
        if (statusFilter !== "ALL") {
            result = result.filter(user =>
                statusFilter === "ACTIVE" ? user.isActive : !user.isActive
            );
        }

        return result;
    }, [users, searchQuery, roleFilter, statusFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * USERS_PER_PAGE;
        return filteredUsers.slice(startIndex, startIndex + USERS_PER_PAGE);
    }, [filteredUsers, currentPage]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, roleFilter, statusFilter]);

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/admin/users");
            if (!res.ok) throw new Error("Error loading users");
            const data = await res.json();
            setUsers(data.users);
        } catch {
            setError("No se pudieron cargar los usuarios");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRole = (userId: string, role: string, userName: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Cambiar Rol",
            message: `¿Estás seguro de cambiar el rol de ${userName} a ${roleLabels[role as keyof typeof roleLabels]}?`,
            type: "warning",
            action: async () => {
                try {
                    const res = await fetch("/api/admin/users", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId, role }),
                    });
                    if (!res.ok) throw new Error();
                    await fetchUsers();
                    setEditingUser(null);
                } catch {
                    setError("Error al actualizar rol");
                }
            }
        });
    };

    const handleToggleStatus = (userId: string, currentStatus: boolean, userName: string) => {
        const action = currentStatus ? "suspender" : "activar";
        setConfirmModal({
            isOpen: true,
            title: `${currentStatus ? "Suspender" : "Activar"} Usuario`,
            message: `¿Estás seguro de que deseas ${action} a ${userName}? ${currentStatus ? "El usuario no podrá acceder al sistema." : "El usuario recuperará el acceso."}`,
            type: currentStatus ? "danger" : "info",
            action: async () => {
                try {
                    const res = await fetch("/api/admin/users", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId, isActive: !currentStatus }),
                    });
                    if (!res.ok) throw new Error();
                    await fetchUsers();
                } catch {
                    setError("Error al cambiar estado");
                }
            }
        });
    };

    const handleDeleteUser = (userId: string, userName: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Eliminar Usuario",
            message: `¿Estás seguro de eliminar a ${userName}? Esta acción es irreversible y se perderán todos sus datos.`,
            type: "danger",
            action: async () => {
                try {
                    const res = await fetch(`/api/admin/users?id=${userId}`, { method: "DELETE" });
                    if (!res.ok) throw new Error();
                    await fetchUsers();
                } catch {
                    setError("Error al eliminar usuario");
                }
            }
        });
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordModal.userId || !newPassword) return;

        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: passwordModal.userId, password: newPassword }),
            });
            if (!res.ok) throw new Error();
            setPasswordModal({ isOpen: false, userId: null, userName: "" });
            setNewPassword("");
            alert("Contraseña actualizada correctamente");
        } catch {
            setError("Error al actualizar contraseña");
        }
    };

    const createUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newUser),
            });
            if (!res.ok) throw new Error();
            setShowCreateModal(false);
            setNewUser({ name: "", email: "", password: "", role: "USER" });
            await fetchUsers();
        } catch {
            setError("Error al crear usuario");
        }
    };

    if (loading) {
        return <UsersPageSkeleton />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Usuarios</h1>
                    <p className="text-sm text-neutral-400">Gestión de usuarios y roles</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-sm text-neutral-400">{users.length} usuarios</span>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-1 text-white hover:bg-accent-1/90 transition-colors"
                    >
                        <UserPlus size={18} />
                        <span className="hidden sm:inline">Nuevo Usuario</span>
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-sm"
            >
                <div className="flex flex-col gap-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-neutral-500 focus:border-accent-1/50 focus:bg-white/[0.08] outline-none transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Filters Row */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Role Filter */}
                        <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                            <div className="p-2 rounded-lg bg-white/5">
                                <Filter size={16} className="text-neutral-400" />
                            </div>
                            <Select
                                value={roleFilter}
                                onChange={(value) => setRoleFilter(value as RoleFilter)}
                                options={[
                                    { value: "ALL", label: "Todos los roles" },
                                    { value: "SUPERADMIN", label: "Super Admin" },
                                    { value: "ADMIN", label: "Administrador" },
                                    { value: "MODERATOR", label: "Moderador" },
                                    { value: "USER", label: "Usuario" },
                                ]}
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex-1 sm:flex-initial">
                            <Select
                                value={statusFilter}
                                onChange={(value) => setStatusFilter(value as StatusFilter)}
                                options={[
                                    { value: "ALL", label: "Todos los estados" },
                                    { value: "ACTIVE", label: "Activos" },
                                    { value: "SUSPENDED", label: "Suspendidos" },
                                ]}
                            />
                        </div>

                        {/* Clear Filters Button */}
                        <AnimatePresence>
                            {(searchQuery || roleFilter !== "ALL" || statusFilter !== "ALL") && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    onClick={() => {
                                        setSearchQuery("");
                                        setRoleFilter("ALL");
                                        setStatusFilter("ALL");
                                    }}
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
                                >
                                    <X size={16} />
                                    <span>Limpiar</span>
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>

            {/* Results Summary */}
            <div className="flex items-center justify-between text-sm px-1">
                <span className="text-neutral-400">
                    <span className="text-white font-medium">{paginatedUsers.length}</span> de <span className="text-white font-medium">{filteredUsers.length}</span> usuarios
                    {filteredUsers.length !== users.length && (
                        <span className="text-neutral-500"> (filtrado de {users.length} total)</span>
                    )}
                </span>
                {filteredUsers.length === 0 && searchQuery && (
                    <span className="text-amber-400/80 text-xs">Sin resultados para &quot;{searchQuery}&quot;</span>
                )}
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Users List */}
            <div className="grid gap-4">
                {paginatedUsers.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-white/10 bg-white/5">
                        <Search size={48} className="mx-auto mb-4 text-neutral-600" />
                        <p className="text-neutral-400 mb-2">No se encontraron usuarios</p>
                        <p className="text-neutral-500 text-sm">Prueba ajustando los filtros de búsqueda</p>
                    </div>
                ) : (
                    paginatedUsers.map((user, idx) => {
                        const isSuperAdmin = user.role === "SUPERADMIN";

                        return (
                            <motion.div
                                key={user.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                className={`p-5 rounded-2xl border transition-all ${user.isActive
                                    ? "border-white/10 bg-white/5 hover:bg-white/[0.08]"
                                    : "border-red-500/20 bg-red-500/5"
                                    }`}
                            >
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-1/20 to-accent-2/20 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                        {user.avatar ? (
                                            <img src={user.avatar} alt={user.name || ""} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-lg font-bold text-accent-1">{(user.name || user.email)[0].toUpperCase()}</span>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 w-full">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-white truncate">{user.name || "Sin nombre"}</h3>
                                            {!user.isActive && (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/20">
                                                    SUSPENDIDO
                                                </span>
                                            )}
                                            {isSuperAdmin && (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                                                    <ShieldCheck size={10} /> PROTEGIDO
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-neutral-400 truncate">{user.email}</p>
                                    </div>

                                    {/* Controls Container */}
                                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                                        {/* Role Selector */}
                                        <div className="relative">
                                            {editingUser === user.id && !isSuperAdmin ? (
                                                <Select
                                                    value={user.role}
                                                    onChange={(value) => {
                                                        handleUpdateRole(user.id, value, user.name || user.email);
                                                    }}
                                                    options={[
                                                        { value: "USER", label: "Usuario" },
                                                        { value: "MODERATOR", label: "Moderador" },
                                                        { value: "ADMIN", label: "Administrador" },
                                                        { value: "SUPERADMIN", label: "Super Admin" },
                                                    ]}
                                                    className="min-w-[140px]"
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => !isSuperAdmin && setEditingUser(user.id)}
                                                    disabled={isSuperAdmin}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r ${roleColors[user.role]} ${!isSuperAdmin && "hover:opacity-80"} transition-opacity whitespace-nowrap ${isSuperAdmin ? "cursor-not-allowed opacity-80" : ""}`}
                                                >
                                                    {roleLabels[user.role]}
                                                </button>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 ml-auto sm:ml-0">
                                            {!isSuperAdmin && (
                                                <>
                                                    <button
                                                        onClick={() => setPermissionsModal({
                                                            isOpen: true,
                                                            userId: user.id,
                                                            userName: user.name,
                                                            userRole: user.role,
                                                        })}
                                                        className="p-2 rounded-lg text-neutral-400 hover:text-accent-1 hover:bg-accent-1/10 transition-all"
                                                        title="Gestionar permisos"
                                                    >
                                                        <Shield size={18} />
                                                    </button>

                                                    <button
                                                        onClick={() => setPasswordModal({ isOpen: true, userId: user.id, userName: user.name || user.email })}
                                                        className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-all"
                                                        title="Cambiar contraseña"
                                                    >
                                                        <Key size={18} />
                                                    </button>

                                                    <button
                                                        onClick={() => handleToggleStatus(user.id, user.isActive, user.name || user.email)}
                                                        className={`p-2 rounded-lg transition-all ${user.isActive
                                                            ? "text-neutral-400 hover:text-red-400 hover:bg-red-500/10"
                                                            : "text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                                            }`}
                                                        title={user.isActive ? "Suspender usuario" : "Activar usuario"}
                                                    >
                                                        {user.isActive ? <Ban size={18} /> : <CheckCircle size={18} />}
                                                    </button>

                                                    <button
                                                        onClick={() => handleDeleteUser(user.id, user.name || user.email)}
                                                        className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                        title="Eliminar usuario"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className="flex items-center gap-1">
                        {/* First page */}
                        {currentPage > 3 && (
                            <>
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    className="w-10 h-10 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    1
                                </button>
                                {currentPage > 4 && <span className="text-neutral-500 px-1">...</span>}
                            </>
                        )}

                        {/* Page numbers around current */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => Math.abs(page - currentPage) <= 2)
                            .map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${page === currentPage
                                        ? "bg-accent-1 text-white"
                                        : "text-neutral-400 hover:text-white hover:bg-white/10"
                                        }`}
                                >
                                    {page}
                                </button>
                            ))
                        }

                        {/* Last page */}
                        {currentPage < totalPages - 2 && (
                            <>
                                {currentPage < totalPages - 3 && <span className="text-neutral-500 px-1">...</span>}
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    className="w-10 h-10 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    {totalPages}
                                </button>
                            </>
                        )}
                    </div>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            {/* Confirmation Modal */}
            <AnimatePresence>
                {confirmModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-[#0F1724] border border-white/10 rounded-2xl p-6 shadow-xl"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`p-3 rounded-full ${confirmModal.type === "danger" ? "bg-red-500/20 text-red-400" :
                                    confirmModal.type === "warning" ? "bg-yellow-500/20 text-yellow-400" :
                                        "bg-blue-500/20 text-blue-400"
                                    }`}>
                                    <AlertTriangle size={24} />
                                </div>
                                <h2 className="text-xl font-bold text-white">{confirmModal.title}</h2>
                            </div>

                            <p className="text-neutral-300 mb-6">{confirmModal.message}</p>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                    className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={async () => {
                                        await confirmModal.action();
                                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                    }}
                                    className={`px-4 py-2 rounded-xl text-white font-semibold transition-colors ${confirmModal.type === "danger" ? "bg-red-500 hover:bg-red-600" :
                                        confirmModal.type === "warning" ? "bg-yellow-600 hover:bg-yellow-700" :
                                            "bg-accent-1 hover:bg-accent-1/90"
                                        }`}
                                >
                                    Confirmar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Password Change Modal */}
            <AnimatePresence>
                {passwordModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-[#0F1724] border border-white/10 rounded-2xl p-6 shadow-xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">Cambiar Contraseña</h2>
                                <button onClick={() => setPasswordModal({ isOpen: false, userId: null, userName: "" })} className="text-neutral-400 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <p className="text-sm text-neutral-400 mb-4">
                                Ingresa la nueva contraseña para <strong>{passwordModal.userName}</strong>.
                            </p>

                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div className="relative">
                                    <input
                                        type={showPasswordModal ? "text" : "password"}
                                        required
                                        placeholder="Nueva contraseña"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-2 pr-12 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent-1 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordModal(!showPasswordModal)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                                    >
                                        {showPasswordModal ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-3 rounded-xl bg-accent-1 text-white font-semibold hover:bg-accent-1/90 transition-colors mt-4"
                                >
                                    Actualizar Contraseña
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create User Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-[#0F1724] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl my-auto"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg sm:text-xl font-bold text-white">Nuevo Usuario</h2>
                                <button onClick={() => setShowCreateModal(false)} className="text-neutral-400 hover:text-white p-1">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={createUser} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        required
                                        value={newUser.name}
                                        onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent-1 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-1">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={newUser.email}
                                        onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent-1 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-1">Contraseña</label>
                                    <div className="relative">
                                        <input
                                            type={showNewUserPassword ? "text" : "password"}
                                            required
                                            value={newUser.password}
                                            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                            className="w-full px-4 py-2 pr-12 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent-1 outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                                        >
                                            {showNewUserPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-1">Rol</label>
                                    <Select
                                        value={newUser.role}
                                        onChange={(value) => setNewUser({ ...newUser, role: value })}
                                        options={[
                                            { value: "USER", label: "Usuario" },
                                            { value: "MODERATOR", label: "Moderador" },
                                            { value: "ADMIN", label: "Administrador" },
                                            { value: "SUPERADMIN", label: "Super Admin" },
                                        ]}
                                        className="w-full"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-3 rounded-xl bg-accent-1 text-white font-semibold hover:bg-accent-1/90 transition-colors mt-4"
                                >
                                    Crear Usuario
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Permissions Modal */}
            <UserPermissionsModal
                isOpen={permissionsModal.isOpen}
                onClose={() => setPermissionsModal({ isOpen: false, userId: "", userName: null, userRole: "" })}
                userId={permissionsModal.userId}
                userName={permissionsModal.userName}
                userRole={permissionsModal.userRole}
            />
        </div>
    );
}