/**
 * Índice de la Web Chilena, edición 2026-12: «Lo que responde la IA». Le pregunta a Claude (claude-opus-5-5) por el
 * sitio web oficial de cada institución, de dos formas:
 * - de memoria: sin herramientas (lo que aprendió);
 * - buscando: con la búsqueda web del servidor (web_search_20260209), como lo ve alguien en claude.ai.
 * Usa la API de lotes (Message Batches: mitad de precio; la respuesta no es urgente). Solo guarda las respuestas: el
 * compilador decide si aciertan (el host de la respuesta igual al del sitio verificado).
 *
 * Uso:
 *   SDK_DIR=<carpeta node_modules con @anthropic-ai/sdk> CLAVE=~/.config/anthropic/api-key \
 *     node scripts/indice/medir-ia.mjs <entidades.json> <carpeta-salida> [enviar|esperar|leer]
 * «enviar» crea los dos lotes y anota sus ids en <carpeta>/lotes.json; «esperar» consulta hasta que terminen;
 * «leer» baja los resultados a <carpeta>/respuestas.json. Sin paso, hace los tres. La clave nunca se imprime.
 */
import { readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

const [, , archivoEntidades, carpeta, paso] = process.argv;
if (!archivoEntidades || !carpeta || !process.env.SDK_DIR) {
    console.error("Uso: SDK_DIR=… [CLAVE=…] node scripts/indice/medir-ia.mjs <entidades.json> <carpeta> [enviar|esperar|leer]");
    process.exit(1);
}
const { default: Anthropic } = await import(join(process.env.SDK_DIR, "@anthropic-ai/sdk/index.mjs"));
const rutaClave = (process.env.CLAVE ?? "~/.config/anthropic/api-key").replace(/^~/, homedir());
const client = new Anthropic({ apiKey: (await readFile(rutaClave, "utf8")).trim() });

const MODELO = "claude-opus-5-5";
const pregunta = (nombre) => `¿Cuál es el sitio web oficial de «${nombre}», en Chile? Responde solo con la dirección del sitio, sin explicación.`;
const rutaLotes = join(carpeta, "lotes.json"), rutaRespuestas = join(carpeta, "respuestas.json");
const existe = (p) => access(p).then(() => true, () => false);

const entidades = JSON.parse(await readFile(archivoEntidades, "utf8")).filter((e) => e.url);
// custom_id admite hasta 64 caracteres [a-zA-Z0-9_-]: se usa la posición, y el mapa vuelve al slug.
const ids = Object.fromEntries(entidades.map((e, i) => [`e${String(i).padStart(4, "0")}`, e.slug]));

async function enviar() {
    if (await existe(rutaLotes)) { console.error("ya hay lotes enviados (lotes.json): no se envían de nuevo"); return; }
    const pedido = (modo) => entidades.map((e, i) => ({
        custom_id: `e${String(i).padStart(4, "0")}`,
        params: {
            model: MODELO,
            max_tokens: modo === "busqueda" ? 8000 : 4000,
            // Una consulta corta: esfuerzo bajo (thinking adaptativo, que en este modelo no se apaga).
            output_config: { effort: "low" },
            messages: [{ role: "user", content: pregunta(e.nombre) }],
            ...(modo === "busqueda" ? { tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 2 }] } : {}),
        },
    }));
    const memoria = await client.messages.batches.create({ requests: pedido("memoria") });
    const busqueda = await client.messages.batches.create({ requests: pedido("busqueda") });
    await writeFile(rutaLotes, JSON.stringify({ memoria: memoria.id, busqueda: busqueda.id, ids, enviado: new Date().toISOString(), modelo: MODELO }, null, 1));
    console.error(`lotes enviados: ${entidades.length} preguntas × 2`);
}

async function esperar() {
    const { memoria, busqueda } = JSON.parse(await readFile(rutaLotes, "utf8"));
    for (const id of [memoria, busqueda]) {
        for (;;) {
            const b = await client.messages.batches.retrieve(id);
            if (b.processing_status === "ended") { console.error(`${id}: listo (${b.request_counts.succeeded} bien, ${b.request_counts.errored} con error)`); break; }
            console.error(`${id}: ${b.processing_status}, ${b.request_counts.processing} pendientes`);
            await new Promise((r) => setTimeout(r, 60_000));
        }
    }
}

/** El texto final de una respuesta (los bloques de texto, sin los de búsqueda ni de pensamiento). */
const textoDe = (mensaje) => mensaje.content.filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();

async function leer() {
    const { memoria, busqueda, ids: mapa } = JSON.parse(await readFile(rutaLotes, "utf8"));
    const salida = {};
    for (const [modo, id] of [["memoria", memoria], ["busqueda", busqueda]]) {
        for await (const r of await client.messages.batches.results(id)) {
            const slug = mapa[r.custom_id];
            salida[slug] ??= {};
            if (r.result.type === "succeeded") {
                const m = r.result.message;
                salida[slug][modo] = {
                    texto: m.stop_reason === "refusal" ? null : textoDe(m).slice(0, 500),
                    stop: m.stop_reason,
                    busquedas: m.content.filter((b) => b.type === "server_tool_use").length,
                };
            } else {
                salida[slug][modo] = { texto: null, stop: r.result.type };
            }
        }
    }
    await writeFile(rutaRespuestas, JSON.stringify(salida, null, 1));
    console.error(`respuestas: ${Object.keys(salida).length} instituciones`);
}

if (!paso || paso === "enviar") await enviar();
if (!paso || paso === "esperar") await esperar();
if (!paso || paso === "leer") await leer();
