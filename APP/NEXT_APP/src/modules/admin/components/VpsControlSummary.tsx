"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
    Activity,
    AlertTriangle,
    ArrowUpRight,
    Cpu,
    HardDrive,
    Loader2,
    MemoryStick,
    Thermometer,
} from "lucide-react";

interface VpsSummaryData {
    hostname: string;
    uptime: string;
    cpu: {
        usagePercent: number;
        idle: number;
        cores: number;
        model?: string;
    };
    memory: {
        totalMB: number;
        usedMB: number;
        usagePercent: number;
    };
    disks: Array<{
        used: string;
        size: string;
        usePercent: number;
        mountpoint: string;
    }>;
    temperatures: Array<{
        label: string;
        valueC: number;
    }>;
    connectionSummary: {
        total: number;
        established: number;
        listening: number;
    };
    status: {
        connected: boolean;
        degraded: boolean;
        warnings: string[];
        sampledAt: string;
        ssh?: {
            configured: boolean;
            hostConfigured: boolean;
            userConfigured: boolean;
            portValid: boolean;
            authMethod: "key" | "password" | "none";
            missing: string[];
        };
    };
}

function SummaryMetric({
    icon,
    label,
    value,
    sub,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center gap-2 text-accent-1">{icon}</div>
            <p className="text-xs text-neutral-500">{label}</p>
            <p className="mt-1 text-xl font-bold text-white">{value}</p>
            {sub && <p className="mt-1 text-xs text-neutral-500">{sub}</p>}
        </div>
    );
}

export function VpsControlSummary() {
    const [data, setData] = useState<VpsSummaryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            try {
                const res = await fetch("/api/superadmin/system", {
                    cache: "no-store",
                    credentials: "include",
                });
                const json = await res.json();

                if (!res.ok) {
                    throw new Error(json.error || "No se pudo cargar el estado del VPS");
                }

                if (isMounted) {
                    setData(json.data as VpsSummaryData);
                    setError(null);
                }
            } catch (requestError) {
                if (isMounted) {
                    setError(requestError instanceof Error ? requestError.message : "No se pudo cargar el estado del VPS");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        void load();
        const interval = window.setInterval(load, 30000);

        return () => {
            isMounted = false;
            window.clearInterval(interval);
        };
    }, []);

    const hottestSensor = data?.temperatures.reduce((current, reading) => {
        if (!current || reading.valueC > current.valueC) {
            return reading;
        }
        return current;
    }, data.temperatures[0]);
    const rootDisk = data?.disks[0];
    const cpuSub = data
        ? (data.cpu.model || (data.cpu.cores > 0 ? `${data.cpu.cores} cores` : "Sin muestra de cores"))
        : "Sin muestra";
    const memoryHasSample = Boolean(data && data.memory.totalMB > 0);
    const memoryValue = memoryHasSample && data ? `${Math.round(data.memory.usagePercent)}%` : "N/D";
    const memorySub = memoryHasSample && data
        ? `${data.memory.usedMB}/${data.memory.totalMB} MB`
        : "Sin muestra valida";
    const connectionHasSample = Boolean(data && (data.status.connected || data.connectionSummary.total > 0));

    return (
        <section className="glass-panel rounded-2xl border border-accent-1/20 p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white">VPS Control</h2>
                    <p className="mt-1 text-sm text-neutral-400">
                        Estado operativo del servidor y salud del host en tiempo real.
                    </p>
                </div>
                <Link
                    href="/admin/superadmin"
                    className="inline-flex items-center gap-2 rounded-xl border border-accent-1/20 bg-accent-1/10 px-4 py-2 text-sm font-medium text-accent-1 transition-colors hover:bg-accent-1/15"
                >
                    Abrir panel VPS
                    <ArrowUpRight size={14} />
                </Link>
            </div>

            {loading && !data ? (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-neutral-400">
                    <Loader2 size={16} className="animate-spin text-accent-1" />
                    Cargando métricas del VPS...
                </div>
            ) : error && !data ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-5 text-sm text-red-300">
                    {error}
                </div>
            ) : data ? (
                <div className="space-y-5">
                    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`h-2.5 w-2.5 rounded-full ${data.status.connected ? (data.status.degraded ? "bg-amber-400" : "bg-emerald-400") : "bg-red-400"}`} />
                            <div>
                                <p className="text-sm font-medium text-white">{data.hostname}</p>
                                <p className="text-xs text-neutral-500">Uptime: {data.uptime}</p>
                            </div>
                        </div>
                        <p className="text-xs text-neutral-500">
                            Última muestra: {new Date(data.status.sampledAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                    </div>

                    {data.status.warnings.length > 0 && (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-4">
                            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-300">
                                <AlertTriangle size={16} />
                                Señales de degradación
                            </div>
                            <div className="space-y-1 text-xs text-amber-200/90">
                                {data.status.warnings.slice(0, 3).map((warning) => (
                                    <p key={warning}>{warning}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                        <SummaryMetric
                            icon={<Cpu size={18} />}
                            label="CPU"
                            value={`${Math.round(data.cpu.usagePercent)}%`}
                            sub={cpuSub}
                        />
                        <SummaryMetric
                            icon={<MemoryStick size={18} />}
                            label="RAM"
                            value={memoryValue}
                            sub={memorySub}
                        />
                        <SummaryMetric
                            icon={<HardDrive size={18} />}
                            label="Disco"
                            value={rootDisk ? `${rootDisk.usePercent}%` : "N/D"}
                            sub={rootDisk ? `${rootDisk.used}/${rootDisk.size}` : "Sin volumen principal"}
                        />
                        <SummaryMetric
                            icon={<Activity size={18} />}
                            label="Conexiones"
                            value={connectionHasSample ? String(data.connectionSummary.established) : "N/D"}
                            sub={connectionHasSample
                                ? `${data.connectionSummary.total} sockets · ${data.connectionSummary.listening} en escucha`
                                : "Sin muestra valida"}
                        />
                        <SummaryMetric
                            icon={<Thermometer size={18} />}
                            label="Temperatura"
                            value={hottestSensor ? `${hottestSensor.valueC.toFixed(1)}°C` : "N/D"}
                            sub={hottestSensor?.label || "Sin sensores disponibles"}
                        />
                    </div>

                    {!data.status.connected && (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-4 text-xs text-red-300">
                            {data.status.ssh && !data.status.ssh.configured
                                ? `Falta configuracion SSH del VPS (${data.status.ssh.missing.join(", ")}). Completa esas variables y reinicia el servicio web.`
                                : "El dashboard no esta recibiendo una muestra util del host. Entra al panel VPS para revisar conectividad SSH, comandos permitidos y permisos del sistema."}
                        </div>
                    )}
                </div>
            ) : null}
        </section>
    );
}