# QR con Realidad Aumentada — Diseño

**Fecha:** 2026-08-05 · **Estado:** aprobado · **Rama:** `ui/tools-overhaul`

## Objetivo

Que el generador de QR pueda crear un código que, escaneado con un móvil, abra un
modelo 3D en realidad aumentada — el plato de un restaurante sobre la mesa, un
producto en la sala — **sin app, sin librerías 3D, sin estado en el VPS**.

## Decisiones (tomadas con el titular)

| Decisión | Elección | Por qué |
|---|---|---|
| Cómo se abre el AR | **Lanzadores nativos**: iOS Quick Look (`<a rel="ar" href="*.usdz">`), Android Scene Viewer (`intent://arvr.google.com/scene-viewer/1.0?file=*.glb&mode=ar_preferred`) | Cero JavaScript, cero dependencias. `<model-viewer>` exigía abrir la CSP a un CDN o instalar ~1 MB de three.js (bloqueado por el lockfile sin commitear del titular). |
| Dónde viven los modelos | **URLs aportadas por el usuario**, codificadas en el propio QR (`/ar?glb=…&usdz=…&t=…`) | Sin DB, sin endpoint de escritura (sin spam), nada que mantener en un VPS pequeño. Convertir GLB→USDZ en servidor queda descartado: herramientas pesadas. |
| Preview 3D en desktop | **No.** Desktop muestra póster + "escanéalo con tu móvil" | El flujo real es el teléfono. La preview era el único motivo para three.js. |

## Arquitectura

```
Generador QR ──tipo "AR"──▶ URL  https://nicoholas.dev/ar?t=…&glb=…&usdz=…&p=…
                                        │
Móvil escanea ──────────────────────────▶ /ar  (Server Component, lee searchParams)
                                        │  valida ▶ renderiza lanzador
                              ┌─────────┴──────────┐
                           iOS                    Android
                    <a rel="ar" href=usdz>   intent://…scene-viewer…file=glb
                       (Quick Look)               (Scene Viewer, fallback web)
```

**Parámetros** (todos por query string; nada se persiste):

| param | obligatorio | qué es |
|---|---|---|
| `glb` | sí (o `usdz`) | URL https del modelo `.glb`/`.gltf` (Android) |
| `usdz` | no | URL https del modelo `.usdz` (iOS). Sin él, iOS ve póster + aviso |
| `t` | no | título, ≤80 caracteres |
| `p` | no | URL https del póster `.png/.jpg/.jpeg/.webp` |

**Página `/ar`:**
- Sin parámetros: landing indexable que explica la función y enlaza al generador.
- Con parámetros válidos: título, póster (o placeholder), botón "Ver en tu espacio"
  que apunta al lanzador de la plataforma detectada por User-Agent en servidor
  (iOS → Quick Look si hay `usdz`; Android → intent; otro → mensaje "escanéalo con
  tu móvil" + QR de la propia URL para pasar de desktop a móvil).
- Con parámetros inválidos: página de error segura, sin reflejar la entrada.

**Generador:** nuevo tipo `ar` en la categoría de contacto/negocio con campos título,
URL GLB, URL USDZ (opcional), URL póster (opcional). `formatAR()` construye la URL.
Recomendación visible: corrección **M** para este tipo (URL larga → QR denso).

## Seguridad

- Solo `https:`; se rechaza cualquier otro esquema (`javascript:`, `data:`, `http:`).
- Extensión por lista blanca (`.glb`, `.gltf`, `.usdz`; póster `.png/.jpg/.jpeg/.webp`),
  evaluada sobre el `pathname` parseado, no sobre la cadena cruda.
- Longitud máxima por parámetro (2 KB) y del título (80).
- **El servidor nunca descarga el modelo ni el póster**: no hay `fetch` de URLs de
  usuario → cero SSRF. Solo se emiten como `href`/`src` para el cliente.
- Toda salida escapada por React; el intent se construye con `encodeURIComponent`.
- Páginas con parámetros: `robots: noindex, nofollow`. Contenido de terceros no se
  indexa bajo este dominio.
- Sin cookies, sin estado, sin tracking del modelo.

## SEO

- `/ar` (sin parámetros) con metadata propia, canonical `/ar`, entra en el sitemap.
- `/ar?…` → `noindex`.
- La herramienta QR conserva su `h1` único; el tipo AR es un campo más del widget.

## Fuera de alcance

Preview 3D en página, subida/alojamiento de modelos, conversión de formatos, URLs
cortas persistidas, analítica de escaneos.

## Verificación

- `/ar?glb=…&usdz=…` en Playwright con UA iOS → `<a rel="ar">` con `href` = usdz y un
  `<img>` hijo; con UA Android → `href` `intent://…file=<glb codificado>…S.browser_fallback_url=…`.
- Parámetros inválidos (`http:`, `javascript:`, extensión ajena) → error seguro. La
  entrada no aparece en el DOM ni en ningún atributo (`href` incluido); Next serializa
  `searchParams` en su payload RSC dentro de `<script>`, como JSON con `<` escapado
  (`\u003c`) — es dato, no markup, y se verifica que ese sea el único lugar.
- Sin requests salientes desde el servidor al renderizar (el modelo no se descarga).
- El generador, tipo AR, produce la URL esperada y sugiere corrección M.
- Suite SEO 69/69 sin cambios; `/ar` en sitemap; `/ar?x` con `noindex`.
