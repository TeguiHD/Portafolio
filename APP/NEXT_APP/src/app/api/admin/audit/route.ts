import { NextRequest, NextResponse } from "next/server";
import { verifySessionForApi } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/permission-check";
import { getAuditLogs, AuditCategory } from "@/lib/audit";
import { inicioDelDiaChile } from "@/modules/admin/cobros";

/** «AAAA-MM-DD» → inicio o último milisegundo de ese día en Chile; otro formato de fecha, tal cual; inválida, nada. */
function diaDeChile(valor: string | null, borde: "inicio" | "fin"): Date | undefined {
    if (!valor) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        const mediodia = Date.parse(`${valor}T12:00:00Z`);
        if (Number.isNaN(mediodia)) return undefined;
        return borde === "inicio"
            ? inicioDelDiaChile(new Date(mediodia))
            : new Date(inicioDelDiaChile(new Date(mediodia + 86_400_000)).getTime() - 1);
    }
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? undefined : fecha;
}

/**
 * GET /api/admin/audit
 * Fetch audit logs with pagination and filters
 * Requires: audit.view permission (SUPERADMIN by default)
 */
export async function GET(request: NextRequest) {
    try {
        // DAL pattern: Verify session close to data access
        const session = await verifySessionForApi();
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Check permission
        const canView = await hasPermission(
            session.user.id,
            session.user.role,
            "audit.view"
        );

        if (!canView) {
            return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
        }

        // Parse query params
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
        const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50), 100);
        const category = searchParams.get("category") as AuditCategory | null;
        const action = searchParams.get("action")?.trim().slice(0, 100) || undefined;
        const userId = searchParams.get("userId") || undefined;
        // «Desde» y «hasta» son días de Chile y el «hasta» incluye todo ese día. Antes «Hoy» (desde hoy hasta hoy)
        // pedía de medianoche UTC a medianoche UTC y siempre salía vacío.
        const startDate = diaDeChile(searchParams.get("startDate"), "inicio");
        const endDate = diaDeChile(searchParams.get("endDate"), "fin");

        const result = await getAuditLogs({
            page,
            limit,
            category: category || undefined,
            action,
            userId,
            startDate,
            endDate,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("[Audit API] Error:", error);
        return NextResponse.json(
            { error: "No se pudo cargar la auditoría" },
            { status: 500 }
        );
    }
}
