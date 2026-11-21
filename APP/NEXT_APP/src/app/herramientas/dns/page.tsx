"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

import { useCallback, useRef, useState } from "react";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { StudioCard, StudioChip, StudioMetric } from "@/components/tools/ImageStudio";
import { DNS_RECORD_TYPES, DNS_RESOLVER_NODES, type DnsRecordType } from "@/lib/tools/dns-resolvers";
import { ipConInversaPublica, limpiarEntradaDns, nombreReservado } from "@/lib/tools/dns-consulta";
import type { NivelObservacion, Observacion, ResultadoDmarc, ResultadoSpf } from "@/lib/tools/dns-correo";

const ACCENT = "#3B82F6";

interface DnsNodeRecord {
    value: string;
    ttl: number | null;
}

interface DnsNodeResult {
    id: string;
    name: string;
    ip: string;
    description: string;
    status: "pending" | "success" | "error";
    records: DnsNodeRecord[];
    durationMs?: number;
    error?: string;
    /** El resolvedor contestó NXDOMAIN: ese nombre no existe. */
    noExiste?: boolean;
}

interface DnsResponse {
    domain: string;
    /** IP original cuando la consulta fue inversa (domain es entonces el nombre .arpa). */
    reverseOf: string | null;
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

interface CorreoResponse {
    domain: string;
    resolvers: string;
    spf: ResultadoSpf;
    dmarc: ResultadoDmarc;
}

const ERROR_DOMINIO = "Dominio inválido. Usa un FQDN público como ejemplo.com, o una IP para la consulta inversa.";

function nombreValido(nombre: string): boolean {
    if (!nombre || nombre.length > 253 || nombreReservado(nombre)) return false;
    // Igual que en el servidor: etiquetas con «_» (_dmarc, _sip._tcp) y TLD en punycode.
    return /^([a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9])?\.)+([a-z]{2,63}|xn--[a-z0-9-]{2,59})$/i.test(nombre);
}

/** Lo escrito → valor para la API. Los nombres con ñ o tildes pasan a punycode con el propio parser de URL. */
function prepararEntrada(texto: string): { ok: true; valor: string; esIp: boolean } | { ok: false; error: string } {
    const entrada = limpiarEntradaDns(texto);
    if (entrada.tipo === "ip") {
        return ipConInversaPublica(entrada)
            ? { ok: true, valor: entrada.ip, esIp: true }
            : { ok: false, error: "Esa IP es privada, de documentación o reservada: su nombre inverso no se publica en el DNS público." };
    }
    let nombre = entrada.nombre;
    if (/[^ -~]/.test(nombre)) {
        try { nombre = new URL(`http://${nombre}`).hostname; } catch { return { ok: false, error: ERROR_DOMINIO }; }
    }
    return nombreValido(nombre) ? { ok: true, valor: nombre, esIp: false } : { ok: false, error: ERROR_DOMINIO };
}

/** Lee la respuesta de /api/tools/dns. Si llega HTML (un 502 del proxy, por ejemplo) se dice en español y no «Unexpected token <». */
async function leerRespuesta<T>(respuesta: Response, respaldo: string): Promise<T> {
    let data: (T & { error?: string }) | null = null;
    try { data = await respuesta.json(); } catch { /* sin JSON: se usa el mensaje de respaldo */ }
    if (!respuesta.ok || !data) throw new Error(data?.error || (respuesta.status === 429 ? "Demasiadas consultas seguidas. Prueba de nuevo en un minuto." : respaldo));
    return data;
}

/** fetch falla con TypeError («Failed to fetch») cuando no hay red: eso se dice en español. */
function mensajeDeError(error: unknown, respaldo: string): string {
    if (error instanceof TypeError) return "No hubo conexión con el servidor. Revisa tu red e intenta de nuevo.";
    return error instanceof Error ? error.message : respaldo;
}

const NIVEL: Record<NivelObservacion, { punto: string; etiqueta: string }> = {
    bien: { punto: "bg-emerald-400", etiqueta: "Bien" },
    info: { punto: "bg-sky-400", etiqueta: "Nota" },
    atencion: { punto: "bg-amber-400", etiqueta: "Atención" },
    error: { punto: "bg-red-400", etiqueta: "Error" },
};

function ListaObservaciones({ items }: { items: Observacion[] }) {
    if (items.length === 0) return null;
    return (
        <ul className="mt-3 divide-y divide-white/5">
            {items.map((item, indice) => (
                <li key={`${indice}-${item.texto}`} className="flex gap-3 py-2">
                    <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${NIVEL[item.nivel].punto}`} />
                    <p className="text-sm leading-6 text-neutral-300">
                        <span className="sr-only">{NIVEL[item.nivel].etiqueta}: </span>
                        {item.texto}
                    </p>
                </li>
            ))}
        </ul>
    );
}

function RegistroCrudo({ registros, vacio }: { registros: string[]; vacio: string }) {
    if (registros.length === 0) return <p className="mt-3 text-sm text-neutral-400">{vacio}</p>;
    return (
        <div className="mt-3 space-y-2">
            {registros.map((registro, indice) => (
                <p key={`${indice}-${registro}`} className="break-all rounded-2xl border border-white/10 bg-[#08111f] p-3 font-mono text-sm text-white">{registro}</p>
            ))}
        </div>
    );
}

function RevisionCorreo({ data }: { data: CorreoResponse }) {
    const { spf, dmarc } = data;
    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="dns-spf-titulo" className="min-w-0">
                <h3 id="dns-spf-titulo" className="text-sm font-semibold text-white">SPF</h3>
                <p className="mt-1 text-xs text-neutral-500">TXT que empieza con v=spf1 en {data.domain}</p>
                <RegistroCrudo registros={spf.registros} vacio={spf.estado === "error-consulta" ? "No se pudo leer." : "Sin registro SPF."} />
                {spf.estado === "ok" && (
                    <p className="mt-3 text-sm text-neutral-300">
                        Consultas DNS: <strong className="font-semibold text-white">{spf.consultas.total}</strong> de 10{" "}
                        {spf.consultas.completo ? "(aproximado)" : "(al menos; no se pudo seguir todo)"}
                    </p>
                )}
                <ListaObservaciones items={spf.observaciones} />
                {spf.terminos.length > 0 && (
                    <dl className="mt-4 divide-y divide-white/5 border-t border-white/5">
                        {spf.terminos.map((termino, indice) => {
                            const incluido = termino.valor ? spf.consultas.incluidos.find(item => item.dominio === termino.valor?.toLowerCase().replace(/\.$/, "")) : undefined;
                            const extra = incluido?.consultas ? ` + ${incluido.consultas}` : "";
                            return (
                                <div key={`${indice}-${termino.texto}`} className="grid gap-1 py-2 sm:grid-cols-[minmax(0,13rem)_1fr_auto] sm:gap-3">
                                    <dt className="break-all font-mono text-xs text-blue-200">{termino.texto}</dt>
                                    <dd className="text-xs leading-5 text-neutral-400">
                                        {termino.explicacion}
                                        {incluido?.nota ? ` (${incluido.nota})` : ""}
                                    </dd>
                                    <dd className="text-xs tabular-nums text-neutral-500">
                                        {termino.consultas > 0 ? `${termino.consultas}${extra} ${termino.consultas === 1 && !extra ? "consulta" : "consultas"}` : ""}
                                    </dd>
                                </div>
                            );
                        })}
                    </dl>
                )}
            </section>

            <section aria-labelledby="dns-dmarc-titulo" className="min-w-0">
                <h3 id="dns-dmarc-titulo" className="text-sm font-semibold text-white">DMARC</h3>
                <p className="mt-1 text-xs text-neutral-500">TXT en {dmarc.nombre}</p>
                <RegistroCrudo registros={dmarc.registros} vacio={dmarc.estado === "error-consulta" ? "No se pudo leer." : "Sin registro DMARC."} />
                <ListaObservaciones items={dmarc.observaciones} />
                {dmarc.filas.length > 0 && (
                    <dl className="mt-4 divide-y divide-white/5 border-t border-white/5">
                        {dmarc.filas.map(fila => (
                            <div key={fila.termino} className="grid gap-1 py-2 sm:grid-cols-[minmax(0,13rem)_1fr] sm:gap-3">
                                <dt className="break-all font-mono text-xs text-blue-200">{fila.termino}</dt>
                                <dd className="text-xs leading-5 text-neutral-400">{fila.explicacion}</dd>
                            </div>
                        ))}
                    </dl>
                )}
            </section>

            <div className="space-y-1 text-xs leading-5 text-neutral-500 lg:col-span-2">
                <p>El conteo de SPF es aproximado: suma include, a, mx, ptr, exists y redirect, y sigue cada include; no expande macros ni cuenta las búsquedas internas de mx.</p>
                <p>DMARC también aprueba un correo con DKIM alineado. DKIM no se revisa aquí porque hace falta el selector: consulta el TXT de selector._domainkey.{data.domain}.</p>
                <p>Leído desde {data.resolvers}.</p>
            </div>
        </div>
    );
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
        dot: "bg-blue-300 animate-pulse motion-reduce:animate-none shadow-[0_0_18px_rgba(96,165,250,0.35)]",
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
    const [correo, setCorreo] = useState<CorreoResponse | null>(null);
    const [revisandoCorreo, setRevisandoCorreo] = useState(false);
    const [errorCorreo, setErrorCorreo] = useState<string | null>(null);
    // Con una IP el tipo pasa solo a PTR; si después se escribe un dominio, vuelve al que estaba (un PTR de un dominio sale vacío).
    const tipoAntesDePtr = useRef<DnsRecordType | null>(null);

    const handleCheck = useCallback(async () => {
        if (!domain.trim()) return;
        const entrada = prepararEntrada(domain);
        if (!entrada.ok) {
            setError(entrada.error);
            return;
        }
        // Con una IP solo tiene sentido la consulta inversa.
        let tipo: DnsRecordType = recordType;
        if (entrada.esIp && recordType !== "PTR") { tipoAntesDePtr.current = recordType; tipo = "PTR"; }
        else if (!entrada.esIp && recordType === "PTR" && tipoAntesDePtr.current) { tipo = tipoAntesDePtr.current; tipoAntesDePtr.current = null; }
        if (tipo !== recordType) setRecordType(tipo);

        setError(null);
        setIsChecking(true);
        setResponse(null);
        setResults(DNS_RESOLVER_NODES.map(node => ({ ...node, status: "pending", records: [] })));

        try {
            const dnsResponse = await fetch(`/api/tools/dns?domain=${encodeURIComponent(entrada.valor)}&type=${tipo}`, {
                cache: "no-store",
            });
            const data = await leerRespuesta<DnsResponse>(dnsResponse, "No se pudo consultar la propagación DNS");

            setResponse(data);
            setResults(data.nodes);
        } catch (requestError) {
            setError(mensajeDeError(requestError, "No se pudo consultar la propagación DNS"));
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

    const handleCorreo = useCallback(async () => {
        if (!domain.trim()) return;
        const entrada = prepararEntrada(domain);
        if (!entrada.ok || entrada.esIp) {
            setErrorCorreo(entrada.ok ? "La revisión de correo necesita un dominio, no una IP." : entrada.error);
            return;
        }
        setErrorCorreo(null);
        setRevisandoCorreo(true);
        setCorreo(null);
        try {
            const respuesta = await fetch(`/api/tools/dns?domain=${encodeURIComponent(entrada.valor)}&modo=correo`, { cache: "no-store" });
            setCorreo(await leerRespuesta<CorreoResponse>(respuesta, "No se pudo revisar el correo del dominio"));
        } catch (requestError) {
            setErrorCorreo(mensajeDeError(requestError, "No se pudo revisar el correo del dominio"));
        } finally {
            setRevisandoCorreo(false);
        }
    }, [domain]);

    const tipoElegido = DNS_RECORD_TYPES.find(record => record.id === recordType);
    const tipoRespondido = DNS_RECORD_TYPES.find(record => record.id === (response?.type ?? recordType));

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
            <main className="tool-main pb-16 pt-20 sm:pb-20 sm:pt-24">
                <ToolPageHeader slug="dns" />

                <StudioCard
                    title="Consulta DNS"
                    description="El backend consulta cada resolvedor por su IP pública para comparar respuestas reales."
                    accentColor={ACCENT}
                >
                    <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
                        <form
                            className="space-y-3"
                            noValidate
                            onSubmit={(event) => { event.preventDefault(); void handleCheck(); }}
                        >
                            <div>
                                <label htmlFor="dns-nombre" className="block text-sm font-medium text-neutral-200">Dominio o IP</label>
                                <p id="dns-nombre-ayuda" className="mt-1 text-xs text-neutral-500">
                                    Acepta subdominios como _dmarc.ejemplo.com, una URL o un correo (se usa su dominio). Con una IP se consulta su nombre inverso (PTR).
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <input
                                    id="dns-nombre"
                                    name="dominio"
                                    type="text"
                                    value={domain}
                                    onChange={(event) => { setDomain(event.target.value); setError(null); setErrorCorreo(null); }}
                                    placeholder="ejemplo.com"
                                    aria-describedby="dns-nombre-ayuda"
                                    aria-invalid={error ? true : undefined}
                                    autoComplete="off"
                                    autoCapitalize="none"
                                    enterKeyHint="search"
                                    className="flex-1 rounded-2xl border border-white/10 bg-[#08111f] px-4 py-3 text-white outline-none transition-all placeholder:text-neutral-600 focus:border-blue-400/40 focus:ring-2 focus:ring-blue-400/20"
                                    spellCheck={false}
                                    maxLength={253}
                                />
                                <button
                                    type="submit"
                                    disabled={isChecking || !domain.trim()}
                                    className="rounded-2xl px-6 py-3 text-sm font-semibold bg-[var(--boton)] text-[var(--boton-tinta)] hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none"
                                >
                                    {isChecking ? "Consultando..." : "Verificar propagación"}
                                </button>
                            </div>
                            <div role="group" aria-labelledby="dns-tipo-titulo">
                                <p id="dns-tipo-titulo" className="mb-2 text-xs text-neutral-400">Tipo de registro</p>
                                <div className="flex flex-wrap gap-2">
                                    {DNS_RECORD_TYPES.map(record => (
                                        <button
                                            key={record.id}
                                            type="button"
                                            aria-pressed={recordType === record.id}
                                            onClick={() => setRecordType(record.id)}
                                            className="min-h-11 min-w-11 rounded-full px-3 py-2 text-xs font-semibold transition-all sm:min-h-0"
                                            style={recordType === record.id
                                                ? { backgroundColor: `${ACCENT}24`, color: "white", boxShadow: `0 0 0 1px ${ACCENT}` }
                                                : { backgroundColor: "rgba(255,255,255,0.05)", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.1)" }}
                                            title={record.desc}
                                        >
                                            {record.name}
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-2 text-xs leading-5 text-neutral-500">
                                    {tipoElegido?.desc}.{tipoElegido?.formato ? ` ${tipoElegido.formato}` : ""}
                                </p>
                            </div>
                            <div className="flex flex-col gap-2 border-t border-white/5 pt-3 sm:flex-row sm:items-center sm:gap-4">
                                <button
                                    type="button"
                                    onClick={() => void handleCorreo()}
                                    disabled={revisandoCorreo || !domain.trim()}
                                    className="min-h-11 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-neutral-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {revisandoCorreo ? "Revisando..." : "Revisar SPF y DMARC"}
                                </button>
                                <p className="text-xs text-neutral-500">Revisa la seguridad del correo del dominio escrito.</p>
                            </div>
                        </form>
                        <div className="grid grid-cols-2 gap-3 self-start">
                            <StudioMetric label="Resolvedores" value={`${DNS_RESOLVER_NODES.length} nodos`} accentColor={ACCENT} />
                            <StudioMetric label="Modo" value="Consultas directas" accentColor={ACCENT} />
                            <StudioMetric label="Origen" value="Backend Node DNS" accentColor={ACCENT} />
                            <StudioMetric label="Seguridad" value="Dominio público validado" accentColor={ACCENT} />
                        </div>
                    </div>
                </StudioCard>

                {error && (
                    <div role="alert" className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                <p aria-live="polite" className="sr-only">
                    {revisandoCorreo ? "Revisando SPF y DMARC" : correo ? `Revisión de correo de ${correo.domain} lista` : ""}
                </p>
                {errorCorreo && (
                    <div role="alert" className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {errorCorreo}
                    </div>
                )}
                {revisandoCorreo && <p className="mt-4 text-sm text-blue-200">Revisando SPF y DMARC…</p>}
                {correo && (
                    <StudioCard
                        title={`Seguridad del correo de ${correo.domain}`}
                        description="Qué dicen el SPF y el DMARC del dominio, con lo que conviene revisar."
                        accentColor={ACCENT}
                        className="mt-6"
                    >
                        <RevisionCorreo data={correo} />
                    </StudioCard>
                )}

                {/* Siempre montado: un aria-live que aparece junto con su texto no siempre se anuncia. */}
                <p aria-live="polite" className={isChecking || response ? "mt-6 text-sm text-neutral-400" : "sr-only"}>
                    {isChecking
                        ? "Consultando los resolvedores…"
                        : response?.reverseOf
                            ? <>Consulta inversa (PTR) de <span className="font-mono text-neutral-200">{response.reverseOf}</span>: <span className="break-all font-mono text-neutral-300">{response.domain}</span></>
                            : response && <>Registros {response.type} de <span className="break-all font-mono text-neutral-200">{response.domain}</span></>}
                </p>

                {results.length > 0 && (
                    <div className="mt-6 grid gap-6">
                        <div className="space-y-6">
                            <StudioCard
                                title="Resumen de propagación"
                                description="Si las respuestas no coinciden, la propagación todavía no es uniforme entre resolvedores."
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
                                                <p className="text-sm text-neutral-400">{result.noExiste ? "Ese nombre no existe para este resolvedor (NXDOMAIN). Revisa que esté bien escrito." : tipoRespondido?.vacio ?? "Sin respuestas para este tipo de registro."}</p>
                                            )}
                                            {result.status === "success" && result.records.length > 0 && (
                                                <div className="space-y-2">
                                                    {result.records.map((record, indice) => (
                                                        <div key={`${result.id}-${indice}-${record.value}`} className="rounded-xl border border-white/5 bg-white/5 px-3 py-2">
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

            </main>
        </div>
    );
}
