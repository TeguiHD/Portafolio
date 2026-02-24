import { verifyAdmin } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PropuestasPage() {
    const session = await verifyAdmin();

    const canView = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "quotations.view"
    );
    if (!canView) redirect("/admin/gestion-comercial");

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Propuestas</h1>
                <p className="text-neutral-400 mt-1">
                    Gestiona cotizaciones y propuestas comerciales
                </p>
            </div>

            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center space-y-4">
                <div className="text-4xl">📄</div>
                <p className="text-neutral-300 font-medium">
                    El sistema de propuestas utiliza el módulo de Cotizaciones existente
                </p>
                <p className="text-sm text-neutral-500">
                    Desde aquí podrás acceder a todas las cotizaciones organizadas por cliente y estado
                </p>
                <Link
                    href="/admin/cotizaciones"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-1/10 text-accent-1 hover:bg-accent-1/20 border border-accent-1/20 transition-all font-medium text-sm"
                >
                    Ir a Cotizaciones →
                </Link>
            </div>
        </div>
    );
}
