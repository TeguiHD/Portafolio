"use client";

import { useId, useState, useTransition } from "react";
import { Plus, Loader2, Building2, User, Mail, Phone, FileText, MapPin } from "lucide-react";
import { toast } from "sonner";
import { formatRut, getRutError } from "@/lib/rut";
import Ventana from "@/modules/quotations/components/Ventana";
import { BOTON, BOTON_SEC, CAMPO, ERROR_CAMPO } from "@/modules/quotations/estilos";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    /** Recibe el cliente creado: quien abrió la ventana puede elegirlo de inmediato (p. ej. el asistente de propuestas). */
    onSuccess: (clientId: string, cliente: { id: string; name: string; slug: string; email: string | null }) => void;
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
    if (!isOpen) return null;
    // Se monta al abrir: el formulario parte vacío cada vez.
    return <Formulario onClose={onClose} onSuccess={onSuccess} />;
}

function Formulario({ onClose, onSuccess }: Pick<Props, "onClose" | "onSuccess">) {
    const [isPending, startTransition] = useTransition();
    const uid = useId();
    const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
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
            newErrors.email = "Correo no válido";
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
        setErrorGeneral(null);
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
                    toast.success("Cliente creado");
                    onSuccess(data.client.id, { id: data.client.id, name: data.client.name, slug: data.client.slug, email: formData.email.trim() || null });
                    handleClose();
                } else {
                    setErrorGeneral(data.error || "No se pudo crear el cliente");
                }
            } catch {
                setErrorGeneral("No se pudo crear el cliente: revisa la conexión");
            }
        });
    };

    const handleClose = () => {
        setFormData({ name: "", company: "", representative: "", email: "", phone: "", rut: "", address: "" });
        setErrors({});
        onClose();
    };

    const campo = (
        nombre: keyof typeof formData,
        etiqueta: React.ReactNode,
        Icono: typeof User | null,
        extra: { type?: string; placeholder?: string; maxLength: number; error?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; clase?: string; autofocus?: boolean },
    ) => (
        <div>
            <label htmlFor={`${uid}-${nombre}`} className="mb-1.5 block text-sm font-medium text-[var(--txt)]">{etiqueta}</label>
            <div className="relative">
                {Icono && <Icono size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mut)]" />}
                <input
                    id={`${uid}-${nombre}`}
                    type={extra.type ?? "text"}
                    value={formData[nombre]}
                    onChange={extra.onChange ?? handleChange(nombre)}
                    placeholder={extra.placeholder}
                    maxLength={extra.maxLength}
                    aria-invalid={extra.error ? true : undefined}
                    aria-describedby={extra.error ? `${uid}-${nombre}-error` : undefined}
                    className={`${CAMPO} ${Icono ? "pl-9" : ""} ${extra.clase ?? ""}`}
                    data-autofocus={extra.autofocus || undefined}
                />
            </div>
            {extra.error && <p id={`${uid}-${nombre}-error`} className={ERROR_CAMPO}>{extra.error}</p>}
        </div>
    );

    return (
        <Ventana
            titulo="Nuevo cliente"
            descripcion="Solo el nombre es obligatorio."
            icono={<User size={18} />}
            alCerrar={handleClose}
        >
            {(cerrar) => (
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    {campo("name", <>Nombre del cliente <span className="text-red-400" aria-hidden="true">*</span><span className="sr-only">(obligatorio)</span></>, User, { maxLength: 100, placeholder: "Nombre completo o razón social", error: errors.name, autofocus: true })}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {campo("company", "Empresa", Building2, { maxLength: 100, placeholder: "Empresa SpA" })}
                        {campo("rut", "RUT", FileText, { maxLength: 12, placeholder: "12.345.678-9", error: errors.rut, onChange: handleRutChange, clase: "font-mono" })}
                    </div>

                    {campo("representative", "Representante o contacto", null, { maxLength: 100, placeholder: "Nombre del contacto principal" })}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {campo("email", "Correo", Mail, { type: "email", maxLength: 254, placeholder: "correo@ejemplo.cl", error: errors.email })}
                        {campo("phone", "Teléfono", Phone, { type: "tel", maxLength: 20, placeholder: "+56 9 1234 5678" })}
                    </div>

                    {campo("address", "Dirección", MapPin, { maxLength: 200, placeholder: "Av. Providencia 1234, of. 505" })}

                    {errorGeneral && <p role="alert" className="text-sm text-red-400">{errorGeneral}</p>}

                    <div className="flex gap-2 border-t border-[var(--linea)] pt-4">
                        <button type="button" onClick={cerrar} disabled={isPending} className={`${BOTON_SEC} flex-1`}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={isPending} className={`${BOTON} flex-1`}>
                            {isPending ? (
                                <>
                                    <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                    Creando…
                                </>
                            ) : (
                                <>
                                    <Plus size={16} aria-hidden="true" />
                                    Crear cliente
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}
        </Ventana>
    );
}
