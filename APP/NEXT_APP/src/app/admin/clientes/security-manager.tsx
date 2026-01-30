"use client";

import { useState } from "react";
import { rotateClientCodeAction } from "../../../modules/admin/clients/actions";
import { RefreshCw, Check, X, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function ClientSecurityManager({ clientId, clientName }: { clientId: string, clientName: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [newCode, setNewCode] = useState("");
    const [loading, setLoading] = useState(false);

    const handleUpdate = async () => {
        if (!newCode) return;
        setLoading(true);
        const res = await rotateClientCodeAction(clientId, newCode);
        setLoading(false);

        if (res.success) {
            toast.success("Código de acceso actualizado correctamente");
            setIsOpen(false);
            setNewCode("");
        } else {
            toast.error(res.error);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors mt-2"
            >
                <ShieldAlert size={12} />
                Rotar Código de Acceso
            </button>
        );
    }

    return (
        <div className="mt-3 bg-slate-800/50 p-3 rounded-lg border border-indigo-500/30">
            <p className="text-xs text-slate-300 mb-2 font-semibold">Nuevo Código para {clientName}:</p>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="Ej: Cliente2026!"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none"
                />
                <button
                    onClick={handleUpdate}
                    disabled={loading || !newCode}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white p-1 rounded transition-colors disabled:opacity-50"
                    title="Guardar"
                >
                    {loading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                </button>
                <button
                    onClick={() => setIsOpen(false)}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-300 p-1 rounded transition-colors"
                    title="Cancelar"
                >
                    <X size={14} />
                </button>
            </div>
            <p className="text-[10px] text-orange-400 mt-1 flex items-center gap-1">
                <ShieldAlert size={10} />
                Esto invalidará el código anterior inmediatamente.
            </p>
        </div>
    );
}
