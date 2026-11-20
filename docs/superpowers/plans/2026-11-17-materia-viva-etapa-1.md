# Materia viva, etapa 1: cimientos y portada — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Llevar al sitio real el esqueleto común (temas, motor de partículas, barra y pie) en todas las páginas públicas, y la portada completa de la maqueta aprobada, con el formulario de contacto mejorado.

**Architecture:** Un motor de partículas sin dependencias (`src/modules/materia/`) vive en un lienzo fijo montado por un `Esqueleto` común; cada sección declara su forma con `data-forma`. La portada se rehace en `src/modules/landing/viva/` con datos del propio código (casos, registro de herramientas, noticias del blog). Las páginas interiores reciben solo el esqueleto en esta etapa.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, CSS propio por módulo, Playwright para las pruebas (`tests/e2e`). No hay pruebas unitarias en el proyecto: el ciclo de prueba de cada tarea es un spec de Playwright.

**Spec:** `docs/superpowers/specs/2026-11-17-materia-viva-design.md`. La maqueta aprobada es la referencia de aspecto y movimiento: `.superpowers/brainstorm/maqueta/` (`base.html`, `partes/*.html`, `fuentes/`). Para verla: `cd .superpowers/brainstorm/maqueta && python3 armar.py local` y abrir `salida/prueba.html`. Cada tarea de interfaz porta la pieza que se nombra, con sus mismos valores (tamaños, curvas, tiempos, textos).

## Global Constraints

- Directorio de trabajo: `APP/NEXT_APP`. Comandos: `pnpm run typecheck`, `pnpm run lint` (cero avisos), `pnpm exec playwright test <spec>`.
- **Se trabaja sobre el árbol actual del dueño** (rama `ui/portada` con unos 74 archivos modificados sin commit que SON producción). No descartar, no hacer `git stash`, `git checkout --` ni `git clean`. Solo tocar los archivos que nombra cada tarea.
- **Commits solo cuando el dueño lo pida.** Cada tarea termina en un punto de control: se le muestra el resultado y, si lo autoriza, se usa el comando de commit indicado (solo los archivos de la tarea).
- Sin dependencias nuevas. La CSP usa nonce y `strict-dynamic`: ningún script en línea sin el nonce de la petición.
- Textos en español de Chile, sin frases de venta. Casi sin texto: un título y a lo más una línea por sección. Sin rótulos en mayúsculas, sin cajas de aviso con borde lateral, sin píldoras para todo, sin tarjetas genéricas. Íconos SVG.
- Nada inventado: datos del código o del sitio. Herramientas: `TOOL_COUNT` (29). Correo: `contacto@nicoholas.dev`.
- Solo se anima `transform`/`opacity` (y propiedades individuales `translate`/`scale`/`rotate`). **Nada que se escale lleva `box-shadow`**: el brillo va con degradados.
- Patrones de la plataforma antes que JavaScript (guía en `.superpowers/brainstorm/maqueta/guias-web/INDICE.md`), siempre con respaldo.
- Tema oscuro por defecto y tema claro, ambos con contraste AA. `prefers-reduced-motion` deja todo legible y sin bucles.
- Responde en 390, 821 y 1440 px sin desborde horizontal.
- Se conservan metadatos, datos estructurados, `llms.txt` y `NoScriptLanding`.
- El repositorio es público: ni secretos ni archivos sueltos en la raíz.

## Review Focus

1. **El equipo va lento o no tiene tarjeta gráfica:** el motor debe bajar partículas solo y la página debe seguir usable. Prueba en la tarea 2.
2. **El visitante pide menos movimiento:** nada se mueve en bucle, y la captura del proyecto, el titular y la firma se ven igual. Pruebas en las tareas 2, 7 y 9.
3. **Una imagen no carga o el lienzo no puede leerla:** la captura de Proyectos igual aparece nítida y no queda el marco vacío. Prueba en la tarea 7.
4. **El blog no tiene titulares (API caída o sin fotos):** la sección muestra su estado sin datos y la página no se rompe. Prueba en la tarea 9.
5. **El formulario de contacto falla, se envía dos veces o lo rechaza el límite de 3 mensajes por hora:** el visitante ve qué pasó y no pierde lo que escribió. Prueba en la tarea 10.

---

### Task 1: Variables de diseño y temas

**Files:**
- Modify: `src/app/tokens.css`, `src/app/layout.tsx`
- Create: `src/modules/esqueleto/tema.ts`, `src/modules/esqueleto/TemaInicial.tsx`
- Test: `tests/e2e/viva-tema.spec.ts`

**Interfaces:**
- Produces: variables CSS en `:root` y `:root[data-tema="claro"]` con los nombres y valores de `base.html` (`--fondo`, `--fondo-2`, `--sup`, `--linea`, `--linea-2`, `--txt`, `--mut`, `--acento`, `--acento-tinta`, `--cerca`, `--particula`, `--particula-acento`, `--sube`, `--baja`, `--error`, `--boton`, `--boton-tinta`, `--curva`, `--mono`); `cambiarTema(evento?: MouseEvent): void` y `temaActual(): "oscuro" | "claro"` en `tema.ts`; clave de `localStorage` `"tema"`.

- [ ] **Step 1: Escribir la prueba**

```ts
test("oscuro por defecto, y la elección se recuerda", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-tema", "oscuro");
  await page.evaluate(() => localStorage.setItem("tema", "claro"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-tema", "claro"); // aplicado antes de pintar
});
test("el botón principal cumple AA en los dos temas", async ({ page }) => {
  for (const tema of ["oscuro", "claro"]) { /* fija data-tema, lee --boton y --boton-tinta y espera contraste >= 4.5 */ }
});
```

- [ ] **Step 2:** `pnpm exec playwright test viva-tema` → FALLA (no existe `data-tema`).
- [ ] **Step 3:** Agregar las variables a `tokens.css` sin borrar las existentes (`--marca`, `--p-*` siguen en uso por el panel). `TemaInicial` es un componente de servidor que emite un `<script nonce>` en el `<head>` y fija `data-tema` desde `localStorage` antes del primer pintado; el nonce se obtiene igual que lo hace hoy `layout.tsx` para sus scripts. `cambiarTema` usa View Transitions con revelado circular desde el punto del clic y cae a cambio directo sin la API o con menos movimiento.
- [ ] **Step 4:** La prueba pasa; `pnpm run typecheck && pnpm run lint`.
- [ ] **Step 5: Punto de control.** Si el dueño autoriza: `git add src/app/tokens.css src/app/layout.tsx src/modules/esqueleto/tema.ts src/modules/esqueleto/TemaInicial.tsx tests/e2e/viva-tema.spec.ts && git commit -m "feat(diseño): variables de Materia viva y tema claro"`.

### Task 2: Motor de partículas

**Files:**
- Create: `src/modules/materia/motor.ts`, `src/modules/materia/figuras.ts`, `src/modules/materia/Materia.tsx`, `src/modules/materia/materia.css`
- Test: `tests/e2e/viva-materia.spec.ts`

**Interfaces:**
- Produces:

```ts
export type Forma = "figuras" | "texto" | "imagen" | "olas" | "marco" | "anillo" | "firma";
export interface Motor {
  forma(f: Forma, ancla?: HTMLElement | null): void;
  figura(indice: 0 | 1 | 2): void;                       // ventana, panel, QR
  figuraDesdeTrazo(d: string, tinta?: string): void;      // logo SVG de 24×24; tinta "r g b"
  escribir(texto: string): void;
  imagen(fuente: HTMLImageElement | HTMLCanvasElement): boolean; // false si no se pudo leer
  cubrir(v: boolean): void;
  sacudir(fuerza: number): void;
  medir(): void;
  pausar(v: boolean): void;
  destruir(): void;
}
export function crearMotor(lienzo: HTMLCanvasElement, op: { frente: HTMLElement; quieto: boolean }): Motor;
// Materia.tsx (cliente): <Materia>{children}</Materia> monta <canvas id="materia"> y <div class="frente">, y expone
export function useMateria(): Motor | null;
```

- Contrato con las secciones: `<section data-forma="…" data-ancla="#id-opcional">`. `Materia` elige la sección más cercana al centro de la pantalla (una vez por cuadro de scroll), llama a `motor.forma` y escribe `data-forma-activa` en el lienzo. También mantiene `--avance` (0 a 1) en `:root`, redondeado a 3 decimales y solo cuando cambia más de 0,004.

- [ ] **Step 1: Escribir la prueba**

```ts
test("la materia sigue a la sección", async ({ page }) => {
  await page.goto("/");
  const lienzo = page.locator("canvas#materia");
  await expect(lienzo).toHaveAttribute("data-forma-activa", "figuras");
  await page.locator("#firma").scrollIntoViewIfNeeded();
  await expect(lienzo).toHaveAttribute("data-forma-activa", "firma");
});
test("con menos movimiento no hay bucle", async ({ browser }) => {
  const page = await (await browser.newContext({ reducedMotion: "reduce" })).newPage();
  await page.goto("/");
  await expect(page.locator("canvas#materia")).toHaveAttribute("data-quieto", "true");
});
test("el bucle no lee el diseño ni se atrasa con el cursor rápido", async ({ page }) => {
  // CPU ×4 por CDP; envuelve requestAnimationFrame antes de cargar; mueve el cursor 4 s sobre el hero.
  // Espera: mediana del tiempo de script por cuadro < 6 ms.
});
test("si los cuadros se atrasan, baja las partículas", async ({ page }) => {
  // CPU ×20; tras 3 s, Number(lienzo.dataset.activas) < Number(lienzo.dataset.total)
});
```

- [ ] **Step 2:** `pnpm exec playwright test viva-materia` → FALLA.
- [ ] **Step 3:** Portar el motor desde `base.html` (funciones `preparar`, `medir`, `imagen`, `fondoProfundo`, `frente`, `cuadro`, `figura`, `muestrear`). Reglas que no se negocian: las anclas se miden en `medir()` (al desplazar, al cambiar de tamaño y cada 600 ms), **nunca dentro de `cuadro`**; se dibuja con `fillRect` y solo las partículas tocadas con arco; `devicePixelRatio` tope 1,5; 4.600 partículas en escritorio y 1.800 bajo 820 px; si más de la mitad de 90 cuadros pasan de 24 ms, `activas` baja 20 % (mínimo 1.400); `document.hidden` detiene el trabajo. El lienzo publica `data-total` y `data-activas`.
- [ ] **Step 4:** Las cuatro pruebas pasan; typecheck y lint limpios.
- [ ] **Step 5: Punto de control** (`git add src/modules/materia tests/e2e/viva-materia.spec.ts`, mensaje `feat(materia): motor de partículas sin dependencias`).

### Task 3: Barra de navegación

**Files:**
- Create: `src/modules/esqueleto/Barra.tsx`, `src/modules/esqueleto/barra.css`
- Test: `tests/e2e/viva-barra.spec.ts`

**Interfaces:**
- Consumes: `cambiarTema` (tarea 1), `--avance` (tarea 2).
- Produces: `export function Barra(props: { enlaces?: { href: string; texto: string }[] }): JSX.Element`. Por defecto: Proyectos `/#proyectos`, Herramientas `/herramientas`, Blog `/blog`; en la portada los dos últimos apuntan a `#herramientas` y `#blog`. Clases de estado en `header#nb`: `nb-baja` (scroll > 60), `nb-oculta` (bajando con scroll > 500; se quita al subir, con el cursor encima o con el foco dentro).

- [ ] **Step 1: Escribir la prueba**

```ts
test("se recoge, se esconde y vuelve", async ({ page }) => {
  await page.goto("/"); const nb = page.locator("#nb");
  await expect(nb).not.toHaveClass(/nb-baja/);
  await page.mouse.wheel(0, 400); await expect(nb).toHaveClass(/nb-baja/);
  await page.mouse.wheel(0, 1600); await expect(nb).toHaveClass(/nb-oculta/);
  await page.mouse.wheel(0, -200); await expect(nb).not.toHaveClass(/nb-oculta/);
});
test("marca la sección actual y cambia el tema", async ({ page }) => { /* aria-current="true" en el enlace de #proyectos al llegar; clic en #nb-tema cambia data-tema */ });
for (const ancho of [390, 821, 1440]) test(`cabe en ${ancho}`, async ({ page }) => { /* scrollWidth <= innerWidth; en 390 los enlaces están en la cápsula inferior y son visibles */ });
```

- [ ] **Step 2:** FALLA.
- [ ] **Step 3:** Portar `fuentes/navbar.html` tal cual (estilos con prefijo `nb-`). La pastilla se mide solo al cambiar de enlace. En celular la barra no lleva `translate` ni `backdrop-filter` (si no, los enlaces de abajo dejan de estar fijos a la pantalla). El cierre de la animación de entrada pone `animation: none`.
- [ ] **Step 4:** Pasa; typecheck y lint.
- [ ] **Step 5: Punto de control** (`feat(esqueleto): barra fluida`).

### Task 4: Pie

**Files:**
- Create: `src/modules/esqueleto/Pie.tsx`, `src/modules/esqueleto/pie.css`
- Test: `tests/e2e/viva-pie.spec.ts`

**Interfaces:**
- Consumes: `--avance`, `useMateria().sacudir`.
- Produces: `export function Pie(): JSX.Element` con enlaces reales: `/#proyectos`, `/herramientas`, `/blog`, `/sobre-mi`, `/cotizacion` («Portal de clientes»), `/privacidad`, `/terminos`.

- [ ] **Step 1: Prueba:** el reloj `#hora` cumple `/^\d{2}:\d{2}$/` y corresponde a `America/Santiago`; `#sl-momento` dice «de día» entre 6:00 y 18:00 y «de noche» fuera (fijar la hora con `page.clock`); cada enlace responde 200; `.sl-subir` lleva a `scrollY === 0`.
- [ ] **Step 2:** FALLA.
- [ ] **Step 3:** Portar el pie de `base.html` (`footer.suelo`, estilos `sl-` y `.suelo`). El suelo en perspectiva no se anima con menos movimiento.
- [ ] **Step 4:** Pasa.
- [ ] **Step 5: Punto de control** (`feat(esqueleto): pie con suelo en perspectiva`).

### Task 5: El esqueleto en todas las páginas públicas

**Files:**
- Create: `src/modules/esqueleto/Esqueleto.tsx`, `src/modules/esqueleto/esqueleto.css` (fondo, `.fantasma`, `.frente`, `@keyframes plano`/`deriva`, `.boton`, `.enlace-ir`, `.vivo`, revelado `data-vista`/`data-sube`)
- Modify: `src/app/page.tsx`, `src/app/blog/page.tsx`, `src/app/privacidad/page.tsx`, `src/app/terminos/page.tsx`, `src/app/sobre-mi/page.tsx`, `src/app/ar/page.tsx`, `src/app/herramientas/layout.tsx`
- Test: `tests/e2e/viva-esqueleto.spec.ts`

**Interfaces:**
- Produces: `export function Esqueleto(props: { children: React.ReactNode; enlaces?: … }): JSX.Element` = `<Materia>` + `<Barra>` + `<main id="contenido" tabIndex={-1}>` + `<Pie>`.

- [ ] **Step 1: Prueba:** para `/`, `/blog`, `/herramientas`, `/herramientas/qr`, `/sobre-mi`, `/ar`, `/privacidad`, `/terminos`: existen `#nb`, `footer.suelo` y `canvas#materia`; no existe la barra anterior (`<Navbar>` de `modules/landing/layout`); sin errores de consola; sin desborde en 390 y 1440; el enlace «saltar al contenido» lleva a `#contenido`.
- [ ] **Step 2:** FALLA.
- [ ] **Step 3:** Reemplazar en esas páginas `Navbar` y `FooterSection` por `Esqueleto`. En las páginas interiores las secciones no declaran `data-forma`: la materia queda en `olas`. No se toca todavía el contenido interior de esas páginas. `/cotizacion`, `/acceso` y `/cambiar-clave` hoy no llevan barra ni pie (son pantallas de acceso): en esta etapa no cambian; su rediseño es la etapa 5.
- [ ] **Step 4:** Pasa; además `pnpm exec playwright test seo- security-headers` sigue en verde.
- [ ] **Step 5: Punto de control** (`feat(esqueleto): barra, pie y fondo comunes en las páginas públicas`).

### Task 6: Hero

**Files:**
- Create: `src/modules/landing/viva/Hero.tsx`, `src/modules/landing/viva/hero.css`
- Test: `tests/e2e/viva-hero.spec.ts`

**Interfaces:**
- Consumes: `useMateria()`; `tecnologias` de `src/modules/landing/portada/datos/tecnologias.ts`.
- Produces: `<section id="inicio" data-forma="figuras" data-ancla="#ancla-marca">`.

- [ ] **Step 1: Prueba:** el `h1` dice «Desarrollo soluciones.»; hay tres pestañas («Tiendas y sitios», «Sistemas internos», «Herramientas») y al hacer clic en la tercera queda `aria-selected="true"` y no cambia sola durante 5 s; hay 10 fichas en `.marcas`, cada una con `aria-label` igual al nombre de la tecnología; al pasar por una, queda con clase `activa`; ninguna ficha tiene `box-shadow` calculado con desenfoque mayor a 0 mientras está en `:hover`.
- [ ] **Step 2:** FALLA.
- [ ] **Step 3:** Portar el hero de `base.html` (sección `#inicio`, `.elige`, `.marcas`, y el JS de `elegir`, `logos` y la rotación de 4,2 s con pausa de 14 s tras un clic y de 5,2 s tras pasar por un logo).
- [ ] **Step 4:** Pasa.
- [ ] **Step 5: Punto de control** (`feat(portada): hero con selector y tecnologías`).

### Task 7: Proyectos

**Files:**
- Create: `src/modules/landing/viva/Proyectos.tsx`, `src/modules/landing/viva/proyectos.css`, `public/images/projects/viva/` (las 12 capturas `py-*.jpg` de `.superpowers/brainstorm/maqueta/img/`)
- Modify: `src/modules/landing/portada/datos/casos.ts` (agregar a cada caso `vistas: { nombre: string; escritorio: string; celular: string }[]`; el de la OTEC queda con `vistas: []` y `esquema: true`)
- Test: `tests/e2e/viva-proyectos.spec.ts`

**Interfaces:**
- Consumes: `useMateria().imagen`, `.cubrir`, `.medir`; `casos`.
- Produces: `<section id="proyectos" data-forma="imagen" data-ancla="#ancla-imagen">`; `#pr-escena` recibe la clase `pr-lista` cuando la captura nítida es visible.

- [ ] **Step 1: Escribir la prueba**

```ts
test("la captura se arma cuando el marco se ve, y se repite al volver", async ({ page }) => {
  await page.goto("/"); const escena = page.locator("#pr-escena");
  await escena.scrollIntoViewIfNeeded();
  await expect(escena).not.toHaveClass(/pr-lista/);          // primero la materia
  await expect(escena).toHaveClass(/pr-lista/, { timeout: 4000 });
  await page.locator("#blog").scrollIntoViewIfNeeded(); await expect(escena).not.toHaveClass(/pr-lista/);
  await escena.scrollIntoViewIfNeeded(); await expect(escena).toHaveClass(/pr-lista/, { timeout: 4000 });
});
test("si la imagen falla, igual se muestra el marco con su texto alternativo", async ({ page }) => {
  await page.route("**/images/projects/viva/**", r => r.abort()); /* no queda esperando: pr-lista en < 3 s y sin errores sin capturar */
});
test("el proyecto privado muestra su esquema", async ({ page }) => { /* clic en «Intranet OTEC»: el alt de #pr-foto empieza con «Esquema del alcance» y no hay celular */ });
test("con menos movimiento la captura aparece de inmediato", async ({ browser }) => { /* reducedMotion: pr-lista en < 600 ms */ });
```

- [ ] **Step 2:** FALLA.
- [ ] **Step 3:** Portar `partes/proyectos.html`. La secuencia: la imagen nítida solo aparece si la sección es la activa **y** el marco está al menos 60 % a la vista; 1.350 ms después de `imagen()`; `cubrir(true)` 950 ms después de mostrarla; al bajar de 15 % de visibilidad se oculta y `cubrir(false)`. Mantener apretada la captura la deshace. Los textos salen de `casos.ts`; el esquema se dibuja en un lienzo como en la maqueta.
- [ ] **Step 4:** Pasa.
- [ ] **Step 5: Punto de control** (`feat(portada): proyectos armados por la materia`).

### Task 8: Herramientas

**Files:**
- Create: `src/modules/landing/viva/Herramientas.tsx`, `src/modules/landing/viva/herramientas.css`, `src/modules/landing/viva/siglas.ts`
- Test: `tests/e2e/viva-herramientas.spec.ts`

**Interfaces:**
- Consumes: `getDefaultPublicToolCatalog()` de `src/lib/tool-registry.ts`, los íconos de `ToolIcons`, `useMateria().escribir`.
- Produces: `<section id="herramientas" data-forma="texto" data-ancla="#ancla-texto">`; `export const SIGLAS: Record<string, string>` (slug → lo que escribe la materia; copiar los 29 valores `g` del arreglo `T` de `partes/herramientas.html`); `export const COLOR_CATEGORIA` con los seis colores de la maqueta.

- [ ] **Step 1: Prueba:** hay `TOOL_COUNT` botones `.he-nodo`, cada uno con `aria-label` igual al nombre real; al enfocar uno con teclado, `#he-nombre` muestra ese nombre y `#he-abrir` apunta a `/herramientas/<slug>`; al filtrar por «Seguridad» quedan 4 sin la clase `he-fuera`; ningún `.he-nodo` tiene `box-shadow`.
- [ ] **Step 2:** FALLA.
- [ ] **Step 3:** Portar `fuentes/herramientas.plantilla.html` (tres órbitas de 8, 10 y 11; el bucle solo corre con la sección a la vista; arrastrar gira).
- [ ] **Step 4:** Pasa.
- [ ] **Step 5: Punto de control** (`feat(portada): herramientas en órbita`).

### Task 9: Blog

**Files:**
- Create: `src/modules/landing/viva/Blog.tsx` (servidor), `src/modules/landing/viva/BlogTambor.tsx` (cliente), `src/modules/landing/viva/blog.css`
- Test: `tests/e2e/viva-blog.spec.ts`

**Interfaces:**
- Consumes: `getPulseNewsCached()` de `src/modules/pulse/lib/news-service.ts`.
- Produces: `<section id="blog" data-forma="olas">`. `Blog` elige hasta 6 titulares con `imageUrl` real (empieza con `https://`, no es el relleno `/api/pulse/placeholder` ni un avatar) y título de 25 a 95 caracteres; pasa a `BlogTambor` `{ titulo, fuente, hace, categoria, foto }[]`.

- [ ] **Step 1: Prueba:** con datos, exactamente un `.bg-linea[data-j="0"]` y su foto visible; flecha abajo avanza y flecha arriba retrocede; los titulares llevan `lang="en"` cuando vienen en inglés. **Sin datos** (interceptar la fuente o usar la variable de entorno que el servicio ya tenga para pruebas): se ve «Sin titulares por ahora» y el enlace «Abrir el blog», sin errores de consola.
- [ ] **Step 2:** FALLA.
- [ ] **Step 3:** Portar `fuentes/blog.plantilla.html`. Las fotos externas van con `loading="lazy"` salvo la primera, con `referrerPolicy="no-referrer"`; si la CSP de `img-src` no las admite, se sirven por el mismo camino que usa hoy `/blog`. Sin `filter: blur`.
- [ ] **Step 4:** Pasa.
- [ ] **Step 5: Punto de control** (`feat(portada): blog como tambor de titulares`).

### Task 10: Contacto con formulario

**Files:**
- Create: `src/modules/landing/viva/Contacto.tsx`, `src/modules/landing/viva/contacto.css`
- Test: `tests/e2e/viva-contacto.spec.ts` (reemplaza a `portada-contacto.spec.ts`)

**Interfaces:**
- Consumes: `POST /api/contact` con el cuerpo que ya existe: `{ name?: string, email: string, message: string, website: string, formStartTime: number }` (`website` es la trampa para bots y va vacío; `formStartTime` es el `Date.now()` de cuando se abrió el formulario).
- Produces: `<section id="contacto" data-forma="anillo" data-ancla="#ancla-anillo">`.

- [ ] **Step 1: Escribir la prueba**

```ts
test("copiar el correo", async ({ page }) => { /* clic en #copiar → el portapapeles tiene "contacto@nicoholas.dev" y aparece el aviso «Correo copiado» */ });
test("el formulario envía lo mismo que antes", async ({ page }) => {
  let cuerpo: any; await page.route("**/api/contact", r => { cuerpo = r.request().postDataJSON(); r.fulfill({ json: { ok: true } }); });
  /* abrir con el botón redondo, llenar correo y mensaje, enviar */
  expect(cuerpo).toMatchObject({ email: "a@b.cl", message: "Hola", website: "" }); expect(typeof cuerpo.formStartTime).toBe("number");
});
test("si falla o hay demasiados envíos, se entiende y no se pierde lo escrito", async ({ page }) => {
  /* responder 429 → mensaje visible «Recibí varios mensajes seguidos. Prueba de nuevo en una hora o escríbeme al correo.» y los campos conservan su valor;
     responder 500 → «No pude enviar el mensaje. Prueba otra vez o escríbeme al correo.»; doble clic en Enviar hace un solo POST */
});
```

- [ ] **Step 2:** FALLA.
- [ ] **Step 3:** Portar la sección «Conversemos» de `base.html` (`.ct-*`). El botón redondo abre un `<dialog>` con cierre nativo (`closedby="any"` con respaldo) que contiene el formulario: nombre (opcional), correo, mensaje y la trampa oculta; validación nativa con `:user-invalid`; al enviar bien, se cierra y avisa «Mensaje enviado»; la materia se sacude (`sacudir(9)`). Reusar la lógica de envío de `ContactSection.tsx` (tiempo máximo y manejo de errores), no su aspecto.
- [ ] **Step 4:** Pasa.
- [ ] **Step 5: Punto de control** (`feat(portada): contacto con formulario mejorado`).

### Task 11: Firma, armado de la portada y limpieza

**Files:**
- Create: `src/modules/landing/viva/Firma.tsx`
- Modify: `src/app/page.tsx`, `src/components/seo/NoScriptLanding.tsx`
- Delete (solo si nada más los importa; comprobar con `grep -r` antes): las secciones de la portada anterior que ya no se usan (`portada/secciones/Orbita*`, `Mazo*`, `Centinela*`, `Coverflow*`, `Firma*`, `portada/hero`, `PortadaMotion`, `FondoVivo`, `motor.ts`) y sus specs (`portada-orbita`, `portada-mazo`, `portada-centinela`, `portada-cinta`, `portada-casos`, `portada-hero`, `portada-firma`, `portada-base`, `landing-motion`)
- Test: `tests/e2e/viva-portada.spec.ts`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: la portada en este orden: Hero, Proyectos, Herramientas, Blog, Contacto, Firma (`<section id="firma" data-forma="firma" data-ancla="#ancla-firma">`).

- [ ] **Step 1: Prueba:** el orden de `section[id]` es `inicio, proyectos, herramientas, blog, contacto, firma`; un solo `h1`; sin JavaScript (`javaScriptEnabled: false`) siguen presentes los nombres de los tres proyectos, el número de herramientas y el correo; sin errores de consola al recorrer la página entera en 390 y 1440; `pnpm exec playwright test seo-` en verde.
- [ ] **Step 2:** FALLA.
- [ ] **Step 3:** Armar `page.tsx` con `Esqueleto` y las seis secciones. Actualizar `NoScriptLanding` con el contenido nuevo. Retirar `gsap` y `lenis` de `package.json` solo si `grep -r "from \"gsap\|from \"lenis" src` no devuelve nada.
- [ ] **Step 4:** Pasa; `pnpm run typecheck && pnpm run lint && pnpm exec playwright test`.
- [ ] **Step 5: Punto de control** (`feat(portada): Materia viva`).

### Task 12: Medir, compilar y entregar

**Files:** ninguno nuevo.

- [ ] **Step 1:** `pnpm run build` desde el árbol de trabajo, con `APP/NEXT_APP/.env` presente. Esperado: compila sin errores.
- [ ] **Step 2:** Levantar la compilación (`node .next/standalone/server.js`) y correr `PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm exec playwright test viva-` contra ella. Esperado: todo en verde, incluida la prueba de rendimiento de la tarea 2.
- [ ] **Step 3:** Capturas de las ocho páginas públicas en 390 y 1440, en los dos temas, y revisarlas a ojo contra la maqueta.
- [ ] **Step 4: Punto de control con el dueño:** mostrarle el sitio local. **Solo con su visto bueno**, desplegar: `bash ~/Documentos/Paginas/portafolio-vm/construir-imagen.sh && bash ~/Documentos/Paginas/portafolio-vm/desplegar.sh`, y comprobar desde afuera que las ocho páginas responden 200. Vuelta atrás: en la VM, `docker tag localhost/portfolio_web:prev localhost/portfolio_web:vm && docker compose up -d web`.
