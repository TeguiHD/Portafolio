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
    id: "floresdyd",
    title: "Flores D&D - E-commerce Floral",
    subtitle: "Tienda online con entrega mismo día | +200% ventas",
    description:
      "Problema: Negocio físico sin presencia digital ni ventas online. Solución: E-commerce completo con catálogo dinámico, carrito optimizado, integración WhatsApp y sistema de entregas en Santiago. Resultado: +200% ventas online, entrega mismo día y gestión multi-sucursal.",
    tags: ["Next.js", "E-commerce", "WhatsApp API", "SEO"],
    metrics: [
      { label: "Ventas", value: "+200%" },
      { label: "Entrega", value: "Mismo día" },
      { label: "Sucursales", value: "2" },
    ],
    link: "https://floresdyd.cl",
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
    id: "yoestoyaqui",
    title: "Yo Estoy Aquí - App Comunitaria",
    subtitle: "Plataforma móvil para PyMEs | 850+ comercios",
    description:
      "Problema: PyMEs locales sin visibilidad digital ni canal de conexión con su comunidad. Solución: App móvil con geolocalización, club de beneficios, portal de gestión para emprendedores y tarjeta digital. Resultado: 850+ comercios registrados, disponible en Google Play y App Store.",
    tags: ["React Native", "Geolocalización", "Mobile", "Comunidad"],
    metrics: [
      { label: "Comercios", value: "850+" },
      { label: "Plataformas", value: "iOS + Android" },
      { label: "Valoración", value: "4.9 ★" },
    ],
    link: "https://yoestoyaqui.cl",
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

