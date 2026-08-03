# SEO Fase 1 — Fundamentos de Indexación — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que las 29 herramientas dejen de ser duplicados de la home y pasen a ser 29 páginas indexables con title, description, canonical y presencia en sitemap propios, más acceso explícito para crawlers de IA.

**Architecture:** Un registro central tipado (`src/lib/seo/tools-content.ts`) es la única fuente de verdad. De ahí se derivan metadata, canonical y sitemap. Cada herramienta recibe un `layout.tsx` nuevo que envuelve su `page.tsx` existente sin modificarlo — el `page.tsx` sigue siendo `"use client"` y sigue funcionando igual. Un script de auditoría ejecutable (`pnpm seo:audit`) es el gate mecánico de todas las reglas.

**Tech Stack:** Next.js 15 App Router, TypeScript, pnpm, Playwright (e2e), tsx (scripts Node).

**Spec:** `docs/superpowers/specs/2026-08-02-seo-aeo-geo-overhaul-design.md` (Fase 1, §4)

**Alcance:** Solo Fase 1. Las fases 2-6 del spec reciben su propio plan después de que esta quede verificada y commiteada.

## Global Constraints

- Directorio de trabajo: `APP/NEXT_APP`. Todas las rutas de este plan son relativas a él.
- Gestor de paquetes: **pnpm**. Nunca npm ni yarn.
- Idioma del contenido: **español**, variante neutra LATAM. `lang="es"`. Sin i18n, sin rutas `/en`.
- Dominio canónico: `https://nicoholas.dev` — sin barra final.
- `title`: entre **50 y 60 caracteres** inclusive. Fuera de rango = fallo de auditoría.
- `description`: entre **150 y 160 caracteres** inclusive, y **única** en todo el sitio.
- `primaryKeyword`: **única** por herramienta. Dos entradas no pueden declarar la misma.
- **Prohibido modificar** cualquier `src/app/herramientas/*/page.tsx`. Si una tarea parece requerirlo, está mal planteada — detente y reporta.
- Los 29 slugs conservan su nombre actual en esta fase. El renombrado es decisión abierta de Fase 4.
- Commits en la rama `seo/overhaul`.

---

### Task 1: Registro SEO central y auditor

**Files:**
- Create: `src/lib/seo/tools-content.ts`
- Create: `scripts/seo-audit.ts`
- Modify: `package.json` (agregar script `seo:audit`)

**Interfaces:**
- Consumes: `DEFAULT_TOOL_REGISTRY` de `src/lib/tool-registry.ts` (solo como referencia de nombres al escribir el contenido; sin import en runtime).
- Produces:
  - `interface ToolSeoEntry` con campos `slug, title, description, h1, primaryKeyword, secondaryKeywords, related, lastModified`
  - `const TOOLS_SEO: Record<string, ToolSeoEntry>`
  - `const TOOL_SEO_SLUGS: string[]`
  - `function getToolSeo(slug: string): ToolSeoEntry` — lanza `Error` si el slug no existe
  - Comando `pnpm seo:audit` que sale con código 1 ante cualquier violación

**Mapa de keywords — asignación definitiva.** Cada herramienta tiene una primaria excluyente. Esto elimina la canibalización de raíz:

| slug | primaryKeyword |
|---|---|
| `qr` | generador de códigos qr |
| `claves` | generador de contraseñas seguras |
| `base64` | codificar y decodificar base64 |
| `json` | formatear json online |
| `jwt` | decodificar jwt online |
| `regex` | probar expresiones regulares online |
| `impuestos` | calculadora de iva |
| `subredes` | calculadora de subredes |
| `unidades` | conversor de unidades |
| `binario` | convertir texto a binario |
| `aleatorio` | ruleta para sorteos |
| `enlaces` | generar enlace de whatsapp |
| `dns` | verificar propagación dns |
| `nginx` | generador de configuración nginx |
| `favicon` | generador de favicon |
| `convertir-ico` | convertir png a ico |
| `convertir-imagen` | convertir imagen a webp |
| `comprimir-imagen` | comprimir imagen online |
| `redimensionar` | redimensionar imagen online |
| `recortar-imagen` | recortar imagen online |
| `quitar-fondo` | quitar fondo de imagen |
| `marca-agua` | poner marca de agua a imagen |
| `paleta-colores` | extraer paleta de colores de imagen |
| `metadatos` | ver metadatos exif de una foto |
| `ascii` | convertir imagen a ascii art |
| `banner-ascii` | generador de banner ascii para terminal |
| `esteganografia` | ocultar mensaje en emoji |
| `esteganografia-imagen` | ocultar mensaje en imagen |
| `reverse-shell` | generador de reverse shell |

- [ ] **Step 1: Escribir el auditor (el test que falla)**

Crear `scripts/seo-audit.ts`:

```ts
/**
 * Auditoría SEO mecánica. Falla el proceso si alguna regla se rompe.
 * Uso: pnpm seo:audit
 */
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { TOOLS_SEO, type ToolSeoEntry } from "../src/lib/seo/tools-content";

const TOOLS_DIR = join(process.cwd(), "src/app/herramientas");
const TITLE_MIN = 50;
const TITLE_MAX = 60;
const DESC_MIN = 150;
const DESC_MAX = 160;

const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);

function routeSlugs(): string[] {
    return readdirSync(TOOLS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .filter((d) => existsSync(join(TOOLS_DIR, d.name, "page.tsx")))
        .map((d) => d.name)
        .sort();
}

function checkCoverage(routes: string[]) {
    const registered = new Set(Object.keys(TOOLS_SEO));
    for (const slug of routes) {
        if (!registered.has(slug)) fail(`Ruta sin entrada en TOOLS_SEO: ${slug}`);
    }
    for (const slug of registered) {
        if (!routes.includes(slug)) fail(`Entrada en TOOLS_SEO sin ruta real: ${slug}`);
    }
}

function checkEntry(key: string, entry: ToolSeoEntry) {
    const { slug, title, description, h1, primaryKeyword, related } = entry;

    if (key !== slug) fail(`clave del registro "${key}" no coincide con entry.slug "${slug}"`);
    if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
        fail(`${slug}: title mide ${title.length}, debe estar entre ${TITLE_MIN} y ${TITLE_MAX}`);
    }
    if (description.length < DESC_MIN || description.length > DESC_MAX) {
        fail(`${slug}: description mide ${description.length}, debe estar entre ${DESC_MIN} y ${DESC_MAX}`);
    }
    if (h1.trim().length === 0) fail(`${slug}: h1 vacío`);
    if (primaryKeyword.trim().length === 0) fail(`${slug}: primaryKeyword vacío`);
    if (related.length < 2) fail(`${slug}: related necesita al menos 2 slugs para enlazado interno`);
    if (related.includes(slug)) fail(`${slug}: related se apunta a sí mismo`);
    for (const r of related) {
        if (!TOOLS_SEO[r]) fail(`${slug}: related apunta a slug inexistente "${r}"`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.lastModified)) {
        fail(`${slug}: lastModified debe ser YYYY-MM-DD, es "${entry.lastModified}"`);
    }
}

function checkUniqueness(field: "title" | "description" | "primaryKeyword") {
    const seen = new Map<string, string>();
    for (const entry of Object.values(TOOLS_SEO)) {
        const value = entry[field].trim().toLowerCase();
        const previous = seen.get(value);
        if (previous) fail(`${field} duplicado entre "${previous}" y "${entry.slug}": ${value}`);
        else seen.set(value, entry.slug);
    }
}

const routes = routeSlugs();
checkCoverage(routes);
Object.entries(TOOLS_SEO).forEach(([key, entry]) => checkEntry(key, entry));
(["title", "description", "primaryKeyword"] as const).forEach(checkUniqueness);

if (errors.length > 0) {
    console.error(`\n✗ Auditoría SEO: ${errors.length} problema(s)\n`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
}

console.log(`✓ Auditoría SEO OK — ${routes.length} herramientas, 0 problemas`);
```

Agregar a `package.json` en `scripts`:

```json
"seo:audit": "tsx scripts/seo-audit.ts"
```

- [ ] **Step 2: Ejecutar el auditor para verificar que falla**

```bash
cd APP/NEXT_APP && pnpm seo:audit
```

Esperado: FALLA. TypeScript no resuelve `../src/lib/seo/tools-content` porque el archivo aún no existe.

- [ ] **Step 3: Crear el registro con las 29 entradas**

Crear `src/lib/seo/tools-content.ts`. Estructura y tres entradas completas como patrón — las 26 restantes siguen exactamente la misma forma, usando la columna `primaryKeyword` de la tabla de arriba y los nombres de `DEFAULT_TOOL_REGISTRY` como base:

```ts
/**
 * Registro SEO de herramientas. Fuente única de verdad para metadata,
 * canonical, sitemap, JSON-LD y enlazado interno.
 *
 * Reglas (validadas por `pnpm seo:audit`):
 *  - title: 50-60 caracteres, único
 *  - description: 150-160 caracteres, única
 *  - primaryKeyword: única, sin solapamiento entre herramientas
 *  - related: mínimo 2 slugs válidos, nunca el propio
 */

export interface ToolSeoEntry {
    /** Debe coincidir con el nombre del directorio en src/app/herramientas/ */
    slug: string;
    /** 50-60 caracteres. Se renderiza tal cual, sin plantilla del root layout. */
    title: string;
    /** 150-160 caracteres, única en todo el sitio. */
    description: string;
    /** Único H1 de la página. */
    h1: string;
    /** Keyword primaria excluyente. */
    primaryKeyword: string;
    /** Variantes y long-tail de apoyo. */
    secondaryKeywords: string[];
    /** Slugs de herramientas relacionadas, para enlazado interno. */
    related: string[];
    /** ISO YYYY-MM-DD. Alimenta lastModified del sitemap. */
    lastModified: string;
}

export const TOOLS_SEO: Record<string, ToolSeoEntry> = {
    qr: {
        slug: "qr",
        title: "Generador de Códigos QR Gratis Online | Sin Registro",
        description:
            "Crea códigos QR personalizados para URL, texto, WiFi o contacto. Descarga en PNG o SVG en alta resolución, sin marcas de agua, sin registro y gratis.",
        h1: "Generador de Códigos QR",
        primaryKeyword: "generador de códigos qr",
        secondaryKeywords: [
            "crear código qr gratis",
            "generar qr personalizado",
            "código qr para wifi",
            "descargar qr en svg",
        ],
        related: ["enlaces", "base64", "favicon"],
        lastModified: "2026-08-02",
    },

    claves: {
        slug: "claves",
        title: "Generador de Contraseñas Seguras Online y Gratis",
        description:
            "Genera contraseñas seguras y aleatorias con la longitud y los caracteres que elijas. Todo ocurre en tu navegador: ninguna clave se envía ni se almacena.",
        h1: "Generador de Contraseñas Seguras",
        primaryKeyword: "generador de contraseñas seguras",
        secondaryKeywords: [
            "crear contraseña aleatoria",
            "contraseña segura online",
            "generador de claves fuertes",
        ],
        related: ["aleatorio", "jwt", "esteganografia"],
        lastModified: "2026-08-02",
    },

    base64: {
        slug: "base64",
        title: "Codificar y Decodificar Base64 Online — Texto e Imagen",
        description:
            "Convierte texto e imágenes a Base64 y viceversa directamente en tu navegador. Ideal para incrustar recursos en CSS, HTML o payloads de API sin subir archivos.",
        h1: "Conversor Base64",
        primaryKeyword: "codificar y decodificar base64",
        secondaryKeywords: [
            "convertir imagen a base64",
            "decodificar base64 online",
            "base64 a texto",
            "data uri generator",
        ],
        related: ["binario", "json", "jwt"],
        lastModified: "2026-08-02",
    },

    // ... 26 entradas restantes con la misma forma.
    // Una por cada fila de la tabla de keywords de la Task 1.
};

export const TOOL_SEO_SLUGS: string[] = Object.keys(TOOLS_SEO);

export function getToolSeo(slug: string): ToolSeoEntry {
    const entry = TOOLS_SEO[slug];
    if (!entry) {
        throw new Error(
            `[seo] No hay entrada en TOOLS_SEO para el slug "${slug}". ` +
                `Agrégala en src/lib/seo/tools-content.ts.`
        );
    }
    return entry;
}
```

Guía para redactar las 26 restantes:
- **Title**: `<Qué hace> <modificador> | <diferenciador>`. Modificadores que caben en 50-60 y suman CTR: "Online", "Gratis", "Sin Registro", "en el Navegador". Contar caracteres — el auditor los rechaza fuera de rango.
- **Description**: qué hace, para quién, y el diferenciador real (procesamiento local, sin subida de archivos, sin marca de agua, sin registro). Nunca repetir la de otra herramienta.
- **related**: 3 slugs de la misma categoría o de flujo contiguo. Ejemplo: `comprimir-imagen` → `["convertir-imagen", "redimensionar", "recortar-imagen"]`.

- [ ] **Step 4: Ejecutar el auditor hasta que pase**

```bash
cd APP/NEXT_APP && pnpm seo:audit
```

Esperado: `✓ Auditoría SEO OK — 29 herramientas, 0 problemas`

Si reporta largos fuera de rango, ajustar el texto — no ajustar los umbrales.

- [ ] **Step 5: Verificar tipos**

```bash
cd APP/NEXT_APP && pnpm typecheck
```

Esperado: sin errores.

- [ ] **Step 6: Commit**

```bash
git add APP/NEXT_APP/src/lib/seo/tools-content.ts APP/NEXT_APP/scripts/seo-audit.ts APP/NEXT_APP/package.json
git commit -m "feat(seo): add central tool SEO registry with mechanical audit"
```

---

### Task 2: Metadata por herramienta y corrección del canonical global

**Files:**
- Create: `src/lib/seo/metadata.ts`
- Create: `src/app/herramientas/<slug>/layout.tsx` × 29
- Modify: `src/app/layout.tsx` (quitar canonical global y referencias a `/og-image.png`)
- Modify: `src/app/page.tsx` (agregar metadata propia)
- Modify: `src/app/herramientas/page.tsx` (agregar metadata propia)
- Test: `tests/e2e/seo-metadata.spec.ts`

**Interfaces:**
- Consumes: `getToolSeo`, `TOOL_SEO_SLUGS` de `src/lib/seo/tools-content.ts` (Task 1)
- Produces:
  - `const SITE_URL = "https://nicoholas.dev"` exportado desde `src/lib/seo/metadata.ts`
  - `function buildToolMetadata(slug: string): Metadata`

- [ ] **Step 1: Escribir el test e2e que falla**

Crear `tests/e2e/seo-metadata.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const SITE_URL = "https://nicoholas.dev";

const SAMPLE_TOOLS = ["qr", "claves", "base64", "json", "subredes"];

test.describe("Metadata por página", () => {
    test("la home canoniza a sí misma", async ({ page }) => {
        await page.goto("/");
        const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
        expect(canonical).toBe(`${SITE_URL}/`);
    });

    for (const slug of SAMPLE_TOOLS) {
        test(`/herramientas/${slug} tiene canonical propio`, async ({ page }) => {
            await page.goto(`/herramientas/${slug}`);
            const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
            expect(canonical).toBe(`${SITE_URL}/herramientas/${slug}`);
        });
    }

    test("los títulos de las herramientas son únicos y miden 50-60 caracteres", async ({ page }) => {
        const titles = new Set<string>();
        for (const slug of SAMPLE_TOOLS) {
            await page.goto(`/herramientas/${slug}`);
            const title = await page.title();
            expect(title.length).toBeGreaterThanOrEqual(50);
            expect(title.length).toBeLessThanOrEqual(60);
            expect(titles.has(title)).toBe(false);
            titles.add(title);
        }
    });

    test("las descripciones de las herramientas son únicas", async ({ page }) => {
        const descriptions = new Set<string>();
        for (const slug of SAMPLE_TOOLS) {
            await page.goto(`/herramientas/${slug}`);
            const desc = await page
                .locator('meta[name="description"]')
                .getAttribute("content");
            expect(desc).toBeTruthy();
            expect(descriptions.has(desc!)).toBe(false);
            descriptions.add(desc!);
        }
    });

    test("la imagen Open Graph resuelve", async ({ page, request }) => {
        await page.goto("/");
        const ogImage = await page
            .locator('meta[property="og:image"]')
            .getAttribute("content");
        expect(ogImage).toBeTruthy();
        const response = await request.get(ogImage!);
        expect(response.status()).toBe(200);
    });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

```bash
cd APP/NEXT_APP && pnpm test:e2e tests/e2e/seo-metadata.spec.ts
```

Esperado: FALLA. Los canonicals de las herramientas devuelven `https://nicoholas.dev` (la home) en vez de su propia URL, los títulos están duplicados, y `og:image` apunta a `/og-image.png` que da 404.

- [ ] **Step 3: Crear el helper de metadata**

Crear `src/lib/seo/metadata.ts`:

```ts
import type { Metadata } from "next";
import { getToolSeo } from "./tools-content";

export const SITE_URL = "https://nicoholas.dev";
export const SITE_NAME = "Nicoholas Lopetegui";

export function buildToolMetadata(slug: string): Metadata {
    const entry = getToolSeo(slug);
    const path = `/herramientas/${entry.slug}`;

    return {
        // absolute evita que el template "%s | Nicoholas Lopetegui" del root
        // empuje el title fuera del rango de 50-60 caracteres.
        title: { absolute: entry.title },
        description: entry.description,
        keywords: [entry.primaryKeyword, ...entry.secondaryKeywords],
        alternates: { canonical: path },
        openGraph: {
            type: "website",
            locale: "es_CL",
            url: `${SITE_URL}${path}`,
            siteName: SITE_NAME,
            title: entry.title,
            description: entry.description,
        },
        twitter: {
            card: "summary_large_image",
            title: entry.title,
            description: entry.description,
        },
        robots: { index: true, follow: true },
    };
}
```

- [ ] **Step 4: Corregir el root layout**

En `src/app/layout.tsx`, eliminar el bloque `alternates` completo:

```ts
  alternates: {
    canonical: BASE_URL,
  },
```

Este bloque hacía que las 89 páginas del sitio declararan la home como su URL canónica.

En el mismo archivo, eliminar la clave `images` de `openGraph` y de `twitter` — ambas apuntan a `/og-image.png`, que no existe. Al quitarlas, la convención de archivo `src/app/opengraph-image.tsx` vuelve a aplicarse y genera la imagen dinámicamente.

`openGraph` queda sin la propiedad `images`:

```ts
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: BASE_URL,
    siteName: "Nicoholas Lopetegui",
    title: "Nicoholas Lopetegui | Desarrollador Full Stack",
    description:
      "Transformo problemas complejos en productos funcionales. Plataformas, automatizaciones y datos con impacto real.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nicoholas Lopetegui | Desarrollador Full Stack",
    description:
      "Transformo problemas complejos en productos funcionales. Sin rodeos. Sin demoras.",
  },
```

- [ ] **Step 5: Dar canonical propio a home y al hub de herramientas**

En `src/app/page.tsx`, agregar antes del componente `Home`:

```ts
import type { Metadata } from "next";

export const metadata: Metadata = {
    alternates: { canonical: "/" },
};
```

En `src/app/herramientas/page.tsx`, agregar antes del componente `ToolsPage`:

```ts
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: { absolute: "29 Herramientas Online Gratis para Desarrolladores" },
    description:
        "Colección de 29 herramientas gratuitas para desarrollo y diseño: QR, contraseñas, Base64, JSON, JWT, subredes, imágenes y más. Sin registro ni marcas de agua.",
    alternates: { canonical: "/herramientas" },
};
```

- [ ] **Step 6: Generar los 29 layout.tsx**

Desde `APP/NEXT_APP`, ejecutar:

```bash
for dir in src/app/herramientas/*/; do
  slug=$(basename "$dir")
  cat > "$dir/layout.tsx" <<EOF
import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildToolMetadata("$slug");

export default function ToolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
EOF
done
ls src/app/herramientas/*/layout.tsx | wc -l
```

Esperado: `29`.

Este layout es deliberadamente mínimo. La Fase 2 le agrega breadcrumbs, contenido SSR y JSON-LD; el punto de extensión ya queda listo.

- [ ] **Step 7: Verificar tipos y build**

```bash
cd APP/NEXT_APP && pnpm typecheck && pnpm lint
```

Esperado: sin errores ni warnings.

- [ ] **Step 8: Ejecutar el test e2e hasta que pase**

```bash
cd APP/NEXT_APP && pnpm test:e2e tests/e2e/seo-metadata.spec.ts
```

Esperado: PASA. Todos los canonicals apuntan a su propia ruta, títulos y descripciones únicos, `og:image` responde 200.

- [ ] **Step 9: Confirmar en HTML crudo, sin JavaScript**

```bash
cd APP/NEXT_APP && pnpm dev &
sleep 15
curl -s http://localhost:3000/herramientas/qr | grep -o '<link rel="canonical"[^>]*>'
curl -s http://localhost:3000/herramientas/claves | grep -o '<title>[^<]*</title>'
```

Esperado: canonical `https://nicoholas.dev/herramientas/qr`, y el title del generador de contraseñas — no el de la home.

- [ ] **Step 10: Commit**

```bash
git add APP/NEXT_APP/src/lib/seo/metadata.ts \
        APP/NEXT_APP/src/app/layout.tsx \
        APP/NEXT_APP/src/app/page.tsx \
        APP/NEXT_APP/src/app/herramientas/page.tsx \
        APP/NEXT_APP/src/app/herramientas/*/layout.tsx \
        APP/NEXT_APP/tests/e2e/seo-metadata.spec.ts
git commit -m "fix(seo): give every tool page its own canonical, title and description"
```

---

### Task 3: Sitemap derivado del registro y acceso para crawlers de IA

**Files:**
- Modify: `src/app/sitemap.ts`
- Modify: `src/app/robots.ts`
- Delete: `src/app/sitemap_index.xml/route.ts`
- Test: `tests/e2e/seo-crawl.spec.ts`

**Interfaces:**
- Consumes: `TOOLS_SEO`, `TOOL_SEO_SLUGS` de `src/lib/seo/tools-content.ts`; `SITE_URL` de `src/lib/seo/metadata.ts`
- Produces: `/sitemap.xml` con ~35 URLs; `/robots.txt` con reglas por user-agent

- [ ] **Step 1: Escribir el test e2e que falla**

Crear `tests/e2e/seo-crawl.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { TOOL_SEO_SLUGS } from "../../src/lib/seo/tools-content";

const SITE_URL = "https://nicoholas.dev";

test.describe("Sitemap y robots", () => {
    test("el sitemap incluye las 29 herramientas", async ({ request }) => {
        const response = await request.get("/sitemap.xml");
        expect(response.status()).toBe(200);
        const xml = await response.text();

        for (const slug of TOOL_SEO_SLUGS) {
            expect(xml, `falta ${slug} en el sitemap`).toContain(
                `${SITE_URL}/herramientas/${slug}`
            );
        }
    });

    test("el sitemap incluye home, hub y legales", async ({ request }) => {
        const xml = await (await request.get("/sitemap.xml")).text();
        for (const path of ["", "/herramientas", "/blog", "/privacidad", "/terminos"]) {
            expect(xml).toContain(`<loc>${SITE_URL}${path}</loc>`);
        }
    });

    test("el sitemap no contiene rutas privadas", async ({ request }) => {
        const xml = await (await request.get("/sitemap.xml")).text();
        expect(xml).not.toContain("/admin");
        expect(xml).not.toContain("/api/");
        expect(xml).not.toContain("/acceso");
    });

    test("robots.txt permite crawlers de IA y bloquea admin", async ({ request }) => {
        const response = await request.get("/robots.txt");
        expect(response.status()).toBe(200);
        const txt = await response.text();

        for (const bot of [
            "GPTBot",
            "ClaudeBot",
            "PerplexityBot",
            "Google-Extended",
            "CCBot",
            "Applebot-Extended",
        ]) {
            expect(txt, `falta regla para ${bot}`).toContain(bot);
        }

        expect(txt).toContain("Disallow: /admin/");
        expect(txt).toContain(`${SITE_URL}/sitemap.xml`);
        expect(txt).not.toContain("sitemap_index");
    });

    test("todas las URLs del sitemap responden 200", async ({ request }) => {
        const xml = await (await request.get("/sitemap.xml")).text();
        const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
        expect(locs.length).toBeGreaterThanOrEqual(34);

        for (const loc of locs) {
            const path = loc.replace(SITE_URL, "") || "/";
            const res = await request.get(path);
            expect(res.status(), `${path} devolvió ${res.status()}`).toBe(200);
        }
    });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

```bash
cd APP/NEXT_APP && pnpm test:e2e tests/e2e/seo-crawl.spec.ts
```

Esperado: FALLA. El sitemap actual solo trae 11 de las 29 herramientas y `robots.txt` no menciona ningún crawler de IA.

- [ ] **Step 3: Reescribir el sitemap**

Reemplazar el contenido completo de `src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from "next";
import { TOOLS_SEO } from "@/lib/seo/tools-content";
import { SITE_URL } from "@/lib/seo/metadata";

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();

    const core: MetadataRoute.Sitemap = [
        { url: SITE_URL, lastModified: now, changeFrequency: "monthly", priority: 1.0 },
        {
            url: `${SITE_URL}/herramientas`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.9,
        },
        { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    ];

    const tools: MetadataRoute.Sitemap = Object.values(TOOLS_SEO).map((entry) => ({
        url: `${SITE_URL}/herramientas/${entry.slug}`,
        lastModified: new Date(entry.lastModified),
        changeFrequency: "monthly" as const,
        priority: 0.8,
    }));

    const legal: MetadataRoute.Sitemap = [
        { url: `${SITE_URL}/privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
        { url: `${SITE_URL}/terminos`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    ];

    return [...core, ...tools, ...legal];
}
```

Nota: el sitemap ahora se deriva del registro. Agregar una herramienta al registro la agrega al sitemap automáticamente — se acabó la deriva manual que dejó 18 páginas huérfanas.

- [ ] **Step 4: Reescribir robots.ts**

Reemplazar el contenido completo de `src/app/robots.ts`:

```ts
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/metadata";

const PRIVATE_PATHS = ["/admin/", "/api/", "/acceso", "/portal/", "/aprobar", "/cotizacion/"];

/**
 * Crawlers de modelos de lenguaje y motores de respuesta.
 * Se permiten de forma explícita: es la vía por la que el sitio aparece
 * citado en ChatGPT, Claude, Perplexity y AI Overviews de Google.
 */
const AI_CRAWLERS = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-User",
    "anthropic-ai",
    "PerplexityBot",
    "Perplexity-User",
    "Google-Extended",
    "CCBot",
    "Applebot-Extended",
    "Amazonbot",
    "meta-externalagent",
    "Bytespider",
    "DuckAssistBot",
    "cohere-ai",
];

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: PRIVATE_PATHS,
            },
            ...AI_CRAWLERS.map((userAgent) => ({
                userAgent,
                allow: "/",
                disallow: PRIVATE_PATHS,
            })),
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
```

- [ ] **Step 5: Eliminar el sitemap index redundante**

```bash
cd APP/NEXT_APP && rm -rf src/app/sitemap_index.xml
```

Solo apuntaba a `/sitemap.xml`. Dos sitemaps declarados para un mismo conjunto de URLs confunde el reporte de cobertura en Search Console sin aportar nada.

- [ ] **Step 6: Ejecutar el test e2e hasta que pase**

```bash
cd APP/NEXT_APP && pnpm test:e2e tests/e2e/seo-crawl.spec.ts
```

Esperado: PASA. 34+ URLs en el sitemap, todas responden 200, robots declara los 16 crawlers de IA.

- [ ] **Step 7: Commit**

```bash
git add APP/NEXT_APP/src/app/sitemap.ts \
        APP/NEXT_APP/src/app/robots.ts \
        APP/NEXT_APP/tests/e2e/seo-crawl.spec.ts
git rm -r --cached APP/NEXT_APP/src/app/sitemap_index.xml 2>/dev/null || true
git add -A APP/NEXT_APP/src/app
git commit -m "feat(seo): derive sitemap from registry and grant AI crawlers access"
```

---

### Task 4: Página 404 con salidas y barrido de enlaces rotos

**Files:**
- Modify: `src/app/not-found.tsx`
- Test: `tests/e2e/seo-links.spec.ts`

**Interfaces:**
- Consumes: `TOOLS_SEO` de `src/lib/seo/tools-content.ts`
- Produces: ninguna interfaz nueva de código

- [ ] **Step 1: Escribir el test e2e que falla**

Crear `tests/e2e/seo-links.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.describe("Enlaces y 404", () => {
    test("una URL inexistente devuelve 404 con enlaces de salida", async ({ page }) => {
        const response = await page.goto("/esta-ruta-no-existe-jamas");
        expect(response?.status()).toBe(404);

        // Debe ofrecer rutas de recuperación, no ser un callejón sin salida.
        const links = page.locator("main a, body a");
        expect(await links.count()).toBeGreaterThanOrEqual(4);
        await expect(page.locator('a[href="/herramientas"]')).toBeVisible();
    });

    test("una herramienta inexistente devuelve 404", async ({ page }) => {
        const response = await page.goto("/herramientas/no-existe");
        expect(response?.status()).toBe(404);
    });

    test("los enlaces internos del hub de herramientas responden 200", async ({
        page,
        request,
    }) => {
        await page.goto("/herramientas");
        const hrefs = await page
            .locator('a[href^="/herramientas/"]')
            .evaluateAll((els) =>
                Array.from(new Set(els.map((el) => (el as HTMLAnchorElement).getAttribute("href")!)))
            );

        expect(hrefs.length).toBeGreaterThanOrEqual(20);
        for (const href of hrefs) {
            const res = await request.get(href);
            expect(res.status(), `${href} devolvió ${res.status()}`).toBe(200);
        }
    });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

```bash
cd APP/NEXT_APP && pnpm test:e2e tests/e2e/seo-links.spec.ts
```

Esperado: FALLA en la primera aserción — la página 404 actual no ofrece suficientes enlaces de salida.

- [ ] **Step 3: Agregar enlaces de recuperación al 404**

En `src/app/not-found.tsx`, dentro del `<div className="relative z-10 max-w-md">`, después del bloque de texto existente y antes del cierre del div, insertar:

```tsx
{/* Salidas — evita que el 404 sea un callejón sin salida y reparte
    autoridad hacia las herramientas más importantes. */}
<nav aria-label="Páginas sugeridas" className="mt-10">
    <p className="mb-4 text-sm text-neutral-400">
        Quizás buscabas alguna de estas:
    </p>
    <ul className="flex flex-wrap justify-center gap-2">
        {[
            { href: "/herramientas", label: "Todas las herramientas" },
            { href: "/herramientas/qr", label: "Generador de QR" },
            { href: "/herramientas/claves", label: "Contraseñas seguras" },
            { href: "/herramientas/json", label: "Formateador JSON" },
            { href: "/blog", label: "Blog" },
            { href: "/", label: "Inicio" },
        ].map((item) => (
            <li key={item.href}>
                <Link
                    href={item.href}
                    className="inline-block rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-neutral-300 transition hover:border-[#00B8A9]/40 hover:text-white"
                >
                    {item.label}
                </Link>
            </li>
        ))}
    </ul>
</nav>
```

`Link` ya está importado en el archivo.

- [ ] **Step 4: Ejecutar el test e2e hasta que pase**

```bash
cd APP/NEXT_APP && pnpm test:e2e tests/e2e/seo-links.spec.ts
```

Esperado: PASA.

- [ ] **Step 5: Commit**

```bash
git add APP/NEXT_APP/src/app/not-found.tsx APP/NEXT_APP/tests/e2e/seo-links.spec.ts
git commit -m "feat(seo): turn the 404 page into a recovery hub with internal links"
```

---

### Task 5: Verificación integral de la fase

**Files:**
- Modify: `package.json` (agregar script `seo:verify`)

**Interfaces:**
- Consumes: todo lo anterior
- Produces: comando `pnpm seo:verify`

- [ ] **Step 1: Agregar el comando agregado**

En `package.json`, dentro de `scripts`:

```json
"seo:verify": "pnpm run seo:audit && pnpm run typecheck && pnpm run lint && pnpm run build"
```

- [ ] **Step 2: Ejecutar la verificación completa**

```bash
cd APP/NEXT_APP && pnpm seo:verify
```

Esperado: auditoría OK, sin errores de tipos, sin warnings de lint, build exitoso.

- [ ] **Step 3: Ejecutar toda la suite e2e**

```bash
cd APP/NEXT_APP && pnpm test:e2e
```

Esperado: pasan los 3 archivos nuevos de SEO y **no se rompe** ninguno de los existentes (`auth.spec.ts`, `security-headers.spec.ts`, `autonomous-defense.spec.ts`).

Si `security-headers.spec.ts` falla, es señal de regresión — detenerse y reportar antes de continuar.

- [ ] **Step 4: Comprobar el HTML servido sin JavaScript**

```bash
cd APP/NEXT_APP && pnpm dev &
sleep 15
for slug in qr claves base64 json subredes; do
  echo "--- $slug ---"
  curl -s "http://localhost:3000/herramientas/$slug" \
    | grep -oE '<title>[^<]*</title>|<link rel="canonical"[^>]*>'
done
curl -s http://localhost:3000/robots.txt | head -30
curl -s http://localhost:3000/sitemap.xml | grep -c '<loc>'
```

Esperado: cada herramienta con su propio title y canonical; robots listando los crawlers de IA; el conteo de `<loc>` en 34.

- [ ] **Step 5: Verificar manualmente que las 29 herramientas siguen funcionando**

Abrir en el navegador y confirmar que el widget monta e interactúa. Prioridad a las de estado más pesado, que son las de mayor riesgo bajo el nuevo layout:

- `/herramientas/esteganografia-imagen`
- `/herramientas/quitar-fondo`
- `/herramientas/marca-agua`
- `/herramientas/ascii`
- `/herramientas/qr`

- [ ] **Step 6: Commit final de la fase**

```bash
git add APP/NEXT_APP/package.json
git commit -m "chore(seo): add aggregate seo:verify command"
```

---

## Definición de terminado — Fase 1

La fase está completa cuando **todas** estas condiciones se cumplen con evidencia ejecutada:

- [ ] `pnpm seo:verify` pasa
- [ ] `pnpm test:e2e` pasa completo, incluidos los tests preexistentes
- [ ] Las 29 herramientas tienen title único de 50-60 caracteres
- [ ] Las 29 herramientas tienen description única de 150-160 caracteres
- [ ] Ninguna página canoniza a la home salvo la home
- [ ] El sitemap tiene 34 URLs y todas responden 200
- [ ] `robots.txt` declara los 16 crawlers de IA y sigue bloqueando `/admin/` y `/api/`
- [ ] `og:image` responde 200
- [ ] Las 5 herramientas de estado pesado montan y funcionan
- [ ] Ningún `src/app/herramientas/*/page.tsx` fue modificado — verificar con
      `git diff --name-only main...HEAD | grep 'herramientas/.*/page.tsx'` sin resultados

## Fuera de alcance en esta fase

Estos puntos del spec llegan en fases posteriores y **no** deben implementarse acá:

- Breadcrumbs, JSON-LD, `/sobre-mi`, `AuthorBio` → Fase 2
- Arreglo del `<noscript>`, SSR del landing, `llms.txt`, `/blog/[slug]` → Fase 3
- Las ~500 palabras de contenido por herramienta, enlazado interno, renombrado de slugs → Fase 4
- `next/image`, alt text, Core Web Vitals, móvil → Fase 5
- Backlinks y Search Console → Fase 6
