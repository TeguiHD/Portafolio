"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Users, Plus, Search, Eye, Key } from "lucide-react";
import dynamic from "next/dynamic";
import { BOTON, BOTON_SEC, BOTON_SUAVE, H1 } from "@/modules/quotations/estilos";
import Cifras from "@/modules/quotations/components/Cifras";

// El asistente (editor, LaTeX, plantillas, chat IA) pesa ~200 KB: se descarga al abrirlo, no con la lista.
const UnifiedQuotationCreation = dynamic(() => import("./components/UnifiedQuotationCreation"), { ssr: false });
import RedeemCodeModal from "./components/RedeemCodeModal";
import ClientCard from "./components/ClientCard";
import ClientsSearchModal from "./components/ClientsSearchModal";
import SpyModeModal from "./components/SpyModeModal";

interface Client {
    id: string;
    name: string;
    email: string | null;
    contactPhone?: string | null;
    company?: string | null;
    slug: string;
    createdAt?: string | Date;
    _count: { quotations: number };
    user?: { id: string; name: string | null; email: string | null } | null;
    sharedWith?: {
        permission: string;
        sharedByUserId: string;
        createdAt: string | Date;
    }[];
}

interface Props {
    clients: Client[];
    isSuperAdmin: boolean;
    currentUserId: string;
}

export default function QuotationsView({ clients, isSuperAdmin, currentUserId }: Props) {
    const router = useRouter();
    const [showWizard, setShowWizard] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [showRedeemModal, setShowRedeemModal] = useState(false);
    const [showSpyModal, setShowSpyModal] = useState(false);
    // El modo espía vive en la URL (?spyUserId=): al recargar o volver atrás, el aviso sigue a la vista.
    const espiado = useSearchParams().get("spyUserId");
    const spyUserId = isSuperAdmin ? espiado : null;
    const [spyUserName, setSpyUserName] = useState<string>("");

    // Stats
    const stats = useMemo(() => {
        const totalQuotations = clients.reduce((acc, c) => acc + c._count.quotations, 0);
        return {
            totalClients: clients.length,
            totalQuotations,
            avgPerClient: clients.length > 0 ? (totalQuotations / clients.length).toFixed(1).replace(".", ",") : "0",
        };
    }, [clients]);

    const handleSpyUserSelect = (userId: string, userName: string) => {
        setSpyUserName(userName);
        router.push(userId ? `/admin/cotizaciones?spyUserId=${userId}` : "/admin/cotizaciones");
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className={H1}>Propuestas</h1>
                    <p className="mt-1 text-[var(--mut)]">
                        {isSuperAdmin ? "Vista de administrador: todos los clientes." : "Tus clientes y las propuestas de cada uno."}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {isSuperAdmin && (
                        <button
                            type="button"
                            onClick={() => setShowSpyModal(true)}
                            className={BOTON_SUAVE}
                            title="Ver los clientes de otro usuario"
                        >
                            <Eye size={16} aria-hidden="true" />
                            <span className="sr-only md:not-sr-only">Modo espía</span>
                        </button>
                    )}

                    <button type="button" onClick={() => setShowSearchModal(true)} className={BOTON_SEC}>
                        <Search size={16} aria-hidden="true" />
                        <span className="sr-only sm:not-sr-only">Buscar</span>
                    </button>

                    <Link href="/admin/clientes" className={BOTON_SEC}>
                        <Users size={16} aria-hidden="true" />
                        <span className="sr-only sm:not-sr-only">Clientes</span>
                    </Link>

                    <button
                        type="button"
                        onClick={() => setShowRedeemModal(true)}
                        className={BOTON_SEC}
                        title="Vincular un cliente que te compartieron con un código"
                    >
                        <Key size={16} aria-hidden="true" />
                        <span className="sr-only xl:not-sr-only">Vincular cliente</span>
                    </button>

                    <button type="button" onClick={() => setShowWizard(true)} className={BOTON}>
                        <Plus size={16} aria-hidden="true" />
                        <span className="sr-only sm:not-sr-only">Nueva propuesta</span>
                    </button>
                </div>
            </header>

            {spyUserId && (
                <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-500/10 px-4 py-3">
                    <p className="flex items-center gap-2 text-sm text-amber-400">
                        <Eye size={16} aria-hidden="true" />
                        <span>
                            <span className="font-semibold">Modo espía.</span> Ves los clientes de {spyUserName || "otro usuario"}.
                        </span>
                    </p>
                    <button type="button" onClick={() => handleSpyUserSelect("", "")} className={BOTON_SEC}>
                        Salir
                    </button>
                </div>
            )}

            <Cifras
                columnas="grid-cols-3"
                cifras={[
                    { nombre: "Clientes", valor: stats.totalClients },
                    { nombre: "Propuestas", valor: stats.totalQuotations },
                    { nombre: "Promedio por cliente", valor: stats.avgPerClient },
                ]}
            />

            {clients.length === 0 ? (
                <div className="border-y border-[var(--linea)] py-12 text-center">
                    <Users className="mx-auto mb-3 text-[var(--mut)]" size={28} aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-[var(--txt)]">Sin clientes</h2>
                    <p className="mx-auto mt-1 max-w-md text-[var(--mut)]">Crea un cliente o una propuesta nueva para empezar.</p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                        <Link href="/admin/clientes" className={BOTON_SEC}>
                            <Users size={16} aria-hidden="true" />
                            Crear cliente
                        </Link>
                        <button type="button" onClick={() => setShowWizard(true)} className={BOTON}>
                            <Plus size={16} aria-hidden="true" />
                            Nueva propuesta
                        </button>
                    </div>
                </div>
            ) : (
                <ul className="border-t border-[var(--linea)]" aria-label="Clientes">
                    {clients.map((client) => (
                        <li key={client.id} className="border-b border-[var(--linea)]">
                            <ClientCard
                                client={client}
                                isSuperAdmin={isSuperAdmin}
                                isSpyMode={!!spyUserId}
                                currentUserId={currentUserId}
                            />
                        </li>
                    ))}
                </ul>
            )}

            {showWizard && (
                <UnifiedQuotationCreation
                    clients={clients}
                    onClose={() => setShowWizard(false)}
                    // Los conteos de la lista se ponen al día; el asistente sigue abierto con el enlace y el código.
                    onSuccess={() => router.refresh()}
                />
            )}

            <RedeemCodeModal
                isOpen={showRedeemModal}
                onClose={() => setShowRedeemModal(false)}
            />

            <ClientsSearchModal
                clients={clients}
                isSuperAdmin={isSuperAdmin}
                isSpyMode={!!spyUserId}
                isOpen={showSearchModal}
                onClose={() => setShowSearchModal(false)}
            />

            {isSuperAdmin && (
                <SpyModeModal
                    isOpen={showSpyModal}
                    onClose={() => setShowSpyModal(false)}
                    onSelectUser={handleSpyUserSelect}
                    currentSpyUserId={spyUserId}
                />
            )}
        </div>
    );
}
