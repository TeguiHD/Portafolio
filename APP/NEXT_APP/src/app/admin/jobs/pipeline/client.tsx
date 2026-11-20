"use client";

import { useCallback, useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, CircleCheck, Clock, CircleX } from "lucide-react";
import { ApplicationCard } from "./components/ApplicationCard";
import { ApplicationDetailModal } from "./components/ApplicationDetailModal";
import { matchSearch } from "../utils";
import { STATUS_LABELS, STATUS_NEXT } from "../types";
import type { ApplicationItem, ApplicationStatus } from "../types";
import { moveApplicationStatusAction, deleteApplicationAction } from "./actions";
import { confirmar } from "@/modules/admin/confirmar/confirmar";
import { CAMPO, ENLACE, INTERRUPTOR, TITULO } from "../estilos";

const STATUS_GROUPS = [
    { key: "active", label: "En curso", icon: Clock, color: "text-[var(--acento)]" },
    { key: "accepted", label: "Aceptadas", icon: CircleCheck, color: "text-emerald-400" },
    { key: "rejected", label: "Cerradas", icon: CircleX, color: "text-[var(--mut)]" },
] as const;

type GroupKey = (typeof STATUS_GROUPS)[number]["key"];

function getGroupKey(status: ApplicationStatus): GroupKey {
    if (status === "ACCEPTED") return "accepted";
    if (status === "REJECTED" || status === "CLOSED") return "rejected";
    return "active";
}

export default function PipelineClient({
    initialApplications,
}: {
    initialApplications: ApplicationItem[];
}) {
    const router = useRouter();
    // Se lee de las props (no de un useState): tras mover, eliminar o anotar, router.refresh() trae la lista nueva
    // y la tarjeta cambia de grupo; con useState se quedaba como estaba hasta recargar la página.
    const applications = initialApplications;
    const [, startTransition] = useTransition();
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [groupFilter, setGroupFilter] = useState<GroupKey | "ALL">("ALL");
    // Se guarda el id para que el detalle abierto muestre la nota recién agregada cuando llegan los datos nuevos.
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selected = selectedId ? applications.find((a) => a.id === selectedId) ?? null : null;
    const id = useId();

    const filteredApplications = useMemo(() => {
        return applications.filter((item) => {
            if (groupFilter !== "ALL" && getGroupKey(item.status) !== groupFilter) return false;
            return matchSearch(search, [
                item.company,
                item.roleTitle,
                item.vacancy.title,
                item.vacancy.company,
                item.notes,
            ]);
        });
    }, [applications, search, groupFilter]);

    // Sort: active first, accepted second, rejected/closed last; within each group by lastStatusAt desc
    const sortedApplications = useMemo(() => {
        const groupOrder: Record<GroupKey, number> = { active: 0, accepted: 1, rejected: 2 };
        return [...filteredApplications].sort((a, b) => {
            const ga = groupOrder[getGroupKey(a.status)];
            const gb = groupOrder[getGroupKey(b.status)];
            if (ga !== gb) return ga - gb;
            return new Date(b.lastStatusAt).getTime() - new Date(a.lastStatusAt).getTime();
        });
    }, [filteredApplications]);

    const counts = useMemo(() => {
        const c = { active: 0, accepted: 0, rejected: 0 };
        for (const app of applications) {
            c[getGroupKey(app.status)]++;
        }
        return c;
    }, [applications]);

    const setPendingFor = useCallback((id: string, isPending: boolean) => {
        setPendingIds((prev) => {
            const next = new Set(prev);
            if (isPending) next.add(id);
            else next.delete(id);
            return next;
        });
    }, []);

    const handleMove = useCallback(
        (application: ApplicationItem, targetStatus: ApplicationStatus) => {
            if (application.status === targetStatus) return;
            setPendingFor(application.id, true);
            startTransition(async () => {
                const result = await moveApplicationStatusAction(application.id, targetStatus);
                setPendingFor(application.id, false);
                if ("error" in result) {
                    toast.error(result.error);
                    return;
                }
                toast.success(`Movida a ${STATUS_LABELS[targetStatus]}`);
                router.refresh();
            });
        },
        [router, setPendingFor]
    );

    const handleMoveNext = useCallback(
        (application: ApplicationItem) => {
            const next = STATUS_NEXT[application.status];
            if (!next) return;
            handleMove(application, next);
        },
        [handleMove]
    );

    const handleReject = useCallback(
        (application: ApplicationItem) => {
            handleMove(application, "REJECTED");
        },
        [handleMove]
    );

    const handleDelete = useCallback(
        async (application: ApplicationItem) => {
            if (!(await confirmar({ titulo: "¿Eliminar esta postulación?", detalle: "No se puede deshacer.", accion: "Eliminar", peligro: true }))) return;
            setPendingFor(application.id, true);
            startTransition(async () => {
                const result = await deleteApplicationAction(application.id);
                setPendingFor(application.id, false);
                if ("error" in result) {
                    toast.error(result.error);
                    return;
                }
                toast.success("Postulación eliminada");
                router.refresh();
            });
        },
        [router, setPendingFor]
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-[var(--txt)]">Seguimiento</h2>
                    <p className="mt-1 text-sm text-[var(--mut)]">Avanza el estado de cada postulación.</p>
                </div>
                <p aria-live="polite" className="font-mono text-xs text-[var(--mut)]">
                    {filteredApplications.length} de {applications.length} postulaciones
                </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative md:w-80">
                    <label htmlFor={`${id}-buscar`} className="sr-only">Buscar por empresa, cargo o nota</label>
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--mut)]" aria-hidden="true" />
                    <input
                        id={`${id}-buscar`}
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar empresa, cargo o nota"
                        className={`${CAMPO} pl-9`}
                    />
                </div>

                <div role="group" aria-label="Mostrar" className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        aria-pressed={groupFilter === "ALL"}
                        onClick={() => setGroupFilter("ALL")}
                        className={INTERRUPTOR}
                    >
                        Todas <span className="font-mono text-xs tabular-nums">{applications.length}</span>
                    </button>
                    {STATUS_GROUPS.map(({ key, label, icon: Icon, color }) => (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={groupFilter === key}
                            onClick={() => setGroupFilter(key)}
                            className={INTERRUPTOR}
                        >
                            <Icon className={`size-4 ${color}`} aria-hidden="true" />
                            {label}
                            <span className="font-mono text-xs tabular-nums">{counts[key]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {applications.length === 0 ? (
                <p className="border-t border-[var(--linea)] py-10 text-[var(--mut)]">
                    Aún no tienes postulaciones. Ve a{" "}
                    <a href="/admin/jobs/analysis" className={`${ENLACE} underline`}>Análisis y adaptación</a>{" "}
                    para crear la primera.
                </p>
            ) : sortedApplications.length === 0 ? (
                <p className="border-t border-[var(--linea)] py-10 text-[var(--mut)]">
                    Ninguna postulación coincide con la búsqueda o el filtro.
                </p>
            ) : (
                <div className="space-y-10">
                    {STATUS_GROUPS.map((group) => {
                        const items = sortedApplications.filter((app) => getGroupKey(app.status) === group.key);
                        if (items.length === 0) return null;
                        const Icon = group.icon;
                        return (
                            <section key={group.key} aria-labelledby={`${id}-${group.key}`}>
                                <h3 id={`${id}-${group.key}`} className={`${TITULO} mb-2 flex items-center gap-2`}>
                                    <Icon className={`size-4 ${group.color}`} aria-hidden="true" />
                                    {group.label}
                                    <small className="font-mono text-xs font-medium tabular-nums">{counts[group.key]}</small>
                                </h3>
                                <ul className="border-t border-[var(--linea)]">
                                    {items.map((app) => (
                                        <ApplicationCard
                                            key={app.id}
                                            application={app}
                                            onMoveNext={handleMoveNext}
                                            onReject={handleReject}
                                            onDelete={handleDelete}
                                            onOpenDetail={(a) => setSelectedId(a.id)}
                                            pending={pendingIds.has(app.id)}
                                        />
                                    ))}
                                </ul>
                            </section>
                        );
                    })}
                </div>
            )}

            {selected && (
                <ApplicationDetailModal application={selected} onClose={() => setSelectedId(null)} />
            )}
        </div>
    );
}
