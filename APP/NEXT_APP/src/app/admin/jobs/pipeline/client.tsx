"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Kanban, Search, CheckCircle2, Clock, XCircle, Inbox } from "lucide-react";
import { ApplicationCard } from "./components/ApplicationCard";
import { ApplicationDetailModal } from "./components/ApplicationDetailModal";
import { matchSearch } from "../utils";
import { STATUS_LABELS, STATUS_NEXT, STATUS_TERMINAL } from "../types";
import type { ApplicationItem, ApplicationStatus } from "../types";
import { moveApplicationStatusAction, deleteApplicationAction } from "./actions";

const STATUS_GROUPS = [
    { key: "active", label: "En curso", icon: Clock, color: "text-cyan-400" },
    { key: "accepted", label: "Aceptadas", icon: CheckCircle2, color: "text-emerald-400" },
    { key: "rejected", label: "Cerradas", icon: XCircle, color: "text-neutral-500" },
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
    const [applications] = useState<ApplicationItem[]>(initialApplications);
    const [, startTransition] = useTransition();
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [groupFilter, setGroupFilter] = useState<GroupKey | "ALL">("ALL");
    const [selected, setSelected] = useState<ApplicationItem | null>(null);

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
        (application: ApplicationItem) => {
            if (!confirm("¿Eliminar esta postulación? Esta acción es irreversible.")) return;
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

    // Detect group transitions in the sorted list for section headers
    const renderedItems = useMemo(() => {
        const items: Array<{ type: "header"; groupKey: GroupKey } | { type: "card"; app: ApplicationItem }> = [];
        let lastGroup: GroupKey | null = null;
        for (const app of sortedApplications) {
            const g = getGroupKey(app.status);
            if (g !== lastGroup) {
                items.push({ type: "header", groupKey: g });
                lastGroup = g;
            }
            items.push({ type: "card", app });
        }
        return items;
    }, [sortedApplications]);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Kanban className="w-5 h-5 text-accent-1" />
                        Gestor de Postulaciones
                    </h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                        Línea de tiempo interactiva · avanza el estado de cada postulación
                    </p>
                </div>
                <span className="text-xs text-neutral-500 font-mono">
                    {filteredApplications.length} de {applications.length} postulaciones
                </span>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar empresa, rol..."
                        className="w-full rounded-xl bg-[#0f172a] border border-white/10 pl-9 pr-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-accent-1/40 focus:outline-none transition-colors"
                    />
                </div>

                {/* Group filter */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setGroupFilter("ALL")}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            groupFilter === "ALL"
                                ? "bg-accent-1/15 text-accent-1 border-accent-1/30"
                                : "bg-white/5 text-neutral-400 border-white/10 hover:text-white hover:border-white/20"
                        }`}
                    >
                        Todas <span className="font-mono ml-1 opacity-70">{applications.length}</span>
                    </button>
                    {STATUS_GROUPS.map(({ key, label, icon: Icon, color }) => (
                        <button
                            key={key}
                            onClick={() => setGroupFilter(key)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                                groupFilter === key
                                    ? "bg-accent-1/15 text-accent-1 border-accent-1/30"
                                    : "bg-white/5 text-neutral-400 border-white/10 hover:text-white hover:border-white/20"
                            }`}
                        >
                            <Icon className={`w-3.5 h-3.5 ${groupFilter === key ? "text-accent-1" : color}`} />
                            {label}
                            <span className="font-mono opacity-70">{counts[key]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            {applications.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0a0f1c]/40 p-14 text-center">
                    <Inbox className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
                    <p className="text-sm text-neutral-400">
                        No tienes postulaciones aún. Ve a{" "}
                        <a href="/admin/jobs/analysis" className="text-accent-1 underline">
                            Análisis
                        </a>{" "}
                        para crear tu primera.
                    </p>
                </div>
            ) : sortedApplications.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0a0f1c]/40 p-10 text-center">
                    <Search className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
                    <p className="text-sm text-neutral-400">Sin resultados para los filtros actuales.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {renderedItems.map((item, i) => {
                        if (item.type === "header") {
                            const group = STATUS_GROUPS.find((g) => g.key === item.groupKey)!;
                            const Icon = group.icon;
                            return (
                                <div
                                    key={`header-${item.groupKey}-${i}`}
                                    className={`flex items-center gap-2 pt-4 pb-1 px-1 ${i === 0 ? "pt-0" : ""}`}
                                >
                                    <Icon className={`w-3.5 h-3.5 ${group.color}`} />
                                    <span className={`text-xs font-bold uppercase tracking-widest ${group.color}`}>
                                        {group.label}
                                    </span>
                                    <span className="text-[10px] font-mono text-neutral-600 ml-0.5">
                                        {counts[item.groupKey]}
                                    </span>
                                    <div className="flex-1 h-px bg-white/5 ml-1" />
                                </div>
                            );
                        }

                        return (
                            <ApplicationCard
                                key={item.app.id}
                                application={item.app}
                                onMoveNext={handleMoveNext}
                                onReject={handleReject}
                                onDelete={handleDelete}
                                onOpenDetail={setSelected}
                                pending={pendingIds.has(item.app.id)}
                            />
                        );
                    })}
                </div>
            )}

            {selected && (
                <ApplicationDetailModal application={selected} onClose={() => setSelected(null)} />
            )}
        </div>
    );
}
