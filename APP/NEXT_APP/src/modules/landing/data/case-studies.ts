export interface CaseStudy {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  metrics: { label: string; value: string }[];
  link: string;
  accent: string;
}

export const caseStudies: CaseStudy[] = [
  {
    id: "slep",
    title: "SLEP - Gobierno de Chile",
    subtitle: "Plataforma educativa pública | +50k usuarios activos",
    description:
      "Problema: Sistema legacy lento y costoso de mantener. Solución: Migración a microservicios con Next.js, PostgreSQL y Docker. Resultado: +40% eficiencia operativa, dashboards en tiempo real para directivos y reducción de costos de infraestructura.",
    tags: ["Next.js", "PostgreSQL", "Docker", "Microservicios"],
    metrics: [
      { label: "Usuarios", value: "+50k" },
      { label: "Eficiencia", value: "+40%" },
      { label: "Tiempo respuesta", value: "-60%" },
    ],
    link: "#",
    accent: "from-accent-1/60 to-accent-1/30",
  },
  {
    id: "dracamila",
    title: "E-commerce Dracamila",
    subtitle: "Checkout optimizado | Conversión +25%",
    description:
      "Problema: Abandono de carrito alto y checkout lento. Solución: Headless commerce con React, Stripe, Redis para inventario en tiempo real. Resultado: +25% conversión, +150% ventas, Core Web Vitals en verde y checkout < 1.2s.",
    tags: ["React", "Stripe", "Redis", "CI/CD"],
    metrics: [
      { label: "Conversión", value: "+25%" },
      { label: "Ventas", value: "+150%" },
      { label: "Checkout", value: "< 1.2s" },
    ],
    link: "#",
    accent: "from-accent-2/60 to-accent-2/30",
  },
  {
    id: "ml-forecast",
    title: "ML Forecast Retail",
    subtitle: "Predicción de demanda | 92% precisión",
    description:
      "Problema: Exceso de inventario y mermas altas. Solución: Pipeline ML con Python, FastAPI, features engineering y observabilidad completa. Resultado: 92% precisión en predicción, $20k/mes ahorrados en inventario y alertas proactivas.",
    tags: ["Python", "FastAPI", "ML Ops", "Docker"],
    metrics: [
      { label: "Precisión", value: "92%" },
      { label: "Ahorro mensual", value: "$20k" },
      { label: "Mermas", value: "-45%" },
    ],
    link: "#",
    accent: "from-blue-500/50 to-cyan-400/30",
  },
  {
    id: "automation",
    title: "Automatizaciones n8n",
    subtitle: "Workflows inteligentes | Leads 3x",
    description:
      "Problema: Procesos manuales consumiendo 80% del tiempo del equipo. Solución: Workflows automatizados con n8n, integración CRM-WhatsApp-Email, calificación de leads. Resultado: Leads 3x, -80% tareas manuales y recuperación automática de abandonos.",
    tags: ["n8n", "Webhooks", "APIs", "Growth"],
    metrics: [
      { label: "Leads", value: "3x" },
      { label: "Tareas manuales", value: "-80%" },
      { label: "Tiempo ahorrado", value: "40h/sem" },
    ],
    link: "#",
    accent: "from-purple-500/50 to-pink-400/30",
  },
  {
    id: "dashboard-bi",
    title: "Dashboard BI Ejecutivo",
    subtitle: "Decisiones data-driven | ROI 320%",
    description:
      "Problema: Reportes manuales dispersos y demoras en insights. Solución: Dashboard centralizado con Power BI + ETL automatizado (Python), conexión en tiempo real a ventas, inventario y marketing. Resultado: Reportes de 3 días a 3 minutos, decisiones 5x más rápidas.",
    tags: ["Power BI", "Python", "ETL", "SQL"],
    metrics: [
      { label: "ROI", value: "320%" },
      { label: "Tiempo reporte", value: "-99%" },
      { label: "Decisiones", value: "5x" },
    ],
    link: "#",
    accent: "from-emerald-500/50 to-teal-400/30",
  },
  {
    id: "mobile-app",
    title: "App Móvil Fintech",
    subtitle: "UX optimizada | Retención +45%",
    description:
      "Problema: Alta tasa de abandono en onboarding y baja retención. Solución: Rediseño UX con React Native, autenticación biométrica, notificaciones inteligentes y gamificación. Resultado: +45% retención a 30 días, NPS de 72, y reducción de soporte -30%.",
    tags: ["React Native", "Firebase", "UX/UI", "Analytics"],
    metrics: [
      { label: "Retención", value: "+45%" },
      { label: "NPS", value: "72" },
      { label: "Soporte", value: "-30%" },
    ],
    link: "#",
    accent: "from-orange-500/50 to-amber-400/30",
  },
];

