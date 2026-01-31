"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { UserCog, Building2, User, Mail, Phone, MapPin, Briefcase, FileText, Loader2, Save, X } from "lucide-react";
import { updateClientContactAction, UpdateClientContactData } from "../../../modules/admin/clients/actions";
import { toast } from "sonner";

interface Client {
    id: string;
    name: string;
    slug: string;
    email?: string;
    company?: string;
    rut?: string;
    address?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactRole?: string;
}

interface Props {
    client: Client;
    onUpdate?: () => void;
}

export default function ContactInfoModal({ client, onUpdate }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<UpdateClientContactData>({
        name: client.name,
        company: client.company || "",
        rut: client.rut || "",
        address: client.address || "",
        contactName: client.contactName || "",
        contactEmail: client.contactEmail || "",
        contactPhone: client.contactPhone || "",
        contactRole: client.contactRole || "",
        email: client.email || "", // Legacy/System email
    });

    const modalRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
            document.body.style.overflow = "hidden"; // Prevent scrolling
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.body.style.overflow = "unset";
        };
    }, [open]);

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        if (open) window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await updateClientContactAction(client.id, formData);
            if (res.success) {
                toast.success("Información actualizada correctamente");
                setOpen(false);
                if (onUpdate) onUpdate();
            } else {
                toast.error(res.error || "Error al actualizar");
            }
        } catch {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    // Portal needs to be mounted on client only
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-center py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                title="Editar información de contacto"
            >
                <UserCog size={16} className="text-indigo-400" />
                <span className="hidden md:inline">Contacto</span>
            </button>
        );
    }

    if (!mounted) return null;

    // Use Portal to escape overflow:hidden of parent containers
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                ref={modalRef}
                className="bg-slate-900 border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
            >
                <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 p-4 flex justify-between items-center z-10">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                        <UserCog className="text-indigo-500" />
                        Información de Contacto
                    </h2>
                    <button
                        onClick={() => setOpen(false)}
                        className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-lg"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Empresa */}
                    <div className="space-y-4">
                        <h3 className="text-sm uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2 border-b border-slate-800 pb-2">
                            <Building2 size={16} /> Datos de la Empresa
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Nombre (Sistema)</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
                                    <input
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder:text-slate-600"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Razón Social</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
                                    <input
                                        name="company"
                                        value={formData.company}
                                        onChange={handleChange}
                                        placeholder="Ej: Servicios SpA"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">RUT</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
                                    <input
                                        name="rut"
                                        value={formData.rut}
                                        onChange={handleChange}
                                        placeholder="76.xxx.xxx-k"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Email Sistema (Notificaciones)</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
                                    <input
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="contacto@empresa.com"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs text-slate-400 font-medium">Dirección</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
                                    <input
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="Av. Providencia 1234, Of. 505"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder:text-slate-600"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Representante */}
                    <div className="space-y-4">
                        <h3 className="text-sm uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2 border-b border-slate-800 pb-2">
                            <User size={16} /> Representante / Contacto
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Nombre Completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
                                    <input
                                        name="contactName"
                                        value={formData.contactName}
                                        onChange={handleChange}
                                        placeholder="Juan Pérez"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Cargo / Rol</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
                                    <input
                                        name="contactRole"
                                        value={formData.contactRole}
                                        onChange={handleChange}
                                        placeholder="Gerente General"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Email Directo</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
                                    <input
                                        name="contactEmail"
                                        value={formData.contactEmail}
                                        onChange={handleChange}
                                        placeholder="juan@empresa.com"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Teléfono / WhatsApp</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
                                    <input
                                        name="contactPhone"
                                        value={formData.contactPhone}
                                        onChange={handleChange}
                                        placeholder="+56 9 1234 5678"
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder:text-slate-600"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
