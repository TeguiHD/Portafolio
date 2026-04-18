"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { StudioCard, StudioChip, StudioMetric } from "@/components/tools/ImageStudio";
import { DNS_RECORD_TYPES, DNS_RESOLVER_NODES, type DnsRecordType } from "@/lib/tools/dns-resolvers";

const ACCENT = "#3B82F6";

interface DnsNodeRecord {
    value: string;
    ttl: number | null;
}

interface DnsNodeResult {
    id: string;
    name: string;
    location: string;
    region: string;
    ip: string;
    description: string;
    x: number;
    y: number;
    status: "pending" | "success" | "error";
    records: DnsNodeRecord[];
    durationMs?: number;
    error?: string;
}

interface DnsResponse {
    domain: string;
    type: DnsRecordType;
    generatedAt: string;
    totalDurationMs: number;
    summary: {
        successfulResolvers: number;
        failedResolvers: number;
        consistentAnswers: boolean;
        fastestResolver: { id: string; name: string; durationMs: number } | null;
    };
    nodes: DnsNodeResult[];
}

function isValidDomain(domain: string): boolean {
    const cleaned = domain.replace(/^https?:\/\//, "").split("/")[0].split(":")[0].trim().toLowerCase();
    const blocklist = ["localhost", "127.0.0.1", "0.0.0.0", "::1", ".local", ".internal"];

    if (blocklist.some(token => cleaned.includes(token))) return false;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(cleaned)) return false;

    return /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(cleaned);
}

function cleanDomain(input: string) {
    return input.replace(/^https?:\/\//, "").split("/")[0].split(":")[0].trim().toLowerCase();
}

function getStatusStyles(status: DnsNodeResult["status"]) {
    if (status === "success") {
        return {
            dot: "bg-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.55)]",
            ring: "border-emerald-400/60 bg-emerald-500/10",
            label: "text-emerald-300",
        };
    }

    if (status === "error") {
        return {
            dot: "bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.45)]",
            ring: "border-red-400/60 bg-red-500/10",
            label: "text-red-300",
        };
    }

    return {
        dot: "bg-blue-300 animate-pulse shadow-[0_0_18px_rgba(96,165,250,0.35)]",
        ring: "border-blue-400/50 bg-blue-500/10",
        label: "text-blue-200",
    };
}

export default function DnsCheckerPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("dns");
    const [domain, setDomain] = useState("");
    const [recordType, setRecordType] = useState<DnsRecordType>("A");
    const [results, setResults] = useState<DnsNodeResult[]>([]);
    const [response, setResponse] = useState<DnsResponse | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCheck = useCallback(async () => {
        const cleaned = cleanDomain(domain);

        if (!cleaned) return;

        if (!isValidDomain(cleaned)) {
            setError("Dominio inválido. Usa un FQDN público como ejemplo.com.");
            return;
        }

        setError(null);
        setIsChecking(true);
        setResponse(null);
        setResults(DNS_RESOLVER_NODES.map(node => ({ ...node, status: "pending", records: [] })));

        try {
            const dnsResponse = await fetch(`/api/tools/dns?domain=${encodeURIComponent(cleaned)}&type=${recordType}`, {
                cache: "no-store",
            });
            const data = await dnsResponse.json();

            if (!dnsResponse.ok) {
                throw new Error(data.error || "No se pudo consultar la propagación DNS");
            }

            setResponse(data);
            setResults(data.nodes);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "No se pudo consultar la propagación DNS");
            setResults(DNS_RESOLVER_NODES.map(node => ({
                ...node,
                status: "error",
                records: [],
                error: "No disponible",
            })));
        } finally {
            setIsChecking(false);
        }
    }, [domain, recordType]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Verificador DNS"} />;
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#17345c_0%,#0F1724_35%,#08111f_100%)]">
            <main className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24">
                <div className="mb-8 max-w-3xl">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">DNS real</p>
                    <h1 className="text-3xl font-bold text-white sm:text-4xl">Verificar DNS por resolvedor</h1>
                    <p className="mt-3 text-sm leading-6 text-neutral-400 sm:text-base">
                        Consulta varios resolvedores públicos desde backend, compara respuestas y detecta propagación parcial con datos reales.
                    </p>
                </div>

                <StudioCard
                    title="Consulta DNS"
                    description="El backend consulta cada resolvedor por su IP pública para comparar respuestas reales."
                    eyebrow="Consulta"
                    accentColor={ACCENT}
                >
                    <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
                        <div className="space-y-3">
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <input
                                    type="text"
                                    value={domain}
                                    onChange={(event) => setDomain(event.target.value)}
                                    onKeyDown={(event) => event.key === "Enter" && handleCheck()}
                                    placeholder="ejemplo.com"
                                    className="flex-1 rounded-2xl border border-white/10 bg-[#08111f] px-4 py-3 text-white outline-none transition-all placeholder:text-neutral-600 focus:border-blue-400/40 focus:ring-2 focus:ring-blue-400/20"
                                    spellCheck={false}
                                    maxLength={253}
                                />
                                <button
                                    onClick={handleCheck}
                                    disabled={isChecking || !domain.trim()}
                                    className="rounded-2xl px-6 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                                    style={{ background: `linear-gradient(135deg, ${ACCENT}, #60A5FA)` }}
                                >
                                    {isChecking ? "Consultando..." : "Verificar propagación"}
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {DNS_RECORD_TYPES.map(record => (
                                    <button
                                        key={record.id}
                                        onClick={() => setRecordType(record.id)}
                                        className="rounded-full px-3 py-2 text-xs font-semibold transition-all"
                                        style={recordType === record.id
                                            ? { backgroundColor: `${ACCENT}24`, color: "white", boxShadow: `0 0 0 1px ${ACCENT}` }
                                            : { backgroundColor: "rgba(255,255,255,0.05)", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.1)" }}
                                        title={record.desc}
                                    >
                                        {record.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <StudioMetric label="Resolvedores" value={`${DNS_RESOLVER_NODES.length} nodos`} accentColor={ACCENT} />
                            <StudioMetric label="Modo" value="Consultas directas" accentColor={ACCENT} />
                            <StudioMetric label="Origen" value="Backend Node DNS" accentColor={ACCENT} />
                            <StudioMetric label="Seguridad" value="Dominio público validado" accentColor={ACCENT} />
                        </div>
                    </div>
                </StudioCard>

                {error && (
                    <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                {results.length > 0 && (
                    <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                        <StudioCard
                            title="Mapa de resolvedores"
                            description="Cada punto representa un resolvedor consultado con su estado y tiempo de respuesta."
                            eyebrow="Vista"
                            accentColor={ACCENT}
                        >
                            <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#07101d] p-4">
                                <div
                                    className="relative h-[320px] rounded-[20px] border border-white/5"
                                    style={{
                                        backgroundImage: "radial-gradient(circle at 18% 35%, rgba(255,255,255,0.09) 0, rgba(255,255,255,0.02) 9%, transparent 10%), radial-gradient(circle at 30% 62%, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.015) 8%, transparent 9%), radial-gradient(circle at 52% 36%, rgba(255,255,255,0.08) 0, rgba(255,255,255,0.02) 11%, transparent 12%), radial-gradient(circle at 56% 58%, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.015) 7%, transparent 8%), radial-gradient(circle at 74% 44%, rgba(255,255,255,0.07) 0, rgba(255,255,255,0.018) 10%, transparent 11%), linear-gradient(180deg, rgba(59,130,246,0.12), rgba(8,17,31,0.92))",
                                    }}
                                >
                                    <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                    <div className="absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                                    {results.map(result => {
                                        const styles = getStatusStyles(result.status);

                                        return (
                                            <div
                                                key={result.id}
                                                className="absolute -translate-x-1/2 -translate-y-1/2"
                                                style={{ left: `${result.x}%`, top: `${result.y}%` }}
                                            >
                                                <div className={`rounded-full border p-1 ${styles.ring}`}>
                                                    <div className={`h-3 w-3 rounded-full ${styles.dot}`} />
                                                </div>
                                                <div className="mt-2 min-w-[110px] rounded-xl border border-white/10 bg-black/55 px-2.5 py-2 shadow-lg backdrop-blur">
                                                    <p className={`text-[11px] font-semibold ${styles.label}`}>{result.name}</p>
                                                    <p className="mt-0.5 text-[10px] text-neutral-500">{result.location}</p>
                                                    <p className="mt-1 text-[10px] text-neutral-400">
                                                        {result.status === "pending"
                                                            ? "consultando"
                                                            : result.status === "success"
                                                                ? `${result.durationMs || 0} ms`
                                                                : result.error || "fallo"}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <StudioChip accentColor={ACCENT} active>Consulta directa</StudioChip>
                                <StudioChip accentColor={ACCENT}>Nodos públicos</StudioChip>
                                <StudioChip accentColor={ACCENT}>Comparación de respuestas</StudioChip>
                            </div>
                        </StudioCard>

                        <div className="space-y-6">
                            <StudioCard
                                title="Resumen de propagación"
                                description="Si las respuestas no coinciden, la propagación todavía no es uniforme entre resolvedores."
                                eyebrow="Resumen"
                                accentColor={ACCENT}
                            >
                                <div className="grid grid-cols-2 gap-3">
                                    <StudioMetric
                                        label="Éxito"
                                        value={response ? `${response.summary.successfulResolvers}/${results.length}` : `${results.length} pendientes`}
                                        accentColor={ACCENT}
                                    />
                                    <StudioMetric
                                        label="Consistencia"
                                        value={response ? (response.summary.consistentAnswers ? "Estable" : "Diferencias detectadas") : "Analizando"}
                                        accentColor={ACCENT}
                                    />
                                    <StudioMetric
                                        label="Más rápido"
                                        value={response?.summary.fastestResolver ? `${response.summary.fastestResolver.name} · ${response.summary.fastestResolver.durationMs} ms` : "Sin datos"}
                                        accentColor={ACCENT}
                                    />
                                    <StudioMetric
                                        label="Ventana"
                                        value={response ? `${response.totalDurationMs} ms total` : "Esperando"}
                                        accentColor={ACCENT}
                                    />
                                </div>
                            </StudioCard>

                            <StudioCard
                                title="Cómo interpretar el resultado"
                                description="Pistas rápidas para saber si la propagación ya se completó o sigue en curso."
                                eyebrow="Ayuda"
                                accentColor={ACCENT}
                            >
                                <div className="space-y-3 text-sm text-neutral-400">
                                    <p>Si todos responden igual, el cambio ya se distribuyó con bastante consistencia.</p>
                                    <p>Si ves respuestas distintas, todavía hay cachés antiguas o delegaciones inconsistentes.</p>
                                    <p>Si solo fallan algunos nodos, suele ser un problema temporal de resolución o reachability.</p>
                                </div>
                            </StudioCard>
                        </div>
                    </div>
                )}

                {results.length > 0 && (
                    <StudioCard
                        title="Resultados por resolvedor"
                        description="Latencia, estado y registros devueltos por cada nodo consultado."
                        eyebrow="Detalle"
                        accentColor={ACCENT}
                        className="mt-6"
                    >
                        <div className="grid gap-3 lg:grid-cols-2">
                            {results.map(result => {
                                const styles = getStatusStyles(result.status);

                                return (
                                    <div key={result.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
                                                    <p className="text-sm font-semibold text-white">{result.name}</p>
                                                </div>
                                                <p className="mt-1 text-xs text-neutral-500">{result.location} · {result.region}</p>
                                                <p className="mt-1 text-[11px] font-mono text-neutral-600">{result.ip}</p>
                                            </div>
                                            <StudioChip accentColor={ACCENT} active={result.status === "success"}>
                                                {result.status === "pending"
                                                    ? "pendiente"
                                                    : result.status === "success"
                                                        ? `${result.durationMs || 0} ms`
                                                        : "error"}
                                            </StudioChip>
                                        </div>
                                        <p className="mt-3 text-xs leading-5 text-neutral-400">{result.description}</p>

                                        <div className="mt-4 rounded-2xl border border-white/10 bg-[#08111f] p-3">
                                            {result.status === "pending" && (
                                                <p className="text-sm text-blue-200">Consultando resolvedor...</p>
                                            )}
                                            {result.status === "error" && (
                                                <p className="text-sm text-red-300">{result.error || "Consulta fallida"}</p>
                                            )}
                                            {result.status === "success" && result.records.length === 0 && (
                                                <p className="text-sm text-neutral-400">Sin respuestas para este tipo de registro.</p>
                                            )}
                                            {result.status === "success" && result.records.length > 0 && (
                                                <div className="space-y-2">
                                                    {result.records.map(record => (
                                                        <div key={`${result.id}-${record.value}`} className="rounded-xl border border-white/5 bg-white/5 px-3 py-2">
                                                            <p className="break-all font-mono text-sm text-white">{record.value}</p>
                                                            {record.ttl !== null && (
                                                                <p className="mt-1 text-[11px] text-neutral-500">TTL {record.ttl}s</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </StudioCard>
                )}

                <div className="mt-8 text-center">
                    <Link href="/herramientas" className="inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver a herramientas
                    </Link>
                </div>
            </main>
        </div>
    );
}
