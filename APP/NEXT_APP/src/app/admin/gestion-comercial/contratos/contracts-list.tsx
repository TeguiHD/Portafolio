"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import type { ContractStatus, ContractType } from '@/generated/prisma/client';
import { confirmar } from "@/modules/admin/confirmar/confirmar";
import DialogoFormulario from "../dialogo-formulario";
import SelectorBuscable from "../selector-buscable";
import { Cifras } from "../cifras";
import {
    bajada, botonIcono, botonIconoPeligro, botonPrincipal, botonSecundario, cajaTabla, campo, chip, cifra, etiqueta,
    guardando, pesos, td, th, thNum, titulo, vacio,
} from "../estilos";
import { createContractAction, updateContractAction, deleteContractAction, getContractContentAction } from "./actions";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface ContractClient {
    id: string;
    name: string;
    workType: string | null;
}

interface ContractData {
    id: string;
    contractNumber: string;
    title: string;
    description: string | null;
    status: ContractStatus;
    type: ContractType;
    totalAmount: number;
    startDate: string | null;
    endDate: string | null;
    autoRenew: boolean;
    renewalAlertDays: number;
    createdAt: string;
    client: ContractClient;
}

interface ClientOption {
    id: string;
    name: string;
    workType: string | null;
}

/** Nombre y punto de color de cada estado (el punto acompaña al texto, nunca lo reemplaza). */
const STATUS_CONFIG: Record<ContractStatus, { label: string; punto: string }> = {
    DRAFT: { label: "Borrador", punto: "bg-[var(--mut)]" },
    ACTIVE: { label: "Activo", punto: "bg-emerald-400" },
    PAUSED: { label: "Pausado", punto: "bg-amber-400" },
    COMPLETED: { label: "Completado", punto: "bg-blue-400" },
    CANCELLED: { label: "Cancelado", punto: "bg-red-400" },
    EXPIRED: { label: "Vencido", punto: "bg-amber-400" },
};

const TYPE_LABELS: Record<ContractType, string> = {
    PROJECT: "Proyecto",
    RETAINER: "Mensualidad",
    MAINTENANCE: "Mantenimiento",
    CONSULTING: "Consultoría",
};

function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("es-CL", {
        day: "2-digit", month: "short", year: "numeric", timeZone: "America/Santiago",
    });
}

// ============================================================================
// VISTA PREVIA DEL HTML (iframe sin scripts)
// ============================================================================

function HtmlPreview({ html, onClose }: { html: string; onClose: () => void }) {
    return (
        <DialogoFormulario titulo="Vista previa del contrato" alCerrar={onClose} ancho="max-w-4xl">
            {(cerrar) => (
                <div className="space-y-3">
                    {/* srcDoc + sandbox sin allow-scripts: el HTML se ve, pero no ejecuta nada. Fondo blanco: imita el papel. */}
                    <iframe
                        srcDoc={html}
                        sandbox=""
                        className="h-[65dvh] w-full rounded-lg border border-[var(--linea-2)] bg-white"
                        title="Vista previa del contrato"
                    />
                    <div className="flex justify-end">
                        <button type="button" onClick={cerrar} className={botonSecundario}>
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </DialogoFormulario>
    );
}

// ============================================================================
// CONTRATO NUEVO O EDICIÓN
// ============================================================================

/** Datos con que parte un contrato nuevo (desde una oportunidad ganada). */
export interface BorradorContrato {
    clientId: string;
    title: string;
    totalAmount: string;
}

function ContractModal({
    clients,
    contract,
    inicial,
    onClose,
    onSaved,
}: {
    clients: ClientOption[];
    /** Si viene, se edita; si no, se crea uno nuevo. */
    contract?: ContractData;
    inicial?: BorradorContrato | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [editorMode, setEditorMode] = useState<"manual" | "code">("manual");
    const [showPreview, setShowPreview] = useState(false);
    // Al editar, las cláusulas y el HTML se piden aparte (la lista no los trae).
    const [cargando, setCargando] = useState(Boolean(contract));
    const [form, setForm] = useState({
        title: contract?.title ?? inicial?.title ?? "",
        clientId: contract?.client.id ?? inicial?.clientId ?? "",
        description: contract?.description ?? "",
        type: contract?.type ?? ("PROJECT" as ContractType),
        status: contract?.status ?? ("DRAFT" as ContractStatus),
        totalAmount: contract ? String(Math.round(contract.totalAmount)) : inicial?.totalAmount ?? "",
        startDate: contract?.startDate?.slice(0, 10) ?? "",
        endDate: contract?.endDate?.slice(0, 10) ?? "",
        terms: "",
        htmlContent: "",
        autoRenew: contract?.autoRenew ?? false,
        renewalAlertDays: String(contract?.renewalAlertDays ?? 30),
    });
    const id = contract ? `contrato-${contract.id}` : "contrato-nuevo";

    useEffect(() => {
        if (!contract) return;
        let vigente = true;
        getContractContentAction(contract.id).then((r) => {
            if (!vigente) return;
            if (r.success) {
                setForm(f => ({ ...f, terms: r.terms, htmlContent: r.htmlContent }));
                if (r.htmlContent.trim() && !r.terms.trim()) setEditorMode("code");
            } else {
                setError(r.error);
            }
            setCargando(false);
        });
        return () => { vigente = false; };
    }, [contract]);

    const clientOptions = clients.map(c => ({
        id: c.id,
        label: c.name,
        sublabel: c.workType || undefined,
    }));

    const guardar = (cerrar: () => void) => (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!form.title.trim() || !form.clientId) {
            setError("Título y cliente son requeridos");
            return;
        }
        if (form.startDate && form.endDate && form.endDate < form.startDate) {
            setError("La fecha de término no puede ser anterior a la de inicio");
            return;
        }
        const dias = Number(form.renewalAlertDays);
        if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
            setError("El aviso va de 1 a 365 días antes del término");
            return;
        }
        startTransition(async () => {
            const result = contract
                ? await updateContractAction(contract.id, {
                    title: form.title,
                    description: form.description || null,
                    type: form.type,
                    status: form.status,
                    totalAmount: Number(form.totalAmount) || 0,
                    startDate: form.startDate || null,
                    endDate: form.endDate || null,
                    terms: form.terms || null,
                    htmlContent: form.htmlContent || null,
                    autoRenew: form.autoRenew,
                    renewalAlertDays: dias,
                })
                : await createContractAction({
                    title: form.title,
                    clientId: form.clientId,
                    description: form.description || undefined,
                    type: form.type,
                    totalAmount: Number(form.totalAmount) || 0,
                    startDate: form.startDate || undefined,
                    endDate: form.endDate || undefined,
                    terms: form.terms || undefined,
                    htmlContent: form.htmlContent || undefined,
                    autoRenew: form.autoRenew,
                    renewalAlertDays: dias,
                });
            if (result.success) {
                toast.success(contract ? "Contrato actualizado" : "Contrato creado");
                onSaved();
                cerrar();
            } else {
                setError(result.error || "No se pudo guardar");
            }
        });
    };

    const modo = (activo: boolean) => `min-h-11 sm:min-h-10 rounded-md px-3 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--acento)] ${activo
        ? "bg-[var(--sup)] font-semibold text-[var(--txt)] shadow-sm"
        : "text-[var(--mut)] hover:text-[var(--txt)]"}`;

    return (
        <>
            <DialogoFormulario
                titulo={contract ? `Editar contrato ${contract.contractNumber}` : "Nuevo contrato"}
                alCerrar={onClose}
            >
                {(cerrar) => (
                    <form onSubmit={guardar(cerrar)} className="space-y-4" noValidate aria-busy={cargando}>
                        <div>
                            <label htmlFor={`${id}-t`} className={etiqueta}>Título *</label>
                            <input id={`${id}-t`} type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                maxLength={200} required className={campo} placeholder="Ej: Contrato desarrollo web" />
                        </div>

                        {contract ? (
                            <p className="text-sm text-[var(--mut)]">
                                Cliente: <span className="text-[var(--txt)]">{contract.client.name}</span>
                            </p>
                        ) : (
                            <SelectorBuscable
                                label="Cliente *"
                                value={form.clientId}
                                onChange={(clientId) => setForm(f => ({ ...f, clientId }))}
                                options={clientOptions}
                                placeholder="Seleccionar cliente..."
                                emptyText="No se encontraron clientes"
                                searchPlaceholder="Buscar cliente..."
                            />
                        )}

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label htmlFor={`${id}-ti`} className={etiqueta}>Tipo</label>
                                <select id={`${id}-ti`} value={form.type} className={campo}
                                    onChange={e => setForm(f => ({ ...f, type: e.target.value as ContractType }))}>
                                    {(Object.entries(TYPE_LABELS) as [ContractType, string][]).map(([key, val]) => (
                                        <option key={key} value={key}>{val}</option>
                                    ))}
                                </select>
                            </div>
                            {contract ? (
                                <div>
                                    <label htmlFor={`${id}-e`} className={etiqueta}>Estado</label>
                                    <select id={`${id}-e`} value={form.status} className={campo}
                                        onChange={e => setForm(f => ({ ...f, status: e.target.value as ContractStatus }))}>
                                        {(Object.entries(STATUS_CONFIG) as [ContractStatus, typeof STATUS_CONFIG[ContractStatus]][]).map(([k, v]) => (
                                            <option key={k} value={k}>{v.label}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <p className="text-sm text-[var(--mut)] sm:self-end sm:pb-3">Se crea como borrador.</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div>
                                <label htmlFor={`${id}-v`} className={etiqueta}>Valor total (CLP)</label>
                                <input
                                    id={`${id}-v`}
                                    type="text"
                                    inputMode="numeric"
                                    value={form.totalAmount ? Number(form.totalAmount).toLocaleString("es-CL") : ""}
                                    onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value.replace(/[^0-9]/g, "").slice(0, 13) }))}
                                    className={`${campo} tabular-nums`}
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label htmlFor={`${id}-i`} className={etiqueta}>Inicio</label>
                                <input id={`${id}-i`} type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={campo} />
                            </div>
                            <div>
                                <label htmlFor={`${id}-f`} className={etiqueta}>Término</label>
                                <input id={`${id}-f`} type="date" value={form.endDate} min={form.startDate || undefined} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className={campo} />
                            </div>
                        </div>

                        <div>
                            <label htmlFor={`${id}-d`} className={etiqueta}>Descripción</label>
                            <textarea id={`${id}-d`} rows={2} maxLength={2000} value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${campo} resize-none`} />
                        </div>

                        {/* Cláusulas: texto o HTML. Se guardan los dos campos tal como están. */}
                        <div>
                            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-sm text-[var(--mut)]" id={`${id}-cl`}>Términos y cláusulas</span>
                                <div className="flex gap-1 rounded-lg border border-[var(--linea)] bg-[var(--fondo-2)] p-0.5" role="group" aria-labelledby={`${id}-cl`}>
                                    <button type="button" aria-pressed={editorMode === "manual"} onClick={() => setEditorMode("manual")} className={modo(editorMode === "manual")}>
                                        Texto
                                    </button>
                                    <button type="button" aria-pressed={editorMode === "code"} onClick={() => setEditorMode("code")} className={modo(editorMode === "code")}>
                                        HTML
                                    </button>
                                </div>
                            </div>
                            {cargando ? (
                                <p className="py-3 text-sm text-[var(--mut)]" role="status">Cargando cláusulas…</p>
                            ) : editorMode === "manual" ? (
                                <textarea
                                    aria-labelledby={`${id}-cl`}
                                    value={form.terms}
                                    onChange={e => setForm(f => ({ ...f, terms: e.target.value }))}
                                    rows={5}
                                    maxLength={10000}
                                    className={`${campo} resize-y`}
                                    placeholder={"1. Primera cláusula...\n2. Segunda cláusula..."}
                                />
                            ) : (
                                <div className="space-y-2">
                                    <textarea
                                        aria-labelledby={`${id}-cl`}
                                        value={form.htmlContent}
                                        onChange={e => setForm(f => ({ ...f, htmlContent: e.target.value }))}
                                        rows={8}
                                        maxLength={102400}
                                        className={`${campo.replace("text-sm", "text-xs")} resize-y font-mono leading-relaxed`}
                                        placeholder={"<!DOCTYPE html>\n<html lang='es'>\n<body>\n  <!-- contenido del contrato -->\n</body>\n</html>"}
                                        spellCheck={false}
                                    />
                                    {form.htmlContent.trim() && (
                                        <button type="button" onClick={() => setShowPreview(true)} className={botonSecundario}>
                                            Vista previa
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* El aviso vale para todo contrato activo con término (el resumen de Comercial lo usa siempre), no solo
                            para los que se renuevan solos: antes el campo se escondía y quedaba fijo en 30 días. */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <div className="flex items-center gap-2">
                                <label htmlFor={`${id}-a`} className="text-sm text-[var(--mut)]">Avisar</label>
                                <input id={`${id}-a`} type="number" inputMode="numeric" min={1} max={365} value={form.renewalAlertDays}
                                    onChange={e => setForm(f => ({ ...f, renewalAlertDays: e.target.value }))}
                                    aria-describedby={`${id}-a-nota`}
                                    className="min-h-11 w-20 rounded-lg border border-[var(--linea-2)] bg-[var(--fondo-2)] px-3 text-sm tabular-nums text-[var(--txt)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--acento)]" />
                                <span id={`${id}-a-nota`} className="text-sm text-[var(--mut)]">días antes del término</span>
                            </div>
                            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-[var(--txt)]">
                                <input type="checkbox" checked={form.autoRenew} onChange={e => setForm(f => ({ ...f, autoRenew: e.target.checked }))}
                                    className="size-4 accent-[var(--acento)]" />
                                Se renueva automáticamente (acordado con el cliente)
                            </label>
                        </div>
                        <p className="-mt-2 text-xs text-[var(--mut)]">
                            El panel no extiende la fecha por su cuenta: al renovar, cambia el término aquí.
                        </p>

                        <p role="alert" className="text-sm text-red-400">{error}</p>

                        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                            <button type="button" onClick={cerrar} className={botonSecundario}>Cancelar</button>
                            <button type="submit" disabled={isPending || cargando} className={botonPrincipal}>
                                {isPending ? "Guardando..." : contract ? "Guardar cambios" : "Crear contrato"}
                            </button>
                        </div>
                    </form>
                )}
            </DialogoFormulario>

            {showPreview && form.htmlContent.trim() && (
                <HtmlPreview html={form.htmlContent} onClose={() => setShowPreview(false)} />
            )}
        </>
    );
}

// ============================================================================
// GRUPO DE UN CLIENTE (un <tbody> de la tabla, plegable)
// ============================================================================

const COLUMNAS = 5;

function ClientContractGroup({
    clientName,
    clientWorkType,
    contracts,
    totalValue,
    onStatusChange,
    onDelete,
    onEdit,
}: {
    clientName: string;
    clientWorkType: string | null;
    contracts: ContractData[];
    totalValue: number;
    onStatusChange: (contractId: string, newStatus: ContractStatus) => void;
    onDelete: (contract: ContractData) => void;
    onEdit: (contract: ContractData) => void;
}) {
    const [expanded, setExpanded] = useState(true);

    return (
        <tbody>
            <tr className="border-b border-[var(--linea)]">
                <th scope="rowgroup" colSpan={COLUMNAS} className="px-0 pt-6 pb-0 text-left font-normal">
                    <button
                        type="button"
                        onClick={() => setExpanded(!expanded)}
                        aria-expanded={expanded}
                        className="flex min-h-11 w-full items-center gap-3 rounded-lg px-0.5 py-2 text-left transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)]"
                    >
                        <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-[var(--mut)] motion-safe:transition-transform motion-safe:duration-150 ${expanded ? "" : "-rotate-90"}`} />
                        <span className="min-w-0">
                            <span className="block font-semibold text-[var(--txt)]">{clientName}</span>
                            <span className="block text-[13px] text-[var(--mut)]">
                                {clientWorkType && <>{clientWorkType} · </>}
                                {contracts.length} contrato{contracts.length !== 1 ? "s" : ""} · <span className="tabular-nums">{pesos(totalValue)}</span>
                            </span>
                        </span>
                    </button>
                </th>
            </tr>
            {expanded && contracts.map(contract => {
                const statusCfg = STATUS_CONFIG[contract.status];
                const vigencia = `${formatDate(contract.startDate)} – ${formatDate(contract.endDate)}`;
                return (
                    <tr key={contract.id} className="border-b border-[var(--linea)]">
                        <th scope="row" className={`${td} text-left font-normal`}>
                            <span className="block font-medium text-[var(--txt)]">{contract.title}</span>
                            <span className="mt-0.5 block text-[13px] text-[var(--mut)]">
                                <span className="font-mono">{contract.contractNumber}</span> · {TYPE_LABELS[contract.type]}
                                {contract.autoRenew && <> · Renovación automática</>}
                            </span>
                            <span className="mt-0.5 block text-[13px] text-[var(--mut)] md:hidden">{vigencia}</span>
                            <span className="mt-0.5 block text-[13px] font-semibold tabular-nums text-[var(--txt)] sm:hidden">{pesos(contract.totalAmount)}</span>
                        </th>
                        <td className={`${td} whitespace-nowrap text-[var(--mut)] max-md:hidden`}>{vigencia}</td>
                        <td className={`${td} ${cifra} font-semibold text-[var(--txt)] max-sm:hidden`}>{pesos(contract.totalAmount)}</td>
                        <td className={td}>
                            <span className="flex items-center gap-2">
                                <i aria-hidden="true" className={`size-2 shrink-0 rounded-full ${statusCfg.punto}`} />
                                <select
                                    value={contract.status}
                                    aria-label={`Estado de ${contract.contractNumber}`}
                                    onChange={e => onStatusChange(contract.id, e.target.value as ContractStatus)}
                                    className="min-h-11 min-w-0 cursor-pointer rounded-lg border border-[var(--linea-2)] bg-[var(--fondo-2)] px-2 text-sm text-[var(--txt)] sm:min-h-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--acento)]"
                                >
                                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                            </span>
                        </td>
                        <td className={td}>
                            <span className="flex justify-end gap-1">
                                <button type="button" onClick={() => onEdit(contract)} className={botonIcono} aria-label={`Editar contrato ${contract.contractNumber}`}>
                                    <Pencil size={16} aria-hidden="true" />
                                </button>
                                <button type="button" onClick={() => onDelete(contract)} className={botonIconoPeligro} aria-label={`Eliminar contrato ${contract.contractNumber}`}>
                                    <Trash2 size={16} aria-hidden="true" />
                                </button>
                            </span>
                        </td>
                    </tr>
                );
            })}
        </tbody>
    );
}

// ============================================================================
// LISTA DE CONTRATOS
// ============================================================================

/** Lo que vale la cartera: sin cancelados ni borradores (igual que en el resumen de Comercial). */
const cuentaEnCartera = (c: ContractData) => c.status !== "CANCELLED" && c.status !== "DRAFT";

export function ContractsList({
    initialContracts,
    clients,
    borrador = null,
}: {
    initialContracts: ContractData[];
    clients: ClientOption[];
    /** Llega desde una oportunidad ganada («Crear contrato»): abre el formulario con cliente, título y valor. */
    borrador?: BorradorContrato | null;
}) {
    const [contracts, setContracts] = useState(initialContracts);
    // Si el servidor manda otra lista (router.refresh tras guardar), esa manda.
    const [base, setBase] = useState(initialContracts);
    if (base !== initialContracts) {
        setBase(initialContracts);
        setContracts(initialContracts);
    }
    const [showCreate, setShowCreate] = useState(Boolean(borrador));
    const [editing, setEditing] = useState<ContractData | null>(null);
    const [filter, setFilter] = useState<ContractStatus | "ALL">("ALL");
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const ruta = usePathname();

    // Los datos de la oportunidad se usan una vez: se quitan de la URL para que recargar no vuelva a abrir el formulario.
    useEffect(() => {
        if (borrador) router.replace(ruta, { scroll: false });
    }, [borrador, router, ruta]);

    const filtered = filter === "ALL" ? contracts : contracts.filter(c => c.status === filter);

    const totalValue = contracts.filter(cuentaEnCartera).reduce((s, c) => s + c.totalAmount, 0);
    const activeCount = contracts.filter(c => c.status === "ACTIVE").length;

    // Group filtered contracts by client
    const groupedByClient = filtered.reduce<Record<string, { clientName: string; clientWorkType: string | null; contracts: ContractData[]; totalValue: number }>>((acc, c) => {
        const key = c.client.id;
        if (!acc[key]) {
            acc[key] = { clientName: c.client.name, clientWorkType: c.client.workType, contracts: [], totalValue: 0 };
        }
        acc[key].contracts.push(c);
        if (cuentaEnCartera(c)) acc[key].totalValue += c.totalAmount;
        return acc;
    }, {});

    // Sort groups by total value descending
    const sortedGroups = Object.entries(groupedByClient).sort(([, a], [, b]) => b.totalValue - a.totalValue);

    const handleStatusChange = useCallback((contractId: string, newStatus: ContractStatus) => {
        const antes = contracts;
        setContracts(prev => prev.map(c => c.id === contractId ? { ...c, status: newStatus } : c));
        startTransition(async () => {
            const result = await updateContractAction(contractId, { status: newStatus });
            if (!result.success) {
                setContracts(antes);
                toast.error(result.error || "No se pudo cambiar el estado");
            }
        });
    }, [contracts]);

    const handleDelete = useCallback(async (contract: ContractData) => {
        if (!(await confirmar({ titulo: `¿Eliminar el contrato ${contract.contractNumber}?`, detalle: `«${contract.title}». No se puede deshacer.`, accion: "Eliminar", peligro: true }))) return;
        const antes = contracts;
        setContracts(prev => prev.filter(c => c.id !== contract.id));
        startTransition(async () => {
            const result = await deleteContractAction(contract.id);
            if (!result.success) {
                setContracts(antes);
                toast.error(result.error || "No se pudo eliminar el contrato");
            }
        });
    }, [contracts]);

    return (
        <div className="max-w-[1180px] space-y-9">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className={titulo}>Contratos</h1>
                    <p className={bajada}>
                        Acuerdos con tus clientes: valor, fechas, renovación y estado · {contracts.length} registro{contracts.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <button type="button" onClick={() => setShowCreate(true)} className={botonPrincipal}>
                    <Plus size={16} aria-hidden="true" />
                    Nuevo contrato
                </button>
            </header>

            <Cifras nombre="Resumen de contratos" items={[
                { etiqueta: "valor en cartera", valor: pesos(totalValue), nota: "sin cancelados ni borradores" },
                { etiqueta: "contratos activos", valor: String(activeCount) },
                { etiqueta: "total registrados", valor: String(contracts.length) },
            ]} />

            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por estado">
                <span className="mr-1 text-sm text-[var(--mut)]" aria-hidden="true">Filtrar por estado:</span>
                <button type="button" aria-pressed={filter === "ALL"} onClick={() => setFilter("ALL")} className={chip(filter === "ALL")}>
                    Todos <span className="tabular-nums text-[var(--mut)]">{contracts.length}</span>
                </button>
                {(Object.entries(STATUS_CONFIG) as [ContractStatus, typeof STATUS_CONFIG[ContractStatus]][]).map(([key, cfg]) => {
                    const count = contracts.filter(c => c.status === key).length;
                    if (count === 0) return null;
                    return (
                        <button type="button" key={key} aria-pressed={filter === key} onClick={() => setFilter(key)} className={chip(filter === key)}>
                            <i aria-hidden="true" className={`size-2 rounded-full ${cfg.punto}`} />
                            {cfg.label} <span className="tabular-nums text-[var(--mut)]">{count}</span>
                        </button>
                    );
                })}
            </div>

            {filtered.length === 0 ? (
                <div className={vacio}>
                    <p className="font-medium text-[var(--txt)]">No se encontraron contratos</p>
                    <p className="mt-1 text-sm">Prueba con otro filtro o crea un contrato nuevo.</p>
                </div>
            ) : (
                // Una tabla con un grupo (tbody) por cliente. En celular, vigencia y valor bajan a la primera columna.
                <div className={cajaTabla} tabIndex={0} role="region" aria-label="Contratos por cliente">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-[var(--linea-2)]">
                                <th scope="col" className={th}>Contrato</th>
                                <th scope="col" className={`${th} max-md:hidden`}>Vigencia</th>
                                <th scope="col" className={`${thNum} max-sm:hidden`}>Valor</th>
                                <th scope="col" className={th}>Estado</th>
                                <th scope="col" className={th}><span className="sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        {sortedGroups.map(([clientId, group]) => (
                            <ClientContractGroup
                                key={clientId}
                                clientName={group.clientName}
                                clientWorkType={group.clientWorkType}
                                contracts={group.contracts}
                                totalValue={group.totalValue}
                                onStatusChange={handleStatusChange}
                                onDelete={handleDelete}
                                onEdit={setEditing}
                            />
                        ))}
                    </table>
                </div>
            )}

            {isPending && <div role="status" className={guardando}>Guardando...</div>}

            {showCreate && <ContractModal clients={clients} inicial={borrador} onClose={() => setShowCreate(false)} onSaved={() => router.refresh()} />}
            {editing && <ContractModal key={editing.id} clients={clients} contract={editing} onClose={() => setEditing(null)} onSaved={() => router.refresh()} />}
        </div>
    );
}
