# Herramientas profesionales (ronda 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Cabecera única y verificada en las 29 herramientas, sin relleno, colores del sitio en contraseñas e IVA, y resultado de entrada en IVA y JSON.

**Architecture:** `ToolPageHeader` toma todo del registro (nombre, descripción, `dondeCorre`); las páginas solo pasan `slug`. Las migas toman el nombre del registro. Los arreglos de copia, color y valores iniciales son locales a cada página.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-21-herramientas-profesionales-design.md`

## Global Constraints

- Textos de la spec copiados tal cual (las 3 líneas de «dónde se procesa»).
- Exactamente un h1 por herramienta (seo-headings.spec.ts).
- Sin commits; compilar y probar en jaula; desplegar al final.

## Review Focus

1. Una herramienta bloqueada (`ToolAccessBlocked`) sigue con un solo h1.
2. Tema claro: la cabecera nueva se lee (contraste) — cubierta por la prueba existente de cajas oscuras.
3. El nombre del registro en las migas no rompe el JSON-LD (seo-schema.spec.ts).
4. En celular la cabecera no desborda.
5. IVA: el valor de ejemplo se reemplaza al escribir (no se concatena).

---

### Task 1: Cabecera única

**Files:** `src/lib/tool-registry.ts` (campo `dondeCorre?: "servidor" | "ia"` en dns y regex), `src/components/tools/ToolPageHeader.tsx`, las 29 llamadas, `qr/page.tsx`, `ascii/page.tsx`, `src/lib/seo/schemas.ts` (`toolBreadcrumbTrail`), CSS `.th` si hace falta. Test: `tests/e2e/herramientas-pro.spec.ts`.

- [ ] Test: para qr, quitar-fondo, claves, json, impuestos, dns, regex, ascii: `h1` = nombre del catálogo; la línea = descripción del catálogo; la línea de dónde corre según la spec; la última miga = nombre del catálogo; un solo h1.
- [ ] Ver fallar (contra producción). Implementar. Compilar y ver pasar.

### Task 2: Sin relleno

**Files:** `quitar-fondo/page.tsx`, `claves/page.tsx`, `regex/page.tsx`. Test en el mismo spec.

- [ ] Test: el texto visible de quitar-fondo no contiene «cambia todo», «perfecto», «Sin marca de agua»; claves no contiene «profesionales» ni «benchmarks»; regex no contiene «✨» ni «🤖».
- [ ] Ver fallar. Implementar. Ver pasar.

### Task 3: Colores del sitio en contraseñas e IVA

**Files:** `claves/page.tsx`, `impuestos/page.tsx`. Test: el botón «Generar otra» y la operación activa de IVA no usan degradado (`background-image: none`) ni verde neón.

- [ ] Ver fallar. Implementar con `studio-button`/acento. Ver pasar.

### Task 4: Resultado de entrada

**Files:** `impuestos/page.tsx`, `json/page.tsx`. Tests: IVA abre con 10.000 y muestra 11.900 (19 %); al escribir 5000 el resultado es 5.950; JSON tiene «Probar con un ejemplo» y al tocarlo el resultado muestra JSON formateado.

- [ ] Ver fallar. Implementar. Ver pasar.

### Task 5: Despliegue

- [ ] Suite local (herramientas-pro, herramientas-catalogo, seo-headings, seo-schema, tools-return-visits, tools-accessibility-ar, detalles-*), capturas de 4 herramientas a 1440 y 390, desplegar, pruebas contra producción.
