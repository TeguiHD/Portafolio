import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateQuotationWithAI } from "@/services/quotation-ai";

export async function POST(request: NextRequest) {
    try {
        // Verify authentication
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const body = await request.json();
        const { clientName, projectName, projectType, description, requirements } = body;

        // Validate required fields
        if (!clientName || !projectName || !description) {
            return NextResponse.json(
                { error: "Faltan campos requeridos (clientName, projectName, description)" },
                { status: 400 }
            );
        }

        // Generate quotation with AI
        const result = await generateQuotationWithAI({
            clientName,
            projectName,
            projectType: projectType || "website",
            description,
            requirements: requirements || [],
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || "Error al generar cotización" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            scope: result.scope,
            services: result.services,
            exclusions: result.exclusions,
            timeline: result.timeline,
            paymentTerms: result.paymentTerms,
            latencyMs: result.latencyMs,
        });
    } catch (error) {
        console.error("Quotation generation error:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
