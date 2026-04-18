"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";

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
    { cidr: 8, name: "Clase A", hosts: "16,777,214" },
    { cidr: 16, name: "Clase B", hosts: "65,534" },
    { cidr: 24, name: "Clase C", hosts: "254" },
    { cidr: 25, name: "Mitad Clase C", hosts: "126" },
    { cidr: 26, name: "/26", hosts: "62" },
    { cidr: 27, name: "/27", hosts: "30" },
    { cidr: 28, name: "/28", hosts: "14" },
    { cidr: 29, name: "/29 (Punto a punto)", hosts: "6" },
    { cidr: 30, name: "/30 (Enlace P2P)", hosts: "2" },
    { cidr: 32, name: "/32 (Host único)", hosts: "1" },
];

export default function SubnetCalculatorPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("subredes");
    const [ipInput, setIpInput] = useState("192.168.1.0");
    const [cidrInput, setCidrInput] = useState("24");
    const [ipVersion, setIpVersion] = useState<4 | 6>(4);
    const [copied, setCopied] = useState<string | null>(null);

    const isValid = useMemo(() => {
        const cidr = parseInt(cidrInput, 10);
        if (isNaN(cidr)) return false;

        if (ipVersion === 4) {
            return isValidIPv4(ipInput) && cidr >= 0 && cidr <= 32;
        } else {
            return isValidIPv6(ipInput) && cidr >= 0 && cidr <= 128;
        }
    }, [ipInput, cidrInput, ipVersion]);

    const result = useMemo(() => {
        if (!isValid) return null;
        const cidr = parseInt(cidrInput, 10);

        if (ipVersion === 4) {
            return { type: "v4" as const, data: calculateIPv4Subnet(ipInput, cidr) };
        } else {
            return { type: "v6" as const, data: calculateIPv6Subnet(ipInput, cidr) };
        }
    }, [ipInput, cidrInput, ipVersion, isValid]);

    const handleCopy = useCallback(async (text: string, label: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    }, []);

    const handleAutoDetect = useCallback((value: string) => {
        // Auto-detect IP version from input
        if (value.includes(":")) {
            setIpVersion(6);
            // If input contains /, split it
            if (value.includes("/")) {
                const [ip, prefix] = value.split("/");
                setIpInput(ip);
                setCidrInput(prefix);
            } else {
                setIpInput(value);
            }
        } else {
            setIpVersion(4);
            if (value.includes("/")) {
                const [ip, prefix] = value.split("/");
                setIpInput(ip);
                setCidrInput(prefix);
            } else {
                setIpInput(value);
            }
        }
    }, []);

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
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        Calculadora de Subredes
                    </h1>
                    <p className="text-neutral-400 text-sm sm:text-base">
                        Calcula subredes IPv4 e IPv6 — máscara, red, broadcast y rango utilizable
                    </p>
                </div>

                {/* IP Version Toggle */}
                <div className="flex gap-2 bg-white/5 rounded-xl p-2 border border-white/10 mb-6">
                    {([4, 6] as const).map(v => (
                        <button
                            key={v}
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
                                maxLength={ipVersion === 4 ? 15 : 45}
                            />
                            {ipInput && !((ipVersion === 4 ? isValidIPv4 : isValidIPv6)(ipInput)) && (
                                <p className="text-xs text-red-400 mt-1">
                                    IPv{ipVersion} no válida
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
                                    onChange={e => setCidrInput(e.target.value)}
                                    min={0}
                                    max={ipVersion === 4 ? 32 : 128}
                                    className="w-full bg-[#0F1724] border border-white/10 rounded-lg px-4 py-3 text-sm text-white font-mono outline-none focus:ring-2"
                                    style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
                                />
                            </div>
                        </label>
                    </div>
                </div>

                {/* Quick CIDR Presets (IPv4 only) */}
                {ipVersion === 4 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                        {COMMON_SUBNETS.map(s => (
                            <button
                                key={s.cidr}
                                onClick={() => setCidrInput(String(s.cidr))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${parseInt(cidrInput) === s.cidr
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

                {/* Results */}
                {result && result.type === "v4" && (
                    <div className="space-y-4">
                        {/* Main Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                                { label: "Dirección de Red", value: result.data.networkAddress, accent: true },
                                { label: "Dirección de Broadcast", value: result.data.broadcastAddress },
                                { label: "Máscara de Subred", value: result.data.subnetMask },
                                { label: "Máscara Wildcard", value: result.data.wildcardMask },
                                { label: "Primera IP Utilizable", value: result.data.firstUsable, accent: true },
                                { label: "Última IP Utilizable", value: result.data.lastUsable, accent: true },
                            ].map(item => (
                                <button
                                    key={item.label}
                                    onClick={() => handleCopy(item.value, item.label)}
                                    className="bg-white/5 rounded-xl p-4 border border-white/10 text-left hover:bg-white/8 transition-colors group"
                                >
                                    <span className="text-xs text-neutral-500 block mb-1">{item.label}</span>
                                    <span className={`text-sm font-mono ${item.accent ? "text-blue-400" : "text-white"}`}>
                                        {item.value}
                                    </span>
                                    <span className="text-[10px] text-neutral-600 block mt-1 group-hover:text-neutral-400 transition-colors">
                                        {copied === item.label ? "✓ Copiado" : "Click para copiar"}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                                <span className="text-xs text-neutral-500 block">Hosts Totales</span>
                                <span className="text-lg font-bold text-white">{result.data.totalHosts.toLocaleString()}</span>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                                <span className="text-xs text-neutral-500 block">Hosts Utilizables</span>
                                <span className="text-lg font-bold text-blue-400">{result.data.usableHosts.toLocaleString()}</span>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                                <span className="text-xs text-neutral-500 block">Clase IP</span>
                                <span className="text-lg font-bold text-white">{result.data.ipClass}</span>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                                <span className="text-xs text-neutral-500 block">Tipo</span>
                                <span className={`text-lg font-bold ${result.data.isPrivate ? "text-green-400" : "text-yellow-400"}`}>
                                    {result.data.isPrivate ? "Privada" : "Pública"}
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
                                    onClick={() => handleCopy(`${result.data.networkAddress}/${result.data.cidr}`, "cidr")}
                                    className="px-3 py-1.5 rounded-md text-xs font-medium text-white transition-colors"
                                    style={{ background: `${ACCENT}30` }}
                                >
                                    {copied === "cidr" ? "✓ Copiado" : "Copiar"}
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
                                    onClick={() => handleCopy(item.full, item.label)}
                                    className="bg-white/5 rounded-xl p-4 border border-white/10 text-left hover:bg-white/8 transition-colors group"
                                >
                                    <span className="text-xs text-neutral-500 block mb-1">{item.label}</span>
                                    <span className="text-sm font-mono text-blue-400 block">{item.value}</span>
                                    <span className="text-[10px] font-mono text-neutral-600 block mt-1">{item.full}</span>
                                    <span className="text-[10px] text-neutral-600 block mt-1 group-hover:text-neutral-400">
                                        {copied === item.label ? "✓ Copiado" : "Click para copiar"}
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
                                    onClick={() => handleCopy(`${result.data.networkAddress}/${result.data.prefix}`, "cidr6")}
                                    className="px-3 py-1.5 rounded-md text-xs font-medium text-white transition-colors"
                                    style={{ background: `${ACCENT}30` }}
                                >
                                    {copied === "cidr6" ? "✓ Copiado" : "Copiar"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {!isValid && ipInput && (
                    <div className="text-center py-8">
                        <p className="text-neutral-500 text-sm">
                            Introduce una dirección IPv{ipVersion} y un prefijo CIDR válidos
                        </p>
                    </div>
                )}

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
                                        { cidr: "/8", mask: "255.0.0.0", hosts: "16,777,214", use: "Redes clase A (ISPs)" },
                                        { cidr: "/16", mask: "255.255.0.0", hosts: "65,534", use: "Redes clase B (empresas)" },
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

                {/* Security Notice */}
                <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                    <p className="text-xs text-blue-300">
                        <strong>🛡️ NIST SP 800-53 SC-7 (Boundary Protection):</strong> La segmentación de red
                        es fundamental para la defensa en profundidad. Esta herramienta ayuda a planificar
                        subredes siguiendo las mejores prácticas de protección de perímetro.
                        Todo se calcula localmente en tu navegador.
                    </p>
                </div>

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
