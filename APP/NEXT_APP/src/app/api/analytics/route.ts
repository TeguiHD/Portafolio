import { NextRequest, NextResponse } from "next/server";
import { ipCliente } from "@/lib/ip-cliente";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hashIdentifier } from "@/lib/security.server";
import { checkRateLimit } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from "@/generated/prisma/client";
import { datosVisitas, diasDelRango } from "@/app/admin/analytics/datos";

// Track page views and CTA clicks (public endpoint, rate-limited)
function origenExterno(valor: unknown, propio: string): string | undefined {
    if (typeof valor !== "string" || !valor || valor.length > 2000) return undefined;
    try {
        const u = new URL(valor);
        if (u.protocol !== "https:" && u.protocol !== "http:") return undefined;
        const host = u.hostname.replace(/^www\./, "");
        if (host === propio.replace(/^www\./, "").split(":")[0]) return undefined;
        return `${u.protocol}//${u.hostname}`;
    } catch {
        return undefined;
    }
}

export async function POST(request: NextRequest) {
    try {
        const ipRaw = ipCliente(request.headers);

        // Rate limiting: 30 events/minute per IP (OWASP A04 — unrestricted resource consumption)
        const rateLimit = await checkRateLimit(`analytics:${ipRaw}`, 30, 60);
        if (!rateLimit.allowed) {
            return NextResponse.json({ success: true }); // Silent — don't expose rate limit info
        }

        const body = await request.json();
        const { type, action, path, label, metadata, origen } = body;

        // Validate event type (whitelist)
        if (type !== "pageview" && type !== "cta") {
            return NextResponse.json({ success: true }); // Silent ignore
        }

        const userAgent = request.headers.get("user-agent") || undefined;
        const ip = ipRaw !== "unknown" ? hashIdentifier(ipRaw) : undefined;
        // De dónde llegó la visita: el navegador manda document.referrer en la primera página (el Referer de este fetch
        // es la propia página del sitio). Solo se guarda el sitio de origen, nunca la URL completa.
        const referrer = origenExterno(origen, request.nextUrl.host);

        // Sanitize scalar string inputs — prevent large payload DB writes
        const safePath = typeof path === "string" ? path.slice(0, 500) : "/";
        const safeAction = typeof action === "string"
            ? action.replace(/[^a-zA-Z0-9_\- ]/g, "").slice(0, 100)
            : "unknown";
        const safeLabel = typeof label === "string" ? label.slice(0, 200) : undefined;

        // Sanitize metadata: only scalar values, max 10 keys, no nested objects
        // Prevents prototype pollution and oversized DB writes
        let safeMetadata: Record<string, string | number | boolean> | undefined;
        if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
            safeMetadata = {};
            const entries = Object.entries(metadata as Record<string, unknown>).slice(0, 10);
            for (const [k, v] of entries) {
                const safeKey = String(k).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 50);
                if (typeof v === "string") safeMetadata[safeKey] = v.slice(0, 200);
                else if (typeof v === "number" || typeof v === "boolean") safeMetadata[safeKey] = v;
            }
        }

        if (type === "pageview") {
            await prisma.pageView.create({
                data: {
                    path: safePath,
                    referrer,
                    userAgent,
                    ip,
                },
            });
        } else if (type === "cta") {
            await prisma.ctaClick.create({
                data: {
                    action: safeAction,
                    label: safeLabel,
                    metadata: safeMetadata,
                    referrer,
                    userAgent,
                },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error("Analytics tracking error", error);
        return NextResponse.json({ error: "Failed to track event" }, { status: 500 });
    }
}

// Cifras de «Visitas»: solo con el permiso analytics.view (OWASP A01), contadas en la base con la misma regla que «Hoy».
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }
        const rol = (session.user.role || "USER") as Role;
        const [puedeVer, verPropuestas] = await Promise.all([
            hasPermission(session.user.id, rol, "analytics.view"),
            hasPermission(session.user.id, rol, "quotations.view"),
        ]);
        if (!puedeVer) {
            return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
        }

        const dias = diasDelRango(new URL(request.url).searchParams.get("days"));
        return NextResponse.json(await datosVisitas(dias, session.user.id, verPropuestas));
    } catch (error) {
        logger.error("Analytics fetch error", error);
        return NextResponse.json({ error: "No se pudieron cargar las visitas" }, { status: 500 });
    }
}
