# Herramientas profesionales (ronda 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Que ninguna herramienta parezca de otro sitio: cabecera centrada, dos anchos definidos en el catálogo, nombres en español correcto y sin restos.

**Architecture:** El registro dice el ancho de cada herramienta (`ancho`); la carcasa lo pone como `data-ancho` en `.tools-workspace` y una variable CSS fija el ancho de la herramienta, la guía y las relacionadas. Las páginas dejan de traer `max-w-*`/`px-*` propios. La cabecera (`ToolPageHeader`) se centra.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, Playwright, Prisma (migración SQL).

**Spec:** `docs/superpowers/specs/2026-11-21-herramientas-ronda-2-design.md`

## Global Constraints

- Estrecha = 56rem de contenido; ancha = el ancho del sitio (`min(1180px, 100% - 2 * var(--margen))`).
- Anchas: qr, ascii, quitar-fondo, comprimir-imagen, convertir-imagen, redimensionar, recortar-imagen, marca-agua, favicon, convertir-ico, paleta-colores, base64, dns, nginx, json, regex, aleatorio. Las otras 12, estrechas.
- La migración de nombres actualiza solo si `name` sigue siendo el de fábrica.
- Un solo h1 por herramienta; sin desborde horizontal a 390 px; sin commits hasta el final; compilar y probar en jaula.

## Review Focus

1. Herramienta bloqueada (`ToolAccessBlocked`): sigue con un h1 y no se rompe el ancho.
2. Tema claro: la cabecera centrada se lee igual.
3. Quitar fondo (main con `flex`) y los estudios de imagen (`ImageTransformStudio`) toman el ancho nuevo sin apretarse.
4. Nombres largos («Generador de reverse shells») en 390 px: la cabecera no desborda.
5. El panel de admin muestra el nombre de la base: un nombre editado a mano no se pisa.

---

### Task 1: Catálogo (ancho y nombres)

**Files:** `src/lib/tool-registry.ts`, `prisma/migrations/20261121130000_nombres_herramientas/migration.sql`, `src/lib/seo/tools-content.ts` (solo `h1` que repiten el nombre en mayúsculas), test `tests/e2e/catalogo-datos.spec.ts`.

- [ ] Test: cada entrada tiene `ancho` y las anchas son exactamente la lista; ningún nombre tiene una palabra (que no sea sigla ni la primera) con mayúscula inicial; la migración tiene un `UPDATE … WHERE slug = … AND name = '<viejo>'` por cada nombre cambiado.
- [ ] Ver fallar. Implementar. Ver pasar.

### Task 2: Un ancho por herramienta

**Files:** `CarcasaHerramientas.tsx` (`data-ancho`), `tools.css`, `carcasa.css` (riel y migas al ancho del sitio), `ToolSeoContent.tsx`, las páginas (`max-w-*`/`px-*` del `<main>`), `ImageTransformStudio.tsx`. Test `tests/e2e/herramientas-ronda2.spec.ts`.

- [ ] Test a 1440: claves e impuestos miden 896 de contenido; qr, json y comprimir-imagen 1180; en cada una la guía y las relacionadas miden lo mismo que la herramienta; las migas empiezan en el mismo x en las cinco. A 390: sin desborde en las 29.
- [ ] Ver fallar contra producción. Implementar. Compilar y ver pasar.

### Task 3: Cabecera centrada

**Files:** `ToolPageHeader.tsx`, `tools.css`. Test en el mismo spec.

- [ ] Test a 1440: en claves, qr y json el centro del h1 está a ±2 px del centro de la ventana y su `y` es igual en las tres; a 390 la cabecera de reverse-shell no desborda.
- [ ] Ver fallar. Implementar. Ver pasar.

### Task 4: Restos

**Files:** las 18 páginas con «Volver a herramientas», `impuestos/page.tsx`, `quitar-fondo/page.tsx`. Tests: ninguna herramienta muestra «Volver a herramientas» dentro de `#tools-content`; el botón de EE. UU. de IVA mide una línea; quitar fondo dice «sin marca de agua» (herramientas-pro).

- [ ] Ver fallar. Implementar. Ver pasar.

### Task 5: Despliegue

- [ ] Suite local completa de herramientas y SEO, capturas 1440/390 de 6 herramientas, revisión final, desplegar, pruebas contra producción, commit y push a `ui/portada`.
