/**
 * Default permissions for the system
 * Each permission has:
 * - code: unique identifier (format: category.resource.action)
 * - name: human-readable name
 * - description: what this permission allows
 * - category: grouping for UI
 * - defaultRoles: roles that have this permission by default
 */

import { Role } from "@prisma/client";

export interface PermissionDefinition {
    code: string;
    name: string;
    description: string;
    category: string;
    defaultRoles: Role[];
}

export const DEFAULT_PERMISSIONS: PermissionDefinition[] = [
    // ============= DASHBOARD =============
    {
        code: "dashboard.view",
        name: "Ver Dashboard",
        description: "Acceder al panel de administración",
        category: "dashboard",
        defaultRoles: ["SUPERADMIN", "ADMIN", "MODERATOR", "USER"],
    },

    // ============= ANALYTICS =============
    {
        code: "analytics.view",
        name: "Ver Analytics",
        description: "Ver estadísticas y métricas del sitio",
        category: "analytics",
        defaultRoles: ["SUPERADMIN", "ADMIN", "MODERATOR"],
    },
    {
        code: "analytics.export",
        name: "Exportar Analytics",
        description: "Descargar reportes de analytics",
        category: "analytics",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },

    // ============= TOOLS =============
    {
        code: "tools.view",
        name: "Ver Herramientas",
        description: "Ver lista de herramientas del sistema",
        category: "tools",
        defaultRoles: ["SUPERADMIN", "ADMIN", "MODERATOR"],
    },
    {
        code: "tools.create",
        name: "Crear Herramientas",
        description: "Añadir nuevas herramientas al sistema",
        category: "tools",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "tools.edit",
        name: "Editar Herramientas",
        description: "Modificar nombre, descripción e icono de herramientas",
        category: "tools",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "tools.visibility.edit",
        name: "Cambiar Visibilidad",
        description: "Cambiar si una herramienta es pública, privada o solo admin",
        category: "tools",
        defaultRoles: ["SUPERADMIN"],
    },
    {
        code: "tools.delete",
        name: "Eliminar Herramientas",
        description: "Eliminar herramientas del sistema",
        category: "tools",
        defaultRoles: ["SUPERADMIN"],
    },

    // ============= QUOTATIONS =============
    {
        code: "quotations.view",
        name: "Ver Cotizaciones",
        description: "Ver lista de cotizaciones",
        category: "quotations",
        defaultRoles: ["SUPERADMIN", "ADMIN", "MODERATOR"],
    },
    {
        code: "quotations.create",
        name: "Crear Cotizaciones",
        description: "Crear nuevas cotizaciones",
        category: "quotations",
        defaultRoles: ["SUPERADMIN", "ADMIN", "MODERATOR"],
    },
    {
        code: "quotations.edit",
        name: "Editar Cotizaciones",
        description: "Modificar cotizaciones existentes",
        category: "quotations",
        defaultRoles: ["SUPERADMIN", "ADMIN", "MODERATOR"],
    },
    {
        code: "quotations.delete",
        name: "Eliminar Cotizaciones",
        description: "Eliminar cotizaciones",
        category: "quotations",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "quotations.status.edit",
        name: "Cambiar Estado",
        description: "Cambiar estado de cotizaciones (enviada, aceptada, etc.)",
        category: "quotations",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "quotations.spy",
        name: "Modo Espía",
        description: "Ver clientes y cotizaciones de otros usuarios",
        category: "quotations",
        defaultRoles: ["SUPERADMIN"],
    },

    // ============= USERS =============
    {
        code: "users.view",
        name: "Ver Usuarios",
        description: "Ver lista de usuarios del sistema",
        category: "users",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "users.create",
        name: "Crear Usuarios",
        description: "Crear nuevos usuarios",
        category: "users",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "users.edit",
        name: "Editar Usuarios",
        description: "Modificar información de usuarios",
        category: "users",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "users.role.edit",
        name: "Cambiar Roles",
        description: "Cambiar el rol de usuarios",
        category: "users",
        defaultRoles: ["SUPERADMIN"],
    },
    {
        code: "users.permissions.edit",
        name: "Gestionar Permisos",
        description: "Asignar o revocar permisos específicos a usuarios",
        category: "users",
        defaultRoles: ["SUPERADMIN"],
    },
    {
        code: "users.delete",
        name: "Eliminar Usuarios",
        description: "Eliminar usuarios del sistema",
        category: "users",
        defaultRoles: ["SUPERADMIN"],
    },
    {
        code: "users.suspend",
        name: "Suspender Usuarios",
        description: "Activar o desactivar cuentas de usuario",
        category: "users",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },

    // ============= CV EDITOR =============
    {
        code: "cv.own.view",
        name: "Ver CV Propio",
        description: "Ver y editar tu propio CV",
        category: "cv",
        defaultRoles: ["SUPERADMIN", "ADMIN", "MODERATOR", "USER"],
    },
    {
        code: "cv.others.view",
        name: "Ver CVs de Otros",
        description: "Ver CVs de otros usuarios (solo lectura)",
        category: "cv",
        defaultRoles: ["SUPERADMIN"],
    },

    // ============= NOTIFICATIONS =============
    {
        code: "notifications.view",
        name: "Ver Notificaciones",
        description: "Ver notificaciones del sistema",
        category: "notifications",
        defaultRoles: ["SUPERADMIN", "ADMIN", "MODERATOR"],
    },
    {
        code: "notifications.create",
        name: "Crear Notificaciones",
        description: "Enviar notificaciones a usuarios",
        category: "notifications",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },

    // ============= AUDIT =============
    {
        code: "audit.view",
        name: "Ver Registro de Auditoría",
        description: "Acceder al registro de eventos de seguridad y acciones del sistema",
        category: "audit",
        defaultRoles: ["SUPERADMIN"],
    },

    // ============= FINANCE =============
    {
        code: "finance.view",
        name: "Ver Finanzas",
        description: "Acceder al módulo de finanzas personales",
        category: "finance",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "finance.dashboard",
        name: "Ver Dashboard Financiero",
        description: "Ver resumen y métricas financieras",
        category: "finance",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "finance.transactions.view",
        name: "Ver Transacciones",
        description: "Ver lista de transacciones financieras",
        category: "finance",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "finance.transactions.create",
        name: "Crear Transacciones",
        description: "Registrar nuevas transacciones de ingreso/gasto",
        category: "finance",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "finance.transactions.edit",
        name: "Editar Transacciones",
        description: "Modificar transacciones existentes",
        category: "finance",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "finance.transactions.delete",
        name: "Eliminar Transacciones",
        description: "Eliminar transacciones del registro",
        category: "finance",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "finance.accounts.view",
        name: "Ver Cuentas",
        description: "Ver cuentas financieras (banco, efectivo, tarjetas)",
        category: "finance",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "finance.accounts.manage",
        name: "Gestionar Cuentas",
        description: "Crear, editar y eliminar cuentas financieras",
        category: "finance",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "finance.budgets.view",
        name: "Ver Presupuestos",
        description: "Ver presupuestos y límites configurados",
        category: "finance",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "finance.budgets.manage",
        name: "Gestionar Presupuestos",
        description: "Crear, editar y eliminar presupuestos por categoría",
        category: "finance",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "finance.goals.view",
        name: "Ver Metas de Ahorro",
        description: "Ver metas y objetivos de ahorro",
        category: "finance",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "finance.goals.manage",
        name: "Gestionar Metas",
        description: "Crear, editar y eliminar metas de ahorro",
        category: "finance",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "finance.ocr.use",
        name: "Usar OCR de Boletas",
        description: "Escanear y procesar boletas con OCR (Gemini 2.0)",
        category: "finance",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "finance.import",
        name: "Importar Datos",
        description: "Importar transacciones desde archivos CSV/Excel",
        category: "finance",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "finance.export",
        name: "Exportar Datos",
        description: "Exportar datos financieros en diferentes formatos",
        category: "finance",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "finance.analysis.view",
        name: "Ver Análisis",
        description: "Acceder a reportes y análisis financieros avanzados",
        category: "finance",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "finance.categories.manage",
        name: "Gestionar Categorías",
        description: "Crear y editar categorías personalizadas de transacciones",
        category: "finance",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },

    // ============= FINANCE - RECURRING =============
    {
        code: "finance.recurring.view",
        name: "Ver Pagos Recurrentes",
        description: "Ver lista de pagos recurrentes configurados",
        category: "finance",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "finance.recurring.manage",
        name: "Gestionar Pagos Recurrentes",
        description: "Crear, editar y eliminar pagos recurrentes",
        category: "finance",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },

    // ============= FINANCE - REPORTS =============
    {
        code: "finance.reports.view",
        name: "Ver Reportes Financieros",
        description: "Acceder a reportes y tendencias financieras",
        category: "finance",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },

    // ============= FINANCE - GENERAL MANAGEMENT =============
    {
        code: "finance.manage",
        name: "Gestión General de Finanzas",
        description: "Permiso general para OCR, productos, importación y tasas de cambio",
        category: "finance",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },

    // ============= SECURITY =============
    {
        code: "security.view",
        name: "Ver Centro de Seguridad",
        description: "Acceder al dashboard de seguridad y monitoreo de incidentes",
        category: "security",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "security.incidents.view",
        name: "Ver Incidentes de Seguridad",
        description: "Ver lista de incidentes de seguridad detectados",
        category: "security",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "security.incidents.resolve",
        name: "Resolver Incidentes",
        description: "Marcar incidentes de seguridad como resueltos",
        category: "security",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "security.incidents.delete",
        name: "Eliminar Incidentes",
        description: "Eliminar registros de incidentes de seguridad",
        category: "security",
        defaultRoles: ["SUPERADMIN"],
    },
    {
        code: "security.sessions.view",
        name: "Ver Sesiones Activas",
        description: "Ver sesiones activas propias",
        category: "security",
        defaultRoles: ["SUPERADMIN", "ADMIN", "MODERATOR", "USER"],
    },
    {
        code: "security.sessions.manage",
        name: "Gestionar Sesiones",
        description: "Revocar sesiones activas propias o de otros usuarios",
        category: "security",
        defaultRoles: ["SUPERADMIN", "ADMIN"],
    },
    {
        code: "security.sessions.admin",
        name: "Administrar Todas las Sesiones",
        description: "Ver y revocar sesiones de cualquier usuario",
        category: "security",
        defaultRoles: ["SUPERADMIN"],
    },

    // ============= CONTACT =============
    {
        code: "contact.manage",
        name: "Gestionar Mensajes de Contacto",
        description: "Ver, responder y administrar mensajes del formulario de contacto",
        category: "contact",
        defaultRoles: ["SUPERADMIN"],
    },
];

/**
 * Get all permission categories with their permissions
 */
export function getPermissionsByCategory(): Record<string, PermissionDefinition[]> {
    const byCategory: Record<string, PermissionDefinition[]> = {};
    for (const perm of DEFAULT_PERMISSIONS) {
        if (!byCategory[perm.category]) {
            byCategory[perm.category] = [];
        }
        byCategory[perm.category].push(perm);
    }
    return byCategory;
}

/**
 * Category display names and icons
 */
export const CATEGORY_INFO: Record<string, { name: string; icon: string }> = {
    dashboard: { name: "Dashboard", icon: "📊" },
    analytics: { name: "Analytics", icon: "📈" },
    tools: { name: "Herramientas", icon: "🛠️" },
    quotations: { name: "Cotizaciones", icon: "📄" },
    users: { name: "Usuarios", icon: "👥" },
    cv: { name: "Editor CV", icon: "📝" },
    notifications: { name: "Notificaciones", icon: "🔔" },
    audit: { name: "Auditoría", icon: "🔍" },
    finance: { name: "Finanzas", icon: "💰" },
    security: { name: "Seguridad", icon: "🔒" },
    contact: { name: "Contacto", icon: "📨" },
};
