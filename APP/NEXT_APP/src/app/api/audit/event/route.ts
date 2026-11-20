import { hashEmail } from "@/lib/security.server";
import { NextRequest, NextResponse } from "next/server";
import { ipCliente } from "@/lib/ip-cliente";
import { auth } from "@/lib/auth";
import { createAuditLog, AuditActions } from "@/lib/audit";
import { checkRateLimit } from "@/lib/redis";

/**
 * Lista cerrada de lo que el navegador puede anotar en la auditoría (todo en la categoría «auth»):
 * sin sesión solo el intento fallido; con sesión, la entrada y la salida. El resto de acciones las registra
 * el servidor donde ocurren: un usuario no puede escribir «permiso concedido» o «usuario borrado» a mano.
 */
const SIN_SESION = new Set<string>([AuditActions.LOGIN_FAILED]);
const CON_SESION = new Set<string>([AuditActions.LOGIN_SUCCESS, AuditActions.LOGOUT]);

// Límites por ventana: de sobra para uso real, cortos para inundar la tabla.
const LIMITE_IP = { veces: 20, segundos: 300 };
const LIMITE_USUARIO = { veces: 10, segundos: 60 };

/**
 * Solo campos conocidos y cortos. Del intento fallido se guarda la huella del correo (la misma con que se buscan los
 * usuarios), no el correo: alcanza para ver si apuntan a una cuenta real sin dejar direcciones en texto plano.
 */
function metadatosSeguros(action: string, metadata: unknown): Record<string, string> {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
    const m = metadata as Record<string, unknown>;
    const salida: Record<string, string> = {};
    if (action === AuditActions.LOGIN_FAILED) {
        if (typeof m.email === "string" && m.email.trim()) salida.emailHash = hashEmail(m.email.trim().toLowerCase().slice(0, 254));
        if (typeof m.reason === "string") salida.reason = m.reason.slice(0, 100);
    }
    return salida;
}

/**
 * POST /api/audit/event
 * Registra un evento de acceso desde el navegador (la pantalla de acceso no puede hacerlo en el servidor).
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        const body: unknown = await request.json().catch(() => null);
        const { action, category, metadata } = (body && typeof body === "object" ? body : {}) as {
            action?: unknown; category?: unknown; metadata?: unknown;
        };

        if (typeof action !== "string" || (category !== undefined && category !== "auth")) {
            return NextResponse.json({ error: "Acción no permitida" }, { status: 400 });
        }
        const userId = session?.user?.id ?? null;
        const permitidas = userId ? CON_SESION : SIN_SESION;
        if (!permitidas.has(action)) {
            return NextResponse.json({ error: "Acción no permitida" }, { status: userId ? 403 : 401 });
        }

        const ipAddress = ipCliente(request.headers);
        const limite = userId ? LIMITE_USUARIO : LIMITE_IP;
        const cuota = await checkRateLimit(`audit-event:${userId ?? `ip:${ipAddress}`}`, limite.veces, limite.segundos);
        if (!cuota.allowed) {
            return NextResponse.json(
                { error: "Demasiados eventos; espera un momento" },
                { status: 429, headers: { "Retry-After": String(cuota.resetIn) } },
            );
        }

        await createAuditLog({
            action,
            category: "auth",
            userId,
            metadata: metadatosSeguros(action, metadata),
            ipAddress,
            userAgent: request.headers.get("user-agent")?.slice(0, 500) || undefined,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Audit Event API] Error:", error);
        return NextResponse.json({ error: "No se pudo registrar el evento" }, { status: 500 });
    }
}
