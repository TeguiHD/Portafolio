"use client";

import { CampoNumero } from "@/components/ui/CampoNumero";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Globe, Handshake, Package, Pencil, Plus, ScrollText, Server, Trash2, Wrench, type LucideIcon } from "lucide-react";
import type { ExpenseCategory, ExpenseFrequency } from '@/generated/prisma/client';
import { confirmar } from "@/modules/admin/confirmar/confirmar";
import DialogoFormulario from "../dialogo-formulario";
import SelectorBuscable from "../selector-buscable";
import { Cifras } from "../cifras";
import {
    bajada, botonIcono, botonIconoPeligro, botonPrincipal, botonSecundario, cajaTabla, campo, chip, cifra, etiqueta,
    guardando, pesos, subtitulo, td, th, thNum, titulo, vacio,
} from "../estilos";
import { createExpenseAction, updateExpenseAction, deleteExpenseAction } from "./actions";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface ExpenseData {
    id: string;
    category: ExpenseCategory;
    description: string;
    amount: number;
    isRecurring: boolean;
    frequency: ExpenseFrequency;
    expenseDate: string;
    notes: string | null;
    receiptUrl: string | null;
    client: { id: string; name: string };
    contract: { id: string; title: string; contractNumber: string } | null;
}

interface ClientOption {
    id: string;
    name: string;
    workType: string | null;
}

interface ContractOption {
    id: string;
    title: string;
    contractNumber: string;
    clientId: string;
}

const CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; icono: LucideIcon }> = {
    HOSTING: { label: "Hosting", icono: Server },
    DOMAIN: { label: "Dominio", icono: Globe },
    LICENSES: { label: "Licencias", icono: ScrollText },
    THIRD_PARTY: { label: "Terceros", icono: Handshake },
    TOOLS: { label: "Herramientas", icono: Wrench },
    OTHER: { label: "Otro", icono: Package },
};

const FREQUENCY_LABELS: Record<ExpenseFrequency, string> = {
    ONE_TIME: "Único",
    MONTHLY: "Mensual",
    YEARLY: "Anual",
};

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("es-CL", {
        day: "2-digit", month: "short", year: "numeric", timeZone: "America/Santiago",
    });
}

// ============================================================================
// GASTO NUEVO O EDICIÓN
// ============================================================================

function ExpenseModal({
    clients, contracts, expense, onClose, onSaved,
}: {
    clients: ClientOption[];
    contracts: ContractOption[];
    /** Si viene, se edita; si no, se registra uno nuevo. */
    expense?: ExpenseData;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({
        clientId: expense?.client.id ?? "",
        contractId: expense?.contract?.id ?? "",
        category: expense?.category ?? ("OTHER" as ExpenseCategory),
        description: expense?.description ?? "",
        amount: expense ? String(Math.round(expense.amount)) : "",
        isRecurring: expense?.isRecurring ?? false,
        frequency: expense?.frequency ?? ("ONE_TIME" as ExpenseFrequency),
        expenseDate: expense ? expense.expenseDate.slice(0, 10) : new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date()),
        notes: expense?.notes ?? "",
    });
    const id = expense ? `gasto-${expense.id}` : "gasto-nuevo";

    const filteredContracts = contracts.filter(c => c.clientId === form.clientId);
    const clientOptions = clients.map(c => ({ id: c.id, label: c.name, sublabel: c.workType || undefined }));
    const contractOptions = filteredContracts.map(c => ({ id: c.id, label: c.contractNumber, sublabel: c.title }));

    const guardar = (cerrar: () => void) => (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!form.clientId || !form.description.trim() || !form.amount) {
            setError("Cliente, descripción y monto son requeridos");
            return;
        }
        const datos = {
            category: form.category,
            description: form.description,
            amount: Number(form.amount) || 0,
            isRecurring: form.isRecurring,
            frequency: form.isRecurring ? form.frequency : ("ONE_TIME" as ExpenseFrequency),
            expenseDate: form.expenseDate,
        };
        startTransition(async () => {
            const result = expense
                ? await updateExpenseAction(expense.id, { ...datos, notes: form.notes || null })
                : await createExpenseAction({
                    ...datos,
                    clientId: form.clientId,
                    contractId: form.contractId || undefined,
                    notes: form.notes || undefined,
                });
            if (result.success) {
                toast.success(expense ? "Gasto actualizado" : "Gasto registrado");
                onSaved();
                cerrar();
            } else {
                setError(result.error || "No se pudo guardar");
            }
        });
    };

    return (
        <DialogoFormulario titulo={expense ? "Editar gasto" : "Registrar gasto"} alCerrar={onClose}>
            {(cerrar) => (
                <form onSubmit={guardar(cerrar)} className="space-y-4" noValidate>
                    {expense ? (
                        <p className="text-sm text-[var(--mut)]">
                            Cliente: <span className="text-[var(--txt)]">{expense.client.name}</span>
                            {expense.contract && <> · Contrato <span className="font-mono text-[var(--txt)]">{expense.contract.contractNumber}</span></>}
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <SelectorBuscable
                                label="Cliente *"
                                value={form.clientId}
                                onChange={(clientId) => setForm(f => ({ ...f, clientId, contractId: "" }))}
                                options={clientOptions}
                                placeholder="Seleccionar cliente..."
                                emptyText="No se encontraron clientes"
                                searchPlaceholder="Buscar cliente..."
                            />
                            <SelectorBuscable
                                label="Contrato (opcional)"
                                value={form.contractId}
                                onChange={(contractId) => setForm(f => ({ ...f, contractId }))}
                                options={contractOptions}
                                placeholder="Sin contrato"
                                emptyText="Sin contratos para este cliente"
                                disabled={!form.clientId}
                                searchPlaceholder="Buscar contrato..."
                            />
                        </div>
                    )}
                    <div>
                        <label htmlFor={`${id}-d`} className={etiqueta}>Descripción *</label>
                        <input id={`${id}-d`} type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            maxLength={500} required className={campo} placeholder="Ej: Hosting anual..." />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                            <label htmlFor={`${id}-c`} className={etiqueta}>Categoría</label>
                            <select id={`${id}-c`} value={form.category} className={campo}
                                onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))}>
                                {(Object.entries(CATEGORY_CONFIG) as [ExpenseCategory, typeof CATEGORY_CONFIG[ExpenseCategory]][]).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor={`${id}-m`} className={etiqueta}>Monto (CLP) *</label>
                            <CampoNumero
                                id={`${id}-m`}
                                required
                                valor={form.amount ? Number(form.amount) : null}
                                alCambiar={n => setForm(f => ({ ...f, amount: n === null ? "" : String(n) }))}
                                className={`${campo} tabular-nums`}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label htmlFor={`${id}-f`} className={etiqueta}>Fecha</label>
                            <input id={`${id}-f`} type="date" value={form.expenseDate} onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))}
                                className={campo} />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-[var(--txt)]">
                            <input type="checkbox" checked={form.isRecurring}
                                onChange={e => {
                                    const isRecurring = e.target.checked;
                                    // Al marcarlo recurrente parte como mensual (antes quedaba «recurrente» con frecuencia «único»).
                                    setForm(f => ({ ...f, isRecurring, frequency: isRecurring ? (f.frequency === "ONE_TIME" ? "MONTHLY" : f.frequency) : "ONE_TIME" }));
                                }}
                                className="size-4 accent-[var(--acento)]" />
                            Gasto recurrente
                        </label>
                        {form.isRecurring && (
                            <fieldset className="flex gap-1.5">
                                <legend className="sr-only">Frecuencia</legend>
                                {(Object.entries(FREQUENCY_LABELS).filter(([k]) => k !== "ONE_TIME") as [ExpenseFrequency, string][]).map(([k, v]) => (
                                    <button
                                        key={k}
                                        type="button"
                                        aria-pressed={form.frequency === k}
                                        onClick={() => setForm(f => ({ ...f, frequency: k }))}
                                        className={chip(form.frequency === k)}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </fieldset>
                        )}
                    </div>
                    <div>
                        <label htmlFor={`${id}-n`} className={etiqueta}>Notas (opcional)</label>
                        <textarea id={`${id}-n`} rows={2} maxLength={2000} value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            className={`${campo} resize-none`} />
                    </div>

                    <p role="alert" className="text-sm text-red-400">{error}</p>

                    <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                        <button type="button" onClick={cerrar} className={botonSecundario}>Cancelar</button>
                        <button type="submit" disabled={isPending} className={botonPrincipal}>
                            {isPending ? "Guardando..." : expense ? "Guardar cambios" : "Registrar gasto"}
                        </button>
                    </div>
                </form>
            )}
        </DialogoFormulario>
    );
}

// ============================================================================
// LISTA DE GASTOS
// ============================================================================

/** Lo que cuesta al mes un gasto recurrente: el anual se reparte en 12 (antes se sumaba entero como si fuera mensual). */
const alMes = (e: ExpenseData) => e.frequency === "YEARLY" ? e.amount / 12 : e.frequency === "MONTHLY" ? e.amount : 0;

export function ExpensesList({
    initialExpenses, clients, contracts,
}: {
    initialExpenses: ExpenseData[];
    clients: ClientOption[];
    contracts: ContractOption[];
}) {
    const [expenses, setExpenses] = useState(initialExpenses);
    // Si el servidor manda otra lista (router.refresh tras guardar), esa manda.
    const [base, setBase] = useState(initialExpenses);
    if (base !== initialExpenses) {
        setBase(initialExpenses);
        setExpenses(initialExpenses);
    }
    const [showCreate, setShowCreate] = useState(false);
    const [editing, setEditing] = useState<ExpenseData | null>(null);
    const [catFilter, setCatFilter] = useState<ExpenseCategory | "ALL">("ALL");
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const filtered = catFilter === "ALL" ? expenses : expenses.filter(e => e.category === catFilter);

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const recurringTotal = expenses.filter(e => e.isRecurring).reduce((s, e) => s + alMes(e), 0);

    // Group by category for summary
    const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
    }, {});

    const handleDelete = async (expense: ExpenseData) => {
        if (!(await confirmar({ titulo: "¿Eliminar el gasto?", detalle: `«${expense.description}». No se puede deshacer.`, accion: "Eliminar", peligro: true }))) return;
        const antes = expenses;
        setExpenses(prev => prev.filter(e => e.id !== expense.id));
        startTransition(async () => {
            const result = await deleteExpenseAction(expense.id);
            if (!result.success) {
                setExpenses(antes);
                toast.error(result.error || "No se pudo eliminar el gasto");
            }
        });
    };

    return (
        <div className="max-w-[1180px] space-y-9">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className={titulo}>Gastos</h1>
                    <p className={bajada}>
                        Lo que gastas por cliente: hosting, dominios, licencias y terceros · {expenses.length} registro{expenses.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <button type="button" onClick={() => setShowCreate(true)} className={botonPrincipal}>
                    <Plus size={16} aria-hidden="true" /> Registrar gasto
                </button>
            </header>

            <Cifras nombre="Resumen de gastos" items={[
                { etiqueta: "total gastos", valor: pesos(totalExpenses) },
                { etiqueta: "recurrentes al mes", valor: pesos(recurringTotal), nota: "los anuales cuentan su doceava parte" },
            ]} />

            {Object.keys(byCategory).length > 0 && (
                <section aria-labelledby="gastos-categorias">
                    <h2 id="gastos-categorias" className={subtitulo}>Por categoría</h2>
                    <dl className="flex flex-wrap gap-x-8 gap-y-3 border-t border-[var(--linea)] pt-3">
                        {Object.entries(byCategory).map(([cat, total]) => {
                            const cfg = CATEGORY_CONFIG[cat as ExpenseCategory];
                            const Icono = cfg.icono;
                            return (
                                <div key={cat} className="flex items-center gap-2 text-sm">
                                    <dt className="flex items-center gap-1.5 text-[var(--mut)]">
                                        <Icono size={16} aria-hidden="true" /> {cfg.label}
                                    </dt>
                                    <dd className="m-0 font-semibold tabular-nums text-[var(--txt)]">{pesos(total)}</dd>
                                </div>
                            );
                        })}
                    </dl>
                </section>
            )}

            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por categoría">
                <span className="mr-1 text-sm text-[var(--mut)]" aria-hidden="true">Filtrar:</span>
                <button type="button" aria-pressed={catFilter === "ALL"} onClick={() => setCatFilter("ALL")} className={chip(catFilter === "ALL")}>
                    Todos
                </button>
                {(Object.entries(CATEGORY_CONFIG) as [ExpenseCategory, typeof CATEGORY_CONFIG[ExpenseCategory]][]).map(([key, cfg]) => {
                    const Icono = cfg.icono;
                    return (
                        <button type="button" key={key} aria-pressed={catFilter === key} onClick={() => setCatFilter(key)} className={chip(catFilter === key)}>
                            <Icono size={16} aria-hidden="true" /> {cfg.label}
                        </button>
                    );
                })}
            </div>

            {filtered.length === 0 ? (
                <div className={vacio}>
                    <p className="font-medium text-[var(--txt)]">No se encontraron gastos</p>
                    <p className="mt-1 text-sm">Registra un gasto para empezar a llevar el control.</p>
                </div>
            ) : (
                // En celular, categoría, fecha y frecuencia bajan a la primera columna.
                <div className={cajaTabla} tabIndex={0} role="region" aria-label="Gastos">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-[var(--linea-2)]">
                                <th scope="col" className={th}>Gasto</th>
                                <th scope="col" className={`${th} max-md:hidden`}>Categoría</th>
                                <th scope="col" className={`${th} max-sm:hidden`}>Fecha</th>
                                <th scope="col" className={`${th} max-md:hidden`}>Frecuencia</th>
                                <th scope="col" className={thNum}>Monto</th>
                                <th scope="col" className={th}><span className="sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(expense => {
                                const cfg = CATEGORY_CONFIG[expense.category];
                                const Icono = cfg.icono;
                                const frecuencia = expense.isRecurring ? FREQUENCY_LABELS[expense.frequency] : FREQUENCY_LABELS.ONE_TIME;
                                return (
                                    <tr key={expense.id} className="border-b border-[var(--linea)]">
                                        <th scope="row" className={`${td} text-left font-normal`}>
                                            <span className="block font-medium text-[var(--txt)]">{expense.description}</span>
                                            <span className="mt-0.5 block text-[13px] text-[var(--mut)]">
                                                {expense.client.name}
                                                {expense.contract && <> · <span className="font-mono" title={expense.contract.title}>{expense.contract.contractNumber}</span></>}
                                            </span>
                                            <span className="mt-0.5 block text-[13px] text-[var(--mut)] md:hidden">
                                                {cfg.label} · <span className="sm:hidden">{formatDate(expense.expenseDate)} · </span>{frecuencia}
                                            </span>
                                        </th>
                                        <td className={`${td} max-md:hidden`}>
                                            <span className="flex items-center gap-1.5 whitespace-nowrap text-[var(--txt)]">
                                                <Icono size={16} aria-hidden="true" className="shrink-0 text-[var(--mut)]" /> {cfg.label}
                                            </span>
                                        </td>
                                        <td className={`${td} whitespace-nowrap text-[var(--mut)] max-sm:hidden`}>{formatDate(expense.expenseDate)}</td>
                                        <td className={`${td} whitespace-nowrap max-md:hidden ${expense.isRecurring ? "text-amber-400" : "text-[var(--mut)]"}`}>{frecuencia}</td>
                                        <td className={`${td} ${cifra} font-semibold text-[var(--txt)]`}>{pesos(expense.amount)}</td>
                                        <td className={td}>
                                            <span className="flex justify-end gap-1">
                                                <button type="button" onClick={() => setEditing(expense)} className={botonIcono} aria-label={`Editar gasto ${expense.description}`}>
                                                    <Pencil size={16} aria-hidden="true" />
                                                </button>
                                                <button type="button" onClick={() => handleDelete(expense)} className={botonIconoPeligro} aria-label={`Eliminar gasto ${expense.description}`}>
                                                    <Trash2 size={16} aria-hidden="true" />
                                                </button>
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {isPending && <div role="status" className={guardando}>Guardando...</div>}

            {showCreate && <ExpenseModal clients={clients} contracts={contracts} onClose={() => setShowCreate(false)} onSaved={() => router.refresh()} />}
            {editing && <ExpenseModal key={editing.id} clients={clients} contracts={contracts} expense={editing} onClose={() => setEditing(null)} onSaved={() => router.refresh()} />}
        </div>
    );
}
