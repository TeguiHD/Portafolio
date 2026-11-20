"use client";

import { useId, useState } from "react";
import { formatCurrency } from "@/lib/currency";
import { AYUDA, BOTON, BOTON_SEC, CAMPO, CIFRA, ETIQUETA, FICHA, GIRA, OPCION_NO, OPCION_SI, RIEL } from "./estilos";
import { hoyChile } from "../fechas";
import { numeroCL } from "@/lib/tools/numeros";

/** Monto escrito a la chilena («1.500.000», «19,5»). Antes era type=number y «1.500.000» no se aceptaba. */
const monto = (texto: string) => numeroCL(texto) ?? NaN;

export interface GoalData {
    name: string;
    icon: string;
    color: string;
    targetAmount: number;
    currentAmount: number;
    deadline: string | null;
}

interface GoalFormProps {
    goal?: {
        id: string;
        name: string;
        icon: string;
        color: string;
        targetAmount: number;
        currentAmount: number;
        deadline: string | null;
    };
    onSubmit: (data: GoalData) => Promise<void>;
    onCancel: () => void;
}

const GOAL_ICONS = ["🎯", "🏠", "🚗", "✈️", "💻", "📱", "🎓", "💍", "🏝️", "🎸", "📚", "💪", "🎮", "👶", "🐕", "🚀"];
const GOAL_COLORS = [
    "#3B82F6",
    "#8B5CF6",
    "#EC4899",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#06B6D4",
    "#84CC16",
    "#F97316",
    "#6366F1",
];

/** Nombre de cada color para lectores de pantalla y para decir cuál está elegido. */
const NOMBRE_COLOR: Record<string, string> = {
    "#3B82F6": "Azul",
    "#8B5CF6": "Violeta",
    "#EC4899": "Rosado",
    "#10B981": "Verde",
    "#F59E0B": "Ámbar",
    "#EF4444": "Rojo",
    "#06B6D4": "Cian",
    "#84CC16": "Lima",
    "#F97316": "Naranjo",
    "#6366F1": "Índigo",
};

const ERROR_CAMPO = "mt-1.5 text-sm text-red-400";
/** Foco visible en la etiqueta cuando el radio escondido que envuelve tiene el foco. */
const FOCO_DENTRO = "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--acento)]";

export function GoalForm({ goal, onSubmit, onCancel }: GoalFormProps) {
    const id = useId();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: goal?.name || "",
        icon: goal?.icon || "🎯",
        color: goal?.color || "#3B82F6",
        targetAmount: goal?.targetAmount?.toString() || "",
        currentAmount: goal?.currentAmount?.toString() || "0",
        deadline: goal?.deadline ? goal.deadline.split("T")[0] : "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = "El nombre es requerido";
        if (!formData.targetAmount || !(monto(formData.targetAmount) > 0)) {
            newErrors.targetAmount = "El monto objetivo debe ser mayor a 0";
        }
        if (formData.currentAmount && !(monto(formData.currentAmount) >= 0)) {
            newErrors.currentAmount = "El monto actual no puede ser negativo";
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
                icon: formData.icon,
                color: formData.color,
                targetAmount: monto(formData.targetAmount),
                currentAmount: monto(formData.currentAmount) || 0,
                deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
            });
        } finally {
            setLoading(false);
        }
    };

    const targetNum = monto(formData.targetAmount) || 0;
    const currentNum = monto(formData.currentAmount) || 0;
    const percentage = targetNum > 0 ? Math.min(100, (currentNum / targetNum) * 100) : 0;
    const remaining = Math.max(0, targetNum - currentNum);
    const nombreColor = NOMBRE_COLOR[formData.color.toUpperCase()];

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Ícono */}
            <fieldset>
                <legend className={ETIQUETA}>Icono</legend>
                <div className="flex flex-wrap gap-2">
                    {GOAL_ICONS.map((icon) => (
                        <label
                            key={icon}
                            className={`relative inline-grid size-11 cursor-pointer place-items-center rounded-lg border text-xl transition-colors duration-150 sm:size-10 ${formData.icon === icon ? OPCION_SI : OPCION_NO} ${FOCO_DENTRO}`}
                        >
                            <input
                                type="radio"
                                name={`${id}-icono`}
                                value={icon}
                                checked={formData.icon === icon}
                                onChange={() => setFormData({ ...formData, icon })}
                                className="sr-only"
                            />
                            {icon}
                        </label>
                    ))}
                </div>
            </fieldset>

            {/* Color */}
            <fieldset>
                <legend className={ETIQUETA}>
                    Color{nombreColor ? <span className="font-normal text-[var(--mut)]">: {nombreColor}</span> : null}
                </legend>
                <div className="flex flex-wrap gap-2">
                    {GOAL_COLORS.map((color) => (
                        <label
                            key={color}
                            className={`relative size-11 cursor-pointer rounded-lg sm:size-10 ${formData.color === color ? "ring-2 ring-[var(--txt)] ring-offset-2 ring-offset-[var(--sup)]" : ""} has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-[var(--acento)]`}
                            style={{ backgroundColor: color }}
                        >
                            <input
                                type="radio"
                                name={`${id}-color`}
                                value={color}
                                checked={formData.color === color}
                                onChange={() => setFormData({ ...formData, color })}
                                aria-label={NOMBRE_COLOR[color]}
                                className="sr-only"
                            />
                        </label>
                    ))}
                </div>
            </fieldset>

            {/* Nombre */}
            <div>
                <label htmlFor={`${id}-name`} className={ETIQUETA}>Nombre de la meta *</label>
                <input
                    id={`${id}-name`}
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    aria-required="true"
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={errors.name ? `${id}-name-error` : undefined}
                    className={CAMPO}
                    placeholder="Ej: Vacaciones a Europa"
                />
                {errors.name && <p id={`${id}-name-error`} role="alert" className={ERROR_CAMPO}>{errors.name}</p>}
            </div>

            {/* Montos */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4">
                <div>
                    <label htmlFor={`${id}-targetAmount`} className={ETIQUETA}>Monto objetivo *</label>
                    <div className="relative">
                        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--mut)]">$</span>
                        <input
                            id={`${id}-targetAmount`}
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={formData.targetAmount}
                            onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                            aria-required="true"
                            aria-invalid={errors.targetAmount ? true : undefined}
                            aria-describedby={errors.targetAmount ? `${id}-targetAmount-error` : undefined}
                            className={`${CAMPO} pl-7 ${CIFRA}`}
                            placeholder="0"
                        />
                    </div>
                    {errors.targetAmount && <p id={`${id}-targetAmount-error`} role="alert" className={ERROR_CAMPO}>{errors.targetAmount}</p>}
                </div>

                <div>
                    <label htmlFor={`${id}-currentAmount`} className={ETIQUETA}>Monto ahorrado</label>
                    <div className="relative">
                        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--mut)]">$</span>
                        <input
                            id={`${id}-currentAmount`}
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={formData.currentAmount}
                            onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                            aria-invalid={errors.currentAmount ? true : undefined}
                            aria-describedby={errors.currentAmount ? `${id}-currentAmount-error` : undefined}
                            className={`${CAMPO} pl-7 ${CIFRA}`}
                            placeholder="0"
                        />
                    </div>
                    {errors.currentAmount && <p id={`${id}-currentAmount-error`} role="alert" className={ERROR_CAMPO}>{errors.currentAmount}</p>}
                </div>
            </div>

            {/* Fecha límite */}
            <div>
                <label htmlFor={`${id}-fecha`} className={ETIQUETA}>Fecha límite (opcional)</label>
                <input
                    id={`${id}-fecha`}
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    min={hoyChile()}
                    aria-describedby={`${id}-fecha-ayuda`}
                    className={CAMPO}
                />
                <p id={`${id}-fecha-ayuda`} className={AYUDA}>
                    Si defines una fecha, te mostraremos cuánto debes ahorrar diario/mensual
                </p>
            </div>

            {/* Vista previa */}
            {formData.targetAmount && (
                <div className="rounded-lg bg-[var(--fondo-2)] p-4">
                    <div className="flex items-center gap-3">
                        <span
                            aria-hidden="true"
                            className={FICHA}
                            style={{ backgroundColor: `color-mix(in srgb, ${formData.color} 16%, transparent)` }}
                        >
                            {formData.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-[var(--txt)]">{formData.name || "Mi meta"}</p>
                            <p className={`text-sm text-[var(--mut)] ${CIFRA}`}>
                                {formatCurrency(currentNum)} de {formatCurrency(targetNum)}
                            </p>
                        </div>
                        <span className={`shrink-0 text-xl font-bold text-[var(--txt)] ${CIFRA}`}>
                            {percentage.toFixed(0)} %
                        </span>
                    </div>
                    <div className={`${RIEL} mt-3`} aria-hidden="true">
                        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: formData.color }} />
                    </div>
                    {remaining > 0 && (
                        <p className="mt-3 text-sm text-[var(--mut)]">
                            Te faltan <span className={`font-medium text-[var(--txt)] ${CIFRA}`}>{formatCurrency(remaining)}</span> para alcanzar tu meta
                        </p>
                    )}
                </div>
            )}

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
                    ) : goal ? (
                        "Actualizar meta"
                    ) : (
                        "Crear meta"
                    )}
                </button>
            </div>
        </form>
    );
}
