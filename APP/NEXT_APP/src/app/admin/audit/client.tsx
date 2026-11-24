"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Shield, Search, ChevronLeft, ChevronRight,
    User, LogIn, LogOut, UserPlus, UserMinus, Key, Lock, Unlock,
    Settings, AlertTriangle, RefreshCw, Wallet, Target,
    Receipt, Plus, Edit, Trash2, X
} from "lucide-react";
import { EsqueletoSeccion } from "@/modules/admin/armazon/EsqueletoSeccion";

interface AuditLog {
    id: string;
    action: string;
    category: string;
    userId: string | null;
    user: { id: string; name: string | null; email: string } | null;
    targetId: string | null;
    targetType: string | null;
    metadata: Record<string, unknown> | null;
    ipAddress: string | null;
    createdAt: string;
}

// Estilos comunes (tokens del tema: valen en claro y oscuro).
const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)]";
const HOVER = "hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)]";
const BTN_ICONO = `grid place-items-center size-10 max-sm:size-11 shrink-0 rounded-lg text-[var(--mut)] transition-colors hover:text-[var(--txt)] hover:bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] disabled:opacity-40 disabled:cursor-not-allowed motion-reduce:transition-none ${FOCO}`;
// Los selectores de fecha siguen el tema (sin esto, en oscuro el calendario sale claro).
const ESQUEMA = "[color-scheme:dark] [:root[data-tema=claro]_&]:[color-scheme:light]";
const CAMPO = `min-h-10 max-sm:min-h-11 px-3 rounded-lg bg-[var(--fondo-2)] border border-[var(--linea-2)] text-sm text-[var(--txt)] placeholder:text-[var(--mut)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--acento)] ${ESQUEMA}`;
const PILDORA = `shrink-0 inline-flex items-center gap-1.5 min-h-10 max-sm:min-h-11 px-3 rounded-full border text-sm font-medium transition-colors motion-reduce:transition-none ${FOCO}`;
const PILDORA_INACTIVA = `border-[var(--linea-2)] text-[var(--mut)] hover:text-[var(--txt)] ${HOVER}`;

const actionIcons: Record<string, React.ReactNode> = {
    "login.success": <LogIn size={16} className="text-green-400" />,
    "login.failed": <AlertTriangle size={16} className="text-red-400" />,
    "logout": <LogOut size={16} className="text-[var(--mut)]" />,
    "account.locked": <Lock size={16} className="text-red-400" />,
    "account.unlocked": <Unlock size={16} className="text-green-400" />,
    "user.created": <UserPlus size={16} className="text-blue-400" />,
    "user.deleted": <UserMinus size={16} className="text-red-400" />,
    "user.role.changed": <Settings size={16} className="text-yellow-400" />,
    "password.changed": <Key size={16} className="text-purple-400" />,
    "permission.granted": <Shield size={16} className="text-green-400" />,
    "permission.revoked": <Shield size={16} className="text-red-400" />,
    // Finance actions
    "transaction.created": <Plus size={16} className="text-green-400" />,
    "transaction.updated": <Edit size={16} className="text-yellow-400" />,
    "transaction.deleted": <Trash2 size={16} className="text-red-400" />,
    "finance.account.created": <Wallet size={16} className="text-blue-400" />,
    "finance.account.updated": <Wallet size={16} className="text-yellow-400" />,
    "finance.account.deleted": <Wallet size={16} className="text-red-400" />,
    "budget.created": <Target size={16} className="text-blue-400" />,
    "budget.exceeded": <AlertTriangle size={16} className="text-amber-400" />,
    "goal.completed": <Target size={16} className="text-green-400" />,
    "ocr.processed": <Receipt size={16} className="text-purple-400" />,
    "ocr.failed": <Receipt size={16} className="text-red-400" />,
    // Security actions
    "session.concurrent": <AlertTriangle size={16} className="text-amber-400" />,
    "session.revoked": <Lock size={16} className="text-red-400" />,
    "autonomous_defense.decision": <Shield size={16} className="text-cyan-400" />,
    "autonomous_defense.approval_required": <AlertTriangle size={16} className="text-amber-400" />,
};

/** Insignia de cada categoría (fondo suave y texto del mismo tono; siempre con el nombre). */
const categoryColors: Record<string, string> = {
    auth: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    users: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    security: "bg-red-500/10 text-red-400 border-red-500/30",
    tools: "bg-green-500/10 text-green-400 border-green-500/30",
    quotations: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    finance: "bg-pink-500/10 text-pink-400 border-pink-500/30",
    system: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
};

/** Nombre en español de cada acción registrada (las de src/lib/audit.ts); si llega una nueva, se muestra su código. */
const diaChile = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(d);

/**
 * La lista muestra las acciones en castellano, pero se guardan con su código («login.failed»). Si lo buscado calza con
 * nombres de la lista, se busca por el código (o por lo que tienen en común); si no, tal cual, en minúsculas.
 */
function codigoDeBusqueda(texto: string): string {
    const q = texto.toLocaleLowerCase("es");
    const codigos = Object.entries(actionLabels).filter(([, nombre]) => nombre.toLocaleLowerCase("es").includes(q)).map(([c]) => c);
    if (codigos.length === 0) return q;
    let comun = codigos[0]!;
    for (const c of codigos.slice(1)) {
        let i = 0;
        while (i < comun.length && i < c.length && comun[i] === c[i]) i++;
        comun = comun.slice(0, i);
    }
    return comun.length >= 3 ? comun : q;
}

const actionLabels: Record<string, string> = {
    "login.success": "Inicio de sesión",
    "login.failed": "Intento fallido de inicio de sesión",
    "logout": "Cierre de sesión",
    "account.locked": "Cuenta bloqueada",
    "account.unlocked": "Cuenta desbloqueada",
    "user.created": "Usuario creado",
    "user.updated": "Usuario actualizado",
    "user.deleted": "Usuario eliminado",
    "user.role.changed": "Cambio de rol",
    "user.suspended": "Usuario suspendido",
    "user.activated": "Usuario activado",
    "password.changed": "Contraseña cambiada",
    "password.change_failed": "Intento fallido de cambio de contraseña",
    "permission.granted": "Permiso concedido",
    "permission.revoked": "Permiso quitado",
    "permission.reset": "Permiso restablecido",
    "session.concurrent": "Sesión simultánea detectada",
    "session.revoked": "Sesión cerrada a distancia",
    "autonomous_defense.decision": "Decisión de la defensa automática",
    "autonomous_defense.approval_required": "La defensa automática pide aprobación",
    "tool.created": "Herramienta creada",
    "tool.updated": "Herramienta actualizada",
    "tool.deleted": "Herramienta eliminada",
    "tool.visibility.changed": "Visibilidad de herramienta cambiada",
    "quotation.created": "Propuesta creada",
    "quotation.updated": "Propuesta actualizada",
    "quotation.deleted": "Propuesta eliminada",
    "transaction.created": "Movimiento registrado",
    "transaction.updated": "Movimiento actualizado",
    "transaction.deleted": "Movimiento eliminado",
    "transaction.batch": "Movimientos importados",
    "finance.account.created": "Cuenta creada",
    "finance.account.updated": "Cuenta actualizada",
    "finance.account.deleted": "Cuenta eliminada",
    "budget.created": "Presupuesto creado",
    "budget.updated": "Presupuesto actualizado",
    "budget.deleted": "Presupuesto eliminado",
    "budget.exceeded": "Presupuesto excedido",
    "goal.created": "Meta creada",
    "goal.updated": "Meta actualizada",
    "goal.completed": "Meta cumplida",
    "ocr.processed": "Boleta leída",
    "ocr.failed": "No se pudo leer la boleta",
};

const categoryLabels: Record<string, string> = {
    auth: "Autenticación",
    users: "Usuarios",
    security: "Seguridad",
    tools: "Herramientas",
    quotations: "Propuestas",
    finance: "Finanzas",
    system: "Sistema",
};

export default function AuditPageClient() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [categoryFilter, setCategoryFilter] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const hasActiveFilters = Boolean(categoryFilter || searchQuery || startDate || endDate);
    // Lo que se consulta: 300 ms después de dejar de escribir (antes, una consulta por tecla).
    const [busqueda, setBusqueda] = useState("");
    useEffect(() => {
        const t = setTimeout(() => setBusqueda(searchQuery.trim()), 300);
        return () => clearTimeout(t);
    }, [searchQuery]);
    // Un filtro nuevo vuelve a la página 1 (antes, en la página 5 de un filtro de una página, la lista salía vacía).
    useEffect(() => {
        setPage(1);
    }, [categoryFilter, busqueda, startDate, endDate]);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.set("page", String(page));
            params.set("limit", "30");
            if (categoryFilter) params.set("category", categoryFilter);
            if (busqueda) params.set("action", codigoDeBusqueda(busqueda));
            if (startDate) params.set("startDate", startDate);
            if (endDate) params.set("endDate", endDate);

            const res = await fetch(`/api/admin/audit?${params}`);
            if (!res.ok) throw new Error("Failed to fetch");

            const data = await res.json();
            setLogs(data.logs || []);
            setTotalPages(data.totalPages || 1);
            setTotal(data.total || 0);
        } catch {
            setError("Error cargando registros de auditoría");
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    }, [page, categoryFilter, busqueda, startDate, endDate]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString("es-CL", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Santiago",
        });
    };

    const formatAction = (action: string) => {
        return actionLabels[action] ?? action.replace(/\./g, " › ").replace(/_/g, " ");
    };

    // El esqueleto completo, solo en la primera carga
    if (initialLoading) {
        return <EsqueletoSeccion nombre="auditoría" barra filas={8} />;
    }

    return (
        <div className="max-w-[1180px] space-y-6">
            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[var(--txt)]">
                        Registro de auditoría
                    </h1>
                    <p className="mt-1 text-[15px] text-[var(--mut)]">
                        Historial de eventos de seguridad y acciones del sistema
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-mono text-sm tabular-nums text-[var(--mut)]">{total} registros</span>
                    <button
                        type="button"
                        aria-label="Actualizar"
                        onClick={fetchLogs}
                        className={`${BTN_ICONO} border border-[var(--linea-2)]`}
                    >
                        <RefreshCw size={16} aria-hidden="true" />
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="space-y-3">
                <div className="flex flex-col lg:flex-row gap-3">
                    {/* Búsqueda */}
                    <div className="relative flex-1 min-w-0 lg:max-w-sm">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mut)] pointer-events-none" aria-hidden="true" />
                        <input
                            type="search"
                            aria-label="Buscar en la auditoría"
                            placeholder="Buscar por acción"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`${CAMPO} w-full pl-9 pr-11`}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                aria-label="Borrar búsqueda"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-0.5 top-1/2 -translate-y-1/2 grid place-items-center size-9 rounded-md text-[var(--mut)] hover:text-[var(--txt)] focus-visible:outline-2 focus-visible:outline-[var(--acento)]"
                            >
                                <X size={16} aria-hidden="true" />
                            </button>
                        )}
                    </div>

                    {/* Categorías */}
                    <div role="group" aria-label="Categoría" className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-hide">
                        <button
                            type="button"
                            aria-pressed={!categoryFilter}
                            onClick={() => setCategoryFilter("")}
                            className={`${PILDORA} ${!categoryFilter
                                ? "border-transparent bg-[var(--acento)] text-[var(--acento-tinta)]"
                                : PILDORA_INACTIVA
                                }`}
                        >
                            Todas
                        </button>
                        {Object.entries(categoryLabels).map(([key, label]) => (
                            <button
                                type="button"
                                key={key}
                                aria-pressed={categoryFilter === key}
                                onClick={() => setCategoryFilter(categoryFilter === key ? "" : key)}
                                className={`${PILDORA} ${categoryFilter === key
                                    ? `${categoryColors[key]}`
                                    : PILDORA_INACTIVA
                                    }`}
                            >
                                <span aria-hidden="true" className={`size-1.5 rounded-full ${categoryFilter === key ? "bg-current" : "bg-[var(--linea-2)]"}`} />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Fechas */}
                <div className="flex flex-wrap items-center gap-2">
                    <div role="group" aria-label="Periodo" className="flex items-center gap-1">
                        {[
                            { label: "Hoy", days: 0 },
                            { label: "7 días", days: 7 },
                            { label: "30 días", days: 30 },
                        ].map((preset) => {
                            // Días de Chile (con toISOString, desde las 21:00 «hoy» ya era mañana).
                            const todayStr = diaChile(new Date());
                            const presetStartStr = diaChile(new Date(Date.parse(`${todayStr}T12:00:00Z`) - preset.days * 86_400_000));
                            const isActive = startDate === presetStartStr && endDate === todayStr;
                            return (
                                <button
                                    type="button"
                                    key={preset.label}
                                    aria-pressed={isActive}
                                    onClick={() => {
                                        setStartDate(presetStartStr);
                                        setEndDate(todayStr);
                                    }}
                                    className={`min-h-10 max-sm:min-h-11 px-3 rounded-lg text-sm transition-colors motion-reduce:transition-none ${FOCO} ${isActive
                                        ? "bg-[color-mix(in_srgb,var(--acento)_15%,transparent)] text-[var(--txt)] font-semibold"
                                        : `text-[var(--mut)] font-medium hover:text-[var(--txt)] ${HOVER}`
                                        }`}
                                >
                                    {preset.label}
                                </button>
                            );
                        })}
                    </div>

                    <span aria-hidden="true" className="hidden sm:block w-px h-5 bg-[var(--linea-2)]" />

                    <div className="flex items-center gap-2 max-sm:w-full">
                        <label htmlFor="audit-desde" className="text-sm text-[var(--mut)]">Desde</label>
                        <input
                            id="audit-desde"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={`${CAMPO} min-w-0 max-sm:flex-1`}
                        />
                        <label htmlFor="audit-hasta" className="text-sm text-[var(--mut)]">hasta</label>
                        <input
                            id="audit-hasta"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={`${CAMPO} min-w-0 max-sm:flex-1`}
                        />
                    </div>

                    {loading && (
                        <div role="status" className="ml-auto">
                            <RefreshCw size={16} className="text-[var(--acento)] animate-spin motion-reduce:animate-none" aria-hidden="true" />
                            <span className="sr-only">Cargando registros…</span>
                        </div>
                    )}

                    {hasActiveFilters && !loading && (
                        <button
                            type="button"
                            onClick={() => {
                                setStartDate("");
                                setEndDate("");
                                setCategoryFilter("");
                                setSearchQuery("");
                            }}
                            className={`ml-auto inline-flex items-center gap-1.5 min-h-10 max-sm:min-h-11 px-3 rounded-lg text-sm text-[var(--mut)] transition-colors hover:text-red-400 hover:bg-red-500/10 motion-reduce:transition-none ${FOCO}`}
                        >
                            <X size={16} aria-hidden="true" />
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <p role="alert" className="flex items-center gap-2 text-sm text-[var(--error)]">
                    <AlertTriangle size={16} aria-hidden="true" />
                    {error}
                </p>
            )}

            {/* Registros */}
            <div tabIndex={0} role="region" aria-label="Registros de auditoría" className={`overflow-x-auto border-t border-[var(--linea)] ${FOCO} focus-visible:outline-offset-0`}>
                <table className="w-full min-w-[720px] text-sm">
                    <thead>
                        <tr className="border-b border-[var(--linea)]">
                            <th scope="col" className="px-3 py-2 text-left text-sm font-medium text-[var(--mut)]">Fecha</th>
                            <th scope="col" className="px-3 py-2 text-left text-sm font-medium text-[var(--mut)]">Acción</th>
                            <th scope="col" className="px-3 py-2 text-left text-sm font-medium text-[var(--mut)]">Categoría</th>
                            <th scope="col" className="px-3 py-2 text-left text-sm font-medium text-[var(--mut)]">Usuario</th>
                            <th scope="col" className="px-3 py-2 text-left text-sm font-medium text-[var(--mut)]">Detalles</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-[var(--mut)]">
                                    No se encontraron registros
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr
                                    key={log.id}
                                    className={`border-b border-[var(--linea)] transition-colors motion-reduce:transition-none ${HOVER}`}
                                >
                                    <td className="px-3 py-3 text-[var(--mut)] whitespace-nowrap tabular-nums">
                                        {formatDate(log.createdAt)}
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="flex items-center gap-2">
                                            <span aria-hidden="true" className="shrink-0">
                                                {actionIcons[log.action] || <Settings size={16} className="text-[var(--mut)]" />}
                                            </span>
                                            <span className="text-[var(--txt)]">
                                                {formatAction(log.action)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${categoryColors[log.category] || categoryColors.system}`}>
                                            {categoryLabels[log.category] || log.category}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3">
                                        {log.user ? (
                                            <div className="flex items-center gap-2">
                                                <span aria-hidden="true" className="grid place-items-center size-6 shrink-0 rounded-full bg-[color-mix(in_srgb,var(--acento)_15%,transparent)]">
                                                    <User size={12} className="text-[var(--acento)]" />
                                                </span>
                                                <span className="text-[var(--txt)]">
                                                    {log.user.name || "Sin nombre"}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[var(--mut)]">Sistema</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-3 text-[var(--mut)]">
                                        {log.targetType && (
                                            <span>
                                                {log.targetType}: <span className="font-mono text-xs">{log.targetId?.slice(0, 8)}…</span>
                                            </span>
                                        )}
                                        {log.ipAddress && (
                                            <span className="ml-2 font-mono text-xs">
                                                IP: {log.ipAddress}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
                <nav aria-label="Páginas de la auditoría" className="flex items-center justify-center gap-2">
                    <button
                        type="button"
                        aria-label="Página anterior"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className={`${BTN_ICONO} border border-[var(--linea-2)]`}
                    >
                        <ChevronLeft size={18} aria-hidden="true" />
                    </button>
                    <span className="px-3 text-sm tabular-nums text-[var(--mut)]">
                        Página {page} de {totalPages}
                    </span>
                    <button
                        type="button"
                        aria-label="Página siguiente"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className={`${BTN_ICONO} border border-[var(--linea-2)]`}
                    >
                        <ChevronRight size={18} aria-hidden="true" />
                    </button>
                </nav>
            )}
        </div>
    );
}
