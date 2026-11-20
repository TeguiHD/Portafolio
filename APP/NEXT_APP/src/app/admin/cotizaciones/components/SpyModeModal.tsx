"use client";

import { useState, useEffect, useTransition } from "react";
import { Search, Users, FileText, Eye, Loader2, UserCircle } from "lucide-react";
import Ventana from "@/modules/quotations/components/Ventana";
import { BOTON_SEC, CAMPO, CHIP, FOCO, SOBRE } from "@/modules/quotations/estilos";

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
        <Ventana
            titulo="Modo espía"
            descripcion="Mira los clientes y propuestas de otro usuario. Queda registrado en la auditoría."
            icono={<Eye size={18} />}
            alCerrar={onClose}
            ancho="max-w-2xl"
            cuerpo="p-0 flex flex-col"
        >
            {currentSpyUserId && (
                <div className="shrink-0 px-4 pt-4 sm:px-6">
                    <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-500/10 px-4 py-3">
                        <p className="flex items-center gap-2 text-sm text-amber-400">
                            <Eye size={16} aria-hidden="true" /> Estás viendo como otro usuario.
                        </p>
                        <button type="button" onClick={handleClearSpy} disabled={isPending} className={BOTON_SEC}>
                            Dejar de espiar
                        </button>
                    </div>
                </div>
            )}

            <div className="shrink-0 p-4 sm:px-6">
                <label htmlFor="buscar-usuario-espia" className="sr-only">Buscar usuario por nombre o correo</label>
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mut)]" size={16} aria-hidden="true" />
                    <input
                        id="buscar-usuario-espia"
                        type="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Nombre o correo"
                        className={`${CAMPO} pl-9`}
                        data-autofocus
                    />
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
                {isLoading ? (
                    <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--mut)]">
                        <Loader2 className="animate-spin motion-reduce:animate-none" size={18} aria-hidden="true" />
                        Cargando usuarios…
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="py-12 text-center">
                        <UserCircle className="mx-auto mb-3 text-[var(--mut)]" size={28} aria-hidden="true" />
                        <p className="text-[var(--mut)]">
                            {searchTerm ? "Ningún usuario coincide." : "No hay usuarios disponibles."}
                        </p>
                    </div>
                ) : (
                    <ul className="border-t border-[var(--linea)]">
                        {filteredUsers.map((user) => {
                            const activo = currentSpyUserId === user.id;
                            return (
                                <li key={user.id} className="border-b border-[var(--linea)]">
                                    <button
                                        type="button"
                                        onClick={() => handleSelectUser(user)}
                                        disabled={isPending}
                                        aria-current={activo ? "true" : undefined}
                                        className={`flex w-full items-center justify-between gap-3 px-2 py-3 text-left transition-colors duration-150 disabled:opacity-50 ${FOCO} ${activo ? "bg-amber-500/10" : SOBRE}`}
                                    >
                                        <span className="flex min-w-0 items-center gap-3">
                                            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--txt)_8%,transparent)] text-sm font-medium text-[var(--txt)]">
                                                {(user.name || user.email)[0].toUpperCase()}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block truncate font-medium text-[var(--txt)]">{user.name || "Sin nombre"}</span>
                                                <span className="block truncate text-sm text-[var(--mut)]">{user.email}</span>
                                            </span>
                                        </span>

                                        <span className="flex shrink-0 items-center gap-3 text-xs text-[var(--mut)]">
                                            <span className="flex items-center gap-1 tabular-nums">
                                                <Users size={14} aria-hidden="true" />
                                                {user.clientCount}
                                                <span className="sr-only sm:not-sr-only">clientes</span>
                                            </span>
                                            <span className="flex items-center gap-1 tabular-nums">
                                                <FileText size={14} aria-hidden="true" />
                                                {user.quotationCount}
                                                <span className="sr-only sm:not-sr-only">propuestas</span>
                                            </span>
                                            {activo && <span className={`${CHIP} bg-amber-500/10 text-amber-400`}>Activo</span>}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </Ventana>
    );
}
