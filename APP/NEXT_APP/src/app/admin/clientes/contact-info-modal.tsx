"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import { UserCog, Building2, User, Mail, Phone, MapPin, Briefcase, FileText, Loader2, Save, Trash2 } from "lucide-react";
import { updateClientContactAction, deleteClientAction, UpdateClientContactData } from "../../../modules/admin/clients/actions";
import { formatRut, getRutError } from "@/lib/rut";
import { toast } from "sonner";
import { confirmar } from "@/modules/admin/confirmar/confirmar";
import Ventana from "@/modules/quotations/components/Ventana";
import { BOTON, BOTON_PELIGRO, BOTON_SEC, CAMPO, ERROR_CAMPO, TITULO_SECCION } from "@/modules/quotations/estilos";

interface Client {
    id: string;
    name: string;
    slug: string;
    email?: string | null;
    company?: string | null;
    rut?: string | null;
    address?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    contactRole?: string | null;
}

interface Props {
    client: Client;
    onUpdate?: () => void;
    canDelete?: boolean;
    /** Tras eliminar el cliente (p. ej. desde su ficha, para volver al directorio). Sin esto, se refresca la página. */
    onDeleted?: () => void;
}

interface FormErrors {
    name?: string;
    rut?: string;
    email?: string;
    contactEmail?: string;
}

export default function ContactInfoModal({ client, onUpdate, canDelete, onDeleted }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const uid = useId();
    const [formData, setFormData] = useState<UpdateClientContactData>({
        name: client.name,
        company: client.company || "",
        rut: client.rut || "",
        address: client.address || "",
        contactName: client.contactName || "",
        contactEmail: client.contactEmail || "",
        contactPhone: client.contactPhone || "",
        contactRole: client.contactRole || "",
        email: client.email || "",
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

    const validate = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.name?.trim()) {
            newErrors.name = "El nombre es requerido";
        }

        const rutError = getRutError(formData.rut || "");
        if (rutError) newErrors.rut = rutError;

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Correo no válido";
        }

        if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
            newErrors.contactEmail = "Correo no válido";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatRut(e.target.value);
        setFormData(prev => ({ ...prev, rut: formatted }));
        if (errors.rut) setErrors(prev => ({ ...prev, rut: undefined }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleDelete = async () => {
        if (!(await confirmar({
            titulo: `¿Eliminar a ${client.name}?`,
            detalle: "Sus propuestas también se eliminan. No se puede deshacer.",
            accion: "Eliminar",
            peligro: true,
        }))) return;

        try {
            setLoading(true);
            const res = await deleteClientAction(client.id);
            if (res.success) {
                toast.success("Cliente eliminado");
                setOpen(false);
                if (onDeleted) {
                    onDeleted();
                } else {
                    router.refresh();
                    if (onUpdate) onUpdate();
                }
            } else {
                setErrorGeneral(res.error || "No se pudo eliminar el cliente");
            }
        } catch {
            setErrorGeneral("No se pudo eliminar el cliente");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorGeneral(null);
        if (!validate()) return;

        setLoading(true);
        try {
            const res = await updateClientContactAction(client.id, formData);
            if (res.success) {
                toast.success("Contacto actualizado");
                setOpen(false);
                if (onUpdate) onUpdate();
            } else {
                setErrorGeneral(res.error || "No se pudo guardar");
            }
        } catch {
            setErrorGeneral("No se pudo guardar: revisa la conexión");
        } finally {
            setLoading(false);
        }
    };

    const abrir = () => {
        // Cada vez que se abre parte de lo guardado, sin errores viejos.
        setFormData({
            name: client.name,
            company: client.company || "",
            rut: client.rut || "",
            address: client.address || "",
            contactName: client.contactName || "",
            contactEmail: client.contactEmail || "",
            contactPhone: client.contactPhone || "",
            contactRole: client.contactRole || "",
            email: client.email || "",
        });
        setErrors({});
        setErrorGeneral(null);
        setOpen(true);
    };

    const campo = (
        nombre: keyof UpdateClientContactData,
        etiqueta: React.ReactNode,
        Icono: typeof User,
        extra: { type?: string; placeholder?: string; maxLength: number; error?: string; required?: boolean; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; clase?: string; ancho?: string; autofocus?: boolean },
    ) => (
        <div className={extra.ancho}>
            <label htmlFor={`${uid}-${nombre}`} className="mb-1.5 block text-sm font-medium text-[var(--txt)]">{etiqueta}</label>
            <div className="relative">
                <Icono size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mut)]" />
                <input
                    id={`${uid}-${nombre}`}
                    name={nombre}
                    type={extra.type ?? "text"}
                    value={formData[nombre] ?? ""}
                    onChange={extra.onChange ?? handleChange}
                    placeholder={extra.placeholder}
                    maxLength={extra.maxLength}
                    required={extra.required}
                    aria-invalid={extra.error ? true : undefined}
                    aria-describedby={extra.error ? `${uid}-${nombre}-error` : undefined}
                    className={`${CAMPO} pl-9 ${extra.clase ?? ""}`}
                    data-autofocus={extra.autofocus || undefined}
                />
            </div>
            {extra.error && <p id={`${uid}-${nombre}-error`} className={ERROR_CAMPO}>{extra.error}</p>}
        </div>
    );

    return (
        <>
            <button
                type="button"
                onClick={abrir}
                className={`${BOTON_SEC} flex-1`}
                aria-label={`Editar contacto de ${client.name}`}
            >
                <UserCog size={16} aria-hidden="true" />
                <span>Contacto</span>
            </button>

            {open && (
                <Ventana
                    titulo="Datos de contacto"
                    descripcion={client.name}
                    icono={<UserCog size={18} />}
                    alCerrar={() => setOpen(false)}
                    ancho="max-w-2xl"
                    cuerpo="p-0"
                >
                    {(cerrar) => (
                        <form onSubmit={handleSubmit} className="space-y-8 p-4 sm:p-6">
                            <fieldset className="space-y-4">
                                <legend className={`${TITULO_SECCION} mb-3 flex items-center gap-2`}>
                                    <Building2 size={16} aria-hidden="true" /> Empresa
                                </legend>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {campo("name", <>Nombre <span className="text-red-400" aria-hidden="true">*</span><span className="sr-only">(obligatorio)</span></>, User, { maxLength: 100, error: errors.name, required: true, autofocus: true })}
                                    {campo("company", "Razón social", Building2, { maxLength: 100, placeholder: "Ej.: Servicios SpA" })}
                                    {campo("rut", "RUT", FileText, { maxLength: 12, placeholder: "12.345.678-9", error: errors.rut, onChange: handleRutChange, clase: "font-mono" })}
                                    {campo("email", "Correo para avisos", Mail, { type: "email", maxLength: 254, placeholder: "contacto@empresa.cl", error: errors.email })}
                                    {campo("address", "Dirección", MapPin, { maxLength: 200, placeholder: "Av. Providencia 1234, of. 505", ancho: "md:col-span-2" })}
                                </div>
                            </fieldset>

                            <fieldset className="space-y-4">
                                <legend className={`${TITULO_SECCION} mb-3 flex items-center gap-2`}>
                                    <User size={16} aria-hidden="true" /> Representante o contacto
                                </legend>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {campo("contactName", "Nombre completo", User, { maxLength: 100, placeholder: "Juan Pérez" })}
                                    {campo("contactRole", "Cargo", Briefcase, { maxLength: 100, placeholder: "Gerente general" })}
                                    {campo("contactEmail", "Correo directo", Mail, { type: "email", maxLength: 254, placeholder: "juan@empresa.cl", error: errors.contactEmail })}
                                    {campo("contactPhone", "Teléfono o WhatsApp", Phone, { type: "tel", maxLength: 20, placeholder: "+56 9 1234 5678" })}
                                </div>
                            </fieldset>

                            {canDelete && (
                                <section aria-labelledby={`${uid}-eliminar`} className="flex flex-col justify-between gap-3 border-t border-[var(--linea)] pt-6 sm:flex-row sm:items-center">
                                    <div>
                                        <h3 id={`${uid}-eliminar`} className="text-sm font-semibold text-red-400">Eliminar cliente</h3>
                                        <p className="mt-0.5 text-xs text-[var(--mut)]">Se eliminan el cliente y sus propuestas.</p>
                                    </div>
                                    <button type="button" onClick={handleDelete} disabled={loading} className={BOTON_PELIGRO}>
                                        <Trash2 size={16} aria-hidden="true" />
                                        Eliminar
                                    </button>
                                </section>
                            )}

                            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--linea)] pt-4">
                                {errorGeneral && <p role="alert" className="mr-auto text-sm text-red-400">{errorGeneral}</p>}
                                <button type="button" onClick={cerrar} className={BOTON_SEC}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={loading} className={BOTON}>
                                    {loading ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
                                    Guardar cambios
                                </button>
                            </div>
                        </form>
                    )}
                </Ventana>
            )}
        </>
    );
}
