// Genera los fondos del modo escritorio: abre fondos.html en Chromium (el de Playwright), saca cada lienzo en PNG y lo
// exporta con sharp a AVIF y WebP en 1280, 1920 y 2560 px, más una miniatura de 320 px para Configuración.
//   node scripts/escritorio/fondos/generar.mjs                → todos, a public/escritorio/fondos/
//   node scripts/escritorio/fondos/generar.mjs pampa curvas   → solo esos
//   node scripts/escritorio/fondos/generar.mjs --vista DIR    → vistas previas PNG de 1280×720 en DIR (para revisar)
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const TODOS = ["pampa", "pacifico", "cordillera", "austral", "curvas", "grafito", "papel", "materia"];
const args = process.argv.slice(2);
const iVista = args.indexOf("--vista");
const vista = iVista >= 0 ? resolve(args[iVista + 1]) : null;
const ids = args.filter((a) => TODOS.includes(a));
const lista = ids.length ? ids : TODOS;
const SALIDA = resolve(AQUI, "../../../public/escritorio/fondos");
mkdirSync(vista ?? SALIDA, { recursive: true });

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
for (const id of lista) {
    const [w, h] = vista ? [1280, 720] : [2560, 1440];
    await pagina.setViewportSize({ width: w, height: h });
    // El dibujo corre dentro de la carga de la página: en 2560 px los paisajes tardan más de un minuto.
    await pagina.goto(`${pathToFileURL(join(AQUI, "fondos.html"))}?id=${id}&w=${w}&h=${h}`, { waitUntil: "commit", timeout: 600000 });
    await pagina.waitForFunction(() => window.listo === true, null, { timeout: 600000, polling: 1000 });
    const png = Buffer.from((await pagina.evaluate(() => document.getElementById("c").toDataURL("image/png"))).split(",")[1], "base64");
    if (vista) { await sharp(png).toFile(join(vista, `${id}.png`)); console.log("vista", id); continue; }
    for (const ancho of [1280, 1920, 2560]) {
        const base = sharp(png).resize(ancho, Math.round((ancho * 9) / 16));
        await base.clone().avif({ quality: 58, effort: 6, chromaSubsampling: "4:4:4" }).toFile(join(SALIDA, `${id}-${ancho}.avif`));
        await base.clone().webp({ quality: 82, effort: 6 }).toFile(join(SALIDA, `${id}-${ancho}.webp`));
    }
    await sharp(png).resize(320, 180).webp({ quality: 80 }).toFile(join(SALIDA, `${id}-mini.webp`));
    console.log("listo", id);
}
await navegador.close();
