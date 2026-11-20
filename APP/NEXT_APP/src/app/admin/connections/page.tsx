import { redirect } from "next/navigation";
import { requirePagePermission } from "@/lib/page-security";
import { prisma } from "@/lib/prisma";
import { Users } from "lucide-react";
import CollaborationHub from "@/components/user/CollaborationHub";

export const metadata = {
    title: "Conexiones",
    description: "Gestiona tus conexiones con otros usuarios",
};

export default async function ConnectionsPage() {
    const session = await requirePagePermission("connections.view");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { sharingCode: true, id: true },
    });

    if (!user) {
        redirect("/acceso");
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="flex items-center gap-2.5 text-2xl sm:text-[28px] font-bold tracking-tight text-[var(--txt)]">
                    <Users size={22} aria-hidden="true" className="text-[var(--mut)]" />
                    Conexiones
                </h1>
                <p className="mt-1 text-[15px] text-[var(--mut)]">
                    Tu red de contactos para compartir clientes y cotizaciones.
                </p>
            </header>

            <CollaborationHub
                initialSharingCode={user.sharingCode || "No disponible"}
                currentUserId={user.id}
            />
        </div>
    );
}
