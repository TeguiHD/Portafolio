"use client";

import { useState, useEffect, useCallback } from "react";
import { getClientsWithSearchAction, deleteClientAction } from "../../../modules/admin/clients/actions";
import { Search, Trash2, User, Key, Plus, FileText, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import ContactInfoModal from "./contact-info-modal";
import CreateClientModal from "../cotizaciones/components/CreateClientModal";

interface Client {
    id: string;
    name: string;
    slug: string;
    email?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    userId: string; // Required for permission check
    _count?: { quotations: number };
}

interface ClientsPageClientProps {
    currentUserId: string;
    isSuperAdmin: boolean;
}

export default function ClientsPageClient({ currentUserId, isSuperAdmin }: ClientsPageClientProps) {
    const [clients, setClients] = useState<Client[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchClients = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        const data = await getClientsWithSearchAction(search);
        setClients(data as Client[]);
        setLoading(false);
    }, [search]);

    useEffect(() => {
        const timeout = setTimeout(() => fetchClients(), 300);
        return () => clearTimeout(timeout);
    }, [fetchClients]);

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este cliente?")) return;
        const res = await deleteClientAction(id);
        if (res.success) {
            toast.success("Cliente eliminado");
            fetchClients(true); // Silent refresh
        } else {
            toast.error(res.error || "Error al eliminar");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <User className="text-indigo-400" />
                    Gestión de Clientes
                </h1>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, slug o email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap px-4"
                    >
                        <Plus size={18} />
                        <span className="hidden md:inline">Nuevo Cliente</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 text-slate-500">Cargando clientes...</div>
            ) : clients.length === 0 ? (
                <div className="text-center py-10 bg-slate-900/50 rounded-xl border border-slate-800">
                    <p className="text-slate-400">No se encontraron clientes.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clients.map(client => (
                        <div key={client.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-indigo-500/30 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold">
                                    {client.name.substring(0, 2).toUpperCase()}
                                </div>
                                <button
                                    onClick={() => handleDelete(client.id)}
                                    className="text-slate-600 hover:text-red-400 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <h3 className="text-lg font-bold text-white mb-1 truncate" title={client.name}>{client.name}</h3>
                            <p className="text-sm text-slate-500 mb-4">{client.email || "Sin email"}</p>

                            <div className="space-y-2 text-sm text-slate-400">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                    <span className="flex items-center gap-2"><LayoutDashboard size={14} /> Slug:</span>
                                    <span className="font-mono text-xs">{client.slug}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2"><Key size={14} /> Cotizaciones:</span>
                                    <span className="bg-slate-800 px-2 py-0.5 rounded text-white text-xs">{client._count?.quotations ?? 0}</span>
                                </div>

                                {client.contactName && (
                                    <div className="flex items-center justify-between text-indigo-300">
                                        <span className="flex items-center gap-2"><User size={14} /> Contacto:</span>
                                        <span className="text-xs truncate max-w-[150px]">{client.contactName}</span>
                                    </div>
                                )}


                            </div>

                            <div className="mt-6 flex gap-2">
                                <ContactInfoModal
                                    client={client}
                                    onUpdate={() => fetchClients(true)}
                                    canDelete={isSuperAdmin || client.userId === currentUserId}
                                />

                                <Link
                                    href={`/admin/cotizaciones/${client.id}`}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-center py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                                    title="Ver Cotizaciones"
                                >
                                    <FileText size={16} />
                                    <span className="hidden lg:inline">Cotizaciones</span>
                                    <span className="inline lg:hidden">Cotiz.</span>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <CreateClientModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    fetchClients(true);
                    setShowCreateModal(false);
                }}
            />
        </div>
    );
}
