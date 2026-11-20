"use client";

import { useState, useCallback, useRef, useEffect, useId, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { toast } from "sonner";
import { confirmar } from "@/modules/admin/confirmar/confirmar";
import { copiarTexto } from "@/lib/tools/copiar";
import {
    User, Shield, Activity, Monitor, Clock, Key, FileText,
    Briefcase, Users, BarChart3, Edit3, Save, X, LogOut,
    Lock, Download, Eye, EyeOff, CheckCircle, AlertTriangle,
    Globe, Fingerprint, RefreshCw, Copy, Check, Smartphone,
    ChevronDown, Loader2, QrCode, ShieldCheck, ShieldOff, MapPin,
    Laptop, Tablet, ChevronRight
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────
interface ProfileUser {
    id: string;
    name: string | null;
    email: string;
    role: string;
    avatar: string | null;
    createdAt: string;
    lastLoginAt: string | null;
    sharingCode: string | null;
    dataExportedAt: string | null;
    mfaEnabled: boolean;
    stats: {
        quotations: number;
        contracts: number;
        clients: number;
        connections: number;
    };
}

interface SessionInfo {
    id: string;
    browser: string | null;
    device: string | null;
    os: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    city: string | null;
    country: string | null;
    countryCode: string | null;
    lastActivity: string;
    createdAt: string;
}

interface PermissionInfo {
    name: string;
    description: string | null;
}

interface ActivityInfo {
    id: string;
    action: string;
    details: string | null;
    createdAt: string;
}

type Tab = "general" | "security" | "sessions" | "permissions" | "activity";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <User size={16} aria-hidden="true" /> },
    { id: "security", label: "Seguridad", icon: <Shield size={16} aria-hidden="true" /> },
    { id: "sessions", label: "Sesiones", icon: <Monitor size={16} aria-hidden="true" /> },
    { id: "permissions", label: "Permisos", icon: <Key size={16} aria-hidden="true" /> },
    { id: "activity", label: "Actividad", icon: <Activity size={16} aria-hidden="true" /> },
];

// ─── Estilos (tokens del tema: valen en claro y oscuro) ────────────
const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)]";
const BTN_PRI = `inline-flex items-center justify-center gap-2 min-h-10 max-sm:min-h-11 px-4 rounded-lg bg-[var(--acento)] text-[var(--acento-tinta)] text-sm font-semibold transition-opacity duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none ${FOCO}`;
const BTN_SEC = `inline-flex items-center justify-center gap-2 min-h-10 max-sm:min-h-11 px-4 rounded-lg border border-[var(--linea-2)] text-[var(--txt)] text-sm font-medium transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none ${FOCO}`;
const BTN_PELIGRO = `inline-flex items-center justify-center gap-2 min-h-10 max-sm:min-h-11 px-4 rounded-lg border border-red-500/30 text-red-400 text-sm font-medium transition-colors duration-150 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none ${FOCO}`;
const BTN_ICONO = `grid place-items-center size-10 max-sm:size-11 shrink-0 rounded-lg text-[var(--mut)] transition-colors duration-150 hover:text-[var(--txt)] hover:bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] disabled:opacity-50 motion-reduce:transition-none ${FOCO}`;
const CAMPO = "w-full min-h-10 max-sm:min-h-11 px-3 rounded-lg bg-[var(--fondo-2)] border border-[var(--linea-2)] text-[var(--txt)] text-sm placeholder:text-[var(--mut)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--acento)]";
const CAMPO_CODIGO = "w-full min-h-12 px-3 rounded-lg bg-[var(--fondo-2)] border border-[var(--linea-2)] text-[var(--txt)] text-center text-2xl font-mono tracking-[0.5em] placeholder:text-[var(--mut)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--acento)]";
const OJO = `absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-lg text-[var(--mut)] transition-colors duration-150 hover:text-[var(--txt)] motion-reduce:transition-none ${FOCO}`;
const ETIQUETA = "block mb-1.5 text-sm font-medium text-[var(--txt)]";
const TARJETA = "rounded-xl border border-[var(--linea)] bg-[var(--sup)] p-5 sm:p-6";
const TITULO_TARJETA = "flex items-center gap-2 text-base font-semibold text-[var(--txt)]";
const SECCION = "flex items-center gap-2 text-[15px] font-semibold text-[var(--mut)]";
const CUENTA = "rounded-full bg-[color-mix(in_srgb,var(--txt)_8%,transparent)] px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--mut)]";
const GIRO = "animate-spin motion-reduce:animate-none";

const ROLES: Record<string, string> = {
    SUPERADMIN: "Superadministrador",
    ADMIN: "Administrador",
    MODERATOR: "Moderador",
    USER: "Usuario",
};
const nombreRol = (rol: string) => ROLES[rol] ?? rol;

// ─── Helpers ───────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "justo ahora";
    if (mins < 60) return `hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return days === 1 ? "ayer" : `hace ${days} días`;
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function DeviceIcon({ device, os }: { device: string | null; os: string | null }) {
    const d = (device || os || "").toLowerCase();
    if (d.includes("mobile") || d.includes("android") || d.includes("iphone"))
        return <Smartphone size={18} className="text-[var(--mut)]" aria-hidden="true" />;
    if (d.includes("tablet") || d.includes("ipad")) return <Tablet size={18} className="text-[var(--mut)]" aria-hidden="true" />;
    return <Laptop size={18} className="text-[var(--mut)]" aria-hidden="true" />;
}

const ACTION_LABELS: Record<string, string> = {
    "login.success": "Inicio de sesión",
    "login.failed": "Intento fallido de inicio de sesión",
    "logout": "Cierre de sesión",
    "password.changed": "Contraseña actualizada",
    "profile.updated": "Perfil actualizado",
    "permission.granted": "Permiso otorgado",
    "permission.revoked": "Permiso revocado",
    "session.revoked": "Sesión revocada",
    "session.concurrent": "Sesión concurrente detectada",
    "quotation.created": "Cotización creada",
    "quotation.updated": "Cotización actualizada",
    "transaction.created": "Transacción registrada",
    "finance.account.created": "Cuenta financiera creada",
    "user.created": "Usuario creado",
    "user.updated": "Usuario actualizado",
    "tool.created": "Herramienta creada",
    "tool.updated": "Herramienta actualizada",
    PASSWORD_CHANGE_FAILED: "Intento fallido de cambio de contraseña",
    DATA_EXPORT: "Exportación de datos (GDPR)",
    LOGIN: "Inicio de sesión",
    LOGOUT: "Cierre de sesión",
    PASSWORD_CHANGE: "Cambio de contraseña",
    PROFILE_UPDATE: "Actualización de perfil",
    PERMISSION_CHANGE: "Cambio de permisos",
    SESSION_REVOKED: "Sesión revocada",
    QUOTATION_CREATE: "Cotización creada",
    QUOTATION_UPDATE: "Cotización actualizada",
    CLIENT_CREATE: "Cliente creado",
    CONTRACT_CREATE: "Contrato creado",
};

function buildPaginationItems(currentPage: number, totalPages: number): Array<number | string> {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const items: Array<number | string> = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) {
        items.push("ellipsis-start");
    }

    for (let pageNumber = start; pageNumber <= end; pageNumber++) {
        items.push(pageNumber);
    }

    if (end < totalPages - 1) {
        items.push("ellipsis-end");
    }

    items.push(totalPages);
    return items;
}

// ─── Main Component ────────────────────────────────────────────────
export function ProfilePageClient({
    user,
    sessions,
    permissions,
    recentActivity,
    totalActivityCount,
}: {
    user: ProfileUser;
    sessions: SessionInfo[];
    permissions: PermissionInfo[];
    recentActivity: ActivityInfo[];
    totalActivityCount: number;
}) {
    const [activeTab, setActiveTab] = useState<Tab>("general");
    const [isEditing, setIsEditing] = useState(false);
    const router = useRouter();
    const idNombre = useId();

    // Handle ?tab= query parameter from URL (e.g., from notification links)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get("tab") as Tab | null;
        if (tab && TABS.some(t => t.id === tab)) {
            setActiveTab(tab);
        }

        if (!user.mfaEnabled) {
            setActiveTab("security");
            toast.warning("Configuración de 2FA obligatoria", {
                description: "Debes configurar la autenticación de dos factores para poder acceder al panel de administración.",
                duration: 10000,
            });
            return;
        }

        if (params.get("setupMfa") === "true") {
            toast.warning("Configuración de 2FA obligatoria", {
                description: "Debes configurar la autenticación de dos factores para poder acceder al panel de administración.",
                duration: 10000,
            });
        }
    }, [user.mfaEnabled]);
    const [name, setName] = useState(user.name || "");
    const [saving, setSaving] = useState(false);

    const handleSaveName = useCallback(async () => {
        if (!name.trim()) {
            toast.error("El nombre no puede estar vacío");
            return;
        }
        if (name.trim().length < 2) {
            toast.error("El nombre debe tener al menos 2 caracteres");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al guardar");
            toast.success("Nombre actualizado correctamente");
            setIsEditing(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error al actualizar el nombre");
        } finally {
            setSaving(false);
        }
    }, [name]);

    const handleRevokeSession = useCallback(async (sessionId: string) => {
        if (!(await confirmar({ titulo: "¿Cerrar esta sesión?", detalle: "El dispositivo quedará desconectado y tendrá que volver a entrar.", accion: "Cerrar sesión", peligro: true }))) return;
        try {
            const res = await fetch("/api/admin/sessions", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId }),
            });
            if (!res.ok) throw new Error("Error");
            toast.success("Sesión revocada exitosamente");
            router.refresh();
        } catch {
            toast.error("Error al revocar sesión");
        }
    }, [router]);

    // Pestañas con flechas: la selección sigue al foco (guía «tabs» de modern-web-guidance).
    const moverPestana = (e: KeyboardEvent<HTMLButtonElement>, actual: number) => {
        let siguiente: number | null = null;
        if (e.key === "ArrowRight") siguiente = (actual + 1) % TABS.length;
        else if (e.key === "ArrowLeft") siguiente = (actual - 1 + TABS.length) % TABS.length;
        else if (e.key === "Home") siguiente = 0;
        else if (e.key === "End") siguiente = TABS.length - 1;
        if (siguiente === null) return;
        e.preventDefault();
        const destino = TABS[siguiente];
        if (!destino) return;
        setActiveTab(destino.id);
        document.getElementById(`perfil-tab-${destino.id}`)?.focus();
    };

    const cifras = [
        { label: "Clientes", value: user.stats.clients },
        { label: "Propuestas", value: user.stats.quotations },
        { label: "Contratos", value: user.stats.contracts },
        { label: "Conexiones", value: user.stats.connections },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Cabecera */}
            <header className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    <div className="size-16 shrink-0 rounded-full grid place-items-center overflow-hidden bg-[color-mix(in_srgb,var(--acento)_15%,transparent)] text-[var(--acento)] text-2xl font-semibold font-mono">
                        {user.avatar ? (
                            <img src={user.avatar} alt="Foto de perfil" className="size-full object-cover" />
                        ) : (
                            <span aria-hidden="true">{(user.name || user.email).charAt(0).toUpperCase()}</span>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <label htmlFor={idNombre} className="sr-only">Nombre</label>
                                <input
                                    id={idNombre}
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={`${CAMPO} max-w-md text-lg font-semibold`}
                                    autoFocus
                                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                                    maxLength={100}
                                    autoComplete="name"
                                />
                                <button
                                    type="button"
                                    onClick={handleSaveName}
                                    disabled={saving}
                                    className={BTN_ICONO}
                                    aria-label="Guardar nombre"
                                >
                                    {saving ? <RefreshCw size={18} className={GIRO} aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setIsEditing(false); setName(user.name || ""); }}
                                    className={BTN_ICONO}
                                    aria-label="Cancelar edición del nombre"
                                >
                                    <X size={18} aria-hidden="true" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 min-w-0">
                                <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[var(--txt)] truncate">
                                    {user.name || "Sin nombre"}
                                </h1>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className={BTN_ICONO}
                                    aria-label="Editar nombre"
                                    title="Editar nombre"
                                >
                                    <Edit3 size={16} aria-hidden="true" />
                                </button>
                            </div>
                        )}
                        <p className="mt-1 text-[15px] text-[var(--mut)] break-all">{user.email}</p>
                        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--mut)]">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--acento)_13%,transparent)] px-2.5 py-0.5 text-xs font-semibold text-[var(--acento)]">
                                <Shield size={12} aria-hidden="true" />
                                {nombreRol(user.role)}
                            </span>
                            <span>Miembro desde {formatDate(user.createdAt)}</span>
                            {user.lastLoginAt && (
                                <span>Último acceso {timeAgo(user.lastLoginAt)}</span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Cifras */}
                <dl className="grid grid-cols-2 md:grid-cols-4 border-y border-[var(--linea)]">
                    {cifras.map((stat, i) => (
                        <div
                            key={stat.label}
                            className={`flex flex-col-reverse px-4 py-4 border-[var(--linea)] ${i > 0 ? "md:border-l" : ""} ${i % 2 === 1 ? "max-md:border-l" : ""} ${i > 1 ? "max-md:border-t" : ""}`}
                        >
                            <dt className="text-[13.5px] text-[var(--mut)]">{stat.label}</dt>
                            <dd className="text-[28px] font-bold tracking-tight tabular-nums text-[var(--txt)]">{stat.value}</dd>
                        </div>
                    ))}
                </dl>
            </header>

            {/* Pestañas */}
            <div
                role="tablist"
                aria-label="Secciones del perfil"
                className="flex gap-1 overflow-x-auto border-b border-[var(--linea)] [scrollbar-width:thin]"
            >
                {TABS.map((tab, i) => {
                    const activa = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            id={`perfil-tab-${tab.id}`}
                            type="button"
                            role="tab"
                            aria-selected={activa}
                            tabIndex={activa ? 0 : -1}
                            onClick={() => setActiveTab(tab.id)}
                            onKeyDown={(e) => moverPestana(e, i)}
                            className={`-mb-px flex shrink-0 items-center gap-2 min-h-11 px-3 sm:px-4 border-b-2 border-transparent text-sm font-medium whitespace-nowrap text-[var(--mut)] transition-colors duration-150 hover:text-[var(--txt)] aria-selected:border-[var(--acento)] aria-selected:text-[var(--txt)] motion-reduce:transition-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--acento)]`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Contenido de la pestaña */}
            <div
                role="tabpanel"
                id={`perfil-panel-${activeTab}`}
                aria-labelledby={`perfil-tab-${activeTab}`}
                tabIndex={activeTab === "permissions" ? 0 : undefined}
                className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--acento)] rounded-sm"
            >
                {activeTab === "general" && <GeneralTab user={user} />}
                {activeTab === "security" && <SecurityTab mfaEnabled={user.mfaEnabled} />}
                {activeTab === "sessions" && <SessionsTab sessions={sessions} onRevoke={handleRevokeSession} />}
                {activeTab === "permissions" && <PermissionsTab permissions={permissions} role={user.role} />}
                {activeTab === "activity" && <ActivityTab initialActivities={recentActivity} totalCount={totalActivityCount} />}
            </div>
        </div>
    );
}

// ─── General Tab ───────────────────────────────────────────────────
function GeneralTab({ user }: { user: ProfileUser }) {
    const [copia, setCopia] = useState<"ok" | "fallo" | null>(null);

    const handleCopyCode = async () => {
        if (user.sharingCode) {
            const ok = await copiarTexto(user.sharingCode);
            setCopia(ok ? "ok" : "fallo");
            if (ok) toast.success("Código copiado al portapapeles");
            setTimeout(() => setCopia(null), 2000);
        }
    };

    return (
        <div className="grid gap-10 md:grid-cols-2">
            {/* Cuenta */}
            <section aria-labelledby="perfil-cuenta" className="min-w-0">
                <h2 id="perfil-cuenta" className={SECCION}>
                    <User size={16} aria-hidden="true" />
                    Información de la cuenta
                </h2>
                <dl className="mt-2 border-t border-[var(--linea)]">
                    <InfoRow label="Nombre" value={user.name || "—"} />
                    <InfoRow label="Correo" value={user.email} wrap />
                    <InfoRow label="Rol" value={nombreRol(user.role)} badge />
                    <div className="flex items-center justify-between gap-3 py-3 border-b border-[var(--linea)]">
                        <dt className="text-sm text-[var(--mut)] shrink-0">Código de conexión</dt>
                        <dd className="flex min-w-0 items-center gap-1">
                            <span className="truncate font-mono text-xs text-[var(--txt)]">
                                {user.sharingCode || "No generado"}
                            </span>
                            {user.sharingCode && (
                                <button
                                    type="button"
                                    onClick={handleCopyCode}
                                    className={BTN_ICONO}
                                    aria-label={copia === "ok" ? "Código copiado" : copia === "fallo" ? "No se pudo copiar" : "Copiar código de conexión"}
                                    title="Copiar código"
                                >
                                    {copia === "ok" ? <Check size={16} className="text-emerald-400" aria-hidden="true" />
                                        : copia === "fallo" ? <AlertTriangle size={16} className="text-red-400" aria-hidden="true" />
                                            : <Copy size={16} aria-hidden="true" />}
                                </button>
                            )}
                        </dd>
                    </div>
                    <InfoRow label="Cuenta creada" value={formatDate(user.createdAt)} />
                    <InfoRow
                        label="Último acceso"
                        value={user.lastLoginAt ? `${timeAgo(user.lastLoginAt)} (${formatDateTime(user.lastLoginAt)})` : "—"}
                    />
                </dl>
                <p className="sr-only" aria-live="polite">{copia === "fallo" ? "No se pudo copiar" : ""}</p>
            </section>

            {/* Accesos y exportación */}
            <div className="min-w-0 space-y-10">
                <section aria-labelledby="perfil-accesos">
                    <h2 id="perfil-accesos" className={SECCION}>
                        <Globe size={16} aria-hidden="true" />
                        Accesos directos
                    </h2>
                    <ul className="mt-2 border-t border-[var(--linea)]">
                        <QuickLink icon={FileText} label="Cotizaciones" href="/admin/cotizaciones" />
                        <QuickLink icon={Briefcase} label="Contratos" href="/admin/gestion-comercial/contratos" />
                        <QuickLink icon={Users} label="Clientes" href="/admin/clientes" />
                        <QuickLink icon={BarChart3} label="Finanzas" href="/admin/finance" />
                    </ul>
                </section>

                <DataExportCard user={user} />
            </div>
        </div>
    );
}

function QuickLink({ icon: Icon, label, href }: { icon: typeof User; label: string; href: string }) {
    return (
        <li className="border-b border-[var(--linea)]">
            <a
                href={href}
                className="flex min-h-11 items-center gap-3 px-1 py-3 text-sm font-medium text-[var(--txt)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] motion-reduce:transition-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--acento)]"
            >
                <Icon size={16} className="text-[var(--mut)]" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                <ChevronRight size={16} className="text-[var(--mut)]" aria-hidden="true" />
            </a>
        </li>
    );
}

function DataExportCard({ user }: { user: ProfileUser }) {
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            const res = await fetch("/api/profile?action=export");
            if (!res.ok) throw new Error("Error al exportar");
            const data = await res.json();

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `datos-perfil-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Datos exportados correctamente");
        } catch {
            toast.error("Error al exportar datos");
        } finally {
            setExporting(false);
        }
    };

    return (
        <section aria-labelledby="perfil-exportar" className="space-y-3">
            <h2 id="perfil-exportar" className={SECCION}>
                <Download size={16} aria-hidden="true" />
                Exportar mis datos
            </h2>
            <p className="text-sm leading-relaxed text-[var(--mut)]">
                Descarga todos tus datos personales en un archivo JSON (derecho a la portabilidad, art. 20 del RGPD).
            </p>
            {user.dataExportedAt && (
                <p className="text-sm text-[var(--mut)]">
                    Última exportación: {formatDateTime(user.dataExportedAt)}
                </p>
            )}
            <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className={BTN_SEC}
            >
                {exporting ? <RefreshCw size={16} className={GIRO} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
                {exporting ? "Exportando..." : "Descargar mis datos"}
            </button>
        </section>
    );
}

// ─── Security Tab ──────────────────────────────────────────────────
function SecurityTab({ mfaEnabled: initialMfaEnabled }: { mfaEnabled: boolean }) {
    return (
        <div className="space-y-8">
            {/* 2FA obligatoria */}
            {!initialMfaEnabled && (
                <div className="flex items-start gap-3">
                    <ShieldOff size={18} className="text-red-400 mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                        <p className="text-sm font-semibold text-red-400">Verificación en dos pasos obligatoria</p>
                        <p className="mt-1 text-sm text-[var(--mut)]">
                            Para entrar al panel tienes que activarla con una app como Google Authenticator, Authy o 1Password.
                            Hazlo abajo escaneando el código QR.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid gap-8 md:grid-cols-2 items-start">
                <ChangePasswordCard />

                <div className="space-y-8 min-w-0">
                    <MFASetupCard initialMfaEnabled={initialMfaEnabled} />

                    <section aria-labelledby="perfil-estado-seguridad">
                        <h2 id="perfil-estado-seguridad" className={SECCION}>
                            <Shield size={16} aria-hidden="true" />
                            Estado de seguridad
                        </h2>
                        <ul className="mt-2 border-t border-[var(--linea)]">
                            <SecurityRow
                                icon={Fingerprint}
                                label="Clave cifrada"
                                sublabel="Argon2id (NIST SP 800-63B)"
                                status="active"
                                statusText="Activo"
                            />
                            <SecurityRow
                                icon={Monitor}
                                label="Sesiones vigiladas"
                                sublabel="Detección de sesiones concurrentes"
                                status="active"
                                statusText="Activo"
                            />
                            <SecurityRow
                                icon={Lock}
                                label="Bloqueo por intentos"
                                sublabel="Se bloquea sola tras 5 intentos fallidos"
                                status="active"
                                statusText="Activo"
                            />
                            <SecurityRow
                                icon={Activity}
                                label="Auditoría completa"
                                sublabel="NIST SP 800-53 AU-3"
                                status="active"
                                statusText="Registrando"
                            />
                        </ul>
                    </section>

                    <section aria-labelledby="perfil-politica">
                        <h2 id="perfil-politica" className={SECCION}>
                            <Key size={16} aria-hidden="true" />
                            Política de sesiones
                        </h2>
                        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-[var(--mut)] marker:text-[var(--linea-2)]">
                            <li>Las sesiones expiran automáticamente tras 7 días o al cerrar sesión.</li>
                            <li>Se notifica en caso de acceso desde un nuevo dispositivo.</li>
                            <li>Todas las acciones quedan registradas en la auditoría.</li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
}

function SecurityRow({ icon: Icon, label, sublabel, status, statusText }: {
    icon: typeof Shield;
    label: string;
    sublabel: string;
    status: "active" | "coming" | "warning";
    statusText: string;
}) {
    const colors = {
        active: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
        coming: { bg: "bg-amber-500/10", text: "text-amber-400" },
        warning: { bg: "bg-red-500/10", text: "text-red-400" },
    }[status];

    return (
        <li className="flex items-center justify-between gap-3 py-3 border-b border-[var(--linea)]">
            <div className="flex min-w-0 items-center gap-3">
                <Icon size={16} className="shrink-0 text-[var(--mut)]" aria-hidden="true" />
                <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--txt)]">{label}</p>
                    <p className="text-sm text-[var(--mut)]">{sublabel}</p>
                </div>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                {statusText}
            </span>
        </li>
    );
}

function ChangePasswordCard() {
    const [isOpen, setIsOpen] = useState(false);
    const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const formRef = useRef<HTMLFormElement>(null);
    const id = useId();

    const getStrength = (pw: string): { level: number; label: string; color: string } => {
        if (!pw) return { level: 0, label: "", color: "" };
        let score = 0;
        if (pw.length >= 12) score++;
        if (pw.length >= 16) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[a-z]/.test(pw)) score++;
        if (/\d/.test(pw)) score++;
        if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw)) score++;

        if (score <= 2) return { level: 1, label: "Débil", color: "bg-red-500" };
        if (score <= 3) return { level: 2, label: "Regular", color: "bg-amber-500" };
        if (score <= 4) return { level: 3, label: "Fuerte", color: "bg-blue-500" };
        return { level: 4, label: "Muy fuerte", color: "bg-emerald-500" };
    };

    const strength = getStrength(form.newPassword);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const newErrors: Record<string, string> = {};
        if (!form.currentPassword) newErrors.currentPassword = "Requerido";
        if (form.newPassword.length < 12) newErrors.newPassword = "Mínimo 12 caracteres";
        else if (!/[A-Z]/.test(form.newPassword)) newErrors.newPassword = "Debe incluir mayúsculas";
        else if (!/[a-z]/.test(form.newPassword)) newErrors.newPassword = "Debe incluir minúsculas";
        else if (!/\d/.test(form.newPassword)) newErrors.newPassword = "Debe incluir números";
        else if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(form.newPassword))
            newErrors.newPassword = "Debe incluir carácter especial";
        if (form.newPassword !== form.confirmPassword) newErrors.confirmPassword = "No coinciden";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error");

            toast.success("Contraseña actualizada correctamente");
            setIsOpen(false);
            setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error al cambiar contraseña");
        } finally {
            setSaving(false);
        }
    };

    return (
        <section aria-labelledby={`${id}-t`} className={`${TARJETA} space-y-4 min-w-0`}>
            <h2 id={`${id}-t`} className={TITULO_TARJETA}>
                <Lock size={18} className="text-[var(--mut)]" aria-hidden="true" />
                Cambiar contraseña
            </h2>

            {!isOpen ? (
                <div className="space-y-4">
                    <p className="text-sm text-[var(--mut)]">
                        Tu contraseña está protegida con Argon2id, el estándar recomendado por OWASP y NIST SP 800-63B.
                    </p>
                    <button
                        type="button"
                        onClick={() => setIsOpen(true)}
                        className={`${BTN_SEC} w-full`}
                    >
                        <Key size={16} aria-hidden="true" />
                        Cambiar contraseña
                    </button>
                </div>
            ) : (
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                    {/* Contraseña actual */}
                    <div>
                        <label htmlFor={`${id}-actual`} className={ETIQUETA}>Contraseña actual</label>
                        <div className="relative">
                            <input
                                id={`${id}-actual`}
                                type={showCurrent ? "text" : "password"}
                                value={form.currentPassword}
                                onChange={(e) => setForm(p => ({ ...p, currentPassword: e.target.value }))}
                                className={`${CAMPO} pr-10`}
                                placeholder="••••••••••••"
                                autoComplete="current-password"
                                aria-invalid={errors.currentPassword ? true : undefined}
                                aria-describedby={errors.currentPassword ? `${id}-actual-error` : undefined}
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent(!showCurrent)}
                                className={OJO}
                                aria-label={showCurrent ? "Ocultar contraseña actual" : "Mostrar contraseña actual"}
                            >
                                {showCurrent ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                            </button>
                        </div>
                        {errors.currentPassword && (
                            <p id={`${id}-actual-error`} role="alert" className="text-sm text-red-400 mt-1">{errors.currentPassword}</p>
                        )}
                    </div>

                    {/* Contraseña nueva */}
                    <div>
                        <label htmlFor={`${id}-nueva`} className={ETIQUETA}>Nueva contraseña</label>
                        <div className="relative">
                            <input
                                id={`${id}-nueva`}
                                type={showNew ? "text" : "password"}
                                value={form.newPassword}
                                onChange={(e) => setForm(p => ({ ...p, newPassword: e.target.value }))}
                                className={`${CAMPO} pr-10`}
                                placeholder="Mínimo 12 caracteres"
                                autoComplete="new-password"
                                aria-invalid={errors.newPassword ? true : undefined}
                                aria-describedby={`${id}-reqs${errors.newPassword ? ` ${id}-nueva-error` : ""}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className={OJO}
                                aria-label={showNew ? "Ocultar contraseña nueva" : "Mostrar contraseña nueva"}
                            >
                                {showNew ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                            </button>
                        </div>
                        {form.newPassword && (
                            <div className="mt-2 space-y-1.5">
                                <div className="flex gap-1" aria-hidden="true">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div
                                            key={i}
                                            className={`h-1 flex-1 rounded-full ${i <= strength.level ? strength.color : "bg-[var(--linea-2)]"}`}
                                        />
                                    ))}
                                </div>
                                <p aria-live="polite" className={`text-sm ${strength.level <= 1 ? "text-red-400" :
                                    strength.level <= 2 ? "text-amber-400" :
                                        strength.level <= 3 ? "text-sky-400" : "text-emerald-400"
                                    }`}>
                                    <span className="sr-only">Seguridad de la contraseña: </span>
                                    {strength.label}
                                </p>
                            </div>
                        )}
                        <ul id={`${id}-reqs`} className="mt-2 grid grid-cols-2 gap-1">
                            <PasswordReq met={form.newPassword.length >= 12} text="12+ caracteres" />
                            <PasswordReq met={/[A-Z]/.test(form.newPassword)} text="Mayúscula" />
                            <PasswordReq met={/[a-z]/.test(form.newPassword)} text="Minúscula" />
                            <PasswordReq met={/\d/.test(form.newPassword)} text="Número" />
                            <PasswordReq met={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(form.newPassword)} text="Especial" />
                        </ul>
                        {errors.newPassword && (
                            <p id={`${id}-nueva-error`} role="alert" className="text-sm text-red-400 mt-1">{errors.newPassword}</p>
                        )}
                    </div>

                    {/* Confirmación */}
                    <div>
                        <label htmlFor={`${id}-repetir`} className={ETIQUETA}>Confirmar nueva contraseña</label>
                        <input
                            id={`${id}-repetir`}
                            type="password"
                            value={form.confirmPassword}
                            onChange={(e) => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                            className={CAMPO}
                            placeholder="Repetir nueva contraseña"
                            autoComplete="new-password"
                            aria-invalid={errors.confirmPassword ? true : undefined}
                            aria-describedby={`${id}-repetir-estado`}
                        />
                        <div id={`${id}-repetir-estado`} aria-live="polite">
                            {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                                <p className="text-sm text-red-400 mt-1 flex items-center gap-1">
                                    <AlertTriangle size={14} aria-hidden="true" /> Las contraseñas no coinciden
                                </p>
                            )}
                            {form.confirmPassword && form.newPassword === form.confirmPassword && form.confirmPassword.length > 0 && (
                                <p className="text-sm text-emerald-400 mt-1 flex items-center gap-1">
                                    <CheckCircle size={14} aria-hidden="true" /> Coinciden
                                </p>
                            )}
                        </div>
                        {errors.confirmPassword && (
                            <p role="alert" className="text-sm text-red-400 mt-1">{errors.confirmPassword}</p>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className={`${BTN_PRI} flex-1`}
                        >
                            {saving ? <RefreshCw size={16} className={GIRO} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
                            {saving ? "Guardando..." : "Actualizar contraseña"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                                setErrors({});
                            }}
                            className={BTN_SEC}
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
}

function PasswordReq({ met, text }: { met: boolean; text: string }) {
    return (
        <li className={`flex items-center gap-1.5 text-xs ${met ? "text-emerald-400" : "text-[var(--mut)]"}`}>
            {met
                ? <CheckCircle size={12} aria-hidden="true" />
                : <span className="size-3 rounded-full border border-[var(--mut)]" aria-hidden="true" />}
            <span className="sr-only">{met ? "Cumple: " : "Falta: "}</span>
            {text}
        </li>
    );
}

// ─── MFA Setup Card ────────────────────────────────────────────────
type MFAStep = "idle" | "loading" | "qr" | "verify" | "recovery" | "done";

function MFASetupCard({ initialMfaEnabled }: { initialMfaEnabled: boolean }) {
    const router = useRouter();
    const id = useId();
    const [mfaEnabled, setMfaEnabled] = useState(initialMfaEnabled);
    const [step, setStep] = useState<MFAStep>("idle");
    const [qrURI, setQrURI] = useState("");
    const [manualEntryKey, setManualEntryKey] = useState("");
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [verifyCode, setVerifyCode] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [disableCode, setDisableCode] = useState("");
    const [disabling, setDisabling] = useState(false);
    const [showDisable, setShowDisable] = useState(false);
    const [copiedCodes, setCopiedCodes] = useState<"ok" | "fallo" | null>(null);
    const [setupPassword, setSetupPassword] = useState("");
    const [showSetupPassword, setShowSetupPassword] = useState(false);
    const [copiedManualKey, setCopiedManualKey] = useState<"ok" | "fallo" | null>(null);
    const [returnToPath, setReturnToPath] = useState<string | null>(null);

    useEffect(() => {
        const storedPath = window.sessionStorage.getItem("admin-mfa-return-to");
        if (storedPath && storedPath.startsWith("/admin") && storedPath !== "/admin/profile") {
            setReturnToPath(storedPath);
        }
    }, []);

    const handleSetup = async () => {
        if (!setupPassword.trim()) {
            toast.error("Ingresa tu contraseña actual para continuar");
            return;
        }

        setStep("loading");
        try {
            const res = await fetch("/api/auth/mfa/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: setupPassword }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error");
            setQrURI(data.qrCodeURI);
            setManualEntryKey(data.manualEntryKey || "");
            setRecoveryCodes(data.recoveryCodes);
            setSetupPassword("");
            setShowSetupPassword(false);
            setStep("qr");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error al configurar MFA");
            setStep("idle");
        }
    };

    const handleVerify = async () => {
        if (verifyCode.length !== 6) {
            toast.error("Ingresa un código de 6 dígitos");
            return;
        }
        setVerifying(true);
        try {
            const res = await fetch("/api/auth/mfa/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: verifyCode }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Código inválido");
            toast.success(data.message);
            setMfaEnabled(true);
            setStep("recovery");
            setVerifyCode("");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error al verificar");
        } finally {
            setVerifying(false);
        }
    };

    const handleDisable = async () => {
        if (disableCode.length !== 6) {
            toast.error("Ingresa tu código de 6 dígitos actual");
            return;
        }
        setDisabling(true);
        try {
            const res = await fetch("/api/auth/mfa/setup", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: disableCode }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error");
            toast.success(data.message);
            setMfaEnabled(false);
            setShowDisable(false);
            setDisableCode("");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error al desactivar MFA");
        } finally {
            setDisabling(false);
        }
    };

    const handleCopyRecoveryCodes = async () => {
        const ok = await copiarTexto(recoveryCodes.join("\n"));
        setCopiedCodes(ok ? "ok" : "fallo");
        if (ok) toast.success("Códigos copiados al portapapeles");
        setTimeout(() => setCopiedCodes(null), 2000);
    };

    const handleCopyManualKey = async () => {
        const ok = await copiarTexto(manualEntryKey);
        setCopiedManualKey(ok ? "ok" : "fallo");
        if (ok) toast.success("Clave manual copiada");
        setTimeout(() => setCopiedManualKey(null), 2000);
    };

    const handleDownloadCodes = () => {
        const blob = new Blob([recoveryCodes.join("\n")], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mfa-recovery-codes-${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Códigos descargados");
    };

    const handleFinishEnrollment = () => {
        const storedPath = window.sessionStorage.getItem("admin-mfa-return-to");
        window.sessionStorage.removeItem("admin-mfa-return-to");

        if (storedPath && storedPath.startsWith("/admin") && storedPath !== "/admin/profile") {
            router.push(storedPath);
            router.refresh();
            return;
        }

        setStep("idle");
        router.refresh();
    };

    return (
        <section aria-labelledby={`${id}-t`} className={`${TARJETA} space-y-4`}>
            <h2 id={`${id}-t`} className={TITULO_TARJETA}>
                <Smartphone size={18} className="text-[var(--mut)]" aria-hidden="true" />
                Verificación en dos pasos (2FA)
            </h2>

            {mfaEnabled && step === "idle" ? (
                /* 2FA activa */
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true" />
                        <div>
                            <p className="text-sm font-medium text-emerald-400">Dos pasos activos</p>
                            <p className="text-sm text-[var(--mut)]">Tu cuenta está protegida con autenticación de dos factores.</p>
                        </div>
                    </div>

                    {showDisable ? (
                        <div className="space-y-3">
                            <label htmlFor={`${id}-desactivar`} className="block text-sm text-red-400">
                                Escribe el código actual de tu app para desactivar la verificación en dos pasos:
                            </label>
                            <input
                                id={`${id}-desactivar`}
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={disableCode}
                                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                className={`${CAMPO_CODIGO} border-red-500/30`}
                                placeholder="000000"
                                autoFocus
                            />
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={handleDisable}
                                    disabled={disabling}
                                    className={`${BTN_PELIGRO} flex-1`}
                                >
                                    {disabling ? <Loader2 size={16} className={GIRO} aria-hidden="true" /> : <ShieldOff size={16} aria-hidden="true" />}
                                    Desactivar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowDisable(false); setDisableCode(""); }}
                                    className={BTN_SEC}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowDisable(true)}
                            className={`${BTN_PELIGRO} w-full`}
                        >
                            <ShieldOff size={16} aria-hidden="true" />
                            Desactivar 2FA
                        </button>
                    )}
                </div>
            ) : step === "idle" || step === "loading" ? (
                /* Sin configurar */
                <div className="space-y-4">
                    <p className="text-sm text-[var(--mut)]">
                        Protege tu cuenta con una aplicación de autenticación como Google Authenticator, Authy o 1Password.
                    </p>
                    <div>
                        <label htmlFor={`${id}-clave`} className={ETIQUETA}>
                            Confirma tu contraseña actual
                        </label>
                        <div className="relative">
                            <input
                                id={`${id}-clave`}
                                type={showSetupPassword ? "text" : "password"}
                                value={setupPassword}
                                onChange={(e) => setSetupPassword(e.target.value)}
                                className={`${CAMPO} pr-10`}
                                placeholder="Tu contraseña actual"
                                autoComplete="current-password"
                                aria-describedby={`${id}-clave-nota`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowSetupPassword((current) => !current)}
                                className={OJO}
                                aria-label={showSetupPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            >
                                {showSetupPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                            </button>
                        </div>
                        <p id={`${id}-clave-nota`} className="mt-1.5 text-xs text-[var(--mut)]">
                            Se pide para que nadie active la 2FA desde una sesión robada.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleSetup}
                        disabled={step === "loading"}
                        className={`${BTN_PRI} w-full`}
                    >
                        {step === "loading" ? <Loader2 size={16} className={GIRO} aria-hidden="true" /> : <QrCode size={16} aria-hidden="true" />}
                        {step === "loading" ? "Generando..." : "Configurar 2FA"}
                    </button>
                </div>
            ) : step === "qr" ? (
                /* Código QR */
                <div className="space-y-4">
                    {/* Fondo blanco a propósito: el lector de la app necesita el QR oscuro sobre claro en ambos temas. */}
                    <div className="mx-auto w-fit rounded-xl bg-white p-3">
                        <QRCodeDisplay uri={qrURI} />
                    </div>
                    <p className="text-sm text-[var(--mut)] text-center">
                        Escanea este código QR con tu aplicación de autenticación.
                    </p>
                    <div className="space-y-2 border-y border-[var(--linea)] py-4">
                        <p className="text-sm text-[var(--mut)]">
                            Si tu app no detecta el QR, agrega la cuenta a mano con esta clave:
                        </p>
                        <p className="rounded-lg bg-[var(--fondo-2)] px-3 py-2 font-mono text-sm break-all text-[var(--txt)]">
                            {manualEntryKey}
                        </p>
                        <button
                            type="button"
                            onClick={handleCopyManualKey}
                            className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-1 text-sm font-medium text-[var(--acento)] hover:underline ${FOCO}`}
                        >
                            {copiedManualKey === "ok" ? <Check size={16} aria-hidden="true" /> : copiedManualKey === "fallo" ? <AlertTriangle size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                            {copiedManualKey === "ok" ? "Clave copiada" : copiedManualKey === "fallo" ? "No se pudo copiar" : "Copiar clave manual"}
                        </button>
                    </div>
                    <div>
                        <label htmlFor={`${id}-codigo`} className={ETIQUETA}>Ingresa el código de 6 dígitos de tu app</label>
                        <input
                            id={`${id}-codigo`}
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={verifyCode}
                            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            className={CAMPO_CODIGO}
                            placeholder="000000"
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleVerify}
                        disabled={verifying || verifyCode.length !== 6}
                        className={`${BTN_PRI} w-full`}
                    >
                        {verifying ? <Loader2 size={16} className={GIRO} aria-hidden="true" /> : <CheckCircle size={16} aria-hidden="true" />}
                        {verifying ? "Verificando..." : "Verificar y activar"}
                    </button>
                </div>
            ) : step === "recovery" ? (
                /* Códigos de recuperación */
                <div className="space-y-4">
                    <p className="flex items-start gap-2 text-sm text-amber-400">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                        Guarda estos códigos de recuperación. Solo se mostrarán una vez.
                    </p>
                    <ul className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--fondo-2)] p-4" aria-label="Códigos de recuperación">
                        {recoveryCodes.map((code, i) => (
                            <li key={i} className="py-1 text-center font-mono text-sm text-[var(--txt)]">
                                {code}
                            </li>
                        ))}
                    </ul>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleCopyRecoveryCodes}
                            className={`${BTN_SEC} flex-1`}
                        >
                            {copiedCodes === "ok" ? <Check size={16} className="text-emerald-400" aria-hidden="true" /> : copiedCodes === "fallo" ? <AlertTriangle size={16} className="text-red-400" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                            {copiedCodes === "ok" ? "Copiados" : copiedCodes === "fallo" ? "No se pudo copiar" : "Copiar"}
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadCodes}
                            className={`${BTN_SEC} flex-1`}
                        >
                            <Download size={16} aria-hidden="true" />
                            Descargar
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={handleFinishEnrollment}
                        className={`${BTN_PRI} w-full`}
                    >
                        <CheckCircle size={16} aria-hidden="true" />
                        {returnToPath ? "Guardar códigos y continuar" : "Ya guardé mis códigos"}
                    </button>
                </div>
            ) : null}
        </section>
    );
}

// ─── QR Code Display (SVG-based, no external dependency) ───────────
function QRCodeDisplay({ uri }: { uri: string }) {
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [qrError, setQrError] = useState(false);

    useEffect(() => {
        let isCancelled = false;

        setQrDataUrl(null);
        setQrError(false);

        QRCode.toDataURL(uri, {
            width: 192,
            margin: 2,
            color: {
                dark: "#111111",
                light: "#ffffff",
            },
        }).then((dataUrl) => {
            if (!isCancelled) {
                setQrDataUrl(dataUrl);
            }
        }).catch((error: unknown) => {
            console.error("Failed to generate MFA QR code", error);
            if (!isCancelled) {
                setQrError(true);
            }
        });

        return () => {
            isCancelled = true;
        };
    }, [uri]);

    if (qrError) {
        // Va sobre el recuadro blanco del QR: texto oscuro fijo para que se lea en ambos temas.
        return (
            <div role="alert" className="w-48 h-48 flex items-center justify-center text-center text-sm text-[#334155] px-4">
                No se pudo generar el QR localmente. Reintenta la configuración.
            </div>
        );
    }

    if (!qrDataUrl) {
        return (
            <div className="w-48 h-48 flex items-center justify-center">
                <Loader2 size={32} className={`${GIRO} text-[#64748b]`} aria-hidden="true" />
                <span className="sr-only">Generando código QR</span>
            </div>
        );
    }

    return <img src={qrDataUrl} alt="Código QR para tu app de autenticación" className="w-48 h-48" />;
}

// ─── Sessions Tab ──────────────────────────────────────────────────
function SessionsTab({ sessions, onRevoke }: { sessions: SessionInfo[]; onRevoke: (id: string) => void }) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    return (
        <section aria-labelledby="perfil-sesiones" className="space-y-3">
            <h2 id="perfil-sesiones" className={SECCION}>
                <Monitor size={16} aria-hidden="true" />
                Sesiones activas
                <span className={CUENTA}>{sessions.length}</span>
            </h2>

            {sessions.length === 0 ? (
                <div className="border-t border-[var(--linea)] py-12 text-center">
                    <Monitor size={32} className="mx-auto mb-3 text-[var(--mut)]" aria-hidden="true" />
                    <p className="text-[var(--mut)]">No hay sesiones activas registradas</p>
                </div>
            ) : (
                <ul className="border-t border-[var(--linea)]">
                    {sessions.map((session, idx) => {
                        const abierta = expandedId === session.id;
                        const detalleId = `perfil-sesion-${session.id}`;
                        return (
                            <li key={session.id} className="border-b border-[var(--linea)]">
                                <div className="flex items-center justify-between gap-3 px-1 py-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <DeviceIcon device={session.device} os={session.os} />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-[var(--txt)]">
                                                {session.browser || "Navegador desconocido"}
                                                {session.os && <span className="font-normal text-[var(--mut)]"> en {session.os}</span>}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--mut)]">
                                                {session.device && (
                                                    <span className="flex items-center gap-1">
                                                        <Monitor size={12} aria-hidden="true" />
                                                        {session.device}
                                                    </span>
                                                )}
                                                {(session.country || session.countryCode) && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={12} aria-hidden="true" />
                                                        {[session.city, session.country].filter(Boolean).join(", ") || session.countryCode}
                                                    </span>
                                                )}
                                                {session.ipAddress && (
                                                    <span className="flex items-center gap-1 font-mono">
                                                        <Globe size={12} aria-hidden="true" />
                                                        {session.ipAddress}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} aria-hidden="true" />
                                                    {timeAgo(session.lastActivity)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {idx === 0 && (
                                            <span className="mr-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                                                Actual
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setExpandedId(abierta ? null : session.id)}
                                            className={BTN_ICONO}
                                            aria-expanded={abierta}
                                            aria-controls={detalleId}
                                            aria-label="Ver detalles de la sesión"
                                            title="Ver detalles"
                                        >
                                            <ChevronDown size={16} className={abierta ? "rotate-180" : ""} aria-hidden="true" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onRevoke(session.id)}
                                            className={`${BTN_ICONO} hover:text-red-400 hover:bg-red-500/10`}
                                            aria-label="Cerrar esta sesión"
                                            title="Cerrar esta sesión"
                                        >
                                            <LogOut size={16} aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>

                                {/* Detalle */}
                                {abierta && (
                                    <div id={detalleId} className="px-1 pb-4 pt-1 space-y-3">
                                        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                                            <div className="sm:col-span-2">
                                                <dt className="text-[var(--mut)]">IP completa</dt>
                                                <dd className="font-mono break-all text-[var(--txt)]">{session.ipAddress || "—"}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-[var(--mut)]">País</dt>
                                                <dd className="text-[var(--txt)]">
                                                    {session.country || "—"}
                                                    {session.countryCode && <span className="ml-1 text-[var(--mut)]">({session.countryCode})</span>}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-[var(--mut)]">Navegador</dt>
                                                <dd className="text-[var(--txt)]">{session.browser || "—"}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-[var(--mut)]">Dispositivo</dt>
                                                <dd className="text-[var(--txt)]">{session.device || "—"}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-[var(--mut)]">Sistema operativo</dt>
                                                <dd className="text-[var(--txt)]">{session.os || "—"}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-[var(--mut)]">Ciudad</dt>
                                                <dd className="text-[var(--txt)]">{session.city || "—"}</dd>
                                            </div>
                                            <div className="sm:col-span-2">
                                                <dt className="text-[var(--mut)]">Iniciada</dt>
                                                <dd className="text-[var(--txt)]">{formatDateTime(session.createdAt)}</dd>
                                            </div>
                                            {session.userAgent && (
                                                <div className="sm:col-span-2">
                                                    <dt className="text-[var(--mut)]">Navegador (cadena completa)</dt>
                                                    <dd className="mt-0.5 font-mono text-xs break-all text-[var(--mut)]">{session.userAgent}</dd>
                                                </div>
                                            )}
                                        </dl>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            <p className="flex items-start gap-2 pt-2 text-sm text-[var(--mut)]">
                <Shield size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                Puedes cerrar cualquier sesión activa. La más reciente está marcada como «Actual»; abre cada una para ver su IP, navegador, dispositivo y país.
            </p>
        </section>
    );
}

// ─── Permissions Tab ───────────────────────────────────────────────
function PermissionsTab({ permissions, role }: { permissions: PermissionInfo[]; role: string }) {
    const grouped = permissions.reduce<Record<string, PermissionInfo[]>>((acc, p) => {
        const name = p.name.toLowerCase();
        let module = "general";
        if (name.includes("finanz") || name.includes("transac") || name.includes("presupuest") || name.includes("meta") || name.includes("ocr") || name.includes("import") || name.includes("cuenta")) module = "finance";
        else if (name.includes("cotiz") || name.includes("propuesta")) module = "quotations";
        else if (name.includes("cv") || name.includes("currículum")) module = "cv";
        else if (name.includes("herramienta") || name.includes("tool")) module = "tools";
        else if (name.includes("usuario") || name.includes("user")) module = "users";
        else if (name.includes("auditoría") || name.includes("audit")) module = "audit";
        else if (name.includes("seguridad") || name.includes("security") || name.includes("sesión") || name.includes("permiso")) module = "security";
        else if (name.includes("contacto") || name.includes("mensaje")) module = "contact";
        else if (name.includes("notificación") || name.includes("notification")) module = "notifications";
        else if (name.includes("dashboard") || name.includes("panel")) module = "dashboard";
        else if (name.includes("analytic") || name.includes("analít")) module = "analytics";
        else if (name.includes("comercial") || name.includes("contrato") || name.includes("pipeline") || name.includes("client") || name.includes("gasto") || name.includes("pago")) module = "crm";

        if (!acc[module]) acc[module] = [];
        acc[module].push(p);
        return acc;
    }, {});

    const moduleLabels: Record<string, string> = {
        dashboard: "Hoy",
        analytics: "Visitas",
        quotations: "Propuestas",
        cv: "Editor de CV",
        tools: "Herramientas",
        users: "Usuarios",
        audit: "Auditoría",
        security: "Seguridad",
        contact: "Contacto",
        notifications: "Notificaciones",
        finance: "Finanzas",
        crm: "Gestión comercial",
        general: "General",
    };

    return (
        <section aria-labelledby="perfil-permisos" className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="perfil-permisos" className={SECCION}>
                    <Key size={16} aria-hidden="true" />
                    Permisos efectivos
                    <span className={CUENTA}>{permissions.length}</span>
                </h2>
                <span className="text-sm text-[var(--mut)]">
                    Rol base: <span className="font-semibold text-[var(--acento)]">{nombreRol(role)}</span>
                </span>
            </div>

            {role === "SUPERADMIN" && (
                <p className="flex items-start gap-2 text-sm text-[var(--mut)]">
                    <Shield size={14} className="mt-0.5 shrink-0 text-[var(--acento)]" aria-hidden="true" />
                    Como superadministrador tienes acceso completo a todos los módulos. Los permisos finos se aplican a los roles inferiores.
                </p>
            )}

            <div className="grid gap-x-10 md:grid-cols-2">
                {Object.entries(grouped)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([module, perms]) => (
                        <section key={module} aria-labelledby={`perfil-mod-${module}`} className="border-t border-[var(--linea)] py-4">
                            <h3 id={`perfil-mod-${module}`} className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--txt)]">
                                {moduleLabels[module] || module}
                                <span className="ml-auto text-xs font-normal tabular-nums text-[var(--mut)]">{perms.length}</span>
                            </h3>
                            <ul className="space-y-2">
                                {perms.map((p) => (
                                    <li key={p.name} className="flex items-start gap-2 text-sm">
                                        <CheckCircle size={14} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true" />
                                        <div className="min-w-0">
                                            <span className="text-[var(--txt)] break-words">{p.name}</span>
                                            {p.description && (
                                                <p className="mt-0.5 text-xs text-[var(--mut)]">
                                                    {p.description}
                                                </p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
            </div>
        </section>
    );
}

// ─── Activity Tab ──────────────────────────────────────────────────
function ActivityTab({ initialActivities, totalCount }: { initialActivities: ActivityInfo[]; totalCount: number }) {
    const [activities, setActivities] = useState<ActivityInfo[]>(initialActivities);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const LIMIT = 15;
    const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));
    const paginationItems = buildPaginationItems(page, totalPages);
    const rangeStart = totalCount === 0 ? 0 : ((page - 1) * LIMIT) + 1;
    const rangeEnd = totalCount === 0 ? 0 : rangeStart + activities.length - 1;

    const handlePageChange = async (nextPage: number) => {
        if (loading || nextPage < 1 || nextPage > totalPages || nextPage === page) {
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/user/activity?page=${nextPage}&limit=${LIMIT}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error");
            setActivities(data.data);
            setPage(data.pagination.page);
        } catch {
            toast.error("Error al cambiar de página");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section aria-labelledby="perfil-actividad" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="perfil-actividad" className={SECCION}>
                    <Activity size={16} aria-hidden="true" />
                    Actividad reciente
                    <span className={CUENTA}>{totalCount}</span>
                </h2>
                <span className="text-sm tabular-nums text-[var(--mut)]" aria-live="polite">
                    Mostrando {rangeStart}-{rangeEnd} de {totalCount}
                </span>
            </div>

            {activities.length === 0 ? (
                <div className="border-t border-[var(--linea)] py-12 text-center">
                    <Activity size={32} className="mx-auto mb-3 text-[var(--mut)]" aria-hidden="true" />
                    <p className="text-[var(--mut)]">Sin actividad registrada</p>
                </div>
            ) : (
                <ol className="border-t border-[var(--linea)]">
                    {activities.map((activity) => {
                        const isSecurityEvent = activity.action.includes("password") ||
                            activity.action.includes("session") ||
                            activity.action.includes("login") ||
                            activity.action.includes("logout") ||
                            activity.action === "PASSWORD_CHANGE_FAILED";

                        return (
                            <li key={activity.id} className="flex items-start gap-3 border-b border-[var(--linea)] px-1 py-3">
                                <span
                                    className={`mt-1.5 size-2 shrink-0 rounded-full ${isSecurityEvent ? "bg-amber-400" : "bg-[var(--acento)]"}`}
                                    aria-hidden="true"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="flex items-center gap-2 text-sm font-medium text-[var(--txt)]">
                                        {ACTION_LABELS[activity.action] || activity.action}
                                        {isSecurityEvent && (
                                            <>
                                                <Shield size={14} className="text-amber-400" aria-hidden="true" />
                                                <span className="sr-only">(seguridad)</span>
                                            </>
                                        )}
                                    </p>
                                    {activity.details && activity.details !== "{}" && activity.details !== "null" && (
                                        <p className="mt-0.5 truncate text-sm text-[var(--mut)] max-w-md">
                                            {activity.details.substring(0, 120)}
                                        </p>
                                    )}
                                    <p className="mt-1 text-xs text-[var(--mut)]">
                                        {timeAgo(activity.createdAt)} · {formatDateTime(activity.createdAt)}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}

            {totalPages > 1 && (
                <nav aria-label="Páginas de actividad" className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                    <button
                        type="button"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={loading || page === 1}
                        className={BTN_SEC}
                    >
                        Anterior
                    </button>

                    <div className="flex flex-wrap items-center justify-center gap-1">
                        {paginationItems.map((item, index) => (
                            typeof item === "number" ? (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => handlePageChange(item)}
                                    disabled={loading}
                                    aria-current={page === item ? "page" : undefined}
                                    aria-label={`Página ${item}`}
                                    className={`min-h-10 min-w-10 max-sm:min-h-11 max-sm:min-w-11 rounded-lg px-3 text-sm font-medium tabular-nums transition-colors duration-150 motion-reduce:transition-none disabled:opacity-50 ${FOCO} ${page === item
                                        ? "bg-[var(--acento)] text-[var(--acento-tinta)]"
                                        : "text-[var(--mut)] hover:text-[var(--txt)] hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)]"
                                        }`}
                                >
                                    {item}
                                </button>
                            ) : (
                                <span key={`${item}-${index}`} className="px-1 text-sm text-[var(--mut)]" aria-hidden="true">
                                    …
                                </span>
                            )
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={loading || page === totalPages}
                        className={BTN_SEC}
                    >
                        {loading ? <Loader2 size={16} className={GIRO} aria-hidden="true" /> : null}
                        Siguiente
                    </button>
                </nav>
            )}
        </section>
    );
}

// ─── Shared Components ─────────────────────────────────────────────
function InfoRow({ label, value, badge, mono, wrap }: { label: string; value: string; badge?: boolean; mono?: boolean; wrap?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-3 py-3 border-b border-[var(--linea)]">
            <dt className="text-sm text-[var(--mut)] shrink-0">{label}</dt>
            {badge ? (
                <dd className="truncate rounded-full bg-[color-mix(in_srgb,var(--acento)_13%,transparent)] px-2.5 py-0.5 text-xs font-semibold text-[var(--acento)]">
                    {value}
                </dd>
            ) : (
                <dd className={`min-w-0 flex-1 text-right text-sm font-medium text-[var(--txt)] ${mono ? "font-mono text-xs" : ""} ${wrap ? "break-all whitespace-normal" : "truncate"}`} title={value}>
                    {value}
                </dd>
            )}
        </div>
    );
}
