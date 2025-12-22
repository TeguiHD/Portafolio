import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // In a real implementation, you would mark this reminder as dismissed in the database
        // For now, we just return success since reminders are generated dynamically
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error dismissing reminder:", error);
        return NextResponse.json(
            { error: "Error al descartar recordatorio" },
            { status: 500 }
        );
    }
}
