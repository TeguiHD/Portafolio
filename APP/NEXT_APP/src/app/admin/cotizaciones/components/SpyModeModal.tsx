"use client";

import { useState, useEffect, useTransition } from "react";
import { X, Search, Users, FileText, Eye, Loader2, UserCircle } from "lucide-react";

interface UserWithStats {
    id: string;
    name: string | null;
    email: string;
    role: string;
    clientCount: number;
    quotationCount: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelectUser: (userId: string, userName: string) => void;
    currentSpyUserId?: string | null;
}

export default function SpyModeModal({ isOpen, onClose, onSelectUser, currentSpyUserId }: Props) {
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState<UserWithStats[]>([]);
    const [isPending, startTransition] = useTransition();
    const [isLoading, setIsLoading] = useState(false);

    // Fetch users on mount
    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/spy-users");
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredUsers = users.filter(user => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            user.name?.toLowerCase().includes(term) ||
            user.email.toLowerCase().includes(term)
        );
    });

    const handleSelectUser = (user: UserWithStats) => {
        startTransition(() => {
            onSelectUser(user.id, user.name || user.email);
            onClose();
        });
    };

    const handleClearSpy = () => {
        startTransition(() => {
            onSelectUser("", "");
            onClose();
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl shadow-amber-500/10">
                {/* Header */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-800 bg-gradient-to-r from-amber-500/10 to-transparent shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                            <Eye className="text-amber-400" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Modo Espía</h2>
                            <p className="text-xs text-amber-400/70">Ver clientes de otros usuarios</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Current Spy Status */}
                {currentSpyUserId && (
                    <div className="px-4 md:px-6 pt-4 shrink-0">
                        <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                            <div className="flex items-center gap-2 text-sm">
                                <Eye size={14} className="text-amber-400" />
                                <span className="text-amber-400">Viendo como otro usuario</span>
                            </div>
                            <button
                                onClick={handleClearSpy}
                                disabled={isPending}
                                className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                Dejar de espiar
                            </button>
                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="p-4 md:p-6 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar usuario por nombre o email..."
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 outline-none transition-colors"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Users List */}
                <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-4 md:pb-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <UserCircle className="w-12 h-12 text-slate-600 mb-3" />
                            <p className="text-slate-400">
                                {searchTerm ? "No se encontraron usuarios" : "No hay usuarios disponibles"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredUsers.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => handleSelectUser(user)}
                                    disabled={isPending}
                                    className={`w-full p-4 rounded-xl border transition-all text-left group ${currentSpyUserId === user.id
                                        ? "bg-amber-500/10 border-amber-500/50"
                                        : "bg-slate-800/30 border-slate-800 hover:border-amber-500/30 hover:bg-slate-800/50"
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-medium text-sm shrink-0">
                                                {(user.name || user.email)[0].toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-white truncate">
                                                    {user.name || "Sin nombre"}
                                                </p>
                                                <p className="text-sm text-slate-400 truncate">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="flex items-center gap-4 text-xs">
                                                <span className="flex items-center gap-1.5 text-slate-400">
                                                    <Users size={14} className="text-indigo-400" />
                                                    <span className="font-medium">{user.clientCount}</span>
                                                    <span className="hidden sm:inline">clientes</span>
                                                </span>
                                                <span className="flex items-center gap-1.5 text-slate-400">
                                                    <FileText size={14} className="text-teal-400" />
                                                    <span className="font-medium">{user.quotationCount}</span>
                                                    <span className="hidden sm:inline">cotizaciones</span>
                                                </span>
                                            </div>

                                            {currentSpyUserId === user.id && (
                                                <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded-full">
                                                    Activo
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 md:p-6 border-t border-slate-800 shrink-0">
                    <p className="text-xs text-slate-500 text-center">
                        Selecciona un usuario para ver sus clientes y cotizaciones. Las acciones quedarán registradas en auditoría.
                    </p>
                </div>
            </div>
        </div>
    );
}
