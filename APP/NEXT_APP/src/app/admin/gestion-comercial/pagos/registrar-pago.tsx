"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { botonPrincipal, botonSecundario, campo, etiqueta } from "../estilos";
import { registrarPagoAction, type EntradaPago } from "./actions";

export interface CuotaPendiente {
    id: string;
    monto: number;
    numero: number | null;
    de: number | null;
    vence: string | null; // ISO
    estado: "PENDING" | "OVERDUE";
}

export interface PropuestaCobrable {
    id: string;
    folio: string;
    proyecto: string;
    cliente: string;
    total: number;
    pagado: number;
    cuotas: CuotaPendiente[];
}

type Metodo = EntradaPago["method"];
type Estado = EntradaPago["status"];

const METODOS: { valor: Metodo; nombre: string }[] = [
    { valor: "TRANSFER", nombre: "Transferencia" },
    { valor: "CASH", nombre: "Efectivo" },
    { valor: "DEBIT_CARD", nombre: "Tarjeta de débito" },
    { valor: "CREDIT_CARD", nombre: "Tarjeta de crédito" },
    { valor: "CHECK", nombre: "Cheque" },
    { valor: "PAYPAL", nombre: "PayPal" },
    { valor: "CRYPTO", nombre: "Criptomonedas" },
    { valor: "OTHER", nombre: "Otro" },
];

const ESTADOS: { valor: Estado; nombre: string }[] = [
    { valor: "PAID", nombre: "Pagado" },
    { valor: "PENDING", nombre: "Por cobrar" },
    { valor: "OVERDUE", nombre: "Atrasado" },
    { valor: "CANCELLED", nombre: "Anulada" },
];

const pesos = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
const fechaCorta = (iso: string) => new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Santiago" }).format(new Date(iso));
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());

const VACIO = {
    quotationId: "", cuotaId: "", monto: "", fecha: "", method: "TRANSFER" as Metodo, status: "PAID" as Estado,
    numero: "", de: "", reference: "", notes: "",
};

/**
 * «Registrar pago»: botón y formulario en un <dialog> nativo (foco atrapado, Escape cierra, el fondo queda inerte).
 * Sirve para un pago nuevo o para saldar, mover o anular una cuota que estaba por cobrar.
 */
export default function RegistrarPago({ propuestas, abrirAlCargar }: { propuestas: PropuestaCobrable[]; abrirAlCargar: boolean }) {
    const dialogo = useRef<HTMLDialogElement>(null);
    const router = useRouter();
    const ruta = usePathname();
    const id = useId();
    const [form, setForm] = useState(VACIO);
    const [error, setError] = useState<string | null>(null);
    const [guardando, startGuardar] = useTransition();

    const propuesta = useMemo(() => propuestas.find((p) => p.id === form.quotationId), [propuestas, form.quotationId]);
    const saldo = propuesta ? Math.max(0, propuesta.total - propuesta.pagado) : 0;
    const montoNumero = Number(form.monto || 0);

    const abrir = () => {
        setForm({ ...VACIO, fecha: hoy(), quotationId: propuestas.length === 1 ? propuestas[0].id : "" });
        setError(null);
        if (!dialogo.current?.open) dialogo.current?.showModal();
    };

    // Desde el resumen de Comercial («Registrar pago») se llega con ?registrar=1: el formulario se abre solo, una vez.
    useEffect(() => {
        if (!abrirAlCargar) return;
        setForm({ ...VACIO, fecha: hoy(), quotationId: propuestas.length === 1 ? propuestas[0].id : "" });
        if (!dialogo.current?.open) dialogo.current?.showModal();
        router.replace(ruta, { scroll: false });
    }, [abrirAlCargar, propuestas, router, ruta]);

    const elegirCuota = (cuotaId: string) => {
        const cuota = propuesta?.cuotas.find((c) => c.id === cuotaId);
        setForm((f) => cuota
            ? { ...f, cuotaId, monto: String(Math.round(cuota.monto)), numero: cuota.numero ? String(cuota.numero) : "", de: cuota.de ? String(cuota.de) : "", status: "PAID", fecha: hoy() }
            : { ...f, cuotaId: "", status: f.status === "CANCELLED" ? "PAID" : f.status });
    };

    const enviar = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!form.quotationId) { setError("Elige la propuesta"); return; }
        if (!(montoNumero > 0)) { setError("Escribe un monto mayor que cero"); return; }
        if (form.status === "PAID" && montoNumero > saldo + 0.5) { setError(`El monto supera el saldo pendiente (${pesos(saldo)})`); return; }
        startGuardar(async () => {
            const r = await registrarPagoAction({
                quotationId: form.quotationId,
                cuotaId: form.cuotaId || undefined,
                amount: montoNumero,
                fecha: form.fecha,
                method: form.method,
                status: form.status,
                installmentNumber: form.numero ? Number(form.numero) : undefined,
                totalInstallments: form.de ? Number(form.de) : undefined,
                reference: form.reference.trim() || undefined,
                notes: form.notes.trim() || undefined,
            });
            if (!r.success) { setError(r.error); return; }
            toast.success(form.status === "PAID"
                ? (r.completa
                    ? `Pago registrado: la propuesta quedó pagada completa${r.anuladas ? ` y se anularon ${r.anuladas === 1 ? "la cuota que quedaba" : `las ${r.anuladas} cuotas que quedaban`} por cobrar` : ""}`
                    : "Pago registrado")
                : "Cuota guardada");
            dialogo.current?.close();
            router.refresh();
        });
    };

    const estados = form.cuotaId ? ESTADOS : ESTADOS.filter((e) => e.valor !== "CANCELLED");
    const etiquetaFecha = form.status === "PAID" ? "Fecha de pago" : form.status === "CANCELLED" ? "Fecha" : "Vence el";

    return (
        <>
            <button type="button" onClick={abrir} className={botonPrincipal}>
                Registrar pago
            </button>

            <dialog ref={dialogo} aria-labelledby={`${id}-t`}
                className="m-auto w-[min(560px,calc(100%-24px))] max-h-[min(92dvh,900px)] rounded-2xl border border-[var(--linea-2)] bg-[var(--sup)] p-0 text-[var(--txt)] shadow-2xl overscroll-contain backdrop:bg-black/60 backdrop:overflow-hidden backdrop:overscroll-contain">
                <form onSubmit={enviar} className="p-5 sm:p-6 space-y-4" noValidate>
                    <div>
                        <h2 id={`${id}-t`} className="text-lg font-semibold">Registrar pago</h2>
                        <p className="text-sm text-[var(--mut)] mt-1">De una propuesta aprobada. Lo marcado como pagado suma a lo cobrado.</p>
                    </div>

                    {propuestas.length === 0 ? (
                        <p className="text-sm text-[var(--mut)]">
                            No hay propuestas aprobadas. Los pagos se registran sobre una propuesta aprobada:{" "}
                            <Link href="/admin/cotizaciones" className="text-[var(--acento)] underline underline-offset-2">ir a Propuestas</Link>.
                        </p>
                    ) : (
                        <>
                            <div>
                                <label htmlFor={`${id}-q`} className={etiqueta}>Propuesta</label>
                                <select id={`${id}-q`} required value={form.quotationId} className={campo}
                                    onChange={(e) => setForm((f) => ({ ...f, quotationId: e.target.value, cuotaId: "", status: f.status === "CANCELLED" ? "PAID" : f.status }))}>
                                    <option value="">Elige una propuesta</option>
                                    {propuestas.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.folio} · {p.cliente} · saldo {pesos(Math.max(0, p.total - p.pagado))}
                                        </option>
                                    ))}
                                </select>
                                {propuesta && (
                                    <p className="text-xs text-[var(--mut)] mt-1.5">
                                        {propuesta.proyecto}. Total {pesos(propuesta.total)}, cobrado {pesos(propuesta.pagado)}.
                                    </p>
                                )}
                            </div>

                            {propuesta && propuesta.cuotas.length > 0 && (
                                <div>
                                    <label htmlFor={`${id}-c`} className={etiqueta}>Cuota</label>
                                    <select id={`${id}-c`} value={form.cuotaId} className={campo} onChange={(e) => elegirCuota(e.target.value)}>
                                        <option value="">Pago nuevo</option>
                                        {propuesta.cuotas.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.numero && c.de ? `Cuota ${c.numero} de ${c.de}` : "Cuota"} · {pesos(c.monto)}
                                                {c.vence ? ` · ${c.estado === "OVERDUE" ? "atrasada desde" : "vence"} ${fechaCorta(c.vence)}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor={`${id}-m`} className={etiqueta}>Monto (CLP)</label>
                                    <input id={`${id}-m`} type="text" inputMode="numeric" autoComplete="off" required className={campo}
                                        value={form.monto ? Number(form.monto).toLocaleString("es-CL") : ""}
                                        onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value.replace(/\D/g, "").slice(0, 13) }))}
                                        aria-describedby={propuesta ? `${id}-saldo` : undefined} />
                                    {propuesta && (
                                        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-[var(--mut)]">
                                            <span id={`${id}-saldo`}>Saldo pendiente: {pesos(saldo)}</span>
                                            {saldo > 0 && (
                                                <button type="button" onClick={() => setForm((f) => ({ ...f, monto: String(Math.round(saldo)) }))}
                                                    className="min-h-11 sm:min-h-0 rounded-sm text-[var(--acento)] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)]">
                                                    Usar todo
                                                </button>
                                            )}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label htmlFor={`${id}-f`} className={etiqueta}>{etiquetaFecha}</label>
                                    <input id={`${id}-f`} type="date" required className={campo} value={form.fecha}
                                        onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} />
                                </div>
                                <div>
                                    <label htmlFor={`${id}-me`} className={etiqueta}>Método</label>
                                    <select id={`${id}-me`} className={campo} value={form.method}
                                        onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as Metodo }))}>
                                        {METODOS.map((m) => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor={`${id}-e`} className={etiqueta}>Estado</label>
                                    <select id={`${id}-e`} className={campo} value={form.status}
                                        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Estado }))}>
                                        {estados.map((s) => <option key={s.valor} value={s.valor}>{s.nombre}</option>)}
                                    </select>
                                </div>
                            </div>

                            <fieldset className="grid grid-cols-2 gap-3">
                                <legend className="text-sm text-[var(--mut)] mb-1.5">Cuotas (opcional)</legend>
                                <div>
                                    <label htmlFor={`${id}-n`} className={etiqueta}>Cuota número</label>
                                    <input id={`${id}-n`} type="number" inputMode="numeric" min={1} max={120} className={campo} value={form.numero}
                                        onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} />
                                </div>
                                <div>
                                    <label htmlFor={`${id}-d`} className={etiqueta}>De un total de</label>
                                    <input id={`${id}-d`} type="number" inputMode="numeric" min={1} max={120} className={campo} value={form.de}
                                        onChange={(e) => setForm((f) => ({ ...f, de: e.target.value }))} />
                                </div>
                            </fieldset>

                            <div>
                                <label htmlFor={`${id}-r`} className={etiqueta}>Referencia (opcional)</label>
                                <input id={`${id}-r`} type="text" maxLength={100} autoComplete="off" placeholder="N.º de operación" className={campo}
                                    value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
                            </div>
                            <div>
                                <label htmlFor={`${id}-no`} className={etiqueta}>Notas (opcional)</label>
                                <textarea id={`${id}-no`} rows={2} maxLength={500} className={`${campo} resize-none`}
                                    value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                            </div>
                        </>
                    )}

                    <p role="alert" className="text-sm text-red-400 min-h-5">{error}</p>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                        <button type="button" onClick={() => dialogo.current?.close()} className={botonSecundario}>
                            Cancelar
                        </button>
                        {propuestas.length > 0 && (
                            <button type="submit" disabled={guardando} aria-busy={guardando} className={botonPrincipal}>
                                {guardando ? "Guardando…" : form.status === "PAID" ? "Registrar pago" : "Guardar cuota"}
                            </button>
                        )}
                    </div>
                </form>
            </dialog>
        </>
    );
}
