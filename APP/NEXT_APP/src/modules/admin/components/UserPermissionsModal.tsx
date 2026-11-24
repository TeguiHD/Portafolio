"use client";

import { useState, useEffect, useCallback, useId, useRef } from "react";
import { Loader2, X } from "lucide-react";

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

/** Nombre en castellano de cada familia de permisos (las de src/lib/permissions.ts y prisma/seed.ts). */
const CATEGORY_NAMES: Record<string, string> = {
    dashboard: "Hoy",
    analytics: "Visitas",
    tools: "Herramientas",
    quotations: "Cotizaciones",
    users: "Usuarios",
    cv: "Editor de CV",
    notifications: "Notificaciones",
    audit: "Auditoría",
    collaboration: "Colaboración",
    contact: "Mensajes",
    crm: "Comercial",
    finance: "Finanzas",
    jobs: "Empleos",
    security: "Seguridad",
    superadmin: "Servidor",
    dev: "Desarrollo",
    images: "Imágenes",
    networking: "Redes",
    utility: "Utilidades",
};

const ROLE_NAMES: Record<string, string> = {
    SUPERADMIN: "Superadmin",
    ADMIN: "Administrador",
    MODERATOR: "Moderador",
    USER: "Usuario",
};

const boton = "inline-flex min-h-9 items-center rounded-lg px-2.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)] motion-reduce:transition-none max-sm:min-h-11";

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
    const [errorCambio, setErrorCambio] = useState<string | null>(null);
    const ref = useRef<HTMLDialogElement>(null);
    const id = useId();

    const loadPermissions = useCallback(async () => {
        setLoading(true);
        setError(null);
        setErrorCambio(null);
        try {
            const res = await fetch(`/api/admin/users/${userId}/permissions`);
            if (!res.ok) throw new Error("Failed to load permissions");
            const data = await res.json();
            setPermissions(data.permissions || []);
        } catch (err) {
            setError("No se pudieron cargar los permisos.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (isOpen && userId) {
            loadPermissions();
        }
    }, [isOpen, userId, loadPermissions]);

    // <dialog> nativo: se abre y cierra según `isOpen`; Escape o «Cerrar» avisan al padre con `onClose`.
    useEffect(() => {
        const d = ref.current;
        if (!d) return;
        if (isOpen && !d.open) d.showModal();
        else if (!isOpen && d.open) d.close();
    }, [isOpen]);

    const updatePermission = async (
        permissionCode: string,
        action: "grant" | "revoke" | "reset"
    ) => {
        setUpdating(permissionCode);
        setErrorCambio(null);
        try {
            const res = await fetch(`/api/admin/users/${userId}/permissions`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ permissionCode, action }),
            });
            if (!res.ok) {
                // La API explica por qué (ya en español); antes el error se perdía en la consola.
                const data: unknown = await res.json().catch(() => null);
                const motivo = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : null;
                setErrorCambio(motivo ?? "No se pudo cambiar el permiso.");
                throw new Error("Failed to update permission");
            }
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
        <dialog
            ref={ref}
            aria-labelledby={`${id}-t`}
            aria-describedby={`${id}-d`}
            onClose={() => { if (isOpen) onClose(); }}
            className="m-auto w-[calc(100%-24px)] max-w-2xl max-h-[min(88dvh,900px)] overflow-hidden rounded-2xl border border-[var(--linea-2)] bg-[var(--sup)] p-0 text-[var(--txt)] shadow-2xl overscroll-contain backdrop:bg-[rgb(4_6_10/0.55)] backdrop:overflow-hidden backdrop:overscroll-contain"
        >
            {isOpen ? (
                <div className="flex max-h-[min(88dvh,900px)] flex-col">
                    {/* Encabezado */}
                    <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--linea)] px-5 py-4">
                        <div className="min-w-0">
                            <h2 id={`${id}-t`} className="text-lg font-semibold">
                                Permisos de {userName || "Usuario"}
                            </h2>
                            <p id={`${id}-d`} className="mt-0.5 text-sm text-[var(--mut)]">
                                Rol: <span className="font-medium text-[var(--txt)]">{ROLE_NAMES[userRole] ?? userRole}</span>
                                {". "}Los cambios se aplican de inmediato.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => ref.current?.close()}
                            aria-label="Cerrar"
                            className="-mr-2 grid size-10 shrink-0 place-items-center rounded-lg text-[var(--mut)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] hover:text-[var(--txt)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)] motion-reduce:transition-none max-sm:size-11"
                        >
                            <X size={18} aria-hidden="true" />
                        </button>
                    </header>

                    {/* Contenido */}
                    <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
                        {loading ? (
                            <p className="flex h-40 items-center justify-center gap-2 text-sm text-[var(--mut)]" role="status">
                                <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Cargando permisos…
                            </p>
                        ) : error ? (
                            <p role="alert" className="py-12 text-center text-sm text-red-400">{error}</p>
                        ) : (
                            <div className="space-y-6">
                                {errorCambio && <p role="alert" className="text-sm text-[var(--error)]">{errorCambio}</p>}
                                {Object.entries(groupedPermissions).map(([category, perms]) => (
                                    <section key={category} aria-labelledby={`${id}-${category}`}>
                                        <h3 id={`${id}-${category}`} className="mb-1 text-[15px] font-semibold text-[var(--mut)]">
                                            {CATEGORY_NAMES[category] ?? category}
                                        </h3>
                                        <ul className="border-t border-[var(--linea)]">
                                            {perms.map((perm) => (
                                                <li
                                                    key={perm.code}
                                                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[var(--linea)] px-1 py-2.5"
                                                >
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        {/* El punto repite lo que dice el texto de abajo */}
                                                        <span
                                                            aria-hidden="true"
                                                            className={`size-2.5 shrink-0 rounded-full ${perm.hasPermission
                                                                ? perm.source === "granted"
                                                                    ? "bg-emerald-400"
                                                                    : "bg-[var(--acento)]"
                                                                : "bg-red-400"
                                                                }`}
                                                        />
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-[var(--txt)]">{perm.name}</p>
                                                            <p className="text-xs text-[var(--mut)]">
                                                                {perm.source === "role"
                                                                    ? perm.hasPermission ? "Lo da su rol" : "Su rol no lo incluye"
                                                                    : perm.source === "granted"
                                                                        ? "Otorgado a mano"
                                                                        : "Revocado a mano"}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Acciones */}
                                                    <div className="flex items-center gap-1">
                                                        {updating === perm.code ? (
                                                            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--mut)]" role="status">
                                                                <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Guardando…
                                                            </span>
                                                        ) : (
                                                            <>
                                                                {!perm.hasPermission && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updatePermission(perm.code, "grant")}
                                                                        aria-label={`Otorgar «${perm.name}»`}
                                                                        className={`${boton} bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20`}
                                                                    >
                                                                        Otorgar
                                                                    </button>
                                                                )}
                                                                {perm.hasPermission && perm.source !== "revoked" && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updatePermission(perm.code, "revoke")}
                                                                        aria-label={`Revocar «${perm.name}»`}
                                                                        className={`${boton} bg-red-500/10 text-red-400 hover:bg-red-500/20`}
                                                                    >
                                                                        Revocar
                                                                    </button>
                                                                )}
                                                                {perm.source !== "role" && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updatePermission(perm.code, "reset")}
                                                                        aria-label={`Volver «${perm.name}» a lo que da su rol`}
                                                                        title="Volver a lo que da su rol"
                                                                        className={`${boton} border border-[var(--linea-2)] text-[var(--txt)] hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)]`}
                                                                    >
                                                                        Restaurar
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pie */}
                    <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--linea)] px-5 py-3">
                        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--mut)]" aria-label="Leyenda">
                            <li className="flex items-center gap-1.5">
                                <span className="size-2 rounded-full bg-[var(--acento)]" aria-hidden="true" /> Por rol
                            </li>
                            <li className="flex items-center gap-1.5">
                                <span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" /> Otorgado
                            </li>
                            <li className="flex items-center gap-1.5">
                                <span className="size-2 rounded-full bg-red-400" aria-hidden="true" /> Revocado
                            </li>
                        </ul>
                        <button
                            type="button"
                            onClick={() => ref.current?.close()}
                            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--acento)] px-4 text-sm font-semibold text-[var(--acento-tinta)] transition-opacity duration-150 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)] motion-reduce:transition-none max-sm:min-h-11"
                        >
                            Cerrar
                        </button>
                    </footer>
                </div>
            ) : null}
        </dialog>
    );
}
