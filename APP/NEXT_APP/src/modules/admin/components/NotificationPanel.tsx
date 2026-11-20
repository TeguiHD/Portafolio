"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Bell,
    X,
    CheckCheck,
    User,
    Shield,
    FileText,
    AlertTriangle,
    Key,
    UserPlus,
    UserMinus,
    UserCog,
    Wrench,
    TrendingUp,
    Server,
    ArrowRight,
} from "lucide-react";

/*
 * Avisos de la barra del panel. Va en el armazón, así que se carga en todas las páginas: por eso no usa
 * framer-motion (la entrada es la animación CSS `ad-entra` de armazon.css y se apaga con «menos movimiento»).
 */

interface Notification {
    id: string;
    type: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
    isRead: boolean;
    createdAt: string;
    actorName?: string;
}

const typeIcons: Record<string, typeof Bell> = {
    USER_CREATED: UserPlus,
    USER_ROLE_CHANGED: UserCog,
    USER_SUSPENDED: UserMinus,
    USER_ACTIVATED: User,
    USER_DELETED: UserMinus,
    PASSWORD_CHANGED: Key,
    LOGIN_RATE_LIMITED: Shield,
    QUOTATION_CREATED: FileText,
    QUOTATION_STATUS_CHANGED: FileText,
    TOOL_STATUS_CHANGED: Wrench,
    TOOL_USAGE_SPIKE: TrendingUp,
    SYSTEM_ERROR: AlertTriangle,
    SYSTEM_MAINTENANCE: Server,
    CONCURRENT_SESSION_DETECTED: Shield,
    SESSION_FROM_NEW_LOCATION: Shield,
    SESSION_REVOKED: Key,
};

// La prioridad se ve en el color del ícono (y se lee en voz alta cuando es alta).
const COLOR_PRIORIDAD: Record<Notification["priority"], string> = {
    LOW: "text-[var(--mut)]",
    MEDIUM: "text-[var(--acento)]",
    HIGH: "text-amber-400",
    CRITICAL: "text-red-400",
};
const VOZ_PRIORIDAD: Partial<Record<Notification["priority"], string>> = {
    HIGH: "Prioridad alta. ",
    CRITICAL: "Prioridad crítica. ",
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "ahora";
    if (minutes < 60) return `hace ${minutes} min`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;

    const days = Math.floor(hours / 24);
    if (days === 1) return "ayer";
    if (days < 7) return `hace ${days} días`;

    return new Date(dateStr).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

const typeActionUrls: Record<string, string> = {
    CONCURRENT_SESSION_DETECTED: "/admin/profile?tab=sessions",
    SESSION_FROM_NEW_LOCATION: "/admin/profile?tab=sessions",
    SESSION_REVOKED: "/admin/profile?tab=sessions",
    PASSWORD_CHANGED: "/admin/profile?tab=security",
    USER_ROLE_CHANGED: "/admin/profile?tab=permissions",
};

function Aviso({ aviso, alLeer, alIr }: { aviso: Notification; alLeer: (id: string) => void; alIr: (href: string) => void }) {
    const Icono = typeIcons[aviso.type] || Bell;
    const destino = typeActionUrls[aviso.type];

    const contenido = (
        <>
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] ${COLOR_PRIORIDAD[aviso.priority]}`}>
                <Icono className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="block min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                    <span className={`block truncate text-sm font-medium ${aviso.isRead ? "text-[var(--mut)]" : "text-[var(--txt)]"}`}>
                        <span className="sr-only">{VOZ_PRIORIDAD[aviso.priority] ?? ""}{aviso.isRead ? "" : "Sin leer. "}</span>
                        {aviso.title}
                    </span>
                    <span className="shrink-0 text-xs text-[var(--mut)]">{timeAgo(aviso.createdAt)}</span>
                </span>
                <span className="mt-1 line-clamp-2 block text-xs text-[var(--mut)]">{aviso.message}</span>
                {destino ? (
                    <span className="mt-1.5 flex items-center gap-1 text-xs font-medium text-[var(--acento)]">
                        Ver en mi perfil <ArrowRight size={12} aria-hidden="true" />
                    </span>
                ) : null}
                {aviso.actorName ? <span className="mt-1 block text-xs text-[var(--mut)]">por {aviso.actorName}</span> : null}
            </span>
            {!aviso.isRead ? <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-[var(--acento)]" aria-hidden="true" /> : null}
        </>
    );

    const base = `relative flex w-full gap-3 p-4 text-left ${aviso.isRead ? "opacity-70" : "bg-[color-mix(in_srgb,var(--acento)_6%,transparent)]"}`;

    // Leída y sin destino: no hay nada que hacer con ella, así que no es un botón.
    if (aviso.isRead && !destino) return <li><div className={base}>{contenido}</div></li>;

    return (
        <li>
            <button
                type="button"
                className={`${base} cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--txt)_5%,transparent)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--acento)]`}
                onClick={() => {
                    if (!aviso.isRead) alLeer(aviso.id);
                    if (destino) alIr(destino);
                }}
            >
                {contenido}
            </button>
        </li>
    );
}

/** El contenido del panel. Solo se monta mientras está abierto y en cada apertura pide los avisos frescos. */
export function NotificationPanel({ onClose, onUnreadCountChange }: { onClose: () => void; onUnreadCountChange?: (count: number) => void }) {
    const router = useRouter();
    const [avisos, setAvisos] = useState<Notification[]>([]);
    const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
    const [noLeidas, setNoLeidas] = useState(0);
    const [falloMarcar, setFalloMarcar] = useState(false);

    // La campana muestra el mismo número que el panel, una vez que el panel ya sabe cuántas hay.
    const informar = useRef(onUnreadCountChange);
    useEffect(() => { informar.current = onUnreadCountChange; }, [onUnreadCountChange]);
    useEffect(() => { if (estado === "listo") informar.current?.(noLeidas); }, [estado, noLeidas]);

    useEffect(() => {
        const corte = new AbortController();
        (async () => {
            try {
                const res = await fetch("/api/admin/notifications?limit=20", { signal: corte.signal });
                if (!res.ok) throw new Error(String(res.status));
                const data = await res.json() as { notifications: Notification[]; unreadCount: number };
                setAvisos(data.notifications);
                setNoLeidas(data.unreadCount);
                setEstado("listo");
            } catch {
                if (!corte.signal.aborted) setEstado("error");
            }
        })();
        return () => corte.abort();
    }, []);

    const marcar = async (cuerpo: { notificationId: string } | { markAllRead: true }) => {
        setFalloMarcar(false);
        try {
            const res = await fetch("/api/admin/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cuerpo),
            });
            if (!res.ok) throw new Error(String(res.status));
            // Se avisa a la campana aquí mismo: si el aviso llevaba a otra página, el panel ya se cerró y su efecto no corre.
            const quedan = "markAllRead" in cuerpo ? 0 : Math.max(0, noLeidas - 1);
            setAvisos((prev) => prev.map((n) => ("markAllRead" in cuerpo || n.id === cuerpo.notificationId ? { ...n, isRead: true } : n)));
            setNoLeidas(quedan);
            informar.current?.(quedan);
        } catch {
            setFalloMarcar(true);
        }
    };

    return (
        <div
            id="ad-notificaciones"
            role="region"
            aria-label="Notificaciones"
            className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-2xl border border-[var(--linea-2)] bg-[var(--sup)] text-[var(--txt)] shadow-[0_40px_90px_-40px_rgb(0_0_0/.6)] animate-[ad-entra_.2s_var(--curva)] motion-reduce:animate-none max-lg:fixed max-lg:inset-x-4 max-lg:top-[72px] max-lg:mt-0 max-lg:w-auto"
        >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--linea)] px-4 py-3">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                    Notificaciones
                    {noLeidas > 0 ? (
                        <span className="rounded-full bg-[var(--acento)] px-2 py-0.5 text-xs font-semibold text-[var(--acento-tinta)]">
                            {noLeidas}<span className="sr-only"> sin leer</span>
                        </span>
                    ) : null}
                </h2>
                <div className="flex items-center gap-1">
                    {noLeidas > 0 ? (
                        <button type="button" onClick={() => void marcar({ markAllRead: true })} className="ad-icono" aria-label="Marcar todas como leídas" title="Marcar todas como leídas">
                            <CheckCheck size={17} aria-hidden="true" />
                        </button>
                    ) : null}
                    <button type="button" onClick={onClose} className="ad-icono" aria-label="Cerrar notificaciones">
                        <X size={17} aria-hidden="true" />
                    </button>
                </div>
            </div>

            {falloMarcar ? <p role="alert" className="border-b border-[var(--linea)] px-4 py-2 text-xs text-red-400">No se pudo marcar como leída. Inténtalo de nuevo.</p> : null}

            <div className="max-h-[min(24rem,calc(100svh_-_17rem))] overflow-y-auto" aria-busy={estado === "cargando"}>
                {estado === "cargando" ? (
                    <div className="flex items-center justify-center gap-3 p-8 text-sm text-[var(--mut)]" role="status">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[color-mix(in_srgb,var(--acento)_30%,transparent)] border-t-[var(--acento)] motion-reduce:animate-none" aria-hidden="true" />
                        Cargando…
                    </div>
                ) : estado === "error" ? (
                    <p className="p-8 text-center text-sm text-[var(--mut)]" role="alert">No se pudieron cargar las notificaciones.</p>
                ) : avisos.length === 0 ? (
                    <div className="p-8 text-center">
                        <Bell className="mx-auto mb-3 h-6 w-6 text-[var(--mut)]" aria-hidden="true" />
                        <p className="text-sm text-[var(--mut)]">No hay notificaciones.</p>
                        <p className="mt-1 text-xs text-[var(--mut)]">Lo nuevo aparecerá aquí.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-[var(--linea)]">
                        {avisos.map((aviso) => (
                            <Aviso
                                key={aviso.id}
                                aviso={aviso}
                                alLeer={(id) => void marcar({ notificationId: id })}
                                alIr={(href) => { onClose(); router.push(href); }}
                            />
                        ))}
                    </ul>
                )}
            </div>

            {avisos.length > 0 ? (
                <div className="border-t border-[var(--linea)] p-3">
                    <Link
                        href="/admin/notifications"
                        onClick={onClose}
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-[var(--acento)] transition-colors hover:bg-[color-mix(in_srgb,var(--txt)_5%,transparent)] focus-visible:outline-2 focus-visible:outline-[var(--acento)]"
                    >
                        Ver todas las notificaciones <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                </div>
            ) : null}
        </div>
    );
}

/** Campana de la barra con el número de avisos sin leer; abre el panel debajo. */
export function NotificationButton() {
    const [abierto, setAbierto] = useState(false);
    const [noLeidas, setNoLeidas] = useState(0);
    const caja = useRef<HTMLDivElement>(null);
    const boton = useRef<HTMLButtonElement>(null);

    // Número de sin leer al cargar y cada 60 s, solo con la pestaña a la vista; al volver a ella se actualiza al instante.
    useEffect(() => {
        const contar = async () => {
            try {
                const res = await fetch("/api/admin/notifications?limit=1&unread=true&countOnly=1");
                if (res.ok) {
                    const data = await res.json() as { unreadCount: number };
                    setNoLeidas(data.unreadCount);
                }
            } catch {
                // Sin red: se queda el último número conocido.
            }
        };

        void contar();
        const intervalo = setInterval(() => {
            if (document.visibilityState === "visible") void contar();
        }, 60000);
        const alVolver = () => { if (document.visibilityState === "visible") void contar(); };
        document.addEventListener("visibilitychange", alVolver);
        return () => {
            clearInterval(intervalo);
            document.removeEventListener("visibilitychange", alVolver);
        };
    }, []);

    const cerrar = useCallback(() => setAbierto(false), []);

    // Se cierra tocando fuera (la campana cuenta como dentro, para que vuelva a cerrarlo y no lo reabra) o con Escape.
    useEffect(() => {
        if (!abierto) return;
        const fuera = (e: PointerEvent) => {
            if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
        };
        const tecla = (e: KeyboardEvent) => {
            if (e.key === "Escape") { setAbierto(false); boton.current?.focus(); }
        };
        document.addEventListener("pointerdown", fuera);
        document.addEventListener("keydown", tecla);
        return () => {
            document.removeEventListener("pointerdown", fuera);
            document.removeEventListener("keydown", tecla);
        };
    }, [abierto]);

    return (
        <div ref={caja} className="relative">
            <button
                ref={boton}
                type="button"
                onClick={() => setAbierto((v) => !v)}
                className="ad-icono relative"
                aria-label={noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : "Notificaciones"}
                aria-expanded={abierto}
                aria-controls={abierto ? "ad-notificaciones" : undefined}
            >
                <Bell size={18} aria-hidden="true" />
                {noLeidas > 0 ? (
                    <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--acento)] px-1 text-[10px] font-semibold text-[var(--acento-tinta)]" aria-hidden="true">
                        {noLeidas > 99 ? "99+" : noLeidas}
                    </span>
                ) : null}
            </button>

            {abierto ? <NotificationPanel onClose={cerrar} onUnreadCountChange={setNoLeidas} /> : null}
        </div>
    );
}
