export interface Service {
  id: string;
  title: string;
  description: string;
  badge: string;
  deliverables: string[];
  timeline: string;
  price: string;
  roi: string;
  caseStudy?: string;
  featured?: boolean;
}

export const services: Service[] = [
  {
    id: "transformation",
    title: "Transformación Digital Completa",
    description:
      "End-to-end: estrategia, arquitectura, desarrollo y despliegue. Para empresas que buscan modernización completa con ROI medible.",
    badge: "Premium",
    deliverables: [
      "Arquitectura cloud-native",
      "Migración de datos segura",
      "Dashboards ejecutivos",
      "Capacitación del equipo",
      "Soporte 6 meses",
    ],
    timeline: "12-16 semanas",
    price: "$25k - $50k",
    roi: "ROI: 200-400% en 12 meses",
    caseStudy: "SLEP - Gobierno de Chile",
    featured: true,
  },
  {
    id: "mvp",
    title: "MVP Fast Track",
    description:
      "Discovery + prototipo funcional + deploy inicial. Para startups que necesitan validar rápido con métricas desde el día 1.",
    badge: "Speed x Diseño",
    deliverables: ["Roadmap 4 semanas", "MVP en producción", "Tracking y analítica", "Playbook de handoff"],
    timeline: "4-6 semanas",
    price: "$8k - $15k",
    roi: "ROI: Validación de mercado",
    caseStudy: "E-commerce Dracamila",
  },
  {
    id: "automation",
    title: "Automatizaciones Revenue",
    description:
      "Workflows n8n + integración CRM + WhatsApp. Para equipos que quieren eliminar tareas manuales y aumentar conversión.",
    badge: "Ops + Growth",
    deliverables: ["Workflows n8n", "Alertas & observabilidad", "Reportes accionables", "Capacitación"],
    timeline: "3-5 semanas",
    price: "$4k - $9k",
    roi: "ROI: 300-500% en 6 meses",
    caseStudy: "Automatizaciones n8n",
  },
  {
    id: "data-bi",
    title: "Datos & BI",
    description:
      "Pipelines, ETL/ELT y dashboards interactivos. Para directivos que necesitan decisiones basadas en datos, no intuición.",
    badge: "BI + IA",
    deliverables: ["Modelado de datos", "Dashboards ejecutivos", "Monitoreo continuo", "ML Ops (opcional)"],
    timeline: "4-8 semanas",
    price: "$6k - $14k",
    roi: "ROI: Ahorro $10k-50k/mes",
    caseStudy: "ML Forecast Retail",
  },
  {
    id: "consulting",
    title: "Consultoría Estratégica",
    description:
      "Auditoría técnica, roadmap y arquitectura. Para empresas que necesitan dirección antes de invertir en desarrollo.",
    badge: "Estrategia",
    deliverables: ["Auditoría completa", "Roadmap priorizado", "Arquitectura propuesta", "Estimaciones"],
    timeline: "2-3 semanas",
    price: "$2k - $5k",
    roi: "ROI: Evita costos innecesarios",
  },
];
