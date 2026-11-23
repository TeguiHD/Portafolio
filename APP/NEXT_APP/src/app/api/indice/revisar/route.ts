import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/redis";
import { ipCliente } from "@/lib/ip-cliente";
import { claveIp } from "@/lib/indice/ip-permitida";
import { ErrorRevision, revisarSitio } from "@/lib/indice/pedir-seguro.server";
import { CONTROLES, puntajeRevision } from "@/lib/indice/revision";
import { EDICION, cumplimiento, medidos, percentilControles } from "@/lib/indice/datos";

/**
 * El revisor público del Índice de la Web Chilena: los doce controles sobre el sitio que escriba cualquiera, comparados
 * con los sitios del índice. Pide sitios de terceros, así que va con tres frenos: 6 revisiones cada 10 minutos por IP,
 * 3 a la vez en todo el servidor, y la misma respuesta reciente por 10 minutos (no vuelve a pedir el mismo sitio).
 * Las defensas contra SSRF viven en pedir-seguro.server.ts.
 */
export const dynamic = "force-dynamic";

const entrada = z.object({ url: z.string().trim().min(1, "Escribe la dirección de un sitio.").max(300, "La dirección es demasiado larga.") });
const CACHE_MS = 10 * 60_000;
const cache = new Map<string, { at: number; cuerpo: unknown }>();
let enCurso = 0;
const MAX_A_LA_VEZ = 3;

const base = medidos(EDICION.sitios);
const pasan = Object.fromEntries(cumplimiento(base).map((c) => [c.id, c.pct]));

export async function POST(req: NextRequest) {
    const limite = await checkRateLimit(`indice-revisar:${claveIp(ipCliente(req.headers))}`, 6, 600);
    if (!limite.allowed) return NextResponse.json({ error: "Ya revisaste varios sitios seguidos. Prueba de nuevo en unos minutos." }, { status: 429, headers: { "Retry-After": String(limite.resetIn ?? 600) } });

    let datos: z.infer<typeof entrada>;
    try { datos = entrada.parse(await req.json()); } catch { return NextResponse.json({ error: "Escribe la dirección de un sitio, como ejemplo.cl." }, { status: 400 }); }

    const clave = datos.url.toLowerCase().replace(/\/+$/, "");
    const reciente = cache.get(clave);
    if (reciente && Date.now() - reciente.at < CACHE_MS) return NextResponse.json(reciente.cuerpo);

    if (enCurso >= MAX_A_LA_VEZ) return NextResponse.json({ error: "Hay varias revisiones en curso. Prueba de nuevo en un minuto." }, { status: 503, headers: { "Retry-After": "60" } });
    enCurso++;
    try {
        const r = await revisarSitio(datos.url);
        const puntaje = puntajeRevision(r.revision);
        const cuerpo = {
            url: r.url,
            urlFinal: r.urlFinal,
            puntaje,
            percentil: percentilControles(puntaje, base),
            sitiosIndice: base.filter((s) => s.revision).length,
            controles: CONTROLES.map((c) => ({ id: c.id, nombre: c.nombre, grupo: c.grupo, cumple: r.revision[c.id], porQue: c.porQue, arreglo: c.arreglo, pctIndice: pasan[c.id] ?? null })),
        };
        if (cache.size > 500) cache.delete(cache.keys().next().value!);
        cache.set(clave, { at: Date.now(), cuerpo });
        return NextResponse.json(cuerpo);
    } catch (e) {
        if (e instanceof ErrorRevision) return NextResponse.json({ error: e.message, codigo: e.codigo }, { status: e.codigo === "url" || e.codigo === "privada" ? 400 : 502 });
        return NextResponse.json({ error: "No se pudo revisar el sitio. Prueba de nuevo." }, { status: 502 });
    } finally {
        enCurso--;
    }
}
