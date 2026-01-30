"use server";

import { QuotationAccessService } from "@/services/quotation-access";
import { cookies } from "next/headers";
import { headers } from "next/headers";

export async function verifyQuotationAccessAction(
    clientSlug: string,
    quotationSlug: string,
    code: string
) {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";

    const result = await QuotationAccessService.validateCode(
        clientSlug,
        quotationSlug,
        code,
        ip
    );

    if (result.allowed) {
        // Set session cookie
        const cookieStore = await cookies();
        cookieStore.set(`qt_access_${clientSlug}_${quotationSlug}`, "authorized", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 // 24 hours
        });

        return { success: true };
    }

    // Return error with context
    const messages: Record<string, string> = {
        "invalid": `Código incorrecto. ${result.remainingAttempts !== undefined ? `Intentos restantes: ${result.remainingAttempts}` : ""}`,
        "expired": "Este código ha expirado. Contacta al proveedor para uno nuevo.",
        "rate_limited": "Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.",
        "not_found": "Cotización no encontrada."
    };

    return {
        success: false,
        error: messages[result.reason] || "Error de acceso"
    };
}
