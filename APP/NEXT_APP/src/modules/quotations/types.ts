/**
 * Quotation Types
 * 
 * Central type definitions for quotation-related components
 */

// Provider Cost Item
export interface ProviderCostItem {
    id: string;
    name: string;      // Used in components (was concept)
    provider: string;  // Used in components (was details)
    providerDetail?: string;
    badge?: string;
    costMin: number;
    costMax?: number;
    isHighlighted?: boolean;
    isRecurring?: boolean;
    period?: "monthly" | "yearly";
}

// Professional Fee Item
export interface ProfessionalFeeItem {
    id: string;
    title: string;
    description: string;
    price: number;
}

// Quotation Item (flexible for different usage patterns)
export interface QuotationItem {
    id: string;
    title?: string;           // Optional for compatibility
    description: string;
    deliverables?: string[];  // Optional for compatibility
    quantity?: number;        // Optional for AI-generated items
    unitPrice?: number;       // Optional for AI-generated items
    price?: number;           // Optional, often total or flat price
    total?: number;           // Computed line total (quantity * unitPrice)
}

// Commercial Conditions
export interface CommercialConditions {
    deadline: string;
    payments: string;
    revisions: string;   // Added for compatibility
    included: string[];
    excluded: string[];
}

// Warranty & Delivery
export interface WarrantyDelivery {
    warranty: string;
    delivery: string;
    support: string;
    training: string;    // Added for compatibility
    content: string;     // Added for compatibility
}

// Full Quotation Data
export interface QuotationData {
    // Core fields
    clientName: string;
    clientEmail: string;
    projectName: string;
    projectDescription: string;
    validDays: number;
    scope: string;

    // Arrays
    providerCosts: ProviderCostItem[];
    professionalFees: ProfessionalFeeItem[];
    items?: QuotationItem[]; // Legacy field

    // Complex objects
    commercialConditions: CommercialConditions;
    warrantyDelivery: WarrantyDelivery;

    // Footer/Notes
    footerNote: string;
    notes?: string;      // Legacy alias for footerNote

    // Legacy/Optional fields found in components
    folio?: string;
    date?: string;
    timeline?: string;      // Legacy alias for commercialConditions.deadline
    paymentTerms?: string;  // Legacy alias for commercialConditions.payments
}

// Draft quotation (simplified for finalization step)
export interface QuotationDraft {
    folio?: string;
    clientName: string;
    projectName: string;
    items: QuotationItem[];
    subtotal?: number;
    total: number;
    htmlContent?: string;
}

// Default values
export const defaultCommercialConditions: CommercialConditions = {
    deadline: "4-6 semanas",
    payments: "50% inicio, 50% entrega",
    revisions: "2 rondas incluidas",
    included: [
        "Reuniones de seguimiento semanales",
        "Revisiones y ajustes dentro del alcance",
        "Entrega de código fuente y assets"
    ],
    excluded: [
        "Contenido (textos, imágenes, logos)",
        "Hosting y dominio",
        "Mantenimiento post-entrega"
    ]
};

export const defaultWarrantyDelivery: WarrantyDelivery = {
    warranty: "30 días de garantía por bugs",
    delivery: "Entrega progresiva con demos",
    support: "Soporte técnico incluido durante desarrollo",
    training: "Sesión online de uso",
    content: "A cargo del cliente"
};

export const createInitialQuotationData = (): QuotationData => ({
    clientName: "",
    clientEmail: "",
    projectName: "",
    projectDescription: "",
    validDays: 15,
    scope: "",
    providerCosts: [],
    professionalFees: [],
    commercialConditions: defaultCommercialConditions,
    warrantyDelivery: defaultWarrantyDelivery,
    footerNote: "",
    items: [],
    // Initialize legacy fields with empty/defaults if needed, though usually optional
    folio: "NUEVO",
    date: new Date().toISOString(),
    timeline: "",
    paymentTerms: ""
});
