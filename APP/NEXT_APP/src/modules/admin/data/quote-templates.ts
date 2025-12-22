export interface QuoteTemplate {
  id: string;
  title: string;
  clientName?: string;
  clientLogo?: string;
  scope: string;
  deliverables: string[];
  timeline: string;
  price: string;
  notes?: string;
  customFields?: { label: string; value: string }[];
  createdAt?: string;
  updatedAt?: string;
}

export const quoteTemplates: QuoteTemplate[] = [
  {
    id: "mvp-fast",
    title: "MVP Fast Track",
    scope: "Discovery + prototipo funcional + deploy inicial",
    deliverables: ["Wireframes", "MVP en producción", "Tracking básico", "Handoff"],
    timeline: "4-6 semanas",
    price: "$8k - $15k",
    notes: "Ideal para startups que necesitan validar rápido",
    createdAt: new Date().toISOString(),
  },
  {
    id: "automation",
    title: "Automatizaciones Revenue",
    scope: "Workflows n8n + integración CRM + WhatsApp",
    deliverables: ["Flujos n8n", "Alertas/monitoreo", "Reporte semanal"],
    timeline: "3-5 semanas",
    price: "$4k - $9k",
    notes: "ROI: 300-500% en 6 meses",
    createdAt: new Date().toISOString(),
  },
  {
    id: "data-bi",
    title: "Datos & BI",
    scope: "Modelado de datos + ETL/ELT + dashboards ejecutivos",
    deliverables: ["Modelo y pipelines", "Dashboard BI", "Doc + capacitación"],
    timeline: "4-8 semanas",
    price: "$6k - $14k",
    notes: "Ahorro estimado: $10k-50k/mes",
    createdAt: new Date().toISOString(),
  },
];
