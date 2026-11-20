"use client";

import { useState, useEffect, useCallback, useId } from "react";
import { ArrowRight, User, Search, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Dialogo, cls } from "./dialogo";

interface UserTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceUser: {
        id: string;
        name: string | null;
        email: string;
        _count?: { quotations: number };
    } | null;
    onTransferComplete: () => void;
}

interface TargetUser {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
}

/** Lo que trae GET /api/admin/users y se usa aquí. */
type UsuarioApi = TargetUser & { isActive: boolean; deletionStatus?: string };

export function UserTransferModal({ isOpen, onClose, sourceUser, onTransferComplete }: UserTransferModalProps) {
    const [step, setStep] = useState<"select_target" | "confirm">("select_target");
    const [targetUsers, setTargetUsers] = useState<TargetUser[]>([]);
    const [selectedTarget, setSelectedTarget] = useState<TargetUser | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [transferring, setTransferring] = useState(false);
    // No hay <Toaster> montado en el panel: los errores también se muestran aquí.
    const [aviso, setAviso] = useState<string | null>(null);
    const id = useId();

    const fetchTargetUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/users");
            const data: { users?: UsuarioApi[] } = await res.json();
            if (data.users) {
                // Sin el usuario de origen ni cuentas inactivas o eliminadas (se filtra aquí: la API no lo hace).
                const validTargets = data.users.filter((u) =>
                    u.id !== sourceUser?.id && u.isActive && u.deletionStatus !== "DELETED"
                );
                setTargetUsers(validTargets.map((u) => ({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    avatar: u.avatar
                })));
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Error al cargar usuarios destino");
            setAviso("No se pudieron cargar los usuarios de destino.");
        } finally {
            setLoading(false);
        }
    }, [sourceUser?.id]);

    useEffect(() => {
        if (isOpen) {
            setStep("select_target");
            setSelectedTarget(null);
            setSearchQuery("");
            setAviso(null);
            fetchTargetUsers();
        }
    }, [isOpen, fetchTargetUsers]);

    const filteredTargets = targetUsers.filter(user =>
    (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleTransfer = async () => {
        if (!sourceUser || !selectedTarget) return;

        setTransferring(true);
        setAviso(null);
        try {
            const res = await fetch("/api/admin/users/transfer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sourceUserId: sourceUser.id,
                    targetUserId: selectedTarget.id,
                    mode: "ALL_CLIENTS"
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            toast.success("Transferencia exitosa");
            onTransferComplete();
            onClose();
        } catch (error) {
            const texto = error instanceof Error && error.message ? error.message : "Error en la transferencia";
            toast.error(texto);
            setAviso(texto);
        } finally {
            setTransferring(false);
        }
    };

    const abierto = isOpen && !!sourceUser;

    return (
        <Dialogo
            abierto={abierto}
            alCerrar={onClose}
            titulo="Transferir datos"
            subtitulo={sourceUser ? `Desde ${sourceUser.name || sourceUser.email}` : undefined}
            ancho="max-w-lg"
        >
            {sourceUser ? (
                step === "select_target" ? (
                    <div className="space-y-4">
                        <p className="text-sm text-[var(--mut)]">Elige quién recibirá todos sus clientes y cotizaciones.</p>

                        <div>
                            <label htmlFor={`${id}-q`} className="sr-only">Buscar usuario de destino</label>
                            <div className="relative">
                                <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mut)]" />
                                <input
                                    id={`${id}-q`}
                                    type="search"
                                    placeholder="Buscar usuario de destino"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`${cls.campo} pl-9`}
                                />
                            </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto overscroll-contain border-y border-[var(--linea)]" aria-busy={loading}>
                            {loading ? (
                                <p className="py-4 text-center text-sm text-[var(--mut)]" role="status">Cargando usuarios…</p>
                            ) : filteredTargets.length === 0 ? (
                                <p className="py-4 text-center text-sm text-[var(--mut)]">No hay usuarios activos que coincidan.</p>
                            ) : (
                                <ul aria-label="Usuarios de destino">
                                    {filteredTargets.map(user => {
                                        const elegido = selectedTarget?.id === user.id;
                                        return (
                                            <li key={user.id} className="border-b border-[var(--linea)] last:border-b-0">
                                                <button
                                                    type="button"
                                                    aria-pressed={elegido}
                                                    onClick={() => setSelectedTarget(user)}
                                                    className={`flex min-h-11 w-full items-center gap-3 px-2 py-2.5 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--acento)] motion-reduce:transition-none ${elegido
                                                        ? "bg-[color-mix(in_srgb,var(--acento)_10%,transparent)]"
                                                        : "hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)]"}`}
                                                >
                                                    <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--fondo-2)] text-[var(--mut)]">
                                                        {user.avatar ? (
                                                            <img src={user.avatar} alt="" className="size-full object-cover" />
                                                        ) : (
                                                            <User size={14} aria-hidden="true" />
                                                        )}
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate font-medium text-[var(--txt)]">{user.name || "Sin nombre"}</span>
                                                        <span className="block truncate text-xs text-[var(--mut)]">{user.email}</span>
                                                    </span>
                                                    {elegido && <Check size={16} className="shrink-0 text-[var(--acento)]" aria-hidden="true" />}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {aviso && <p role="alert" className="text-sm text-red-400">{aviso}</p>}

                        <button
                            type="button"
                            onClick={() => setStep("confirm")}
                            disabled={!selectedTarget}
                            className={`${cls.principal} w-full`}
                        >
                            Continuar
                        </button>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <p className="flex flex-wrap items-center justify-center gap-3 text-lg font-semibold">
                            <span className="text-[var(--mut)]">{sourceUser.name?.split(" ")[0] || sourceUser.email}</span>
                            <ArrowRight size={18} className="text-[var(--acento)]" aria-hidden="true" />
                            <span className="sr-only">pasa a</span>
                            <span className="text-[var(--acento)]">{selectedTarget?.name?.split(" ")[0] || selectedTarget?.email}</span>
                        </p>

                        <div>
                            <h3 className="mb-2 text-[15px] font-semibold text-[var(--mut)]">Antes de confirmar</h3>
                            <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--txt)] marker:text-amber-400">
                                <li>Se transfieren todos los clientes y cotizaciones.</li>
                                <li>El usuario de origen pierde el acceso a esos datos.</li>
                                <li>Queda anotado en el registro de auditoría.</li>
                            </ul>
                        </div>

                        {aviso && <p role="alert" className="text-sm text-red-400">{aviso}</p>}

                        <div className="flex flex-col-reverse gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => setStep("select_target")}
                                className={`${cls.secundario} flex-1`}
                            >
                                Atrás
                            </button>
                            <button
                                type="button"
                                onClick={handleTransfer}
                                disabled={transferring}
                                className={`${cls.principal} flex-1`}
                            >
                                {transferring ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                        Transfiriendo…
                                    </>
                                ) : (
                                    "Confirmar transferencia"
                                )}
                            </button>
                        </div>
                    </div>
                )
            ) : null}
        </Dialogo>
    );
}
