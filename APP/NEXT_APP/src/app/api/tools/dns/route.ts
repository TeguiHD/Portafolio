import { Resolver } from "node:dns/promises";
import { domainToASCII } from "node:url";
import { z } from "zod";
import { checkRateLimit } from "@/lib/redis";
import { ipCliente } from "@/lib/ip-cliente";
import { NextRequest, NextResponse } from "next/server";
import { DNS_RECORD_TYPE_IDS, DNS_RESOLVER_NODES, type DnsRecordType } from "@/lib/tools/dns-resolvers";
import { ipConInversaPublica, limpiarEntradaDns, nombreReservado } from "@/lib/tools/dns-consulta";
import { analizarDmarc, analizarSpf, type LectorTxt } from "@/lib/tools/dns-correo";

const QUERY_TIMEOUT_MS = 3500;
/** Tope total de la revisión de correo: sigue los include del SPF uno tras otro y no debe colgar la petición. */
const CORREO_TIMEOUT_MS = 9000;
/** La revisión de correo pregunta a un solo resolvedor (con otro de respaldo), no a los 6. */
const CORREO_SERVIDORES = ["1.1.1.1", "8.8.8.8"];
/** Respuestas recientes: la misma consulta seguida no vuelve a golpear 6 resolvedores (también frena abusos). */
const CACHE_MS = 30_000;
const cache = new Map<string, { at: number; body: unknown }>();

/** Solo estos tres parámetros; cualquier otro se descarta. */
const consultaSchema = z.object({
    domain: z.string("Escribe un dominio o una IP.").trim().min(1, "Escribe un dominio o una IP.").max(300, "El nombre es demasiado largo."),
    type: z.enum(DNS_RECORD_TYPE_IDS, "Tipo de registro no soportado.").default("A"),
    modo: z.enum(["registros", "correo"], "Modo de consulta no soportado.").default("registros"),
});

function isValidDomain(domain: string) {
    if (!domain || domain.length > 253) return false;
    if (nombreReservado(domain)) return false;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) return false;

    // Se admiten etiquetas con «_» (_dmarc, selector._domainkey, _acme-challenge) y TLD en punycode (xn--…).
    return /^([a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9])?\.)+([a-z]{2,63}|xn--[a-z0-9-]{2,59})$/i.test(domain);
}

/** Corre la consulta con un tope de tiempo; al vencer, cancela las consultas pendientes del resolvedor (antes seguían). */
async function withTimeout<T>(resolver: Resolver, promise: Promise<T>, timeoutMs: number): Promise<T> {
    let reloj: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => { reloj = setTimeout(() => { resolver.cancel(); reject(new Error("DNS_TIMEOUT")); }, timeoutMs); }),
        ]);
    } finally {
        clearTimeout(reloj);
    }
}

/** Node pone el código en error.code («queryA ENODATA x» es el mensaje): sin registros o sin dominio no es un fallo. */
function esRespuestaVacia(error: unknown) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    return code === "ENODATA" || code === "ENOTFOUND";
}

async function resolveRecord(resolver: Resolver, domain: string, type: DnsRecordType) {

    switch (type) {
        case "A": {
            const records = await resolver.resolve4(domain, { ttl: true });
            return records.map(record => ({ value: record.address, ttl: record.ttl }));
        }
        case "AAAA": {
            const records = await resolver.resolve6(domain, { ttl: true });
            return records.map(record => ({ value: record.address, ttl: record.ttl }));
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
        case "SOA": {
            const soa = await resolver.resolveSoa(domain);
            return [{ value: `${soa.nsname} ${soa.hostmaster} ${soa.serial} ${soa.refresh} ${soa.retry} ${soa.expire} ${soa.minttl}`, ttl: null }];
        }
        case "CAA": {
            const records = await resolver.resolveCaa(domain);
            return records.map(record => {
                const [etiqueta, valor] = Object.entries(record).find(([clave]) => clave !== "critical" && clave !== "type") ?? ["?", ""];
                return { value: `${record.critical} ${etiqueta} "${String(valor)}"`, ttl: null };
            });
        }
        case "SRV": {
            const records = await resolver.resolveSrv(domain);
            return records
                .sort((left, right) => left.priority - right.priority || right.weight - left.weight)
                .map(record => ({ value: `${record.priority} ${record.weight} ${record.port} ${record.name}`, ttl: null }));
        }
        case "PTR": {
            const records = await resolver.resolvePtr(domain);
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

/** Lector de TXT para la revisión de correo: un Resolver por consulta y un plazo común para toda la revisión. */
function crearLectorTxt(plazo: number): LectorTxt {
    return async nombre => {
        const restante = Math.min(QUERY_TIMEOUT_MS, plazo - Date.now());
        if (restante <= 0) return null;
        const dns = new Resolver({ timeout: 2000, tries: 1 });
        dns.setServers(CORREO_SERVIDORES);
        try {
            const registros = await withTimeout(dns, dns.resolveTxt(nombre), restante);
            return registros.map(partes => partes.join(""));
        } catch (error) {
            return esRespuestaVacia(error) ? [] : null;
        }
    };
}

async function revisarCorreo(domain: string) {
    const leer = crearLectorTxt(Date.now() + CORREO_TIMEOUT_MS);
    const [txtDominio, txtDmarc] = await Promise.all([leer(domain), leer(`_dmarc.${domain}`)]);
    const spf = await analizarSpf(domain, txtDominio, leer);
    return {
        modo: "correo" as const,
        domain,
        generatedAt: new Date().toISOString(),
        resolvers: "Cloudflare (1.1.1.1), con Google (8.8.8.8) de respaldo",
        spf,
        dmarc: analizarDmarc(domain, txtDmarc),
    };
}

function guardarEnCache(clave: string, body: unknown) {
    if (cache.size > 500) cache.clear();
    cache.set(clave, { at: Date.now(), body });
}

export async function GET(request: NextRequest) {
    const parsed = consultaSchema.safeParse({
        domain: request.nextUrl.searchParams.get("domain") ?? undefined,
        type: request.nextUrl.searchParams.get("type") ?? undefined,
        modo: request.nextUrl.searchParams.get("modo") ?? undefined,
    });
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Consulta inválida." }, { status: 400 });
    }
    const { modo } = parsed.data;
    let type: DnsRecordType = parsed.data.type;

    // Una IP solo sirve para la consulta inversa: se pregunta el PTR de su nombre en in-addr.arpa o ip6.arpa.
    const entrada = limpiarEntradaDns(parsed.data.domain);
    let domain: string;
    let reverseOf: string | null = null;
    if (entrada.tipo === "ip") {
        if (modo === "correo") {
            return NextResponse.json({ error: "La revisión de correo necesita un dominio, no una IP." }, { status: 400 });
        }
        if (!ipConInversaPublica(entrada)) {
            return NextResponse.json(
                { error: "Esa IP es privada, de documentación o reservada: su nombre inverso no se publica en el DNS público." },
                { status: 400 }
            );
        }
        domain = entrada.inversa;
        reverseOf = entrada.ip;
        type = "PTR";
    } else {
        // Dominios con ñ o tildes → punycode (xn--…), que es lo que entiende el DNS.
        domain = domainToASCII(entrada.nombre) || entrada.nombre;
        if (!isValidDomain(domain) || (modo === "correo" && domain.length > 253 - "_dmarc.".length)) {
            return NextResponse.json(
                { error: "Dominio inválido. Usa un FQDN público como ejemplo.com, o una IP para la consulta inversa." },
                { status: 400 }
            );
        }
    }

    const clave = modo === "correo" ? `correo|${domain}` : `${type}|${domain}`;
    const guardada = cache.get(clave);
    if (guardada && Date.now() - guardada.at < CACHE_MS) return NextResponse.json(guardada.body);

    // Cada consulta son 6 preguntas a resolvedores públicos (la de correo, hasta 12 a uno): límite propio, además del general de /api.
    const limite = await checkRateLimit(`dns:${ipCliente(request.headers)}`, 20, 60).catch(() => ({ allowed: true }));
    if (!limite.allowed) {
        return NextResponse.json({ error: "Demasiadas consultas seguidas. Prueba de nuevo en un minuto." }, { status: 429 });
    }

    if (modo === "correo") {
        const body = await revisarCorreo(domain);
        guardarEnCache(clave, body);
        return NextResponse.json(body);
    }

    const startedAt = Date.now();

    const nodes = await Promise.all(
        DNS_RESOLVER_NODES.map(async resolver => {
            const resolverStartedAt = performance.now();

            try {
                const dns = new Resolver({ timeout: 2000, tries: 1 });
                dns.setServers([resolver.ip]);
                const records = await withTimeout(dns, resolveRecord(dns, domain, type), QUERY_TIMEOUT_MS);
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

                if (esRespuestaVacia(error)) {
                    return {
                        ...resolver,
                        status: "success" as const,
                        records: [],
                        durationMs,
                        // NXDOMAIN (el nombre no existe) se distingue de «existe, pero sin registros de este tipo».
                        noExiste: (error as NodeJS.ErrnoException).code === "ENOTFOUND",
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

    const body = {
        modo: "registros" as const,
        domain,
        reverseOf,
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
    };
    guardarEnCache(clave, body);
    return NextResponse.json(body);
}
