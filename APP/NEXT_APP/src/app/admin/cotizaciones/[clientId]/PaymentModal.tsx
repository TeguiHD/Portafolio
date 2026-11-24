"use client";

import { CampoNumero } from "@/components/ui/CampoNumero";
import { useState, useEffect, useCallback, useId, useTransition } from "react";
import { DollarSign, CreditCard, Banknote, Building2, Wallet, Bitcoin, HelpCircle, FileText, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { PaymentMethod } from '@/generated/prisma/client';
import Ventana from "@/modules/quotations/components/Ventana";
import { AREA, BARRA, BOTON, BOTON_MINI, CAMPO, ETIQUETA, OPCION, TITULO_SECCION } from "@/modules/quotations/estilos";
import { cobrosDePropuestaAction, registrarPagoAction, type CobrosDePropuesta } from "@/app/admin/gestion-comercial/pagos/actions";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    quotationId: string;
    quotationFolio: string;
    total: number;
    totalPaid: number;
    onPaymentRegistered?: () => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: typeof DollarSign }[] = [
    { value: "TRANSFER", label: "Transferencia", icon: Building2 },
    { value: "CASH", label: "Efectivo", icon: Banknote },
    { value: "CREDIT_CARD", label: "Tarjeta de crédito", icon: CreditCard },
    { value: "DEBIT_CARD", label: "Tarjeta de débito", icon: Wallet },
    { value: "CHECK", label: "Cheque", icon: FileText },
    { value: "PAYPAL", label: "PayPal", icon: DollarSign },
    { value: "CRYPTO", label: "Cripto", icon: Bitcoin },
    { value: "OTHER", label: "Otro", icon: HelpCircle },
];

type Cuota = CobrosDePropuesta["cuotas"][number];

const hoyChile = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Santiago" });
const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;
const nombreCuota = (c: { numero: number | null; de: number | null }) => (c.numero && c.de ? `Cuota ${c.numero} de ${c.de}` : "Cuota");

export default function PaymentModal({ isOpen, ...props }: PaymentModalProps) {
    if (!isOpen) return null;
    // Se monta al abrir: el formulario parte limpio y el historial se carga cada vez.
    return <Contenido {...props} />;
}

/**
 * Registra un pago recibido con las mismas reglas que Pagos (registrarPagoAction): si la propuesta tiene cuotas por
 * cobrar, el pago salda una de ellas en vez de sumar un registro aparte que dejaba la cuota pendiente para siempre
 * en «Hoy» y en Comercial.
 */
function Contenido({
    onClose,
    quotationId,
    quotationFolio,
    total: totalInicial,
    totalPaid: pagadoInicial,
    onPaymentRegistered
}: Omit<PaymentModalProps, "isOpen">) {
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState<PaymentMethod>("TRANSFER");
    const [reference, setReference] = useState("");
    const [notes, setNotes] = useState("");
    // Hoy en Chile (toISOString da el día siguiente en la noche).
    const [paidAt, setPaidAt] = useState(hoyChile);
    const [cuotaId, setCuotaId] = useState("");
    const [isSubmitting, startSubmit] = useTransition();
    const [datos, setDatos] = useState<CobrosDePropuesta | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const id = useId();

    // Lo leído del servidor manda; mientras carga, lo que trajo la tarjeta.
    const total = datos?.total ?? totalInicial;
    const totalPaid = datos?.pagado ?? pagadoInicial;
    const remaining = Math.max(0, total - totalPaid);
    const percentagePaid = total > 0 ? Math.min(100, (totalPaid / total) * 100) : 0;
    const cuotas = datos?.cuotas ?? [];
    const cuota = cuotas.find((c) => c.id === cuotaId);
    const payments = datos?.pagos ?? [];

    const elegirCuota = useCallback((c: Cuota | undefined) => {
        setCuotaId(c?.id ?? "");
        setAmount(c ? String(Math.round(c.monto)) : "");
    }, []);

    const cargar = useCallback(async () => {
        setIsLoadingHistory(true);
        try {
            const r = await cobrosDePropuestaAction(quotationId);
            if (r.success) {
                setDatos(r.datos);
                // La cuota que vence antes (o la atrasada) queda elegida: es la que se suele estar pagando.
                elegirCuota(r.datos.cuotas[0]);
            } else {
                setError(r.error);
            }
        } catch {
            setError("No se pudieron leer los pagos: revisa la conexión");
        } finally {
            setIsLoadingHistory(false);
        }
    }, [quotationId, elegirCuota]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const amountNum = Number(amount);
        if (!Number.isFinite(amountNum) || amountNum <= 0) {
            setError("Escribe un monto mayor que cero");
            return;
        }

        if (amountNum > remaining + 0.5) {
            setError(`El monto supera lo que falta por pagar (${pesos(remaining)})`);
            return;
        }

        startSubmit(async () => {
            try {
                const r = await registrarPagoAction({
                    quotationId,
                    cuotaId: cuota?.id,
                    amount: amountNum,
                    fecha: paidAt,
                    method,
                    status: "PAID",
                    // Al saldar una cuota se conserva su número (sin esto quedaría en blanco).
                    installmentNumber: cuota?.numero && cuota.de ? cuota.numero : undefined,
                    totalInstallments: cuota?.numero && cuota.de ? cuota.de : undefined,
                    reference: reference.trim() || undefined,
                    notes: notes.trim() || undefined,
                });
                if (!r.success) {
                    setError(r.error);
                    return;
                }

                const anuladas = r.anuladas === 1 ? "la cuota que quedaba" : `las ${r.anuladas} cuotas que quedaban`;
                toast.success(r.completa
                    ? `Pago registrado: la propuesta quedó pagada y completada${r.anuladas ? ` (se anularon ${anuladas} por cobrar)` : ""}`
                    : cuota ? `${nombreCuota(cuota)} pagada` : "Pago registrado");

                setReference("");
                setNotes("");
                onPaymentRegistered?.();

                if (r.completa) {
                    onClose();
                    return;
                }
                // Lo que queda: la cuota siguiente, si hay.
                await cargar();
            } catch {
                setError("No se pudo registrar el pago: revisa la conexión");
            }
        });
    };

    const getMethodIcon = (m: string) => {
        const found = PAYMENT_METHODS.find(pm => pm.value === m);
        return found?.icon || HelpCircle;
    };

    return (
        <Ventana
            titulo="Registrar pago"
            descripcion={quotationFolio}
            icono={<DollarSign size={18} />}
            alCerrar={onClose}
            ancho="max-w-2xl"
        >
            <dl className="grid grid-cols-3 gap-x-4 border-y border-[var(--linea)] py-4">
                <div className="flex min-w-0 flex-col">
                    <dt className="order-2 text-[13px] text-[var(--mut)]">Total</dt>
                    <dd className="order-1 break-words text-base font-bold tabular-nums text-[var(--txt)] sm:text-xl">{pesos(total)}</dd>
                </div>
                <div className="flex min-w-0 flex-col">
                    <dt className="order-2 text-[13px] text-[var(--mut)]">Pagado</dt>
                    <dd className="order-1 break-words text-base font-bold tabular-nums text-emerald-400 sm:text-xl">{pesos(totalPaid)}</dd>
                </div>
                <div className="flex min-w-0 flex-col">
                    <dt className="order-2 text-[13px] text-[var(--mut)]">Falta</dt>
                    <dd className={`order-1 break-words text-base font-bold tabular-nums sm:text-xl ${remaining > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                        {pesos(remaining)}
                    </dd>
                </div>
            </dl>
            <div className="mt-3">
                <div className={BARRA} role="progressbar" aria-label="Pagado" aria-valuenow={Math.round(percentagePaid)} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percentagePaid}%` }} />
                </div>
                <p className="mt-1 text-right text-xs tabular-nums text-[var(--mut)]">{percentagePaid.toFixed(0)}% pagado</p>
            </div>

            {remaining > 0 && (
                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                    {cuotas.length > 0 && (
                        <div>
                            <label htmlFor={`${id}-cuota`} className={ETIQUETA}>Qué se pagó</label>
                            <select
                                id={`${id}-cuota`}
                                value={cuotaId}
                                onChange={(e) => elegirCuota(cuotas.find((c) => c.id === e.target.value))}
                                className={CAMPO}
                            >
                                {cuotas.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {nombreCuota(c)}, {pesos(c.monto)}
                                        {c.vence ? `, ${c.estado === "OVERDUE" ? "venció" : "vence"} el ${fechaCorta(c.vence)}` : ""}
                                    </option>
                                ))}
                                <option value="">Otro pago, fuera de las cuotas</option>
                            </select>
                        </div>
                    )}

                    <div>
                        <label htmlFor={`${id}-monto`} className={ETIQUETA}>Monto del pago</label>
                        <div className="relative">
                            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--mut)]">$</span>
                            <CampoNumero
                                id={`${id}-monto`}
                                // El peso chileno no lleva decimales.
                                valor={amount ? Number(amount) : null}
                                alCambiar={(n) => setAmount(n === null ? "" : String(n))}
                                placeholder={Math.round(remaining).toLocaleString("es-CL")}
                                className={`${CAMPO} pl-7 tabular-nums`}
                                aria-invalid={error ? true : undefined}
                                aria-describedby={error ? `${id}-error` : undefined}
                                required
                                data-autofocus
                            />
                        </div>
                        {!cuota && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                <button type="button" onClick={() => setAmount(String(Math.round(remaining)))} className={BOTON_MINI}>
                                    Todo lo que falta ({Math.round(remaining).toLocaleString("es-CL")})
                                </button>
                                <button type="button" onClick={() => setAmount(String(Math.floor(remaining / 2)))} className={BOTON_MINI}>
                                    La mitad
                                </button>
                            </div>
                        )}
                    </div>

                    <fieldset>
                        <legend className={ETIQUETA}>Medio de pago</legend>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {PAYMENT_METHODS.map((pm) => {
                                const PMIcon = pm.icon;
                                return (
                                    <button
                                        key={pm.value}
                                        type="button"
                                        onClick={() => setMethod(pm.value)}
                                        aria-pressed={method === pm.value}
                                        className={`${OPCION} flex min-h-11 items-center gap-2 p-3 text-sm`}
                                    >
                                        <PMIcon size={16} aria-hidden="true" className={method === pm.value ? "text-[var(--acento)]" : "text-[var(--mut)]"} />
                                        <span className="text-[var(--txt)]">{pm.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor={`${id}-fecha`} className={ETIQUETA}>Fecha del pago</label>
                            <input
                                id={`${id}-fecha`}
                                type="date"
                                value={paidAt}
                                onChange={(e) => setPaidAt(e.target.value)}
                                required
                                className={CAMPO}
                            />
                        </div>
                        <div>
                            <label htmlFor={`${id}-ref`} className={ETIQUETA}>Referencia (opcional)</label>
                            <input
                                id={`${id}-ref`}
                                type="text"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                maxLength={100}
                                placeholder="N.º de operación"
                                className={CAMPO}
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor={`${id}-notas`} className={ETIQUETA}>Notas (opcional)</label>
                        <textarea
                            id={`${id}-notas`}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            maxLength={500}
                            className={AREA}
                        />
                    </div>

                    {error && <p id={`${id}-error`} role="alert" className="text-sm text-red-400">{error}</p>}

                    <button type="submit" disabled={isSubmitting || isLoadingHistory} aria-busy={isSubmitting} className={`${BOTON} w-full`}>
                        {isSubmitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                Registrando…
                            </>
                        ) : (
                            <>
                                <Check size={16} aria-hidden="true" />
                                {cuota ? `Registrar pago de la ${nombreCuota(cuota).toLowerCase()}` : "Registrar pago"}
                            </>
                        )}
                    </button>
                </form>
            )}

            {remaining <= 0 && !isLoadingHistory && (
                <div className="py-8 text-center">
                    <Check className="mx-auto mb-3 text-emerald-400" size={28} aria-hidden="true" />
                    <h3 className="text-lg font-semibold text-[var(--txt)]">Propuesta pagada</h3>
                    <p className="mt-1 text-[var(--mut)]">Ya se pagó completa.</p>
                    {error && <p role="alert" className="mt-2 text-sm text-red-400">{error}</p>}
                </div>
            )}

            {payments.length > 0 && (
                <section aria-labelledby={`${id}-historial`} className="mt-8">
                    <h3 id={`${id}-historial`} className={`${TITULO_SECCION} mb-2`}>Pagos recibidos</h3>
                    <ul className="border-t border-[var(--linea)]">
                        {payments.map((payment) => {
                            const MethodIcon = getMethodIcon(payment.metodo);
                            const nombreMedio = PAYMENT_METHODS.find((pm) => pm.value === payment.metodo)?.label ?? payment.metodo;
                            const detalle = [
                                fechaCorta(payment.fecha),
                                payment.numero && payment.de ? nombreCuota(payment) : null,
                                payment.referencia,
                            ].filter(Boolean).join(", ");
                            return (
                                <li key={payment.id} className="flex items-center justify-between gap-3 border-b border-[var(--linea)] py-3">
                                    <span className="flex min-w-0 items-center gap-3">
                                        <MethodIcon size={16} aria-hidden="true" className="shrink-0 text-[var(--mut)]" />
                                        <span className="min-w-0">
                                            <span className="block text-sm text-[var(--txt)]">{nombreMedio}</span>
                                            <span className="block truncate text-xs text-[var(--mut)]">{detalle}</span>
                                        </span>
                                    </span>
                                    <span className="shrink-0 font-semibold tabular-nums text-[var(--txt)]">
                                        {pesos(payment.monto)}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            {isLoadingHistory && (
                <p role="status" className="mt-4 flex items-center justify-center gap-2 text-sm text-[var(--mut)]">
                    <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    Cargando pagos…
                </p>
            )}
        </Ventana>
    );
}
