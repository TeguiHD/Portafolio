"use client";

import { useState, useEffect, useCallback, useId } from "react";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import DialogoFormulario from "@/app/admin/gestion-comercial/dialogo-formulario";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";
import { CabeceraFinanzas, CargandoFinanzas } from "@/modules/finance/components/Piezas";
import {
    BAJA, BOTON, BOTON_SEC, CAMPO, ENLACE, ERROR, ETIQUETA, FICHA, FOCO, GIRA, ICONO, ICONO_PELIGRO, OPCION, OPCION_NO,
    OPCION_SI, SECCION, SOBRE, SUBE, VACIO,
} from "@/modules/finance/components/estilos";
import { confirmar } from "@/modules/admin/confirmar/confirmar";

interface Category {
    id: string;
    name: string;
    icon: string;
    color: string | null;
    type: "INCOME" | "EXPENSE";
    userId: string | null; // null = global/system
    parentId: string | null;
}

// Preset icons for category selection
const PRESET_ICONS = [
    "🍔", "🚗", "🏠", "💊", "🎓", "👔", "🎮", "📱", "💳", "💰",
    "🎁", "🛠️", "☕", "🛒", "✈️", "🎬", "📚", "💪", "🌿", "🐕",
    "👶", "💄", "🔧", "📦", "🎵", "🏥", "🎨", "🍕", "🚌", "💡"
];

const PRESET_COLORS = [
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
    "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
    "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#64748b"
];

/** Nombre de cada color de la paleta, para el lector de pantalla. */
const NOMBRE_COLOR: Record<string, string> = {
    "#ef4444": "Rojo", "#f97316": "Naranja", "#f59e0b": "Ámbar", "#eab308": "Amarillo", "#84cc16": "Lima",
    "#22c55e": "Verde", "#10b981": "Esmeralda", "#14b8a6": "Verde azulado", "#06b6d4": "Cian", "#0ea5e9": "Celeste",
    "#3b82f6": "Azul", "#6366f1": "Índigo", "#8b5cf6": "Violeta", "#a855f7": "Morado", "#d946ef": "Fucsia",
    "#ec4899": "Rosado", "#f43f5e": "Frambuesa", "#64748b": "Gris pizarra",
};

/** Botón de un emoji del selector de ícono (el emoji es dato: se guarda en la categoría). */
const BOTON_EMOJI = `grid size-11 place-items-center rounded-lg border text-xl transition-colors duration-150 motion-reduce:transition-none sm:size-10 ${FOCO}`;

/** Lista de categorías en columnas, cada una como fila con su línea. */
const REJILLA = "m-0 grid list-none grid-cols-1 gap-x-8 border-t border-[var(--linea)] p-0 sm:grid-cols-2 lg:grid-cols-3";
const CELDA = `flex min-w-0 items-center gap-3 border-b border-[var(--linea)] px-1 py-3 transition-colors duration-150 ${SOBRE}`;

export default function CategoriesPageClient() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        icon: "💰",
        color: "#3b82f6",
        type: "EXPENSE" as "INCOME" | "EXPENSE",
    });
    const [saving, setSaving] = useState(false);
    const uid = useId();

    const fetchCategories = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/finance/categories");
            if (!res.ok) throw new Error("Error al cargar categorías");
            const { data } = await res.json();
            setCategories(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const filteredCategories = categories.filter((c) =>
        filterType === "ALL" ? true : c.type === filterType
    );

    const systemCategories = filteredCategories.filter((c) => !c.userId);
    const customCategories = filteredCategories.filter((c) => c.userId);

    const handleOpenForm = (category?: Category) => {
        setError(null);
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                icon: category.icon || "💰",
                color: category.color || "#3b82f6",
                type: category.type,
            });
        } else {
            setEditingCategory(null);
            setFormData({
                name: "",
                icon: "💰",
                color: "#3b82f6",
                type: "EXPENSE",
            });
        }
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingCategory(null);
    };

    const handleSubmit = async (e: React.FormEvent, cerrar: () => void) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setSaving(true);
        setError(null);
        try {
            const url = editingCategory
                ? `/api/finance/categories/${editingCategory.id}`
                : "/api/finance/categories";

            const res = await fetch(url, {
                method: editingCategory ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Error al guardar");
            }

            // Se cierra antes de recargar: así el foco vuelve al botón que abrió el formulario.
            cerrar();
            handleCloseForm();
            await fetchCategories();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!(await confirmar({ titulo: "¿Eliminar esta categoría?", detalle: "No se puede deshacer.", accion: "Eliminar", peligro: true }))) return;

        try {
            const res = await fetch(`/api/finance/categories/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Error al eliminar");
            setCategories((prev) => prev.filter((c) => c.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al eliminar");
        }
    };

    // Solo la primera carga reemplaza la página; al recargar se quedan las filas a la vista.
    if (loading && categories.length === 0) {
        return (
            <div className="max-w-[1180px]">
                <FinanceBreadcrumbs />
                <CargandoFinanzas texto="Cargando categorías…" />
            </div>
        );
    }

    /** Ficha con el emoji y el color de la categoría (datos del usuario). */
    const ficha = (icon: string, color: string | null) => (
        <span aria-hidden="true" className={FICHA} style={{ backgroundColor: (color || "#3b82f6") + "20" }}>
            {icon || "💰"}
        </span>
    );

    const nombreYTipo = (cat: Pick<Category, "name" | "type">) => (
        <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-[var(--txt)]">{cat.name}</p>
            <p className={`text-xs ${cat.type === "INCOME" ? SUBE : BAJA}`}>
                {cat.type === "INCOME" ? "Ingreso" : "Gasto"}
            </p>
        </div>
    );

    return (
        <div className="max-w-[1180px] pb-8">
            <FinanceBreadcrumbs />

            <CabeceraFinanzas titulo="Categorías" bajada="Organiza tus transacciones por categorías">
                <button type="button" onClick={() => handleOpenForm()} className={BOTON}>
                    <Plus aria-hidden="true" className="size-4" />
                    Nueva categoría
                </button>
            </CabeceraFinanzas>

            {/* Filtro por tipo */}
            <div role="group" aria-label="Filtrar por tipo" className="mt-8 flex flex-wrap gap-2">
                {[
                    { key: "ALL", label: "Todas" },
                    { key: "EXPENSE", label: "Gastos" },
                    { key: "INCOME", label: "Ingresos" },
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        type="button"
                        aria-pressed={filterType === key}
                        onClick={() => setFilterType(key as typeof filterType)}
                        className={`${OPCION} ${filterType === key ? OPCION_SI : OPCION_NO}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {error && !showForm && (
                <p role="alert" className={`${ERROR} mt-6`}>
                    {error}
                </p>
            )}

            {systemCategories.length > 0 && (
                <section aria-labelledby={`${uid}-sistema`} className="mt-10">
                    <h2 id={`${uid}-sistema`} className={`${SECCION} mb-2`}>Categorías del sistema</h2>
                    <ul className={REJILLA}>
                        {systemCategories.map((cat) => (
                            <li key={cat.id} className={CELDA}>
                                {ficha(cat.icon, cat.color)}
                                {nombreYTipo(cat)}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section aria-labelledby={`${uid}-propias`} className="mt-10">
                <h2 id={`${uid}-propias`} className={`${SECCION} mb-2`}>Mis categorías personalizadas</h2>
                {customCategories.length > 0 ? (
                    <ul className={REJILLA}>
                        {customCategories.map((cat) => (
                            <li key={cat.id} className={CELDA}>
                                {ficha(cat.icon, cat.color)}
                                {nombreYTipo(cat)}
                                <div className="flex shrink-0 gap-1">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenForm(cat)}
                                        aria-label={`Editar ${cat.name}`}
                                        title="Editar"
                                        className={ICONO}
                                    >
                                        <Pencil aria-hidden="true" className="size-[18px]" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(cat.id)}
                                        aria-label={`Eliminar ${cat.name}`}
                                        title="Eliminar"
                                        className={ICONO_PELIGRO}
                                    >
                                        <Trash2 aria-hidden="true" className="size-[18px]" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className={VACIO}>
                        <p>No tienes categorías personalizadas</p>
                        <button
                            type="button"
                            onClick={() => handleOpenForm()}
                            className={`mt-1 inline-flex min-h-11 items-center px-2 text-sm ${ENLACE}`}
                        >
                            Crear primera categoría
                        </button>
                    </div>
                )}
            </section>

            {showForm && (
                <DialogoFormulario
                    titulo={editingCategory ? "Editar categoría" : "Nueva categoría"}
                    alCerrar={handleCloseForm}
                    ancho="max-w-md"
                >
                    {(cerrar) => (
                        <form onSubmit={(e) => handleSubmit(e, cerrar)} className="space-y-5">
                            <div>
                                <label htmlFor={`${uid}-nombre`} className={ETIQUETA}>
                                    Nombre
                                </label>
                                <input
                                    id={`${uid}-nombre`}
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Comida rápida"
                                    className={CAMPO}
                                    required
                                />
                            </div>

                            <fieldset>
                                <legend className={ETIQUETA}>Tipo</legend>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { value: "EXPENSE", label: "Gasto" },
                                        { value: "INCOME", label: "Ingreso" },
                                    ].map(({ value, label }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            aria-pressed={formData.type === value}
                                            onClick={() => setFormData({ ...formData, type: value as "INCOME" | "EXPENSE" })}
                                            className={`${OPCION} ${formData.type === value ? OPCION_SI : OPCION_NO}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>

                            <fieldset>
                                <legend className={ETIQUETA}>Ícono</legend>
                                <div className="flex flex-wrap gap-2">
                                    {PRESET_ICONS.map((icon) => (
                                        <button
                                            key={icon}
                                            type="button"
                                            aria-pressed={formData.icon === icon}
                                            onClick={() => setFormData({ ...formData, icon })}
                                            className={`${BOTON_EMOJI} ${formData.icon === icon ? OPCION_SI : OPCION_NO}`}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>

                            <fieldset>
                                <legend className={ETIQUETA}>Color</legend>
                                <div className="flex flex-wrap gap-2">
                                    {PRESET_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            aria-pressed={formData.color === color}
                                            aria-label={NOMBRE_COLOR[color] ?? color}
                                            title={NOMBRE_COLOR[color] ?? color}
                                            onClick={() => setFormData({ ...formData, color })}
                                            className={`size-11 rounded-lg sm:size-9 ${FOCO} ${formData.color === color ? "outline-2 outline-offset-2 outline-[var(--txt)]" : ""}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </fieldset>

                            <div className="rounded-lg border border-[var(--linea)] p-4">
                                <p className="mb-2 text-xs text-[var(--mut)]">Vista previa</p>
                                <div className="flex items-center gap-3">
                                    {ficha(formData.icon, formData.color)}
                                    {nombreYTipo({ name: formData.name || "Nombre", type: formData.type })}
                                </div>
                            </div>

                            {error && (
                                <p role="alert" className={ERROR}>
                                    {error}
                                </p>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={cerrar} className={`${BOTON_SEC} flex-1`}>
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !formData.name.trim()}
                                    className={`${BOTON} flex-1`}
                                >
                                    {saving ? (
                                        <>
                                            <span aria-hidden="true" className={GIRA} />
                                            Guardando…
                                        </>
                                    ) : (
                                        <>
                                            <Check aria-hidden="true" className="size-4" />
                                            Guardar
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </DialogoFormulario>
            )}
        </div>
    );
}
