"use client";

import { CampoNumero } from "@/components/ui/CampoNumero";
import { useState, useEffect, useCallback, useId } from "react";
import { AYUDA, BOTON, BOTON_SEC, CAMPO, ERROR, ETIQUETA, GIRA, OPCION, OPCION_NO, OPCION_SI } from "./estilos";
import { hoyChile } from "../fechas";
import { numeroCL } from "@/lib/tools/numeros";

/** Monto escrito a la chilena («25.000», «19,5»). Antes era type=number y «25.000» se leía como 25. */
const monto = (texto: string) => numeroCL(texto) ?? NaN;

interface Category {
    id: string;
    name: string;
    icon: string | null;
}

interface Account {
    id: string;
    name: string;
    icon: string | null;
}

/**
 * Lo que guarda la API (modelo RecurringPayment). No hay columnas de tipo, notas ni «crear automáticamente»:
 * el tipo sale de la categoría (sin categoría, o de gasto, es gasto) y por eso aquí solo filtra las categorías.
 */
interface RecurringPaymentData {
    id?: string;
    name: string;
    amount: number;
    /** Derivado de la categoría por la API; solo sirve para abrir el formulario en la pestaña correcta. */
    type?: string;
    categoryId: string | null;
    accountId: string | null;
    frequency: string;
    startDate: string;
    endDate: string | null;
    dayOfMonth: number | null;
    reminderDays?: number;
    isActive?: boolean;
}

/** Lo que se manda a POST/PUT /api/finance/recurring. La moneda la pone el servidor (la de la cuenta, o CLP). */
interface RecurringPaymentPayload {
    id?: string;
    name: string;
    amount: number;
    categoryId: string | null;
    accountId: string | null;
    frequency: string;
    startDate: string;
    endDate: string | null;
    dayOfMonth: number | null;
    reminderDays: number;
}

interface RecurringFormProps {
    payment?: RecurringPaymentData;
    initialData?: RecurringPaymentData;
    onSubmit?: (data: RecurringPaymentPayload) => Promise<void>;
    onSuccess?: () => void;
    onCancel?: () => void;
}

const TIPOS = [
    { value: "EXPENSE", label: "Gasto" },
    { value: "INCOME", label: "Ingreso" },
] as const;

const FREQUENCIES = [
    { value: "DAILY", label: "Diario" },
    { value: "WEEKLY", label: "Semanal" },
    { value: "BIWEEKLY", label: "Quincenal" },
    { value: "MONTHLY", label: "Mensual" },
    { value: "QUARTERLY", label: "Trimestral" },
    { value: "YEARLY", label: "Anual" },
];

export function RecurringForm({ payment, initialData, onSubmit, onSuccess, onCancel }: RecurringFormProps) {
    const data = payment || initialData;
    const id = useId();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [formData, setFormData] = useState({
        name: data?.name || "",
        amount: data?.amount?.toString() || "",
        type: data?.type === "INCOME" ? "INCOME" : "EXPENSE",
        categoryId: data?.categoryId || "",
        accountId: data?.accountId || "",
        // La base guarda la frecuencia en minúsculas («monthly»); el select usa mayúsculas.
        frequency: (data?.frequency || "MONTHLY").toUpperCase(),
        startDate: data?.startDate ? data.startDate.split("T")[0] : hoyChile(),
        endDate: data?.endDate ? data.endDate.split("T")[0] : "",
        dayOfMonth: data?.dayOfMonth?.toString() || "",
        reminderDays: data?.reminderDays ?? 3,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saveError, setSaveError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [catRes, accRes] = await Promise.all([
                fetch("/api/finance/categories"),
                fetch("/api/finance/accounts"),
            ]);
            if (catRes.ok) {
                const { data } = await catRes.json();
                setCategories(data || []);
            }
            if (accRes.ok) {
                const { data } = await accRes.json();
                setAccounts(data || []);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredCategories = categories.filter((c) => {
        const categoryWithType = c as Category & { type?: string };
        if (formData.type === "INCOME") return categoryWithType.type === "INCOME" || categoryWithType.type === "BOTH";
        return categoryWithType.type === "EXPENSE" || categoryWithType.type === "BOTH";
    });

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = "El nombre es requerido";
        if (!formData.amount || !(monto(formData.amount) > 0)) {
            newErrors.amount = "El monto debe ser mayor a 0";
        }
        if (!formData.startDate) newErrors.startDate = "La fecha de inicio es requerida";
        if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
            newErrors.endDate = "La fecha de fin no puede ser anterior a la de inicio";
        }
        // Sin categoría de ingreso, «Marcar pagado» lo registraría como gasto.
        if (formData.type === "INCOME" && !formData.categoryId) {
            newErrors.category = "Elige una categoría de ingreso";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        setSaveError(null);
        try {
            const submitData: RecurringPaymentPayload = {
                id: data?.id,
                name: formData.name.trim(),
                amount: monto(formData.amount),
                categoryId: formData.categoryId || null,
                accountId: formData.accountId || null,
                frequency: formData.frequency,
                startDate: new Date(formData.startDate).toISOString(),
                endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
                // El día del mes solo vale para los mensuales (el campo se oculta en las demás frecuencias).
                dayOfMonth: formData.frequency === "MONTHLY" && formData.dayOfMonth ? parseInt(formData.dayOfMonth, 10) : null,
                reminderDays: formData.reminderDays,
            };

            if (onSubmit) {
                await onSubmit(submitData);
            } else {
                // Default API call
                const url = data?.id
                    ? `/api/finance/recurring/${data.id}`
                    : "/api/finance/recurring";
                const method = data?.id ? "PUT" : "POST";

                const res = await fetch(url, {
                    method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(submitData),
                });

                if (!res.ok) {
                    const body = (await res.json().catch(() => null)) as { error?: string } | null;
                    throw new Error(body?.error || "Error al guardar");
                }
            }

            onSuccess?.();
        } catch (error) {
            const detalle = error instanceof Error && error.message !== "Error al guardar" ? ` (${error.message})` : "";
            setSaveError(`No se pudo guardar el pago recurrente${detalle}. Revisa los datos e inténtalo de nuevo.`);
        } finally {
            setLoading(false);
        }
    };

    const campoError = (campo: string) =>
        errors[campo]
            ? { "aria-invalid": true as const, "aria-describedby": `${id}-${campo}-error` }
            : {};

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo */}
            <fieldset>
                <legend className={ETIQUETA}>Tipo</legend>
                <div className="grid grid-cols-2 gap-2">
                    {TIPOS.map((t) => (
                        <label
                            key={t.value}
                            className={`${OPCION} cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--acento)] ${formData.type === t.value ? OPCION_SI : OPCION_NO}`}
                        >
                            <input
                                type="radio"
                                name={`${id}-tipo`}
                                value={t.value}
                                checked={formData.type === t.value}
                                onChange={() => setFormData({ ...formData, type: t.value, categoryId: "" })}
                                className="sr-only"
                            />
                            {t.label}
                        </label>
                    ))}
                </div>
                <p className={AYUDA}>El tipo lo define la categoría: un ingreso necesita una categoría de ingreso.</p>
            </fieldset>

            {/* Nombre */}
            <div>
                <label htmlFor={`${id}-name`} className={ETIQUETA}>
                    Nombre *
                </label>
                <input
                    id={`${id}-name`}
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={CAMPO}
                    placeholder="Ej: Netflix, Arriendo, Sueldo"
                    aria-required="true"
                    {...campoError("name")}
                />
                {errors.name && <p id={`${id}-name-error`} role="alert" className={`${ERROR} mt-2`}>{errors.name}</p>}
            </div>

            {/* Monto y frecuencia */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor={`${id}-amount`} className={ETIQUETA}>
                        Monto *
                    </label>
                    <div className="relative">
                        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--mut)]">$</span>
                        <CampoNumero
                            id={`${id}-amount`}
                            decimales={2}
                            valor={numeroCL(formData.amount)}
                            alCambiar={(n) => setFormData({ ...formData, amount: n === null ? "" : String(n) })}
                            className={`${CAMPO} pl-7 tabular-nums`}
                            placeholder="25.000"
                            aria-required="true"
                            {...campoError("amount")}
                        />
                    </div>
                    {errors.amount && <p id={`${id}-amount-error`} role="alert" className={`${ERROR} mt-2`}>{errors.amount}</p>}
                </div>

                <div>
                    <label htmlFor={`${id}-frequency`} className={ETIQUETA}>
                        Frecuencia
                    </label>
                    <select
                        id={`${id}-frequency`}
                        value={formData.frequency}
                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                        className={CAMPO}
                    >
                        {FREQUENCIES.map((f) => (
                            <option key={f.value} value={f.value}>
                                {f.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Día del mes (solo mensual) */}
            {formData.frequency === "MONTHLY" && (
                <div>
                    <label htmlFor={`${id}-day`} className={ETIQUETA}>
                        Día del mes (opcional)
                    </label>
                    <input
                        id={`${id}-day`}
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="31"
                        value={formData.dayOfMonth}
                        onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
                        className={`${CAMPO} tabular-nums sm:max-w-[12rem]`}
                        placeholder="1-31"
                        aria-describedby={`${id}-day-help`}
                    />
                    <p id={`${id}-day-help`} className={AYUDA}>
                        Si no especificas, usará la fecha de inicio como referencia
                    </p>
                </div>
            )}

            {/* Categoría y cuenta */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor={`${id}-category`} className={ETIQUETA}>
                        Categoría{formData.type === "INCOME" ? " *" : ""}
                    </label>
                    <select
                        id={`${id}-category`}
                        value={formData.categoryId}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                        className={CAMPO}
                        aria-required={formData.type === "INCOME" ? true : undefined}
                        {...campoError("category")}
                    >
                        <option value="">{formData.type === "INCOME" ? "Elige una categoría" : "Sin categoría"}</option>
                        {filteredCategories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.icon} {cat.name}
                            </option>
                        ))}
                    </select>
                    {errors.category && <p id={`${id}-category-error`} role="alert" className={`${ERROR} mt-2`}>{errors.category}</p>}
                </div>

                <div>
                    <label htmlFor={`${id}-account`} className={ETIQUETA}>
                        Cuenta
                    </label>
                    <select
                        id={`${id}-account`}
                        value={formData.accountId}
                        onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                        className={CAMPO}
                    >
                        <option value="">Sin cuenta asignada</option>
                        {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                                {acc.icon} {acc.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor={`${id}-start`} className={ETIQUETA}>
                        Fecha de inicio *
                    </label>
                    <input
                        id={`${id}-start`}
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className={CAMPO}
                        aria-required="true"
                        {...campoError("startDate")}
                    />
                    {errors.startDate && <p id={`${id}-startDate-error`} role="alert" className={`${ERROR} mt-2`}>{errors.startDate}</p>}
                </div>

                <div>
                    <label htmlFor={`${id}-end`} className={ETIQUETA}>
                        Fecha de fin (opcional)
                    </label>
                    <input
                        id={`${id}-end`}
                        type="date"
                        value={formData.endDate}
                        min={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className={CAMPO}
                        {...campoError("endDate")}
                    />
                    {errors.endDate && <p id={`${id}-endDate-error`} role="alert" className={`${ERROR} mt-2`}>{errors.endDate}</p>}
                </div>
            </div>

            {/* Aviso en Recordatorios. No hay «crear transacción automáticamente» ni notas: el esquema no los guarda. */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor={`${id}-notify`} className={ETIQUETA}>
                        Avisar en Recordatorios
                    </label>
                    <select
                        id={`${id}-notify`}
                        value={formData.reminderDays}
                        onChange={(e) => setFormData({ ...formData, reminderDays: parseInt(e.target.value, 10) })}
                        className={CAMPO}
                    >
                        <option value={0}>El mismo día</option>
                        <option value={1}>1 día antes</option>
                        <option value={3}>3 días antes</option>
                        <option value={7}>1 semana antes</option>
                        {![0, 1, 3, 7].includes(formData.reminderDays) && (
                            <option value={formData.reminderDays}>{formData.reminderDays} días antes</option>
                        )}
                    </select>
                </div>
            </div>

            {saveError && (
                <p role="alert" className={ERROR}>
                    {saveError}
                </p>
            )}

            {/* Acciones */}
            <div className="flex flex-col-reverse gap-3 border-t border-[var(--linea)] pt-5 sm:flex-row sm:justify-end">
                {onCancel && (
                    <button type="button" onClick={onCancel} className={BOTON_SEC}>
                        Cancelar
                    </button>
                )}
                <button type="submit" disabled={loading} className={BOTON}>
                    {loading ? (
                        <>
                            <span aria-hidden="true" className={GIRA} />
                            Guardando…
                        </>
                    ) : data?.id ? "Guardar cambios" : "Crear pago recurrente"}
                </button>
            </div>
        </form>
    );
}
