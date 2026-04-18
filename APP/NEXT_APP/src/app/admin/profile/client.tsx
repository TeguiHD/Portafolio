"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
    User, Shield, Activity, Monitor, Clock, Key, FileText,
    Briefcase, Users, BarChart3, Edit3, Save, X, LogOut,
    Lock, Download, Eye, EyeOff, CheckCircle, AlertTriangle,
    Globe, Fingerprint, RefreshCw, Copy, Check, Smartphone,
    ChevronDown, Loader2, QrCode, ShieldCheck, ShieldOff, MapPin
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
    { id: "general", label: "General", icon: <User size={16} /> },
    { id: "security", label: "Seguridad", icon: <Shield size={16} /> },
    { id: "sessions", label: "Sesiones", icon: <Monitor size={16} /> },
    { id: "permissions", label: "Permisos", icon: <Key size={16} /> },
    { id: "activity", label: "Actividad", icon: <Activity size={16} /> },
];

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

function getDeviceIcon(device: string | null, os: string | null) {
    const d = (device || os || "").toLowerCase();
    if (d.includes("mobile") || d.includes("android") || d.includes("iphone"))
        return "📱";
    if (d.includes("tablet") || d.includes("ipad")) return "📱";
    return "💻";
}

const ACTION_LABELS: Record<string, string> = {
    "login.success": "Inicio de sesión",
    "login.failed": "Intento fallido de login",
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

// ─── Helpers: Country flag ──────────────────────────────────────────
function countryCodeToFlag(code: string | null): string {
    if (!code || code.length !== 2) return "🌐";
    const upper = code.toUpperCase();
    return String.fromCodePoint(
        ...upper.split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
    );
}

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
        if (!confirm("¿Cerrar esta sesión? El dispositivo será desconectado.")) return;
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

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Profile Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-accent-1/10 border border-white/10 p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />

                <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-1 to-accent-2 flex items-center justify-center text-3xl font-bold text-black shadow-xl shadow-accent-1/20 shrink-0">
                        {user.avatar ? (
                            <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-2xl object-cover" />
                        ) : (
                            (user.name || user.email).charAt(0).toUpperCase()
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        {isEditing ? (
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="bg-black/30 border border-white/20 rounded-xl px-4 py-2 text-white text-xl font-bold focus:border-accent-1 focus:ring-1 focus:ring-accent-1/50 outline-none transition-all w-full max-w-md"
                                    autoFocus
                                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                                    maxLength={100}
                                />
                                <button
                                    onClick={handleSaveName}
                                    disabled={saving}
                                    className="p-2 rounded-lg bg-accent-1/20 text-accent-1 hover:bg-accent-1/30 transition-colors disabled:opacity-50"
                                >
                                    {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                                </button>
                                <button
                                    onClick={() => { setIsEditing(false); setName(user.name || ""); }}
                                    className="p-2 rounded-lg bg-white/5 text-neutral-400 hover:text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
                                    {user.name || "Sin nombre"}
                                </h1>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-1.5 rounded-lg text-neutral-500 hover:text-accent-1 hover:bg-accent-1/10 transition-colors"
                                    title="Editar nombre"
                                >
                                    <Edit3 size={16} />
                                </button>
                            </div>
                        )}
                        <p className="text-neutral-400 text-sm mt-1 break-all">{user.email}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-accent-1/10 text-accent-1 border border-accent-1/20">
                                <Shield size={12} />
                                {user.role}
                            </span>
                            <span className="text-xs text-neutral-500">
                                Miembro desde {formatDate(user.createdAt)}
                            </span>
                            {user.lastLoginAt && (
                                <span className="text-xs text-neutral-500">
                                    · Último acceso {timeAgo(user.lastLoginAt)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full sm:w-auto">
                        {[
                            { label: "Clientes", value: user.stats.clients, icon: Users },
                            { label: "Propuestas", value: user.stats.quotations, icon: FileText },
                            { label: "Contratos", value: user.stats.contracts, icon: Briefcase },
                            { label: "Conexiones", value: user.stats.connections, icon: BarChart3 },
                        ].map((stat) => (
                            <div key={stat.label} className="bg-black/20 border border-white/5 rounded-xl p-3 text-center">
                                <stat.icon size={14} className="mx-auto text-neutral-500 mb-1" />
                                <p className="text-lg font-bold text-white">{stat.value}</p>
                                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10 overflow-x-auto">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                            ? "text-white"
                            : "text-neutral-400 hover:text-white hover:bg-white/5"
                            }`}
                    >
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="profileTab"
                                className="absolute inset-0 bg-accent-1/10 border border-accent-1/20 rounded-lg"
                                transition={{ type: "spring", duration: 0.4 }}
                            />
                        )}
                        <span className="relative z-10">{tab.icon}</span>
                        <span className="relative z-10">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === "general" && <GeneralTab user={user} />}
                    {activeTab === "security" && <SecurityTab mfaEnabled={user.mfaEnabled} />}
                    {activeTab === "sessions" && <SessionsTab sessions={sessions} onRevoke={handleRevokeSession} />}
                    {activeTab === "permissions" && <PermissionsTab permissions={permissions} role={user.role} />}
                    {activeTab === "activity" && <ActivityTab initialActivities={recentActivity} totalCount={totalActivityCount} />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

// ─── General Tab ───────────────────────────────────────────────────
function GeneralTab({ user }: { user: ProfileUser }) {
    const [copied, setCopied] = useState(false);

    const handleCopyCode = () => {
        if (user.sharingCode) {
            navigator.clipboard.writeText(user.sharingCode);
            setCopied(true);
            toast.success("Código copiado al portapapeles");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Account Info */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <User size={18} className="text-accent-1" />
                    Información de Cuenta
                </h3>
                <InfoRow label="Nombre" value={user.name || "—"} />
                <InfoRow label="Email" value={user.email} wrap />
                <InfoRow label="Rol" value={user.role} badge />
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-sm text-neutral-400">Código de Conexión</span>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-mono text-xs">
                            {user.sharingCode || "No generado"}
                        </span>
                        {user.sharingCode && (
                            <button
                                onClick={handleCopyCode}
                                className="p-1 rounded text-neutral-500 hover:text-accent-1 transition-colors"
                                title="Copiar código"
                            >
                                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            </button>
                        )}
                    </div>
                </div>
                <InfoRow label="Cuenta creada" value={formatDate(user.createdAt)} />
                <InfoRow
                    label="Último acceso"
                    value={user.lastLoginAt ? `${timeAgo(user.lastLoginAt)} (${formatDateTime(user.lastLoginAt)})` : "—"}
                />
            </div>

            {/* Quick Actions + Data Export */}
            <div className="space-y-6">
                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Globe size={18} className="text-blue-400" />
                        Acceso Rápido
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <QuickLink icon={FileText} label="Cotizaciones" href="/admin/cotizaciones" color="text-indigo-400" />
                        <QuickLink icon={Briefcase} label="Contratos" href="/admin/gestion-comercial/contratos" color="text-emerald-400" />
                        <QuickLink icon={Users} label="Clientes" href="/admin/gestion-comercial/clientes" color="text-amber-400" />
                        <QuickLink icon={BarChart3} label="Finanzas" href="/admin/finance" color="text-purple-400" />
                    </div>
                </div>

                <DataExportCard user={user} />
            </div>
        </div>
    );
}

function QuickLink({ icon: Icon, label, href, color }: { icon: typeof User; label: string; href: string; color: string }) {
    return (
        <a
            href={href}
            className="flex items-center gap-3 p-3 bg-black/20 rounded-xl hover:bg-white/5 transition-all group"
        >
            <Icon size={16} className={`${color} group-hover:scale-110 transition-transform`} />
            <span className="text-sm text-neutral-300 group-hover:text-white transition-colors">{label}</span>
        </a>
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
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Download size={18} className="text-cyan-400" />
                Exportar Mis Datos
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
                Conforme al Art. 20 GDPR — Derecho a la portabilidad de datos.
                Exporta todos tus datos personales en formato JSON.
            </p>
            {user.dataExportedAt && (
                <p className="text-xs text-neutral-600">
                    Última exportación: {formatDateTime(user.dataExportedAt)}
                </p>
            )}
            <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-all text-sm font-medium disabled:opacity-50"
            >
                {exporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                {exporting ? "Exportando..." : "Descargar mis datos"}
            </button>
        </div>
    );
}

// ─── Security Tab ──────────────────────────────────────────────────
function SecurityTab({ mfaEnabled: initialMfaEnabled }: { mfaEnabled: boolean }) {
    return (
        <div className="space-y-6">
            {/* Mandatory 2FA Warning Banner */}
            {!initialMfaEnabled && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3">
                    <ShieldOff size={22} className="text-red-400 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-red-400">Autenticación de dos factores obligatoria</p>
                        <p className="text-xs text-red-400/70 mt-1">
                            Debes configurar 2FA con una app como Google Authenticator, Authy o 1Password para poder acceder al panel de administración.
                            Configúralo a continuación escaneando el código QR.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                <ChangePasswordCard />

                <div className="space-y-6">
                    <MFASetupCard initialMfaEnabled={initialMfaEnabled} />

                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Shield size={18} className="text-emerald-400" />
                            Estado de Seguridad
                        </h3>

                        <SecurityRow
                            icon={Fingerprint}
                            label="Hash de Contraseña"
                            sublabel="Argon2id (NIST SP 800-63B)"
                            status="active"
                            statusText="Activo"
                        />
                        <SecurityRow
                            icon={Monitor}
                            label="Sesiones Monitoreadas"
                            sublabel="Detección de sesiones concurrentes"
                            status="active"
                            statusText="Activo"
                        />
                        <SecurityRow
                            icon={Lock}
                            label="Bloqueo por Intentos"
                            sublabel="Auto-lock después de 5 fallos"
                            status="active"
                            statusText="Activo"
                        />
                        <SecurityRow
                            icon={Activity}
                            label="Auditoría Completa"
                            sublabel="NIST SP 800-53 AU-3"
                            status="active"
                            statusText="Registrando"
                        />
                    </div>

                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-3">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <Key size={16} className="text-amber-400" />
                            Política de Sesiones
                        </h3>
                        <div className="text-xs text-neutral-500 space-y-1.5">
                            <p>· Las sesiones expiran automáticamente tras 7 días o al cerrar sesión</p>
                            <p>· Se notifica en caso de acceso desde un nuevo dispositivo</p>
                            <p>· Todas las acciones quedan registradas en el log de auditoría</p>
                        </div>
                    </div>
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
        active: { bg: "bg-emerald-500/10", text: "text-emerald-400", icon: "text-emerald-400" },
        coming: { bg: "bg-amber-500/10", text: "text-amber-400", icon: "text-amber-400" },
        warning: { bg: "bg-red-500/10", text: "text-red-400", icon: "text-red-400" },
    }[status];

    return (
        <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                    <Icon size={14} className={colors.icon} />
                </div>
                <div>
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-xs text-neutral-500">{sublabel}</p>
                </div>
            </div>
            <span className={`text-xs ${colors.bg} ${colors.text} px-2 py-1 rounded-full font-medium`}>
                {statusText}
            </span>
        </div>
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
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Lock size={18} className="text-amber-400" />
                Cambiar Contraseña
            </h3>

            {!isOpen ? (
                <div className="space-y-4">
                    <p className="text-sm text-neutral-400">
                        Tu contraseña está protegida con Argon2id, el estándar recomendado por OWASP y NIST SP 800-63B.
                    </p>
                    <button
                        onClick={() => setIsOpen(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all text-sm font-medium"
                    >
                        <Key size={16} />
                        Cambiar contraseña
                    </button>
                </div>
            ) : (
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                    {/* Current Password */}
                    <div>
                        <label className="text-xs text-neutral-400 block mb-1.5">Contraseña actual</label>
                        <div className="relative">
                            <input
                                type={showCurrent ? "text" : "password"}
                                value={form.currentPassword}
                                onChange={(e) => setForm(p => ({ ...p, currentPassword: e.target.value }))}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-accent-1 focus:ring-1 focus:ring-accent-1/30 outline-none transition-all pr-10"
                                placeholder="••••••••••••"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent(!showCurrent)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                            >
                                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {errors.currentPassword && (
                            <p className="text-xs text-red-400 mt-1">{errors.currentPassword}</p>
                        )}
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="text-xs text-neutral-400 block mb-1.5">Nueva contraseña</label>
                        <div className="relative">
                            <input
                                type={showNew ? "text" : "password"}
                                value={form.newPassword}
                                onChange={(e) => setForm(p => ({ ...p, newPassword: e.target.value }))}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-accent-1 focus:ring-1 focus:ring-accent-1/30 outline-none transition-all pr-10"
                                placeholder="Mínimo 12 caracteres"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                            >
                                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {form.newPassword && (
                            <div className="mt-2 space-y-1.5">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div
                                            key={i}
                                            className={`h-1 flex-1 rounded-full transition-all ${i <= strength.level ? strength.color : "bg-white/10"
                                                }`}
                                        />
                                    ))}
                                </div>
                                <p className={`text-xs ${strength.level <= 1 ? "text-red-400" :
                                    strength.level <= 2 ? "text-amber-400" :
                                        strength.level <= 3 ? "text-blue-400" : "text-emerald-400"
                                    }`}>
                                    {strength.label}
                                </p>
                            </div>
                        )}
                        <div className="mt-2 grid grid-cols-2 gap-1">
                            <PasswordReq met={form.newPassword.length >= 12} text="12+ caracteres" />
                            <PasswordReq met={/[A-Z]/.test(form.newPassword)} text="Mayúscula" />
                            <PasswordReq met={/[a-z]/.test(form.newPassword)} text="Minúscula" />
                            <PasswordReq met={/\d/.test(form.newPassword)} text="Número" />
                            <PasswordReq met={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(form.newPassword)} text="Especial" />
                        </div>
                        {errors.newPassword && (
                            <p className="text-xs text-red-400 mt-1">{errors.newPassword}</p>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="text-xs text-neutral-400 block mb-1.5">Confirmar nueva contraseña</label>
                        <input
                            type="password"
                            value={form.confirmPassword}
                            onChange={(e) => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-accent-1 focus:ring-1 focus:ring-accent-1/30 outline-none transition-all"
                            placeholder="Repetir nueva contraseña"
                            autoComplete="new-password"
                        />
                        {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                <AlertTriangle size={12} /> Las contraseñas no coinciden
                            </p>
                        )}
                        {form.confirmPassword && form.newPassword === form.confirmPassword && form.confirmPassword.length > 0 && (
                            <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                                <CheckCircle size={12} /> Coinciden
                            </p>
                        )}
                        {errors.confirmPassword && (
                            <p className="text-xs text-red-400 mt-1">{errors.confirmPassword}</p>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent-1/20 border border-accent-1/30 text-accent-1 hover:bg-accent-1/30 transition-all text-sm font-medium disabled:opacity-50"
                        >
                            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                            {saving ? "Guardando..." : "Actualizar contraseña"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                                setErrors({});
                            }}
                            className="px-4 py-2.5 rounded-xl bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-all text-sm"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

function PasswordReq({ met, text }: { met: boolean; text: string }) {
    return (
        <div className={`flex items-center gap-1.5 text-[11px] ${met ? "text-emerald-400" : "text-neutral-600"}`}>
            {met ? <CheckCircle size={10} /> : <div className="w-2.5 h-2.5 rounded-full border border-neutral-600" />}
            {text}
        </div>
    );
}

// ─── MFA Setup Card ────────────────────────────────────────────────
type MFAStep = "idle" | "loading" | "qr" | "verify" | "recovery" | "done";

function MFASetupCard({ initialMfaEnabled }: { initialMfaEnabled: boolean }) {
    const router = useRouter();
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
    const [copiedCodes, setCopiedCodes] = useState(false);
    const [setupPassword, setSetupPassword] = useState("");
    const [showSetupPassword, setShowSetupPassword] = useState(false);
    const [copiedManualKey, setCopiedManualKey] = useState(false);
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

    const handleCopyRecoveryCodes = () => {
        navigator.clipboard.writeText(recoveryCodes.join("\n"));
        setCopiedCodes(true);
        toast.success("Códigos copiados al portapapeles");
        setTimeout(() => setCopiedCodes(false), 2000);
    };

    const handleCopyManualKey = () => {
        navigator.clipboard.writeText(manualEntryKey);
        setCopiedManualKey(true);
        toast.success("Clave manual copiada");
        setTimeout(() => setCopiedManualKey(false), 2000);
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
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Smartphone size={18} className="text-indigo-400" />
                Autenticación de Dos Factores (2FA)
            </h3>

            {mfaEnabled && step === "idle" ? (
                /* MFA is enabled */
                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                        <ShieldCheck size={20} className="text-emerald-400" />
                        <div>
                            <p className="text-sm font-medium text-emerald-400">2FA Activo</p>
                            <p className="text-xs text-neutral-500">Tu cuenta está protegida con autenticación de dos factores</p>
                        </div>
                    </div>

                    {showDisable ? (
                        <div className="space-y-3">
                            <p className="text-xs text-red-400">Ingresa tu código TOTP actual para desactivar 2FA:</p>
                            <input
                                type="text"
                                maxLength={6}
                                value={disableCode}
                                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                className="w-full bg-black/30 border border-red-500/30 rounded-xl px-4 py-2.5 text-white text-center text-xl font-mono tracking-[0.5em] focus:border-red-500 focus:ring-1 focus:ring-red-500/30 outline-none transition-all"
                                placeholder="000000"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDisable}
                                    disabled={disabling}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all text-sm font-medium disabled:opacity-50"
                                >
                                    {disabling ? <Loader2 size={16} className="animate-spin" /> : <ShieldOff size={16} />}
                                    Desactivar
                                </button>
                                <button
                                    onClick={() => { setShowDisable(false); setDisableCode(""); }}
                                    className="px-4 py-2 rounded-xl bg-white/5 text-neutral-400 hover:text-white text-sm"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowDisable(true)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all text-sm"
                        >
                            <ShieldOff size={14} />
                            Desactivar 2FA
                        </button>
                    )}
                </div>
            ) : step === "idle" || step === "loading" ? (
                /* MFA setup not started */
                <div className="space-y-4">
                    <p className="text-sm text-neutral-400">
                        Protege tu cuenta con una aplicación de autenticación como Google Authenticator, Authy o 1Password.
                    </p>
                    <div className="space-y-2">
                        <label className="text-xs text-neutral-400 block">
                            Confirma tu contraseña actual
                        </label>
                        <div className="relative">
                            <input
                                type={showSetupPassword ? "text" : "password"}
                                value={setupPassword}
                                onChange={(e) => setSetupPassword(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white focus:border-accent-1 focus:ring-1 focus:ring-accent-1/30 outline-none transition-all"
                                placeholder="Tu contraseña actual"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowSetupPassword((current) => !current)}
                                className="absolute inset-y-0 right-3 flex items-center text-neutral-500 hover:text-white transition-colors"
                                aria-label={showSetupPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            >
                                {showSetupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <p className="text-[11px] text-neutral-500">
                            Se requiere para prevenir activación de 2FA desde una sesión robada.
                        </p>
                    </div>
                    <button
                        onClick={handleSetup}
                        disabled={step === "loading"}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all text-sm font-medium disabled:opacity-50"
                    >
                        {step === "loading" ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
                        {step === "loading" ? "Generando..." : "Configurar 2FA"}
                    </button>
                </div>
            ) : step === "qr" ? (
                /* Show QR code */
                <div className="space-y-4">
                    <div className="p-4 bg-white rounded-xl mx-auto w-fit">
                        {/* QR Code generated from otpauth URI */}
                        <QRCodeDisplay uri={qrURI} />
                    </div>
                    <p className="text-xs text-neutral-400 text-center">
                        Escanea este código QR con tu aplicación de autenticación
                    </p>
                    <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs text-neutral-400">
                            Si tu app no detecta el QR, agrega la cuenta manualmente con esta clave:
                        </p>
                        <div className="rounded-lg bg-black/30 px-3 py-2 font-mono text-sm break-all text-white">
                            {manualEntryKey}
                        </div>
                        <button
                            type="button"
                            onClick={handleCopyManualKey}
                            className="inline-flex items-center gap-2 text-xs text-accent-1 hover:text-accent-1/80 transition-colors"
                        >
                            {copiedManualKey ? <Check size={12} /> : <Copy size={12} />}
                            {copiedManualKey ? "Clave copiada" : "Copiar clave manual"}
                        </button>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-neutral-400 block">Ingresa el código de 6 dígitos de tu app:</label>
                        <input
                            type="text"
                            maxLength={6}
                            value={verifyCode}
                            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl font-mono tracking-[0.5em] focus:border-accent-1 focus:ring-1 focus:ring-accent-1/30 outline-none transition-all"
                            placeholder="000000"
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                        />
                    </div>
                    <button
                        onClick={handleVerify}
                        disabled={verifying || verifyCode.length !== 6}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent-1/20 border border-accent-1/30 text-accent-1 hover:bg-accent-1/30 transition-all text-sm font-medium disabled:opacity-50"
                    >
                        {verifying ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                        {verifying ? "Verificando..." : "Verificar y Activar"}
                    </button>
                </div>
            ) : step === "recovery" ? (
                /* Show recovery codes */
                <div className="space-y-4">
                    <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                        <p className="text-xs text-amber-400 flex items-center gap-2">
                            <AlertTriangle size={14} />
                            Guarda estos códigos de recuperación. Solo se mostrarán una vez.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-4 bg-black/30 rounded-xl">
                        {recoveryCodes.map((code, i) => (
                            <span key={i} className="text-xs font-mono text-white text-center py-1">
                                {code}
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopyRecoveryCodes}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:bg-white/10 transition-all text-sm"
                        >
                            {copiedCodes ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            {copiedCodes ? "Copiados" : "Copiar"}
                        </button>
                        <button
                            onClick={handleDownloadCodes}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:bg-white/10 transition-all text-sm"
                        >
                            <Download size={14} />
                            Descargar
                        </button>
                    </div>
                    <button
                        onClick={handleFinishEnrollment}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-sm font-medium"
                    >
                        <CheckCircle size={16} />
                        {returnToPath ? "Guardar códigos y continuar" : "Ya guardé mis códigos"}
                    </button>
                </div>
            ) : null}
        </div>
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
        return (
            <div className="w-48 h-48 flex items-center justify-center text-center text-xs text-neutral-500 px-4">
                No se pudo generar el QR localmente. Reintenta la configuración.
            </div>
        );
    }

    if (!qrDataUrl) {
        return (
            <div className="w-48 h-48 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-neutral-400" />
            </div>
        );
    }

    return <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />;
}

// ─── Sessions Tab ──────────────────────────────────────────────────
function SessionsTab({ sessions, onRevoke }: { sessions: SessionInfo[]; onRevoke: (id: string) => void }) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Monitor size={18} className="text-indigo-400" />
                    Sesiones Activas
                    <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full">
                        {sessions.length}
                    </span>
                </h3>
            </div>

            {sessions.length === 0 ? (
                <div className="text-center py-12 bg-white/[0.02] border border-white/10 rounded-2xl">
                    <Monitor size={40} className="mx-auto text-neutral-700 mb-3" />
                    <p className="text-neutral-400">No hay sesiones activas registradas</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {sessions.map((session, idx) => (
                        <motion.div
                            key={session.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="group bg-white/[0.02] border border-white/10 rounded-xl hover:border-white/20 transition-all overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <span className="text-2xl shrink-0">{getDeviceIcon(session.device, session.os)}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-white">
                                            {session.browser || "Navegador desconocido"}
                                            {session.os && <span className="text-neutral-500"> en {session.os}</span>}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                            {session.device && (
                                                <span className="text-xs text-neutral-500 flex items-center gap-1">
                                                    <Monitor size={10} />
                                                    {session.device}
                                                </span>
                                            )}
                                            {(session.country || session.countryCode) && (
                                                <span className="text-xs text-neutral-400 flex items-center gap-1">
                                                    <span>{countryCodeToFlag(session.countryCode)}</span>
                                                    {[session.city, session.country].filter(Boolean).join(", ")}
                                                </span>
                                            )}
                                            {session.ipAddress && (
                                                <span className="text-xs text-neutral-500 font-mono flex items-center gap-1">
                                                    <Globe size={10} />
                                                    {session.ipAddress}
                                                </span>
                                            )}
                                            <span className="text-xs text-neutral-500 flex items-center gap-1">
                                                <Clock size={10} />
                                                {timeAgo(session.lastActivity)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {idx === 0 && (
                                        <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">
                                            ACTUAL
                                        </span>
                                    )}
                                    <button
                                        onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
                                        className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-white/5 transition-all"
                                        title="Ver detalles"
                                    >
                                        <ChevronDown size={14} className={`transition-transform ${expandedId === session.id ? "rotate-180" : ""}`} />
                                    </button>
                                    <button
                                        onClick={() => onRevoke(session.id)}
                                        className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Revocar sesión"
                                    >
                                        <LogOut size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Expanded details */}
                            <AnimatePresence>
                                {expandedId === session.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-4 pb-4 pt-2 border-t border-white/5 space-y-2">
                                            <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                                                <div className="sm:col-span-2">
                                                    <span className="text-neutral-600">IP Completa</span>
                                                    <p className="text-neutral-300 font-mono break-all">{session.ipAddress || "—"}</p>
                                                </div>
                                                <div>
                                                    <span className="text-neutral-600">País</span>
                                                    <p className="text-neutral-300">
                                                        {session.countryCode && <span className="mr-1">{countryCodeToFlag(session.countryCode)}</span>}
                                                        {session.country || "—"}
                                                        {session.countryCode && <span className="text-neutral-600 ml-1">({session.countryCode})</span>}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-neutral-600">Navegador</span>
                                                    <p className="text-neutral-300">{session.browser || "—"}</p>
                                                </div>
                                                <div>
                                                    <span className="text-neutral-600">Dispositivo</span>
                                                    <p className="text-neutral-300">{session.device || "—"}</p>
                                                </div>
                                                <div>
                                                    <span className="text-neutral-600">Sistema Operativo</span>
                                                    <p className="text-neutral-300">{session.os || "—"}</p>
                                                </div>
                                                <div>
                                                    <span className="text-neutral-600">Ciudad</span>
                                                    <p className="text-neutral-300">
                                                        {session.city ? (
                                                            <span className="flex items-center gap-1"><MapPin size={10} />{session.city}</span>
                                                        ) : "—"}
                                                    </p>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-neutral-600">Iniciada</span>
                                                    <p className="text-neutral-300">{formatDateTime(session.createdAt)}</p>
                                                </div>
                                            </div>
                                            {session.userAgent && (
                                                <div>
                                                    <span className="text-xs text-neutral-600">User-Agent</span>
                                                    <p className="text-[10px] text-neutral-500 font-mono break-all mt-0.5">{session.userAgent}</p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            )}

            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 mt-4">
                <p className="text-xs text-neutral-600">
                    <Shield size={12} className="inline mr-1.5 text-neutral-500" />
                    Puedes revocar cualquier sesión activa. La sesión actual está marcada como &quot;ACTUAL&quot;.
                    Expande cada sesión para ver todos los detalles (IP, navegador, dispositivo, país).
                </p>
            </div>
        </div>
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

    const moduleLabels: Record<string, { label: string; icon: string }> = {
        dashboard: { label: "Dashboard", icon: "📊" },
        analytics: { label: "Analytics", icon: "📈" },
        quotations: { label: "Cotizaciones", icon: "📄" },
        cv: { label: "Editor CV", icon: "📝" },
        tools: { label: "Herramientas", icon: "🛠️" },
        users: { label: "Usuarios", icon: "👥" },
        audit: { label: "Auditoría", icon: "🔍" },
        security: { label: "Seguridad", icon: "🔒" },
        contact: { label: "Contacto", icon: "✉️" },
        notifications: { label: "Notificaciones", icon: "🔔" },
        finance: { label: "Finanzas", icon: "💰" },
        crm: { label: "Gestión Comercial", icon: "🏢" },
        general: { label: "General", icon: "⚙️" },
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Key size={18} className="text-amber-400" />
                    Permisos Efectivos
                    <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full">
                        {permissions.length}
                    </span>
                </h3>
                <span className="text-xs text-neutral-500">
                    Rol base: <span className="text-accent-1 font-semibold">{role}</span>
                </span>
            </div>

            {role === "SUPERADMIN" && (
                <div className="p-4 bg-accent-1/5 border border-accent-1/20 rounded-xl">
                    <p className="text-sm text-accent-1">
                        <Shield size={14} className="inline mr-2" />
                        Como SUPERADMIN tienes acceso completo a todos los módulos del sistema.
                        Los permisos granulares se aplican adicionalmente a usuarios con roles inferiores.
                    </p>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(grouped)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([module, perms]) => {
                        const meta = moduleLabels[module] || { label: module, icon: "📦" };
                        return (
                            <motion.div
                                key={module}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white/[0.02] border border-white/10 rounded-xl p-4"
                            >
                                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                    <span>{meta.icon}</span>
                                    {meta.label}
                                    <span className="text-[10px] text-neutral-600 ml-auto">{perms.length}</span>
                                </h4>
                                <div className="space-y-1.5">
                                    {perms.map((p) => (
                                        <div key={p.name} className="flex items-start gap-2 text-xs group">
                                            <CheckCircle size={12} className="text-emerald-400/60 shrink-0 mt-0.5" />
                                            <div>
                                                <span className="text-neutral-300">{p.name}</span>
                                                {p.description && (
                                                    <p className="text-neutral-600 text-[10px] mt-0.5 hidden group-hover:block">
                                                        {p.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        );
                    })}
            </div>
        </div>
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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Activity size={18} className="text-purple-400" />
                    Actividad Reciente
                    <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full">
                        {totalCount}
                    </span>
                </h3>
                <span className="text-xs text-neutral-600">
                    Mostrando {rangeStart}-{rangeEnd} de {totalCount}
                </span>
            </div>

            {activities.length === 0 ? (
                <div className="text-center py-12 bg-white/[0.02] border border-white/10 rounded-2xl">
                    <Activity size={40} className="mx-auto text-neutral-700 mb-3" />
                    <p className="text-neutral-400">Sin actividad registrada</p>
                </div>
            ) : (
                <div className="relative">
                    <div className="absolute left-[19px] top-2 bottom-2 w-px bg-white/10" />
                    <div className="space-y-0">
                        {activities.map((activity, idx) => {
                            const isSecurityEvent = activity.action.includes("password") ||
                                activity.action.includes("session") ||
                                activity.action.includes("login") ||
                                activity.action.includes("logout") ||
                                activity.action === "PASSWORD_CHANGE_FAILED";

                            return (
                                <motion.div
                                    key={activity.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx < 15 ? idx * 0.03 : 0 }}
                                    className="relative flex items-start gap-4 py-3 pl-2"
                                >
                                    <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center z-10 shrink-0 mt-0.5 ${isSecurityEvent
                                        ? "bg-amber-500/10 border-amber-500/30"
                                        : "bg-white/10 border-white/20"
                                        }`}>
                                        <div className={`w-2 h-2 rounded-full ${isSecurityEvent ? "bg-amber-400" : "bg-accent-1"
                                            }`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm text-white font-medium">
                                                {ACTION_LABELS[activity.action] || activity.action}
                                            </p>
                                            {isSecurityEvent && (
                                                <Shield size={12} className="text-amber-400" />
                                            )}
                                        </div>
                                        {activity.details && activity.details !== "{}" && activity.details !== "null" && (
                                            <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-md">
                                                {activity.details.substring(0, 120)}
                                            </p>
                                        )}
                                        <p className="text-[11px] text-neutral-600 mt-1">
                                            {timeAgo(activity.createdAt)} · {formatDateTime(activity.createdAt)}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={loading || page === 1}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-neutral-300 transition-all hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Anterior
                    </button>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {paginationItems.map((item, index) => (
                            typeof item === "number" ? (
                                <button
                                    key={item}
                                    onClick={() => handlePageChange(item)}
                                    disabled={loading}
                                    className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium transition-all ${page === item
                                        ? "bg-accent-1/20 text-accent-1 border border-accent-1/30"
                                        : "border border-white/10 text-neutral-400 hover:border-white/20 hover:text-white"
                                        } disabled:opacity-50`}
                                >
                                    {item}
                                </button>
                            ) : (
                                <span key={`${item}-${index}`} className="px-1 text-sm text-neutral-600">
                                    ...
                                </span>
                            )
                        ))}
                    </div>

                    <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={loading || page === totalPages}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-neutral-300 transition-all hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                        Siguiente
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Shared Components ─────────────────────────────────────────────
function InfoRow({ label, value, badge, mono, wrap }: { label: string; value: string; badge?: boolean; mono?: boolean; wrap?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-3 py-2 border-b border-white/5 last:border-0">
            <span className="text-sm text-neutral-400 shrink-0 pt-0.5">{label}</span>
            {badge ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent-1/10 text-accent-1 border border-accent-1/20 truncate">
                    {value}
                </span>
            ) : (
                <span className={`min-w-0 flex-1 text-right text-sm text-white font-medium ${mono ? "font-mono text-xs" : ""} ${wrap ? "break-all whitespace-normal" : "truncate"}`} title={value}>
                    {value}
                </span>
            )}
        </div>
    );
}
