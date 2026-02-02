"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Users, FileText, Plus, Search, Eye, Grid, List, Key } from "lucide-react";
import UnifiedQuotationCreation from "./components/UnifiedQuotationCreation";
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
    const [showWizard, setShowWizard] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [showRedeemModal, setShowRedeemModal] = useState(false);
    const [showSpyModal, setShowSpyModal] = useState(false);
    const [spyUserId, setSpyUserId] = useState<string | null>(null);
    const [spyUserName, setSpyUserName] = useState<string>("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // Stats
    const stats = useMemo(() => {
        const totalQuotations = clients.reduce((acc, c) => acc + c._count.quotations, 0);
        return {
            totalClients: clients.length,
            totalQuotations,
            avgPerClient: clients.length > 0 ? (totalQuotations / clients.length).toFixed(1) : 0,
        };
    }, [clients]);

    const handleSpyUserSelect = (userId: string, userName: string) => {
        setSpyUserId(userId || null);
        setSpyUserName(userName);
        if (userId) {
            window.location.href = `/admin/cotizaciones?spyUserId=${userId}`;
        } else {
            window.location.href = "/admin/cotizaciones";
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-xl">
                            <FileText className="text-indigo-400" size={24} />
                        </div>
                        Cotizaciones
                    </h1>
                    <p className="text-slate-400 mt-1">
                        {isSuperAdmin
                            ? "Vista de administrador - todos los clientes"
                            : "Gestiona cotizaciones por cliente"
                        }
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Spy Mode Button - Subtle, only for superadmins */}
                    {isSuperAdmin && (
                        <button
                            onClick={() => setShowSpyModal(true)}
                            className="flex items-center gap-2 text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/10 px-3 py-2 rounded-lg text-sm transition-colors"
                            title="Modo Espía - Ver clientes de otros usuarios"
                        >
                            <Eye size={16} />
                            <span className="hidden md:inline">Espiar</span>
                        </button>
                    )}

                    {/* Search Button */}
                    <button
                        onClick={() => setShowSearchModal(true)}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <Search size={18} />
                        <span className="hidden sm:inline">Buscar</span>
                    </button>

                    {/* View Toggle */}
                    <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
                        >
                            <Grid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
                        >
                            <List size={16} />
                        </button>
                    </div>

                    {/* Clients Link */}
                    <Link
                        href="/admin/clientes"
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <Users size={18} />
                        <span className="hidden sm:inline">Clientes</span>
                    </Link>

                    {/* New Quotation */}
                    <button
                        onClick={() => setShowWizard(true)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-900/20"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Nueva Cotización</span>
                    </button>

                    {/* Redeem Code */}
                    <button
                        onClick={() => setShowRedeemModal(true)}
                        className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-4 py-2 rounded-lg font-medium transition-colors"
                        title="Vincular cliente mediante código"
                    >
                        <Key size={18} />
                        <span className="hidden xl:inline">Vincular Cliente</span>
                    </button>
                </div>
            </div>

            {/* Spy Mode Active Banner */}
            {spyUserId && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-3">
                        <Eye className="text-amber-400" size={20} />
                        <div>
                            <p className="text-sm font-medium text-amber-400">
                                Modo Espía Activo
                            </p>
                            <p className="text-xs text-amber-400/70">
                                Viendo clientes de: {spyUserName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleSpyUserSelect("", "")}
                        className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        Salir
                    </button>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <Users className="text-indigo-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{stats.totalClients}</p>
                            <p className="text-xs text-slate-400">Clientes</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-500/10 rounded-lg">
                            <FileText className="text-teal-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{stats.totalQuotations}</p>
                            <p className="text-xs text-slate-400">Cotizaciones</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <FileText className="text-purple-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{stats.avgPerClient}</p>
                            <p className="text-xs text-slate-400">Promedio/Cliente</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Client Grid */}
            {clients.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Sin clientes</h3>
                    <p className="text-slate-400 mb-6">Crea un cliente o una nueva cotización para comenzar.</p>
                    <div className="flex justify-center gap-3">
                        <Link
                            href="/admin/clientes"
                            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            <Users size={18} />
                            Crear Cliente
                        </Link>
                        <button
                            onClick={() => setShowWizard(true)}
                            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            <Plus size={18} />
                            Nueva Cotización
                        </button>
                    </div>
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clients.map((client) => (
                        <ClientCard
                            key={client.id}
                            client={client}
                            isSuperAdmin={isSuperAdmin}
                            isSpyMode={!!spyUserId}
                            currentUserId={currentUserId}
                        />
                    ))}
                </div>
            ) : (
                // List View
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-800">
                                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Cliente</th>
                                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4 hidden md:table-cell">Email</th>
                                <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Cotizaciones</th>
                                <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {clients.map((client) => (
                                <tr key={client.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-sm">
                                                {client.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{client.name}</p>
                                                <p className="text-xs text-slate-500">/{client.slug}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 hidden md:table-cell">
                                        <span className="text-slate-400">{client.email || "-"}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-sm font-medium">
                                            {client._count.quotations}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/admin/cotizaciones/${client.id}`}
                                            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                                        >
                                            Ver →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modals */}
            {showWizard && (
                <UnifiedQuotationCreation
                    clients={clients}
                    onClose={() => setShowWizard(false)}
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
