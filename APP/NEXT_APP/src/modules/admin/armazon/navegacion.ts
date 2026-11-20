import type { LucideIcon } from "lucide-react";
import {
    Sun, ChartPie, Filter, Users, FileText, Package, CreditCard, Wallet, TrendingUp, IdCard, Briefcase,
    Wrench, ChartLine, Mail, FlaskConical, UserCog, Bell, ListChecks, ShieldCheck, Server, Link2,
} from "lucide-react";
import type { Role } from "@/generated/prisma/client";

/**
 * Las secciones del panel. Los permisos y roles son los mismos del menú anterior:
 * aquí cambian los nombres (en castellano y sin jerga) y cómo se agrupan.
 */
export interface Destino {
    nombre: string;
    href: string;
    icono: LucideIcon;
    permiso: string;
    roles?: Role[];
    /** Vive fuera de este dominio: se abre en otra pestaña. */
    externo?: boolean;
    /** Clave del contador que se muestra al lado (propuestas por firmar, mensajes sin leer). */
    contador?: "propuestas" | "mensajes";
    /** Palabras extra para el buscador. */
    tambien?: string;
}

export interface Grupo { nombre: string; destinos: Destino[] }

export const INICIO: Destino = { nombre: "Hoy", href: "/admin", icono: Sun, permiso: "dashboard.view", roles: ["SUPERADMIN", "ADMIN", "MODERATOR"], tambien: "dashboard escritorio inicio resumen" };

export const GRUPOS: Grupo[] = [
    {
        nombre: "Comercial",
        destinos: [
            // El resumen absorbió lo que mostraba «Servicios» (cobrado del mes, por cobrar, contratos por vencer).
            { nombre: "Resumen", href: "/admin/gestion-comercial", icono: ChartPie, permiso: "crm.dashboard", tambien: "servicios comercial cobrado por cobrar renovaciones" },
            { nombre: "Oportunidades", href: "/admin/gestion-comercial/pipeline", icono: Filter, permiso: "crm.pipeline.view", tambien: "pipeline crm negocios embudo" },
            { nombre: "Clientes", href: "/admin/clientes", icono: Users, permiso: "quotations.view", tambien: "directorio ficha contactos" },
            { nombre: "Propuestas", href: "/admin/cotizaciones", icono: FileText, permiso: "quotations.view", contador: "propuestas", tambien: "cotizaciones presupuestos firmas" },
            { nombre: "Contratos", href: "/admin/gestion-comercial/contratos", icono: Package, permiso: "crm.contracts.view", tambien: "servicios contratos cláusulas renovación" },
            { nombre: "Pagos", href: "/admin/gestion-comercial/pagos", icono: Wallet, permiso: "crm.payments.view", tambien: "cobros cuotas abonos registrar pago" },
            { nombre: "Gastos", href: "/admin/gestion-comercial/gastos", icono: CreditCard, permiso: "crm.expenses.view", tambien: "control de gastos" },
        ],
    },
    {
        // Lo del dueño, no de los clientes: sus finanzas personales, su currículum y sus postulaciones.
        nombre: "Personal",
        destinos: [
            { nombre: "Finanzas", href: "/admin/finance", icono: TrendingUp, permiso: "finance.view", tambien: "finanzas personales cuentas transacciones presupuesto" },
            { nombre: "Currículum", href: "/admin/cv-editor", icono: IdCard, permiso: "cv.own.view", tambien: "cv editor" },
            { nombre: "Postulaciones", href: "/admin/jobs", icono: Briefcase, permiso: "jobs.vacancies.view", tambien: "empleos vacantes trabajos" },
        ],
    },
    {
        nombre: "Sitio",
        destinos: [
            { nombre: "Herramientas", href: "/admin/herramientas", icono: Wrench, permiso: "tools.view" },
            { nombre: "Visitas", href: "/admin/analytics", icono: ChartLine, permiso: "analytics.view", tambien: "analytics estadísticas tráfico" },
            { nombre: "Mensajes", href: "/admin/contact", icono: Mail, permiso: "contact.manage", contador: "mensajes", tambien: "contacto formulario correos" },
            // Corre en su propia máquina: el laboratorio pide su propio acceso.
            { nombre: "Laboratorio", href: "https://lab.nicoholas.dev", icono: FlaskConical, permiso: "analytics.view", externo: true },
        ],
    },
    {
        nombre: "Administración",
        destinos: [
            { nombre: "Usuarios", href: "/admin/users", icono: UserCog, permiso: "users.view", tambien: "permisos roles" },
            { nombre: "Seguridad", href: "/admin/security", icono: ShieldCheck, permiso: "security.view", tambien: "amenazas bloqueos" },
            { nombre: "Auditoría", href: "/admin/audit", icono: ListChecks, permiso: "audit.view", tambien: "registro bitácora" },
            { nombre: "Notificaciones", href: "/admin/notifications", icono: Bell, permiso: "notifications.view", tambien: "avisos" },
            { nombre: "Servidor", href: "/admin/superadmin", icono: Server, permiso: "security.view", roles: ["SUPERADMIN"], tambien: "vps sistema cpu memoria disco" },
        ],
    },
    {
        nombre: "Colaboración",
        destinos: [
            { nombre: "Conexiones", href: "/admin/connections", icono: Link2, permiso: "connections.view", tambien: "compartir" },
        ],
    },
];

/** Lo más usado, para la barra inferior en celular (en este orden, si hay permiso). */
export const EN_CELULAR = ["/admin", "/admin/cotizaciones", "/admin/clientes", "/admin/contact", "/admin/finance", "/admin/gestion-comercial/pipeline"];

export function puede(d: Destino, permisos: string[], rol: Role): boolean {
    return permisos.includes(d.permiso) && (!d.roles || d.roles.includes(rol));
}

/** Destinos que son padres de otros del menú: solo se marcan en su propia página. */
const EXACTOS = new Set(["/admin", "/admin/gestion-comercial"]);

export function activo(href: string, ruta: string): boolean {
    return EXACTOS.has(href) ? ruta === href : ruta === href || ruta.startsWith(`${href}/`);
}

/** Nombres para las migas: los de la navegación más algunas rutas internas. */
const OTRAS: Record<string, string> = {
    "/admin/profile": "Mi perfil",
    "/admin/gestion-comercial": "Comercial",
    "/admin/gestion-comercial/clientes": "Clientes",
    "/admin/gestion-comercial/propuestas": "Propuestas",
    "/admin/gestion-comercial/contratos": "Contratos",
    "/admin/finance": "Finanzas",
    "/admin/finance/accounts": "Cuentas",
    "/admin/finance/categories": "Categorías",
    "/admin/finance/transactions": "Transacciones",
    "/admin/finance/budgets": "Presupuestos",
    "/admin/finance/goals": "Metas",
    "/admin/finance/recurring": "Recurrentes",
    "/admin/finance/reminders": "Recordatorios",
    "/admin/finance/reports": "Reportes",
    "/admin/finance/settings": "Configuración",
    "/admin/finance/ai": "Asistente",
    "/admin/jobs/search": "Buscar vacantes",
    "/admin/jobs/pipeline": "Seguimiento",
    "/admin/jobs/analysis": "Análisis",
};

/** Tramos que se repiten en muchas rutas (…/new, …/[id]/edit). */
const TRAMOS: Record<string, string> = { new: "Crear", edit: "Editar", batch: "Varias a la vez", scan: "Escanear" };

export function migas(ruta: string): { nombre: string; href: string }[] {
    const nombres = new Map<string, string>([[INICIO.href, "Panel"], ...GRUPOS.flatMap((g) => g.destinos.map((d) => [d.href, d.nombre] as [string, string])), ...Object.entries(OTRAS)]);
    const partes = ruta.split("/").filter(Boolean);
    let camino = "";
    return partes.map((p) => {
        camino += `/${p}`;
        const id = /^[a-z0-9]{20,}$/i.test(p) || /^[0-9a-f-]{32,}$/i.test(p);
        return { nombre: nombres.get(camino) ?? TRAMOS[p] ?? (id ? "Detalle" : p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, " ")), href: camino };
    });
}
