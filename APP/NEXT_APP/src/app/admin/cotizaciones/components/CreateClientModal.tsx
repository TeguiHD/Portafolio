"use client";

import { useState, useTransition } from "react";
import { X, Plus, Loader2, Building2, User, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { createClientAction } from "../../../../modules/admin/clients/actions";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (clientId: string) => void;
    autoOpen?: boolean; // Keep for compatibility if used elsewhere
    initialProjectName?: string; // Keep for compatibility
    clientId?: string; // Keep for compatibility
    clientSlug?: string; // Keep for compatibility
    clientName?: string; // Keep for compatibility
}

export default function CreateClientModal({ isOpen, onClose, onSuccess }: Props) {
    const [isPending, startTransition] = useTransition();
    const [formData, setFormData] = useState({
        name: "",
        company: "",
        representative: "",
        email: "",
        phone: "",
    });

    // Reset form when opening
    // useEffect(() => { ... }, [isOpen]); // Optional, depends on UX preference

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error("El nombre es requerido");
            return;
        }

        startTransition(async () => {
            try {
                // Use the server action directly
                const res = await createClientAction({
                    name: formData.name,
                    company: formData.company,
                    contactName: formData.representative,
                    contactEmail: formData.email,
                    contactPhone: formData.phone,
                    userId: "AUTO_DETECT", // The action should handle this from session or context, but looking at the action signature it expects userId.
                    // Wait, the action expects userId. The fetch endpoint likely added it from session. 
                    // Let's check the action signature again. 
                    // It requires userId: string.
                    // Since this is a client component, I might not have the userId easily without passing it down or handling it in the action via `auth()`.
                    // Let's stick to the fetch implementation which likely hits the API route that handles auth.
                } as any);

                // REVERTING TO FETCH for safety regarding userId, but improving error handling.
                // Actually, let's look at the api route to be sure.
            } catch (error) {
                console.error(error);
            }
        });
    };

    // ...
    // To avoid breaking the existing logic without checking api/admin/clients/route.ts,
    // I will optimize the UI but keep the logic mostly similar, just cleaner.

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error("El nombre es requerido");
            return;
        }

        startTransition(async () => {
            try {
                const res = await fetch("/api/admin/clients", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: formData.name,
                        company: formData.company,
                        contactName: formData.representative,
                        contactEmail: formData.email,
                        contactPhone: formData.phone,
                    }),
                });

                const data = await res.json();

                if (res.ok && data.client) {
                    toast.success("Cliente creado exitosamente");
                    onSuccess(data.client.id);
                    handleClose();
                } else {
                    toast.error(data.error || "Error al crear cliente");
                }
            } catch (error) {
                console.error("Error creating client:", error);
                toast.error("Error al crear cliente");
            }
        });
    };

    const handleClose = () => {
        setFormData({
            name: "",
            company: "",
            representative: "",
            email: "",
            phone: "",
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <User className="text-indigo-400" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Nuevo Cliente</h2>
                            <p className="text-xs text-slate-400">Completa la información del cliente</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
                    {/* Name - Required */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Nombre del Cliente *
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Nombre completo o razón social"
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                                autoFocus
                                required
                            />
                        </div>
                    </div>

                    {/* Company */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Nombre de la Empresa
                        </label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                value={formData.company}
                                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                                placeholder="Empresa S.A."
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* Representative */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Representante
                        </label>
                        <input
                            type="text"
                            value={formData.representative}
                            onChange={(e) => setFormData(prev => ({ ...prev, representative: e.target.value }))}
                            placeholder="Nombre del contacto principal"
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                        />
                    </div>

                    {/* Email & Phone Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="correo@ejemplo.cl"
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Teléfono
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="+56 9 1234 5678"
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-slate-800">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isPending}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creando...
                                </>
                            ) : (
                                <>
                                    <Plus size={18} />
                                    Crear Cliente
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
