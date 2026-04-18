import { NextRequest } from "next/server";
import { secureApiEndpoint, secureErrorResponse, secureJsonResponse } from "@/lib/api-security";
import { getCvLoadMetrics } from "@/lib/cv-load-balancer";

// GET /api/admin/cv/load
// Internal metrics endpoint for CV load monitoring dashboards.
export async function GET(request: NextRequest) {
    const security = await secureApiEndpoint(request, {
        requireAuth: true,
        requiredPermission: "analytics.view",
        rateLimit: { limit: 60, windowMs: 60_000 },
        checkAnomalies: true,
        auditAccess: true,
    });

    if (security.error) {
        return security.error;
    }

    try {
        const metrics = await getCvLoadMetrics();

        return secureJsonResponse({
            success: true,
            data: metrics,
        });
    } catch (error) {
        return secureErrorResponse("Failed to load CV metrics", 500, error as Error);
    }
}
