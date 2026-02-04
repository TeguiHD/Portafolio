
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Generate a new secure, random 12-character code
        // Format: APP-XXXX-YYYY (readable but secure)
        const randomBytes = crypto.randomBytes(4).toString('hex').toUpperCase();
        const timestamp = Date.now().toString().slice(-4);
        const newCode = `LINK-${randomBytes}-${timestamp}`;

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: { sharingCode: newCode },
            select: { sharingCode: true }
        });

        // Log security event (optional but good practice)
        // await createAuditLog(...) 

        return NextResponse.json({ success: true, newCode: updatedUser.sharingCode });
    } catch (error) {
        console.error("Error rotating code:", error);
        return NextResponse.json({ error: "Failed to rotate code" }, { status: 500 });
    }
}
