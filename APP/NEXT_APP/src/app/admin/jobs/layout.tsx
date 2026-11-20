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
        <div className="max-w-[1180px] space-y-8">
            <header>
                <h1 className="text-[clamp(30px,3.6vw,44px)] font-extrabold leading-none tracking-[-0.04em] text-[var(--txt)]">
                    Postulaciones
                </h1>
                <p className="mt-3 max-w-[60ch] text-base text-[var(--mut)]">
                    Busca vacantes, compáralas con tu currículum y sigue cada postulación.
                </p>
            </header>
            <JobsSubNav />
            <div>{children}</div>
        </div>
    );
}
