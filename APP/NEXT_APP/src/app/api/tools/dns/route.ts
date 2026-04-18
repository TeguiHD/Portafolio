import { Resolver } from "node:dns/promises";
import { NextRequest, NextResponse } from "next/server";
import { DNS_RECORD_TYPES, DNS_RESOLVER_NODES, type DnsRecordType } from "@/lib/tools/dns-resolvers";

const QUERY_TIMEOUT_MS = 3500;

function normalizeDomain(input: string) {
    return input.replace(/^https?:\/\//, "").split("/")[0].split(":")[0].trim().toLowerCase();
}

function isValidDomain(domain: string) {
    const blocklist = ["localhost", "127.0.0.1", "0.0.0.0", "::1", ".local", ".internal"];

    if (!domain || domain.length > 253) return false;
    if (blocklist.some(token => domain.includes(token))) return false;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) return false;

    return /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain);
}

function isDnsRecordType(value: string | null): value is DnsRecordType {
    return DNS_RECORD_TYPES.some(record => record.id === value);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            setTimeout(() => reject(new Error("DNS_TIMEOUT")), timeoutMs);
        }),
    ]);
}

async function resolveRecord(serverIp: string, domain: string, type: DnsRecordType) {
    const resolver = new Resolver();
    resolver.setServers([serverIp]);

    switch (type) {
        case "A": {
            const records = await resolver.resolve4(domain, { ttl: true });
            return records.map(record => typeof record === "string"
                ? { value: record, ttl: null }
                : { value: record.address, ttl: record.ttl });
        }
        case "AAAA": {
            const records = await resolver.resolve6(domain);
            return records.map(record => ({ value: record, ttl: null }));
        }
        case "CNAME": {
            const records = await resolver.resolveCname(domain);
            return records.map(record => ({ value: record, ttl: null }));
        }
        case "MX": {
            const records = await resolver.resolveMx(domain);
            return records
                .sort((left, right) => left.priority - right.priority)
                .map(record => ({ value: `${record.priority} ${record.exchange}`, ttl: null }));
        }
        case "TXT": {
            const records = await resolver.resolveTxt(domain);
            return records.map(record => ({ value: record.join(""), ttl: null }));
        }
        case "NS": {
            const records = await resolver.resolveNs(domain);
            return records.map(record => ({ value: record, ttl: null }));
        }
        default:
            return [];
    }
}

function summarizeConsistency(records: Array<{ status: string; records: Array<{ value: string }> }>) {
    const signatures = records
        .filter(record => record.status === "success")
        .map(record => record.records.map(item => item.value).sort().join("|"));

    return new Set(signatures).size <= 1;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const domain = normalizeDomain(searchParams.get("domain") || "");
    const requestedType = searchParams.get("type");
    const type: DnsRecordType = isDnsRecordType(requestedType) ? requestedType : "A";

    if (!isValidDomain(domain)) {
        return NextResponse.json(
            { error: "Dominio inválido. Usa un FQDN público como ejemplo.com" },
            { status: 400 }
        );
    }

    const startedAt = Date.now();

    const nodes = await Promise.all(
        DNS_RESOLVER_NODES.map(async resolver => {
            const resolverStartedAt = performance.now();

            try {
                const records = await withTimeout(resolveRecord(resolver.ip, domain, type), QUERY_TIMEOUT_MS);
                const durationMs = Math.round(performance.now() - resolverStartedAt);

                return {
                    ...resolver,
                    status: "success" as const,
                    records,
                    durationMs,
                };
            } catch (error) {
                const durationMs = Math.round(performance.now() - resolverStartedAt);
                const message = error instanceof Error ? error.message : "DNS_ERROR";
                const emptyResponse = message === "ENODATA" || message === "ENOTFOUND";

                if (emptyResponse) {
                    return {
                        ...resolver,
                        status: "success" as const,
                        records: [],
                        durationMs,
                    };
                }

                return {
                    ...resolver,
                    status: "error" as const,
                    records: [],
                    durationMs,
                    error: message === "DNS_TIMEOUT" ? "Tiempo de espera agotado" : "Consulta fallida",
                };
            }
        })
    );

    const successfulNodes = nodes.filter(node => node.status === "success");
    const fastestNode = successfulNodes.slice().sort((left, right) => left.durationMs - right.durationMs)[0] || null;

    return NextResponse.json({
        domain,
        type,
        generatedAt: new Date().toISOString(),
        queriedResolvers: nodes.length,
        totalDurationMs: Date.now() - startedAt,
        summary: {
            successfulResolvers: successfulNodes.length,
            failedResolvers: nodes.length - successfulNodes.length,
            consistentAnswers: summarizeConsistency(nodes),
            fastestResolver: fastestNode ? { id: fastestNode.id, name: fastestNode.name, durationMs: fastestNode.durationMs } : null,
        },
        nodes,
    });
}