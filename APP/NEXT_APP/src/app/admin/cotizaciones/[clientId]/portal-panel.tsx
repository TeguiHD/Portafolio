"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, KeyRound, Power, CheckCircle2, XCircle, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { confirmar } from "@/modules/admin/confirmar/confirmar";
import ClientSecurityManager from "../../clientes/security-manager";
import { verComoClienteAction, cambiarAccesoPortalAction } from "./actions";
import { copiarTexto } from "@/lib/tools/copiar";
import { BOTON, BOTON_PELIGRO, BOTON_SEC, BOTON_SUAVE, FOCO, TARJETA, TITULO_SECCION } from "@/modules/quotations/estilos";

export interface IngresoPortal {
    id: string;
    fecha: string; // ISO
    exito: boolean;
    motivo: string;
    ip: string | null;
    lugar: string | null;
    sistema: string | null;
    navegador: string | null;
    dispositivo: string | null;
}

interface Props {
    clientId: string;
    clientSlug: string;
    clientName: string;
    activo: boolean;
    canEdit: boolean;
    ingresos: IngresoPortal[];
}

const MOTIVOS: Record<string, string> = { ok: "Ingresó", clave: "Contraseña incorrecta", inactivo: "Acceso suspendido" };

function fecha(iso: string) {
    return new Intl.DateTimeFormat("es-CL", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
        timeZone: "America/Santiago",
    }).format(new Date(iso));
}

export default function PortalPanel({ clientId, clientSlug, clientName, activo, canEdit, ingresos }: Props) {
    const router = useRouter();
    const [abriendo, startAbrir] = useTransition();
    const [cambiando, startCambio] = useTransition();
    const [verTodos, setVerTodos] = useState(false);
    const ultimo = ingresos.find((i) => i.exito);
    const fallidos24h = ingresos.filter((i) => !i.exito && Date.now() - new Date(i.fecha).getTime() < 86_400_000).length;
    const lista = verTodos ? ingresos : ingresos.slice(0, 8);

    const verComo = () => startAbrir(async () => {
        // La pestaña se abre antes de la espera para que el navegador no la bloquee.
        const pestana = window.open("about:blank", "_blank");
        const r = await verComoClienteAction(clientId);
        if (r.success) {
            if (pestana) pestana.location.href = r.url;
            else window.location.href = r.url;
        } else {
            pestana?.close();
            toast.error(r.error);
        }
    });

    const cambiarAcceso = async () => {
        const ok = await confirmar(activo
            ? { titulo: `¿Suspender el acceso de ${clientName} a su portal?`, detalle: "Se cierran sus sesiones al instante.", accion: "Suspender", peligro: true }
            : { titulo: `¿Reactivar el acceso de ${clientName} a su portal?`, accion: "Reactivar" });
        if (!ok) return;
        startCambio(async () => {
            const r = await cambiarAccesoPortalAction(clientId, !activo);
            if (r.success) { toast.success(activo ? "Acceso suspendido" : "Acceso reactivado"); router.refresh(); }
            else toast.error(r.error);
        });
    };

    const copiarDireccion = async () => {
        if (await copiarTexto("https://nicoholas.dev/cotizacion")) toast.success("Dirección copiada");
        else toast.error("No se pudo copiar la dirección");
    };

    return (
        <section className={`${TARJETA} space-y-6 p-4 sm:p-6`} aria-labelledby="portal-titulo">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0">
                    <h2 id="portal-titulo" className="flex items-center gap-2 text-base font-semibold text-[var(--txt)]">
                        <KeyRound size={16} aria-hidden="true" className="text-[var(--mut)]" /> Portal del cliente
                    </h2>
                    <p className="mt-1 text-sm text-[var(--mut)]">
                        <span className={activo ? "text-emerald-400" : "text-red-400"}>{activo ? "Acceso activo" : "Acceso suspendido"}</span>
                        {ultimo ? `. Último ingreso: ${fecha(ultimo.fecha)}` : ". Todavía no ha ingresado"}
                        {fallidos24h > 0 && <span className="text-amber-400">. {fallidos24h} intento{fallidos24h > 1 ? "s" : ""} fallido{fallidos24h > 1 ? "s" : ""} en 24 h</span>}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={verComo} disabled={abriendo} className={BOTON}>
                        {abriendo ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />} Ver como cliente
                    </button>
                    {canEdit && (
                        <button type="button" onClick={cambiarAcceso} disabled={cambiando} className={activo ? BOTON_PELIGRO : BOTON_SEC}>
                            <Power size={16} aria-hidden="true" /> {activo ? "Suspender acceso" : "Reactivar acceso"}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid gap-x-6 border-y border-[var(--linea)] text-sm sm:grid-cols-2">
                <div className="flex items-center justify-between gap-2 py-1">
                    <span className="text-[var(--mut)]">Dirección</span>
                    <button type="button" onClick={copiarDireccion} aria-label="Copiar la dirección del portal: nicoholas.dev/cotizacion"
                        className={`inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-[var(--txt)] transition-colors duration-150 hover:text-[var(--acento)] md:min-h-10 ${FOCO}`}>
                        nicoholas.dev/cotizacion <Copy size={12} aria-hidden="true" />
                    </button>
                </div>
                {canEdit && (
                    <div className="border-t border-[var(--linea)] sm:border-t-0">
                        <ClientSecurityManager clientId={clientId} clientName={clientName} clientSlug={clientSlug} />
                    </div>
                )}
            </div>

            <div>
                <h3 className={`${TITULO_SECCION} mb-2`}>Historial de ingresos</h3>
                {ingresos.length === 0 ? (
                    <p className="text-sm text-[var(--mut)]">Sin ingresos registrados.</p>
                ) : (
                    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Historial de ingresos al portal">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--linea)] text-left">
                                    <th scope="col" className="py-2 pr-4 text-sm font-medium text-[var(--mut)]">Fecha</th>
                                    <th scope="col" className="py-2 pr-4 text-sm font-medium text-[var(--mut)]">Resultado</th>
                                    <th scope="col" className="py-2 pr-4 text-sm font-medium text-[var(--mut)]">IP</th>
                                    <th scope="col" className="py-2 pr-4 text-sm font-medium text-[var(--mut)]">Ubicación</th>
                                    <th scope="col" className="py-2 pr-4 text-sm font-medium text-[var(--mut)]">Sistema y navegador</th>
                                    <th scope="col" className="py-2 text-sm font-medium text-[var(--mut)]">Dispositivo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lista.map((i) => (
                                    <tr key={i.id} className="border-b border-[var(--linea)] text-[var(--txt)]">
                                        <td className="whitespace-nowrap py-2 pr-4 tabular-nums">{fecha(i.fecha)}</td>
                                        <td className="whitespace-nowrap py-2 pr-4">
                                            <span className={`inline-flex items-center gap-1 ${i.exito ? "text-emerald-400" : "text-amber-400"}`}>
                                                {i.exito ? <CheckCircle2 size={14} aria-hidden="true" /> : <XCircle size={14} aria-hidden="true" />} {MOTIVOS[i.motivo] || i.motivo}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs">{i.ip || "—"}</td>
                                        <td className="whitespace-nowrap py-2 pr-4">{i.lugar || "—"}</td>
                                        <td className="whitespace-nowrap py-2 pr-4">{[i.sistema, i.navegador].filter(Boolean).join(", ") || "—"}</td>
                                        <td className="whitespace-nowrap py-2">{i.dispositivo || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {ingresos.length > 8 && (
                    <button type="button" onClick={() => setVerTodos((v) => !v)} aria-expanded={verTodos} className={`${BOTON_SUAVE} mt-2`}>
                        {verTodos ? "Ver menos" : `Ver los ${ingresos.length} ingresos`}
                    </button>
                )}
                <p className="mt-3 text-xs text-[var(--mut)]">
                    La IP se guarda cifrada y el historial se borra después de 12 meses. La ubicación es aproximada, según la IP.
                </p>
            </div>
        </section>
    );
}
