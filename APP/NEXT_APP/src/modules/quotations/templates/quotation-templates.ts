/**
 * Quotation Service Templates
 * Pre-defined services organized by project type for quick quotation generation
 */

export type ProjectType =
    | "landing_page"
    | "website"
    | "ecommerce"
    | "webapp"
    | "consulting"
    | "maintenance"
    | "redesign";

export interface ServiceTemplate {
    id: string;
    title: string;
    description: string;
    deliverables: string[];
    basePrice: number;
    category: "design" | "development" | "content" | "consulting" | "support";
}

export interface ProjectTypeInfo {
    id: ProjectType;
    name: string;
    description: string;
    icon: string;
    defaultTimeline: string;
    defaultPaymentTerms: string;
}

// Project type definitions
export const projectTypes: ProjectTypeInfo[] = [
    {
        id: "landing_page",
        name: "Landing Page",
        description: "Página de aterrizaje optimizada para conversión",
        icon: "🎯",
        defaultTimeline: "10-15 días hábiles",
        defaultPaymentTerms: "50% inicio / 50% entrega",
    },
    {
        id: "website",
        name: "Sitio Web",
        description: "Sitio web corporativo o institucional multi-página",
        icon: "🌐",
        defaultTimeline: "20-30 días hábiles",
        defaultPaymentTerms: "40% inicio / 30% avance / 30% entrega",
    },
    {
        id: "ecommerce",
        name: "E-commerce",
        description: "Tienda online con carrito y pasarela de pago",
        icon: "🛒",
        defaultTimeline: "30-45 días hábiles",
        defaultPaymentTerms: "40% inicio / 30% avance / 30% entrega",
    },
    {
        id: "webapp",
        name: "Aplicación Web",
        description: "Sistema web con funcionalidades a medida",
        icon: "⚡",
        defaultTimeline: "45-60 días hábiles",
        defaultPaymentTerms: "30% inicio / 30% avance / 40% entrega",
    },
    {
        id: "consulting",
        name: "Consultoría",
        description: "Asesoría técnica y estratégica",
        icon: "💡",
        defaultTimeline: "Por sesión/hora",
        defaultPaymentTerms: "100% previo a cada sesión",
    },
    {
        id: "maintenance",
        name: "Mantenimiento",
        description: "Soporte continuo y actualizaciones",
        icon: "🔧",
        defaultTimeline: "Plan mensual/anual",
        defaultPaymentTerms: "Pago mensual anticipado",
    },
    {
        id: "redesign",
        name: "Rediseño",
        description: "Actualización visual y funcional de sitio existente",
        icon: "🔄",
        defaultTimeline: "15-25 días hábiles",
        defaultPaymentTerms: "50% inicio / 50% entrega",
    },
];

// Service templates by project type
export const serviceTemplates: Record<ProjectType, ServiceTemplate[]> = {
    landing_page: [
        {
            id: "lp_design",
            title: "Diseño UI/UX",
            description: "Diseño profesional optimizado para conversión y experiencia de usuario",
            deliverables: [
                "Wireframes y estructura",
                "Diseño visual en Figma",
                "Versión responsive (mobile/tablet/desktop)",
                "Assets exportables",
            ],
            basePrice: 180000,
            category: "design",
        },
        {
            id: "lp_dev",
            title: "Desarrollo Frontend",
            description: "Implementación con tecnologías modernas y optimización de rendimiento",
            deliverables: [
                "Desarrollo en Next.js/React",
                "Animaciones y transiciones",
                "Optimización SEO on-page",
                "Deploy en hosting",
            ],
            basePrice: 220000,
            category: "development",
        },
        {
            id: "lp_forms",
            title: "Formulario de Contacto",
            description: "Formulario funcional con validación y notificaciones",
            deliverables: [
                "Formulario con validación",
                "Notificación por email",
                "Integración con CRM (opcional)",
                "Captcha anti-spam",
            ],
            basePrice: 60000,
            category: "development",
        },
        {
            id: "lp_analytics",
            title: "Analytics y Tracking",
            description: "Configuración de métricas y seguimiento de conversiones",
            deliverables: [
                "Google Analytics 4",
                "Pixel de Facebook/Meta",
                "Tracking de eventos",
                "Dashboard básico",
            ],
            basePrice: 45000,
            category: "development",
        },
    ],

    website: [
        {
            id: "web_design",
            title: "Diseño Integral del Sitio",
            description: "Diseño completo de todas las páginas y componentes",
            deliverables: [
                "Diseño de todas las páginas",
                "Sistema de componentes reutilizables",
                "Diseño responsive completo",
                "Guía de estilos",
            ],
            basePrice: 350000,
            category: "design",
        },
        {
            id: "web_dev",
            title: "Desarrollo Full-Stack",
            description: "Implementación completa con CMS y base de datos",
            deliverables: [
                "Desarrollo frontend",
                "Panel de administración",
                "Base de datos",
                "API REST",
            ],
            basePrice: 450000,
            category: "development",
        },
        {
            id: "web_content",
            title: "Gestión de Contenido",
            description: "Sistema para administrar contenido sin conocimientos técnicos",
            deliverables: [
                "CMS personalizado",
                "Editor de páginas",
                "Gestión de imágenes",
                "Capacitación de uso",
            ],
            basePrice: 150000,
            category: "content",
        },
        {
            id: "web_seo",
            title: "SEO Técnico",
            description: "Optimización para motores de búsqueda",
            deliverables: [
                "Estructura de URLs optimizada",
                "Meta tags dinámicos",
                "Sitemap XML",
                "Schema markup",
            ],
            basePrice: 120000,
            category: "development",
        },
    ],

    ecommerce: [
        {
            id: "ec_design",
            title: "Diseño de Tienda",
            description: "Diseño enfocado en conversión y experiencia de compra",
            deliverables: [
                "Diseño de home y categorías",
                "Página de producto optimizada",
                "Flujo de checkout",
                "Diseño responsive completo",
            ],
            basePrice: 400000,
            category: "design",
        },
        {
            id: "ec_dev",
            title: "Desarrollo E-commerce",
            description: "Plataforma completa de comercio electrónico",
            deliverables: [
                "Catálogo de productos",
                "Carrito de compras",
                "Sistema de usuarios",
                "Gestión de inventario",
            ],
            basePrice: 600000,
            category: "development",
        },
        {
            id: "ec_payment",
            title: "Pasarela de Pagos",
            description: "Integración con métodos de pago locales e internacionales",
            deliverables: [
                "Webpay Plus / Transbank",
                "Mercado Pago",
                "PayPal (opcional)",
                "Testing y certificación",
            ],
            basePrice: 180000,
            category: "development",
        },
        {
            id: "ec_shipping",
            title: "Sistema de Despacho",
            description: "Integración con couriers y cálculo de envíos",
            deliverables: [
                "Calculadora de envío",
                "Integración courier (Chilexpress, Starken)",
                "Seguimiento de pedidos",
                "Notificaciones automáticas",
            ],
            basePrice: 150000,
            category: "development",
        },
        {
            id: "ec_admin",
            title: "Panel de Administración",
            description: "Dashboard para gestionar la tienda",
            deliverables: [
                "Gestión de productos",
                "Administración de pedidos",
                "Reportes de ventas",
                "Gestión de clientes",
            ],
            basePrice: 200000,
            category: "development",
        },
    ],

    webapp: [
        {
            id: "app_discovery",
            title: "Discovery y Planificación",
            description: "Análisis de requerimientos y arquitectura del sistema",
            deliverables: [
                "Levantamiento de requerimientos",
                "Documento de especificación",
                "Arquitectura técnica",
                "Plan de desarrollo",
            ],
            basePrice: 250000,
            category: "consulting",
        },
        {
            id: "app_ux",
            title: "Diseño UX/UI",
            description: "Diseño de interfaz y experiencia de usuario",
            deliverables: [
                "Wireframes y prototipos",
                "Diseño de interfaz completo",
                "Sistema de diseño",
                "Pruebas de usabilidad",
            ],
            basePrice: 450000,
            category: "design",
        },
        {
            id: "app_frontend",
            title: "Desarrollo Frontend",
            description: "Implementación de la interfaz de usuario",
            deliverables: [
                "Aplicación React/Next.js",
                "Estado global y caché",
                "Integración con APIs",
                "Testing unitario",
            ],
            basePrice: 600000,
            category: "development",
        },
        {
            id: "app_backend",
            title: "Desarrollo Backend",
            description: "Servidor, API y base de datos",
            deliverables: [
                "API REST/GraphQL",
                "Base de datos PostgreSQL",
                "Autenticación y autorización",
                "Documentación API",
            ],
            basePrice: 700000,
            category: "development",
        },
        {
            id: "app_deploy",
            title: "Infraestructura y Deploy",
            description: "Configuración de servidores y CI/CD",
            deliverables: [
                "Setup de servidores",
                "Pipeline CI/CD",
                "Monitoreo y alertas",
                "Backup automático",
            ],
            basePrice: 200000,
            category: "development",
        },
    ],

    consulting: [
        {
            id: "cons_audit",
            title: "Auditoría Técnica",
            description: "Revisión completa de sitio/app existente",
            deliverables: [
                "Análisis de rendimiento",
                "Revisión de código",
                "Evaluación de seguridad",
                "Informe con recomendaciones",
            ],
            basePrice: 180000,
            category: "consulting",
        },
        {
            id: "cons_strategy",
            title: "Consultoría Estratégica",
            description: "Asesoría en decisiones técnicas y de producto",
            deliverables: [
                "3 sesiones de 2 horas",
                "Análisis de mercado",
                "Roadmap tecnológico",
                "Documentación de decisiones",
            ],
            basePrice: 350000,
            category: "consulting",
        },
        {
            id: "cons_training",
            title: "Capacitación Técnica",
            description: "Formación personalizada para equipos",
            deliverables: [
                "Programa de capacitación",
                "Material didáctico",
                "Ejercicios prácticos",
                "Certificado de asistencia",
            ],
            basePrice: 75000,
            category: "consulting",
        },
    ],

    maintenance: [
        {
            id: "maint_basic",
            title: "Plan Básico (Mensual)",
            description: "Mantenimiento esencial y soporte",
            deliverables: [
                "Actualizaciones de seguridad",
                "Backup semanal",
                "Monitoreo de uptime",
                "2 horas de soporte",
            ],
            basePrice: 80000,
            category: "support",
        },
        {
            id: "maint_pro",
            title: "Plan Profesional (Mensual)",
            description: "Mantenimiento completo con mejoras continuas",
            deliverables: [
                "Todo del plan básico",
                "Backup diario",
                "Optimización de rendimiento",
                "5 horas de desarrollo",
                "Reportes mensuales",
            ],
            basePrice: 180000,
            category: "support",
        },
        {
            id: "maint_enterprise",
            title: "Plan Enterprise (Mensual)",
            description: "Soporte dedicado y desarrollo continuo",
            deliverables: [
                "Todo del plan profesional",
                "SLA garantizado (99.9%)",
                "10 horas de desarrollo",
                "Soporte prioritario",
                "Reuniones semanales",
            ],
            basePrice: 350000,
            category: "support",
        },
    ],

    redesign: [
        {
            id: "rd_audit",
            title: "Auditoría y Análisis",
            description: "Evaluación del sitio actual e identificación de mejoras",
            deliverables: [
                "Análisis de UX actual",
                "Benchmark competencia",
                "Identificación de pain points",
                "Propuesta de mejoras",
            ],
            basePrice: 120000,
            category: "consulting",
        },
        {
            id: "rd_design",
            title: "Nuevo Diseño",
            description: "Rediseño visual manteniendo la esencia de marca",
            deliverables: [
                "Nuevo diseño UI",
                "Mejoras de UX",
                "Diseño responsive",
                "Guía de estilos actualizada",
            ],
            basePrice: 280000,
            category: "design",
        },
        {
            id: "rd_migration",
            title: "Desarrollo y Migración",
            description: "Implementación del nuevo diseño con migración de contenido",
            deliverables: [
                "Desarrollo del nuevo sitio",
                "Migración de contenido",
                "Redirecciones 301",
                "QA y testing",
            ],
            basePrice: 350000,
            category: "development",
        },
    ],
};

// Helper functions
export function getProjectTypeInfo(type: ProjectType): ProjectTypeInfo | undefined {
    return projectTypes.find(pt => pt.id === type);
}

export function getServicesForProject(type: ProjectType): ServiceTemplate[] {
    return serviceTemplates[type] || [];
}

export function calculateEstimatedTotal(services: ServiceTemplate[]): number {
    return services.reduce((sum, service) => sum + service.basePrice, 0);
}
