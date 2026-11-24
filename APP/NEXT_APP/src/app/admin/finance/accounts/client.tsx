"use client";

import { useState, useEffect, useCallback, useId } from "react";
import { Plus, Pencil, Trash2, Check, Star, CreditCard, Wallet, PiggyBank, Building2, TrendingUp, MoreHorizontal } from "lucide-react";
import DialogoFormulario from "@/app/admin/gestion-comercial/dialogo-formulario";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";
import { CabeceraFinanzas, CargandoFinanzas, CifrasFinanzas } from "@/modules/finance/components/Piezas";
import {
    AYUDA, BAJA, BOTON, BOTON_SEC, CAMPO, CASILLA, CIFRA, ENLACE, ERROR, ETIQUETA, FICHA, FILA, FOCO, GIRA, ICONO,
    ICONO_PELIGRO, LISTA, MARCA_NEUTRA, OPCION, OPCION_NO, OPCION_SI, SECCION, VACIO,
} from "@/modules/finance/components/estilos";
import { formatCurrency } from "@/lib/currency";
import { useFinance } from "@/modules/finance/context/FinanceContext";
import { confirmar } from "@/modules/admin/confirmar/confirmar";
import { CampoNumero } from "@/components/ui/CampoNumero";

interface Account {
    id: string;
    name: string;
    type: "CASH" | "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "OTHER";
    icon: string | null;
    color: string | null;
    isDefault: boolean;
    isActive: boolean;
    initialBalance: number;
    currentBalance: number;
    sortOrder: number;
    currency: {
        id: string;
        code: string;
        symbol: string;
        name: string;
    };
}

const ACCOUNT_TYPES = [
    { value: "CASH", label: "Efectivo", icon: Wallet, color: "#22c55e" },
    { value: "CHECKING", label: "Cuenta corriente", icon: Building2, color: "#3b82f6" },
    { value: "SAVINGS", label: "Ahorro", icon: PiggyBank, color: "#8b5cf6" },
    { value: "CREDIT_CARD", label: "Tarjeta crédito", icon: CreditCard, color: "#ef4444" },
    { value: "INVESTMENT", label: "Inversión", icon: TrendingUp, color: "#f59e0b" },
    { value: "OTHER", label: "Otra", icon: MoreHorizontal, color: "#64748b" },
];

const PRESET_COLORS = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#10b981",
    "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6",
    "#a855f7", "#d946ef", "#ec4899", "#64748b"
];

/** Nombre de cada color de la paleta, para el lector de pantalla. */
const NOMBRE_COLOR: Record<string, string> = {
    "#ef4444": "Rojo", "#f97316": "Naranja", "#f59e0b": "Ámbar", "#84cc16": "Lima", "#22c55e": "Verde",
    "#10b981": "Esmeralda", "#14b8a6": "Verde azulado", "#06b6d4": "Cian", "#0ea5e9": "Celeste", "#3b82f6": "Azul",
    "#6366f1": "Índigo", "#8b5cf6": "Violeta", "#a855f7": "Morado", "#d946ef": "Fucsia", "#ec4899": "Rosado",
    "#64748b": "Gris pizarra",
};

const PRESET_ICONS = ["💵", "💳", "🏦", "💰", "🐷", "📈", "💎", "🏧", "💴", "💶"];

/** Botón de un emoji del selector de ícono (el emoji es dato: se guarda en la cuenta). */
const BOTON_EMOJI = `grid size-11 place-items-center rounded-lg border text-xl transition-colors duration-150 motion-reduce:transition-none sm:size-10 ${FOCO}`;

export default function AccountsPageClient({ abrirNueva = false }: { abrirNueva?: boolean }) {
    const { baseCurrency, triggerRefresh } = useFinance();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(abrirNueva);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        type: "CHECKING" as Account["type"],
        icon: "🏦",
        color: "#3b82f6",
        initialBalance: 0,
        isDefault: false,
    });
    const [saving, setSaving] = useState(false);
    // El saldo se escribe a la chilena («1.250.000» o «1.250,50»): con type=number, «1.250.000» no se podía escribir.
    const [saldoInicial, setSaldoInicial] = useState<number | null>(null);
    const uid = useId();

    const fetchAccounts = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/finance/accounts");
            if (!res.ok) throw new Error("Error al cargar cuentas");
            const { data } = await res.json();
            setAccounts(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    // Calculate totals
    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);

    const handleOpenForm = (account?: Account) => {
        setError(null);
        if (account) {
            setEditingAccount(account);
            setFormData({
                name: account.name,
                type: account.type,
                icon: account.icon || "🏦",
                color: account.color || "#3b82f6",
                initialBalance: account.initialBalance,
                isDefault: account.isDefault,
            });
            setSaldoInicial(null);
        } else {
            setEditingAccount(null);
            setFormData({
                name: "",
                type: "CHECKING",
                icon: "🏦",
                color: "#3b82f6",
                initialBalance: 0,
                isDefault: false,
            });
            setSaldoInicial(null);
        }
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingAccount(null);
    };

    const handleSubmit = async (e: React.FormEvent, cerrar: () => void) => {
        e.preventDefault();
        if (!formData.name.trim()) return;
        const saldo: number | null = saldoInicial ?? 0;
        if (!editingAccount && saldo === null) {
            setError("El saldo inicial no es un monto válido");
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const url = editingAccount
                ? `/api/finance/accounts/${editingAccount.id}`
                : "/api/finance/accounts";

            const res = await fetch(url, {
                method: editingAccount ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    // El saldo inicial solo se escribe al crear; al editar se manda el que tenía.
                    initialBalance: editingAccount ? formData.initialBalance : saldo,
                    currency: baseCurrency,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Error al guardar");
            }

            // Se cierra antes de recargar: así el foco vuelve al botón que abrió el formulario.
            cerrar();
            handleCloseForm();
            await fetchAccounts();
            triggerRefresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!(await confirmar({ titulo: "¿Eliminar esta cuenta?", detalle: "Sus transacciones se mantienen, pero quedan sin cuenta. No se puede deshacer.", accion: "Eliminar", peligro: true }))) return;

        try {
            const res = await fetch(`/api/finance/accounts/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Error al eliminar");
            setAccounts((prev) => prev.filter((a) => a.id !== id));
            triggerRefresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al eliminar");
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            const res = await fetch(`/api/finance/accounts/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isDefault: true }),
            });
            if (!res.ok) throw new Error("Error al actualizar");
            await fetchAccounts();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al actualizar");
        }
    };

    const getAccountTypeInfo = (type: Account["type"]) => {
        return ACCOUNT_TYPES.find((t) => t.value === type) || ACCOUNT_TYPES[5];
    };

    // Solo la primera carga reemplaza la página; al recargar se quedan las filas a la vista.
    if (loading && accounts.length === 0) {
        return (
            <div className="max-w-[1180px]">
                <FinanceBreadcrumbs />
                <CargandoFinanzas texto="Cargando cuentas…" />
            </div>
        );
    }

    return (
        <div className="max-w-[1180px] pb-8">
            <FinanceBreadcrumbs />

            <CabeceraFinanzas titulo="Cuentas" bajada="Gestiona tus cuentas y tarjetas">
                <button type="button" onClick={() => handleOpenForm()} className={BOTON}>
                    <Plus aria-hidden="true" className="size-4" />
                    Nueva cuenta
                </button>
            </CabeceraFinanzas>

            <div className="mt-8">
                <CifrasFinanzas
                    etiqueta="Resumen de cuentas"
                    cifras={[
                        {
                            nombre: "Balance total",
                            valor: formatCurrency(totalBalance, baseCurrency),
                            tono: totalBalance < 0 ? "baja" : undefined,
                        },
                        { nombre: accounts.length === 1 ? "Cuenta activa" : "Cuentas activas", valor: accounts.length },
                    ]}
                />
            </div>

            {error && !showForm && (
                <p role="alert" className={`${ERROR} mt-6`}>
                    {error}
                </p>
            )}

            <section aria-labelledby={`${uid}-lista`} className="mt-10">
                <h2 id={`${uid}-lista`} className={`${SECCION} mb-2`}>Tus cuentas</h2>

                {accounts.length > 0 ? (
                    <ul className={`${LISTA} m-0 list-none p-0`}>
                        {accounts.map((account) => {
                            const typeInfo = getAccountTypeInfo(account.type);
                            const IconComponent = typeInfo.icon;
                            const color = account.color || typeInfo.color;

                            return (
                                <li key={account.id} className={`${FILA} flex-wrap sm:flex-nowrap`}>
                                    {/* Ícono y color que eligió el usuario: son datos de la cuenta */}
                                    <span aria-hidden="true" className={FICHA} style={{ backgroundColor: color + "20" }}>
                                        {account.icon || <IconComponent className="size-5" style={{ color }} />}
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <p className="flex min-w-0 items-center gap-2">
                                            <span className="truncate font-medium text-[var(--txt)]">{account.name}</span>
                                            {account.isDefault && <span className={`${MARCA_NEUTRA} shrink-0`}>Principal</span>}
                                        </p>
                                        <p className="text-sm text-[var(--mut)]">{typeInfo.label}</p>
                                    </div>

                                    <div className="shrink-0 text-right">
                                        <p className={`font-semibold ${CIFRA} ${account.currentBalance >= 0 ? "text-[var(--txt)]" : BAJA}`}>
                                            {formatCurrency(account.currentBalance)}
                                        </p>
                                        <p className="text-xs text-[var(--mut)]">{account.currency.code}</p>
                                    </div>

                                    <div className="flex w-full justify-end gap-1 sm:w-auto sm:shrink-0">
                                        {!account.isDefault && (
                                            <button
                                                type="button"
                                                onClick={() => handleSetDefault(account.id)}
                                                aria-label={`Marcar ${account.name} como principal`}
                                                title="Establecer como principal"
                                                className={ICONO}
                                            >
                                                <Star aria-hidden="true" className="size-[18px]" />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleOpenForm(account)}
                                            aria-label={`Editar ${account.name}`}
                                            title="Editar"
                                            className={ICONO}
                                        >
                                            <Pencil aria-hidden="true" className="size-[18px]" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(account.id)}
                                            aria-label={`Eliminar ${account.name}`}
                                            title="Eliminar"
                                            className={ICONO_PELIGRO}
                                        >
                                            <Trash2 aria-hidden="true" className="size-[18px]" />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className={VACIO}>
                        <p>No tienes cuentas configuradas</p>
                        <button
                            type="button"
                            onClick={() => handleOpenForm()}
                            className={`mt-1 inline-flex min-h-11 items-center px-2 text-sm ${ENLACE}`}
                        >
                            Crear primera cuenta
                        </button>
                    </div>
                )}
            </section>

            {showForm && (
                <DialogoFormulario
                    titulo={editingAccount ? "Editar cuenta" : "Nueva cuenta"}
                    alCerrar={handleCloseForm}
                    ancho="max-w-md"
                >
                    {(cerrar) => (
                        <form onSubmit={(e) => handleSubmit(e, cerrar)} className="space-y-5">
                            <div>
                                <label htmlFor={`${uid}-nombre`} className={ETIQUETA}>
                                    Nombre de la cuenta
                                </label>
                                <input
                                    id={`${uid}-nombre`}
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Cuenta corriente BCI"
                                    className={CAMPO}
                                    required
                                />
                            </div>

                            <fieldset>
                                <legend className={ETIQUETA}>Tipo de cuenta</legend>
                                <div className="grid grid-cols-2 gap-2">
                                    {ACCOUNT_TYPES.map(({ value, label, icon: Icon, color }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            aria-pressed={formData.type === value}
                                            onClick={() => setFormData({ ...formData, type: value as Account["type"], color })}
                                            className={`${OPCION} justify-start ${formData.type === value ? OPCION_SI : OPCION_NO}`}
                                        >
                                            <Icon aria-hidden="true" className="size-[18px] shrink-0" style={{ color }} />
                                            <span className="min-w-0 truncate">{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </fieldset>

                            {/* Saldo inicial: solo al crear */}
                            {!editingAccount && (
                                <div>
                                    <label htmlFor={`${uid}-saldo`} className={ETIQUETA}>
                                        Saldo inicial
                                    </label>
                                    <CampoNumero
                                        id={`${uid}-saldo`}
                                        decimales={2}
                                        negativos
                                        valor={saldoInicial}
                                        alCambiar={setSaldoInicial}
                                        placeholder="0"
                                        aria-describedby={`${uid}-saldo-ayuda`}
                                        className={`${CAMPO} ${CIFRA}`}
                                    />
                                    <p id={`${uid}-saldo-ayuda`} className={AYUDA}>
                                        El saldo actual de la cuenta en {baseCurrency}
                                    </p>
                                </div>
                            )}

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

                            <label className="flex min-h-11 cursor-pointer items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={formData.isDefault}
                                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                    className={CASILLA}
                                />
                                <span className="text-[var(--txt)]">Establecer como cuenta principal</span>
                            </label>

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
