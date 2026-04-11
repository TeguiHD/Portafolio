import type { ReactNode } from "react";
import { requireAnyPermission } from "@/lib/page-security";
import { JobsSubNav } from "./components/JobsSubNav";

export const dynamic = "force-dynamic";

export default async function JobsLayout({ children }: { children: ReactNode }) {
    await requireAnyPermission([
        "jobs.vacancies.view",
        "jobs.applications.view",
    ]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Empleos & CV</h1>
                <p className="text-neutral-400 mt-1">
                    Buscar vacantes, adaptar tu CV con IA y dar seguimiento a tus postulaciones
                </p>
            </div>
            <JobsSubNav />
            <div>{children}</div>
        </div>
    );
}
