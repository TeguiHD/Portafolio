# SEO Fase 2 — Datos Estructurados, Breadcrumbs y E-A-T — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el `BreadcrumbList` global inválido por datos estructurados reales y por página, dar a cada herramienta breadcrumbs visibles y schema `SoftwareApplication`, y crear la página de autor que ancla las señales E-A-T del sitio.

**Architecture:** Constructores de JSON-LD tipados en `src/lib/seo/schemas.ts`, emitidos por un componente `JsonLd` que respeta el nonce de CSP. Los 29 `layout.tsx` de herramientas —hoy pasa-manos vacíos— se convierten en el punto donde se inyectan breadcrumbs, schema y firma de autor, sin tocar ningún `page.tsx`. Todo se deriva del registro `TOOLS_SEO` que ya existe.

**Tech Stack:** Next.js 15 App Router, TypeScript, pnpm, Playwright (e2e), tsx (scripts Node).

**Spec:** `docs/superpowers/specs/2026-08-02-seo-aeo-geo-overhaul-design.md` (Fase 2, §4)

**Fase previa:** `docs/superpowers/plans/2026-08-02-seo-phase1-indexing-foundations.md`, completa y verificada.

**Alcance:** Solo Fase 2. Las fases 3-6 reciben su propio plan.

## Global Constraints

- Directorio de trabajo: `APP/NEXT_APP`. Todas las rutas de este plan son relativas a él.
- Gestor de paquetes: **pnpm**. Nunca npm ni yarn.
- Idioma del contenido: **español**, variante neutra LATAM. Sin i18n.
- Dominio canónico: `https://nicoholas.dev` — sin barra final, en ninguna parte.
- **Prohibido modificar** cualquier `src/app/herramientas/*/page.tsx`. El hub `src/app/herramientas/page.tsx` sí está en alcance.
- **Prohibido modificar** `src/lib/redis.ts` y `src/proxy.ts`.
- Todo `<script type="application/ld+json">` **debe** llevar el nonce de CSP vía `getNonce()`. Sin nonce, la CSP lo bloquea y el schema no existe para Google.
- **Exactamente un `<h1>` por página**, incluido el HTML crudo sin JavaScript.
- `pnpm seo:audit` debe seguir pasando. Las reglas de Fase 1 (title 50-60, description 150-160, unicidad, binding ruta↔layout) siguen vigentes.
- **Prohibido inventar credenciales, certificaciones, empleadores, premios o cifras** en la página de autor. Solo hechos que ya existan en el repositorio, citados en el plan. Cualquier hueco se marca como pendiente del usuario, nunca se rellena.
- Commits en la rama `seo/overhaul`.

---

### Task 1: Constructores de schema y emisor con nonce

**Files:**
- Create: `src/lib/seo/schemas.ts`
- Create: `src/components/seo/JsonLd.tsx`
- Modify: `src/components/StructuredData.tsx`
- Test: `tests/e2e/seo-schema.spec.ts`

**Interfaces:**
- Consumes: `getToolSeo`, `TOOLS_SEO` de `src/lib/seo/tools-content.ts`; `SITE_URL`, `SITE_NAME` de `src/lib/seo/metadata.ts`; `getNonce` de `src/lib/nonce.ts`
- Produces:
  - `type JsonLdObject = Record<string, unknown>`
  - `function personSchema(): JsonLdObject`
  - `function websiteSchema(): JsonLdObject`
  - `function professionalServiceSchema(): JsonLdObject`
  - `function breadcrumbSchema(trail: BreadcrumbTrail): JsonLdObject`
  - `function softwareApplicationSchema(slug: string): JsonLdObject`
  - `interface BreadcrumbCrumb { name: string; path: string }`
  - `type BreadcrumbTrail = BreadcrumbCrumb[]`
  - `async function JsonLd({ schema }: { schema: JsonLdObject | JsonLdObject[] }): Promise<JSX.Element>`

**Por qué el `BreadcrumbList` actual es inválido:** `src/components/StructuredData.tsx` emite `Inicio → Herramientas → Blog` idéntico en todas las páginas del sitio. Eso no es una jerarquía de navegación, es una lista de secciones, y declara una ruta de migas que no corresponde a ninguna página real. Se elimina; los breadcrumbs reales los emite cada página en la Task 2.

- [ ] **Step 1: Escribir el test e2e que falla**

Crear `tests/e2e/seo-schema.spec.ts`:

```ts
import { test, expect, type Page } from "@playwright/test";

const SITE_URL = "https://nicoholas.dev";

/** Lee todos los bloques JSON-LD de la página y los devuelve parseados. */
async function readJsonLd(page: Page): Promise<Record<string, unknown>[]> {
    const blocks = await page
        .locator('script[type="application/ld+json"]')
        .evaluateAll((nodes) => nodes.map((n) => n.textContent ?? ""));
    return blocks.map((raw) => JSON.parse(raw) as Record<string, unknown>);
}

function typesOf(schemas: Record<string, unknown>[]): string[] {
    return schemas.map((s) => String(s["@type"]));
}

test.describe("Datos estructurados", () => {
    test("la home emite Person, WebSite y ProfessionalService", async ({ page }) => {
        await page.goto("/");
        const types = typesOf(await readJsonLd(page));
        expect(types).toContain("Person");
        expect(types).toContain("WebSite");
        expect(types).toContain("ProfessionalService");
    });

    test("ninguna página emite el BreadcrumbList global falso", async ({ page }) => {
        // El schema viejo declaraba Inicio > Herramientas > Blog en todas las
        // páginas: no es una jerarquía, y aparecía incluso en la home.
        await page.goto("/");
        const schemas = await readJsonLd(page);
        const breadcrumbs = schemas.filter((s) => s["@type"] === "BreadcrumbList");
        expect(breadcrumbs).toHaveLength(0);
    });

    test("todo bloque JSON-LD lleva nonce de CSP", async ({ page }) => {
        await page.goto("/");
        const nonces = await page
            .locator('script[type="application/ld+json"]')
            .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("nonce")));
        expect(nonces.length).toBeGreaterThan(0);
        for (const nonce of nonces) {
            expect(nonce, "un bloque JSON-LD sin nonce lo bloquea la CSP").toBeTruthy();
        }
    });

    test("todo bloque JSON-LD es JSON válido con @context de schema.org", async ({ page }) => {
        await page.goto("/");
        const schemas = await readJsonLd(page); // JSON.parse lanza si es inválido
        expect(schemas.length).toBeGreaterThan(0);
        for (const schema of schemas) {
            expect(schema["@context"]).toBe("https://schema.org");
            expect(schema["@type"]).toBeTruthy();
        }
    });

    test("el Person schema apunta a la página de autor", async ({ page }) => {
        await page.goto("/");
        const person = (await readJsonLd(page)).find((s) => s["@type"] === "Person");
        expect(person).toBeTruthy();
        expect(person!.url).toBe(`${SITE_URL}/sobre-mi`);
        expect(Array.isArray(person!.sameAs)).toBe(true);
    });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

```bash
cd APP/NEXT_APP && pnpm test:e2e tests/e2e/seo-schema.spec.ts
```

Esperado: FALLA. El `BreadcrumbList` falso sigue presente en la home, y `Person.url` apunta a `https://nicoholas.dev`, no a `/sobre-mi`.

- [ ] **Step 3: Crear los constructores de schema**

Crear `src/lib/seo/schemas.ts`:

```ts
/**
 * Constructores de JSON-LD. Cada función devuelve un objeto schema.org
 * listo para serializar; el emisor (`@/components/seo/JsonLd`) se encarga
 * del nonce de CSP.
 *
 * Los datos salen del registro de herramientas y de las constantes del
 * sitio: no se declara aquí nada que no sea verificable en el repositorio.
 */
import { getToolSeo } from "./tools-content";
import { SITE_URL, SITE_NAME } from "./metadata";

export type JsonLdObject = Record<string, unknown>;

const CONTEXT = "https://schema.org";

/** Perfiles públicos verificables del autor. */
const SAME_AS = [
    "https://github.com/TeguiHD",
    "https://linkedin.com/in/nicoholas-lopetegui",
];

export function personSchema(): JsonLdObject {
    return {
        "@context": CONTEXT,
        "@type": "Person",
        "@id": `${SITE_URL}/#person`,
        name: SITE_NAME,
        // La página de autor es el ancla E-A-T: Person apunta ahí, no a la home.
        url: `${SITE_URL}/sobre-mi`,
        jobTitle: "Desarrollador Full Stack",
        description:
            "Desarrollador Full Stack que transforma problemas complejos en productos funcionales. Plataformas, automatizaciones y datos con impacto real.",
        sameAs: SAME_AS,
        knowsAbout: [
            "Next.js",
            "React",
            "TypeScript",
            "Node.js",
            "PostgreSQL",
            "Docker",
            "Desarrollo Web Full Stack",
            "Automatización",
            "Arquitectura de Software",
        ],
    };
}

export function websiteSchema(): JsonLdObject {
    return {
        "@context": CONTEXT,
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: `${SITE_NAME} | Desarrollador Full Stack`,
        url: SITE_URL,
        description:
            "Portafolio de Nicoholas Lopetegui — Desarrollador Full Stack. Plataformas, herramientas y automatizaciones.",
        author: { "@id": `${SITE_URL}/#person` },
        inLanguage: "es",
    };
}

export function professionalServiceSchema(): JsonLdObject {
    return {
        "@context": CONTEXT,
        "@type": "ProfessionalService",
        name: `${SITE_NAME} — Desarrollo Full Stack`,
        url: SITE_URL,
        description:
            "Servicios de desarrollo web Full Stack: plataformas, automatizaciones, APIs y arquitectura de software.",
        provider: { "@id": `${SITE_URL}/#person` },
        areaServed: { "@type": "Country", name: "Chile" },
        serviceType: [
            "Desarrollo Web",
            "Desarrollo Full Stack",
            "Automatización",
            "Consultoría en Arquitectura de Software",
        ],
    };
}

export interface BreadcrumbCrumb {
    /** Texto visible de la miga. */
    name: string;
    /** Ruta relativa, sin dominio y sin barra final. La raíz es "". */
    path: string;
}

export type BreadcrumbTrail = BreadcrumbCrumb[];

export function breadcrumbSchema(trail: BreadcrumbTrail): JsonLdObject {
    return {
        "@context": CONTEXT,
        "@type": "BreadcrumbList",
        itemListElement: trail.map((crumb, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: crumb.name,
            item: `${SITE_URL}${crumb.path}`,
        })),
    };
}

export function softwareApplicationSchema(slug: string): JsonLdObject {
    const entry = getToolSeo(slug);

    return {
        "@context": CONTEXT,
        "@type": "SoftwareApplication",
        name: entry.h1,
        url: `${SITE_URL}/herramientas/${entry.slug}`,
        description: entry.description,
        applicationCategory: "UtilitiesApplication",
        // Corre íntegramente en el navegador: sin instalación, sin backend.
        operatingSystem: "Any",
        browserRequirements: "Requiere JavaScript",
        inLanguage: "es",
        author: { "@id": `${SITE_URL}/#person` },
        // Gratis y sin registro: es el diferenciador real frente a la competencia.
        offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "CLP",
        },
    };
}
```

Nota sobre `offers`: `price: "0"` es una afirmación verificable — las herramientas son gratuitas y no piden registro. No se declara `aggregateRating` ni `reviewCount`: no existen reseñas reales, e inventarlas es exactamente el tipo de schema que Google penaliza.

- [ ] **Step 4: Crear el emisor con nonce**

Crear `src/components/seo/JsonLd.tsx`:

```tsx
/**
 * Emite uno o varios bloques JSON-LD con el nonce de CSP.
 *
 * Sin nonce la CSP bloquea el script y el schema no llega a Google, así que
 * el nonce no es opcional: es lo que hace que estos datos existan.
 */
import { getNonce } from "@/lib/nonce";
import type { JsonLdObject } from "@/lib/seo/schemas";

interface JsonLdProps {
    schema: JsonLdObject | JsonLdObject[];
}

export async function JsonLd({ schema }: JsonLdProps) {
    const nonce = await getNonce();
    const blocks = Array.isArray(schema) ? schema : [schema];

    return (
        <>
            {blocks.map((block, index) => (
                <script
                    key={index}
                    nonce={nonce}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
                />
            ))}
        </>
    );
}
```

- [ ] **Step 5: Reescribir StructuredData para usar los constructores**

Reemplazar el contenido completo de `src/components/StructuredData.tsx`:

```tsx
/**
 * JSON-LD de ámbito global: identidad del sitio y de su autor.
 *
 * Los breadcrumbs NO se emiten acá. Antes este componente declaraba una
 * BreadcrumbList fija (Inicio > Herramientas > Blog) idéntica en las 89
 * páginas del sitio, incluida la home: no es una jerarquía de navegación
 * y describía una ruta que ninguna página recorre. Cada página emite ahora
 * sus propias migas.
 */
import { JsonLd } from "@/components/seo/JsonLd";
import {
    personSchema,
    websiteSchema,
    professionalServiceSchema,
} from "@/lib/seo/schemas";

export async function StructuredData() {
    return (
        <JsonLd
            schema={[personSchema(), websiteSchema(), professionalServiceSchema()]}
        />
    );
}
```

- [ ] **Step 6: Verificar tipos y lint**

```bash
cd APP/NEXT_APP && pnpm typecheck && pnpm lint
```

Esperado: sin errores ni warnings.

- [ ] **Step 7: Ejecutar el test e2e hasta que pase**

```bash
cd APP/NEXT_APP && pnpm test:e2e tests/e2e/seo-schema.spec.ts
```

Esperado: PASA. Los 5 tests verdes.

- [ ] **Step 8: Confirmar en HTML crudo que el nonce llega**

```bash
cd APP/NEXT_APP && pnpm dev &
sleep 15
curl -s http://localhost:3000/ | grep -o 'application/ld+json' | wc -l
curl -s http://localhost:3000/ | grep -c 'nonce='
```

Esperado: 3 bloques JSON-LD, y todos con atributo `nonce`. Matar el servidor al terminar.

- [ ] **Step 9: Commit**

```bash
git add APP/NEXT_APP/src/lib/seo/schemas.ts \
        APP/NEXT_APP/src/components/seo/JsonLd.tsx \
        APP/NEXT_APP/src/components/StructuredData.tsx \
        APP/NEXT_APP/tests/e2e/seo-schema.spec.ts
git commit -m "feat(seo): replace the fake global breadcrumb with typed schema builders"
```

---

### Task 2: Breadcrumbs visibles y schema por herramienta

**Files:**
- Create: `src/components/seo/Breadcrumbs.tsx`
- Modify: `src/app/herramientas/<slug>/layout.tsx` × 29
- Modify: `src/app/herramientas/page.tsx`
- Modify: `scripts/seo-audit.ts`
- Test: `tests/e2e/seo-schema.spec.ts` (ampliar)

**Interfaces:**
- Consumes: `breadcrumbSchema`, `softwareApplicationSchema`, `BreadcrumbTrail` de `src/lib/seo/schemas.ts`; `JsonLd` de `src/components/seo/JsonLd.tsx`; `getToolSeo` de `src/lib/seo/tools-content.ts`
- Produces:
  - `function Breadcrumbs({ trail }: { trail: BreadcrumbTrail }): JSX.Element` — solo la UI visible, sin JSON-LD
  - `function toolBreadcrumbTrail(slug: string): BreadcrumbTrail` exportado desde `src/lib/seo/schemas.ts`

**Contexto de layout que condiciona el espaciado.** El `src/app/herramientas/layout.tsx` padre ya monta `ToolsNavbar`, envuelve a sus hijos en un `div` con `pt-16` para dejar espacio a esa navbar fija, y cierra con `ToolsFooter`. Por eso el componente de migas usa `pt-6` y no repite la separación de la navbar: hacerlo la escondería detrás de ella o abriría un hueco doble.

Además, cada `page.tsx` de herramienta trae su propio `pt-24`. Con las migas insertadas encima, ese padding queda entre las migas y el widget. Verificar visualmente en el Step 9 que la separación resultante se ve intencional y no como un hueco olvidado; si queda excesiva, **no** toques los `page.tsx` — ajusta el margen inferior del componente de migas.

- [ ] **Step 1: Ampliar el test e2e con las aserciones que fallan**

Añadir a `tests/e2e/seo-schema.spec.ts`, dentro de un nuevo `describe`:

```ts
const SAMPLE_TOOLS = ["qr", "claves", "base64", "json", "subredes"];

test.describe("Herramientas: breadcrumbs y SoftwareApplication", () => {
    for (const slug of SAMPLE_TOOLS) {
        test(`/herramientas/${slug} emite BreadcrumbList real de 3 niveles`, async ({
            page,
        }) => {
            await page.goto(`/herramientas/${slug}`);
            const crumb = (await readJsonLd(page)).find(
                (s) => s["@type"] === "BreadcrumbList"
            );
            expect(crumb, "falta BreadcrumbList").toBeTruthy();

            const items = crumb!.itemListElement as Record<string, unknown>[];
            expect(items).toHaveLength(3);
            expect(items[0].position).toBe(1);
            expect(items[0].item).toBe(SITE_URL);
            expect(items[1].item).toBe(`${SITE_URL}/herramientas`);
            expect(items[2].item).toBe(`${SITE_URL}/herramientas/${slug}`);
        });

        test(`/herramientas/${slug} emite SoftwareApplication con su propia URL`, async ({
            page,
        }) => {
            await page.goto(`/herramientas/${slug}`);
            const app = (await readJsonLd(page)).find(
                (s) => s["@type"] === "SoftwareApplication"
            );
            expect(app, "falta SoftwareApplication").toBeTruthy();
            expect(app!.url).toBe(`${SITE_URL}/herramientas/${slug}`);
            expect(app!.name).toBeTruthy();
        });

        test(`/herramientas/${slug} muestra migas navegables`, async ({ page }) => {
            await page.goto(`/herramientas/${slug}`);
            const nav = page.locator('nav[aria-label="Ruta de navegación"]');
            await expect(nav).toBeVisible();
            await expect(nav.locator('a[href="/"]')).toBeVisible();
            await expect(nav.locator('a[href="/herramientas"]')).toBeVisible();
        });

        test(`/herramientas/${slug} tiene exactamente un h1`, async ({ page }) => {
            await page.goto(`/herramientas/${slug}`);
            await expect(page.locator("h1")).toHaveCount(1);
        });
    }

    test("el hub de herramientas emite sus propias migas de 2 niveles", async ({
        page,
    }) => {
        await page.goto("/herramientas");
        const crumb = (await readJsonLd(page)).find(
            (s) => s["@type"] === "BreadcrumbList"
        );
        expect(crumb).toBeTruthy();
        const items = crumb!.itemListElement as Record<string, unknown>[];
        expect(items).toHaveLength(2);
        expect(items[1].item).toBe(`${SITE_URL}/herramientas`);
    });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

```bash
cd APP/NEXT_APP && pnpm test:e2e tests/e2e/seo-schema.spec.ts
```

Esperado: FALLA. Ninguna herramienta emite `BreadcrumbList` ni `SoftwareApplication`, y no existe el `nav` de migas.

- [ ] **Step 3: Añadir el constructor de la ruta de migas**

Añadir a `src/lib/seo/schemas.ts`, después de `breadcrumbSchema`:

```ts
/**
 * Ruta de migas canónica de una herramienta: Inicio > Herramientas > <tool>.
 * Se usa tanto para la UI visible como para el JSON-LD, de modo que no puedan
 * divergir.
 */
export function toolBreadcrumbTrail(slug: string): BreadcrumbTrail {
    const entry = getToolSeo(slug);
    return [
        { name: "Inicio", path: "" },
        { name: "Herramientas", path: "/herramientas" },
        { name: entry.h1, path: `/herramientas/${entry.slug}` },
    ];
}

/** Ruta de migas del hub de herramientas. */
export const TOOLS_HUB_TRAIL: BreadcrumbTrail = [
    { name: "Inicio", path: "" },
    { name: "Herramientas", path: "/herramientas" },
];
```

- [ ] **Step 4: Crear el componente de migas visibles**

Crear `src/components/seo/Breadcrumbs.tsx`:

```tsx
/**
 * Migas de pan visibles. El JSON-LD pareado lo emite quien renderiza este
 * componente, usando la MISMA ruta — si divergen, Google trata el schema
 * como engañoso.
 */
import Link from "next/link";
import type { BreadcrumbTrail } from "@/lib/seo/schemas";

interface BreadcrumbsProps {
    trail: BreadcrumbTrail;
}

export function Breadcrumbs({ trail }: BreadcrumbsProps) {
    return (
        <nav
            aria-label="Ruta de navegación"
            className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6"
        >
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                {trail.map((crumb, index) => {
                    const isLast = index === trail.length - 1;
                    return (
                        <li key={crumb.path} className="flex items-center gap-2">
                            {isLast ? (
                                // La página actual no se enlaza a sí misma.
                                <span aria-current="page" className="text-neutral-300">
                                    {crumb.name}
                                </span>
                            ) : (
                                <Link
                                    href={crumb.path === "" ? "/" : crumb.path}
                                    className="transition hover:text-white"
                                >
                                    {crumb.name}
                                </Link>
                            )}
                            {!isLast && (
                                <span aria-hidden="true" className="text-neutral-700">
                                    /
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
```

- [ ] **Step 5: Regenerar los 29 layout.tsx**

Desde `APP/NEXT_APP`, ejecutar:

```bash
for dir in src/app/herramientas/*/; do
  slug=$(basename "$dir")
  cat > "$dir/layout.tsx" <<EOF
import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo/metadata";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  breadcrumbSchema,
  softwareApplicationSchema,
  toolBreadcrumbTrail,
} from "@/lib/seo/schemas";

const SLUG = "$slug";

export const metadata: Metadata = buildToolMetadata(SLUG);

export default function ToolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const trail = toolBreadcrumbTrail(SLUG);

  return (
    <>
      <JsonLd schema={[breadcrumbSchema(trail), softwareApplicationSchema(SLUG)]} />
      <Breadcrumbs trail={trail} />
      {children}
    </>
  );
}
EOF
done
ls src/app/herramientas/*/layout.tsx | wc -l
```

Esperado: `29`.

- [ ] **Step 6: Actualizar el auditor para el nuevo patrón**

`scripts/seo-audit.ts` valida hoy que cada `layout.tsx` contenga `buildToolMetadata("<slug>")`. El nuevo layout usa una constante `SLUG`. Ajustar la comprobación para que verifique la línea `const SLUG = "<slug>";` en lugar del literal dentro de la llamada, manteniendo el resto de la lógica intacta.

Localizar en `scripts/seo-audit.ts` la función que hace ese match y cambiar su expresión regular a:

```ts
const slugLiteral = /const\s+SLUG\s*=\s*["']([^"']+)["']/.exec(source);
```

Conservando el mismo mensaje de error y la misma severidad. El punto de esta comprobación no cambia: un layout que declare el slug de otra herramienta debe hacer fallar la auditoría.

- [ ] **Step 7: Añadir migas al hub de herramientas**

En `src/app/herramientas/page.tsx`, importar `JsonLd`, `Breadcrumbs`, `breadcrumbSchema` y `TOOLS_HUB_TRAIL`, y renderizarlos antes del `<main>` existente:

```tsx
<JsonLd schema={breadcrumbSchema(TOOLS_HUB_TRAIL)} />
<Breadcrumbs trail={TOOLS_HUB_TRAIL} />
```

El `<h1>` del hub ya existe y no se toca.

- [ ] **Step 8: Verificar auditoría, tipos y lint**

```bash
cd APP/NEXT_APP && pnpm seo:audit && pnpm typecheck && pnpm lint
```

Esperado: auditoría OK con 29 herramientas, sin errores de tipos, sin warnings.

- [ ] **Step 9: Ejecutar los tests e2e hasta que pasen**

```bash
cd APP/NEXT_APP && pnpm test:e2e tests/e2e/seo-schema.spec.ts tests/e2e/seo-metadata.spec.ts
```

Esperado: PASAN ambos. El de metadata no debe romperse: las migas no cambian title, description ni canonical.

- [ ] **Step 10: Commit**

```bash
git add APP/NEXT_APP/src/components/seo/Breadcrumbs.tsx \
        APP/NEXT_APP/src/lib/seo/schemas.ts \
        APP/NEXT_APP/src/app/herramientas/*/layout.tsx \
        APP/NEXT_APP/src/app/herramientas/page.tsx \
        APP/NEXT_APP/scripts/seo-audit.ts \
        APP/NEXT_APP/tests/e2e/seo-schema.spec.ts
git commit -m "feat(seo): add real breadcrumbs and SoftwareApplication schema per tool"
```

---

### Task 3: Página de autor y firma E-A-T

**Files:**
- Create: `src/app/sobre-mi/page.tsx`
- Create: `src/components/seo/AuthorBio.tsx`
- Modify: `src/app/herramientas/<slug>/layout.tsx` × 29 (añadir la firma)
- Modify: `src/app/sitemap.ts`
- Test: `tests/e2e/seo-author.spec.ts`

**Interfaces:**
- Consumes: `JsonLd`, `Breadcrumbs`, `personSchema`, `breadcrumbSchema` de las tasks anteriores; `SITE_URL` de `src/lib/seo/metadata.ts`
- Produces:
  - `function AuthorBio(): JSX.Element` — tarjeta compacta de autor, sin `<h1>`
  - Ruta `/sobre-mi` indexable, con canonical propio y presencia en sitemap

**Origen de los datos — verificable, nada inventado.** Todo el contenido factual de esta página sale de material que ya está en el repositorio:

| Dato | Fuente en el repo |
|---|---|
| Nombre, cargo, descripción | `src/components/StructuredData.tsx` (Fase 1) |
| GitHub, LinkedIn | `sameAs` en el mismo archivo |
| Stack técnico | `defaultTechnologies` en `src/modules/landing/sections/AboutSection.tsx` |
| Hitos 2019 / 2021 / 2023 / 2024 | `timeline` en `src/modules/landing/sections/AboutSection.tsx` |

`AboutSection.tsx` **no está referenciada desde ningún componente** — es código muerto con biografía real. Esta task la usa como fuente de datos; no la borra ni la modifica.

**Prohibido añadir** certificaciones, títulos académicos, nombres de empleadores, premios, número de clientes o cifras de facturación. Si algo parece faltar para que la página sea convincente, anotarlo como pendiente en el reporte para que lo decida el usuario. Una página E-A-T con un dato inventado es peor que no tenerla.

- [ ] **Step 1: Escribir el test e2e que falla**

Crear `tests/e2e/seo-author.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const SITE_URL = "https://nicoholas.dev";

test.describe("Página de autor (E-A-T)", () => {
    test("/sobre-mi responde 200 con canonical propio", async ({ page }) => {
        const response = await page.goto("/sobre-mi");
        expect(response?.status()).toBe(200);
        const canonical = await page
            .locator('link[rel="canonical"]')
            .getAttribute("href");
        expect(canonical).toBe(`${SITE_URL}/sobre-mi`);
    });

    test("/sobre-mi tiene exactamente un h1", async ({ page }) => {
        await page.goto("/sobre-mi");
        await expect(page.locator("h1")).toHaveCount(1);
    });

    test("/sobre-mi enlaza perfiles externos verificables", async ({ page }) => {
        await page.goto("/sobre-mi");
        await expect(page.locator('a[href*="github.com"]').first()).toBeVisible();
        await expect(page.locator('a[href*="linkedin.com"]').first()).toBeVisible();
    });

    test("/sobre-mi está en el sitemap", async ({ request }) => {
        const xml = await (await request.get("/sitemap.xml")).text();
        expect(xml).toContain(`<loc>${SITE_URL}/sobre-mi</loc>`);
    });

    test("las herramientas firman con el autor y enlazan a /sobre-mi", async ({
        page,
    }) => {
        await page.goto("/herramientas/qr");
        const bio = page.locator('[data-testid="author-bio"]');
        await expect(bio).toBeVisible();
        await expect(bio.locator('a[href="/sobre-mi"]')).toBeVisible();
    });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

```bash
cd APP/NEXT_APP && pnpm test:e2e tests/e2e/seo-author.spec.ts
```

Esperado: FALLA. `/sobre-mi` devuelve 404.

- [ ] **Step 3: Crear el componente de firma de autor**

Crear `src/components/seo/AuthorBio.tsx`:

```tsx
/**
 * Firma de autor al pie de una herramienta o artículo.
 *
 * Señal E-A-T: conecta cada página de utilidad con una persona identificable
 * y con la página que la respalda. No usa <h1> — la página ya tiene el suyo.
 */
import Link from "next/link";
import { SITE_NAME } from "@/lib/seo/metadata";

export function AuthorBio() {
    return (
        <aside
            data-testid="author-bio"
            className="mx-auto mt-16 w-full max-w-5xl px-4 pb-16 sm:px-6"
        >
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                    Quién mantiene esta herramienta
                </p>
                <p className="mt-3 text-base font-semibold text-white">{SITE_NAME}</p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                    Desarrollador Full Stack. Construyo plataformas, automatizaciones y
                    herramientas que corren enteras en el navegador — sin subir tus
                    archivos a ningún servidor.
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <Link
                        href="/sobre-mi"
                        className="text-[#00B8A9] transition hover:text-white"
                    >
                        Más sobre mí
                    </Link>
                    <a
                        href="https://github.com/TeguiHD"
                        target="_blank"
                        rel="noopener noreferrer me"
                        className="text-neutral-400 transition hover:text-white"
                    >
                        GitHub
                    </a>
                    <a
                        href="https://linkedin.com/in/nicoholas-lopetegui"
                        target="_blank"
                        rel="noopener noreferrer me"
                        className="text-neutral-400 transition hover:text-white"
                    >
                        LinkedIn
                    </a>
                </div>
            </div>
        </aside>
    );
}
```

`rel="me"` es la convención que vincula un perfil externo con su dueño; refuerza la señal de identidad.

- [ ] **Step 4: Crear la página de autor**

Crear `src/app/sobre-mi/page.tsx` como Server Component. Requisitos:

- `export const metadata` con `title: { absolute: ... }` de menos de 60 caracteres, `description` propia, y `alternates: { canonical: "/sobre-mi" }`.
- Un único `<h1>`.
- `<JsonLd schema={[personSchema(), breadcrumbSchema(trail)]} />` donde `trail` es `[{ name: "Inicio", path: "" }, { name: "Sobre mí", path: "/sobre-mi" }]`.
- `<Breadcrumbs trail={trail} />`.
- Contenido en secciones con `<h2>`: quién soy, en qué trabajo, el stack (desde `defaultTechnologies` de `AboutSection.tsx`), la trayectoria (desde `timeline`: 2019 inicio carrera Full-stack, 2021 primer proyecto gubernamental SLEP, 2023 especialización en automatizaciones, 2024 ML Ops y pipelines de datos), y cómo contactar.
- Enlaces a GitHub y LinkedIn con `rel="noopener noreferrer me"`.
- Reutilizar `Navbar` de `@/modules/landing/layout/Navbar` y `FooterSection` de `@/modules/landing/sections/FooterSection`, igual que hace `src/app/blog/page.tsx`.

Nada de datos que no salgan de la tabla de fuentes de arriba.

- [ ] **Step 5: Añadir la firma a los 29 layouts**

Regenerar los layouts incluyendo `AuthorBio` después de `{children}`:

```bash
for dir in src/app/herramientas/*/; do
  slug=$(basename "$dir")
  cat > "$dir/layout.tsx" <<EOF
import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo/metadata";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { AuthorBio } from "@/components/seo/AuthorBio";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  breadcrumbSchema,
  softwareApplicationSchema,
  toolBreadcrumbTrail,
} from "@/lib/seo/schemas";

const SLUG = "$slug";

export const metadata: Metadata = buildToolMetadata(SLUG);

export default function ToolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const trail = toolBreadcrumbTrail(SLUG);

  return (
    <>
      <JsonLd schema={[breadcrumbSchema(trail), softwareApplicationSchema(SLUG)]} />
      <Breadcrumbs trail={trail} />
      {children}
      <AuthorBio />
    </>
  );
}
EOF
done
ls src/app/herramientas/*/layout.tsx | wc -l
```

Esperado: `29`.

- [ ] **Step 6: Añadir /sobre-mi al sitemap**

En `src/app/sitemap.ts`, añadir al array `core`:

```ts
{
    url: `${SITE_URL}/sobre-mi`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
},
```

Esto sube el total de 34 a 35 URLs. `tests/e2e/seo-crawl.spec.ts` deriva el conteo esperado de `TOOL_SEO_SLUGS.length + 5`; ese `5` es el número de páginas fijas y pasa a `6`. Actualizarlo junto con su comentario.

- [ ] **Step 7: Verificar auditoría, tipos y lint**

```bash
cd APP/NEXT_APP && pnpm seo:audit && pnpm typecheck && pnpm lint
```

- [ ] **Step 8: Ejecutar la suite SEO completa**

```bash
cd APP/NEXT_APP && pnpm test:e2e tests/e2e/seo-author.spec.ts tests/e2e/seo-schema.spec.ts tests/e2e/seo-crawl.spec.ts tests/e2e/seo-metadata.spec.ts tests/e2e/seo-links.spec.ts
```

Esperado: todos pasan. El de `seo-crawl` debe reflejar las 35 URLs.

- [ ] **Step 9: Commit**

```bash
git add APP/NEXT_APP/src/app/sobre-mi/page.tsx \
        APP/NEXT_APP/src/components/seo/AuthorBio.tsx \
        APP/NEXT_APP/src/app/herramientas/*/layout.tsx \
        APP/NEXT_APP/src/app/sitemap.ts \
        APP/NEXT_APP/tests/e2e/seo-author.spec.ts \
        APP/NEXT_APP/tests/e2e/seo-crawl.spec.ts
git commit -m "feat(seo): add author page and E-A-T signature on every tool"
```

---

### Task 4: Jerarquía de encabezados

**Files:**
- Modify: `src/app/layout.tsx`
- Test: `tests/e2e/seo-headings.spec.ts`

**Interfaces:**
- Consumes: nada nuevo
- Produces: ninguna interfaz de código

**El problema:** `src/app/layout.tsx` contiene `<h1>🔒 Navegador no compatible</h1>` dentro de un `<noscript>`. Ese `<h1>` está en el HTML crudo de **todas** las páginas del sitio, así que cualquier crawler que no ejecute JavaScript ve dos `<h1>` por página — o, en las páginas cuyo `<h1>` real lo pinta un componente cliente, ve ese como el único. Un `<noscript>` no necesita un encabezado de nivel 1: el aviso funciona igual con un `<p>` o un `<div>`.

Esta task corrige solo el encabezado. El overlay a pantalla completa —que es el problema mayor para crawlers de IA— lo aborda la Fase 3.

- [ ] **Step 1: Escribir el test e2e que falla**

Crear `tests/e2e/seo-headings.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const PAGES = ["/", "/herramientas", "/sobre-mi", "/blog"];
const TOOLS = ["qr", "claves", "base64", "json", "subredes"];

test.describe("Jerarquía de encabezados", () => {
    for (const path of PAGES) {
        test(`${path} tiene exactamente un h1 en el DOM`, async ({ page }) => {
            await page.goto(path);
            await expect(page.locator("h1")).toHaveCount(1);
        });
    }

    for (const slug of TOOLS) {
        test(`/herramientas/${slug} tiene exactamente un h1 en el HTML crudo`, async ({
            request,
        }) => {
            // Sin ejecutar JavaScript: es lo que ven los crawlers que no renderizan.
            const html = await (await request.get(`/herramientas/${slug}`)).text();
            const count = (html.match(/<h1[\s>]/g) ?? []).length;
            expect(count, `HTML crudo con ${count} h1`).toBeLessThanOrEqual(1);
        });
    }

    test("el aviso de noscript no usa h1", async ({ request }) => {
        const html = await (await request.get("/")).text();
        const noscript = /<noscript>([\s\S]*?)<\/noscript>/g;
        for (const match of html.matchAll(noscript)) {
            expect(match[1], "el bloque noscript no debe contener un h1").not.toMatch(
                /<h1[\s>]/
            );
        }
    });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

```bash
cd APP/NEXT_APP && pnpm test:e2e tests/e2e/seo-headings.spec.ts
```

Esperado: FALLA en el test de `noscript` y en los de HTML crudo — el `<h1>` del aviso aparece en todas las páginas.

- [ ] **Step 3: Degradar el encabezado del noscript**

En `src/app/layout.tsx`, dentro del bloque `<noscript>`, sustituir:

```tsx
<h1>🔒 Navegador no compatible</h1>
```

por:

```tsx
<p className="browser-warning-title">🔒 Navegador no compatible</p>
```

Y en el CSS del `<style>` del mismo bloque, cambiar el selector `.browser-warning h1` por `.browser-warning-title`, conservando exactamente las mismas declaraciones (`font-size: 2rem; margin-bottom: 1rem; color: #f59e0b;`). El aviso debe verse igual; solo deja de ser un encabezado de nivel 1.

- [ ] **Step 4: Ejecutar el test e2e hasta que pase**

```bash
cd APP/NEXT_APP && pnpm test:e2e tests/e2e/seo-headings.spec.ts
```

Esperado: PASA.

- [ ] **Step 5: Confirmar visualmente que el aviso no cambió**

El bloque solo se ve con JavaScript deshabilitado. Verificarlo con Playwright creando un contexto con `javaScriptEnabled: false`, cargando `/`, y comprobando que el texto "Navegador no compatible" sigue visible y con el mismo tamaño de fuente.

- [ ] **Step 6: Commit**

```bash
git add APP/NEXT_APP/src/app/layout.tsx APP/NEXT_APP/tests/e2e/seo-headings.spec.ts
git commit -m "fix(a11y): stop the noscript notice from claiming every page's h1"
```

---

### Task 5: Verificación integral de la fase

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: todo lo anterior
- Produces: comando `pnpm seo:verify` ampliado

- [ ] **Step 1: Ampliar el comando de verificación**

`package.json` ya define `seo:verify`. Dejarlo como está —`seo:audit && typecheck && lint && build`— y añadir uno nuevo que incluya los e2e de SEO:

```json
"seo:e2e": "playwright test tests/e2e/seo-metadata.spec.ts tests/e2e/seo-crawl.spec.ts tests/e2e/seo-links.spec.ts tests/e2e/seo-schema.spec.ts tests/e2e/seo-author.spec.ts tests/e2e/seo-headings.spec.ts"
```

- [ ] **Step 2: Ejecutar la verificación completa**

```bash
cd APP/NEXT_APP && pnpm seo:verify && pnpm seo:e2e
```

Esperado: auditoría OK, tipos limpios, lint sin warnings, build exitoso, todos los e2e de SEO en verde.

- [ ] **Step 3: Ejecutar la suite e2e completa**

```bash
cd APP/NEXT_APP && pnpm test:e2e
```

Esperado: pasan todos salvo el fallo conocido de `autonomous-defense.spec.ts` (1/9) cuando no hay Redis levantado — ambiental y previo a estas fases, ya verificado dos veces. Si falla algo más, es regresión: detenerse y reportar.

- [ ] **Step 4: Validar el schema contra HTML servido**

```bash
cd APP/NEXT_APP && pnpm dev &
sleep 15
for path in / /herramientas /herramientas/qr /sobre-mi; do
  echo "--- $path ---"
  curl -s "http://localhost:3000$path" \
    | grep -o '"@type":"[^"]*"' | sort -u
done
```

Esperado: la home con `Person`, `WebSite`, `ProfessionalService`; el hub con `BreadcrumbList`; la herramienta con `BreadcrumbList` y `SoftwareApplication`; `/sobre-mi` con `Person` y `BreadcrumbList`. Matar el servidor al terminar.

- [ ] **Step 5: Verificar que las herramientas siguen funcionando**

Los 29 layouts ahora envuelven cada widget con migas arriba y firma abajo. Confirmar con navegador real que las de estado pesado siguen montando e interactuando:

- `/herramientas/esteganografia-imagen`
- `/herramientas/quitar-fondo`
- `/herramientas/marca-agua`
- `/herramientas/ascii`
- `/herramientas/qr`

Comprobar además que las migas no tapan el contenido en móvil (375 px de ancho).

- [ ] **Step 6: Commit**

```bash
git add APP/NEXT_APP/package.json
git commit -m "chore(seo): add seo:e2e aggregate test command"
```

---

## Definición de terminado — Fase 2

- [ ] `pnpm seo:verify` pasa
- [ ] `pnpm seo:e2e` pasa
- [ ] `pnpm test:e2e` pasa salvo el fallo conocido de Redis
- [ ] Ninguna página emite el `BreadcrumbList` global falso
- [ ] Las 29 herramientas emiten `BreadcrumbList` de 3 niveles y `SoftwareApplication`
- [ ] Todo bloque JSON-LD lleva nonce y es JSON válido con `@context` de schema.org
- [ ] `/sobre-mi` responde 200, tiene canonical propio y está en el sitemap
- [ ] Las 29 herramientas muestran migas visibles y firma de autor enlazando a `/sobre-mi`
- [ ] Exactamente un `<h1>` por página, también en HTML crudo sin JavaScript
- [ ] El sitemap tiene 35 URLs y todas responden 200
- [ ] Ningún `src/app/herramientas/*/page.tsx` fue modificado — verificar con
      `git diff --name-only` sin resultados para ese patrón
- [ ] Ningún dato inventado en `/sobre-mi`: cada afirmación factual rastreable a la tabla de fuentes de la Task 3

## Fuera de alcance en esta fase

- `FAQPage` schema → necesita las preguntas, que llegan en Fase 4. `schemas.ts` queda listo para añadirlo sin refactor.
- El overlay `<noscript>` a pantalla completa, SSR del landing, `llms.txt`, `/blog/[slug]` → Fase 3
- Las ~500 palabras por herramienta, enlazado interno, renombrado de slugs → Fase 4
- `next/image`, alt text, Core Web Vitals, móvil → Fase 5
- Backlinks y Search Console → Fase 6
