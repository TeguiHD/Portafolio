# Índice ampliado (edición 2026-12) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar la edición de diciembre del Índice de la Web Chilena con unas 820 instituciones y siete dimensiones, más «Lo que responde la IA».

**Architecture:** Medidores separados y reanudables escriben por sitio fuera del repo; un compilador nuevo junta todo en `src/data/indice/2026-12.json`; las páginas leen la edición vigente y conservan las descargas de 2026-11.

**Tech Stack:** Node 24 (scripts con TypeScript sin compilar), Lighthouse 13.4.1 (LH_DIR), dig, @anthropic-ai/sdk 1.13 (SDK_DIR, fuera del repo), Next.js 16, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-23-indice-ampliado-design.md` (con sus «Decisiones tras la revisión del constructor»).

## Global Constraints

- Nada inventado: cada control con fuente citable; sin escala de puntos inventada.
- Datos personales (whois, fichas del SINIM) nunca salen del PC ni al repo (público).
- Lighthouse en la jaula de memoria (`systemd-run --user --scope -p MemoryMax=2600M …`), un sitio por proceso.
- La clave de la API se lee de `~/.config/anthropic/api-key` y nunca se imprime.
- Textos sin rótulos en mayúsculas ni cajas de aviso; formato chileno de números.

## Review Focus

1. Un sitio que bloquea a nuestro robot (403/desafío) no debe perder puntos en Buscadores ni IA por lo que no se pudo leer: queda «sin dato» en esa dimensión.
2. Subdominios compartidos (educacionpublica.cl, redsalud.gob.cl): Correo «no aplica», sin empate artificial.
3. El ranking general excluye sitios sin Lighthouse, pero sus fichas muestran lo medido.
4. Las URLs de datos de 2026-11 siguen respondiendo (citadas en el Dataset).
5. La prueba de IA no cuenta como acierto un dominio padre compartido.

---

### Task 1: Lista de entidades 2026-12
- Verificar candidatos del Portal (curl + navegador), corregir a mano los casos documentados, armar `entidades-2026-12.json` (noviembre + nuevos) y `entidades-notas-2026-12.md`.

### Task 2: Medidores
- `dimensiones.ts` + pruebas (hecho), `medir.mjs` ampliado (hecho), `medir-dns.mjs`, `medir-ia.mjs` (lotes).
- Correr: Lighthouse (unas 4 h), DNS, IA.

### Task 3: Compilador y cálculos
- `compilar.mjs` → dimensiones con controles y notas; `calculos.ts` con tipos y funciones de nota por dimensión, nota general, comparación con 2026-11; pruebas puras con casos de cada control (incluidos los de la Review Focus).

### Task 4: Páginas
- Categorías nuevas (slep, delegacion, salud, servicio), pestañas por dimensión en el ranking, ficha con siete notas y «Lo que responde la IA», metodología con el estudio de cada control, datos CSV/JSON de 2026-12 y 2026-11.
- Pruebas e2e: `indice.spec.ts` ampliado.

### Task 5: Compilar, probar y desplegar
- Suites locales, despliegue, pruebas contra producción, memoria.
