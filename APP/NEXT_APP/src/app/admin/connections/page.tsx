import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Users } from "lucide-react";
import ConnectionManager from "@/components/user/ConnectionManager";

export const metadata = {
    title: "Conexiones | Admin Panel",
    description: "Gestiona tus conexiones con otros usuarios",
};

export default async function ConnectionsPage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/acceso");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { sharingCode: true, id: true },
    });

    if (!user) {
        redirect("/acceso");
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl">
                        <Users className="text-indigo-400" size={24} />
                    </div>
                    Conexiones
                </h1>
                <p className="text-slate-400">
                    Gestiona tu red de contactos para compartir clientes y cotizaciones.
                </p>
            </div>

            <ConnectionManager
                sharingCode={user.sharingCode || "No disponible"}
                currentUserId={user.id}
            />
        </div>
    );
}
