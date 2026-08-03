# SEO / AEO / GEO Overhaul — nicoholas.dev

**Fecha:** 2026-08-02
**Estado:** Diseño aprobado
**Alcance:** `APP/NEXT_APP` (Next.js 15 App Router)

---

## 1. Objetivo

Convertir las 29 herramientas gratuitas en el motor de tráfico orgánico del sitio, en
español para mercado LATAM, y hacer que el contenido sea legible tanto por buscadores
tradicionales (SEO) como por motores de respuesta y modelos de lenguaje (AEO / GEO).

**Decisiones tomadas:**

| Decisión | Valor |
|---|---|
| Objetivo primario | Tráfico masivo vía herramientas |
| Idioma / mercado | Solo español, foco LATAM. Sin i18n. |
| Profundidad de contenido | ~500 palabras originales en las 29 herramientas |
| Enfoque técnico | Opción A — `layout.tsx` por herramienta + registro central |

**No objetivos:** internacionalización, rediseño visual, cambios en el panel admin,
migración de framework.

---

## 2. Diagnóstico del estado actual

Hallazgos verificados sobre el código en `main` al 2026-08-02.

### 2.1 Indexación

- 89 `page.tsx` en total; solo **9** archivos exportan `metadata` o `generateMetadata`.
- Las 29 páginas de `/herramientas/*` empiezan con `"use client"`, lo que hace
  **imposible** exportar `metadata` desde ellas. Todas heredan el `title` y
  `description` por defecto del root layout.
  → 29 títulos duplicados, 29 descripciones duplicadas, canibalización total.
- `src/app/layout.tsx` define `alternates.canonical: BASE_URL`. Al ser el root layout,
  **todas** las páginas emiten `<link rel="canonical" href="https://nicoholas.dev">`.
  Esto instruye a Google a tratar cada URL como duplicado de la home. Es el defecto
  individual más costoso del sitio.
- `src/app/sitemap.ts` enumera 15 URLs escritas a mano. Existen 29 rutas de
  herramientas. ~18 páginas quedan fuera del sitemap (huérfanas).
- `robots.ts` publica dos sitemaps (`/sitemap.xml` y `/sitemap_index.xml`) donde el
  segundo solo apunta al primero. Redundante.
- `public/og-image.png` **no existe**, pero root layout y `twitter:image` lo referencian.
  Todas las tarjetas Open Graph están rotas. Existe `src/app/opengraph-image.tsx`, que
  generaría la imagen correctamente vía `next/og`, pero la referencia explícita al PNG
  inexistente tiene precedencia sobre la convención de archivo y la anula.

### 2.2 Datos estructurados

- `src/components/StructuredData.tsx` emite un `BreadcrumbList` global con
  `Inicio → Herramientas → Blog`. Eso no es una jerarquía de navegación, es una lista de
  secciones, y se emite idéntico en todas las páginas del sitio. Es schema inválido.
- No existe `SoftwareApplication`, `FAQPage`, `Article` ni `BreadcrumbList` real.

### 2.3 Crawlabilidad y GEO / AEO

- `src/app/layout.tsx` contiene un bloque `<noscript>` que renderiza un overlay
  `position: fixed` a pantalla completa con el mensaje "Navegador no compatible".
  Googlebot ejecuta JS y lo ignora, pero **GPTBot, ClaudeBot, PerplexityBot, CCBot y
  Bytespider no renderizan JavaScript**. Para ellos el sitio entero es ese mensaje.
- `src/app/page.tsx` renderiza el Hero en servidor y difiere 7 secciones vía
  `DeferredLandingSection`, que es `"use client"` y carga por `IntersectionObserver`.
  El HTML inicial no contiene el texto de esas secciones.
- `/blog` renderiza `PulsePageClient` completo en cliente. No existen rutas
  `/blog/[slug]`. Cero contenido crawleable en el blog.
- No existe `llms.txt`.

### 2.4 Rendimiento e imágenes

- 29 usos de `<img>` crudo, **0** usos de `next/image`.
  Sin lazy loading nativo, sin AVIF/WebP, sin `width`/`height` → CLS y LCP degradados.

### 2.5 Canibalización de keywords

Contrastado contra `DEFAULT_TOOL_REGISTRY`: las 29 herramientas son funcionalmente
distintas. `esteganografia` oculta texto en emojis, `esteganografia-imagen` usa LSB en
píxeles; `ascii` convierte imágenes en ASCII art, `banner-ascii` genera banners de
terminal; `convertir-ico` hace PNG→ICO, `favicon` genera el pack completo.

**No hay herramientas que fusionar.** El riesgo real es de nivel keyword: sin una
primaria asignada, el cluster de imágenes (`convertir-imagen`, `comprimir-imagen`,
`redimensionar`, `recortar-imagen`, `quitar-fondo`, `marca-agua`) competiría entre sí
por términos genéricos como "editor de imágenes online".

**Solución:** una keyword primaria única y excluyente por herramienta, declarada en el
registro y validada automáticamente. Sin fusiones, sin 301, sin pérdida de páginas.

### 2.6 Slugs

Varios slugs son opacos y no descriptivos: `claves`, `aleatorio`, `enlaces`,
`impuestos`, `unidades`, `binario`. Un slug descriptivo es señal de relevancia y mejora
el CTR en SERP.

---

## 3. Arquitectura de la solución

### 3.1 Registro SEO central

Archivo nuevo: `src/lib/seo/tools-content.ts`

Fuente única de verdad para todo lo relacionado a SEO de herramientas. Complementa —
no reemplaza — el `DEFAULT_TOOL_REGISTRY` existente en `src/lib/tool-registry.ts`,
que ya define `slug`, `name`, `description`, `icon` y `category` para el catálogo. El
registro SEO se une por `slug`.

```ts
export interface ToolSeoEntry {
  slug: string;                  // une con tool-registry
  title: string;                 // 50-60 caracteres, validado en tests
  description: string;           // 150-160 caracteres, único en todo el sitio
  h1: string;                    // un solo H1 por página
  primaryKeyword: string;
  secondaryKeywords: string[];
  intro: string;                 // 60-90 palabras, answer-first
  steps: { title: string; body: string }[];
  useCases: { title: string; body: string }[];
  faq: { question: string; answer: string }[];   // answer 40-60 palabras
  related: string[];             // slugs, para enlazado interno
  lastModified: string;          // ISO date
}

export const TOOLS_SEO: Record<string, ToolSeoEntry>;
```

De este registro se derivan: metadata, canonical, Open Graph, sitemap, JSON-LD,
contenido renderizado en servidor, breadcrumbs y enlaces internos.

### 3.2 Patrón por herramienta

Para cada slug se agrega un `layout.tsx` hermano del `page.tsx` existente:

```
src/app/herramientas/base64/
  layout.tsx    ← NUEVO — metadata + contenido SSR + JSON-LD + breadcrumbs
  page.tsx      ← INTACTO — sigue siendo "use client"
```

El layout:

1. Exporta `metadata` construido desde `TOOLS_SEO[slug]`, con `alternates.canonical`
   propio y Open Graph propio.
2. Renderiza `<Breadcrumbs>` sobre `{children}`.
3. Renderiza `{children}` (el widget interactivo).
4. Renderiza `<ToolSeoContent slug="base64" />` debajo: intro, guía, casos de uso, FAQ,
   herramientas relacionadas, firma del autor.
5. Emite JSON-LD `SoftwareApplication`, `FAQPage` y `BreadcrumbList`.

**Por qué layout y no page:** el widget ya funciona y tiene estado complejo en varias
herramientas (esteganografía, quitar-fondo, marca-agua). El layout envuelve sin tocar.
Riesgo de regresión funcional ≈ 0.

**Orden de render:** widget primero, contenido después. Correcto para UX (el usuario
viene a usar la herramienta) y para SEO (el contenido está en el HTML de todas formas).

### 3.3 Componentes nuevos

| Componente | Ubicación | Responsabilidad |
|---|---|---|
| `Breadcrumbs` | `src/components/seo/Breadcrumbs.tsx` | Migas visibles + accesibles (`nav aria-label`) |
| `ToolSeoContent` | `src/components/seo/ToolSeoContent.tsx` | Intro, pasos, casos de uso, FAQ, relacionadas |
| `AuthorBio` | `src/components/seo/AuthorBio.tsx` | Señal E-A-T, firma en herramientas y blog |
| `JsonLd` | `src/components/seo/JsonLd.tsx` | Emisor genérico con nonce CSP |
| `buildToolMetadata` | `src/lib/seo/metadata.ts` | Helper: entrada del registro → `Metadata` |
| `schemas` | `src/lib/seo/schemas.ts` | Constructores de JSON-LD tipados |

Cada unidad tiene un propósito único y es testeable en aislamiento.

---

## 4. Fases

Cada fase es entregable y verificable por separado.

### Fase 1 — Fundamentos de indexación

Cubre: *fix indexing issues, add canonical tags, avoid duplicate content, fix orphan
pages, unique meta descriptions, titles 50-60 chars, fix broken links and 404s, AI
crawler access.*

1. Eliminar `alternates.canonical: BASE_URL` de `src/app/layout.tsx`.
2. Crear `src/lib/seo/tools-content.ts` con las 29 entradas (metadata primero; el
   cuerpo de contenido se completa en Fase 4).
3. Crear `src/lib/seo/metadata.ts` con `buildToolMetadata()`.
4. Crear 29 `layout.tsx` con metadata y canonical propios.
5. Reescribir `sitemap.ts` para derivarse del registro: home, `/herramientas`, las 29
   herramientas, `/blog`, `/sobre-mi`, legales. De 15 a ~45 URLs.
6. Eliminar `src/app/sitemap_index.xml/route.ts` y su referencia en `robots.ts`.
   Un solo sitemap canónico.
7. Ampliar `robots.ts`: mantener `disallow` de `/admin/`, `/api/`, `/acceso`; agregar
   reglas explícitas de `allow` para GPTBot, ClaudeBot, PerplexityBot, Google-Extended,
   CCBot, Bytespider, Applebot-Extended, Amazonbot, meta-externalagent.
8. Eliminar del root layout las referencias a `/og-image.png` para que la convención
   `opengraph-image.tsx` vuelva a aplicarse; verificar que las rutas de iconos del
   manifest resuelvan.
9. Auditar enlaces internos rotos y respuestas 404; mejorar `not-found.tsx` con enlaces
   a las herramientas de mayor prioridad.

**Verificación:** `next build` limpio; `curl` a 5 herramientas confirma canonical propio
y title único; conteo de URLs del sitemap = rutas públicas reales; ningún title fuera
del rango 50-60.

### Fase 2 — Datos estructurados, breadcrumbs y E-A-T

Cubre: *add schema markup, add breadcrumbs, author bio / E-A-T signals, fix heading
structure.*

1. Eliminar el `BreadcrumbList` falso de `StructuredData.tsx`.
2. `src/lib/seo/schemas.ts`: constructores para `Person`, `WebSite` (con `SearchAction`),
   `ProfessionalService`, `SoftwareApplication`, `FAQPage`, `BreadcrumbList`, `Article`.
3. Componente `Breadcrumbs` visible en herramientas y blog, con su JSON-LD pareado.
4. Página nueva `/sobre-mi`: biografía real, experiencia, credenciales, enlaces
   verificables. Es el ancla de E-A-T del sitio.
5. Componente `AuthorBio` firmando cada herramienta y artículo.
6. Auditoría de jerarquía de encabezados: exactamente un `<h1>` por página, sin saltos
   de nivel. Corregir el `<h1>` dentro del `<noscript>` del root layout, que hoy compite
   con el `<h1>` real de cada página.

**Verificación:** Rich Results Test sobre 5 URLs representativas; validador de schema
sin errores; auditoría de encabezados automatizada.

### Fase 3 — GEO / AEO y crawlabilidad JS

Cubre: *check js content is crawlable, AI crawler access, GEO/AEO.*

1. Reemplazar el overlay `<noscript>` a pantalla completa por un banner no bloqueante
   que no oculte el contenido ni use `<h1>`.
2. Renderizar en servidor el contenido textual de las secciones diferidas del landing.
   Se conserva el diferido de hidratación e interactividad; lo que cambia es que el
   texto llegue en el HTML inicial.
3. Crear `/llms.txt` y `/llms-full.txt` describiendo el sitio, las herramientas y cómo
   citarlas.
4. Formato *answer-first* en todas las FAQ: respuesta directa en 40-60 palabras antes de
   cualquier matiz. Es el formato que los modelos extraen y citan.
5. Blog: rutas `/blog/[slug]` renderizadas en servidor con `Article` schema.

**Verificación:** `curl -s <url> | grep` confirma que el texto clave aparece en el HTML
crudo sin ejecutar JS, en home, `/herramientas` y 3 herramientas.

### Fase 4 — Contenido, keywords e intención de búsqueda

Cubre: *write original content, find high volume low KD keywords, match search intent,
fix keyword cannibalization, merge thin pages, internal links, clean descriptive URLs.*

1. Mapa de keywords: primaria + secundarias por herramienta, español LATAM, priorizando
   volumen alto y dificultad baja.
2. Asignar keyword primaria única y excluyente por herramienta (§2.5). Validado por
   script: dos herramientas no pueden declarar la misma primaria. Sin fusiones.
3. Escribir ~500 palabras originales por herramienta en el registro: intro, guía paso a
   paso, 3-4 casos de uso reales, FAQ de 4-5 preguntas.
4. Enlazado interno: bloque de relacionadas derivado de `related[]`, más enlaces
   contextuales hacia `/herramientas`, `/sobre-mi` y casos.
5. Slugs descriptivos: `claves` → `generador-de-contrasenas` y equivalentes, con 301
   permanentes desde los slugs viejos. **Decisión pendiente del usuario al inicio de
   esta fase** — toca URLs en producción.

**Verificación:** cero descripciones duplicadas; cada herramienta con contenido único;
todas las páginas alcanzables en ≤3 clics desde la home.

### Fase 5 — Core Web Vitals, imágenes y móvil

Cubre: *fix core web vitals, optimize images and add alt text, mobile friendly.*

1. Migrar los 29 `<img>` a `next/image` con `alt` descriptivo, `width`/`height`
   explícitos y formatos modernos.
2. LCP: priorizar la imagen del hero, precargar fuentes críticas.
3. CLS: reservar altura en secciones diferidas y en widgets que montan tarde.
4. INP: revisar los widgets pesados (esteganografía, quitar-fondo, marca-agua).
5. Móvil: viewport, tamaño de áreas táctiles, ausencia de scroll horizontal.

**Verificación:** Lighthouse ejecutado realmente sobre home, `/herramientas` y 3
herramientas. Objetivo: Performance ≥90 móvil, LCP <2.5s, CLS <0.1, INP <200ms.
Se reportan los números obtenidos, no estimaciones.

### Fase 6 — Off-page

Cubre: *get high quality backlinks.*

Los backlinks no se implementan en código. Entregable documental:

1. Lista concreta de directorios de herramientas y comunidades hispanohablantes donde
   registrar el sitio.
2. Plantillas de outreach.
3. Identificación de activos enlazables — las herramientas gratuitas sin registro son
   el imán natural.
4. Configuración de Google Search Console y Bing Webmaster Tools para medir.

**Nota honesta:** esta fase depende de acción humana. No se declarará completa por
haber escrito el documento.

---

## 5. Estrategia de verificación

Ninguna fase se declara completa sin evidencia ejecutada:

| Qué | Cómo |
|---|---|
| Build | `next build` sin errores ni warnings nuevos |
| Metadata | Tests que validan largo de title (50-60) y unicidad de description |
| HTML crudo | `curl` sin JS confirma contenido indexable |
| Schema | Rich Results Test / validador de schema.org |
| Rendimiento | Lighthouse real, números reportados |
| Regresión funcional | Las 29 herramientas siguen operando |

---

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| Renombrar slugs rompe enlaces externos y rankings | 301 permanentes; decisión explícita del usuario antes de ejecutar |
| Dos herramientas compiten por la misma keyword | Primaria única validada por script; falla el audit si se repite |
| Cambiar el `<noscript>` debilita la postura de seguridad | El banner conserva el aviso; solo deja de ocultar el contenido. Sin cambios en CSP ni cabeceras |
| El contenido generado suena genérico | Escrito desde el comportamiento real de cada herramienta, revisado por el usuario |
| 29 `layout.tsx` se desincronizan | Son plantilla trivial; toda la lógica vive en el registro |

---

## 7. Decisiones abiertas

1. **Renombrado de slugs** (Fase 4.5) — mejora relevancia y CTR, pero cambia URLs
   vivas. Requiere aprobación explícita.
2. **Imagen Open Graph** — ya existe `src/app/opengraph-image.tsx` que la genera
   dinámicamente vía `next/og`. El root layout la rompe al sobrescribirla con
   `images: ["/og-image.png"]`, archivo que no existe. La corrección es eliminar esa
   sobrescritura, no crear un PNG.
