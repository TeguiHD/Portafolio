"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ContactInfoModal from "../contact-info-modal";
import { updateClientAction } from "../actions";
import DialogoFormulario from "../../gestion-comercial/dialogo-formulario";
import {
    ArrowLeft, Check, ChevronDown, ClipboardList, CreditCard, FileSignature, Globe, Pin, Rocket, Search, Wrench, type LucideIcon,
} from "lucide-react";
import Cifras from "@/modules/quotations/components/Cifras";
import {
    AREA, BARRA, BOTON, BOTON_ICONO, BOTON_SEC, CAMPO, CHIP, ENLACE, ETIQUETA, FOCO, H1, SOBRE, TARJETA, TITULO_SECCION,
} from "@/modules/quotations/estilos";

/**
 * Ficha del cliente: cifras, flujo del contrato activo (hitos), propuestas, contratos, negocios y gastos.
 * Editar el contacto se hace aquí mismo; las propuestas y el portal del cliente, en Propuestas.
 */

// ─── Tipos (lo que manda page.tsx, con las fechas ya en texto) ─────

interface Quotation {
    id: string;
    folio: string;
    projectName: string;
    status: string;
    total: number;
    totalPaid: number;
    createdAt: string;
}

interface Milestone {
    id: string;
    title: string;
    description: string | null;
    status: string;
    type: string;
    icon: string | null;
    estimatedDate: string | null;
    completedAt: string | null;
    isVisibleToClient: boolean;
}

interface PaymentPlan {
    id: string;
    totalAmount: number;
    totalInstallments: number;
    status: string;
}

interface Approval {
    id: string;
    type: string;
    status: string;
    signerName: string | null;
    signerRut: string | null;
    signedAt: string | null;
    createdAt: string;
}

interface Contract {
    id: string;
    contractNumber: string;
    title: string;
    description: string | null;
    status: string;
    type: string;
    totalAmount: number;
    startDate: string | null;
    endDate: string | null;
    milestones: Milestone[];
    paymentPlans: PaymentPlan[];
    approvals: Approval[];
}

interface Deal {
    id: string;
    title: string;
    stage: string;
    priority: string;
    estimatedValue: number | null;
    updatedAt: string;
}

interface Expense {
    id: string;
    description: string;
    amount: number;
    category: string;
    expenseDate: string;
}

export interface FichaCliente {
    id: string;
    name: string;
    slug: string;
    email: string | null;
    company: string | null;
    rut: string | null;
    address: string | null;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    contactRole: string | null;
    workType: string | null;
    notes: string | null;
    quotations: Quotation[];
    contracts: Contract[];
    deals: Deal[];
    expenses: Expense[];
}

export interface CifrasCliente {
    enContratos: number;
    cotizado: number;
    cobrado: number;
    gastos: number;
    contratosActivos: number;
    propuestas: number;
    negocios: number;
    contratos: number;
}

// ─── Textos y formato ──────────────────────────────────────────────

const formatCLP = (n: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Santiago" }) : "—";

const ESTADO_CONTRATO: Record<string, string> = {
    DRAFT: "Borrador", ACTIVE: "Activo", PAUSED: "Pausado", COMPLETED: "Completado", CANCELLED: "Cancelado", EXPIRED: "Vencido",
};
const ESTADO_PROPUESTA: Record<string, string> = {
    DRAFT: "Borrador", PENDING: "Pendiente", REVISION: "En revisión", APPROVED: "Aprobada", REJECTED: "Rechazada", COMPLETED: "Completada",
};
const ESTADO_FIRMA: Record<string, string> = {
    PENDING: "Por firmar", SIGNED: "Firmada", REJECTED: "Rechazada", EXPIRED: "Vencida", REVOKED: "Revocada",
};
const ESTADO_HITO: Record<string, string> = {
    PENDING: "Pendiente", IN_PROGRESS: "En curso", COMPLETED: "Hecho", SKIPPED: "Omitido",
};
const ESTADO_PLAN: Record<string, string> = { ACTIVE: "Vigente", COMPLETED: "Pagado", CANCELLED: "Cancelado" };
const TIPO_CONTRATO: Record<string, string> = {
    PROJECT: "Proyecto", RETAINER: "Mensualidad", MAINTENANCE: "Mantenimiento", CONSULTING: "Consultoría",
};
const TIPO_FIRMA: Record<string, string> = { QUOTATION: "Propuesta", CONTRACT: "Contrato", OTHER: "Documento" };
const ETAPA: Record<string, string> = {
    PROSPECT: "Prospecto", CONTACTED: "Contactado", PROPOSAL: "Propuesta", NEGOTIATION: "Negociación", WON: "Ganado", LOST: "Perdido",
};
const PRIORIDAD: Record<string, string> = { LOW: "Baja", MEDIUM: "Media", HIGH: "Alta", URGENT: "Urgente" };
const CATEGORIA: Record<string, string> = {
    HOSTING: "Hosting", DOMAIN: "Dominio", LICENSES: "Licencias", THIRD_PARTY: "Terceros", TOOLS: "Herramientas", OTHER: "Otro",
};

// Estados: color suave de fondo y texto del tono, siempre con el nombre escrito.
const NEUTRO = "bg-[color-mix(in_srgb,var(--txt)_7%,transparent)] text-[var(--mut)]";
const VERDE = "bg-emerald-500/10 text-emerald-400";
const AMBAR = "bg-amber-500/10 text-amber-400";
const AZUL = "bg-blue-500/10 text-blue-400";
const ROJO = "bg-red-500/10 text-red-400";
const statusColors: Record<string, string> = {
    DRAFT: NEUTRO, ACTIVE: VERDE, PAUSED: AMBAR, COMPLETED: AZUL, CANCELLED: ROJO, EXPIRED: ROJO,
    PENDING: AMBAR, REVISION: AZUL, IN_PROGRESS: "bg-cyan-500/10 text-cyan-400", SIGNED: VERDE, APPROVED: VERDE,
    WON: VERDE, REJECTED: ROJO, LOST: ROJO, REVOKED: ROJO, NEGOTIATION: AMBAR, SKIPPED: NEUTRO,
};

const StatusBadge = ({ status, nombres }: { status: string; nombres: Record<string, string> }) => (
    <span className={`${CHIP} ${statusColors[status] || NEUTRO}`}>
        {nombres[status] ?? status}
    </span>
);

const ICONO_HITO: Record<string, LucideIcon> = {
    QUOTATION: ClipboardList, PAYMENT: CreditCard, CONTRACT: FileSignature, WORK: Wrench, HOSTING: Globe, REVIEW: Search, DELIVERY: Rocket, CUSTOM: Pin,
};

/** Fila de una lista: sin caja, con línea divisoria. */
const FILA = "flex items-center justify-between gap-4 border-b border-[var(--linea)] py-3";

// ─── Pestañas ──────────────────────────────────────────────────────

type Tab = "overview" | "contracts" | "quotations" | "deals" | "expenses";

// ─── Componente ────────────────────────────────────────────────────

export default function ClientDetailClient({ client, cifras }: { client: FichaCliente; cifras: CifrasCliente }) {
    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const router = useRouter();

    const firmas = client.contracts.flatMap((c) => c.approvals).filter((a) => a.status === "SIGNED").length;
    const hitos = client.contracts.reduce((acc, c) => acc + c.milestones.length, 0);
    const hitosHechos = client.contracts.reduce((acc, c) => acc + c.milestones.filter((m) => m.status === "COMPLETED").length, 0);

    const tabs: { key: Tab; label: string; cuenta?: number }[] = [
        { key: "overview", label: "Resumen" },
        { key: "contracts", label: "Contratos", cuenta: cifras.contratos },
        { key: "quotations", label: "Propuestas", cuenta: cifras.propuestas },
        { key: "deals", label: "Negocios", cuenta: cifras.negocios },
        { key: "expenses", label: "Gastos" },
    ];

    // Pestañas con teclado: flechas, Inicio y Fin mueven la selección (patrón de pestañas de ARIA).
    const alTeclear = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        const i = tabs.findIndex((t) => t.key === activeTab);
        const destino = e.key === "ArrowRight" ? (i + 1) % tabs.length
            : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length
                : e.key === "Home" ? 0
                    : e.key === "End" ? tabs.length - 1
                        : -1;
        if (destino < 0) return;
        e.preventDefault();
        setActiveTab(tabs[destino].key);
        document.getElementById(`tab-${tabs[destino].key}`)?.focus();
    };

    return (
        <div className="space-y-8">
            {/* Encabezado */}
            <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div className="flex min-w-0 items-start gap-3">
                    <Link
                        href="/admin/clientes"
                        aria-label="Volver a clientes"
                        className={`${BOTON_ICONO} -ml-2 mt-0.5 border border-[var(--linea-2)]`}
                    >
                        <ArrowLeft size={18} aria-hidden="true" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className={`${H1} break-words`}>{client.name}</h1>
                        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--mut)]">
                            {client.workType && <span className="text-[var(--acento)]">{client.workType}</span>}
                            {client.company && client.company !== client.name && <span>{client.company}</span>}
                            {client.rut && <span className="font-mono text-xs">RUT {client.rut}</span>}
                            {client.contactName && <span>{client.contactName}{client.contactRole ? `, ${client.contactRole}` : ""}</span>}
                            {(client.contactEmail || client.email) && <span className="break-all">{client.contactEmail || client.email}</span>}
                            {client.contactPhone && <span>{client.contactPhone}</span>}
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:w-80">
                    <EditarNotas clientId={client.id} workType={client.workType} notes={client.notes} alGuardar={() => router.refresh()} />
                    <ContactInfoModal
                        client={client}
                        onUpdate={() => router.refresh()}
                        canDelete
                        onDeleted={() => router.push("/admin/clientes")}
                    />
                    <Link href={`/admin/cotizaciones/${client.id}`} className={`${BOTON} flex-1`}>
                        Propuestas
                    </Link>
                </div>
            </header>

            {/* Cifras */}
            <Cifras
                cifras={[
                    { nombre: "En contratos", valor: formatCLP(cifras.enContratos), nota: "Sin cancelados ni borradores" },
                    { nombre: "Cotizado", valor: formatCLP(cifras.cotizado) },
                    { nombre: "Cobrado", valor: formatCLP(cifras.cobrado) },
                    { nombre: "Gastos", valor: formatCLP(cifras.gastos) },
                    { nombre: "Contratos activos", valor: cifras.contratosActivos },
                    { nombre: "Propuestas", valor: cifras.propuestas },
                    { nombre: "Firmas", valor: firmas, nota: "De contratos" },
                    { nombre: "Hitos hechos", valor: `${hitosHechos} de ${hitos}` },
                ]}
            />

            {/* Pestañas */}
            <div>
                <div role="tablist" aria-label="Secciones de la ficha" className="-mx-1 flex overflow-x-auto border-b border-[var(--linea)] px-1">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            role="tab"
                            id={`tab-${t.key}`}
                            aria-selected={activeTab === t.key}
                            aria-controls={`panel-${t.key}`}
                            tabIndex={activeTab === t.key ? 0 : -1}
                            onClick={() => setActiveTab(t.key)}
                            onKeyDown={alTeclear}
                            className={`-mb-px min-h-11 shrink-0 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors duration-150 ${FOCO} ${activeTab === t.key
                                ? "border-[var(--acento)] text-[var(--txt)]"
                                : "border-transparent text-[var(--mut)] hover:text-[var(--txt)]"
                                }`}
                        >
                            {t.label}
                            {t.cuenta !== undefined && <span className="ml-1.5 font-mono text-xs tabular-nums text-[var(--mut)]">{t.cuenta}</span>}
                        </button>
                    ))}
                </div>

                <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} tabIndex={0} className={`min-h-[300px] rounded-sm pt-6 ${FOCO}`}>
                    {activeTab === "overview" && <OverviewTab client={client} />}
                    {activeTab === "contracts" && <ContractsTab contracts={client.contracts} total={cifras.contratos} />}
                    {activeTab === "quotations" && <QuotationsTab quotations={client.quotations} clientId={client.id} total={cifras.propuestas} />}
                    {activeTab === "deals" && <DealsTab deals={client.deals} total={cifras.negocios} />}
                    {activeTab === "expenses" && <ExpensesTab expenses={client.expenses} />}
                </div>
            </div>
        </div>
    );
}

/** Tipo de trabajo y notas internas: los dos datos de la ficha que «Contacto» no edita. */
function EditarNotas({ clientId, workType, notes, alGuardar }: { clientId: string; workType: string | null; notes: string | null; alGuardar: () => void }) {
    const [abierto, setAbierto] = useState(false);
    const [form, setForm] = useState({ workType: workType ?? "", notes: notes ?? "" });
    const [error, setError] = useState<string | null>(null);
    const [guardando, startGuardar] = useTransition();

    const guardar = (cerrar: () => void) => (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        startGuardar(async () => {
            const r = await updateClientAction(clientId, { workType: form.workType.trim(), notes: form.notes });
            if (r.success) {
                toast.success("Ficha actualizada");
                alGuardar();
                cerrar();
            } else {
                setError(r.error || "No se pudo guardar");
            }
        });
    };

    return (
        <>
            <button
                type="button"
                onClick={() => { setForm({ workType: workType ?? "", notes: notes ?? "" }); setError(null); setAbierto(true); }}
                className={`${BOTON_SEC} flex-1`}
            >
                Notas
            </button>
            {abierto && (
                <DialogoFormulario titulo="Tipo de trabajo y notas" descripcion="Las notas son internas: el cliente no las ve." alCerrar={() => setAbierto(false)} ancho="max-w-md">
                    {(cerrar) => (
                        <form onSubmit={guardar(cerrar)} className="space-y-4">
                            <div>
                                <label htmlFor={`tipo-${clientId}`} className={ETIQUETA}>Tipo de trabajo</label>
                                <input id={`tipo-${clientId}`} type="text" maxLength={100} value={form.workType}
                                    onChange={(e) => setForm((f) => ({ ...f, workType: e.target.value }))}
                                    placeholder="Ej.: Desarrollo web"
                                    className={CAMPO} />
                            </div>
                            <div>
                                <label htmlFor={`notas-${clientId}`} className={ETIQUETA}>Notas internas</label>
                                <textarea id={`notas-${clientId}`} rows={6} maxLength={2000} value={form.notes}
                                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                                    className={AREA} />
                            </div>
                            <p role="alert" className="text-sm text-red-400">{error}</p>
                            <div className="flex gap-2">
                                <button type="button" onClick={cerrar} className={`${BOTON_SEC} flex-1`}>Cancelar</button>
                                <button type="submit" disabled={guardando} className={`${BOTON} flex-1`}>
                                    {guardando ? "Guardando…" : "Guardar"}
                                </button>
                            </div>
                        </form>
                    )}
                </DialogoFormulario>
            )}
        </>
    );
}

/** «Se muestran N de M» cuando la lista trae solo lo más reciente. */
function Recorte({ mostrados, total, href, texto }: { mostrados: number; total: number; href: string; texto: string }) {
    if (total <= mostrados) return null;
    return (
        <p className="mb-3 text-xs text-[var(--mut)]">
            Se muestran {mostrados} de {total}. <Link href={href} className={ENLACE}>{texto}</Link>
        </p>
    );
}

/** Lista vacía: una frase y, si corresponde, a dónde ir. */
function Vacio({ texto, href, enlace }: { texto: string; href?: string; enlace?: string }) {
    return (
        <div className="border-y border-[var(--linea)] py-10 text-center">
            <p className="text-[var(--mut)]">{texto}</p>
            {href && enlace && <Link href={href} className={`${ENLACE} mt-2 inline-block text-sm`}>{enlace}</Link>}
        </div>
    );
}

// ─── Resumen ───────────────────────────────────────────────────────

function OverviewTab({ client }: { client: FichaCliente }) {
    const activeContract = client.contracts.find((c) => c.status === "ACTIVE") || client.contracts[0];
    const allApprovals = client.contracts.flatMap((c) => c.approvals);

    return (
        <div className="space-y-10">
            {activeContract ? (
                <ContractProjectFlow contract={activeContract} />
            ) : (
                <Vacio texto="Este cliente no tiene contratos." href="/admin/gestion-comercial/contratos" enlace="Ir a Contratos" />
            )}

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                <section aria-labelledby="ultimas-propuestas">
                    <h2 id="ultimas-propuestas" className={`${TITULO_SECCION} mb-2`}>Últimas propuestas</h2>
                    {client.quotations.length === 0 ? (
                        <p className="border-t border-[var(--linea)] py-4 text-sm text-[var(--mut)]">Sin propuestas</p>
                    ) : (
                        <ul className="border-t border-[var(--linea)]">
                            {client.quotations.slice(0, 5).map((q) => (
                                <li key={q.id} className={FILA}>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-[var(--txt)]">{q.projectName}</p>
                                        <p className="font-mono text-xs text-[var(--mut)]">{q.folio}</p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <StatusBadge status={q.status} nombres={ESTADO_PROPUESTA} />
                                        <p className="mt-1 text-xs tabular-nums text-[var(--mut)]">{formatCLP(q.total)}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section aria-labelledby="firmas-contratos">
                    <h2 id="firmas-contratos" className={`${TITULO_SECCION} mb-2`}>Firmas de contratos</h2>
                    {allApprovals.length === 0 ? (
                        <p className="border-t border-[var(--linea)] py-4 text-sm text-[var(--mut)]">Sin firmas</p>
                    ) : (
                        <ul className="border-t border-[var(--linea)]">
                            {allApprovals.slice(0, 5).map((a) => (
                                <li key={a.id} className={FILA}>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-[var(--txt)]">{TIPO_FIRMA[a.type] ?? a.type}</p>
                                        <p className="text-xs text-[var(--mut)]">
                                            {a.signerName ? `Firmó ${a.signerName}` : "Sin firmar"}
                                            {a.signerRut && ` · ${a.signerRut}`}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <StatusBadge status={a.status} nombres={ESTADO_FIRMA} />
                                        <p className="mt-1 text-xs text-[var(--mut)]">{formatDate(a.signedAt || a.createdAt)}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            {client.notes && (
                <section aria-labelledby="notas-cliente">
                    <h2 id="notas-cliente" className={`${TITULO_SECCION} mb-2`}>Notas internas</h2>
                    <p className="whitespace-pre-wrap border-t border-[var(--linea)] pt-3 text-sm text-[var(--txt)]">{client.notes}</p>
                </section>
            )}
        </div>
    );
}

// ─── Flujo del contrato (hitos) ────────────────────────────────────

function ContractProjectFlow({ contract }: { contract: Contract }) {
    const completedCount = contract.milestones.filter((m) => m.status === "COMPLETED").length;
    const totalCount = contract.milestones.length;
    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <div className={`${TARJETA} space-y-5 p-4 sm:p-6`}>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-[var(--txt)]">{contract.title}</h2>
                        <StatusBadge status={contract.status} nombres={ESTADO_CONTRATO} />
                    </div>
                    <p className="font-mono text-xs text-[var(--mut)]">{contract.contractNumber} · {TIPO_CONTRATO[contract.type] ?? contract.type}</p>
                    {contract.description && (
                        <p className="mt-1 text-sm text-[var(--mut)]">{contract.description}</p>
                    )}
                </div>
                <div className="shrink-0 sm:text-right">
                    <p className="text-xl font-bold tabular-nums text-[var(--txt)]">{formatCLP(contract.totalAmount)}</p>
                    <p className="mt-0.5 text-xs text-[var(--mut)]">
                        {formatDate(contract.startDate)} → {formatDate(contract.endDate)}
                    </p>
                </div>
            </div>

            {totalCount > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--mut)]" id={`avance-${contract.id}`}>Avance del proyecto</span>
                        <span className="font-semibold tabular-nums text-[var(--txt)]">{progressPct}%</span>
                    </div>
                    <div className={BARRA} role="progressbar" aria-labelledby={`avance-${contract.id}`} aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
                        <div className="h-full rounded-full bg-[var(--acento)]" style={{ width: `${progressPct}%` }} />
                    </div>
                </div>
            )}

            {totalCount > 0 && (
                <ol className="border-t border-[var(--linea)]">
                    {contract.milestones.map((milestone) => {
                        const isCompleted = milestone.status === "COMPLETED";
                        const isActive = milestone.status === "IN_PROGRESS";
                        const isSkipped = milestone.status === "SKIPPED";
                        const Icono = isCompleted ? Check : ICONO_HITO[milestone.type] ?? Pin;

                        return (
                            <li key={milestone.id} className="flex items-start gap-3 border-b border-[var(--linea)] py-3 last:border-b-0">
                                <span
                                    aria-hidden="true"
                                    className={`grid size-9 shrink-0 place-items-center rounded-lg ${isCompleted
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : isActive
                                            ? "bg-cyan-500/10 text-cyan-400"
                                            : isSkipped
                                                ? "bg-[color-mix(in_srgb,var(--txt)_5%,transparent)] text-[var(--mut)] opacity-60"
                                                : "bg-[color-mix(in_srgb,var(--txt)_7%,transparent)] text-[var(--mut)]"
                                        }`}
                                >
                                    <Icono size={16} />
                                </span>

                                <div className="min-w-0 flex-1">
                                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                                        <h3 className={`text-sm font-semibold ${isCompleted ? "text-emerald-400" : isActive ? "text-cyan-400" : isSkipped ? "text-[var(--mut)] line-through" : "text-[var(--txt)]"}`}>
                                            {milestone.title}
                                        </h3>
                                        {!milestone.isVisibleToClient && (
                                            <span className={`${CHIP} bg-amber-500/10 text-amber-400`}>Interno</span>
                                        )}
                                    </div>
                                    {milestone.description && (
                                        <p className="text-xs text-[var(--mut)]">{milestone.description}</p>
                                    )}
                                    <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--mut)]">
                                        {milestone.estimatedDate && <span>Estimado: {formatDate(milestone.estimatedDate)}</span>}
                                        {milestone.completedAt && <span className="text-emerald-400">Hecho: {formatDate(milestone.completedAt)}</span>}
                                    </p>
                                </div>

                                <div className="mt-1 shrink-0">
                                    <StatusBadge status={milestone.status} nombres={ESTADO_HITO} />
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}

            {(contract.paymentPlans.length > 0 || contract.approvals.length > 0) && (
                <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--linea)] pt-3 text-sm text-[var(--mut)]">
                    {contract.paymentPlans.map((pp) => (
                        <span key={pp.id} className="flex flex-wrap items-center gap-2">
                            <CreditCard size={14} aria-hidden="true" />
                            <span className="tabular-nums text-[var(--txt)]">{pp.totalInstallments} cuota{pp.totalInstallments === 1 ? "" : "s"} · {formatCLP(pp.totalAmount)}</span>
                            <StatusBadge status={pp.status} nombres={ESTADO_PLAN} />
                        </span>
                    ))}
                    {contract.approvals.length > 0 && (
                        <span className="flex items-center gap-2">
                            <FileSignature size={14} aria-hidden="true" />
                            <span className="tabular-nums text-[var(--txt)]">{contract.approvals.filter((a) => a.status === "SIGNED").length} de {contract.approvals.length} firmas</span>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Contratos ─────────────────────────────────────────────────────

function ContractsTab({ contracts, total }: { contracts: Contract[]; total: number }) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (contracts.length === 0) {
        return <Vacio texto="No hay contratos registrados." />;
    }

    return (
        <div>
            <Recorte mostrados={contracts.length} total={total} href="/admin/gestion-comercial/contratos" texto="Ver todos en Contratos" />
            <ul className="border-t border-[var(--linea)]">
                {contracts.map((contract) => (
                    <li key={contract.id} className="border-b border-[var(--linea)]">
                        <button
                            type="button"
                            onClick={() => setExpandedId(expandedId === contract.id ? null : contract.id)}
                            aria-expanded={expandedId === contract.id}
                            aria-controls={`flujo-${contract.id}`}
                            className={`flex w-full flex-col justify-between gap-3 px-1 py-4 text-left transition-colors duration-150 sm:flex-row sm:items-center ${SOBRE} ${FOCO}`}
                        >
                            <span className="min-w-0">
                                <span className="flex flex-wrap items-center gap-2">
                                    <span className="text-base font-semibold text-[var(--txt)]">{contract.title}</span>
                                    <StatusBadge status={contract.status} nombres={ESTADO_CONTRATO} />
                                </span>
                                <span className="mt-0.5 block font-mono text-xs text-[var(--mut)]">{contract.contractNumber} · {TIPO_CONTRATO[contract.type] ?? contract.type}</span>
                            </span>
                            <span className="flex shrink-0 items-center gap-4 sm:text-right">
                                <span>
                                    <span className="block text-lg font-bold tabular-nums text-[var(--txt)]">{formatCLP(contract.totalAmount)}</span>
                                    <span className="block text-xs text-[var(--mut)]">{formatDate(contract.startDate)} → {formatDate(contract.endDate)}</span>
                                </span>
                                <ChevronDown size={18} aria-hidden="true" className={`text-[var(--mut)] transition-transform duration-150 motion-reduce:transition-none ${expandedId === contract.id ? "rotate-180" : ""}`} />
                            </span>
                        </button>

                        {expandedId === contract.id && (
                            <div id={`flujo-${contract.id}`} className="pb-4">
                                <ContractProjectFlow contract={contract} />
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ─── Propuestas ────────────────────────────────────────────────────

function QuotationsTab({ quotations, clientId, total }: { quotations: Quotation[]; clientId: string; total: number }) {
    if (quotations.length === 0) {
        return <Vacio texto="No hay propuestas registradas." href={`/admin/cotizaciones/${clientId}?action=new`} enlace="Crear una propuesta" />;
    }

    return (
        <div>
            <Recorte mostrados={quotations.length} total={total} href={`/admin/cotizaciones/${clientId}`} texto="Ver todas en Propuestas" />
            <ul className="border-t border-[var(--linea)]">
                {quotations.map((q) => (
                    <li key={q.id} className="flex flex-col justify-between gap-2 border-b border-[var(--linea)] py-3 sm:flex-row sm:items-center sm:gap-4">
                        <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-[var(--txt)]">{q.projectName}</h3>
                            <p className="mt-0.5 font-mono text-xs text-[var(--mut)]">{q.folio} · {formatDate(q.createdAt)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                            <p className="text-right text-sm tabular-nums">
                                <span className="font-semibold text-[var(--txt)]">{formatCLP(q.total)}</span>
                                {q.totalPaid > 0 && <span className="block text-xs text-emerald-400">Cobrado {formatCLP(q.totalPaid)}</span>}
                            </p>
                            <StatusBadge status={q.status} nombres={ESTADO_PROPUESTA} />
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ─── Negocios ──────────────────────────────────────────────────────

const priorityColors: Record<string, string> = {
    LOW: "text-[var(--mut)]",
    MEDIUM: "text-amber-400",
    HIGH: "text-red-400",
    URGENT: "text-red-400",
};

function DealsTab({ deals, total }: { deals: Deal[]; total: number }) {
    if (deals.length === 0) {
        return <Vacio texto="Sin negocios con este cliente." href="/admin/gestion-comercial/pipeline?nueva=1" enlace="Crear una oportunidad" />;
    }

    return (
        <div>
            <Recorte mostrados={deals.length} total={total} href="/admin/gestion-comercial/pipeline" texto="Ver todos en Oportunidades" />
            <ul className="border-t border-[var(--linea)]">
                {deals.map((d) => (
                    <li key={d.id} className={FILA}>
                        <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-[var(--txt)]">{d.title}</h3>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                <StatusBadge status={d.stage} nombres={ETAPA} />
                                <span className={`font-medium ${priorityColors[d.priority] || "text-[var(--mut)]"}`}>Prioridad {(PRIORIDAD[d.priority] ?? d.priority).toLowerCase()}</span>
                            </div>
                        </div>
                        <p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--txt)]">{d.estimatedValue ? formatCLP(d.estimatedValue) : "—"}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ─── Gastos ────────────────────────────────────────────────────────

function ExpensesTab({ expenses }: { expenses: Expense[] }) {
    if (expenses.length === 0) {
        return <Vacio texto="Sin gastos registrados." />;
    }

    return (
        <div>
            {expenses.length >= 20 && <p className="mb-3 text-xs text-[var(--mut)]">Se muestran los 20 más recientes. El total de todos está arriba, en «Gastos».</p>}
            <ul className="border-t border-[var(--linea)]">
                {expenses.map((e) => (
                    <li key={e.id} className={FILA}>
                        <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-[var(--txt)]">{e.description}</h3>
                            <p className="mt-0.5 text-xs text-[var(--mut)]">{CATEGORIA[e.category] ?? e.category} · {formatDate(e.expenseDate)}</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold tabular-nums text-red-400">−{formatCLP(e.amount)}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
}
