"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Trash2, Plus, FileText, IdCard } from "lucide-react";
import { toast } from "sonner";
import { deleteClientAction } from "../../../modules/admin/clients/actions";
import { confirmar } from "@/modules/admin/confirmar/confirmar";
import ContactInfoModal from "./contact-info-modal";
import ClientSecurityManager from "./security-manager";
import CreateClientModal from "../cotizaciones/components/CreateClientModal";
import { BOTON, BOTON_ICONO, BOTON_SEC, CAMPO, CHIP_ACENTO, FOCO, H1, INICIALES } from "@/modules/quotations/estilos";

export interface ClienteDirectorio {
    id: string;
    name: string;
    slug: string;
    email: string | null;
    company: string | null;
    rut: string | null;
    address: string | null;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    contactRole: string | null;
    workType: string | null;
    userId: string;
    propuestas: number;
    negocios: number;
    contratos: number;
}

interface ClientsPageClientProps {
    clientes: ClienteDirectorio[];
    busqueda: string;
    currentUserId: string;
    isSuperAdmin: boolean;
}

/** Directorio de clientes: buscar, crear, editar el contacto, la contraseña del portal y abrir la ficha o sus propuestas. */
/** «1 propuesta», «3 propuestas». */
const cuenta = (n: number, nombre: string) => `${n} ${nombre}${n === 1 ? "" : "s"}`;

export default function ClientsPageClient({ clientes, busqueda, currentUserId, isSuperAdmin }: ClientsPageClientProps) {
    const [search, setSearch] = useState(busqueda);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [buscando, startBuscar] = useTransition();
    const router = useRouter();
    const ruta = usePathname();

    // La búsqueda vive en la URL (?q=): el servidor filtra. Se espera a que dejes de escribir.
    useEffect(() => {
        const texto = search.trim();
        if (texto === busqueda) return;
        const t = setTimeout(() => {
            startBuscar(() => router.replace(texto ? `${ruta}?q=${encodeURIComponent(texto)}` : ruta, { scroll: false }));
        }, 300);
        return () => clearTimeout(t);
    }, [search, busqueda, router, ruta]);

    const handleDelete = async (cliente: ClienteDirectorio) => {
        if (!(await confirmar({
            titulo: `¿Eliminar a ${cliente.name}?`,
            detalle: cliente.propuestas > 0 ? "Sus propuestas también se eliminan. No se puede deshacer." : "No se puede deshacer.",
            accion: "Eliminar",
            peligro: true,
        }))) return;
        const res = await deleteClientAction(cliente.id);
        if (res.success) {
            toast.success("Cliente eliminado");
            router.refresh();
        } else {
            toast.error(res.error || "No se pudo eliminar el cliente");
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <h1 className={H1}>Clientes</h1>

                <div className="flex w-full items-center gap-2 md:w-auto">
                    <div className="relative w-full md:w-96">
                        <label htmlFor="buscar-clientes" className="sr-only">Buscar clientes</label>
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mut)]" size={16} aria-hidden="true" />
                        <input
                            id="buscar-clientes"
                            type="search"
                            placeholder="Nombre, empresa, contacto o correo"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={`${CAMPO} pl-9`}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className={BOTON}
                        aria-label="Nuevo cliente"
                    >
                        <Plus size={16} aria-hidden="true" />
                        <span className="hidden md:inline">Nuevo cliente</span>
                    </button>
                </div>
            </header>

            <p className="text-sm text-[var(--mut)]" aria-live="polite">
                {buscando ? "Buscando…" : busqueda
                    ? `${clientes.length} resultado${clientes.length === 1 ? "" : "s"} para «${busqueda}»`
                    : `${clientes.length} cliente${clientes.length === 1 ? "" : "s"}${clientes.length === 100 ? " (los 100 más recientes; usa la búsqueda para ver otros)" : ""}`}
            </p>

            {clientes.length === 0 ? (
                <p className="border-y border-[var(--linea)] py-10 text-center text-[var(--mut)]">
                    {busqueda ? "Ningún cliente coincide con la búsqueda." : "Aún no tienes clientes."}
                </p>
            ) : (
                <ul className="border-t border-[var(--linea)]">
                    {clientes.map(client => {
                        const puedeAdministrar = isSuperAdmin || client.userId === currentUserId;
                        const correo = client.contactEmail || client.email;
                        const datos = [client.company && client.company !== client.name ? client.company : null, correo || "Sin correo"].filter(Boolean).join(", ");
                        return (
                            <li key={client.id} className="grid gap-4 border-b border-[var(--linea)] py-5 md:grid-cols-[minmax(0,1fr)_auto] md:gap-8">
                                <div className="flex min-w-0 items-start gap-3">
                                    <span aria-hidden="true" className={`${INICIALES} size-10 text-sm`}>
                                        {client.name.substring(0, 2).toUpperCase()}
                                    </span>
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <h2 className="truncate text-base font-semibold text-[var(--txt)]" title={client.name}>
                                            <Link href={`/admin/clientes/${client.id}`} className={`rounded-sm transition-colors duration-150 hover:text-[var(--acento)] ${FOCO}`}>
                                                {client.name}
                                            </Link>
                                        </h2>
                                        <p className="truncate text-sm text-[var(--mut)]">{datos}</p>
                                        {client.contactName && (
                                            <p className="truncate text-sm text-[var(--mut)]">
                                                Contacto: <span className="text-[var(--txt)]">{client.contactName}</span>{client.contactRole && `, ${client.contactRole}`}
                                            </p>
                                        )}
                                        <p className="text-sm tabular-nums text-[var(--mut)]">
                                            {cuenta(client.propuestas, "propuesta")}, {cuenta(client.negocios, "negocio")} y {cuenta(client.contratos, "contrato")}
                                        </p>
                                        {client.workType && (
                                            <p className="pt-1"><span className={`${CHIP_ACENTO} max-w-full truncate`}>{client.workType}</span></p>
                                        )}
                                        {puedeAdministrar && (
                                            <div className="max-w-sm pt-1">
                                                <ClientSecurityManager clientId={client.id} clientName={client.name} clientSlug={client.slug} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* En ancho, una grilla: así el flex-1 del botón «Contacto» no lo estira; en celular, botones parejos. */}
                                <div className="flex flex-wrap items-center gap-2 md:grid md:grid-flow-col md:auto-cols-max md:self-start">
                                    <ContactInfoModal
                                        client={client}
                                        onUpdate={() => router.refresh()}
                                        canDelete={puedeAdministrar}
                                    />
                                    <Link
                                        href={`/admin/cotizaciones/${client.id}`}
                                        className={`${BOTON_SEC} flex-1 md:flex-none`}
                                        aria-label={`Propuestas de ${client.name}`}
                                    >
                                        <FileText size={16} aria-hidden="true" />
                                        <span>Propuestas</span>
                                    </Link>
                                    <Link
                                        href={`/admin/clientes/${client.id}`}
                                        className={`${BOTON} flex-1 md:flex-none`}
                                        aria-label={`Ficha de ${client.name}`}
                                    >
                                        <IdCard size={16} aria-hidden="true" />
                                        <span>Ficha</span>
                                    </Link>
                                    {puedeAdministrar && (
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(client)}
                                            className={`${BOTON_ICONO} hover:text-red-400`}
                                            aria-label={`Eliminar a ${client.name}`}
                                        >
                                            <Trash2 size={16} aria-hidden="true" />
                                        </button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <CreateClientModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    router.refresh();
                    setShowCreateModal(false);
                }}
            />
        </div>
    );
}
