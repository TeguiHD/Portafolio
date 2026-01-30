"use client";

import { QuotationData, ProviderCostItem, ProfessionalFeeItem } from "../../../../modules/quotations/types";
import { Plus, Trash2, Calendar, GripVertical } from "lucide-react";

interface Props {
    data: QuotationData;
    onChange: (data: QuotationData) => void;
}

export default function QuotationForm({ data, onChange }: Props) {

    // Generic handlers
    const handleChange = (field: keyof QuotationData, value: any) => {
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
            <Section title="Información del Proyecto">
                <div className="grid grid-cols-1 gap-4">
                    <Input
                        label="Nombre del Proyecto"
                        value={data.projectName}
                        onChange={v => handleChange("projectName", v)}
                        placeholder="Ej: E-commerce Flores DyD"
                    />
                    <Input
                        label="Descripción Corta"
                        value={data.projectDescription}
                        onChange={v => handleChange("projectDescription", v)}
                        placeholder="Ej: Tienda Online & Gestión de Pedidos"
                    />
                    <TextArea
                        label="Alcance / Propuesta de Valor"
                        value={data.scope}
                        onChange={v => handleChange("scope", v)}
                        placeholder="Describe qué incluye el proyecto en detalle..."
                        rows={6}
                    />
                </div>
            </Section>

            {/* 2. Provider Costs (Gastos) */}
            <Section title="A. Gastos Externos (Hosting, Dominios)">
                <div className="space-y-3">
                    {data.providerCosts.map((item) => (
                        <div key={item.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-3 group">
                            <div className="flex justify-between items-start">
                                <span className="p-1 text-slate-500 cursor-move"><GripVertical size={16} /></span>
                                <button onClick={() => removeProviderCost(item.id)} className="text-slate-500 hover:text-red-400 p-1">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
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
                                <Input
                                    label="Costo"
                                    type="number"
                                    value={item.costMin}
                                    onChange={v => updateProviderCost(item.id, { costMin: parseInt(v) || 0 })}
                                />
                            </div>
                        </div>
                    ))}
                    <Button onClick={addProviderCost} icon={<Plus size={16} />}>Agregar Gasto</Button>
                </div>
            </Section>

            {/* 3. Professional Fees (Honorarios) */}
            <Section title="B. Honorarios Profesionales">
                <div className="space-y-3">
                    {data.professionalFees.map((item) => (
                        <div key={item.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-3">
                            <div className="flex justify-between items-start">
                                <span className="p-1 text-slate-500 cursor-move"><GripVertical size={16} /></span>
                                <button onClick={() => removeProfessionalFee(item.id)} className="text-slate-500 hover:text-red-400 p-1">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <Input
                                    label="Título del Servicio"
                                    value={item.title}
                                    onChange={v => updateProfessionalFee(item.id, { title: v })}
                                />
                                <TextArea
                                    label="Descripción / Entregables"
                                    value={item.description}
                                    onChange={v => updateProfessionalFee(item.id, { description: v })}
                                    rows={2}
                                />
                                <Input
                                    label="Precio (Honorarios)"
                                    type="number"
                                    value={item.price}
                                    onChange={v => updateProfessionalFee(item.id, { price: parseInt(v) || 0 })}
                                />
                            </div>
                        </div>
                    ))}
                    <Button onClick={addProfessionalFee} icon={<Plus size={16} />}>Agregar Honorario</Button>
                </div>
            </Section>

            <Section title="Notas al Pie">
                <Input
                    label="Nota"
                    value={data.footerNote}
                    onChange={v => handleChange("footerNote", v)}
                    placeholder="Información extra..."
                />
            </Section>
        </div>
    );
}

// UI Helpers
function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="border-b border-slate-800 pb-6 last:border-0">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">{title}</h3>
            {children}
        </div>
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
    return (
        <div>
            <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-colors"
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
    return (
        <div>
            <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-colors resize-y"
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
            className="w-full py-2 border border-dashed border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800 transition-all text-sm flex items-center justify-center gap-2"
        >
            {icon}
            {children}
        </button>
    );
}
