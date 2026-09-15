# Portada viva de nicoholas.dev

Fecha: 15 de septiembre de 2026. Diseño validado por el usuario en el prototipo "Taller nicoholas.dev" (artefacto versión 16, archivo `taller-portada.html` del taller). Este documento destila el prototipo en reglas que el producto Next.js debe cumplir.

Decisiones ya tomadas por el usuario:

- Giro del hero: **V1 · Tocadiscos** (las cuatro tarjetas giran sobre un eje vertical; la del frente queda nítida y las demás se atenúan).
- Cursor de seguimiento: el **DropCursor original** de producción, sin cambios.
- Textos: los reales del sitio. Sin notas explicativas ni texto de "IA".
- Contacto: se retiran las tarjetas "Velocidad de ejecución" y "Calidad industrial" con sus descripciones.
- Tecnologías: solo iconos; el nombre aparece en el centro al pasar o pulsar.
- Seguridad: centinela con el Matrix Orb de rareui (MIT), adaptado, y crédito visible.
- Fondo: partículas vivas con profundidades, uniones, reacción al ratón, a los clics y al scroll.
- Después: desplegar a producción con cuidado en el VPS compartido.

## Qué se construye

La ruta `/` conserva su cadena `layout.tsx → template.tsx → page.tsx`, el `LandingMotionProvider` (con su botón "Pausar efectos" / "Activar efectos"), `VisualEnhancements` (que monta el `DropCursor`), el `Navbar`, `NoScriptLanding`, `ClosingSignature` y `FooterSection`. Cambian las siete secciones entre la barra y la firma, el fondo y el sistema de movimiento.

Orden en `src/app/page.tsx`:

1. `Navbar` (sin cambios).
2. `HeroSection` con la **mesa giratoria** de instrumentos.
3. `#tools-belt` — cinta de herramientas (rediseño ligero del componente actual).
4. `#vault` — **mazo** de tres demostraciones reales.
5. `#casos` — **coverflow** fijado al scroll con los tres proyectos.
6. `#tecnologias` — **órbita** de iconos con revelado del nombre en el centro.
7. `#architecture` — **centinela** de seguridad con lanzador de peticiones y terminal.
8. `#contact` — formulario actual, sin las dos tarjetas.
9. `NoScriptLanding`, `ClosingSignature`, `FooterSection` (sin cambios).

Los anclajes `#hero`, `#tools-belt`, `#vault`, `#casos`, `#tecnologias`, `#architecture`, `#contact`, `#closing-signature` y `#site-footer` se conservan porque la barra, el pie y las pruebas los usan. La sección de tecnologías se llama `#tecnologias` en producto (el prototipo la llamaba `#stack`); la de seguridad, `#architecture` (`#seguridad` en el prototipo); contacto, `#contact` (`#contacto`).

## Arquitectura

Todo lo nuevo vive en `src/modules/landing/portada/`:

- `PortadaMotion.tsx` (cliente): registra GSAP + ScrollTrigger, crea Lenis cuando el nivel es `completo`, reproduce el autoscroll del botón central bajo Lenis, pinta la barra de progreso de lectura y expone `usePortada()` con `{ nivel, gsap, lenis }`. Se monta una sola vez desde `page.tsx`, dentro de `LandingMotionProvider`.
- `nivel.ts`: `type Nivel = "completo" | "medio" | "estatico"`. `estatico` cuando `useLandingMotion().allowed` es falso (movimiento reducido, ahorro de datos, pestaña oculta o efectos pausados). `medio` cuando el presupuesto es bajo: `hardwareConcurrency ≤ 4`, `deviceMemory ≤ 4`, ancho `< 768` o puntero grueso. `completo` en el resto. En `medio` no hay Lenis ni giro por scroll ni inclinación de la mesa; el fondo dibuja a 30 fps con menos partículas; las demostraciones y el coverflow siguen.
- `FondoVivo.tsx` (cliente): el lienzo fijo de partículas. Sustituye a `BackgroundManager`; conserva el atributo `data-landing-background="true"` en su raíz y no se monta en nivel `estatico`.
- `revelar.ts`: utilidades de entrada por scroll (`data-revelar` en cabeceras: eyebrow, líneas del título con máscara, párrafo) que crean un ScrollTrigger `once` por elemento.
- `portada.css`: estilos de la portada bajo la clase raíz `.portada` (tokens, cabeceras, CTA, chips, mesa giratoria, mazo, coverflow, órbita, centinela, contacto). Se importa desde `page.tsx`. Las tarjetas del hero importan además `src/app/herramientas/tools.css` y `src/components/tools/mesa/mesa.css`, porque se construyen con los componentes reales de la mesa de trabajo.
- `hero/`: `HeroSection.tsx` (servidor: badge, `h1`, párrafo, CTA, ancla "Explorar"), `MesaGiratoria.tsx` (cliente) e `instrumentos/` con las cuatro tarjetas y sus demostraciones.
- `secciones/`: `Mazo.tsx`, `Coverflow.tsx`, `Orbita.tsx`, `Centinela.tsx`, más los datos en `datos/` (`instrumentos.ts`, `mazo.ts`, `casos.ts`, `tecnologias.ts`, `seguridad.ts`).

`DeferredLandingSection` sigue cargando `tools-belt`, `vault`, `tecnologias`, `architecture` y `contact` al acercarse al viewport; `casos` se renderiza en el servidor (las imágenes deben existir sin JavaScript).

Tipografía: se incorpora `next/font/google` con **Inter** (variable, pesos 300–900) y **JetBrains Mono** (500, 700) autoalojadas por Next, con `display: "swap"` y respaldo ajustado automático. Las variables `--font-inter` y `--font-mono` que ya usa `globals.css` pasan a apuntar a estas familias; el resto del sitio hereda la tipografía sin cambios de código.

## Secciones

### Hero · mesa giratoria (V1)

- Texto servidor (LCP): badge "Desarrollador Full Stack"; `h1` con "Desarrollo" y "SOLUCIONES."; párrafo "Herramientas útiles, interfaces cuidadas y desarrollo web a medida. Explora lo que construyo y pruébalo por ti mismo."; CTA "Usar herramientas" (`/herramientas`) y "Hablemos de tu proyecto" (`#contact`); ancla "Explorar" hacia `#tools-belt`.
- Mesa: cuatro tarjetas con la mesa de trabajo real (cabecera, escenario, carril, pasos): **Quitar fondo**, **Generador de QR**, **Extractor de paleta** y **Recortar imagen**. Cada una se demuestra sola en bucle (pincelada que borra el fondo, texto que se teclea y QR que se dibuja, colores que se extraen, encuadre que se ajusta) y responde al usuario cuando toma el control. Solo la tarjeta del frente corre su demostración; las otras tres quedan `inert` y `aria-hidden`.
- Giro: radio 220 px en escritorio y 150 px por debajo de 768 px; el scroll añade giro en `completo`; la mesa se inclina levemente con el scroll. Avance automático cada 11 s mientras el hero está en pantalla, sin ratón encima y con la pestaña visible. Puntos con etiqueta (`role="tablist"`, `aria-current`) para elegir tarjeta.
- Entrada: la barra cae, la insignia sube, las dos líneas del título se revelan por máscara, los CTA suben, la mesa entra inclinándose. **El párrafo no se anima** (es el elemento LCP y se pinta desde el primer frame). Un script en línea con nonce añade `portada-entrada` al `<html>` para retener título y mesa como mucho 700 ms; si la hidratación llega antes, la coreografía toma el control en el mismo tick.
- Sin lienzos dentro de `#hero` a la altura del texto: los lienzos de las demostraciones viven dentro de las tarjetas. (La prueba de la firma que exigía cero lienzos en `#hero` se reescribe: exige que ningún lienzo del hero sea el elemento LCP y que el párrafo tenga opacidad 1 tras la carga.)

### Cinta de herramientas (`#tools-belt`)

Se mantiene el componente y su CSS Module. Cambian el texto y los detalles: eyebrow "29 herramientas · sin registro" (la cifra sale de `TOOL_COUNT`), `h2` "Las herramientas que uso a diario." con segunda línea "Úsalas tú también.", párrafo "Quita el fondo de una foto, recorta, genera un QR o limpia un JSON: rápido, en tu navegador y sin cuenta.", botón "Explorar herramientas" hacia `/herramientas`. Las tarjetas conservan sus textos ("Quitar fondo" · "Quédate con lo que importa.", "Recortar imagen" · "Tu imagen, en la proporción justa.", "Códigos QR", "Editor JSON") y los accesos rápidos. Se añaden inclinación al pasar y revelado de entrada.

### Mazo (`#vault`)

- Cabecera: eyebrow "Software de uso interno", `h2` "Infraestructura Privada" (Privada en ámbar), párrafo actual, CTA "Conversar sobre un sistema" hacia `#contact`, aviso "Vistas de demostración…" actual.
- Tres cartas en abanico: **Control Financiero**, **Optimizador CV** y **Auditoría de Seguridad**, cada una con su demostración real reutilizada de `ForbiddenVaultSection` (`FinanceDemo` y las vistas de CV y auditoría) en la cara y la descripción en el dorso. Al pulsar (o con Enter/Espacio; son `role="button"`), la carta gira 180° y muestra el dorso; al pasar el ratón se eleva e inclina con brillo. Cada carta lleva `data-demo` y `data-motion-active`; la demostración solo corre cuando la carta es visible y el nivel no es `estatico`.
- En pantallas estrechas las cartas se apilan en columna sin duplicar el DOM: **tres** nodos `[data-demo]` en total.

### Coverflow (`#casos`)

- Cabecera: eyebrow "Trabajo que puedes conocer", `h2 id="projects-title"` "De la necesidad al producto", párrafo actual.
- Tres paneles (FloresDyD, Intranet y aula virtual OTEC, Herramientas de uso diario) con la imagen real de `/images/projects/*.webp` mediante `next/image` y la etiqueta "Esquema del proyecto" visible bajo la imagen, como hoy. Cada panel es un artículo con `h3` y un enlace real (`https://floresdyd.cl`, `/sobre-mi`, `/herramientas`).
- En `completo` y `medio` la sección se fija con ScrollTrigger (`end: +=1200`) y el scroll desplaza el panel activo; puntos y flechas permiten elegir sin scroll. En `estatico` y sin JavaScript los paneles se muestran en fila (o columna) sin fijar.
- Sin cifras comerciales: el texto de `#casos` no contiene `200%`, `92%`, `850+` ni `Auditado`.

### Órbita (`#tecnologias`)

- Cabecera centrada: `h2` "Una base para crecer" (con "para crecer" atenuado) y el párrafo actual.
- Doce satélites con los iconos de Simple Icons que ya usa `TechnologiesSection` (Next.js, React, TypeScript, Tailwind, Node.js, PostgreSQL, Docker, AWS, Redis, Python, Git, AI/ML) girando en anillo, sin nombres. Cada satélite es un botón con `aria-label` del nombre. Al pasar o pulsar, el nombre sube por el centro con el color de la tecnología y un halo del mismo color; el anillo se ralentiza mientras hay uno activo. Sin JavaScript se muestra la rejilla actual con nombres.

### Centinela (`#architecture`)

- Cabecera: `h2` "La seguridad no es un extra." con segunda línea "Es parte del diseño."; párrafo "Seguridad defensiva por diseño. Un núcleo vigila el sitio y cada petición atraviesa cuatro anillos antes de tocar un dato. Lanza una y mira cómo responde."
- Lanzador "Ponla a prueba": cuatro tipos de petición (normal, inyección SQL, ráfaga, sesión caducada) con la petición HTTP tecleada y el botón "Lanzar petición". Cada tipo recorre los anillos (Cliente, WAF, Auth, Datos) hasta donde llega y el núcleo responde: 200, 400, 429 o 302 hacia `/acceso`.
- Núcleo: Matrix Orb (rareui, MIT) adaptado a lienzo 2D, con estado "Vigilando" / "Bloqueando" / "Correcto" (`role="status"`). Anillos como elipses 2D en dos capas (detrás y delante del núcleo), sin transformaciones 3D. Terminal "respuesta del servidor" que escribe las cabeceras de seguridad reales del sitio (`content-security-policy`, `strict-transport-security`, `x-frame-options`, `x-content-type-options`, `referrer-policy`, `permissions-policy`, `x-security-version`) leídas con una petición `HEAD` a `/` (mismo origen) y, si falla, la lista fija del prototipo.
- Crédito: "Núcleo: Matrix Orb de rareui (MIT), adaptado." con enlace a rareui. La licencia MIT se copia en `docs/licencias/rareui-matrix-orb.md`.
- Se conservan las seis prácticas de seguridad actuales como chips bajo el terminal.

### Contacto (`#contact`)

El componente actual sin las dos tarjetas ("Velocidad de ejecución" y "Calidad industrial"). El resto (chips, formulario, honeypot, tiempos, estados) no cambia. Los CTA reciben el imán y la onda de clic de la portada.

## Movimiento e interacción

- Coreografía de entrada solo en el hero. Cada sección revela su cabecera al entrar (eyebrow, líneas del título con máscara, párrafo) y sus piezas con un ligero escalonado; `once: true`.
- CTA magnéticos (`data-magnetic`, 8 px de atracción, solo con puntero fino) con onda al pulsar. Tarjetas del mazo, paneles del coverflow y tarjetas de la cinta con inclinación 3D y brillo al pasar; los satélites son botones. El `DropCursor` reconoce enlaces, botones, `[data-magnetic]` y `role="button"`, así que las piezas interactivas nuevas usan esas formas y el cursor no cambia.
- Barra de progreso de lectura fija arriba (2 px, `aria-hidden`).
- Lenis (`lerp .11`) solo en `completo`; el botón central del ratón reproduce el autoscroll nativo bajo Lenis; los clics con otros botones no disparan ondas ni imanes.
- Pausar efectos (`LandingMotionProvider`): detiene demostraciones, órbita, centinela y fondo; las piezas quedan en su estado final; las secciones siguen legibles y navegables.

## Rendimiento (lo que mide PageSpeed)

- El párrafo del hero es el elemento LCP: renderizado en el servidor, visible desde el primer frame, sin animación. El título entra por máscara y la mesa por transformación; ninguno se retiene más de 700 ms.
- Ningún recurso bloquea el render: GSAP, ScrollTrigger y Lenis se importan dentro de componentes cliente que Next divide en su propio chunk; las secciones bajo el pliegue siguen diferidas.
- Fondo: lienzo a 1× de resolución en `medio` (1,5× tope en `completo`); aurora pintada en un lienzo de 1/8 y escalada; partículas `min(260, ancho·alto/5600)` por presupuesto; uniones con rejilla espacial y tope de 420 trazos; 30 fps efectivos en `medio`; calidad adaptativa que baja un escalón si la media de frame supera 25 ms.
- Las demostraciones del hero paran cuando el hero sale del viewport; el centinela y la órbita solo animan mientras se ven; nada anima con la pestaña oculta.
- Sin `backdrop-filter` animado sobre el lienzo; sin `filter: blur()` animado por el ratón.
- Objetivo de laboratorio (Lighthouse 12, `next build && next start`, servido con gzip): móvil ≥ 90 con LCP ≤ 2,5 s y CLS < 0,1; escritorio ≥ 95; accesibilidad 100. Frame medio en móvil emulado (Pixel 7, CPU ×4) ≤ 50 ms en el hero con todo activo.

## Accesibilidad

- Un solo `h1`; jerarquía `h2 → h3` en cada sección. `lang="es"` ya viene del layout.
- Todo lo interactivo es enlace o botón con nombre accesible; objetivos táctiles de 44 px (regla global existente).
- Tarjetas laterales de la mesa `inert` + `aria-hidden`; cartas del mazo con `aria-pressed` (girada o no); coverflow con `aria-current` en el panel activo; nombre de la tecnología en `aria-live="polite"`; estado del núcleo en `role="status"`.
- `prefers-reduced-motion: reduce` = nivel `estatico`: sin Lenis, sin entrada, sin bucles; la portada se lee completa y estable.
- Contraste mínimo 4,5:1 en textos secundarios (`#94a3b8` sobre `#0a0a0f`).

## Invariantes de pruebas

Se reescribe `tests/e2e/landing-motion.spec.ts` al nuevo contrato. Deben seguir verdes sin cambios: `seo-headings`, `seo-metadata`, `seo-schema`, `security-headers`, `auth` (título), `tools-return-visits` (portada: `id="projects-title"`, encabezado "FloresDyD" en `#casos`, sin cifras comerciales, sin `a[href="/projects"]`, "Usar herramientas" → `/herramientas`).

Contrato nuevo de `landing-motion.spec.ts`:

1. Hero a 1440×1000: enlace "Usar herramientas" visible; cuatro `[data-instrumento]`, exactamente uno sin `inert`; tras 12 s (o al pulsar un punto) cambia la tarjeta del frente; el párrafo del hero tiene `opacity: 1` y `visibility: visible` inmediatamente tras `domcontentloaded`.
2. Pausar efectos: `[data-landing-background]` pasa a 0, todos los `[data-motion-active]` a `"false"`, el HTML de las cartas del mazo no cambia en 3,6 s; el estado persiste al recargar ("Activar efectos" visible); al reanudar, todos los descendientes de `[data-hero-content]` tienen opacidad 1.
3. Mazo: tres `[data-demo]`; al pulsar una carta cambia `aria-pressed` y se ve el dorso; al salir del viewport ninguna sigue activa.
4. Coverflow: tres `article` con imagen; el panel activo (`aria-current="true"`) cambia al hacer scroll dentro de la sección y al pulsar un punto.
5. Órbita: doce botones con nombre; al pasar por uno, el centro muestra ese nombre.
6. Centinela: al elegir "Inyección SQL" y lanzar, el terminal muestra "400" y el estado del núcleo dice "Bloqueando"; en la petición normal muestra "200".
7. Contacto: no aparece "Velocidad de ejecución" ni "Calidad industrial"; el formulario conserva "Enviar Mensaje".
8. Movimiento reducido: sin botón "Pausar efectos", sin fondo, firma en `static`, hero legible; ahorro de datos: la escena de la firma no se carga.
9. Sin desbordamiento horizontal a 320, 375, 768, 1024 y 1440; el enlace "Herramientas" de la barra sigue en pantalla al enfocarlo y desplazarse.
10. Sin JavaScript: `#casos` tiene 3 `img` y el texto "Esquema del proyecto"; el pie enlaza "Privacidad" → `/privacidad`; el pie queda pegado al borde inferior.
11. Firma: se conservan las comprobaciones de estados (`static → forming → signature → constellation`) y de `canvas.width === 1` al liberar.

## CSP

Sin scripts en línea salvo el de entrada del hero, renderizado en el servidor con `nonce={await getNonce()}`. Sin orígenes nuevos: fuentes autoalojadas por Next (`font-src 'self'`), lienzos y `HEAD /` en el mismo origen. Ningún `onclick` en atributos.

## Despliegue

Producción corre en el VPS compartido (`portfolio_web` junto a `sicove_*` y `asistencia_*`, 897 MiB de RAM, nginx común en `portfolio_nginx`). Procedimiento, sin tocar nginx ni las bases de datos ajenas:

1. Compilar en un worktree limpio del commit a desplegar (`corepack pnpm@10.33.0 install --frozen-lockfile && pnpm build`), nunca desde el árbol de trabajo con cambios sin confirmar.
2. Empaquetar `.next/standalone`, `.next/static` y `public`; subirlos a `/tmp` del VPS.
3. En el VPS: etiquetar la imagen actual como `portfolio_web:rollback-<fecha>`, extraer el paquete en `~/portfolio`, `docker build -f Dockerfile.prod -t portfolio_web:latest .` y `docker compose --env-file .env up -d --no-deps web` desde `~/portfolio/DOCKER`. Solo se recrea el contenedor web.
4. Verificar: `docker ps`, logs, `curl -I http://127.0.0.1:3000/` en el VPS, `https://nicoholas.dev/` desde fuera, prueba de humo con Playwright contra producción y Lighthouse.
5. Vuelta atrás: `docker tag portfolio_web:rollback-<fecha> portfolio_web:latest && docker compose up -d --no-deps web`.

No hay migraciones de base de datos: el esquema no cambia respecto a `main`.

## Fuera de alcance

- Cambios en `Navbar`, `ClosingSignature`, `FooterSection`, `NoScriptLanding`, el formulario y su API.
- Cambiar `DropCursor`.
- Retirar el código muerto de `src/modules/landing/` (`AboutSection`, `ServicesSection`, `LabSection`, `data/*` sin uso); se anota para otra tarea.
- Cambios de nginx, compose, secretos o bases de datos en el VPS.
