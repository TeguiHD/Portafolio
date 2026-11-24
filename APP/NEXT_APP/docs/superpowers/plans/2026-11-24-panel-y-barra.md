# Panel, barra y migas: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arreglar la barra recogida, los paneles, el marco de partículas bajo las migas y los errores y desvíos de diseño del panel, y desplegar.

**Architecture:** Arreglos puntuales en su lugar. Lo que se puede probar sin navegador sale a funciones puras (`destinoMarco`, `tasaConPesos`); lo visual se prueba con Playwright contra el servidor local (`prod-local.sh`), y lo del panel con la sesión de `panel-etapa1.spec.ts` sobre la base de prueba.

**Tech Stack:** Next.js 16.3, React 19, Tailwind 4, Playwright 1.57, TypeScript 5.9.

**Spec:** `docs/superpowers/specs/2026-11-24-panel-y-barra-design.md`

## Global Constraints

- Textos en español, sin rótulos en mayúsculas, sin cajas de aviso, sin «·» entre datos, borde y fondo solo para tablas y gráficos.
- Sin cambios de esquema; `confirmar()` en vez de `confirm()`; sin framer-motion; sin desplazamiento lateral a ≤ 760 px (`pruebas/reglas-panel.md`).
- Nada inventado: las frases cortas del menú resumen la descripción del registro, sin agregar capacidades.
- Pruebas del panel solo contra la base de prueba local, nunca contra producción.
- Compilar en la jaula de memoria (MemoryMax=2600M, NEXT_BUILD_CPUS=3); una tarea pesada a la vez.

## Review Focus

- Barra entre 861 y 900 px recogida: la cápsula no debe pasar del ancho de la pantalla (prueba en Task 1 a 900 px).
- Tema claro: el marco sigue en los márgenes y la barra recogida igual (capturas de Task 9).
- Convertidor con un par sin CLP (USD → EUR): sigue funcionando con Frankfurter (prueba pura en Task 3).
- Mensajes con la API caída: un solo aviso y sin pedidos en bucle (prueba en Task 4).
- Celular (390 px): la lista de clientes y propuestas sin desplazamiento lateral (prueba en Task 7).

---

### Task 1: Barra recogida al ancho de su contenido, paneles con intención y frases cortas

**Files:**
- Modify: `src/modules/esqueleto/barra.css`, `src/modules/esqueleto/Barra.tsx`, `src/lib/tool-menu.ts`
- Test: `tests/e2e/viva-barra.spec.ts`, `tests/e2e/herramientas-ronda2.spec.ts:87-94`

- [ ] **Step 1: Pruebas que fallan.** En `viva-barra.spec.ts`:
  - «recogida: nada se encoge» a 1440, 1100 y 900: tras bajar 400 px y esperar 900 ms, `#nb-hablar` mide ≥ 100 px de ancho, su `scrollWidth ≤ clientWidth + 1`, la caja de `#nb-tema` no se cruza con la de `#nb-hablar`, y `#nb` cabe en la pantalla (`right ≤ innerWidth - 8`).
  - «paneles con intención»: pasar el cursor por «Herramientas» y salir antes de 80 ms no abre `#nb-sub-herramientas`; quedarse 400 ms sí lo abre.
  - «panel en una línea» a 1440 y 1100: cada `.nb-panel-lista span` mide como mucho 1,4 veces su `line-height`.
  - En `herramientas-ronda2.spec.ts`, la prueba del menú pasa a comprobar: los slugs son `[...DESTACADAS_RESPALDO, "sueldo-liquido", "uf-utm"]`, los nombres son los del registro y cada `que` tiene entre 12 y 44 caracteres sin punto final.
- [ ] **Step 2:** Correr las pruebas con `prod-local.sh probar` y ver que fallan (32 px de ancho del botón, panel abierto al instante, dos líneas cortadas).
- [ ] **Step 3: CSS.** En `.nb.nb-baja`: `width: max-content; max-width: calc(100vw - 32px)`; `interpolate-size: allow-keywords` en `.nb`; `.nb > * { flex-shrink: 0 }` salvo la marca; en la cápsula, `.nb-ir .nb-item` con `padding-inline: 12px`. Se quita el clamp de `.nb-panel-lista span`.
- [ ] **Step 4: Intención.** En `Barra.tsx`, `entra` programa `showPopover` a los 150 ms y `sale` lo cancela; al salir con el panel en vista previa, se cierra a los 200 ms salvo que el cursor vuelva al grupo. El clic sigue igual.
- [ ] **Step 5: Frases.** En `tool-menu.ts`, cada `que` corto (≤ 44 caracteres), fiel a la descripción del registro. Se actualiza el comentario del archivo.
- [ ] **Step 6:** Correr `viva-barra` y `herramientas-ronda2`: pasan.
- [ ] **Step 7:** Commit `fix(barra): la cápsula recogida mide lo que su contenido, los paneles abren con intención y sin textos cortados`.

### Task 2: El marco de partículas vive en los márgenes; las migas a una sola altura

**Files:**
- Create: `src/modules/materia/marco.ts`
- Modify: `src/modules/materia/motor.ts:225-226`, `src/app/herramientas/catalogo.css:3`
- Test: `tests/e2e/viva-materia.spec.ts`

**Interfaces:**
- Produces: `destinoMarco(s: number, i: number, W: number, H: number): { x: number; y: number }`. `s` es la semilla de la partícula (0 ≤ s < 1).

- [ ] **Step 1: Prueba pura que falla.** Para W en [900, 1100, 1280, 1440, 1920], H = 900 e i de 0 a 3999 con `s = (i * 0.6180339887) % 1`:
  - con `margen = (W - Math.min(1180, W - 48)) / 2`, todo punto con `y` entre 64 y H − 90 tiene `x ≤ margen - 6` o `x ≥ W - margen + 6`;
  - todo punto con `y < 64` tiene `y ≥ 4`.
- [ ] **Step 2: Prueba de navegador que falla.** A 1440 y 1100, el borde superior de `.ht-migas` en `/herramientas` es igual (±1 px) al de las migas de `/servicios`.
- [ ] **Step 3:** Verlas fallar.
- [ ] **Step 4:** Implementar `destinoMarco` (lados: de 6 px al margen libre menos 6, como máximo 70; arriba: de 6 a 60 px; abajo: como antes) y usarla en `motor.ts`. Subir `.ht-migas` a la altura de las demás páginas.
- [ ] **Step 5:** Pasan. Commit `fix(materia): el marco de partículas queda en los márgenes y no pasa bajo las migas`.

### Task 3: Convertidor con pesos chilenos

**Files:**
- Create: `src/lib/finanzas/tasa-pesos.ts`
- Modify: `src/app/api/finance/exchange-rates/convert/route.ts`, `src/modules/finance/components/CurrencyConverter.tsx`
- Test: `tests/e2e/panel-tanda5.spec.ts`

**Interfaces:**
- Produces: `tasaConPesos(from: string, to: string, ind: { dolar: number; euro?: number }, usdA?: (moneda: string) => Promise<number>): Promise<number | null>`. Devuelve null si ninguna de las dos es CLP.

- [ ] **Step 1: Prueba pura que falla** con `ind = { dolar: 950, euro: 1030 }`: CLP→USD = 1/950; USD→CLP = 950; EUR→CLP = 1030; CLP→EUR = 1/1030; USD→EUR = null; CLP→GBP con `usdA("GBP") = 0.8` → 0.8/950; sin euro, CLP→EUR usa `usdA("EUR")`.
- [ ] **Step 2: Prueba de navegador que falla:** en `/admin/finance/settings`, el convertidor muestra «1 CLP =» y ningún texto de error.
- [ ] **Step 3:** Implementar. La ruta usa `leerIndicadores()` cuando hay CLP y no hay fecha; con fecha y CLP responde 400 «Sin tasa histórica del peso chileno». El error del componente pasa a texto con el mensaje del servidor, sin caja.
- [ ] **Step 4:** Pasan. Commit `fix(finanzas): el convertidor toma el dólar y el euro del día para los pares con pesos chilenos`.

### Task 4: Avisos estables (sin bucle en Mensajes)

**Files:**
- Modify: `src/components/ui/Toast.tsx:~120-170`
- Test: `tests/e2e/panel-tanda5.spec.ts`

- [ ] **Step 1: Prueba que falla:** con `page.route("**/api/contact**", r => r.fulfill({ status: 500, body: "{}" }))`, abrir `/admin/contact`, esperar 3 s: los pedidos interceptados son ≤ 2 y los avisos visibles ≤ 1.
- [ ] **Step 2:** Verla fallar.
- [ ] **Step 3:** `addToast`, `removeToast`, `success`, `error`, `warning`, `info` con `useCallback`; el valor del proveedor con `useMemo`.
- [ ] **Step 4:** Pasa. Commit `fix(avisos): el proveedor entrega funciones estables y Mensajes deja de recargar en bucle`.

### Task 5: Mi perfil sin error de hidratación

**Files:**
- Modify: `src/app/admin/profile/client.tsx` (formatDate, formatDateTime, timeAgo)
- Test: `tests/e2e/panel-tanda5.spec.ts`

- [ ] **Step 1: Prueba que falla:** en `/admin/profile`, sin errores de consola que contengan «#418» ni «Hydration».
- [ ] **Step 2:** Verla fallar.
- [ ] **Step 3:** Fechas con `timeZone: "America/Santiago"`; `timeAgo` devuelve la fecha corta en el primer render y el tiempo relativo después de montar (un `useEffect` que marca `montado`).
- [ ] **Step 4:** Pasa. Commit `fix(perfil): fechas con la hora de Chile y tiempo relativo después de montar`.

### Task 6: Sin «·» en el panel

**Files:**
- Modify: los 25 archivos de `src/app/admin`, `src/modules/admin`, `src/components/admin` que lo usan.
- Test: `tests/e2e/panel-tanda5.spec.ts`

- [ ] **Step 1: Prueba pura que falla:** recorrer `.ts`/`.tsx` de esas carpetas, quitar comentarios (`//…` y `/* … */`) y esperar cero «·».
- [ ] **Step 2:** Verla fallar (unas 70 apariciones).
- [ ] **Step 3:** Reemplazar caso por caso: comas entre datos; «para» entre propuesta y cliente; los separadores decorativos se quitan y el espacio lo da `gap`. En Usuarios, el subtítulo queda «Cuentas, roles y permisos: N usuarios» sin doble espacio.
- [ ] **Step 4:** Pasa. Commit `fix(panel): sin «·» entre datos`.

### Task 7: Fichas a filas y severidades sin íconos

**Files:**
- Modify: `src/app/admin/clientes/client.tsx`, `src/app/admin/cotizaciones/components/ClientCard.tsx` (y la vista que elige grilla o lista), `src/modules/finance/components/{CurrencyConverter,ImportExport,AIAnalysis}.tsx`, `src/modules/finance/components/estilos.ts`, `src/app/admin/profile/client.tsx` (Contraseña y verificación), `src/app/admin/security/client.tsx` (severidades)
- Test: `tests/e2e/panel-tanda5.spec.ts`

**Interfaces:**
- Produces: `BLOQUE` en `estilos.ts` = sección con una línea arriba y aire, sin fondo ni borde a los lados.

- [ ] **Step 1: Prueba que falla:** función `fichas()` en la página que cuenta `div, section, article, li` de más de 200 × 80 px con borde en los cuatro lados, radio > 0 y fondo distinto de transparente, fuera de `table, figure, dialog, [role=dialog], [popover], form`. Debe dar 0 en `/admin/clientes`, `/admin/cotizaciones`, `/admin/finance/settings`, `/admin/finance/ai` y `/admin/profile`. En `/admin/security`, los botones de la sección «Por severidad» no tienen `svg`. A 390 px, `/admin/clientes` y `/admin/cotizaciones` sin desplazamiento lateral.
- [ ] **Step 2:** Verla fallar.
- [ ] **Step 3:** Clientes y Propuestas como `LISTA`/`FILA` (nombre, datos en gris, acciones a la derecha; en celular las acciones bajan). Configuración, Asistente, Contraseña y verificación como `BLOQUE`. Severidades sin íconos.
- [ ] **Step 4:** Pasa, y siguen pasando `panel-etapa1`, `panel-tanda4`, `panel-perfil` y `detalles-panel`. Commit `fix(panel): fichas a filas en Clientes, Propuestas, Finanzas y Mi perfil; severidades sin íconos`.

### Task 8: Finanzas vacía sin asistente de bienvenida

**Files:**
- Modify: `src/modules/finance/components/FinanceDashboardClean.tsx`, `src/modules/finance/components/FinanceOnboarding.tsx` (o borrar si queda sin uso, y su export en `index.ts`)
- Test: `tests/e2e/panel-tanda5.spec.ts`

- [ ] **Step 1: Prueba que falla:** en `/admin/finance` sin cuentas, se ve el enlace «Crea tu primera cuenta» y no aparece «Bienvenido».
- [ ] **Step 2:** Verla fallar.
- [ ] **Step 3:** Estado vacío con `VACIO`: una frase de qué se hace en Finanzas y el enlace a `/admin/finance/accounts` con «Crea tu primera cuenta».
- [ ] **Step 4:** Pasa. Commit `fix(finanzas): estado vacío en vez del asistente de bienvenida`.

### Task 9: Verificar, desplegar y dejar registro

- [ ] tsc en la jaula; compilar en la jaula; `prod-local.sh` con la base de prueba; correr `viva-*`, `herramientas-ronda2`, `pendientes`, `panel-etapa1`, `panel-tanda4`, `panel-tanda5`, `panel-perfil`, `detalles-panel`.
- [ ] Capturas en claro, oscuro y 390 px de la barra (arriba y recogida), las migas y las secciones tocadas del panel; revisarlas.
- [ ] Desplegar (`construir-imagen.sh` y `desplegar.sh`), probar en producción las páginas públicas (sin panel), `git push origin ui/portada ui/portada:main`.
- [ ] Actualizar la memoria (`portafolio_vm_local.md` con la versión en producción).
