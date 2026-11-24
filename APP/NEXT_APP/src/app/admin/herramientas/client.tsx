"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Eye, Zap, Download, Globe, Lock, XCircle,
    ExternalLink, RefreshCw, ChevronDown, BarChart3, Wrench
} from "lucide-react";
import { EsqueletoSeccion } from "@/modules/admin/armazon/EsqueletoSeccion";

interface Tool {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    icon: string | null;
    category: string | null;
    isPublic: boolean;
    isActive: boolean;
    stats: {
        views: number;
        uses: number;
        downloads: number;
        total: number;
    };
}

type VisibilityStatus = "public" | "private" | "disabled";

const getVisibility = (tool: Tool): VisibilityStatus => {
    if (!tool.isActive) return "disabled";
    return tool.isPublic ? "public" : "private";
};

const visibilityConfig = {
    public: {
        label: "Pública",
        icon: Globe,
        insignia: "bg-emerald-500/10 text-emerald-400",
    },
    private: {
        label: "Solo admin",
        icon: Lock,
        insignia: "bg-amber-500/10 text-amber-400",
    },
    disabled: {
        label: "Desactivada",
        icon: XCircle,
        insignia: "bg-red-500/10 text-red-400",
    },
};

const numero = new Intl.NumberFormat("es-CL");
const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)]";
const SECUNDARIO = `inline-flex min-h-10 max-sm:min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--linea-2)] px-4 text-sm font-medium text-[var(--txt)] transition-colors duration-150 motion-reduce:transition-none hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] disabled:opacity-50 ${FOCO}`;
const PRINCIPAL = `inline-flex min-h-10 max-sm:min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--acento)] px-4 text-sm font-semibold text-[var(--acento-tinta)] transition-opacity duration-150 motion-reduce:transition-none hover:opacity-90 disabled:opacity-50 ${FOCO}`;
const ICONO = `grid size-10 max-sm:size-11 shrink-0 place-items-center rounded-lg text-[var(--mut)] transition-colors duration-150 motion-reduce:transition-none hover:bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] hover:text-[var(--txt)] ${FOCO}`;

export default function ToolsPageClient() {
    const [tools, setTools] = useState<Tool[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [expandedTool, setExpandedTool] = useState<string | null>(null);

    const fetchTools = async () => {
        setError(null);
        try {
            const res = await fetch("/api/tools/admin");
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    setError("No tienes permisos para ver las herramientas");
                } else {
                    setError("Error al cargar herramientas");
                }
                return;
            }
            const data = await res.json();
            setTools(data.tools || []);
        } catch (err) {
            console.error("Error fetching tools:", err);
            setError("Error de conexión al servidor");
        } finally {
            setLoading(false);
        }
    };

    const syncTools = async () => {
        setSyncing(true);
        try {
            const res = await fetch("/api/tools/admin/sync", { method: "POST" });
            if (res.ok) {
                await fetchTools();
            }
        } catch (error) {
            console.error("Error syncing tools:", error);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        fetchTools();
    }, []);

    const updateToolVisibility = async (tool: Tool, newStatus: VisibilityStatus) => {
        setUpdating(tool.id);
        try {
            let updates = {};
            switch (newStatus) {
                case "public":
                    updates = { isActive: true, isPublic: true };
                    break;
                case "private":
                    updates = { isActive: true, isPublic: false };
                    break;
                case "disabled":
                    updates = { isActive: false, isPublic: false };
                    break;
            }

            const res = await fetch(`/api/tools/admin/${tool.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });

            if (res.ok) {
                setTools((prev) =>
                    prev.map((t) => t.id === tool.id ? { ...t, ...updates } : t)
                );
            }
        } catch (error) {
            console.error("Error updating tool:", error);
        } finally {
            setUpdating(null);
        }
    };

    // Stats totals
    const totalViews = tools.reduce((acc, t) => acc + t.stats.views, 0);
    const totalUses = tools.reduce((acc, t) => acc + t.stats.uses, 0);
    const publicCount = tools.filter(t => t.isPublic).length;

    if (loading) {
        return <EsqueletoSeccion nombre="las herramientas" cifras={4} filas={6} />;
    }

    if (error) {
        return (
            <div className="max-w-[1180px]">
                <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[var(--txt)]">Herramientas</h1>
                <div role="alert" className="mt-8 flex flex-col items-center gap-3 border-y border-[var(--linea)] px-4 py-12 text-center">
                    <XCircle aria-hidden="true" size={28} className="text-red-400" />
                    <p className="max-w-sm text-sm text-[var(--txt)]">{error}</p>
                    <button
                        type="button"
                        onClick={() => {
                            setLoading(true);
                            fetchTools();
                        }}
                        className={SECUNDARIO}
                    >
                        <RefreshCw aria-hidden="true" size={16} />
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    const tasa = (t: Tool, decimales: number) => t.stats.views > 0 ? ((t.stats.uses / t.stats.views) * 100).toFixed(decimales) : 0;

    return (
        <div className="max-w-[1180px] space-y-8">
            {/* Encabezado */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[var(--txt)]">Herramientas</h1>
                    <p className="mt-1 text-[15px] text-[var(--mut)]">
                        Gestiona las herramientas de tu portafolio
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {tools.length < 10 && (
                        <button
                            type="button"
                            onClick={syncTools}
                            disabled={syncing}
                            aria-busy={syncing}
                            className={SECUNDARIO}
                        >
                            <RefreshCw aria-hidden="true" size={16} className={syncing ? "animate-spin motion-reduce:animate-none" : ""} />
                            Sincronizar
                        </button>
                    )}
                    <Link
                        href="/herramientas"
                        target="_blank"
                        className={SECUNDARIO}
                    >
                        <ExternalLink aria-hidden="true" size={16} className="text-[var(--mut)]" />
                        Ver públicas
                        <span className="sr-only"> (se abre en otra pestaña)</span>
                    </Link>
                </div>
            </header>

            {/* Cifras */}
            <dl aria-label="Resumen de herramientas" className="grid grid-cols-2 border-t border-[var(--linea)] md:grid-cols-4">
                {[
                    { etiqueta: "Total", valor: tools.length },
                    { etiqueta: "Públicas", valor: publicCount },
                    { etiqueta: "Vistas", valor: totalViews },
                    { etiqueta: "Usos", valor: totalUses },
                ].map((c) => (
                    <div key={c.etiqueta} className="flex flex-col-reverse border-b border-[var(--linea)] py-4 pr-4 md:[&:not(:first-child)]:border-l md:[&:not(:first-child)]:pl-5">
                        <dt className="text-[13.5px] text-[var(--mut)]">{c.etiqueta}</dt>
                        <dd className="text-[28px] font-bold tracking-tight tabular-nums text-[var(--txt)]">{numero.format(c.valor)}</dd>
                    </div>
                ))}
            </dl>

            {/* Lista */}
            {tools.length === 0 ? (
                <div className="flex flex-col items-center gap-3 border-y border-[var(--linea)] px-4 py-12 text-center">
                    <Wrench aria-hidden="true" size={28} className="text-[var(--mut)]" />
                    <h2 className="text-lg font-semibold text-[var(--txt)]">No hay herramientas</h2>
                    <p className="max-w-sm text-sm text-[var(--mut)]">
                        Ejecuta la sincronización o añade herramientas manualmente a la base de datos.
                    </p>
                    <button
                        type="button"
                        onClick={syncTools}
                        disabled={syncing}
                        className={PRINCIPAL}
                    >
                        <RefreshCw aria-hidden="true" size={16} className={syncing ? "animate-spin motion-reduce:animate-none" : ""} />
                        Sincronizar ahora
                    </button>
                </div>
            ) : (
                <section aria-labelledby="herramientas-lista">
                    <h2 id="herramientas-lista" className="mb-2 text-[15px] font-semibold text-[var(--mut)]">Todas las herramientas</h2>
                    <ul className="border-t border-[var(--linea)]">
                        {tools.map((tool) => {
                            const visibility = getVisibility(tool);
                            const config = visibilityConfig[visibility];
                            const VisIcon = config.icon;
                            const isExpanded = expandedTool === tool.id;
                            const panelId = `herramienta-${tool.id}-detalle`;

                            return (
                                <li key={tool.id} className="border-b border-[var(--linea)]">
                                    {/* Fila principal */}
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-1 py-3.5">
                                        <div className="min-w-0 flex-1 basis-48">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="truncate font-semibold text-[var(--txt)]">{tool.name}</h3>
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.insignia}`}>
                                                    <VisIcon aria-hidden="true" size={12} />
                                                    {config.label}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 truncate font-mono text-xs text-[var(--mut)]">
                                                /{tool.slug}
                                            </p>
                                        </div>

                                        {/* Cifras (escritorio) */}
                                        <dl className="hidden items-center gap-6 md:flex">
                                            {[
                                                { etiqueta: "vistas", valor: tool.stats.views },
                                                { etiqueta: "usos", valor: tool.stats.uses },
                                                { etiqueta: "descargas", valor: tool.stats.downloads },
                                            ].map((c) => (
                                                <div key={c.etiqueta} className="flex min-w-14 flex-col-reverse text-right">
                                                    <dt className="text-xs text-[var(--mut)]">{c.etiqueta}</dt>
                                                    <dd className="text-sm font-semibold tabular-nums text-[var(--txt)]">{numero.format(c.valor)}</dd>
                                                </div>
                                            ))}
                                        </dl>

                                        {/* Acciones */}
                                        <div className="flex items-center gap-1">
                                            <div className="relative">
                                                <label htmlFor={`visibilidad-${tool.id}`} className="sr-only">Visibilidad de {tool.name}</label>
                                                <select
                                                    id={`visibilidad-${tool.id}`}
                                                    value={visibility}
                                                    onChange={(e) => updateToolVisibility(tool, e.target.value as VisibilityStatus)}
                                                    disabled={updating === tool.id}
                                                    aria-busy={updating === tool.id}
                                                    className="min-h-10 max-sm:min-h-11 cursor-pointer appearance-none rounded-lg border border-[var(--linea-2)] bg-[var(--fondo-2)] pl-3 pr-8 text-sm text-[var(--txt)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--acento)] disabled:opacity-50"
                                                >
                                                    <option value="public">Pública</option>
                                                    <option value="private">Solo admin</option>
                                                    <option value="disabled">Desactivada</option>
                                                </select>
                                                {updating === tool.id ? (
                                                    <span aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 rounded-full border-2 border-[var(--mut)] border-t-transparent animate-spin motion-reduce:animate-none" />
                                                ) : (
                                                    <ChevronDown aria-hidden="true" size={16} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--mut)]" />
                                                )}
                                            </div>

                                            <a
                                                href={`/herramientas/${tool.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={ICONO}
                                                title="Ver herramienta"
                                                aria-label={`Ver ${tool.name} en el sitio (se abre en otra pestaña)`}
                                            >
                                                <ExternalLink aria-hidden="true" size={16} />
                                            </a>

                                            <Link
                                                href={`/admin/herramientas/${tool.id}`}
                                                className={`${ICONO} max-md:hidden`}
                                                title="Ver estadísticas"
                                                aria-label={`Estadísticas de ${tool.name}`}
                                            >
                                                <BarChart3 aria-hidden="true" size={16} />
                                            </Link>

                                            <button
                                                type="button"
                                                onClick={() => setExpandedTool(isExpanded ? null : tool.id)}
                                                className={ICONO}
                                                title={isExpanded ? "Colapsar" : "Ver más detalles"}
                                                aria-label={`${isExpanded ? "Ocultar" : "Ver"} detalles de ${tool.name}`}
                                                aria-expanded={isExpanded}
                                                aria-controls={panelId}
                                            >
                                                <ChevronDown
                                                    aria-hidden="true"
                                                    size={16}
                                                    className={`transition-transform duration-150 motion-reduce:transition-none ${isExpanded ? "rotate-180" : ""}`}
                                                />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Detalle */}
                                    {isExpanded && (
                                        <div id={panelId} className="space-y-4 border-t border-[var(--linea)] px-1 pb-4 pt-3">
                                            {tool.description && (
                                                <p className="text-sm text-[var(--mut)]">{tool.description}</p>
                                            )}

                                            {/* Cifras en celular (en escritorio van en la fila) */}
                                            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 md:hidden">
                                                {[
                                                    { etiqueta: "vistas", valor: numero.format(tool.stats.views), Icono: Eye },
                                                    { etiqueta: "usos", valor: numero.format(tool.stats.uses), Icono: Zap },
                                                    { etiqueta: "descargas", valor: numero.format(tool.stats.downloads), Icono: Download },
                                                    { etiqueta: "conversión", valor: `${tasa(tool, 0)}%`, Icono: BarChart3 },
                                                ].map(({ etiqueta, valor, Icono }) => (
                                                    <div key={etiqueta} className="flex flex-col-reverse">
                                                        <dt className="flex items-center gap-1.5 text-xs text-[var(--mut)]">
                                                            <Icono aria-hidden="true" size={14} />
                                                            {etiqueta}
                                                        </dt>
                                                        <dd className="text-base font-semibold tabular-nums text-[var(--txt)]">{valor}</dd>
                                                    </div>
                                                ))}
                                            </dl>

                                            {/* Conversión en escritorio */}
                                            <p className="hidden flex-wrap items-center gap-x-4 gap-y-1 text-sm md:flex">
                                                <span className="text-[var(--mut)]">
                                                    Tasa de conversión: <b className="font-semibold tabular-nums text-[var(--txt)]">{tasa(tool, 1)}%</b>
                                                </span>
                                                <span className="text-[var(--mut)]">
                                                    Total de interacciones: <b className="font-semibold tabular-nums text-[var(--txt)]">{numero.format(tool.stats.total)}</b>
                                                </span>
                                            </p>

                                            <Link
                                                href={`/admin/herramientas/${tool.id}`}
                                                className={`${SECUNDARIO} w-full sm:w-auto`}
                                            >
                                                <BarChart3 aria-hidden="true" size={16} className="text-[var(--mut)]" />
                                                Ver estadísticas detalladas
                                            </Link>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}
        </div>
    );
}
