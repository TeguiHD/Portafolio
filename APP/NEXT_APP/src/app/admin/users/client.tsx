"use client";

import { useState, useEffect, useMemo, useId } from "react";
import { toast } from "sonner";
import { UserPlus, X, ShieldCheck, Ban, CheckCircle, Key, Search, ChevronLeft, ChevronRight, Shield, Eye, EyeOff, UserCog, ArrowRightLeft } from "lucide-react";
import { UserPermissionsModal } from "@/modules/admin/components/UserPermissionsModal";
import { confirmar } from "@/modules/admin/confirmar/confirmar";
import { UserLifecycleModal } from "./user-lifecycle-modal";
import { UserTransferModal } from "./user-transfer-modal";
import { Dialogo, cls } from "./dialogo";
import { useRouter } from "next/navigation";

type User = {
    id: string;
    name: string | null;
    email: string;
    role: "SUPERADMIN" | "ADMIN" | "MODERATOR" | "USER";
    isActive: boolean;
    avatar: string | null;
    createdAt: string;
    failedLoginAttempts: number;
    lockedUntil: string | null;
    deletionStatus?: string;
    deletionScheduledAt?: string | null;
    _count: { quotations: number; sessions: number };
};

type RoleFilter = "ALL" | "SUPERADMIN" | "ADMIN" | "MODERATOR" | "USER";
type StatusFilter = "ALL" | "ACTIVE" | "SUSPENDED" | "DELETED";

const USERS_PER_PAGE = 10;

const roleLabels = {
    SUPERADMIN: "Superadmin",
    ADMIN: "Administrador",
    MODERATOR: "Moderador",
    USER: "Usuario",
};

const ROLES: { value: User["role"]; label: string }[] = [
    { value: "USER", label: "Usuario" },
    { value: "MODERATOR", label: "Moderador" },
    { value: "ADMIN", label: "Administrador" },
    { value: "SUPERADMIN", label: "Superadmin" },
];

/** La misma jerarquía que aplica la API: fuera del superadmin, solo se asignan y gestionan rangos inferiores al propio. */
const RANGO: Record<User["role"], number> = { USER: 0, MODERATOR: 1, ADMIN: 2, SUPERADMIN: 3 };
const manda = (actor: User["role"], rol: User["role"]) => actor === "SUPERADMIN" || RANGO[rol] < RANGO[actor];

export interface PermisosUsuarios {
    crear: boolean;
    rol: boolean;
    clave: boolean;
    suspender: boolean;
    borrar: boolean;
    permisos: boolean;
}

/** El mensaje que manda la API (ya en español), o el de respaldo si no trae uno. */
async function errorDe(res: Response, respaldo: string): Promise<string> {
    try {
        const data = await res.json();
        return typeof data?.error === "string" ? data.error : respaldo;
    } catch {
        return respaldo;
    }
}

/** Mientras carga: la forma de la página, con los colores del tema. */
function Esqueleto() {
    const barra = "rounded-md bg-[var(--fondo-2)] animate-pulse motion-reduce:animate-none";
    return (
        <div className="space-y-6" aria-busy="true" aria-label="Cargando usuarios">
            <div className="space-y-2">
                <div className={`${barra} h-8 w-40`} />
                <div className={`${barra} h-4 w-64`} />
            </div>
            <div className={`${barra} h-10 w-full`} />
            <ul className="border-t border-[var(--linea)]">
                {Array.from({ length: 5 }, (_, i) => (
                    <li key={i} className="flex items-center gap-3 border-b border-[var(--linea)] px-1 py-4">
                        <div className={`${barra} size-10 rounded-full`} />
                        <div className="flex-1 space-y-2">
                            <div className={`${barra} h-4 w-48`} />
                            <div className={`${barra} h-3 w-64 max-w-full`} />
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function UsersPageClient({ currentUserRole, currentUserId, permisos }: { currentUserRole: User["role"]; currentUserId: string; permisos: PermisosUsuarios }) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    // Lo que se hizo bien se dice también en la página (además del aviso), para lectores de pantalla.
    const [hecho, setHecho] = useState("");
    // Mientras se crea un usuario o se cambia una clave: un doble toque no manda dos veces.
    const [enviando, setEnviando] = useState(false);
    const rolesAsignables = ROLES.filter((r) => manda(currentUserRole, r.value));
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const id = useId();

    // Search and Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
    const [currentPage, setCurrentPage] = useState(1);

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

    // Lifecycle Modal State
    const [lifecycleModal, setLifecycleModal] = useState<{
        isOpen: boolean;
        user: User | null;
    }>({ isOpen: false, user: null });

    // Transfer Modal State
    const router = useRouter();
    const [transferModal, setTransferModal] = useState<{
        isOpen: boolean;
        sourceUser: User | null;
    }>({ isOpen: false, sourceUser: null });

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
            result = result.filter(user => {
                const isDeleted = user.deletionStatus === "DELETED" || user.deletionStatus === "DELETION_SCHEDULED";

                if (statusFilter === "DELETED") return isDeleted;
                if (statusFilter === "SUSPENDED") return !user.isActive && !isDeleted;
                if (statusFilter === "ACTIVE") return user.isActive && !isDeleted;
                return true;
            });
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

    const handleUpdateRole = async (userId: string, role: string, userName: string) => {
        setError(""); setHecho("");
        if (!(await confirmar({
            titulo: `¿Cambiar el rol de ${userName}?`,
            detalle: `Pasará a ser ${roleLabels[role as keyof typeof roleLabels]}.`,
            accion: "Cambiar rol",
        }))) return;
        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, role }),
            });
            if (!res.ok) { setError(await errorDe(res, "Error al actualizar rol")); return; }
            await fetchUsers();
            setEditingUser(null);
            toast.success(`${userName} ahora es ${roleLabels[role as keyof typeof roleLabels]}`);
        } catch {
            setError("Error al actualizar rol");
        }
    };

    const handleToggleStatus = async (userId: string, currentStatus: boolean, userName: string) => {
        setError(""); setHecho("");
        if (!(await confirmar({
            titulo: currentStatus ? `¿Suspender a ${userName}?` : `¿Activar a ${userName}?`,
            detalle: currentStatus ? "No podrá entrar al sistema hasta que lo actives." : "Recuperará el acceso.",
            accion: currentStatus ? "Suspender" : "Activar",
            peligro: currentStatus,
        }))) return;
        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, isActive: !currentStatus }),
            });
            if (!res.ok) { setError(await errorDe(res, "Error al cambiar estado")); return; }
            await fetchUsers();
            toast.success(currentStatus ? `${userName} quedó suspendido` : `${userName} puede entrar de nuevo`);
        } catch {
            setError("Error al cambiar estado");
        }
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        setError(""); setHecho("");
        if (!(await confirmar({
            titulo: `¿Eliminar a ${userName}?`,
            detalle: "No se puede deshacer: se pierden todos sus datos.",
            accion: "Eliminar",
            peligro: true,
        }))) return;
        try {
            const res = await fetch(`/api/admin/users?id=${encodeURIComponent(userId)}`, { method: "DELETE" });
            if (!res.ok) { setError(await errorDe(res, "Error al eliminar usuario")); return; }
            await fetchUsers();
            toast.success(`${userName} fue eliminado`);
        } catch {
            setError("Error al eliminar usuario");
        }
    };

    const handleUnlockLoginBlock = async (userId: string, userName: string) => {
        setError(""); setHecho("");
        if (!(await confirmar({
            titulo: `¿Quitar el bloqueo de ${userName}?`,
            detalle: "Se borran el contador de intentos fallidos y el tiempo de espera.",
            accion: "Quitar bloqueo",
        }))) return;
        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, unlockLoginBlock: true }),
            });
            if (!res.ok) { setError(await errorDe(res, "Error al desbloquear usuario")); return; }
            await fetchUsers();
            toast.success("Bloqueo de login removido");
            setHecho(`Se quitó el bloqueo de ${userName}.`);
        } catch {
            setError("Error al desbloquear usuario");
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordModal.userId || !newPassword || enviando) return;
        setError(""); setHecho("");
        if (newPassword.length < 12) { setError("La clave debe tener al menos 12 caracteres"); return; }

        setEnviando(true);
        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: passwordModal.userId, password: newPassword }),
            });
            if (!res.ok) { setError(await errorDe(res, "Error al actualizar contraseña")); return; }
            setHecho(`Clave temporal de ${passwordModal.userName} guardada: al entrar tendrá que cambiarla.`);
            setPasswordModal({ isOpen: false, userId: null, userName: "" });
            setNewPassword("");
            toast.success("Clave temporal guardada");
        } catch {
            setError("Error al actualizar contraseña");
        } finally {
            setEnviando(false);
        }
    };

    const createUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (enviando) return;
        setError(""); setHecho("");
        setEnviando(true);
        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newUser),
            });
            if (!res.ok) { setError(await errorDe(res, "Error al crear usuario")); return; }
            setShowCreateModal(false);
            setHecho(`${newUser.name || newUser.email} fue creado. Al entrar por primera vez tendrá que cambiar la clave y activar la verificación en dos pasos.`);
            toast.success("Usuario creado");
            setNewUser({ name: "", email: "", password: "", role: "USER" });
            await fetchUsers();
        } catch {
            setError("Error al crear usuario");
        } finally {
            setEnviando(false);
        }
    };

    if (loading) {
        return <Esqueleto />;
    }

    const hayFiltros = Boolean(searchQuery || roleFilter !== "ALL" || statusFilter !== "ALL");
    /** El error de la página también se ve dentro de la ventana abierta (el fondo queda tapado). */
    const errorEnVentana = error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null;

    return (
        <div className="space-y-6">
            {/* Encabezado */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--txt)] sm:text-[28px]">Usuarios</h1>
                    <p className="mt-1 text-[15px] text-[var(--mut)]">
                        {`Cuentas, roles y permisos: ${users.length} ${users.length === 1 ? "usuario" : "usuarios"}`}
                    </p>
                </div>
                {permisos.crear && (
                    <button
                        type="button"
                        onClick={() => { setError(""); setHecho(""); setShowCreateModal(true); }}
                        aria-label="Nuevo usuario"
                        className={cls.principal}
                    >
                        <UserPlus size={18} aria-hidden="true" />
                        <span className="hidden sm:inline">Nuevo usuario</span>
                    </button>
                )}
            </div>

            {/* Búsqueda y filtros */}
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-end">
                <div>
                    <label htmlFor={`${id}-q`} className="sr-only">Buscar usuarios</label>
                    <div className="relative">
                        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mut)]" />
                        <input
                            id={`${id}-q`}
                            type="search"
                            placeholder="Buscar por nombre o correo"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`${cls.campo} pl-9`}
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor={`${id}-rol`} className="mb-1.5 block text-sm text-[var(--mut)]">Rol</label>
                    <select id={`${id}-rol`} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as RoleFilter)} className={cls.campo}>
                        <option value="ALL">Todos los roles</option>
                        <option value="SUPERADMIN">Superadmin</option>
                        <option value="ADMIN">Administrador</option>
                        <option value="MODERATOR">Moderador</option>
                        <option value="USER">Usuario</option>
                    </select>
                </div>
                <div>
                    <label htmlFor={`${id}-estado`} className="mb-1.5 block text-sm text-[var(--mut)]">Estado</label>
                    <select id={`${id}-estado`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className={cls.campo}>
                        <option value="ALL">Todos los estados</option>
                        <option value="ACTIVE">Activos</option>
                        <option value="SUSPENDED">Suspendidos</option>
                        <option value="DELETED">Eliminados</option>
                    </select>
                </div>
                {hayFiltros && (
                    <button
                        type="button"
                        onClick={() => {
                            setSearchQuery("");
                            setRoleFilter("ALL");
                            setStatusFilter("ALL");
                        }}
                        className={cls.secundario}
                    >
                        <X size={16} aria-hidden="true" />
                        Limpiar filtros
                    </button>
                )}
            </div>

            {/* Resumen de resultados */}
            <p className="text-sm text-[var(--mut)]" aria-live="polite">
                <span className="font-medium tabular-nums text-[var(--txt)]">{paginatedUsers.length}</span> de{" "}
                <span className="font-medium tabular-nums text-[var(--txt)]">{filteredUsers.length}</span> usuarios
                {filteredUsers.length !== users.length && <> (filtrado de <span className="tabular-nums">{users.length}</span>)</>}
                {filteredUsers.length === 0 && searchQuery && <>, sin resultados para «{searchQuery}»</>}
            </p>

            {error && (
                <p role="alert" className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                </p>
            )}
            <p role="status" className={hecho ? "flex items-center gap-2 text-sm text-emerald-400" : "sr-only"}>
                {hecho ? <><CheckCircle size={16} aria-hidden="true" /> {hecho}</> : null}
            </p>

            {/* Lista */}
            {paginatedUsers.length === 0 ? (
                <div className="border-y border-[var(--linea)] px-1 py-10 text-center">
                    <p className="font-medium text-[var(--txt)]">No se encontraron usuarios</p>
                    <p className="mt-1 text-sm text-[var(--mut)]">Prueba con otros filtros.</p>
                </div>
            ) : (
                <ul className="border-t border-[var(--linea)]">
                    {paginatedUsers.map((user) => {
                        const isSuperAdmin = user.role === "SUPERADMIN";
                        // Ni la propia cuenta ni alguien del mismo rango o superior: la API lo rechazaría.
                        const gestionable = user.id !== currentUserId && !isSuperAdmin && manda(currentUserRole, user.role);
                        const puedeCambiarRol = permisos.rol && gestionable;
                        const isLoginLocked = Boolean(user.lockedUntil && new Date(user.lockedUntil) > new Date());
                        const hasLoginPenalty = isLoginLocked || user.failedLoginAttempts > 0;
                        const canUnlockLoginBlock = currentUserRole === "SUPERADMIN" && !isSuperAdmin && hasLoginPenalty;
                        const nombre = user.name || user.email;

                        return (
                            <li
                                key={user.id}
                                className={`border-b border-[var(--linea)] transition-colors duration-150 motion-reduce:transition-none ${user.isActive ? "hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)]" : "bg-red-500/5"}`}
                            >
                                <div className="flex flex-col gap-3 px-1 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-2">
                                    {/* Avatar e identidad */}
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                        <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--acento)_15%,transparent)] font-mono text-[13px] font-semibold text-[var(--acento)]">
                                            {user.avatar ? (
                                                <img src={user.avatar} alt="" className="size-full object-cover" />
                                            ) : (
                                                <span aria-hidden="true">{(user.name || user.email)[0].toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <h2 className="min-w-0 max-w-full truncate text-[15px] font-semibold text-[var(--txt)]">{user.name || "Sin nombre"}</h2>
                                                {!user.isActive && (
                                                    <span className={`${cls.insignia} bg-red-500/10 text-red-400`}>
                                                        <Ban size={12} aria-hidden="true" /> Suspendido
                                                    </span>
                                                )}
                                                {isSuperAdmin && (
                                                    <span className={`${cls.insignia} bg-violet-500/10 text-violet-400`}>
                                                        <ShieldCheck size={12} aria-hidden="true" /> Protegido
                                                    </span>
                                                )}
                                                {isLoginLocked && (
                                                    <span className={`${cls.insignia} bg-amber-500/10 text-amber-400`}>
                                                        <Key size={12} aria-hidden="true" /> Bloqueado
                                                    </span>
                                                )}
                                            </div>
                                            <p className="truncate text-sm text-[var(--mut)]">{user.email}</p>
                                            {hasLoginPenalty && (
                                                <p className="mt-1 text-xs text-amber-400">
                                                    {isLoginLocked
                                                        ? `Bloqueado hasta ${new Date(user.lockedUntil!).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" })}`
                                                        : `Intentos fallidos acumulados: ${user.failedLoginAttempts}`}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Rol y acciones */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {editingUser === user.id && puedeCambiarRol ? (
                                            <div>
                                                <label htmlFor={`${id}-rol-${user.id}`} className="sr-only">Rol de {nombre}</label>
                                                <select
                                                    id={`${id}-rol-${user.id}`}
                                                    value={user.role}
                                                    onChange={(e) => handleUpdateRole(user.id, e.target.value, nombre)}
                                                    // Salir sin elegir deja el rol como estaba (antes el selector quedaba abierto).
                                                    onBlur={() => setEditingUser(null)}
                                                    onKeyDown={(e) => { if (e.key === "Escape") setEditingUser(null); }}
                                                    className={`${cls.campo} min-w-[150px]`}
                                                    autoFocus
                                                >
                                                    {rolesAsignables.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                                                </select>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => puedeCambiarRol && setEditingUser(user.id)}
                                                disabled={!puedeCambiarRol}
                                                aria-label={puedeCambiarRol ? `Cambiar el rol (${roleLabels[user.role]})` : `Rol: ${roleLabels[user.role]}`}
                                                className={`inline-flex min-h-10 items-center whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)] motion-reduce:transition-none ${isSuperAdmin
                                                    ? "border-transparent bg-[color-mix(in_srgb,var(--acento)_14%,transparent)] text-[var(--acento)]"
                                                    : "border-[var(--linea-2)] text-[var(--txt)]"} ${puedeCambiarRol ? "hover:bg-[color-mix(in_srgb,var(--txt)_6%,transparent)]" : "cursor-default"}`}
                                            >
                                                {roleLabels[user.role]}
                                            </button>
                                        )}

                                        <div className="flex flex-wrap items-center gap-0.5">
                                            {/* Ver las propuestas de este usuario (modo espía: solo el superadmin, sobre otros) */}
                                            {currentUserRole === "SUPERADMIN" && user.id !== currentUserId && (
                                                <button
                                                    type="button"
                                                    onClick={() => router.push(`/admin/cotizaciones?spyUserId=${user.id}`)}
                                                    aria-label="Ver cotizaciones como este usuario"
                                                    title="Ver cotizaciones como este usuario"
                                                    className={cls.icono}
                                                >
                                                    <Eye size={18} aria-hidden="true" />
                                                </button>
                                            )}

                                            {gestionable && (
                                                <>
                                                    {permisos.permisos && <button
                                                        type="button"
                                                        aria-label="Gestionar permisos"
                                                        onClick={() => setPermissionsModal({
                                                            isOpen: true,
                                                            userId: user.id,
                                                            userName: user.name,
                                                            userRole: user.role,
                                                        })}
                                                        className={cls.icono}
                                                        title="Gestionar permisos"
                                                    >
                                                        <Shield size={18} aria-hidden="true" />
                                                    </button>}

                                                    <button
                                                        type="button"
                                                        onClick={() => setLifecycleModal({ isOpen: true, user })}
                                                        aria-label="Ciclo de vida de la cuenta"
                                                        title="Ciclo de vida de la cuenta"
                                                        className={cls.icono}
                                                    >
                                                        <UserCog size={18} aria-hidden="true" />
                                                    </button>

                                                    {permisos.clave && <button
                                                        type="button"
                                                        aria-label="Cambiar contraseña"
                                                        onClick={() => { setError(""); setHecho(""); setPasswordModal({ isOpen: true, userId: user.id, userName: nombre }); }}
                                                        className={cls.icono}
                                                        title="Cambiar contraseña"
                                                    >
                                                        <Key size={18} aria-hidden="true" />
                                                    </button>}

                                                    {canUnlockLoginBlock && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUnlockLoginBlock(user.id, nombre)}
                                                            aria-label="Quitar bloqueo por demasiados intentos"
                                                            title="Quitar bloqueo por demasiados intentos"
                                                            className={cls.icono}
                                                        >
                                                            <ShieldCheck size={18} aria-hidden="true" />
                                                        </button>
                                                    )}

                                                    {permisos.suspender && <button
                                                        type="button"
                                                        aria-label={user.isActive ? "Suspender usuario" : "Activar o restaurar usuario"}
                                                        onClick={() => handleToggleStatus(user.id, user.isActive, nombre)}
                                                        className={`${cls.icono} ${user.isActive ? "hover:text-red-400" : "text-emerald-400 hover:text-emerald-400"}`}
                                                        title={user.isActive ? "Suspender usuario" : "Activar o restaurar usuario"}
                                                    >
                                                        {user.isActive ? <Ban size={18} aria-hidden="true" /> : <CheckCircle size={18} aria-hidden="true" />}
                                                    </button>}

                                                    {/* Transferir datos: la API solo lo permite al superadmin */}
                                                    {currentUserRole === "SUPERADMIN" && <button
                                                        type="button"
                                                        aria-label="Transferir datos a otro usuario"
                                                        onClick={() => setTransferModal({ isOpen: true, sourceUser: user })}
                                                        className={cls.icono}
                                                        title="Transferir datos a otro usuario"
                                                    >
                                                        <ArrowRightLeft size={18} aria-hidden="true" />
                                                    </button>}

                                                    {permisos.borrar && <button
                                                        type="button"
                                                        aria-label="Eliminar usuario"
                                                        onClick={() => handleDeleteUser(user.id, nombre)}
                                                        className={`${cls.icono} hover:text-red-400`}
                                                        title="Eliminar usuario"
                                                    >
                                                        <X size={18} aria-hidden="true" />
                                                    </button>}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {/* Paginación */}
            {totalPages > 1 && (
                <nav aria-label="Páginas de usuarios" className="flex flex-wrap items-center justify-center gap-1 pt-2">
                    <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        aria-label="Página anterior"
                        className={cls.icono}
                    >
                        <ChevronLeft size={18} aria-hidden="true" />
                    </button>

                    {currentPage > 3 && (
                        <>
                            <button type="button" onClick={() => setCurrentPage(1)} aria-label="Página 1" className={`${cls.icono} text-sm font-medium tabular-nums`}>
                                1
                            </button>
                            {currentPage > 4 && <span className="px-1 text-[var(--mut)]" aria-hidden="true">…</span>}
                        </>
                    )}

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => Math.abs(page - currentPage) <= 2)
                        .map(page => (
                            <button
                                key={page}
                                type="button"
                                onClick={() => setCurrentPage(page)}
                                aria-label={`Página ${page}`}
                                aria-current={page === currentPage ? "page" : undefined}
                                className={page === currentPage
                                    ? "grid size-10 place-items-center rounded-lg bg-[var(--acento)] text-sm font-semibold tabular-nums text-[var(--acento-tinta)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)] max-sm:size-11"
                                    : `${cls.icono} text-sm font-medium tabular-nums`}
                            >
                                {page}
                            </button>
                        ))}

                    {currentPage < totalPages - 2 && (
                        <>
                            {currentPage < totalPages - 3 && <span className="px-1 text-[var(--mut)]" aria-hidden="true">…</span>}
                            <button type="button" onClick={() => setCurrentPage(totalPages)} aria-label={`Página ${totalPages}`} className={`${cls.icono} text-sm font-medium tabular-nums`}>
                                {totalPages}
                            </button>
                        </>
                    )}

                    <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        aria-label="Página siguiente"
                        className={cls.icono}
                    >
                        <ChevronRight size={18} aria-hidden="true" />
                    </button>
                </nav>
            )}

            {/* Cambiar contraseña */}
            <Dialogo
                abierto={passwordModal.isOpen}
                alCerrar={() => setPasswordModal({ isOpen: false, userId: null, userName: "" })}
                titulo="Cambiar contraseña"
                subtitulo={passwordModal.userName ? `Nueva contraseña para ${passwordModal.userName}` : undefined}
            >
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label htmlFor={`${id}-clave`} className={cls.etiqueta}>Nueva contraseña</label>
                        <div className="relative">
                            <input
                                id={`${id}-clave`}
                                type={showPasswordModal ? "text" : "password"}
                                required
                                minLength={12}
                                aria-describedby={`${id}-clave-d`}
                                autoComplete="new-password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className={`${cls.campo} pr-12`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswordModal(!showPasswordModal)}
                                aria-label={showPasswordModal ? "Ocultar contraseña" : "Mostrar contraseña"}
                                className={`${cls.icono} absolute right-0 top-1/2 -translate-y-1/2`}
                            >
                                {showPasswordModal ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                            </button>
                        </div>
                    </div>
                    <p id={`${id}-clave-d`} className="text-xs text-[var(--mut)]">
                        Al menos 12 caracteres. Es temporal: al entrar, la persona tendrá que elegir una nueva, y se cierran sus sesiones abiertas.
                    </p>
                    {errorEnVentana}
                    <button type="submit" disabled={enviando} aria-busy={enviando} className={`${cls.principal} w-full`}>
                        {enviando ? "Guardando…" : "Guardar clave temporal"}
                    </button>
                </form>
            </Dialogo>

            {/* Nuevo usuario */}
            <Dialogo abierto={showCreateModal} alCerrar={() => setShowCreateModal(false)} titulo="Nuevo usuario">
                <form onSubmit={createUser} className="space-y-4">
                    <div>
                        <label htmlFor={`${id}-nombre`} className={cls.etiqueta}>Nombre</label>
                        <input
                            id={`${id}-nombre`}
                            type="text"
                            required
                            autoComplete="off"
                            value={newUser.name}
                            onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                            className={cls.campo}
                        />
                    </div>
                    <div>
                        <label htmlFor={`${id}-correo`} className={cls.etiqueta}>Correo</label>
                        <input
                            id={`${id}-correo`}
                            type="email"
                            required
                            autoComplete="off"
                            value={newUser.email}
                            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                            className={cls.campo}
                        />
                    </div>
                    <div>
                        <label htmlFor={`${id}-nueva`} className={cls.etiqueta}>Contraseña</label>
                        <div className="relative">
                            <input
                                id={`${id}-nueva`}
                                type={showNewUserPassword ? "text" : "password"}
                                required
                                minLength={12}
                                autoComplete="new-password"
                                aria-describedby={`${id}-nueva-d`}
                                value={newUser.password}
                                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                className={`${cls.campo} pr-12`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                                aria-label={showNewUserPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                className={`${cls.icono} absolute right-0 top-1/2 -translate-y-1/2`}
                            >
                                {showNewUserPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                            </button>
                        </div>
                        <p id={`${id}-nueva-d`} className="mt-1.5 text-xs text-[var(--mut)]">Al menos 12 caracteres. Es temporal: al entrar por primera vez tendrá que cambiarla.</p>
                    </div>
                    <div>
                        <label htmlFor={`${id}-nuevo-rol`} className={cls.etiqueta}>Rol</label>
                        <select
                            id={`${id}-nuevo-rol`}
                            value={newUser.role}
                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                            className={cls.campo}
                        >
                            {rolesAsignables.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>
                    {errorEnVentana}
                    <button type="submit" disabled={enviando} aria-busy={enviando} className={`${cls.principal} w-full`}>
                        {enviando ? "Creando…" : "Crear usuario"}
                    </button>
                </form>
            </Dialogo>

            {/* Permisos */}
            <UserPermissionsModal
                isOpen={permissionsModal.isOpen}
                onClose={() => setPermissionsModal({ isOpen: false, userId: "", userName: null, userRole: "" })}
                userId={permissionsModal.userId}
                userName={permissionsModal.userName}
                userRole={permissionsModal.userRole}
            />

            {/* Ciclo de vida */}
            <UserLifecycleModal
                isOpen={lifecycleModal.isOpen}
                onClose={() => setLifecycleModal({ isOpen: false, user: null })}
                user={lifecycleModal.user}
                onUserUpdated={fetchUsers}
            />

            {/* Transferencia */}
            <UserTransferModal
                isOpen={transferModal.isOpen}
                onClose={() => setTransferModal({ isOpen: false, sourceUser: null })}
                sourceUser={transferModal.sourceUser}
                onTransferComplete={fetchUsers}
            />
        </div>
    );
}
