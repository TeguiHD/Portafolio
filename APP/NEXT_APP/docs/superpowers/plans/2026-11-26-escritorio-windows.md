# Modo escritorio v2 (estilo Windows 11): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rehacer /escritorio como un Windows 11 con la marca «n.»: barra, inicio, ventanas y acople de Windows; herramientas como apps; Explorador, Fotos, Correo, Noticias, Widgets y Configuración; fondos propios; clic sintetizado con el carácter del de bait.cl.

**Architecture:** El escritorio sigue siendo un componente cliente (`Escritorio.tsx`) con un reductor de ventanas; se parte en piezas (barra, inicio, flotantes, notificaciones, bloqueo, apps). Las herramientas se abren en un iframe a una ruta nueva `/escritorio/app/[slug]` que importa el mismo `page.tsx` de la herramienta sin el armazón del sitio. Las apps propias son vistas React dentro de la ventana; las páginas de contenido siguen en iframe con `data-ventana`.

**Tech Stack:** Next.js 16.4.6 (App Router, Turbopack), React 19, CSS propio (`escritorio.css`), Web Audio, Playwright (pruebas y generación de fondos), sharp 0.34.5.

**Spec:** `docs/superpowers/specs/2026-11-26-escritorio-windows-design.md`

## Global Constraints

- Nada se borra de producción; solo se cambia código y se agregan archivos en `public/escritorio/`.
- No copiar el archivo de sonido de bait.cl ni el logo, fondos, íconos o fuente de Windows.
- Diseño sin kit de IA: sin rótulos en mayúsculas, sin cajas de aviso, sin «A · B · C», sin «→» en botones.
- Compilar en jaula: `systemd-run --user --scope -q -p MemoryMax=2600M -p MemorySwapMax=1G -E NEXT_BUILD_CPUS=3 -- nice -n 15 taskset -c 0-3 node_modules/.bin/next build`; tsc con `NODE_OPTIONS=--max-old-space-size=2300`; una tarea pesada a la vez; nunca `next dev`.
- Las pruebas del panel nunca contra producción; el Correo en pruebas se intercepta (`page.route('/api/contact')`), nunca envía.
- Commits terminan con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Seguir modern-web-guidance (popover, pointer capture, `contextmenu` + `pointerup`, sin mover iframes en el DOM).

## Review Focus

1. Preferencias viejas en `localStorage` (v1: `escritorio:sonido` con tipo «suave», `escritorio:iconos` con apps que ya no existen): el escritorio carga igual y cae a lo de fábrica. Prueba en la tarea 6.
2. Pantallas de 1024×700: el inicio, los flotantes y las ventanas caben en el área útil. Prueba en la tarea 6.
3. APIs del blog caídas (503 o sin red): Widgets y Noticias muestran un texto tranquilo y un botón para reintentar, sin romperse. Prueba en la tarea 7.
4. Herramientas con interacción dentro del iframe (escribir, pegar): funcionan dentro de la ventana y el clic suena. Prueba en la tarea 4.
5. Tema claro: el cambio llega a las ventanas abiertas y las apps propias se leen bien. Prueba en la tarea 6 y revisión con capturas.

---

### Task 1: Sonido sintetizado (clic de mouse, teclado, avisos)

**Files:**
- Create: `src/modules/escritorio/sintesis.ts`
- Modify: `src/modules/escritorio/sonido.ts` (reescritura)
- Test: `tests/e2e/escritorio-logica.spec.ts`

**Interfaces:**
- Produces: `type TipoClic = "mouse" | "silencioso" | "retro"`; `sintetizarClic(tipo: TipoClic, fase: "presionar" | "soltar", semilla: number, sr: number): Float32Array`; `sintetizarTecla(semilla: number, sr: number): Float32Array`; `sintetizarAviso(tipo: "notificacion" | "inicio", sr: number): Float32Array`; `centroide(x: Float32Array, sr: number): number`; `duracionSobre(x: Float32Array, sr: number, db: number): number` (segundos hasta el último punto de la envolvente de 1 ms sobre `db` relativo al pico).
- Produces: `interface PreferenciasSonido { activo: boolean; volumen: number; tipo: TipoClic; clic: boolean; teclas: boolean; avisos: boolean }`; `leerPreferencias(tactil: boolean): PreferenciasSonido`; `TIPOS_CLIC: { id: TipoClic; nombre: string }[]` = Mouse, Silencioso, Retro; clase `SonidoEscritorio` con `presionar() soltar() tecla(fuerte: boolean) aviso(tipo) muestra() cambiar(p) suspender(v) cerrar()` y `listo: Promise<void>`.

- [ ] **Step 1: Pruebas que fallan** en `escritorio-logica.spec.ts`: «el clic de mouse es agudo y corto» (presionar: `centroide` entre 6000 y 10000; `duracionSobre(x, 44100, -30) < 0.035`; pico ≤ 1); «soltar es más agudo y más suave que presionar» (centroide mayor, RMS menor); «el silencioso es grave» (centroide < 4000); «misma semilla, mismo sonido; otra semilla, otro» ; «la tecla suena a teclado» (centroide entre 2000 y 6500); «las preferencias de la v1 caen a mouse» (`tipo: "suave"` y `"toString"` → `"mouse"`; `ventanas` se ignora).
- [ ] **Step 2:** `npx playwright test tests/e2e/escritorio-logica.spec.ts` → FAIL (módulo no existe).
- [ ] **Step 3:** `sintesis.ts`: síntesis modal pura (sin DOM): impulso + ruido de 0,4 ms excitando modos amortiguados; mouse con modos en 4–11 kHz (1–3 ms), golpe bajo 90–150 Hz unos 15 dB abajo y 1–2 rebotes entre 10 y 25 ms; soltar con modos un 10 % más agudos y 0,65 de ganancia; PRNG con semilla. Comparar contra la medición de bait.cl con `scratchpad/analisis/analizar.mjs` hasta acercar centroide, bandas y envolvente.
- [ ] **Step 4:** `sonido.ts`: crea los `AudioBuffer` con `new AudioBuffer({ length, sampleRate: ctx.sampleRate })` + `copyToChannel` en el primer gesto; cuatro variantes por golpe, ocho teclas; sin efectos de ventana.
- [ ] **Step 5:** pruebas → PASS. Commit.

### Task 2: Fondos de pantalla propios

**Files:**
- Create: `scripts/escritorio/fondos/fondos.html`, `scripts/escritorio/fondos/generar.mjs`, `public/escritorio/fondos/<id>-{1280,1920,2560}.{avif,webp}` y `<id>-mini.webp`, `src/modules/escritorio/fondos.ts`
- Test: `tests/e2e/escritorio-logica.spec.ts`

**Interfaces:**
- Produces: `type FondoId = "pampa" | "pacifico" | "cordillera" | "austral" | "curvas" | "grafito" | "papel" | "materia" | "materia-viva" | "solido"`; `interface Fondo { id: FondoId; nombre: string; tema: "oscuro" | "claro"; tipo: "imagen" | "vivo" | "solido" }`; `FONDOS: Fondo[]`; `COLORES_SOLIDOS: string[]` (8); `fondoPorDefecto(tema): FondoId` (pampa | cordillera); `srcsetFondo(id, formato: "avif" | "webp"): string`; `miniFondo(id): string`.

- [ ] **Step 1:** prueba «cada fondo de imagen tiene sus archivos» (lee `public/escritorio/fondos/` y exige las 7 variantes por id de tipo imagen) y «el fondo por defecto sigue al tema». FAIL.
- [ ] **Step 2:** `fondos.html` dibuja cada fondo en un lienzo de 2560×1440 según `?id=` (ruido con semilla fija, capas, degradados, grano); `generar.mjs` lo abre con Chromium de Playwright, guarda PNG y con sharp exporta AVIF (calidad 55) y WebP (calidad 80) en 1280/1920/2560 y la miniatura de 320. Revisar cada PNG a ojo y ajustar.
- [ ] **Step 3:** `fondos.ts`. Pruebas → PASS. Commit (imágenes + script).

### Task 3: Íconos propios

**Files:**
- Create: `src/modules/escritorio/iconos/Icono.tsx`, `src/modules/escritorio/iconos/dibujos.ts`
- Modify: borrar `Glifo.tsx` al final de la tarea 6 cuando nadie lo use.

**Interfaces:**
- Produces: `type IconoSistema = "carpeta" | "carpeta-proyectos" | "carpeta-servicios" | "carpeta-herramientas" | "carpeta-documentos" | "correo" | "noticias" | "fotos" | "configuracion" | "documento" | "grafico" | "perfil" | "plano" | "explorador" | "imagen" | "enlace" | "widgets"`; `<Icono id tam />` (SVG con degradados; ids únicos con `useId`); `<IconoHerramienta slug tam />` (placa con el color de `COLOR_CATEGORIA` y el ícono de `TOOL_ICONS`); `<IconoDe icono tam />` que despacha según `IconoSistema | { herramienta: string }`; prop `acceso` agrega la flechita de acceso directo.

- [ ] **Step 1:** dibujar en una hoja de contacto (página de prueba en el scratchpad) a 16, 24, 32 y 48 px, claro y oscuro; revisar captura; ajustar. Commit.

### Task 4: Herramientas como apps (`/escritorio/app/[slug]`)

**Files:**
- Create: `src/app/escritorio/app/[slug]/page.tsx`, `src/modules/escritorio/herramientas-app.ts` (mapa slug → componente de página, importaciones estáticas de las 33), `src/modules/escritorio/AppHerramienta.tsx` (cliente: registra visita y recientes, manda a `/herramientas/<slug>` si no está dentro de una ventana), `src/modules/escritorio/app-herramienta.css`
- Test: `tests/e2e/escritorio.spec.ts`

**Interfaces:**
- Produces: ruta `/escritorio/app/<slug>` (404 si no es pública; `robots: { index: false, follow: false }`); `HERRAMIENTAS_APP: Record<string, ComponentType>`.

- [ ] **Step 1:** pruebas que fallan: «la herramienta abre como app» (en el escritorio, abrir QR: el iframe apunta a `/escritorio/app/qr`; dentro no hay `.tool-page-heading` ni «Preguntas frecuentes»; hay vista previa del QR; la barra de título dice «Generador de QR» y no contiene «nicoholas.dev/»); «se escribe dentro de la app» (Base64: escribir «hola» da «aG9sYQ==»); «/escritorio/app/no-existe da 404»; «/escritorio/app/qr: frame-ancestors 'self'».
- [ ] **Step 2:** implementar; CSS de app: fondo de la superficie de la ventana, márgenes de 16–20 px, sin anchos máximos de página, esconder `.tool-page-heading`, relacionadas y flujos si las pinta la página.
- [ ] **Step 3:** capturar las 33 apps a 1120×760 y a 760×680 y corregir lo que se vea a página web. Pruebas → PASS. Commit.

### Task 5: Envío del contacto compartido

**Files:**
- Create: `src/lib/contacto/envio.ts`
- Modify: `src/modules/landing/viva/Contacto.tsx` (usa el módulo; mismo comportamiento)

**Interfaces:**
- Produces: `LIMITES = { MIN_MENSAJE: 10, MAX_MENSAJE: 2000, ESPERA_MINIMA: 3200, MARGEN_RELOJ: 1500, AVISO_LARGO: 1800 }`; `MENSAJES_CONTACTO` (DEMASIADOS, FALLO, REVISAR, LENTO, SIN_RED, CORTO, textos de hoy); `CORREO_CONTACTO`; `medirDesfase(): Promise<number>`; `enviarContacto(datos: { name?: string; email: string; message: string; origen?: string; website: string }, abierto: number, desfase: number): Promise<{ ok: true } | { ok: false; error: string }>` (espera el mínimo, corta a los 30 s, traduce 429/400/red a los mensajes).

- [ ] **Step 1:** correr las pruebas actuales del formulario de contacto (las que toquen `#ct-abrir`) → PASS antes del cambio.
- [ ] **Step 2:** extraer; las mismas pruebas → PASS. Commit.

### Task 6: Escritorio Windows 11 (barra, inicio, ventanas, íconos, bloqueo, flotantes, notificaciones)

**Files:**
- Create: `src/modules/escritorio/Barra.tsx`, `Inicio.tsx`, `Flotantes.tsx` (configuración rápida, calendario y notificaciones), `Notificaciones.tsx`, `Bloqueo.tsx`, `AcopleMenu.tsx`
- Modify: `Escritorio.tsx`, `Ventana.tsx`, `Iconos.tsx`, `geometria.ts`, `apps.ts`, `tipos.ts`, `escritorio.css`, `src/app/escritorio/page.tsx` (pasa servicios y documentos)
- Delete: `Paneles.tsx`, `Vistas.tsx`, `Glifo.tsx`, `menu.ts` si quedan sin uso
- Test: `tests/e2e/escritorio.spec.ts`, `tests/e2e/escritorio-logica.spec.ts`

**Interfaces:**
- Consumes: tareas 1–4.
- Produces: `type Zona = "izq" | "der" | "max" | "si" | "sd" | "ii" | "id" | "t1" | "t2" | "t3"`; `zonaEncaje(x, y, ancho, alto): Zona | null` (esquinas de 24 px → cuartos; bordes → mitades; arriba → max); `rectZona(zona, area, hueco)`; `VentanaAbierta` gana `args?: Record<string, string | number>`; `App` = `{ id; titulo; icono: IconoSistema | { herramienta: string }; tipo: "vista" | "pagina" | "herramienta"; ruta?; vista?: "explorador" | "fotos" | "correo" | "noticias" | "configuracion"; tam: [number, number]; familia?; descripcion?; enlace? }`; `abrirApp(id: string, args?)` en el contexto del escritorio; preferencias de escritorio en `escritorio:prefs` = `{ fondo: FondoId; solido: string; alinear: "centro" | "izq"; iconos: "grandes" | "medianos" | "pequenos"; animaciones: boolean; noMolestar: boolean; anclados: string[] }` validadas campo por campo.

- [ ] **Step 1:** pruebas que fallan: bloqueo la primera vez de la sesión y se sube con una tecla; inicio con «Anclado», «Todas las apps» y buscar «sueldo» + Enter abre la app; clic que suena al presionar y al soltar (contador de `AudioBufferSourceNode.start`); menú de acople al pasar por maximizar y «mitad izquierda» deja la ventana en la mitad; arrastrar a la esquina superior izquierda deja un cuarto; Configuración › Barra de tareas › Izquierda mueve los íconos; configuración rápida apaga el sonido y se guarda; calendario abre con el mes; preferencias v1 y posiciones viejas no rompen; en 1024×700 el inicio cabe; el tema llega a la ventana abierta; lógica: `zonaEncaje` con esquinas y `rectZona` de cuartos y tercios.
- [ ] **Step 2:** implementar la barra, el inicio, las ventanas (cromo Windows 11, menú de acople, animaciones), los íconos (selección con rectángulo, tamaños), el bloqueo y encendido, los flotantes y las notificaciones; el motor de partículas solo con «Materia viva».
- [ ] **Step 3:** pruebas → PASS; capturas en oscuro y claro, 1440×900 y 1024×700; corregir. Commit.

### Task 7: Apps propias (Explorador, Fotos, Correo, Noticias, Widgets, Configuración)

**Files:**
- Create: `src/modules/escritorio/apps/Explorador.tsx`, `apps/vfs.ts`, `apps/Fotos.tsx`, `apps/Correo.tsx`, `apps/Noticias.tsx`, `apps/Widgets.tsx`, `apps/Configuracion.tsx`, `apps/apps.css`
- Test: `tests/e2e/escritorio.spec.ts`, `tests/e2e/escritorio-logica.spec.ts`

**Interfaces:**
- Consumes: `enviarContacto` (tarea 5), `FONDOS` (tarea 2), `TIPOS_CLIC` (tarea 1), `climaDe` y `figuraDelCielo`, `/api/pulse/news` (`{ items: PulseNewsItem[] }`), `/api/pulse/finance` (`{ items: PulseFinanceItem[] }`), `/api/pulse/context?city=Santiago` (`PulseContextData`).
- Produces: `interface Nodo { ruta: string; nombre: string; tipo: "carpeta" | "app" | "pagina" | "imagen" | "enlace"; icono: IconoSistema | { herramienta: string }; abrir?: { app: string; args?: Record<string, string | number> } | { externo: string }; miniatura?: string; descripcion?: string; hijos?: Nodo[] }`; `arbol(datos: { herramientas; proyectos; servicios }): Nodo`; `buscarNodo(raiz, ruta): Nodo | null`; `padre(ruta): string | null`.

- [ ] **Step 1:** pruebas que fallan: lógica del árbol (`proyectos/floresdyd` tiene capturas y el acceso al sitio; `herramientas/imagenes` tiene las de su familia; `padre`); Explorador desde el ícono Proyectos hasta una captura que abre Fotos con anterior y siguiente; Correo valida el mensaje corto y, con `/api/contact` interceptado, notifica «Mensaje enviado»; Noticias y Widgets con las APIs en 503 muestran el reintento; Configuración › Personalización › Fondo «Pacífico» se guarda tras recargar.
- [ ] **Step 2:** implementar. Pruebas → PASS; capturas; commit.

### Task 8: Celular y Lector

**Files:**
- Modify: `Escritorio.tsx`, `escritorio.css`, `src/modules/esqueleto/esqueleto.css` (márgenes de `data-ventana`)
- Test: `tests/e2e/escritorio.spec.ts`

- [ ] **Step 1:** prueba de celular (grilla de inicio, abrir app a pantalla completa, Atrás cierra) adaptada; Lector sin barra ni pie (la de hoy). FAIL si cambió el marcado.
- [ ] **Step 2:** ajustar; capturas a 390×844. PASS. Commit.

### Task 9: Revisión, suite completa y despliegue

- [ ] **Step 1:** `tsc` y `eslint` limpios; suite completa con `scratchpad/suite/correr.sh` (sin fallas).
- [ ] **Step 2:** revisión independiente de la rama (subagente) y corrección de lo real.
- [ ] **Step 3:** actualizar el spec v1 (remite al v2), la memoria `modo_escritorio.md`; commit; desplegar (`prod-local.sh abajo; construir-imagen.sh && desplegar.sh`); pruebas del escritorio contra producción (sin el Correo real); empujar `ui/portada` y `main`; verificar nicoholas.dev y asistencia.nicoholas.dev.
