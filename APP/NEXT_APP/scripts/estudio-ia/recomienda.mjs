/**
 * «¿A quién recomienda la IA?» — marcador mensual. Hace las 18 preguntas fijas (src/lib/estudio-ia/analizar.ts) a
 * Claude (claude-opus-5-5), 5 veces cada una, de memoria y con búsqueda web, por la API de lotes (mitad de precio), y
 * deja en <carpeta>/AAAA-MM/ las respuestas y un resumen: en qué porcentaje de corridas nombra al dueño, en cuántas cita
 * nicoholas.dev y qué dominios aparecen en su lugar.
 *
 * Uso:
 *   SDK_DIR=<node_modules con @anthropic-ai/sdk> [CLAVE=~/.config/anthropic/api-key] \
 *     node scripts/estudio-ia/recomienda.mjs <carpeta> [AAAA-MM] [enviar|esperar|leer]
 * Sin paso: envía, espera (hasta 24 h) y lee. Si el mes ya tiene lotes enviados, no los envía de nuevo.
 * Diseño: docs/superpowers/specs/2026-11-24-estudio-ia-recomienda-design.md. La clave nunca se imprime.
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

const [, , carpetaBase, mesArg, paso] = process.argv;
if (!carpetaBase || !process.env.SDK_DIR) { console.error("Uso: SDK_DIR=… node scripts/estudio-ia/recomienda.mjs <carpeta> [AAAA-MM] [enviar|esperar|leer]"); process.exit(1); }
const mes = mesArg && /^\d{4}-\d{2}$/.test(mesArg) ? mesArg : new Date().toISOString().slice(0, 7);
const carpeta = join(carpetaBase, mes);
await mkdir(carpeta, { recursive: true });
const { default: Anthropic } = await import(join(process.env.SDK_DIR, "@anthropic-ai/sdk/index.mjs"));
const { PREGUNTAS, leerRespuesta, porcentaje } = await import("../../src/lib/estudio-ia/analizar.ts");
const client = new Anthropic({ apiKey: (await readFile((process.env.CLAVE ?? "~/.config/anthropic/api-key").replace(/^~/, homedir()), "utf8")).trim() });

const MODELO = "claude-opus-5-5", CORRIDAS = 5;
const rutaLotes = join(carpeta, "lotes.json"), rutaRespuestas = join(carpeta, "respuestas.json");
const existe = (p) => access(p).then(() => true, () => false);

async function enviar() {
    if (await existe(rutaLotes)) { console.error(`${mes}: ya hay lotes enviados`); return; }
    const pedidos = (modo) => PREGUNTAS.flatMap((p) => Array.from({ length: CORRIDAS }, (_, k) => ({
        custom_id: `${p.id}-${k}`,
        params: {
            model: MODELO, max_tokens: modo === "busqueda" ? 8000 : 4000, output_config: { effort: "low" },
            messages: [{ role: "user", content: p.texto }],
            ...(modo === "busqueda" ? { tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }] } : {}),
        },
    })));
    const memoria = await client.messages.batches.create({ requests: pedidos("memoria") });
    const busqueda = await client.messages.batches.create({ requests: pedidos("busqueda") });
    await writeFile(rutaLotes, JSON.stringify({ memoria: memoria.id, busqueda: busqueda.id, enviado: new Date().toISOString(), modelo: MODELO, corridas: CORRIDAS }, null, 1));
    console.error(`${mes}: ${PREGUNTAS.length * CORRIDAS} preguntas × 2 enviadas`);
}

async function esperar() {
    const lotes = JSON.parse(await readFile(rutaLotes, "utf8"));
    for (const id of [lotes.memoria, lotes.busqueda]) {
        for (let vuelta = 0; ; vuelta++) {
            const b = await client.messages.batches.retrieve(id);
            if (b.processing_status === "ended") break;
            if (vuelta > 24 * 30) throw new Error(`${id} no terminó en 24 h`);
            await new Promise((r) => setTimeout(r, 120_000));
        }
    }
}

/** Texto final y fuentes de una respuesta (los resultados de la búsqueda y las citas del texto). */
function partes(m) {
    const texto = m.content.filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();
    const fuentes = [];
    for (const b of m.content) {
        if (b.type === "web_search_tool_result" && Array.isArray(b.content)) for (const r of b.content) if (r.url) fuentes.push(r.url);
        if (b.type === "text") for (const c of b.citations ?? []) if (c.url) fuentes.push(c.url);
    }
    return { texto, fuentes: [...new Set(fuentes)] };
}

async function leer() {
    const lotes = JSON.parse(await readFile(rutaLotes, "utf8"));
    const filas = [];
    for (const [modo, id] of [["memoria", lotes.memoria], ["busqueda", lotes.busqueda]]) {
        for await (const r of await client.messages.batches.results(id)) {
            const pregunta = r.custom_id.replace(/-\d+$/, "");
            if (r.result.type !== "succeeded") { filas.push({ pregunta, modo, error: r.result.type }); continue; }
            const m = r.result.message;
            if (m.stop_reason === "refusal") { filas.push({ pregunta, modo, error: "refusal" }); continue; }
            const { texto, fuentes } = partes(m);
            filas.push({ pregunta, modo, texto: texto.slice(0, 4000), fuentes, ...leerRespuesta(texto, fuentes) });
        }
    }
    await writeFile(rutaRespuestas, JSON.stringify({ mes, modelo: lotes.modelo, filas }, null, 1));
    await writeFile(join(carpeta, "resumen.md"), resumen(filas));
    console.error(`${mes}: ${filas.length} respuestas leídas; resumen en ${join(carpeta, "resumen.md")}`);
}

function resumen(filas) {
    const ok = filas.filter((f) => !f.error);
    const linea = (sub) => `${porcentaje(sub.filter((f) => f.nombra).length, sub.length)} % lo nombra · ${porcentaje(sub.filter((f) => f.cita).length, sub.length)} % cita nicoholas.dev (${sub.length} corridas)`;
    // Las preguntas de marca ya traen el nombre o el dominio: no entran al porcentaje principal; en ellas cuenta si lo conoce.
    const tipo = (f) => PREGUNTAS.find((p) => p.id === f.pregunta)?.tipo;
    const out = [`# ¿A quién recomienda Claude? — ${mes}`, "", `Modelo ${MODELO}, ${CORRIDAS} corridas por pregunta, de memoria y con búsqueda web.`, "",
        "En las preguntas sin tu nombre (nicho y herramientas):"];
    for (const modo of ["memoria", "busqueda"]) out.push(`- **${modo === "memoria" ? "De memoria" : "Buscando"}:** ${linea(ok.filter((f) => f.modo === modo && tipo(f) !== "marca"))}`);
    out.push("", "En las preguntas de marca:");
    for (const modo of ["memoria", "busqueda"]) { const sub = ok.filter((f) => f.modo === modo && tipo(f) === "marca"); out.push(`- **${modo === "memoria" ? "De memoria" : "Buscando"}:** te conoce en ${porcentaje(sub.filter((f) => f.conoce).length, sub.length)} % (${sub.length} corridas)`); }
    out.push("", "## Por pregunta", "", "| Pregunta | Memoria | Búsqueda | Búsqueda: cita el sitio |", "|---|---|---|---|");
    for (const p of PREGUNTAS) {
        const de = (modo) => ok.filter((f) => f.pregunta === p.id && f.modo === modo);
        const n = (sub) => `${sub.filter((f) => (p.tipo === "marca" ? f.conoce : f.nombra)).length}/${sub.length}${p.tipo === "marca" ? " lo conoce" : ""}`;
        out.push(`| ${p.texto} | ${n(de("memoria"))} | ${n(de("busqueda"))} | ${de("busqueda").filter((f) => f.cita).length}/${de("busqueda").length} |`);
    }
    const cuenta = new Map();
    for (const f of ok.filter((x) => PREGUNTAS.find((p) => p.id === x.pregunta)?.tipo === "nicho")) for (const d of f.dominios) cuenta.set(d, (cuenta.get(d) ?? 0) + 1);
    out.push("", "## Quiénes aparecen en las preguntas de nicho", "", ...[...cuenta].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([d, n]) => `- ${d}: ${n}`));
    const fallas = filas.length - ok.length;
    if (fallas) out.push("", `${fallas} corridas sin respuesta (error o rechazo).`);
    return out.join("\n") + "\n";
}

if (!paso || paso === "enviar") await enviar();
if (!paso || paso === "esperar") await esperar();
if (!paso || paso === "leer") await leer();
