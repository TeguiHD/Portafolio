"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

import { useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { useCopiar } from "@/lib/tools/copiar";
import { descargarTexto } from "@/lib/tools/descargar";
import { MAX_SUBREDES_VLSM, planComoCsv, planComoTexto, planificarVlsm, type PedidoVlsm, type PlanVlsm } from "@/lib/tools/vlsm";

const ACCENT = "#3B82F6";

/**
 * IPv4 / IPv6 SUBNET CALCULATOR
 * ================================
 * Calculates subnet information from an IP address and CIDR prefix:
 * - Network address, broadcast address, usable host range
 * - Subnet mask, wildcard mask
 * - Total hosts, usable hosts
 * - Binary representation
 * - IPv6 support with full prefix calculations
 *
 * SECURITY ALIGNMENT (OWASP / NIST / MITRE 2026):
 * ─────────────────────────────────────────────────
 * • OWASP A03:2021 – Injection → No eval(), no dynamic code.
 *   Input strictly validated for IP format and CIDR range.
 * • NIST SP 800-53 SC-7 – Boundary Protection →
 *   Network segmentation tool supports proper boundary design.
 * • MITRE CWE-20 – Input Validation → Strict IP/CIDR validation
 *   with format and range checks. No special characters accepted.
 * • MITRE CWE-400 – Resource Exhaustion → IPv6 calculations use
 *   BigInt for safe arbitrary-precision arithmetic.
 * • All processing client-side, no server I/O.
 */

// ========================= IPv4 FUNCTIONS =========================

function isValidIPv4(ip: string): boolean {
    const parts = ip.split(".");
    if (parts.length !== 4) return false;
    return parts.every(part => {
        const num = parseInt(part, 10);
        return !isNaN(num) && num >= 0 && num <= 255 && part === String(num);
    });
}

function ipv4ToNumber(ip: string): number {
    return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function numberToIPv4(num: number): string {
    return [
        (num >>> 24) & 0xFF,
        (num >>> 16) & 0xFF,
        (num >>> 8) & 0xFF,
        num & 0xFF,
    ].join(".");
}

function ipv4ToBinary(ip: string): string {
    return ip.split(".").map(octet =>
        parseInt(octet, 10).toString(2).padStart(8, "0")
    ).join(".");
}

function calculateIPv4Subnet(ip: string, cidr: number) {
    const ipNum = ipv4ToNumber(ip);
    const mask = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
    const network = (ipNum & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    const totalHosts = Math.pow(2, 32 - cidr);
    const usableHosts = cidr >= 31 ? (cidr === 32 ? 1 : 2) : totalHosts - 2;
    const firstUsable = cidr >= 31 ? network : (network + 1) >>> 0;
    const lastUsable = cidr >= 31 ? broadcast : (broadcast - 1) >>> 0;
    const wildcard = (~mask) >>> 0;

    // Determine IP class
    const firstOctet = (ipNum >>> 24) & 0xFF;
    let ipClass = "N/A";
    if (firstOctet >= 1 && firstOctet <= 126) ipClass = "A";
    else if (firstOctet >= 128 && firstOctet <= 191) ipClass = "B";
    else if (firstOctet >= 192 && firstOctet <= 223) ipClass = "C";
    else if (firstOctet >= 224 && firstOctet <= 239) ipClass = "D (Multicast)";
    else if (firstOctet >= 240 && firstOctet <= 255) ipClass = "E (Reservada)";

    // Check if private
    const isPrivate =
        (firstOctet === 10) ||
        (firstOctet === 172 && ((ipNum >>> 16) & 0xFF) >= 16 && ((ipNum >>> 16) & 0xFF) <= 31) ||
        (firstOctet === 192 && ((ipNum >>> 16) & 0xFF) === 168);
    // Rangos especiales (RFC 6890): antes loopback, enlace local o CGNAT salían como «Pública».
    const b2 = (ipNum >>> 16) & 0xFF, b3 = (ipNum >>> 8) & 0xFF;
    const rango =
        isPrivate ? "Privada (RFC 1918)"
        : firstOctet === 127 ? "Loopback"
        : firstOctet === 169 && b2 === 254 ? "Enlace local (APIPA)"
        : firstOctet === 100 && b2 >= 64 && b2 <= 127 ? "Compartida CGNAT (RFC 6598)"
        : firstOctet === 0 ? "Esta red (0.0.0.0/8)"
        : (firstOctet === 192 && b2 === 0 && b3 === 2) || (firstOctet === 198 && b2 === 51 && b3 === 100) || (firstOctet === 203 && b2 === 0 && b3 === 113) ? "Documentación (RFC 5737)"
        : firstOctet === 198 && (b2 === 18 || b2 === 19) ? "Pruebas de red (RFC 2544)"
        : firstOctet >= 224 && firstOctet <= 239 ? "Multicast"
        : firstOctet >= 240 ? "Reservada"
        : "Pública";

    return {
        networkAddress: numberToIPv4(network),
        broadcastAddress: numberToIPv4(broadcast),
        subnetMask: numberToIPv4(mask),
        wildcardMask: numberToIPv4(wildcard),
        firstUsable: numberToIPv4(firstUsable),
        lastUsable: numberToIPv4(lastUsable),
        totalHosts,
        usableHosts,
        cidr,
        ipClass,
        isPrivate,
        rango,
        networkBinary: ipv4ToBinary(numberToIPv4(network)),
        maskBinary: ipv4ToBinary(numberToIPv4(mask)),
    };
}

// ========================= IPv6 FUNCTIONS =========================

function expandIPv6(ip: string): string {
    // Handle :: expansion
    let parts = ip.split(":");
    const doubleCIndex = ip.indexOf("::");

    if (doubleCIndex !== -1) {
        const before = ip.substring(0, doubleCIndex).split(":").filter(Boolean);
        const after = ip.substring(doubleCIndex + 2).split(":").filter(Boolean);
        const missing = 8 - before.length - after.length;
        parts = [...before, ...Array(missing).fill("0000"), ...after];
    }

    return parts.map(p => p.padStart(4, "0")).join(":");
}

function isValidIPv6(ip: string): boolean {
    // Quick validation
    if (ip === "::") return true;
    if (ip === "::1") return true;

    // Count ::
    const doubleColonCount = (ip.match(/::/g) || []).length;
    if (doubleColonCount > 1) return false;
    // Un «:» suelto al inicio o al final (":1:2:3:4:5:6:7") pasaba como un grupo 0000.
    if ((ip.startsWith(":") && !ip.startsWith("::")) || (ip.endsWith(":") && !ip.endsWith("::"))) return false;
    // «::» reemplaza al menos un grupo: con 8 grupos escritos sobra.
    if (doubleColonCount === 1 && ip.split(":").filter(Boolean).length > 7) return false;

    try {
        const expanded = expandIPv6(ip);
        const parts = expanded.split(":");
        if (parts.length !== 8) return false;
        return parts.every(part => /^[0-9a-fA-F]{1,4}$/.test(part));
    } catch {
        return false;
    }
}

function ipv6ToBigInt(ip: string): bigint {
    const expanded = expandIPv6(ip);
    const hex = expanded.replace(/:/g, "");
    return BigInt("0x" + hex);
}

function bigIntToIPv6(num: bigint): string {
    const hex = num.toString(16).padStart(32, "0");
    const groups: string[] = [];
    for (let i = 0; i < 32; i += 4) {
        groups.push(hex.substring(i, i + 4));
    }
    return groups.join(":");
}

function compressIPv6(ip: string): string {
    const expanded = expandIPv6(ip);
    const parts = expanded.split(":").map(p => p.replace(/^0+/, "") || "0");

    // Find longest run of "0" groups
    let bestStart = -1, bestLen = 0, curStart = -1, curLen = 0;
    for (let i = 0; i < parts.length; i++) {
        if (parts[i] === "0") {
            if (curStart === -1) curStart = i;
            curLen++;
            if (curLen > bestLen) { bestStart = curStart; bestLen = curLen; }
        } else {
            curStart = -1; curLen = 0;
        }
    }

    if (bestLen >= 2) {
        const before = parts.slice(0, bestStart);
        const after = parts.slice(bestStart + bestLen);
        const result = [...before, "", ...after].join(":");
        if (result.startsWith(":")) return ":" + result;
        if (result.endsWith(":")) return result + ":";
        return result;
    }

    return parts.join(":");
}

function calculateIPv6Subnet(ip: string, prefix: number) {
    const ipBigInt = ipv6ToBigInt(ip);
    const totalBits = 128;
    const hostBits = totalBits - prefix;

    // Create mask
    const mask = hostBits === 128 ? 0n : ((1n << BigInt(totalBits)) - 1n) ^ ((1n << BigInt(hostBits)) - 1n);
    const network = ipBigInt & mask;
    const lastAddress = network | ((1n << BigInt(hostBits)) - 1n);

    // Total addresses (use BigInt for IPv6)
    const totalAddresses = 1n << BigInt(hostBits);

    const networkStr = bigIntToIPv6(network);
    const lastStr = bigIntToIPv6(lastAddress);

    return {
        networkAddress: compressIPv6(networkStr),
        networkFull: networkStr,
        lastAddress: compressIPv6(lastStr),
        lastAddressFull: lastStr,
        prefix,
        totalAddresses: totalAddresses > BigInt(Number.MAX_SAFE_INTEGER)
            ? `2^${hostBits}`
            : totalAddresses.toString(),
        totalAddressesExact: totalAddresses.toString(),
        hostBits,
    };
}

// ========================= COMMON CIDR PRESETS =========================

const COMMON_SUBNETS = [
    { cidr: 8, name: "Clase A", hosts: "16.777.214" },
    { cidr: 16, name: "Clase B", hosts: "65.534" },
    { cidr: 24, name: "Clase C", hosts: "254" },
    { cidr: 25, name: "Mitad Clase C", hosts: "126" },
    { cidr: 26, name: "/26", hosts: "62" },
    { cidr: 27, name: "/27", hosts: "30" },
    { cidr: 28, name: "/28", hosts: "14" },
    { cidr: 29, name: "/29 (red chica, 6 equipos)", hosts: "6" },
    { cidr: 30, name: "/30 (Enlace P2P)", hosts: "2" },
    { cidr: 32, name: "/32 (Host único)", hosts: "1" },
];

// ========================= PLANIFICADOR VLSM =========================

interface FilaVlsm {
    id: number;
    nombre: string;
    hosts: string;
}

const FILAS_VLSM_INICIALES: FilaVlsm[] = [
    { id: 1, nombre: "Usuarios", hosts: "100" },
    { id: 2, nombre: "Invitados", hosts: "50" },
    { id: 3, nombre: "Servidores", hosts: "20" },
    { id: 4, nombre: "Enlace WAN", hosts: "2" },
];

/** Entero con o sin puntos de miles («1.000»). */
const HOSTS_RE = /^\d{1,3}(\.?\d{3})*$/;
const formatoCL = new Intl.NumberFormat("es-CL");
const CAMPO = "w-full bg-[#0F1724] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-2 user-invalid:border-red-400/60";

function leerFilas(filas: FilaVlsm[]): { pedidos: PedidoVlsm[]; sinHosts: string[]; error: string | null } {
    const pedidos: PedidoVlsm[] = [];
    const sinHosts: string[] = [];
    for (const [indice, fila] of filas.entries()) {
        const nombre = fila.nombre.trim() || `Subred ${indice + 1}`;
        const hosts = fila.hosts.trim();
        if (!hosts) {
            if (fila.nombre.trim()) sinHosts.push(nombre);
            continue;
        }
        if (!HOSTS_RE.test(hosts)) {
            return { pedidos, sinHosts, error: `Indica cuántos hosts necesita «${nombre}» con un número entero, por ejemplo 50.` };
        }
        pedidos.push({ nombre, hosts: Number(hosts.replace(/\./g, "")) });
    }
    return { pedidos, sinHosts, error: null };
}

function PlanificadorVlsm() {
    const [base, setBase] = useState("192.168.10.0/24");
    const [filas, setFilas] = useState<FilaVlsm[]>(FILAS_VLSM_INICIALES);
    const siguienteId = useRef(FILAS_VLSM_INICIALES.length + 1);
    const { copiado, fallo, copiar } = useCopiar();

    const lectura = useMemo(() => leerFilas(filas), [filas]);
    const plan = useMemo<PlanVlsm>(
        () => (lectura.error ? { ok: false, error: lectura.error } : planificarVlsm(base, lectura.pedidos)),
        [base, lectura]
    );

    const cambiarFila = (id: number, campo: "nombre" | "hosts", valor: string) =>
        setFilas(actuales => actuales.map(fila => (fila.id === id ? { ...fila, [campo]: valor } : fila)));

    // Los clics se aplican antes del siguiente cuadro, así que el campo nuevo ya existe al enfocarlo.
    const enfocar = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus());

    const agregar = () => {
        const id = siguienteId.current++;
        setFilas(actuales => [...actuales, { id, nombre: "", hosts: "" }]);
        enfocar(`vlsm-nombre-${id}`);
    };

    const quitar = (id: number) => {
        const indice = filas.findIndex(fila => fila.id === id);
        const vecina = filas[indice + 1] ?? filas[indice - 1];
        setFilas(actuales => actuales.filter(fila => fila.id !== id));
        enfocar(vecina ? `vlsm-nombre-${vecina.id}` : "vlsm-agregar");
    };

    const avisoCopia = copiado === "vlsm" ? "Tabla copiada" : fallo === "vlsm" ? "No se pudo copiar" : "";

    return (
        <section aria-labelledby="vlsm-titulo" className="mt-8 bg-white/5 rounded-xl p-4 border border-white/10">
            <h2 id="vlsm-titulo" className="text-base font-semibold text-white">Planificar subredes (VLSM)</h2>
            <p className="mt-1 text-xs leading-5 text-neutral-400">
                Escribe la red que tienes y cuántos hosts necesita cada subred. Se asignan de la más grande a la más chica,
                cada una alineada a su tamaño. Cada subred reserva la dirección de red y la de broadcast, así que un enlace de 2 hosts queda en /30.
            </p>

            <div className="mt-4">
                <label htmlFor="vlsm-base" className="block text-sm font-medium text-white">Red base (CIDR)</label>
                <p id="vlsm-base-ayuda" className="mt-1 text-xs text-neutral-500">IPv4 con prefijo, por ejemplo 192.168.10.0/24.</p>
                <input
                    id="vlsm-base"
                    type="text"
                    value={base}
                    onChange={event => setBase(event.target.value)}
                    required
                    pattern="\s*[0-9]{1,3}(\.[0-9]{1,3}){3}\s*/\s*[0-9]{1,2}\s*"
                    aria-describedby="vlsm-base-ayuda"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={22}
                    className={`mt-2 font-mono sm:max-w-xs ${CAMPO}`}
                    style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
                />
            </div>

            <fieldset className="mt-5">
                <legend className="text-sm font-medium text-white">Subredes</legend>
                <div aria-hidden="true" className="mt-2 hidden grid-cols-[minmax(0,1fr)_7rem_2.75rem] gap-2 px-1 text-xs text-neutral-500 sm:grid">
                    <span>Nombre</span>
                    <span>Hosts necesarios</span>
                    <span />
                </div>
                <ul className="mt-2 space-y-2">
                    {filas.map((fila, indice) => {
                        const nombreVisible = fila.nombre.trim() || `subred ${indice + 1}`;
                        const hostsMalos = fila.hosts.trim() !== "" && !HOSTS_RE.test(fila.hosts.trim());
                        return (
                            <li key={fila.id} className="grid grid-cols-[minmax(0,1fr)_6rem_2.75rem] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_2.75rem]">
                                <label htmlFor={`vlsm-nombre-${fila.id}`} className="sr-only">Nombre de la subred {indice + 1}</label>
                                <input
                                    id={`vlsm-nombre-${fila.id}`}
                                    type="text"
                                    value={fila.nombre}
                                    onChange={event => cambiarFila(fila.id, "nombre", event.target.value)}
                                    placeholder={`Subred ${indice + 1}`}
                                    maxLength={40}
                                    autoComplete="off"
                                    className={CAMPO}
                                    style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
                                />
                                <label htmlFor={`vlsm-hosts-${fila.id}`} className="sr-only">Hosts necesarios en {nombreVisible}</label>
                                <input
                                    id={`vlsm-hosts-${fila.id}`}
                                    type="text"
                                    inputMode="numeric"
                                    value={fila.hosts}
                                    onChange={event => cambiarFila(fila.id, "hosts", event.target.value)}
                                    pattern="[0-9]{1,3}(\.?[0-9]{3})*"
                                    aria-invalid={hostsMalos ? true : undefined}
                                    placeholder="0"
                                    maxLength={13}
                                    autoComplete="off"
                                    className={`font-mono text-right ${CAMPO}`}
                                    style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
                                />
                                <button
                                    type="button"
                                    onClick={() => quitar(fila.id)}
                                    disabled={filas.length === 1}
                                    aria-label={`Quitar ${nombreVisible}`}
                                    className="flex h-11 w-11 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </li>
                        );
                    })}
                </ul>
                <button
                    id="vlsm-agregar"
                    type="button"
                    onClick={agregar}
                    disabled={filas.length >= MAX_SUBREDES_VLSM}
                    className="mt-3 min-h-11 rounded-lg px-4 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ background: `${ACCENT}30` }}
                >
                    Agregar subred
                </button>
            </fieldset>

            <div className="mt-6">
                {!plan.ok ? (
                    <p role="alert" className="text-sm text-red-300">{plan.error}</p>
                ) : (
                    <>
                        {plan.base.ajustada && (
                            <p className="mb-3 text-xs text-neutral-400">
                                Se usa la red <span className="font-mono text-neutral-200">{plan.base.red}/{plan.base.prefijo}</span>, que contiene la dirección que escribiste.
                            </p>
                        )}
                        <dl className="grid grid-cols-2 border-y border-white/10 sm:grid-cols-4 sm:divide-x sm:divide-white/10">
                            <div className="px-3 py-2">
                                <dt className="text-xs text-neutral-500">Asignadas</dt>
                                <dd className="font-mono text-sm text-white">{formatoCL.format(plan.usadas)} de {formatoCL.format(plan.base.tamano)}</dd>
                            </div>
                            <div className="px-3 py-2">
                                <dt className="text-xs text-neutral-500">Libres</dt>
                                <dd className="font-mono text-sm text-white">{formatoCL.format(plan.libresTotal)}</dd>
                            </div>
                            <div className="px-3 py-2">
                                <dt className="text-xs text-neutral-500">Hosts pedidos</dt>
                                <dd className="font-mono text-sm text-white">{formatoCL.format(plan.subredes.reduce((suma, subred) => suma + subred.pedidos, 0))}</dd>
                            </div>
                            <div className="px-3 py-2">
                                <dt className="text-xs text-neutral-500">Hosts útiles</dt>
                                <dd className="font-mono text-sm text-white">{formatoCL.format(plan.subredes.reduce((suma, subred) => suma + subred.hostsUtiles, 0))}</dd>
                            </div>
                        </dl>

                        <div className="mt-4 overflow-x-auto" role="region" aria-labelledby="vlsm-tabla-titulo" tabIndex={0}>
                            <table className="w-full text-xs text-neutral-300">
                                <caption id="vlsm-tabla-titulo" className="sr-only">Plan VLSM de {plan.base.red}/{plan.base.prefijo}</caption>
                                <thead>
                                    <tr className="border-b border-white/10 text-left text-white">
                                        <th scope="col" className="py-2 px-3 font-semibold">Subred</th>
                                        <th scope="col" className="py-2 px-3 font-semibold">Red</th>
                                        <th scope="col" className="py-2 px-3 font-semibold">Máscara</th>
                                        <th scope="col" className="py-2 px-3 font-semibold">Primer host</th>
                                        <th scope="col" className="py-2 px-3 font-semibold">Último host</th>
                                        <th scope="col" className="py-2 px-3 font-semibold">Broadcast</th>
                                        <th scope="col" className="py-2 px-3 text-right font-semibold">Pedidos</th>
                                        <th scope="col" className="py-2 px-3 text-right font-semibold">Hosts útiles</th>
                                        <th scope="col" className="py-2 px-3 text-right font-semibold">Desperdicio</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plan.subredes.map((subred, indice) => (
                                        <tr key={`${indice}-${subred.red}`} className="border-b border-white/5">
                                            <th scope="row" className="py-1.5 px-3 text-left font-medium text-white">{subred.nombre}</th>
                                            <td className="py-1.5 px-3 font-mono whitespace-nowrap text-blue-400">{subred.red}/{subred.prefijo}</td>
                                            <td className="py-1.5 px-3 font-mono whitespace-nowrap">{subred.mascara}</td>
                                            <td className="py-1.5 px-3 font-mono whitespace-nowrap">{subred.primerHost}</td>
                                            <td className="py-1.5 px-3 font-mono whitespace-nowrap">{subred.ultimoHost}</td>
                                            <td className="py-1.5 px-3 font-mono whitespace-nowrap">{subred.broadcast}</td>
                                            <td className="py-1.5 px-3 text-right font-mono tabular-nums">{formatoCL.format(subred.pedidos)}</td>
                                            <td className="py-1.5 px-3 text-right font-mono tabular-nums">{formatoCL.format(subred.hostsUtiles)}</td>
                                            <td className="py-1.5 px-3 text-right font-mono tabular-nums">{formatoCL.format(subred.desperdicio)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <p className="mt-3 text-xs leading-5 text-neutral-400">
                            {plan.libres.length === 0
                                ? "La red base quedó completa."
                                : <>Espacio libre: <span className="font-mono text-neutral-200">{plan.libres.map(bloque => `${bloque.red}/${bloque.prefijo}`).join(", ")}</span></>}
                        </p>
                        {lectura.sinHosts.length > 0 && (
                            <p className="mt-1 text-xs text-neutral-500">Sin hosts, fuera del plan: {lectura.sinHosts.join(", ")}.</p>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => void copiar(planComoTexto(plan), "vlsm")}
                                className="min-h-11 rounded-lg px-4 text-sm font-medium text-white transition-colors"
                                style={{ background: `${ACCENT}30` }}
                            >
                                {avisoCopia || "Copiar tabla"}
                            </button>
                            <button
                                type="button"
                                onClick={() => descargarTexto(planComoCsv(plan), `vlsm-${plan.base.red}-${plan.base.prefijo}.csv`, "text/csv")}
                                className="min-h-11 rounded-lg border border-white/10 px-4 text-sm font-medium text-neutral-200 transition-colors hover:bg-white/10"
                            >
                                Descargar CSV
                            </button>
                            <span role="status" className="sr-only">{avisoCopia}</span>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}

export default function SubnetCalculatorPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("subredes");
    const [ipInput, setIpInput] = useState("192.168.1.0");
    const [cidrInput, setCidrInput] = useState("24");
    const [ipVersion, setIpVersion] = useState<4 | 6>(4);
    const { copiado, fallo, copiar } = useCopiar();

    // El campo guarda lo que se escribe, «/24» incluido: antes el «/» se sacaba al tiro y el «2» siguiente caía en la IP
    // («10.0.0.0/8» tecleado terminaba en 10.0.0.08). La IP es lo que va antes del «/».
    const ipSolo = ipInput.split("/")[0]?.trim() ?? "";

    const isValid = useMemo(() => {
        if (!/^\d{1,3}$/.test(cidrInput.trim())) return false;
        const cidr = parseInt(cidrInput, 10);

        if (ipVersion === 4) {
            return isValidIPv4(ipSolo) && cidr >= 0 && cidr <= 32;
        } else {
            return isValidIPv6(ipSolo) && cidr >= 0 && cidr <= 128;
        }
    }, [ipSolo, cidrInput, ipVersion]);

    const result = useMemo(() => {
        if (!isValid) return null;
        const cidr = parseInt(cidrInput, 10);

        if (ipVersion === 4) {
            return { type: "v4" as const, data: calculateIPv4Subnet(ipSolo, cidr) };
        } else {
            return { type: "v6" as const, data: calculateIPv6Subnet(ipSolo, cidr) };
        }
    }, [ipSolo, cidrInput, ipVersion, isValid]);

    const ipMala = Boolean(ipSolo) && !(ipVersion === 4 ? isValidIPv4 : isValidIPv6)(ipSolo);
    const maxPrefijo = ipVersion === 4 ? 32 : 128;
    const prefijoMalo = cidrInput.trim() !== "" && (!/^\d{1,3}$/.test(cidrInput.trim()) || parseInt(cidrInput, 10) > maxPrefijo);

    const estadoCopia = (clave: string, enReposo: string) =>
        copiado === clave ? "Copiado" : fallo === clave ? "No se pudo copiar" : enReposo;

    const handleAutoDetect = useCallback((bruto: string) => {
        // Pegado con espacios alrededor («192.168.1.0 / 24 ») también vale.
        const value = bruto.trimStart().replace(/\s*\/\s*/, "/");
        const [ip = "", prefijo = ""] = value.split("/");
        setIpVersion(ip.includes(":") ? 6 : 4);
        setIpInput(value);
        // El prefijo escrito tras «/» manda sobre el campo de prefijo (sin dígitos todavía, se deja el que había).
        if (prefijo.trim()) setCidrInput(prefijo.trim());
    }, []);
    // Si se cambia el prefijo en su campo o con los atajos, el «/xx» escrito en la IP deja de mandar: se quita.
    const cambiarPrefijo = (valor: string) => {
        setCidrInput(valor);
        if (ipInput.includes("/")) setIpInput(ipSolo);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Calculadora de Subredes"} />;
    }

    return (
        <div className="tool-page">
            <main className="tool-main max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
                <ToolPageHeader slug="subredes" />

                {/* IP Version Toggle */}
                <div className="flex gap-2 bg-white/5 rounded-xl p-2 border border-white/10 mb-6" role="group" aria-label="Versión de IP">
                    {([4, 6] as const).map(v => (
                        <button
                            key={v}
                            type="button"
                            aria-pressed={ipVersion === v}
                            onClick={() => {
                                setIpVersion(v);
                                if (v === 4) { setIpInput("192.168.1.0"); setCidrInput("24"); }
                                else { setIpInput("2001:db8::"); setCidrInput("48"); }
                            }}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${ipVersion === v ? "text-white" : "text-neutral-400"
                                }`}
                            style={ipVersion === v ? { background: `${ACCENT}20`, boxShadow: `0 0 0 1px ${ACCENT}` } : undefined}
                        >
                            IPv{v}
                        </button>
                    ))}
                </div>

                {/* Input Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="sm:col-span-2 bg-white/5 rounded-xl p-4 border border-white/10">
                        <label className="block">
                            <span className="text-sm font-medium text-white mb-2 block">
                                Dirección IP
                            </span>
                            <input
                                type="text"
                                value={ipInput}
                                onChange={e => handleAutoDetect(e.target.value)}
                                placeholder={ipVersion === 4 ? "192.168.1.0" : "2001:db8::"}
                                className="w-full bg-[#0F1724] border border-white/10 rounded-lg px-4 py-3 text-sm text-white font-mono outline-none focus:ring-2"
                                style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
                                spellCheck={false}
                                autoComplete="off"
                                aria-invalid={ipMala || undefined}
                                aria-describedby={ipMala ? "subred-ip-error" : undefined}
                                // Cabe una IPv6 con su prefijo (45 + «/128»): con 15, pegar «192.168.100.0/24» quedaba en «/2».
                                maxLength={50}
                            />
                            {ipMala && (
                                <p id="subred-ip-error" className="text-xs text-red-400 mt-1">
                                    {ipVersion === 4
                                        ? "IPv4 no válida: cuatro números de 0 a 255 separados por puntos, sin ceros a la izquierda."
                                        : "IPv6 no válida: hasta ocho grupos hexadecimales separados por «:», con un solo «::»."}
                                </p>
                            )}
                        </label>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <label className="block">
                            <span className="text-sm font-medium text-white mb-2 block">
                                Prefijo CIDR
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-white font-mono text-lg">/</span>
                                <input
                                    type="number"
                                    value={cidrInput}
                                    onChange={e => cambiarPrefijo(e.target.value)}
                                    min={0}
                                    max={maxPrefijo}
                                    aria-invalid={prefijoMalo || undefined}
                                    aria-describedby={prefijoMalo ? "subred-prefijo-error" : undefined}
                                    className="w-full bg-[#0F1724] border border-white/10 rounded-lg px-4 py-3 text-sm text-white font-mono outline-none focus:ring-2"
                                    style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
                                />
                            </div>
                            {prefijoMalo && <p id="subred-prefijo-error" className="text-xs text-red-400 mt-1">El prefijo IPv{ipVersion} va de 0 a {maxPrefijo}.</p>}
                        </label>
                    </div>
                </div>

                {/* Quick CIDR Presets (IPv4 only) */}
                {ipVersion === 4 && (
                    <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Prefijos comunes">
                        {COMMON_SUBNETS.map(s => (
                            <button
                                key={s.cidr}
                                type="button"
                                aria-pressed={cidrInput.trim() === String(s.cidr)}
                                onClick={() => cambiarPrefijo(String(s.cidr))}
                                className={`min-h-11 min-w-11 px-3 py-1.5 rounded-lg text-xs font-medium transition-all sm:min-h-0 ${cidrInput.trim() === String(s.cidr)
                                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                    : "bg-white/5 text-neutral-400 border border-transparent hover:bg-white/10"
                                    }`}
                                title={`${s.name} — ${s.hosts} hosts`}
                            >
                                /{s.cidr}
                            </button>
                        ))}
                    </div>
                )}

                <span role="status" className="sr-only">{copiado ? "Copiado" : fallo ? "No se pudo copiar" : ""}</span>

                {/* Results */}
                {result && result.type === "v4" && (
                    <div className="space-y-4">
                        {/* Main Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {result.data.cidr >= 31 && (
                                <p className="sm:col-span-2 text-xs leading-5 text-neutral-400">
                                    {result.data.cidr === 31
                                        ? "Un /31 es un enlace punto a punto (RFC 3021): sus 2 direcciones son de hosts y no hay red ni broadcast reservados."
                                        : "Un /32 es una sola dirección: la de un host (loopback, una IP fija en una regla de firewall). No tiene broadcast."}
                                </p>
                            )}
                            {[
                                { label: result.data.cidr === 32 ? "Dirección" : "Dirección de Red", value: result.data.networkAddress, accent: true },
                                { label: "Dirección de Broadcast", value: result.data.cidr >= 31 ? null : result.data.broadcastAddress },
                                { label: "Máscara de Subred", value: result.data.subnetMask },
                                { label: "Máscara Wildcard", value: result.data.wildcardMask },
                                { label: "Primera IP Utilizable", value: result.data.firstUsable, accent: true },
                                { label: "Última IP Utilizable", value: result.data.lastUsable, accent: true },
                            ].map(item => item.value === null ? (
                                <div key={item.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                                    <span className="text-xs text-neutral-500 block mb-1">{item.label}</span>
                                    <span className="text-sm text-neutral-400">No tiene en un /{result.data.cidr}</span>
                                </div>
                            ) : (
                                <button
                                    key={item.label}
                                    type="button"
                                    onClick={() => void copiar(item.value ?? "", item.label)}
                                    aria-label={`Copiar ${item.label.toLowerCase()}: ${item.value}`}
                                    className="bg-white/5 rounded-xl p-4 border border-white/10 text-left hover:bg-white/8 transition-colors group"
                                >
                                    <span className="text-xs text-neutral-500 block mb-1">{item.label}</span>
                                    <span className={`text-sm font-mono ${item.accent ? "text-blue-400" : "text-white"}`}>
                                        {item.value}
                                    </span>
                                    <span className="text-[10px] text-neutral-600 block mt-1 group-hover:text-neutral-400 transition-colors">
                                        {estadoCopia(item.label, "Clic para copiar")}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                                <span className="text-xs text-neutral-500 block">Hosts Totales</span>
                                <span className="text-lg font-bold text-white">{formatoCL.format(result.data.totalHosts)}</span>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                                <span className="text-xs text-neutral-500 block">Hosts Utilizables</span>
                                <span className="text-lg font-bold text-blue-400">{formatoCL.format(result.data.usableHosts)}</span>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                                <span className="text-xs text-neutral-500 block">Clase IP</span>
                                <span className="text-lg font-bold text-white">{result.data.ipClass}</span>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                                <span className="text-xs text-neutral-500 block">Tipo</span>
                                <span className={`text-lg font-bold ${result.data.rango === "Pública" ? "text-yellow-400" : "text-green-400"}`}>
                                    {result.data.rango}
                                </span>
                            </div>
                        </div>

                        {/* Binary Representation */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <h3 className="text-sm font-semibold text-white mb-3">Representación Binaria</h3>
                            <div className="space-y-2 font-mono text-xs">
                                <div className="bg-[#0F1724] rounded-lg p-3 overflow-x-auto">
                                    <span className="text-neutral-500">Red:     </span>
                                    <span className="text-blue-400">{result.data.networkBinary}</span>
                                </div>
                                <div className="bg-[#0F1724] rounded-lg p-3 overflow-x-auto">
                                    <span className="text-neutral-500">Máscara: </span>
                                    <span className="text-green-400">{result.data.maskBinary}</span>
                                </div>
                            </div>
                        </div>

                        {/* Visual CIDR Slider */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <h3 className="text-sm font-semibold text-white mb-3">Visualización de Bits</h3>
                            <div className="flex gap-[1px] rounded overflow-hidden">
                                {Array.from({ length: 32 }, (_, i) => (
                                    <div
                                        key={i}
                                        className={`h-6 flex-1 ${i < result.data.cidr ? "bg-blue-500" : "bg-white/10"}`}
                                        title={`Bit ${i + 1}: ${i < result.data.cidr ? "Red" : "Host"}`}
                                    />
                                ))}
                            </div>
                            <div className="flex justify-between mt-1 text-[10px] text-neutral-500">
                                <span>← {result.data.cidr} bits de red</span>
                                <span>{32 - result.data.cidr} bits de host →</span>
                            </div>
                        </div>

                        {/* CIDR Notation */}
                        <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-xs text-neutral-500 block">Notación CIDR completa</span>
                                    <span className="text-lg font-mono font-bold text-blue-300">
                                        {result.data.networkAddress}/{result.data.cidr}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void copiar(`${result.data.networkAddress}/${result.data.cidr}`, "cidr")}
                                    className="min-h-11 px-3 py-1.5 rounded-md text-xs font-medium text-white transition-colors"
                                    style={{ background: `${ACCENT}30` }}
                                >
                                    {estadoCopia("cidr", "Copiar")}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* IPv6 Results */}
                {result && result.type === "v6" && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { label: "Dirección de Red", value: result.data.networkAddress, full: result.data.networkFull },
                                { label: "Última Dirección", value: result.data.lastAddress, full: result.data.lastAddressFull },
                            ].map(item => (
                                <button
                                    key={item.label}
                                    type="button"
                                    onClick={() => void copiar(item.full, item.label)}
                                    className="bg-white/5 rounded-xl p-4 border border-white/10 text-left hover:bg-white/8 transition-colors group"
                                >
                                    <span className="text-xs text-neutral-500 block mb-1">{item.label}</span>
                                    <span className="text-sm font-mono text-blue-400 block">{item.value}</span>
                                    <span className="text-[10px] font-mono text-neutral-600 block mt-1">{item.full}</span>
                                    <span className="text-[10px] text-neutral-600 block mt-1 group-hover:text-neutral-400">
                                        {estadoCopia(item.label, "Clic para copiar")}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                                <span className="text-xs text-neutral-500 block">Prefijo</span>
                                <span className="text-lg font-bold text-white">/{result.data.prefix}</span>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                                <span className="text-xs text-neutral-500 block">Direcciones</span>
                                <span className="text-lg font-bold text-blue-400">{result.data.totalAddresses}</span>
                            </div>
                        </div>

                        {/* Visual Prefix */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <h3 className="text-sm font-semibold text-white mb-3">Visualización de Prefijo</h3>
                            <div className="flex gap-[1px] rounded overflow-hidden">
                                {Array.from({ length: 128 }, (_, i) => (
                                    <div
                                        key={i}
                                        className={`h-4 flex-1 min-w-[1px] ${i < result.data.prefix ? "bg-blue-500" : "bg-white/10"}`}
                                    />
                                ))}
                            </div>
                            <div className="flex justify-between mt-1 text-[10px] text-neutral-500">
                                <span>← {result.data.prefix} bits de red</span>
                                <span>{result.data.hostBits} bits de host →</span>
                            </div>
                        </div>

                        <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-xs text-neutral-500 block">Notación CIDR</span>
                                    <span className="text-lg font-mono font-bold text-blue-300">
                                        {result.data.networkAddress}/{result.data.prefix}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void copiar(`${result.data.networkAddress}/${result.data.prefix}`, "cidr6")}
                                    className="min-h-11 px-3 py-1.5 rounded-md text-xs font-medium text-white transition-colors"
                                    style={{ background: `${ACCENT}30` }}
                                >
                                    {estadoCopia("cidr6", "Copiar")}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {!isValid && ipSolo && (
                    <div className="text-center py-8">
                        <p className="text-neutral-500 text-sm">
                            Introduce una dirección IPv{ipVersion} y un prefijo CIDR válidos
                        </p>
                    </div>
                )}

                {ipVersion === 4 && <PlanificadorVlsm />}

                {/* Reference Table */}
                {ipVersion === 4 && (
                    <div className="mt-8 bg-white/5 rounded-xl p-4 border border-white/10">
                        <h3 className="text-sm font-semibold text-white mb-3">Referencia Rápida CIDR</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-neutral-400">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="py-2 px-3 text-left text-white">CIDR</th>
                                        <th className="py-2 px-3 text-left text-white">Máscara</th>
                                        <th className="py-2 px-3 text-left text-white">Hosts</th>
                                        <th className="py-2 px-3 text-left text-white">Uso Común</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { cidr: "/8", mask: "255.0.0.0", hosts: "16.777.214", use: "Redes clase A (ISPs)" },
                                        { cidr: "/16", mask: "255.255.0.0", hosts: "65.534", use: "Redes clase B (empresas)" },
                                        { cidr: "/24", mask: "255.255.255.0", hosts: "254", use: "Redes clase C (LAN típica)" },
                                        { cidr: "/25", mask: "255.255.255.128", hosts: "126", use: "Mitad de clase C" },
                                        { cidr: "/26", mask: "255.255.255.192", hosts: "62", use: "Segmento mediano" },
                                        { cidr: "/27", mask: "255.255.255.224", hosts: "30", use: "Segmento pequeño" },
                                        { cidr: "/28", mask: "255.255.255.240", hosts: "14", use: "DMZ pequeña" },
                                        { cidr: "/29", mask: "255.255.255.248", hosts: "6", use: "Servidores / VoIP" },
                                        { cidr: "/30", mask: "255.255.255.252", hosts: "2", use: "Enlace punto a punto" },
                                        { cidr: "/32", mask: "255.255.255.255", hosts: "1", use: "Host único / Loopback" },
                                    ].map(row => (
                                        <tr key={row.cidr} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="py-1.5 px-3 font-mono text-blue-400">{row.cidr}</td>
                                            <td className="py-1.5 px-3 font-mono">{row.mask}</td>
                                            <td className="py-1.5 px-3">{row.hosts}</td>
                                            <td className="py-1.5 px-3">{row.use}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <p className="mt-4 text-xs text-neutral-500">Todo se calcula en tu navegador.</p>

                <div className="mt-8 text-center">
                    <Link href={"/herramientas" as Route} className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
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
