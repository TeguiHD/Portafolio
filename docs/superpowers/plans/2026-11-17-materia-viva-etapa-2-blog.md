# «Materia viva», etapa 2: Blog — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (el dueño eligió ejecución nativa: «hazlo todo»). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** rehacer `/blog` con el lenguaje de la portada, según la maqueta aprobada el 17-11
(`.superpowers/brainstorm/maqueta/salida/blog-pagina.html`), más la cápsula del clima rediseñada.

**Architecture:** la cabecera reutiliza el tambor de la portada (`BlogTambor`) en modo página. Debajo van tres secciones nuevas, cada una con su forma de materia:
- Índice (`texto`).
- GitHub (`figuras`, con la marca dibujada).
- Radar (`anillo`).

La cápsula del clima se conserva en su lógica y cambia su presentación. Mientras está abierta, el motor pasa a una forma nueva, `clima`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS por módulo (sin Tailwind nuevo), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-17-materia-viva-design.md` (etapa 2), maqueta aprobada y pedido del dueño:
«si me gusta, aunque bueno me falta el modal creativo del clima».

## Global Constraints

- Sin rótulos en mayúsculas, sin cajas de aviso con borde lateral, sin tarjetas ni todo-en-píldoras; poco texto.
- Nada inventado: solo datos de `/api/pulse/*` y de los servicios `get*Cached`.
- Se conservan las funciones en producción: búsqueda, temas, orden (lo último / relevancia), ficha de lectura con «Leer en …», mercado a fondo («Ver el mercado»), campana de avisos, cápsula (ciudad, ubicación, pronóstico de 3 días), noticias en el HTML sin JavaScript.
- Tema claro y oscuro (se quita `soloOscuro` de `/blog`).
- Patrones de la plataforma (modern-web-guidance): `<dialog>` + `showModal()` para la ficha.
- El motor no lee diseño dentro del cuadro. Las nuevas formas no rompen el reposo (dejar de pintar) ni `prefers-reduced-motion`.
- Fuera de alcance: el interior del modal del mercado y el diálogo de avisos conservan su estilo actual (tokens `--p-*`).
- Compilar y probar según la memoria del PC:
  - `next build` enjaulado.
  - Pruebas contra `.next/standalone` con Redis de prueba.
  - Nunca `next dev`.

## Review Focus

1. Sin JavaScript, `/blog` debe mostrar los titulares (filas) y los enlaces a sus fuentes → prueba en Tarea 4.
2. Una búsqueda sin resultados muestra un mensaje y una forma de volver (quitar filtros) → Tarea 4.
3. Con la cápsula abierta y el visitante desplazándose, el clima sigue mandando sobre la forma de la sección. Al cerrar, vuelve la de la sección → Tarea 1.
4. En celular (390 px) nada desborda: temas con desplazamiento horizontal, filas apiladas → Tarea 4.
5. Si GitHub o el mercado no responden, la página igual se dibuja (sección omitida o con su aviso) → Tarea 5.

---

### Task 1: forma `clima` en el motor

**Files:** Modify `src/modules/materia/motor.ts`, `src/modules/materia/Materia.tsx` (tipo exportado). Test: `tests/e2e/viva-materia.spec.ts`.

**Interfaces — Produces:**
- `export type Clima = "lluvia" | "nieve" | "sol" | "noche" | "nubes"` en `motor.ts`.
- `Motor.clima(tipo: Clima | null): void`. Con un tipo, manda sobre la forma pedida: `data-forma-activa="clima"` y `data-clima=<tipo>` en el lienzo. Con `null`, vuelve a la forma de la sección, con su sacudida.

Comportamiento por tipo:

| Tipo | Partículas | Destino | Duerme |
|---|---|---|---|
| `lluvia` | caen con gravedad (vy += 0,32) y viento leve; al salir por abajo reaparecen arriba en una x al azar | libre (sin destino) | no |
| `nieve` | bajan lento (0,03) con vaivén | libre | no |
| `sol` | suben lento con vaivén, en el color de acento | libre | no |
| `noche` | fijas en posiciones sembradas por `sem`, titilan (radio) | fijo | no |
| `nubes` | tres bandas horizontales que derivan a la derecha y dan la vuelta | móvil | no |

Con «menos movimiento», un solo cuadro con las posiciones sembradas.

- [ ] Prueba «el clima manda mientras está puesto y al quitarlo vuelve la forma de la sección». En `/`, `#firma` al centro:
  - `window.__materia.clima("lluvia")` → `data-forma-activa="clima"`, `data-clima="lluvia"`.
  - Desplazar a `#contacto` → sigue `clima`.
  - `clima(null)` → `anillo`.
  - Para eso, `Materia.tsx` expone el motor en `window.__materia` solo cuando `process.env.NODE_ENV !== "production"` o con `?materia=prueba`. Elegido: siempre como `window.__materia`: no es un secreto y simplifica las pruebas contra la compilación.
- [ ] Verla fallar (la compilación actual no tiene `clima`).
- [ ] Implementar. Rama `libre` en el bucle de `pintar`: física propia y sin destino; `continue` después de pintar. `QUIETAS` no incluye `clima`.
- [ ] Prueba «con menos movimiento el clima se pinta una vez»: `clearRect` ≤ 2 en 1,2 s tras `clima("noche")` con `reducedMotion: "reduce"`.

### Task 2: cápsula del clima rediseñada

**Files:** Modify `src/modules/pulse/blog/Capsula.tsx`; Create `src/modules/pulse/blog/capsula.css`; Test: `tests/e2e/blog.spec.ts`.

**Interfaces — Consumes:** `useMateria()`, `Motor.clima`, `figuraDelCielo(codigo, dia)` de `IconoTiempo.tsx`.
**Produces:** `export function climaDe(codigo: number, dia: boolean): Clima` en `Capsula.tsx`:
- tormenta, chubasco, lluvia, llovizna → `lluvia`
- nieve → `nieve`
- niebla, nube → `nubes`
- sol, sol-nube → `sol`
- luna, luna-nube → `noche`

Presentación (clases `cp-`), sin celdas:
- La píldora `.cp-pildora` conserva el mismo nombre accesible.
- El panel `.cp-panel` sigue siendo `role="dialog"` con `aria-label="Tiempo y hora"`, anclado bajo la píldora; en celular ocupa el ancho.
- Contenido del panel:
  - Lugar y estado.
  - Grados en grande (`.cp-grados`, ~96 px, peso fino) con el ícono grande.
  - Arco del sol: SVG semicírculo, extremos «Amanece hh:mm» / «Oscurece hh:mm». Punto en la posición de ahora, o en el extremo con la luna si ya oscureció.
  - Una línea «Viento N km/h · Máx N° · Mín N°».
  - Tres días en filas (día, ícono, estado, máx/mín).
  - Formulario de ciudad con subrayado.
  - Aviso de privacidad.

Al abrir: `motor.clima(climaDe(...))`; al cerrar o desmontar: `motor.clima(null)`.

- [ ] Actualizar la prueba de la cápsula. Se mantiene lo de hoy (dialog «Tiempo y hora», «Viento», «Amanece», campo «Ciudad», Escape devuelve el foco) y se suma:
  - con el panel abierto, `canvas#materia` tiene `data-forma-activa="clima"`;
  - tras Escape, ya no.
- [ ] Implementar y verla pasar.

### Task 3: cabecera de la página con el tambor

**Files:** Modify `src/modules/landing/viva/BlogTambor.tsx`, `src/modules/landing/viva/Blog.tsx`, `src/modules/landing/viva/blog.css`.

**Interfaces — Produces:**
- `BlogTambor({ titulares, ahora, pagina?: boolean, acciones?: ReactNode, extra?: ReactNode })`. Con `pagina`:
  - `<h1 id="bg-titulo">Blog<i>.</i></h1>`;
  - `acciones` reemplaza la campana-enlace y «Abrir el blog»;
  - `extra` va al final de la línea `bg-ahora`.
- `export async function cargarTitulares(): Promise<Titular[]>` (sin cambios de lógica).
- `cargarAhora(completo = false)`: con `completo`, devuelve UF, Dólar, UTM, Bitcoin y Ethereum.
- `export async function CabeceraBlog({ acciones, extra }: { acciones: ReactNode; extra?: ReactNode })`, en `Blog.tsx`.

- [ ] La portada no cambia: `viva-blog.spec.ts` y `viva-portada.spec.ts` siguen verdes.

### Task 4: índice «Todo lo de hoy» con ficha de lectura

**Files:** Create `src/modules/pulse/blog/Indice.tsx`, `src/modules/pulse/blog/pagina.css`; Delete `src/modules/pulse/blog/Noticias.tsx`; Test: `tests/e2e/blog.spec.ts`.

**Interfaces:**
- `Indice({ inicial }: { inicial: PulseNewsItem[] })` (cliente).
- `<section id="indice" data-forma="texto" data-ancla="#ancla-texto">`. Al cambiar de tema llama `motor.escribir(palabra)`: «hoy» con «Todo»; si no, el nombre del tema en minúsculas.
- Temas como botones `aria-pressed`, con su número en `<small>`.
- Buscador `type="search"` con `aria-label="Buscar en las noticias"`.
- Orden: dos botones de texto «Lo último» / «Relevancia», `aria-pressed`.
- Lista `ol.bp-lista` de `li.bp-fila`. Cada fila es `<h3><button>titular</button></h3>` más hora y fuente; el botón abre la ficha.
- Al pie, «Ver más titulares» (+12).
- Vacío: `p.bp-vacio` y botón «Quitar filtros».
- Ficha: `<dialog class="bp-ficha" closedby="any">` con `showModal()`. Contiene `h2` con el titular, el resumen, la nota del medio y `a` «Leer en {dominio}». Escape cierra y el foco vuelve al botón de la fila.
- Sin JavaScript: el HTML del servidor trae las 12 primeras filas. Dentro de un `<noscript>` va el enlace a la fuente de cada fila.

Pruebas (reemplazan las de tarjetas y paginado):
- [ ] «el blog llega con los titulares ya escritos, incluso sin JavaScript»: un `h1`; `.bp-fila` = 12; primer `h3` no vacío.
- [ ] «temas, búsqueda y ver más recorren los titulares sin recargar»:
  - «Ver más titulares» lleva las filas a 24;
  - «Seguridad» queda `aria-pressed=true`;
  - buscar «zzzzzzz» → `.bp-vacio` visible;
  - «Quitar filtros» → vuelven filas.
- [ ] «la ficha de lectura abre, enlaza a la fuente y se cierra con Escape»: `dialog.bp-ficha` abierto, `h2` = titular, enlace `/Leer en/` con `target=_blank`; Escape → cerrada, foco en un `.bp-fila button`.
- [ ] «a 390 px el blog no desborda»: `scrollWidth <= innerWidth`; las filas tienen el mismo ancho.

### Task 5: GitHub y Radar; página armada

**Files:** Create `src/modules/pulse/blog/EnGitHub.tsx` (servidor) y `src/modules/pulse/blog/FiguraGitHub.tsx` (cliente), `src/modules/pulse/blog/Radar.tsx` (servidor); Rewrite `src/app/blog/page.tsx`; Modify `src/modules/pulse/blog/blog.css` (quitar cabecera, barra, rejilla, tarjetas, paginado, lado y lector; queda cielo, campana, mercado, avisos); Delete `src/modules/pulse/blog/Paneles.tsx`.

**Interfaces:**
- `EnGitHub()`:
  - hasta 3 `featuredRepos`: nombre, lenguaje y «actualizado el d mmm»;
  - enlace «Ver mi GitHub ↗»;
  - sin seguidores ni estrellas;
  - si el servicio falla, devuelve `null`.
- `FiguraGitHub()`: con `useSeccionActiva("github")`, llama `motor.figuraDesdeTrazo(RUTA_GITHUB, null)` al pasar a activa.
- `Radar()`: `buildInsights` como hoy, presentado en filas (sujeto, postura en mono con su color, título, detalle) más el aviso de «no es una recomendación»; sin ideas devuelve `null`.
- `page.tsx`:
  - `Esqueleto` sin `soloOscuro`;
  - `CabeceraBlog`: `acciones` = `Capsula` + `PulseNotificationToggle` + enlace «Todo lo de hoy ↓»; `extra` = `<Mercado />`;
  - `Suspense` para el índice (con un respaldo de 6 filas grises);
  - `EnGitHub`, `Radar`.
- Metadatos sin «Pulso digital»:
  - title «Blog»;
  - description «Seguridad, IA y desarrollo de fuentes oficiales, con el mercado y lo que estoy construyendo.»

- [ ] Prueba «GitHub y Radar se dibujan aunque una fuente falle»: `h2` «En lo que trabajo» o su ausencia sin error de consola; `h2` «Radar» visible si hay ideas.
- [ ] `seo-headings`, `seo-crawl`, `viva-esqueleto` y `viva-pie` siguen verdes.

### Task 6: compilar, medir, revisar y desplegar

- [ ] `next build` enjaulado.
- [ ] Batería completa: `prod-local.sh probar viva- seo- security-headers tools-return-visits blog`.
- [ ] Capturas a 1440 y 390, en oscuro y claro, con la cápsula abierta. Consola limpia.
- [ ] Rendimiento en celular emulado: el índice y el radar sin regresión frente a la portada.
- [ ] Revisión independiente del cambio. Un pase de arreglos.
- [ ] Desplegar (`construir-imagen.sh` + `desplegar.sh`) y verificar en vivo.
