# Catálogo de /herramientas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** /herramientas sin la esfera: cabecera sobria, 6 destacadas (por uso real cuando hay datos), familias y lista completa; «También te puede servir» en cada herramienta; descripciones en lenguaje llano.

**Architecture:** Los datos editoriales (relacionadas, fecha de publicación, orden de respaldo) viven en el registro y en un módulo puro `tool-destacadas.ts` que se prueba desde Playwright sin navegador. El ranking se calcula en el servidor con una consulta a `ToolUsage` y caché en memoria; la página se lo pasa al índice (cliente). Las relacionadas se pintan en `CarcasaHerramientas`, que ya envuelve a las 29.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7 (`$queryRaw`), Playwright (única suite de pruebas).

**Spec:** `docs/superpowers/specs/2026-11-21-catalogo-herramientas-design.md`

## Global Constraints

- Copia en español, sin rótulos en mayúsculas, sin cajas de aviso ni bordes laterales de color, sin aspecto de kit de IA.
- Nada inventado: «Las más usadas» solo si las 6 salen de datos; si no, «Destacadas». Sin cifras de uso públicas.
- Frases vetadas en descripciones: «intuitivo», «control total», «perfecto para», «ideal para», «optimizado», «privacidad total», «sin marcas de agua», «descarga gratuita».
- LCP: la cabecera de /herramientas lleva `data-al-cargar` (nunca opacidad 0 arriba).
- Seguir modern-web-guidance de Chrome en HTML/CSS/JS nuevos.
- PC: compilar y probar en jaula (`systemd-run --user --scope -p MemoryMax=… -p MemorySwapMax=0`), una tarea pesada a la vez, nunca `next dev`.
- Sin commits: el usuario los pide explícitamente; los pasos de commit de este plan se omiten.
- La esfera se queda en la portada (`/`); solo sale de /herramientas.

## Review Focus

1. Una herramienta marcada privada o inactiva en el panel no debe aparecer en destacadas ni en relacionadas (llevaría a «Acceso restringido»). → pruebas en Task 1 y Task 4.
2. Sin base de datos (o con la consulta fallando) la página debe pintarse igual, con el orden de respaldo y el rótulo «Destacadas». → prueba en Task 3 (el servidor local de prueba no tiene base).
3. Con búsqueda, familia o favoritas activas, las destacadas se ocultan para que mande el resultado. → prueba en Task 3.
4. A 390 px las destacadas van de a 2 y nada desborda en horizontal. → prueba en Task 3.
5. Una sola persona (o un bot) no puede subir una herramienta al ranking: se cuentan IP distintas (ya guardadas como hash) y se excluyen agentes automatizados. → revisión de la consulta en Task 2 (sin base local no hay prueba e2e).

---

### Task 1: Datos editoriales y regla de destacadas

**Files:**
- Modify: `APP/NEXT_APP/src/lib/tool-registry.ts` (interfaz `ToolRegistryEntry`, las 29 entradas)
- Create: `APP/NEXT_APP/src/lib/tool-destacadas.ts`
- Modify: `APP/NEXT_APP/src/modules/landing/viva/Herramientas.tsx` (usar `DESTACADAS_RESPALDO` en vez de su `DESTACADAS` local)
- Test: `APP/NEXT_APP/tests/e2e/catalogo-datos.spec.ts`

**Interfaces:**
- Produces: en `ToolRegistryEntry`, `relacionadas: [string, string, string]` y `publicada?: string` (ISO `YYYY-MM-DD`).
- Produces (`tool-destacadas.ts`, sin `server-only`):
  - `export const DESTACADAS_RESPALDO = ["qr", "quitar-fondo", "comprimir-imagen", "claves", "json", "impuestos"] as const`
  - `export const UMBRAL_SESIONES = 5`
  - `export interface Destacadas { slugs: string[]; porUso: boolean }`
  - `export function elegirDestacadas(conteos: { slug: string; sesiones: number }[], publicas: string[]): Destacadas`
  - `export function esNueva(publicada: string | undefined, hoy: Date): boolean` (dentro de 60 días)
  - `export function relacionadasDe(slug: string, publicas: string[]): string[]`

Relacionadas (por flujo de trabajo; el implementador puede cambiar una con un `Ruling:`):

| herramienta | relacionadas |
|---|---|
| convertir-imagen | comprimir-imagen, redimensionar, recortar-imagen |
| recortar-imagen | redimensionar, comprimir-imagen, quitar-fondo |
| quitar-fondo | recortar-imagen, comprimir-imagen, marca-agua |
| convertir-ico | favicon, redimensionar, convertir-imagen |
| comprimir-imagen | redimensionar, convertir-imagen, metadatos |
| redimensionar | recortar-imagen, comprimir-imagen, convertir-imagen |
| paleta-colores | quitar-fondo, favicon, marca-agua |
| marca-agua | comprimir-imagen, redimensionar, metadatos |
| favicon | convertir-ico, paleta-colores, redimensionar |
| qr | enlaces, claves, comprimir-imagen |
| claves | base64, jwt, esteganografia |
| ascii | banner-ascii, quitar-fondo, recortar-imagen |
| enlaces | qr, base64, aleatorio |
| aleatorio | claves, enlaces, qr |
| unidades | impuestos, binario, subredes |
| base64 | json, jwt, binario |
| binario | base64, ascii, unidades |
| impuestos | unidades, enlaces, aleatorio |
| regex | json, jwt, base64 |
| jwt | base64, json, claves |
| json | jwt, base64, regex |
| dns | subredes, nginx, banner-ascii |
| nginx | dns, subredes, banner-ascii |
| esteganografia | esteganografia-imagen, base64, claves |
| esteganografia-imagen | esteganografia, metadatos, comprimir-imagen |
| metadatos | esteganografia-imagen, comprimir-imagen, marca-agua |
| reverse-shell | base64, subredes, banner-ascii |
| banner-ascii | ascii, nginx, reverse-shell |
| subredes | dns, nginx, binario |

`publicada`: ninguna de las 29 actuales se publicó en los últimos 60 días (git: 2026-01-07 y 2026-04-17), así que
el campo queda vacío en todas; es para las que se agreguen.

- [ ] **Step 1: Write the failing tests** (`catalogo-datos.spec.ts`, importando por ruta relativa como `viva-herramientas.spec.ts`)

```ts
test("cada herramienta tiene 3 relacionadas reales, distintas y que no son ella misma", () => {
  const slugs = new Set(DEFAULT_TOOL_REGISTRY.map((t) => t.slug));
  for (const t of DEFAULT_TOOL_REGISTRY) {
    expect(t.relacionadas, t.slug).toHaveLength(3);
    expect(new Set(t.relacionadas).size, t.slug).toBe(3);
    expect(t.relacionadas, t.slug).not.toContain(t.slug);
    for (const r of t.relacionadas) expect(slugs.has(r), `${t.slug} → ${r}`).toBe(true);
  }
});
test("sin datos suficientes: orden de respaldo y sin rótulo de uso", () => {
  expect(elegirDestacadas([], todas)).toEqual({ slugs: [...DESTACADAS_RESPALDO], porUso: false });
  expect(elegirDestacadas([{ slug: "json", sesiones: 4 }], todas).porUso).toBe(false);
});
test("con datos: manda el uso y el respaldo llena los huecos sin repetir", () => {
  const r = elegirDestacadas([{ slug: "dns", sesiones: 9 }, { slug: "qr", sesiones: 7 }], todas);
  expect(r.slugs.slice(0, 2)).toEqual(["dns", "qr"]);
  expect(r.slugs).toHaveLength(6); expect(new Set(r.slugs).size).toBe(6); expect(r.porUso).toBe(false);
});
test("las 6 por datos: rótulo de uso", () => {
  const seis = ["dns", "qr", "json", "jwt", "regex", "base64"].map((slug, i) => ({ slug, sesiones: 20 - i }));
  expect(elegirDestacadas(seis, todas)).toEqual({ slugs: seis.map((s) => s.slug), porUso: true });
});
test("una herramienta oculta en el panel no sale en destacadas ni en relacionadas", () => {
  const sinQr = todas.filter((s) => s !== "qr");
  expect(elegirDestacadas([], sinQr).slugs).not.toContain("qr");
  expect(elegirDestacadas([], sinQr).slugs).toHaveLength(6);
  expect(relacionadasDe("enlaces", sinQr)).not.toContain("qr");
});
test("«Nueva» solo dentro de 60 días", () => {
  const hoy = new Date("2026-11-21");
  expect(esNueva("2026-10-01", hoy)).toBe(true);
  expect(esNueva("2026-09-01", hoy)).toBe(false);
  expect(esNueva(undefined, hoy)).toBe(false);
});
```
(`todas` = slugs de `getDefaultPublicToolCatalog()`.) Cuando el respaldo no alcanza para 6 (herramientas ocultas), se completa con el resto del catálogo en su orden.

- [ ] **Step 2: Run and see them fail**
Run: `cd APP/NEXT_APP && node_modules/.bin/playwright test tests/e2e/catalogo-datos.spec.ts --project=chromium` (con `PLAYWRIGHT_WEB_COMMAND=false PLAYWRIGHT_BASE_URL=http://localhost:3000`, en jaula)
Expected: FAIL (módulo `tool-destacadas` no existe; `relacionadas` undefined)

- [ ] **Step 3: Implement** the interfaces above; add `relacionadas` to the 29 entries; `Herramientas.tsx` imports `DESTACADAS_RESPALDO`.

- [ ] **Step 4: Run and see them pass** — same command. Expected: 6 passed.

### Task 2: Ranking por uso en el servidor

**Files:**
- Create: `APP/NEXT_APP/src/lib/tool-ranking.server.ts`

**Interfaces:**
- Consumes: `elegirDestacadas`, `UMBRAL_SESIONES` (Task 1).
- Produces: `export async function getDestacadas(publicas: string[]): Promise<Destacadas>`.

- [ ] **Step 1: Implement** with `import "server-only"`. `prisma.$queryRaw` (plantilla etiquetada) que devuelve `slug` y `sesiones = count(DISTINCT u.ip)` de `"ToolUsage" u JOIN "Tool" t ON t.id = u."toolId"`, con `u."createdAt" > now() - interval '30 days'`, `u."userAgent" !~* '(headless|playwright|bot|crawler|spider)'`, `GROUP BY t.slug HAVING count(DISTINCT u.ip) >= ${UMBRAL_SESIONES} ORDER BY sesiones DESC LIMIT 6`. Convertir `bigint` a `number`. Caché en memoria de 10 minutos (mismo patrón que `public-tools.server.ts`); si la consulta falla, `elegirDestacadas([], publicas)` sin guardar en caché.
- [ ] **Step 2: Verify types** — `node_modules/.bin/tsc --noEmit -p .` Expected: sin errores. (La prueba de comportamiento sin base va en Task 3.)

### Task 3: Página /herramientas sin esfera, con destacadas

**Files:**
- Modify: `APP/NEXT_APP/src/app/herramientas/page.tsx`
- Modify: `APP/NEXT_APP/src/components/tools/IndiceHerramientas.tsx`
- Modify: `APP/NEXT_APP/src/app/herramientas/catalogo.css`
- Test: `APP/NEXT_APP/tests/e2e/herramientas-catalogo.spec.ts` (reemplaza el primer test), `APP/NEXT_APP/tests/e2e/tools-return-visits.spec.ts:77-82`

**Interfaces:**
- Consumes: `getDestacadas` (Task 2), `esNueva` (Task 1).
- Produces: `IndiceHerramientas({ tools, destacadas }: { tools: PublicToolCatalogEntry[]; destacadas: Destacadas })`.

Estructura: `page.tsx` deja de renderizar `<Herramientas pagina />`. En su lugar una `<section className="ht-cab ancho" data-al-cargar="" data-forma="marco">` con `<h1>Herramientas<i>.</i></h1>` y una línea: «{N} utilidades gratis que funcionan en el navegador, sin registro.» (verificar «en el navegador» contra quitar-fondo y dns; si alguna usa servidor, decir solo «gratis, sin registro»). Luego el índice, en este orden: buscador + favoritas → recientes → destacadas (`<section aria-labelledby>` con `<h2>` «Las más usadas» si `porUso`, si no «Destacadas»; 6 tarjetas `.ht-destacada` con ícono, nombre y la descripción) → familias → estado → lista. Las destacadas se ocultan mientras `filtrando`. Filas y tarjetas muestran «Nueva» (`.ht-nueva`, minúsculas, sin mayúsculas forzadas) cuando `esNueva`. Tarjetas: 3 columnas, 2 a ≤ 760 px.

- [ ] **Step 1: Write the failing tests**

```ts
test("el catálogo: cabecera sobria, destacadas y las 29 por familia, sin esfera", async ({ page }) => {
  await page.goto("/herramientas");
  await expect(page.locator("h1")).toHaveText("Herramientas.");
  await expect(page.locator("#he-esfera, .he-nodo")).toHaveCount(0);
  const dest = page.getByRole("region", { name: /^(Destacadas|Las más usadas)$/ });
  await expect(dest.locator(".ht-destacada")).toHaveCount(6);
  await expect(page.locator(".ht-grupo")).toHaveCount(6);
  await expect(page.locator(".ht-fila")).toHaveCount(29);
  await expect(page.locator("canvas#materia")).toHaveAttribute("data-forma-activa", "marco");
});
test("sin datos de uso: el rótulo es «Destacadas» y va el orden de respaldo", async ({ page }) => {
  await page.goto("/herramientas");
  const dest = page.getByRole("region", { name: "Destacadas" });
  await expect(dest.locator(".ht-destacada a")).toHaveText([/QR/, /Fondo/i, /Compres/i, /Contraseñas/i, /JSON/, /IVA/]);
});
test("al buscar o filtrar, las destacadas se ocultan", async ({ page }) => {
  await page.goto("/herramientas");
  await page.getByRole("searchbox", { name: "Buscar herramientas" }).fill("json");
  await expect(page.locator(".ht-destacada")).toHaveCount(0);
  await page.getByRole("searchbox", { name: "Buscar herramientas" }).fill("");
  await page.getByRole("button", { name: /^Redes/ }).click();
  await expect(page.locator(".ht-destacada")).toHaveCount(0);
});
test("a 390 px las destacadas van de a dos y nada desborda", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/herramientas");
  const cajas = await page.locator(".ht-destacada").evaluateAll((es) => es.map((e) => Math.round(e.getBoundingClientRect().top)));
  expect(new Set(cajas).size).toBe(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
```
En `tools-return-visits.spec.ts`, el test de la línea 77 conserva «sin “Todas, por nombre”» y la región «Todas las herramientas», y cambia la expectativa del enlace «Ver las N ↓» por `toHaveCount(0)`. Las pruebas de la portada (`viva-portada`, `viva-herramientas`) no cambian.

- [ ] **Step 2: Run and see them fail** — contra el servidor local de la compilación actual (`~/Documentos/Paginas/portafolio-vm/prod-local.sh probar tests/e2e/herramientas-catalogo.spec.ts`). Expected: FAIL (hay esfera, no hay `.ht-destacada`).
- [ ] **Step 3: Implement** page, index and CSS as described (CSS en `catalogo.css`, tokens del tema, sin colores fijos oscuros).
- [ ] **Step 4: Compile and run** — `next build` en jaula, `prod-local.sh arriba`, `probar tests/e2e/herramientas-catalogo.spec.ts tests/e2e/tools-return-visits.spec.ts tests/e2e/viva-herramientas.spec.ts tests/e2e/seo-headings.spec.ts`. Expected: todo pasa (el servidor local no tiene base: valida el respaldo).

### Task 4: «También te puede servir» en cada herramienta

**Files:**
- Modify: `APP/NEXT_APP/src/components/tools/CarcasaHerramientas.tsx` (después de `#tools-content`, solo si `actual`)
- Modify: `APP/NEXT_APP/src/app/herramientas/tools.css`
- Test: `APP/NEXT_APP/tests/e2e/herramientas-catalogo.spec.ts`

**Interfaces:**
- Consumes: `relacionadasDe(slug, publicas)` (Task 1); `tools` que ya recibe la carcasa (solo públicas y activas).

- [ ] **Step 1: Write the failing test**

```ts
test("cada herramienta sugiere 3 relacionadas por flujo de trabajo", async ({ page }) => {
  await page.goto("/herramientas/quitar-fondo");
  const nav = page.getByRole("navigation", { name: "También te puede servir" });
  await expect(nav.getByRole("link")).toHaveCount(3);
  await expect(nav.getByRole("link").nth(0)).toHaveAttribute("href", "/herramientas/recortar-imagen");
  await expect(nav.getByRole("link").nth(1)).toHaveAttribute("href", "/herramientas/comprimir-imagen");
  await expect(nav.getByRole("link").nth(2)).toHaveAttribute("href", "/herramientas/marca-agua");
});
```
- [ ] **Step 2: Run and see it fail** (servidor local, compilación de Task 3). Expected: FAIL (no existe la navegación).
- [ ] **Step 3: Implement** `<nav aria-labelledby="hc-rel-t">` con `<h2 id="hc-rel-t">También te puede servir</h2>` y 3 enlaces (ícono de `ICONOS`, nombre, descripción), al final de la herramienta, antes del pie; filas como las del índice, sin tarjetas con borde lateral.
- [ ] **Step 4: Compile and run** the catalog spec plus `tools-accessibility-ar.spec.ts`. Expected: pass.

### Task 5: Descripciones en lenguaje llano

**Files:**
- Modify: `APP/NEXT_APP/src/lib/tool-registry.ts` (las 29 `description`)
- Create: `APP/NEXT_APP/prisma/migrations/20261121120000_descripciones_herramientas/migration.sql` (`UPDATE "Tool" SET description = … WHERE slug = …` × 29; la base manda sobre el registro)
- Test: `APP/NEXT_APP/tests/e2e/catalogo-datos.spec.ts`

Regla de redacción: qué hace + con qué entradas/salidas concretas, verificado leyendo la página de cada herramienta; máximo 110 caracteres; sin adjetivos de venta. QR: decir qué tipos de contenido acepta y en qué formatos descarga, nada más.

- [ ] **Step 1: Write the failing test**

```ts
const VETADAS = ["intuitiv", "control total", "perfecto para", "ideal para", "optimizado", "privacidad total", "sin marcas de agua", "descarga gratuita"];
test("las descripciones dicen qué hace cada herramienta, sin relleno", () => {
  for (const t of DEFAULT_TOOL_REGISTRY) {
    for (const v of VETADAS) expect(t.description.toLowerCase(), `${t.slug}: «${v}»`).not.toContain(v);
    expect(t.description.length, t.slug).toBeLessThanOrEqual(110);
  }
});
test("la migración trae una descripción para cada herramienta, igual a la del registro", () => {
  const sql = readFileSync("prisma/migrations/20261121120000_descripciones_herramientas/migration.sql", "utf8");
  for (const t of DEFAULT_TOOL_REGISTRY) expect(sql, t.slug).toContain(`WHERE slug = '${t.slug}'`);
});
```
- [ ] **Step 2: Run and see it fail.** Expected: FAIL (QR contiene «sin marcas de agua»; la migración no existe).
- [ ] **Step 3: Implement** the 29 texts and the migration (comillas simples escapadas).
- [ ] **Step 4: Run and see it pass.** Expected: pass.

### Task 6: Despliegue y verificación

- [ ] **Step 1:** `next build` en jaula; servidor local; correr `catalogo-datos`, `herramientas-catalogo`, `tools-return-visits`, `viva-herramientas`, `viva-portada`, `seo-headings`, `seo-schema`, `tools-accessibility-ar`. Expected: pasan (salvo `/api/health` local, ambiental).
- [ ] **Step 2:** Capturas a 1440 y 390 de /herramientas y /herramientas/quitar-fondo; revisarlas antes de seguir (sin aspecto de kit, sin desbordes).
- [ ] **Step 3:** `construir-imagen.sh` y `desplegar.sh` (aplica la migración con respaldo). Expected: 7/7 en la VM.
- [ ] **Step 4:** Contra producción: las mismas pruebas con `PLAYWRIGHT_BASE_URL=https://nicoholas.dev`, y Lighthouse de /herramientas (`lh/prod.sh`; el script se perdió con el reinicio: rehacerlo en `~/Documentos/Paginas/portafolio-vm/` si hace falta). Expected: puntaje ≥ 97 y LCP ≤ 2,3 s (valores del 20-11).
