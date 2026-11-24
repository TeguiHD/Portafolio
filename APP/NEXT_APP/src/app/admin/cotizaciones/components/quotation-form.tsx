"use client";

import { CampoNumero } from "@/components/ui/CampoNumero";
import { useId } from "react";
import { QuotationData, ProviderCostItem, ProfessionalFeeItem } from "../../../../modules/quotations/types";
import { Plus, Trash2 } from "lucide-react";
import { AREA, BOTON_ICONO, CAMPO, FOCO, SOBRE, TITULO_SECCION } from "@/modules/quotations/estilos";

interface Props {
    data: QuotationData;
    onChange: (data: QuotationData) => void;
}

export default function QuotationForm({ data, onChange }: Props) {

    // Generic handlers
    const handleChange = <K extends keyof QuotationData>(field: K, value: QuotationData[K]) => {
        onChange({ ...data, [field]: value });
    };

    // Provider Costs Handlers
    const addProviderCost = () => {
        const newItem: ProviderCostItem = {
            id: crypto.randomUUID(),
            name: "Nuevo Servicio",
            provider: "Proveedor Recomendado",
            costMin: 0
        };
        handleChange("providerCosts", [...data.providerCosts, newItem]);
    };

    const updateProviderCost = (id: string, updates: Partial<ProviderCostItem>) => {
        const newItems = data.providerCosts.map(item =>
            item.id === id ? { ...item, ...updates } : item
        );
        handleChange("providerCosts", newItems);
    };

    const removeProviderCost = (id: string) => {
        handleChange("providerCosts", data.providerCosts.filter(item => item.id !== id));
    };

    // Professional Fees Handlers
    const addProfessionalFee = () => {
        const newItem: ProfessionalFeeItem = {
            id: crypto.randomUUID(),
            title: "Nuevo Servicio",
            description: "Descripción del entregable",
            price: 0
        };
        handleChange("professionalFees", [...data.professionalFees, newItem]);
    };

    const updateProfessionalFee = (id: string, updates: Partial<ProfessionalFeeItem>) => {
        const newItems = data.professionalFees.map(item =>
            item.id === id ? { ...item, ...updates } : item
        );
        handleChange("professionalFees", newItems);
    };

    const removeProfessionalFee = (id: string) => {
        handleChange("professionalFees", data.professionalFees.filter(item => item.id !== id));
    };

    return (
        <div className="space-y-8 p-1">

            {/* 1. Project Info */}
            <Section title="Proyecto">
                <div className="grid grid-cols-1 gap-4">
                    <Input
                        label="Nombre del proyecto"
                        value={data.projectName}
                        onChange={v => handleChange("projectName", v)}
                        placeholder="Ej.: Tienda en línea de flores"
                    />
                    <Input
                        label="Descripción corta"
                        value={data.projectDescription}
                        onChange={v => handleChange("projectDescription", v)}
                        placeholder="Ej.: Tienda en línea y gestión de pedidos"
                    />
                    <TextArea
                        label="Alcance"
                        value={data.scope}
                        onChange={v => handleChange("scope", v)}
                        placeholder="Qué incluye el proyecto, en detalle"
                        rows={6}
                    />
                </div>
            </Section>

            {/* 2. Provider Costs (Gastos) */}
            <Section title="Gastos externos (hosting, dominios)">
                <div className="space-y-3">
                    {data.providerCosts.map((item, i) => (
                        <div key={item.id} role="group" aria-labelledby={`gasto-${item.id}`} className="rounded-lg border border-[var(--linea)] p-4">
                            <div className="mb-2 flex items-center justify-between">
                                <p id={`gasto-${item.id}`} className="text-sm font-medium text-[var(--mut)]">Gasto {i + 1}</p>
                                <button type="button" onClick={() => removeProviderCost(item.id)} aria-label={`Quitar el gasto ${i + 1}`} className={`${BOTON_ICONO} -mr-2 -mt-2 hover:text-red-400`}>
                                    <Trash2 size={16} aria-hidden="true" />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Input
                                    label="Concepto"
                                    value={item.name}
                                    onChange={v => updateProviderCost(item.id, { name: v })}
                                />
                                <Input
                                    label="Proveedor"
                                    value={item.provider}
                                    onChange={v => updateProviderCost(item.id, { provider: v })}
                                />
                                <InputMonto
                                    label="Costo (CLP)"
                                    valor={item.costMin || null}
                                    alCambiar={n => updateProviderCost(item.id, { costMin: n ?? 0 })}
                                />
                            </div>
                        </div>
                    ))}
                    <Button onClick={addProviderCost} icon={<Plus size={16} aria-hidden="true" />}>Agregar gasto</Button>
                </div>
            </Section>

            {/* 3. Professional Fees (Honorarios) */}
            <Section title="Honorarios">
                <div className="space-y-3">
                    {data.professionalFees.map((item, i) => (
                        <div key={item.id} role="group" aria-labelledby={`servicio-${item.id}`} className="rounded-lg border border-[var(--linea)] p-4">
                            <div className="mb-2 flex items-center justify-between">
                                <p id={`servicio-${item.id}`} className="text-sm font-medium text-[var(--mut)]">Servicio {i + 1}</p>
                                <button type="button" onClick={() => removeProfessionalFee(item.id)} aria-label={`Quitar el servicio ${i + 1}`} className={`${BOTON_ICONO} -mr-2 -mt-2 hover:text-red-400`}>
                                    <Trash2 size={16} aria-hidden="true" />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <Input
                                    label="Nombre del servicio"
                                    value={item.title}
                                    onChange={v => updateProfessionalFee(item.id, { title: v })}
                                />
                                <TextArea
                                    label="Descripción y entregables"
                                    value={item.description}
                                    onChange={v => updateProfessionalFee(item.id, { description: v })}
                                    rows={2}
                                />
                                <InputMonto
                                    label="Precio (CLP)"
                                    valor={item.price || null}
                                    alCambiar={n => updateProfessionalFee(item.id, { price: n ?? 0 })}
                                />
                            </div>
                        </div>
                    ))}
                    <Button onClick={addProfessionalFee} icon={<Plus size={16} aria-hidden="true" />}>Agregar servicio</Button>
                </div>
            </Section>

            <Section title="Nota al pie">
                <Input
                    label="Nota"
                    value={data.footerNote}
                    onChange={v => handleChange("footerNote", v)}
                    placeholder="Información extra"
                />
            </Section>
        </div>
    );
}

// UI Helpers
function Section({ title, children }: { title: string; children: React.ReactNode }) {
    const id = useId();
    return (
        <section aria-labelledby={id} className="border-b border-[var(--linea)] pb-6 last:border-0">
            <h3 id={id} className={`${TITULO_SECCION} mb-4`}>{title}</h3>
            {children}
        </section>
    );
}

interface InputProps {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
}

function Input({ label, value, onChange, placeholder, type = "text" }: InputProps) {
    const id = useId();
    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--txt)]">{label}</label>
            <input
                id={id}
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={`${CAMPO} ${type === "number" ? "tabular-nums" : ""}`}
                onWheel={(e) => e.currentTarget.blur()}
            />
        </div>
    );
}

interface TextAreaProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }: TextAreaProps) {
    const id = useId();
    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--txt)]">{label}</label>
            <textarea
                id={id}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className={AREA}
            />
        </div>
    );
}

interface ButtonProps {
    onClick: () => void;
    children: React.ReactNode;
    icon?: React.ReactNode;
}

function Button({ onClick, children, icon }: ButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--linea-2)] text-sm text-[var(--mut)] transition-colors duration-150 hover:text-[var(--txt)] md:min-h-10 ${SOBRE} ${FOCO}`}
        >
            {icon}
            {children}
        </button>
    );
}

/** Monto en pesos: con los puntos de miles mientras se escribe (antes era type=number, sin puntos). */
function InputMonto({ label, valor, alCambiar }: { label: string; valor: number | null; alCambiar: (n: number | null) => void }) {
    const id = useId();
    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--txt)]">{label}</label>
            <CampoNumero id={id} valor={valor} alCambiar={alCambiar} placeholder="0" className={`${CAMPO} tabular-nums`} />
        </div>
    );
}
