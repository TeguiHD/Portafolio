"use client";

import { useState, useEffect, useCallback, useId } from "react";
import Link from "next/link";
import {
    Users, Share2, ArrowRightLeft, RefreshCw, Copy,
    Check, X, ArrowRight, FileText, type LucideIcon
} from "lucide-react";
import { toast } from "sonner";
import { confirmar } from "@/modules/admin/confirmar/confirmar";
import { copiarTexto } from "@/lib/tools/copiar";

// Types
interface Connection {
    id: string;
    requesterId: string;
    addresseeId: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
    requester: UserProfile;
    addressee: UserProfile;
    createdAt: string;
}

interface UserProfile {
    id: string;
    name: string | null;
    email: string | null;
    avatar: string | null;
}

interface SharedClientData {
    id: string;
    name: string;
    company: string | null;
    quotationCount: number;
    permission: string;
    sharedByName: string;
}

interface SharedQuotationData {
    id: string;
    folio: string;
    projectName: string;
    clientName: string;
    status: string;
    total: number;
}

/* Clases del tema (tokens de src/app/tokens.css): valen en claro y oscuro sin tema-panel.css. */
const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)]";
const SOBRE = "hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)]";
const TITULO = "text-[15px] font-semibold text-[var(--mut)]";
const VACIO = "border-t border-[var(--linea)] px-1 py-5 text-[var(--mut)]";
const LISTA = "border-t border-[var(--linea)]";
const FILA = "flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--linea)] px-1 py-4";
const ESPERA = "h-14 rounded-lg bg-[color-mix(in_srgb,var(--txt)_5%,transparent)] motion-safe:animate-pulse";
const INICIAL = "grid size-10 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--acento)_14%,transparent)] font-mono text-sm font-semibold text-[var(--acento)]";
const CHIP = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium";
const CHIP_NEUTRO = `${CHIP} bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] text-[var(--mut)]`;
const BASE_BOTON = `inline-flex min-h-11 md:min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${FOCO}`;
const BOTON = `${BASE_BOTON} bg-[var(--acento)] font-semibold text-[var(--acento-tinta)] hover:bg-[color-mix(in_srgb,var(--acento)_86%,var(--txt))]`;
const BOTON_SEC = `${BASE_BOTON} border border-[var(--linea-2)] text-[var(--txt)] ${SOBRE}`;
const BOTON_ICONO = `inline-grid size-11 md:size-10 shrink-0 place-items-center rounded-lg text-[var(--mut)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] hover:text-[var(--txt)] ${FOCO}`;
const CAMPO = "w-full min-h-11 md:min-h-10 rounded-lg border border-[var(--linea-2)] bg-[var(--fondo-2)] px-3 py-2 text-sm text-[var(--txt)] placeholder:text-[var(--mut)] transition-colors duration-150 focus:border-[var(--acento)] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--acento)]";
const ENLACE = `inline-flex items-center gap-1.5 rounded-sm border-b border-[var(--linea-2)] pb-0.5 text-sm font-semibold text-[var(--txt)] transition-colors duration-150 hover:border-[var(--acento)] ${FOCO}`;

// Mismos nombres y tonos que QuotationStatusBadge (Propuestas).
const ESTADO_PROPUESTA: Partial<Record<string, { nombre: string; tono: string }>> = {
    DRAFT: { nombre: "Borrador", tono: "bg-[color-mix(in_srgb,var(--txt)_7%,transparent)] text-[var(--mut)]" },
    PENDING: { nombre: "Pendiente", tono: "bg-amber-500/10 text-amber-400" },
    REVISION: { nombre: "En revisión", tono: "bg-blue-500/10 text-blue-400" },
    APPROVED: { nombre: "Aprobada", tono: "bg-emerald-500/10 text-emerald-400" },
    REJECTED: { nombre: "Rechazada", tono: "bg-red-500/10 text-red-400" },
    COMPLETED: { nombre: "Completada", tono: "bg-emerald-500/10 text-emerald-400" },
};

const PERMISO: Partial<Record<string, { nombre: string; tono: string }>> = {
    VIEW: { nombre: "Solo ver", tono: "bg-blue-500/10 text-blue-400" },
    COMMENT: { nombre: "Comentar", tono: "bg-blue-500/10 text-blue-400" },
    EDIT: { nombre: "Editar", tono: "bg-amber-500/10 text-amber-400" },
    FULL: { nombre: "Acceso total", tono: "bg-emerald-500/10 text-emerald-400" },
};


const pesos = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 });

export default function CollaborationHub({
    initialSharingCode,
    currentUserId
}: {
    initialSharingCode: string,
    currentUserId: string
}) {
    const [sharingCode, setSharingCode] = useState(initialSharingCode);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ active: 0, pending: 0, blocked: 0 });

    const fetchConnections = useCallback(async () => {
        try {
            const res = await fetch("/api/user/connection");
            if (res.ok) {
                const data = await res.json();
                setConnections(data);

                // Calculate stats
                const active = data.filter((c: Connection) => c.status === "ACCEPTED").length;
                const pending = data.filter((c: Connection) => c.status === "PENDING" && c.addresseeId === currentUserId).length;
                setStats({ active, pending, blocked: 0 });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [currentUserId]);

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    return (
        <div className="space-y-10">
            <dl className="grid grid-cols-1 divide-y divide-[var(--linea)] border-y border-[var(--linea)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <StatsCard label="Conexiones activas" value={stats.active} icon={Users} color="text-emerald-400" />
                <StatsCard label="Solicitudes pendientes" value={stats.pending} icon={ArrowRightLeft} color="text-amber-400" />
                <StatsCard label="Recursos compartidos" value="—" icon={Share2} color="text-[var(--mut)]" />
            </dl>

            <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,1fr)] lg:gap-14">
                <div className="min-w-0 space-y-10">
                    <section aria-labelledby="conexiones-red">
                        <h2 id="conexiones-red" className={`${TITULO} mb-2`}>Red de colaboración</h2>

                        {loading ? (
                            <div className={`${LISTA} space-y-2 pt-3`} aria-busy="true">
                                <span className="sr-only">Cargando conexiones…</span>
                                {[1, 2, 3].map(i => <div key={i} aria-hidden="true" className={ESPERA} />)}
                            </div>
                        ) : connections.length === 0 ? (
                            <p className={VACIO}>
                                No tienes conexiones aún. Comparte tu código para empezar.
                            </p>
                        ) : (
                            <ul className={LISTA}>
                                {connections.map(conn => (
                                    <ConnectionCard
                                        key={conn.id}
                                        connection={conn}
                                        currentUserId={currentUserId}
                                        onUpdate={fetchConnections}
                                    />
                                ))}
                            </ul>
                        )}
                    </section>

                    <section aria-labelledby="conexiones-recursos">
                        <h2 id="conexiones-recursos" className={`${TITULO} mb-3`}>Recursos compartidos contigo</h2>
                        <SharedResourceBrowser currentUserId={currentUserId} />
                    </section>
                </div>

                <div className="grid min-w-0 content-start gap-10">
                    <SecurityPanel
                        code={sharingCode}
                        setCode={setSharingCode}
                    />

                    <ConnectRequestPanel
                        onSent={fetchConnections}
                    />
                </div>
            </div>
        </div>
    );
}

// Sub-components

function SharedResourceBrowser({ currentUserId: _currentUserId }: { currentUserId: string }) {
    const [activeTab, setActiveTab] = useState<"clients" | "quotations">("clients");
    const [sharedClients, setSharedClients] = useState<SharedClientData[]>([]);
    const [sharedQuotations, setSharedQuotations] = useState<SharedQuotationData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch("/api/user/connection/shared-resources");
                if (res.ok) {
                    const data = await res.json();
                    setSharedClients(data.clients || []);
                    setSharedQuotations(data.quotations || []);
                }
            } catch (error) {
                console.error("Failed to load shared resources", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const pestana = (activa: boolean) =>
        `inline-flex min-h-11 md:min-h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors duration-150 ${FOCO} ${activa
            ? "bg-[color-mix(in_srgb,var(--acento)_13%,transparent)] text-[var(--txt)]"
            : `text-[var(--mut)] hover:text-[var(--txt)] ${SOBRE}`}`;
    const cuenta = "rounded-full bg-[color-mix(in_srgb,var(--txt)_8%,transparent)] px-1.5 text-xs tabular-nums";

    return (
        <div>
            <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Qué mostrar">
                <button
                    type="button"
                    aria-pressed={activeTab === "clients"}
                    onClick={() => setActiveTab("clients")}
                    className={pestana(activeTab === "clients")}
                >
                    Clientes compartidos
                    {sharedClients.length > 0 && (
                        <span className={cuenta}>{sharedClients.length}</span>
                    )}
                </button>
                <button
                    type="button"
                    aria-pressed={activeTab === "quotations"}
                    onClick={() => setActiveTab("quotations")}
                    className={pestana(activeTab === "quotations")}
                >
                    Cotizaciones
                    {sharedQuotations.length > 0 && (
                        <span className={cuenta}>{sharedQuotations.length}</span>
                    )}
                </button>
            </div>

            {loading ? (
                <div className={`${LISTA} space-y-2 pt-3`} aria-busy="true">
                    <span className="sr-only">Cargando recursos compartidos…</span>
                    {[1, 2].map(i => <div key={i} aria-hidden="true" className={ESPERA} />)}
                </div>
            ) : activeTab === "clients" ? (
                sharedClients.length === 0 ? (
                    <div className={VACIO}>
                        <p className="text-[var(--txt)]">No tienes clientes compartidos aún.</p>
                        <p className="mt-1 text-sm">Cuando un contacto comparta clientes contigo, aparecerán aquí.</p>
                        <Link href="/admin/clientes" className={`${ENLACE} mt-4`}>
                            Ir a clientes <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                    </div>
                ) : (
                    <ul className={LISTA}>
                        {sharedClients.map((client) => {
                            const permiso = PERMISO[client.permission];
                            return (
                                <li key={client.id} className={FILA}>
                                    <span aria-hidden="true" className={INICIAL}>{client.name.charAt(0)}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-[var(--txt)]">{client.name}</p>
                                        <p className="truncate text-sm text-[var(--mut)]">
                                            {client.company || "Independiente"} · {client.quotationCount} cotización{client.quotationCount !== 1 ? "es" : ""}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`${CHIP} ${permiso?.tono ?? "bg-emerald-500/10 text-emerald-400"}`}>
                                            {permiso?.nombre ?? client.permission}
                                        </span>
                                        <span className="text-xs text-[var(--mut)]">
                                            por {client.sharedByName}
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )
            ) : (
                sharedQuotations.length === 0 ? (
                    <div className={VACIO}>
                        <p className="text-[var(--txt)]">No tienes cotizaciones compartidas.</p>
                        <p className="mt-1 text-sm">Las cotizaciones de los clientes compartidos contigo aparecerán aquí.</p>
                    </div>
                ) : (
                    <ul className={LISTA}>
                        {sharedQuotations.map((q) => {
                            const estado = ESTADO_PROPUESTA[q.status];
                            return (
                                <li key={q.id} className={FILA}>
                                    <FileText size={18} aria-hidden="true" className="shrink-0 text-[var(--mut)]" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-[var(--txt)]">{q.projectName}</p>
                                        <p className="truncate text-sm text-[var(--mut)]">
                                            {q.clientName} · {q.folio}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-3">
                                        <span className={`${CHIP} ${estado?.tono ?? "bg-amber-500/10 text-amber-400"}`}>
                                            {estado?.nombre ?? q.status}
                                        </span>
                                        <span className="text-sm font-semibold tabular-nums text-[var(--txt)]">
                                            {pesos.format(q.total)}
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )
            )}
        </div>
    );
}

interface StatsCardProps {
    label: string;
    value: number | string;
    icon: LucideIcon;
    color: string;
}

function StatsCard({ label, value, icon: Icon, color }: StatsCardProps) {
    return (
        <div className="flex flex-col-reverse gap-0.5 px-1 py-4 sm:px-5 sm:first:pl-1">
            <dt className="flex items-center gap-1.5 text-[13.5px] text-[var(--mut)]">
                <Icon size={16} aria-hidden="true" className={color} />
                {label}
            </dt>
            <dd className="text-3xl font-bold tracking-tight tabular-nums text-[var(--txt)]">{value}</dd>
        </div>
    );
}

function SecurityPanel({ code, setCode }: { code: string, setCode: (c: string) => void }) {
    const handleRotate = async () => {
        if (!(await confirmar({ titulo: "¿Generar un código nuevo?", detalle: "El código anterior dejará de funcionar.", accion: "Generar", peligro: true }))) return;
        try {
            const res = await fetch("/api/user/connection/rotate", { method: "POST" });
            const data = await res.json();
            if (data.success) {
                setCode(data.newCode);
                toast.success("Código nuevo listo");
            } else {
                toast.error("No se pudo generar un código nuevo");
            }
        } catch {
            toast.error("No se pudo generar un código nuevo");
        }
    };

    return (
        <section aria-labelledby="conexiones-codigo">
            <h2 id="conexiones-codigo" className={`${TITULO} mb-3`}>Tu código</h2>

            <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--linea-2)] bg-[var(--fondo-2)] py-1.5 pl-4 pr-1.5">
                <code className="min-w-0 truncate font-mono text-lg font-semibold tracking-[0.06em] text-[var(--txt)]">
                    {code || "••••••••"}
                </code>
                <button
                    type="button"
                    onClick={async () => {
                        if (await copiarTexto(code)) toast.success("Código copiado");
                        else toast.error("No se pudo copiar");
                    }}
                    className={BOTON_ICONO}
                    title="Copiar"
                    aria-label="Copiar el código de acceso"
                >
                    <Copy size={18} aria-hidden="true" />
                </button>
            </div>

            <p className="mt-2 text-sm text-[var(--mut)]">No vence. Si generas uno nuevo, el anterior deja de servir.</p>

            <button
                type="button"
                onClick={handleRotate}
                className={`${BOTON_SEC} mt-3`}
            >
                <RefreshCw size={16} aria-hidden="true" />
                Generar código nuevo
            </button>
        </section>
    );
}

function ConnectRequestPanel({ onSent }: { onSent: () => void }) {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const campoId = useId();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/user/connection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sharingCode: code })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Solicitud enviada");
                setCode("");
                onSent();
            } else {
                toast.error(typeof data.error === "string" && data.error ? data.error : "No se pudo enviar la solicitud");
            }
        } catch {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section aria-labelledby="conexiones-conectar">
            <h2 id="conexiones-conectar" className={`${TITULO} mb-3`}>Conectar</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                    <label htmlFor={campoId} className="mb-1.5 block text-sm font-medium text-[var(--txt)]">
                        Código de la otra persona
                    </label>
                    <input
                        id={campoId}
                        type="text"
                        placeholder="Pega su código"
                        autoComplete="off"
                        spellCheck={false}
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className={CAMPO}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading || !code}
                    className={`${BOTON} w-full`}
                >
                    {loading ? (
                        <>
                            <RefreshCw className="motion-safe:animate-spin" size={16} aria-hidden="true" />
                            Enviando…
                        </>
                    ) : "Enviar solicitud"}
                </button>
            </form>
        </section>
    );
}

function ConnectionCard({ connection, currentUserId, onUpdate }: { connection: Connection, currentUserId: string, onUpdate: () => void }) {
    const isIncoming = connection.addresseeId === currentUserId;
    const isPending = connection.status === "PENDING";
    const otherUser = isIncoming ? connection.requester : connection.addressee;

    const handleAction = async (status: string) => {
        try {
            const res = await fetch(`/api/user/connection?id=${connection.id}`, {
                method: "PUT",
                body: JSON.stringify({ status })
            });
            // Antes avisaba «Conectado» aunque la API respondiera con error.
            if (!res.ok) throw new Error();
            onUpdate();
            toast.success(status === "ACCEPTED" ? "Conectado" : "Actualizado");
        } catch {
            toast.error("No se pudo responder la solicitud");
        }
    };

    return (
        <li className={`${FILA} ${isPending && isIncoming ? "bg-[color-mix(in_srgb,var(--acento)_6%,transparent)]" : ""}`}>
            <span aria-hidden="true" className={INICIAL}>
                {otherUser.name?.[0] || otherUser.email?.[0] || "?"}
            </span>
            <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-semibold text-[var(--txt)]">{otherUser.name || "Usuario"}</h3>
                <p className="truncate text-sm text-[var(--mut)]">{otherUser.email}</p>

                {isPending && (
                    <span className={`mt-1.5 ${isIncoming ? `${CHIP} bg-[color-mix(in_srgb,var(--acento)_14%,transparent)] text-[var(--acento)]` : CHIP_NEUTRO}`}>
                        {isIncoming ? "Solicita conectar" : "Enviada"}
                    </span>
                )}
                {!isPending && (
                    <span className={`mt-1.5 ${CHIP} bg-emerald-500/10 text-emerald-400`}>
                        <Check size={12} aria-hidden="true" />
                        Conectado
                    </span>
                )}
            </div>

            {isPending && isIncoming && (
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => handleAction("ACCEPTED")}
                        className={BOTON}
                    >
                        <Check size={16} aria-hidden="true" />
                        Aceptar
                    </button>
                    <button
                        type="button"
                        onClick={() => handleAction("REJECTED")}
                        className={BOTON_SEC}
                    >
                        <X size={16} aria-hidden="true" />
                        Ignorar
                    </button>
                </div>
            )}
        </li>
    );
}
