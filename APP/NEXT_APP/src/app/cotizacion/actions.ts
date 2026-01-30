"use server";

import { QuotationSecureService } from "@/services/quotation-secure";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function verifyAccessAction(slug: string, formData: FormData) {
    const code = formData.get("accessCode") as string;

    // Get IP for rate limiting (fallback to generic string if behind proxy/locally)
    const ip = "client-ip"; // In real prod, get from headers

    const result = await QuotationSecureService.validateAccess(slug, code, ip);

    if (!result.success) {
        return { success: false, error: result.error };
    }

    // Success: Set secure session cookie
    const cookieStore = await cookies();
    cookieStore.set(`qt_access_${slug}`, "authorized", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 2, // 2 hours
        path: `/cotizacion/${slug}`
    });

    redirect(`/cotizacion/${slug}/dashboard`);
}
