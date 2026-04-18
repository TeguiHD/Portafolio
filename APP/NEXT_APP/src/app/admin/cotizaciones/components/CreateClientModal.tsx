"use client";

import { useState, useTransition } from "react";
import { X, Plus, Loader2, Building2, User, Mail, Phone, FileText, MapPin } from "lucide-react";
import { toast } from "sonner";
import { formatRut, getRutError } from "@/lib/rut";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (clientId: string) => void;
    autoOpen?: boolean;
    initialProjectName?: string;
    clientId?: string;
    clientSlug?: string;
    clientName?: string;
}

interface FormErrors {
    name?: string;
    email?: string;
    rut?: string;
}

export default function CreateClientModal({ isOpen, onClose, onSuccess }: Props) {
    const [isPending, startTransition] = useTransition();
    const [formData, setFormData] = useState({
        name: "",
        company: "",
        representative: "",
        email: "",
        phone: "",
        rut: "",
        address: "",
    });
    const [errors, setErrors] = useState<FormErrors>({});

    const validate = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = "El nombre es requerido";
        }

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Email inválido";
        }

        const rutError = getRutError(formData.rut);
        if (rutError) newErrors.rut = rutError;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatRut(e.target.value);
        setFormData(prev => ({ ...prev, rut: formatted }));
        // Limpiar error al escribir
        if (errors.rut) setErrors(prev => ({ ...prev, rut: undefined }));
    };

    const handleChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
        if (errors[field as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        startTransition(async () => {
            try {
                const res = await fetch("/api/admin/clients", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: formData.name,
                        company: formData.company,
                        rut: formData.rut,
                        address: formData.address,
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
            } catch {
                toast.error("Error al crear cliente");
            }
        });
    };

    const handleClose = () => {
        setFormData({ name: "", company: "", representative: "", email: "", phone: "", rut: "", address: "" });
        setErrors({});
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
                <form onSubmit={handleFormSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                    {/* Nombre - Requerido */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Nombre del Cliente <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                value={formData.name}
                                onChange={handleChange("name")}
                                placeholder="Nombre completo o razón social"
                                maxLength={100}
                                className={`w-full bg-slate-800/50 border rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-500 focus:ring-1 outline-none transition-colors ${
                                    errors.name
                                        ? "border-red-500 focus:ring-red-500"
                                        : "border-slate-700 focus:border-indigo-500 focus:ring-indigo-500"
                                }`}
                                autoFocus
                            />
                        </div>
                        {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
                    </div>

                    {/* Empresa + RUT */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Empresa
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="text"
                                    value={formData.company}
                                    onChange={handleChange("company")}
                                    placeholder="Empresa S.A."
                                    maxLength={100}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                RUT
                            </label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="text"
                                    value={formData.rut}
                                    onChange={handleRutChange}
                                    placeholder="12.345.678-9"
                                    maxLength={12}
                                    className={`w-full bg-slate-800/50 border rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-500 focus:ring-1 outline-none transition-colors font-mono tracking-wide ${
                                        errors.rut
                                            ? "border-red-500 focus:ring-red-500"
                                            : "border-slate-700 focus:border-indigo-500 focus:ring-indigo-500"
                                    }`}
                                />
                            </div>
                            {errors.rut && <p className="text-xs text-red-400 mt-1">{errors.rut}</p>}
                        </div>
                    </div>

                    {/* Representante */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Representante / Contacto
                        </label>
                        <input
                            type="text"
                            value={formData.representative}
                            onChange={handleChange("representative")}
                            placeholder="Nombre del contacto principal"
                            maxLength={100}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                        />
                    </div>

                    {/* Email & Teléfono */}
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
                                    onChange={handleChange("email")}
                                    placeholder="correo@ejemplo.cl"
                                    maxLength={254}
                                    className={`w-full bg-slate-800/50 border rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-500 focus:ring-1 outline-none transition-colors ${
                                        errors.email
                                            ? "border-red-500 focus:ring-red-500"
                                            : "border-slate-700 focus:border-indigo-500 focus:ring-indigo-500"
                                    }`}
                                />
                            </div>
                            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
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
                                    onChange={handleChange("phone")}
                                    placeholder="+56 9 1234 5678"
                                    maxLength={20}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dirección */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Dirección
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                value={formData.address}
                                onChange={handleChange("address")}
                                placeholder="Av. Providencia 1234, Of. 505"
                                maxLength={200}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                            />
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
