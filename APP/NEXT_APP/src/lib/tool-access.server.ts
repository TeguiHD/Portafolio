import "server-only";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getDefaultToolBySlug } from "@/lib/tool-registry";

/**
 * Decisión de acceso a una herramienta, tomada en servidor.
 *
 * Es la ÚNICA implementación de la política: la usan el layout de cada
 * herramienta (para pintar el widget o `ToolAccessBlocked` en el primer
 * render, sin fetch en cliente) y la ruta /api/tools/public/[slug] (que
 * añade rate-limit y da forma a la respuesta HTTP). Una sola función
 * significa que layout y API no pueden divergir.
 *
 * `status` es el código HTTP equivalente para que la ruta lo emita tal cual.
 * Fail-closed: cualquier error termina en no autorizado, salvo el mismo
 * respaldo de registro que ya existía (herramienta pública y activa en
 * DEFAULT_TOOL_REGISTRY) cuando la base de datos no está disponible.
 */
export type ToolAccessDecisionType = "public" | "admin_only" | "private" | "blocked" | "error";

export interface ToolRow {
    id?: string;
    slug: string;
    name: string;
    description?: string | null;
    icon?: string | null;
    category?: string | null;
    config?: unknown;
    isPublic: boolean;
    isActive: boolean;
}

export interface ToolAccessDecision {
    isAuthorized: boolean;
    accessType: ToolAccessDecisionType;
    status: 200 | 400 | 401 | 403 | 404 | 410 | 500;
    toolName?: string;
    tool?: ToolRow;
    source: "database" | "registry" | "registry-degraded" | "registry-failsafe" | "none";
    degradedReason: string | null;
}

const SLUG_RE = /^[a-z0-9-]+$/;

export async function resolveToolAccess(slug: string): Promise<ToolAccessDecision> {
    const fallbackTool = getDefaultToolBySlug(slug);
    const hasPublicFallback = Boolean(fallbackTool?.isPublic && fallbackTool.isActive);
    const fallbackRow: ToolRow | undefined = fallbackTool ? { ...fallbackTool, config: null } : undefined;

    if (!slug || !SLUG_RE.test(slug) || slug.length > 50) {
        return { isAuthorized: false, accessType: "blocked", status: 400, source: "none", degradedReason: null };
    }

    try {
        let degradedReason: string | null = null;
        let tool: ToolRow | null = null;

        try {
            tool = await prisma.tool.findUnique({
                where: { slug },
                select: {
                    id: true, slug: true, name: true, description: true, icon: true,
                    category: true, config: true, isPublic: true, isActive: true,
                },
            });
        } catch (dbError) {
            console.error("Error loading tool metadata:", dbError);
            if (!hasPublicFallback) throw dbError;
            degradedReason = "database_unavailable";
        }

        if (!tool) {
            if (hasPublicFallback && fallbackRow) {
                return {
                    isAuthorized: true, accessType: "public", status: 200,
                    toolName: fallbackRow.name, tool: fallbackRow,
                    source: degradedReason ? "registry-degraded" : "registry", degradedReason,
                };
            }
            return { isAuthorized: false, accessType: "blocked", status: 404, source: "none", degradedReason };
        }

        // SECURITY: herramienta desactivada = bloqueada para todos
        if (!tool.isActive) {
            return { isAuthorized: false, accessType: "private", status: 410, toolName: tool.name, source: "database", degradedReason };
        }

        if (tool.isPublic) {
            return { isAuthorized: true, accessType: "public", status: 200, toolName: tool.name, tool, source: "database", degradedReason };
        }

        // SECURITY: no pública → exige sesión con rol admin, no cualquier usuario
        const session = await auth();
        if (!session?.user) {
            return { isAuthorized: false, accessType: "admin_only", status: 401, toolName: tool.name, source: "database", degradedReason };
        }
        const role = (session.user as { role?: string }).role;
        if (role !== "admin" && role !== "ADMIN") {
            console.warn(`[SECURITY] Unauthorized tool access attempt: ${slug} by user: ${session.user.email}`);
            return { isAuthorized: false, accessType: "blocked", status: 403, toolName: tool.name, source: "database", degradedReason };
        }
        return { isAuthorized: true, accessType: "admin_only", status: 200, toolName: tool.name, tool, source: "database", degradedReason };
    } catch (error) {
        console.error("Error resolving tool access:", error);
        if (hasPublicFallback && fallbackRow) {
            return {
                isAuthorized: true, accessType: "public", status: 200,
                toolName: fallbackRow.name, tool: fallbackRow,
                source: "registry-failsafe", degradedReason: "verification_error",
            };
        }
        return { isAuthorized: false, accessType: "error", status: 500, source: "none", degradedReason: "verification_error" };
    }
}
