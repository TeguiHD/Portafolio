import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createClientAction } from "@/modules/admin/clients/actions";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/clients
 * Creates a new quotation client
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { name, company, representative, email, phone, rut, address, contactName, contactEmail, contactPhone, contactRole } = body;

        if (!name?.trim()) {
            return NextResponse.json(
                { error: "El nombre es requerido" },
                { status: 400 }
            );
        }

        const result = await createClientAction({
            name,
            company,
            rut,
            address,
            contactName: contactName || representative,
            contactPhone: contactPhone || phone,
            contactEmail: contactEmail,
            contactRole: contactRole,
            email,
            userId: session.user.id,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({
            client: result.client,
            accessCode: result.accessCode,
        });
    } catch (error) {
        console.error("Error in clients API:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
