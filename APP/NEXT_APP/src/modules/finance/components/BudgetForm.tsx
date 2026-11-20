"use client";

import { useState, useEffect, useCallback, useId } from "react";
import { formatCurrency } from "@/lib/currency";
import { AYUDA, BOTON, BOTON_SEC, CAMPO, CASILLA, CIFRA, ETIQUETA, GIRA, MARCA } from "./estilos";
import { numeroCL } from "@/lib/tools/numeros";

/** Monto escrito a la chilena («150.000», «19,5»). Antes era type=number y «150.000» se leía como 150. */
const monto = (texto: string) => numeroCL(texto) ?? NaN;

interface Category {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
}

export interface BudgetData {
    name: string;
    categoryId: string | null;
    amount: number;
    period: string;
    alertAt75: boolean;
    alertAt90: boolean;
    alertAt100: boolean;
}

interface BudgetFormProps {
    budget?: {
        id: string;
        name: string;
        categoryId: string | null;
        amount: number;
        period: string;
        alertAt75: boolean;
        alertAt90: boolean;
        alertAt100: boolean;
    };
    onSubmit: (data: BudgetData) => Promise<void>;
    onCancel: () => void;
}

const PERIODS = [
    { value: "WEEKLY", label: "Semanal" },
    { value: "MONTHLY", label: "Mensual" },
    { value: "QUARTERLY", label: "Trimestral" },
    { value: "YEARLY", label: "Anual" },
];

const ERROR_CAMPO = "mt-1.5 text-sm text-red-400";
const CASILLA_FILA = "flex min-h-11 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 sm:min-h-10";

export function BudgetForm({ budget, onSubmit, onCancel }: BudgetFormProps) {
    const id = useId();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [formData, setFormData] = useState({
        name: budget?.name || "",
        categoryId: budget?.categoryId || "",
        amount: budget?.amount?.toString() || "",
        period: budget?.period || "MONTHLY",
        alertAt75: budget?.alertAt75 ?? true,
        alertAt90: budget?.alertAt90 ?? true,
        alertAt100: budget?.alertAt100 ?? true,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch("/api/finance/categories?type=EXPENSE");
            if (res.ok) {
                const { data } = await res.json();
                setCategories(data || []);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = "El nombre es requerido";
        if (!formData.amount || !(monto(formData.amount) > 0)) {
            newErrors.amount = "El monto debe ser mayor a 0";
        }
        setErrors(newErrors);
        // El foco va al primer campo con error para que se lea su mensaje.
        const primero = Object.keys(newErrors)[0];
        if (primero) document.getElementById(`${id}-${primero}`)?.focus();
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            await onSubmit({
                name: formData.name.trim(),
                categoryId: formData.categoryId || null,
                amount: monto(formData.amount),
                period: formData.period,
                alertAt75: formData.alertAt75,
                alertAt90: formData.alertAt90,
                alertAt100: formData.alertAt100,
            });
        } finally {
            setLoading(false);
        }
    };

    const selectedCategory = categories.find((c) => c.id === formData.categoryId);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre */}
            <div>
                <label htmlFor={`${id}-name`} className={ETIQUETA}>
                    Nombre del presupuesto *
                </label>
                <input
                    id={`${id}-name`}
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    aria-required="true"
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={errors.name ? `${id}-name-error` : undefined}
                    className={CAMPO}
                    placeholder="Ej: Comida del mes"
                />
                {errors.name && <p id={`${id}-name-error`} role="alert" className={ERROR_CAMPO}>{errors.name}</p>}
            </div>

            {/* Categoría */}
            <div>
                <label htmlFor={`${id}-categoria`} className={ETIQUETA}>
                    Categoría (opcional)
                </label>
                <select
                    id={`${id}-categoria`}
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    aria-describedby={`${id}-categoria-ayuda`}
                    className={CAMPO}
                >
                    <option value="">Todas las categorías de gasto</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                        </option>
                    ))}
                </select>
                <p id={`${id}-categoria-ayuda`} className={AYUDA}>
                    Si no seleccionas categoría, el presupuesto aplica a todos los gastos
                </p>
            </div>

            {/* Monto y período */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4">
                <div>
                    <label htmlFor={`${id}-amount`} className={ETIQUETA}>
                        Monto límite *
                    </label>
                    <div className="relative">
                        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--mut)]">$</span>
                        <input
                            id={`${id}-amount`}
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            aria-required="true"
                            aria-invalid={errors.amount ? true : undefined}
                            aria-describedby={errors.amount ? `${id}-amount-error` : undefined}
                            className={`${CAMPO} pl-7 ${CIFRA}`}
                            placeholder="150.000"
                        />
                    </div>
                    {errors.amount && <p id={`${id}-amount-error`} role="alert" className={ERROR_CAMPO}>{errors.amount}</p>}
                </div>

                <div>
                    <label htmlFor={`${id}-periodo`} className={ETIQUETA}>
                        Período
                    </label>
                    <select
                        id={`${id}-periodo`}
                        value={formData.period}
                        onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                        className={CAMPO}
                    >
                        {PERIODS.map((p) => (
                            <option key={p.value} value={p.value}>
                                {p.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Vista previa */}
            {formData.amount && (
                <div className="rounded-lg bg-[var(--fondo-2)] px-4 py-3">
                    <p className="text-sm text-[var(--mut)]">Vista previa:</p>
                    <p className="mt-1 font-medium text-[var(--txt)]">
                        {selectedCategory ? `${selectedCategory.icon ?? ""} ${selectedCategory.name}`.trim() : "Todos los gastos"}
                        {" — "}
                        <span className={`font-semibold ${CIFRA}`}>
                            {formatCurrency(monto(formData.amount) || 0)}
                        </span>
                        {" "}
                        <span className="text-[var(--mut)]">
                            {PERIODS.find((p) => p.value === formData.period)?.label.toLowerCase()}
                        </span>
                    </p>
                </div>
            )}

            {/* Alertas */}
            <fieldset>
                <legend className={ETIQUETA}>Alertas de presupuesto</legend>
                <div className="mt-1 space-y-1">
                    <label className={CASILLA_FILA}>
                        <input
                            type="checkbox"
                            checked={formData.alertAt75}
                            onChange={(e) => setFormData({ ...formData, alertAt75: e.target.checked })}
                            className={CASILLA}
                        />
                        <span className="text-[15px] text-[var(--txt)]">Alertar al 75% del presupuesto</span>
                        <span className={`${MARCA} bg-amber-500/10 text-amber-400`}>Advertencia</span>
                    </label>
                    <label className={CASILLA_FILA}>
                        <input
                            type="checkbox"
                            checked={formData.alertAt90}
                            onChange={(e) => setFormData({ ...formData, alertAt90: e.target.checked })}
                            className={CASILLA}
                        />
                        <span className="text-[15px] text-[var(--txt)]">Alertar al 90% del presupuesto</span>
                        <span className={`${MARCA} bg-red-500/10 text-red-400`}>Peligro</span>
                    </label>
                    <label className={CASILLA_FILA}>
                        <input
                            type="checkbox"
                            checked={formData.alertAt100}
                            onChange={(e) => setFormData({ ...formData, alertAt100: e.target.checked })}
                            className={CASILLA}
                        />
                        <span className="text-[15px] text-[var(--txt)]">Alertar al superar el presupuesto</span>
                        <span className={`${MARCA} bg-red-500/10 text-red-400`}>Excedido</span>
                    </label>
                </div>
            </fieldset>

            {/* Acciones */}
            <div className="flex flex-col-reverse gap-3 border-t border-[var(--linea)] pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={onCancel} className={BOTON_SEC}>
                    Cancelar
                </button>
                <button type="submit" disabled={loading} className={BOTON}>
                    {loading ? (
                        <>
                            <span aria-hidden="true" className={GIRA} />
                            Guardando...
                        </>
                    ) : budget ? (
                        "Actualizar"
                    ) : (
                        "Crear presupuesto"
                    )}
                </button>
            </div>
        </form>
    );
}
