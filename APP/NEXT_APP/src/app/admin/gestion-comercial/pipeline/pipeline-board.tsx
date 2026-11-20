"use client";

import { useState, useTransition, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { confirmar } from "@/modules/admin/confirmar/confirmar";
import DialogoFormulario from "../dialogo-formulario";
import SelectorBuscable from "../selector-buscable";
import { Cifras } from "../cifras";
import { bajada, botonPeligro, botonPrincipal, botonSecundario, campo, chip, etiqueta, guardando, pesos, titulo } from "../estilos";
import type { DealStage, DealPriority, DealOrigin } from '@/generated/prisma/client';
import {
    createDealAction,
    updateDealAction,
    moveDealStageAction,
    deleteDealAction,
    addDealActivityAction,
} from "./actions";

// ============================================================================
// TYPES
// ============================================================================

interface DealClient {
    id: string;
    name: string;
    workType: string | null;
}

interface DealQuotation {
    id: string;
    projectName: string;
    total: number;
    status: string;
}

interface Deal {
    id: string;
    title: string;
    description: string | null;
    stage: DealStage;
    priority: DealPriority;
    origin: DealOrigin;
    estimatedValue: number;
    closeProbability: number;
    estimatedCloseAt: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    client: DealClient;
    quotation: DealQuotation | null;
    _count: { activities: number };
}

interface ClientOption {
    id: string;
    name: string;
    workType: string | null;
}

interface PipelineBoardProps {
    initialDeals: Deal[];
    clients: ClientOption[];
    /** Llega con ?nueva=1 desde el resumen de Comercial: abre el formulario de oportunidad nueva. */
    abrirNueva?: boolean;
    /** Puede crear contratos: una oportunidad ganada ofrece «Crear contrato». */
    puedeContratos?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Cada etapa con su nombre y un punto de color (el punto acompaña al texto, nunca lo reemplaza). */
const STAGES: { key: DealStage; label: string; punto: string }[] = [
    { key: "PROSPECT", label: "Prospecto", punto: "bg-[var(--mut)]" },
    { key: "CONTACTED", label: "Contactado", punto: "bg-blue-400" },
    { key: "PROPOSAL", label: "Propuesta", punto: "bg-cyan-400" },
    { key: "NEGOTIATION", label: "Negociación", punto: "bg-amber-400" },
    { key: "WON", label: "Ganado", punto: "bg-emerald-400" },
    { key: "LOST", label: "Perdido", punto: "bg-red-400" },
];

const PRIORITIES: Record<DealPriority, { label: string; color: string }> = {
    LOW: { label: "Baja", color: "text-[var(--mut)]" },
    MEDIUM: { label: "Media", color: "text-blue-400" },
    HIGH: { label: "Alta", color: "text-amber-400" },
    URGENT: { label: "Urgente", color: "text-red-400" },
};

const ORIGINS: Record<DealOrigin, string> = {
    REFERRAL: "Referido",
    WEB: "Web",
    SOCIAL_MEDIA: "Redes sociales",
    DIRECT: "Directo",
    OTHER: "Otro",
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `hace ${Math.max(0, minutes)} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return days === 1 ? "hace 1 día" : `hace ${days} días`;
}

/** Abiertos: los que aún pueden ganarse. Ganados y perdidos ya no suman al valor en juego. */
const abierto = (stage: DealStage) => stage !== "WON" && stage !== "LOST";

/** Contratos con el formulario abierto y los datos de la oportunidad ganada. */
const enlaceContrato = (deal: Pick<Deal, "title" | "estimatedValue" | "client">) =>
    `/admin/gestion-comercial/contratos?${new URLSearchParams({
        nuevo: "1", cliente: deal.client.id, titulo: deal.title, valor: String(Math.round(deal.estimatedValue)),
    })}`;

// ============================================================================
// DEAL CARD
// ============================================================================

function DealCard({
    deal,
    onMove,
    onDelete,
    onEdit,
    onAddActivity,
    puedeContratos,
}: {
    deal: Deal;
    onMove: (dealId: string, stage: DealStage) => void;
    onDelete: (dealId: string) => void;
    onEdit: (deal: Deal) => void;
    onAddActivity: (dealId: string) => void;
    puedeContratos: boolean;
}) {
    const [showActions, setShowActions] = useState(false);
    const priority = PRIORITIES[deal.priority];
    const idAcciones = `acciones-${deal.id}`;

    return (
        <div className="rounded-lg border border-[var(--linea)] bg-[var(--sup)] transition-colors duration-150 hover:border-[var(--linea-2)]">
            {/* Todo el resumen es un botón: abre o cierra las acciones (también con teclado). */}
            <button
                type="button"
                onClick={() => setShowActions(!showActions)}
                aria-expanded={showActions}
                aria-controls={idAcciones}
                className="block w-full rounded-lg p-3.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)]"
            >
                <span className="mb-1 flex items-start justify-between gap-2">
                    <span className="line-clamp-2 flex-1 text-[15px] leading-snug font-semibold text-[var(--txt)]">
                        {deal.title}
                    </span>
                    <span className={`shrink-0 text-xs font-medium ${priority.color}`}>
                        {priority.label}
                    </span>
                </span>

                <span className="mb-3 block truncate text-[13px] text-[var(--mut)]">
                    {deal.client.name}
                    {deal.client.workType && <>&nbsp;· {deal.client.workType}</>}
                </span>

                <span className="mb-2 flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold tabular-nums text-[var(--txt)]">
                        {pesos(deal.estimatedValue)}
                    </span>
                    <span className="text-xs tabular-nums text-[var(--mut)]">
                        {deal.closeProbability}% de cierre
                    </span>
                </span>

                <span className="mb-3 block h-1 w-full overflow-hidden rounded-full bg-[var(--linea-2)]" aria-hidden="true">
                    <span className="block h-full rounded-full bg-[var(--acento)]" style={{ width: `${deal.closeProbability}%` }} />
                </span>

                <span className="flex items-center justify-between text-xs text-[var(--mut)]">
                    <span>{ORIGINS[deal.origin]}</span>
                    <span>{timeAgo(deal.updatedAt)}</span>
                </span>
            </button>

            {showActions && (
                <div id={idAcciones} className="space-y-2 border-t border-[var(--linea)] px-3.5 pt-3 pb-3.5">
                    <p className="text-xs text-[var(--mut)]">Mover a</p>
                    <div className="flex flex-wrap gap-1.5">
                        {STAGES.filter(s => s.key !== deal.stage).map(stage => (
                            <button
                                key={stage.key}
                                type="button"
                                onClick={() => onMove(deal.id, stage.key)}
                                className={chip(false)}
                            >
                                <i aria-hidden="true" className={`size-2 rounded-full ${stage.punto}`} />
                                {stage.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {deal.stage === "WON" && puedeContratos && (
                            <Link href={enlaceContrato(deal)} className={`${botonPrincipal} basis-full`}>
                                Crear contrato
                            </Link>
                        )}
                        <button type="button" onClick={() => onEdit(deal)} className={`${botonSecundario} flex-1`}>
                            Editar
                        </button>
                        <button type="button" onClick={() => onAddActivity(deal.id)} className={`${botonSecundario} flex-1`}>
                            Agregar nota
                        </button>
                        <button type="button" onClick={() => onDelete(deal.id)} className={botonPeligro}>
                            Eliminar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// NEGOCIO NUEVO O EDICIÓN
// ============================================================================

function DealModal({
    clients,
    deal,
    onClose,
    onSaved,
}: {
    clients: ClientOption[];
    /** Si viene, se edita ese negocio; si no, se crea uno nuevo. */
    deal?: Deal;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({
        title: deal?.title ?? "",
        clientId: deal?.client.id ?? "",
        description: deal?.description ?? "",
        priority: deal?.priority ?? ("MEDIUM" as DealPriority),
        origin: deal?.origin ?? ("DIRECT" as DealOrigin),
        estimatedValue: deal ? String(Math.round(deal.estimatedValue)) : "",
        closeProbability: deal ? String(deal.closeProbability) : "50",
        estimatedCloseAt: deal?.estimatedCloseAt ? deal.estimatedCloseAt.slice(0, 10) : "",
        notes: deal?.notes ?? "",
    });
    const id = deal ? `negocio-${deal.id}` : "negocio-nuevo";

    const guardar = (cerrar: () => void) => (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!form.title.trim() || !form.clientId) {
            setError("Título y cliente son requeridos");
            return;
        }
        const probabilidad = Number(form.closeProbability);
        if (!Number.isInteger(probabilidad) || probabilidad < 0 || probabilidad > 100) {
            setError("La probabilidad va de 0 a 100");
            return;
        }
        startTransition(async () => {
            const comun = {
                title: form.title,
                description: form.description,
                priority: form.priority,
                origin: form.origin,
                estimatedValue: Number(form.estimatedValue) || 0,
                closeProbability: probabilidad,
            };
            const result = deal
                ? await updateDealAction(deal.id, {
                    ...comun,
                    estimatedCloseAt: form.estimatedCloseAt || null,
                    notes: form.notes,
                })
                : await createDealAction({
                    ...comun,
                    description: form.description || undefined,
                    clientId: form.clientId,
                    estimatedCloseAt: form.estimatedCloseAt || undefined,
                    notes: form.notes || undefined,
                });
            if (result.success) {
                toast.success(deal ? "Oportunidad actualizada" : "Oportunidad creada");
                onSaved();
                cerrar();
            } else {
                setError(result.error || "No se pudo guardar");
            }
        });
    };

    return (
        <DialogoFormulario titulo={deal ? "Editar oportunidad" : "Nueva oportunidad"} alCerrar={onClose}>
            {(cerrar) => (
                <form onSubmit={guardar(cerrar)} className="space-y-4" noValidate>
                    <div>
                        <label htmlFor={`${id}-t`} className={etiqueta}>Título *</label>
                        <input
                            id={`${id}-t`}
                            type="text"
                            value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            maxLength={200}
                            required
                            className={campo}
                            placeholder="Ej: Sitio web para empresa X"
                        />
                    </div>

                    {deal ? (
                        <p className="text-sm text-[var(--mut)]">
                            Cliente: <span className="text-[var(--txt)]">{deal.client.name}</span>
                        </p>
                    ) : clients.length === 0 ? (
                        <p className="text-sm text-[var(--mut)]">
                            Primero necesitas un cliente:{" "}
                            <Link href="/admin/clientes" className="text-[var(--acento)] underline underline-offset-2">crea uno en Clientes</Link>.
                        </p>
                    ) : (
                        <SelectorBuscable
                            label="Cliente *"
                            value={form.clientId}
                            onChange={(clientId) => setForm(f => ({ ...f, clientId }))}
                            options={clients.map(c => ({ id: c.id, label: c.name, sublabel: c.workType || undefined }))}
                            placeholder="Seleccionar cliente..."
                            emptyText="No se encontraron clientes"
                            searchPlaceholder="Buscar cliente..."
                        />
                    )}

                    <fieldset>
                        <legend className={etiqueta}>Prioridad</legend>
                        <div className="flex flex-wrap gap-1.5">
                            {(Object.entries(PRIORITIES) as [DealPriority, { label: string; color: string }][]).map(([key, val]) => (
                                <button
                                    key={key}
                                    type="button"
                                    aria-pressed={form.priority === key}
                                    onClick={() => setForm(f => ({ ...f, priority: key }))}
                                    className={chip(form.priority === key)}
                                >
                                    {val.label}
                                </button>
                            ))}
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend className={etiqueta}>Origen</legend>
                        <div className="flex flex-wrap gap-1.5">
                            {(Object.entries(ORIGINS) as [DealOrigin, string][]).map(([key, val]) => (
                                <button
                                    key={key}
                                    type="button"
                                    aria-pressed={form.origin === key}
                                    onClick={() => setForm(f => ({ ...f, origin: key }))}
                                    className={chip(form.origin === key)}
                                >
                                    {val}
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label htmlFor={`${id}-v`} className={etiqueta}>Valor estimado (CLP)</label>
                            <input
                                id={`${id}-v`}
                                type="text"
                                inputMode="numeric"
                                value={form.estimatedValue ? Number(form.estimatedValue).toLocaleString("es-CL") : ""}
                                onChange={e => setForm(f => ({ ...f, estimatedValue: e.target.value.replace(/[^0-9]/g, "").slice(0, 13) }))}
                                className={campo}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label htmlFor={`${id}-p`} className={etiqueta}>Probabilidad (%)</label>
                            <input
                                id={`${id}-p`}
                                type="number"
                                inputMode="numeric"
                                value={form.closeProbability}
                                onChange={e => setForm(f => ({ ...f, closeProbability: e.target.value }))}
                                min={0}
                                max={100}
                                className={campo}
                            />
                        </div>
                        <div>
                            <label htmlFor={`${id}-c`} className={etiqueta}>Cierre estimado</label>
                            <input
                                id={`${id}-c`}
                                type="date"
                                value={form.estimatedCloseAt}
                                onChange={e => setForm(f => ({ ...f, estimatedCloseAt: e.target.value }))}
                                className={campo}
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor={`${id}-d`} className={etiqueta}>Descripción</label>
                        <textarea
                            id={`${id}-d`}
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            maxLength={2000}
                            rows={3}
                            className={`${campo} resize-none`}
                            placeholder="Detalles adicionales..."
                        />
                    </div>
                    <div>
                        <label htmlFor={`${id}-n`} className={etiqueta}>Notas internas</label>
                        <textarea
                            id={`${id}-n`}
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            maxLength={2000}
                            rows={2}
                            className={`${campo} resize-none`}
                        />
                    </div>

                    <p role="alert" className="text-sm text-red-400">{error}</p>

                    <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                        <button type="button" onClick={cerrar} className={botonSecundario}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={isPending} className={botonPrincipal}>
                            {isPending ? "Guardando..." : deal ? "Guardar cambios" : "Crear oportunidad"}
                        </button>
                    </div>
                </form>
            )}
        </DialogoFormulario>
    );
}

// ============================================================================
// ACTIVIDAD (NOTA, LLAMADA, CORREO…)
// ============================================================================

function ActivityModal({
    dealId,
    onClose,
    onAdded,
}: {
    dealId: string;
    onClose: () => void;
    onAdded: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [type, setType] = useState("note");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState<string | null>(null);

    const types = [
        { key: "note", label: "Nota" },
        { key: "call", label: "Llamada" },
        { key: "email", label: "Correo" },
        { key: "meeting", label: "Reunión" },
        { key: "task", label: "Tarea" },
    ];

    const guardar = (cerrar: () => void) => (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        startTransition(async () => {
            const result = await addDealActivityAction(dealId, {
                type,
                title,
                description: description || undefined,
            });
            if (result.success) {
                toast.success("Actividad guardada");
                onAdded();
                cerrar();
            } else {
                setError(result.error || "No se pudo guardar");
            }
        });
    };

    return (
        <DialogoFormulario titulo="Agregar actividad" alCerrar={onClose} ancho="max-w-md">
            {(cerrar) => (
                <form onSubmit={guardar(cerrar)} className="space-y-4">
                    <fieldset>
                        <legend className="sr-only">Tipo de actividad</legend>
                        <div className="flex flex-wrap gap-1.5">
                            {types.map(t => (
                                <button
                                    key={t.key}
                                    type="button"
                                    aria-pressed={type === t.key}
                                    onClick={() => setType(t.key)}
                                    className={chip(type === t.key)}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <div>
                        <label htmlFor={`actividad-${dealId}-t`} className={etiqueta}>Título</label>
                        <input
                            id={`actividad-${dealId}-t`}
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            maxLength={200}
                            required
                            className={campo}
                        />
                    </div>

                    <div>
                        <label htmlFor={`actividad-${dealId}-d`} className={etiqueta}>Detalles (opcional)</label>
                        <textarea
                            id={`actividad-${dealId}-d`}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            maxLength={2000}
                            rows={3}
                            className={`${campo} resize-none`}
                        />
                    </div>

                    <p role="alert" className="text-sm text-red-400">{error}</p>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button type="button" onClick={cerrar} className={botonSecundario}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={isPending || !title.trim()} className={botonPrincipal}>
                            {isPending ? "Guardando..." : "Guardar"}
                        </button>
                    </div>
                </form>
            )}
        </DialogoFormulario>
    );
}

// ============================================================================
// TABLERO
// ============================================================================

export function PipelineBoard({ initialDeals, clients, abrirNueva = false, puedeContratos = false }: PipelineBoardProps) {
    const [deals, setDeals] = useState<Deal[]>(initialDeals);
    // Si el servidor manda otra lista (router.refresh tras crear o editar), esa manda.
    const [base, setBase] = useState(initialDeals);
    if (base !== initialDeals) {
        setBase(initialDeals);
        setDeals(initialDeals);
    }
    const [showCreateModal, setShowCreateModal] = useState(abrirNueva);
    const [editing, setEditing] = useState<Deal | null>(null);
    const [activityDealId, setActivityDealId] = useState<string | null>(null);
    const [etapaMovil, setEtapaMovil] = useState<DealStage>("PROSPECT");
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const ruta = usePathname();

    // ?nueva=1 abre el formulario una vez; se quita de la URL para que recargar no lo vuelva a abrir.
    useEffect(() => {
        if (abrirNueva) router.replace(ruta, { scroll: false });
    }, [abrirNueva, router, ruta]);

    const refreshDeals = useCallback(() => {
        router.refresh();
    }, [router]);

    const handleMoveDeal = useCallback((dealId: string, newStage: DealStage) => {
        const antes = deals;
        const deal = deals.find(d => d.id === dealId);
        setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d));
        startTransition(async () => {
            const result = await moveDealStageAction(dealId, newStage);
            if (!result.success) {
                setDeals(antes);
                toast.error(result.error || "No se pudo mover la oportunidad");
                return;
            }
            // En celular la tarjeta sale de la etapa que se está viendo: el aviso dice adónde fue.
            const etapa = STAGES.find(s => s.key === newStage)?.label ?? newStage;
            if (newStage === "WON" && deal && puedeContratos) {
                toast.success(`«${deal.title}» ganada`, {
                    action: { label: "Crear contrato", onClick: () => router.push(enlaceContrato(deal)) },
                });
            } else {
                toast.success(`Movida a ${etapa.toLowerCase()}`);
            }
        });
    }, [deals, startTransition, puedeContratos, router]);

    const handleDeleteDeal = useCallback(async (dealId: string) => {
        if (!(await confirmar({ titulo: "¿Eliminar la oportunidad?", detalle: "No se puede deshacer.", accion: "Eliminar", peligro: true }))) return;
        const antes = deals;
        setDeals(prev => prev.filter(d => d.id !== dealId));
        startTransition(async () => {
            const result = await deleteDealAction(dealId);
            if (!result.success) {
                setDeals(antes);
                toast.error(result.error || "No se pudo eliminar la oportunidad");
            } else {
                toast.success("Oportunidad eliminada");
            }
        });
    }, [deals, startTransition]);

    // Una pasada: agrupa por etapa y suma solo los abiertos (ganados y perdidos no están «en juego»).
    const { dealsByStage, totalValue, weightedValue, activeDeals } = useMemo(() => {
        const grouped = {} as Record<DealStage, Deal[]>;
        let total = 0, weighted = 0, active = 0;
        for (const deal of deals) {
            if (!grouped[deal.stage]) grouped[deal.stage] = [];
            grouped[deal.stage].push(deal);
            if (!abierto(deal.stage)) continue;
            total += deal.estimatedValue;
            weighted += (deal.estimatedValue * deal.closeProbability) / 100;
            active++;
        }
        return { dealsByStage: grouped, totalValue: total, weightedValue: weighted, activeDeals: active };
    }, [deals]);

    const tarjeta = (deal: Deal) => (
        <DealCard
            key={deal.id}
            deal={deal}
            onMove={handleMoveDeal}
            onDelete={handleDeleteDeal}
            onEdit={setEditing}
            onAddActivity={setActivityDealId}
            puedeContratos={puedeContratos}
        />
    );
    const etapaElegida = STAGES.find(s => s.key === etapaMovil) ?? STAGES[0];
    const delaEtapa = dealsByStage[etapaMovil] ?? [];

    return (
        <div className="space-y-9">
            <header className="flex max-w-[1180px] flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className={titulo}>Oportunidades</h1>
                    <p className={bajada}>
                        Abre una oportunidad para moverla de etapa, editarla o anotar una actividad · {deals.length} en total
                    </p>
                </div>
                <button type="button" onClick={() => setShowCreateModal(true)} className={botonPrincipal}>
                    <Plus size={16} aria-hidden="true" />
                    Nueva oportunidad
                </button>
            </header>

            {/* Cifras: solo negocios abiertos */}
            <div className="max-w-[1180px]">
                <Cifras nombre="Oportunidades abiertas" items={[
                    { etiqueta: "en juego", valor: pesos(totalValue), nota: "valor de las abiertas" },
                    { etiqueta: "valor ponderado", valor: pesos(weightedValue), nota: "valor × probabilidad de cierre" },
                    { etiqueta: "abiertas", valor: String(activeDeals), nota: "sin contar ganadas ni perdidas" },
                ]} />
            </div>

            {/* Celular: una etapa a la vez, elegida con un selector (sin desplazarse de lado). */}
            <section className="min-[761px]:hidden space-y-3" aria-label="Oportunidades por etapa">
                <div>
                    <label htmlFor="etapa-movil" className={etiqueta}>Etapa</label>
                    <select
                        id="etapa-movil"
                        value={etapaMovil}
                        onChange={e => setEtapaMovil(e.target.value as DealStage)}
                        className={campo}
                    >
                        {STAGES.map(stage => (
                            <option key={stage.key} value={stage.key}>
                                {stage.label} ({(dealsByStage[stage.key] ?? []).length})
                            </option>
                        ))}
                    </select>
                </div>
                <p className="text-sm text-[var(--mut)]" aria-live="polite">
                    {delaEtapa.length === 0
                        ? `Sin oportunidades en ${etapaElegida.label.toLowerCase()}`
                        : `${delaEtapa.length} en ${etapaElegida.label.toLowerCase()} · ${pesos(delaEtapa.reduce((s, d) => s + d.estimatedValue, 0))}`}
                </p>
                <div className="space-y-2">{delaEtapa.map(tarjeta)}</div>
            </section>

            {/* Escritorio: tablero con una columna por etapa; si no cabe, se desplaza dentro de su caja. */}
            <div className="max-[760px]:hidden overflow-x-auto overscroll-x-contain pb-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)]" tabIndex={0} role="region" aria-label="Tablero por etapa">
                <div className="grid min-w-[1200px] grid-cols-6 gap-3">
                    {STAGES.map(stage => {
                        const stageDeals = dealsByStage[stage.key] ?? []; // una etapa sin negocios no tiene entrada
                        const stageValue = stageDeals.reduce((s, d) => s + d.estimatedValue, 0);

                        return (
                            <section
                                key={stage.key}
                                aria-label={stage.label}
                                className="flex flex-col rounded-xl bg-[color-mix(in_srgb,var(--txt)_3%,transparent)]"
                            >
                                <div className="px-3 pt-3 pb-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--txt)]">
                                            <i aria-hidden="true" className={`size-2 rounded-full ${stage.punto}`} />
                                            {stage.label}
                                        </h2>
                                        <span className="font-mono text-xs text-[var(--mut)]">{stageDeals.length}</span>
                                    </div>
                                    {stageDeals.length > 0 && (
                                        <p className="mt-1 text-xs tabular-nums text-[var(--mut)]">
                                            Total: {pesos(stageValue)}
                                        </p>
                                    )}
                                </div>

                                <div className="min-h-[400px] flex-1 space-y-2 p-2">
                                    {stageDeals.map(tarjeta)}

                                    {stageDeals.length === 0 && (
                                        <p className="flex h-24 items-center justify-center text-xs text-[var(--mut)]">
                                            Sin oportunidades
                                        </p>
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>

            {isPending && (
                <div role="status" className={guardando}>
                    Guardando...
                </div>
            )}

            {showCreateModal && (
                <DealModal
                    clients={clients}
                    onClose={() => setShowCreateModal(false)}
                    onSaved={refreshDeals}
                />
            )}
            {editing && (
                <DealModal
                    key={editing.id}
                    clients={clients}
                    deal={editing}
                    onClose={() => setEditing(null)}
                    onSaved={refreshDeals}
                />
            )}
            {activityDealId && (
                <ActivityModal
                    dealId={activityDealId}
                    onClose={() => setActivityDealId(null)}
                    onAdded={refreshDeals}
                />
            )}
        </div>
    );
}
