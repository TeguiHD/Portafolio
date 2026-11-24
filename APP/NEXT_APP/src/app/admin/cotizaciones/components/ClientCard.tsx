"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Share2 } from "lucide-react";
import ContactInfoModal from "../../clientes/contact-info-modal";
import ShareModal from "@/components/quotations/ShareModal";
import { BOTON, BOTON_SEC, CHIP, FOCO, INICIALES } from "@/modules/quotations/estilos";

interface Client {
    id: string;
    name: string;
    email: string | null;
    contactPhone?: string | null;
    slug: string;
    company?: string | null;
    // Los trae la página (select de page.tsx): el formulario de contacto los necesita para no borrarlos al guardar.
    rut?: string | null;
    address?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    contactRole?: string | null;
    _count: { quotations: number };
    user?: { id: string; name: string | null; email: string | null } | null;
    sharedWith?: {
        permission: string;
        sharedByUserId: string;
        createdAt: string | Date;
    }[];
}

interface Props {
    client: Client;
    currentUserId?: string;
    isSuperAdmin: boolean;
    isSpyMode?: boolean;
}

export default function ClientCard({ client, currentUserId, isSuperAdmin, isSpyMode }: Props) {
    const [showShareModal, setShowShareModal] = useState(false);

    const initials = client.name
        .split(" ")
        .map(w => w[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();

    const isOwner = currentUserId && client.user?.id === currentUserId;
    // Si no es tuyo y no eres superadmin, llegó porque te lo compartieron.
    const sharedBy = !isOwner && !isSuperAdmin ? client.user?.name : null;
    const propuestas = client._count.quotations;

    return (
        <article className="grid w-full gap-4 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-8">
            <div className="flex min-w-0 items-start gap-3">
                <span aria-hidden="true" className={`${INICIALES} size-10 text-sm`}>{initials}</span>
                <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="truncate text-base font-semibold text-[var(--txt)]">
                        <Link href={`/admin/cotizaciones/${client.id}`} className={`rounded-sm transition-colors duration-150 hover:text-[var(--acento)] ${FOCO}`}>{client.name}</Link>
                    </h3>
                    <p className="truncate text-sm text-[var(--mut)]">
                        {client.company && <>{client.company}, </>}<span className="font-mono text-xs">/{client.slug}</span>
                    </p>
                    <p className="text-sm tabular-nums text-[var(--mut)]">{propuestas} propuesta{propuestas === 1 ? "" : "s"}</p>
                    {(sharedBy || isSpyMode || (isSuperAdmin && client.user && !isOwner)) && (
                        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                            {sharedBy && <span className="text-[var(--mut)]">Compartido por {sharedBy}</span>}
                            {isSpyMode && <span className={`${CHIP} bg-amber-500/10 text-amber-400`}>Modo espía</span>}
                            {isSuperAdmin && client.user && !isOwner && (
                                <span className="min-w-0 truncate text-amber-400">
                                    Dueño: <span className="font-medium">{client.user.name || client.user.email}</span>
                                </span>
                            )}
                        </p>
                    )}
                </div>
            </div>

            {/* En ancho, una grilla: así el flex-1 del botón «Contacto» no lo estira; en celular, botones parejos. */}
            <div className="flex flex-wrap items-center gap-2 md:grid md:grid-flow-col md:auto-cols-max">
                <ContactInfoModal client={{
                    id: client.id,
                    name: client.name,
                    email: client.email,
                    contactPhone: client.contactPhone,
                    company: client.company,
                    slug: client.slug,
                    rut: client.rut,
                    address: client.address,
                    contactName: client.contactName,
                    contactEmail: client.contactEmail,
                    contactRole: client.contactRole,
                }} canDelete={isSuperAdmin || !!isOwner} />
                {isOwner && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            setShowShareModal(true);
                        }}
                        className={`${BOTON_SEC} flex-1 md:flex-none`}
                    >
                        <Share2 size={16} aria-hidden="true" />
                        <span>Compartir</span>
                    </button>
                )}
                <Link href={`/admin/cotizaciones/${client.id}`} className={`${BOTON} flex-1 md:flex-none`} aria-label={`Ver las propuestas de ${client.name}`}>
                    Ver propuestas
                    <ChevronRight size={16} aria-hidden="true" />
                </Link>
            </div>

            {isOwner && currentUserId && (
                <ShareModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    client={client}
                    // @ts-expect-error - Prop exists in share modal but interface lagging
                    currentUserId={currentUserId}
                />
            )}
        </article>
    );
}
