# Portada viva — entrega del 15 de septiembre de 2026

La página principal de nicoholas.dev pasa del diseño de secciones estáticas al diseño validado en el prototipo "Taller nicoholas.dev" (copia en `docs/superpowers/specs/2026-09-15-portada-prototipo.html`): hero con mesa giratoria de instrumentos reales, cinta de herramientas, mazo de sistemas privados, coverflow de proyectos, órbita de tecnologías, centinela de seguridad, contacto sin tarjetas, fondo vivo y el cursor original de producción. Especificación en `docs/superpowers/specs/2026-09-15-portada-design.md`, plan en `docs/superpowers/plans/2026-09-15-portada.md`, prompt descriptivo en `docs/2026-09-15-portada-prompt.md`. Rama `ui/portada`.

## Qué cambió

- **Nuevo módulo** `src/modules/landing/portada/`: `PortadaMotion` (proveedor; carga GSAP, ScrollTrigger y Lenis desde `motor.ts` en su propio chunk), `nivel.ts` (completo / medio / estático), `FondoVivo` (lienzo de partículas con tres profundidades, auroras por sección, atracción del ratón, ondas de clic, paralaje y uniones), `revelar.ts` e `interaccion.ts` (revelado de cabeceras, imán, inclinación, onda), `EntradaHero` (script con nonce que retiene título y mesa como mucho 700 ms), `hero/` (mesa giratoria V1 con Quitar fondo, Generador de QR, Extractor de paleta y Recortar imagen construidos con los componentes de la mesa de trabajo real, cargados en un chunk aparte), `secciones/` (Mazo, Coverflow, Orbita, Centinela con el Matrix Orb de rareui adaptado) y `datos/`.
- **Firma de cierre nueva** (`portada/secciones/Firma.tsx`): «nicoholas.dev» hecho de partículas muestreadas del propio texto, con repulsión bajo el puntero o el dedo, detonación al clic y un muelle que las devuelve a su letra. Sustituye la escena guiada por el scroll (`ClosingSignature` y `motion/scenes/arrival`, retirados) y la sección pasa de 160 svh a un bloque normal. El bucle solo corre con la sección a la vista y se duerme al asentarse; el nombre queda además en texto para lectores de pantalla, sin lienzo o con los efectos pausados.
- **Cinta de herramientas** con el texto real del sitio, revelado, inclinación y botón magnético; **contacto** sin "Velocidad de ejecución" ni "Calidad industrial".
- **Fuentes** Inter y JetBrains Mono autoalojadas con `next/font` (antes, pila del sistema).
- **Retirados**: HeroDashboard, FloatingDashboard, HeroContent, el HeroSection anterior, ClosingSignature con su escena `arrival`, ForbiddenVaultSection (sus demos siguen en `sections/vault-demos.tsx`), SecurityArchitectureSection, TechnologiesSection, ShowcaseSection y BackgroundManager.
- **Accesibilidad**: tarjetas laterales de la mesa `inert` + `aria-hidden`, menú móvil inerte al cerrarse, contraste del pie a 4,5:1, un solo `h1`, todo lo interactivo con nombre.
- **Presupuesto por dispositivo**: en nivel medio (≤ 4 núcleos, ≤ 4 GB, ancho < 768 px o puntero grueso) el motor de movimiento y la mesa esperan a la primera interacción, el fondo va a 1× y 30 fps con menos partículas, el centinela pierde el desenfoque y el destello animado y el núcleo su sombra; nada anima en estático (movimiento reducido, ahorro de datos, pestaña oculta o «Pausar efectos»).

## Verificación

- `pnpm typecheck`, `pnpm lint` y `pnpm seo:audit` en verde en cada commit.
- Suite de extremo a extremo: **176 pruebas, 0 fallos** (8,3 min) con el contrato nuevo: `portada-base`, `portada-hero`, `portada-cinta`, `portada-mazo`, `portada-casos`, `portada-orbita`, `portada-centinela`, `portada-contacto`, `portada-firma` y `landing-motion` reescrito (firma, pausa persistente, movimiento reducido y ahorro de datos, lienzo no disponible, desbordamientos, foco de la barra, sin JavaScript). Las 9 de `autonomous-defense` necesitan Redis y no corren en local.
- Lighthouse 12 sobre el paquete compilado (`next build`, standalone, servido en local; mediana de tres pasadas móviles):

| | Móvil (Moto G Power simulado, 4G lento) | Escritorio |
|---|---|---|
| Rendimiento | 88 | 98 |
| LCP simulado / observado | 3,8 s / 0,24–0,30 s | 1,0 s / 0,6 s |
| FCP | 1,4 s | 0,4 s |
| TBT | 50 ms | 0 ms |
| CLS | 0 | 0,002 |
| Speed Index | 1,4 s | 1,0 s |
| Accesibilidad | 100 | 100 |
| Buenas prácticas | 96 | 96 |
| SEO | 100 | 100 |

  El elemento LCP es el párrafo del hero y se pinta a los 0,24 s reales; el LCP simulado en móvil queda en 3,8 s porque Lighthouse (Lantern) imputa al LCP todo el JavaScript que empieza a descargarse antes del pintado (React, el runtime de Next y framer-motion, 270 KB comprimidos, compartidos con el resto del sitio). La única marca de buenas prácticas es un 403 de `/api/analytics` propio del entorno local de medición. Producción antes del cambio: móvil 84 (LCP 2,7 s), escritorio 85 (LCP 2,0 s).
- Frames (Playwright, Chromium sin GPU): móvil emulado (Pixel 7, CPU ×4) hero 60 fps sin interacción y mazo 56 fps, centinela 23 fps con todo activo; escritorio 1440 hero 32 fps con fondo, demo y cursor (renderizado por software; con GPU es más fluido), órbita 41, centinela 60. Sin errores de JavaScript.

## Lecciones

- Lantern cuenta como dependencia del LCP cualquier script que empiece antes del pintado: GSAP, Lenis, las demostraciones y el QR van en chunks que se cargan tras hidratar (y en móvil, tras la primera interacción).
- Lenis necesita `html.lenis { scroll-behavior: auto !important }` (el sitio usa `smooth`); sus `scrollTo` programáticos llevan duración explícita.
- Un ScrollTrigger con `pin` mete su recorrido por encima de lo que sigue: cuando la persona ya pasó la sección (llegó por `/#contact`), el coverflow compensa el desplazamiento medido en el DOM, en ambos sentidos.
- Con el servidor de desarrollo los chunks diferidos compilan al vuelo: las pruebas de secciones profundas usan `irASeccion` (vuelve a desplazar hasta que la sección carga).
- Al medir un paquete compilado, el servidor standalone debe reiniciarse con el mismo build: un servidor viejo con assets nuevos sirve una página rota y unas cifras sin valor.

## Despliegue (15 de septiembre de 2026, 15:40 America/Santiago)

- Compilación local en un worktree limpio del commit `182a153` (sin `.env` ni cambios sin confirmar), `BUILD_ID KQicz_yw5NjD6MnfMVOeD`; paquete de 75 MB (`.next/standalone`, `.next/static`, `public`) subido a `/tmp` del VPS.
- En el VPS: la imagen anterior quedó como `portfolio_web:rollback-20260915-1540`; se extrajo el paquete en `~/portfolio`, se reconstruyó `portfolio_web:latest` con `Dockerfile.prod` (solo copia, sin compilar allí) y se recreó únicamente el contenedor `web` con `docker compose --env-file .env up -d --no-deps web`. Nginx, PostgreSQL, Redis, `sicove` y `asistencia` no se tocaron y siguieron en 200 durante y después del cambio.
- Comprobación: contenedor sin reinicios y con 107 MB de memoria; 287 MB disponibles en el VPS y 9,3 GB de disco; `https://nicoholas.dev/` en 200 con CSP con nonce, HSTS y `x-security-version 2.1.0`; prueba de humo con Playwright en escritorio (mesa con cuatro instrumentos, fondo vivo, cursor original, párrafo LCP visible, secciones diferidas cargadas, terminal con las cabeceras reales, contacto sin tarjetas) y en móvil (nivel medio: la mesa y el fondo llegan tras el primer scroll, sin desbordamiento); `/herramientas/quitar-fondo` en 200.
- Lighthouse 12 contra producción (red real desde Chile): móvil 77 y 76 (LCP simulado 5,1–5,3 s, observado 0,7–1,3 s; FCP 2,3 s; TBT 135 ms; CLS 0), escritorio 89 (LCP 1,7 s; TBT 6 ms). Antes del cambio: móvil 84 (LCP 2,7 s), escritorio 85 (LCP 2,0 s). Accesibilidad 100 en ambos; buenas prácticas 74–75 por avisos heredados (script de Cloudflare bloqueado por la CSP, política de permisos, deprecaciones), iguales a los de antes.
- Vuelta atrás, si hiciera falta: `docker tag portfolio_web:rollback-20260915-1540 portfolio_web:latest && cd ~/portfolio/DOCKER && docker compose --env-file .env up -d --no-deps web`.

## Segundo despliegue: la firma interactiva (15 de septiembre de 2026, 19:01 America/Santiago)

- Commit `1cfc260`, `BUILD_ID mV4dVkrxsbjMqf9O_EXde`, compilado en el mismo worktree limpio y verificado antes de subir: las pruebas de la firma y de la base pasan contra el paquete compilado servido en local.
- Mismo camino que la vez anterior: imagen previa guardada como `portfolio_web:rollback-20260915-1901`, paquete extraído en `~/portfolio`, imagen reconstruida con `Dockerfile.prod` y solo el contenedor `web` recreado. `sicove.cl` y `asistencia.nicoholas.dev` en 200 durante y después; nginx, bases de datos y Redis intactos.
- Comprobación en producción: el `BUILD_ID` nuevo sirve sus assets y el anterior ya no; contenedor con 68 MB y cero reinicios; escritorio en nivel completo con la firma de 1087 partículas que se asienta, reacciona al puntero y se dispersa al clic; móvil con 540 partículas, sin desbordamiento y sin atrapar el scroll; sin errores de JavaScript ni respuestas 4xx/5xx propias.
- Vuelta atrás: `docker tag portfolio_web:rollback-20260915-1901 portfolio_web:latest && cd ~/portfolio/DOCKER && docker compose --env-file .env up -d --no-deps web`.

### Lo que enseñó la medición posterior

Lighthouse en escritorio dio 81–83 (antes, en una sola pasada, 89). El desglose descarta la firma y apunta al fondo vivo:

| Escritorio | SI simulado | SI observado | Último cambio visual | LCP observado |
|---|---|---|---|---|
| Antes (1 pasada) | 1,9 s | 1,1 s | 4,8 s | 1,3 s |
| Ahora (3 pasadas) | 6,7–9,0 s | 1,4 s | 9,3–9,5 s | 1,5 s |
| Ahora, con movimiento reducido | 1,3 s | 0,9 s | 1,2 s | — |

El Speed Index simulado depende de cuánto tiempo sigue cambiando la imagen, y lo que cambia es el fondo de partículas: con `prefers-reduced-motion` la misma página puntúa 91. La firma no participa: con la página quieta arriba del todo diez segundos, su sección sigue en `data-estado="pausado"` y su lienzo sin dimensionar. Las métricas de pintado no se movieron (FCP 0,8 s, LCP 1,7 s simulado, TBT 0–10 ms, CLS 0,008) y el móvil quedó igual (74–78 frente a 76–77), porque allí el fondo espera a la primera interacción.

## Tercer despliegue: aire, marca y blog (16 de septiembre de 2026, 00:27 America/Santiago)

Commit `b1112fd`, `BUILD_ID oBFKwdIA79WKsHT-9Am2S`, mismo camino de siempre (imagen anterior guardada como `portfolio_web:rollback-20260915-2056`, solo el contenedor `web` recreado).

- **Portada más compacta**: el aire entre secciones baja de 320–400 px a 80–250 px y la página encoge unos 600 px. El coverflow llena la pantalla que ocupa en vez de dejar hueco arriba y abajo.
- **Órbita**: AWS pasa a su logo oficial (Wikimedia Commons, palabra en blanco sobre el satélite oscuro). Se arreglan tres cosas visibles: el resplandor del nombre lo recortaba en rectángulo la máscara de su propia animación (ahora el brillo va en `filter` sobre el recorte), el nombre pisaba los satélites (ahora vive bajo el anillo, fuera de su paso) y al retirar el puntero el nombre cambiaba de color antes de terminar de salir (ahora el que se pinta sobrevive a la animación).
- **Fuera**, a petición: la lista de prácticas de seguridad con el crédito visible del núcleo (la licencia MIT sigue en `docs/licencias/rareui-matrix-orb.md` y en la cabecera de `matrixOrb.ts`) y los tres chips de contacto.
- **Marca**: favicon nuevo, la «n» de nicoholas con el punto de .dev, legible a 16 px; los iconos de la aplicación instalable pasan a usarlo en vez del cartel «DP Command Center».
- **Blog rehecho** con los tokens de la portada, ahora compartidos en `src/app/tokens.css`. Las noticias se pintan en el servidor y viajan en el HTML (antes la página llegaba vacía), con paginado de doce sobre 36 señales y una ficha de lectura en la misma página. Mercado y GitHub se piden por partes con plazo y memoria, así que una fuente caída ya no deja la sección en error. Se retiran unas 2.500 líneas de interfaz anterior que no se usaban.
- **Peticiones a terceros acotadas**: plazo, tope de tamaño y destino comprobado salto a salto (incluidas las redirecciones) para las URLs que vienen de un feed; el contexto del tiempo deja de enviar la IP de quien visita, en claro, a un servicio externo; la recarga forzada de noticias tiene piso de tiempo; las suscripciones de avisos solo se aceptan hacia los servicios de los navegadores.
- Comprobación en producción: las seis pruebas del blog y las nueve de la portada pasan contra `https://nicoholas.dev`; el blog responde en 0,9 s en caliente; contenedor con 96 MB y cero reinicios; `sicove.cl` y `asistencia` en 200.

### Lo que enseñó este despliegue

`docker compose up -d` se colgó 28 minutos sin decir nada: preguntaba «Volume "docker_uploads_data" exists but doesn't match configuration in compose file. Recreate (data will be lost)?» y, sin terminal, esperaba una respuesta que nunca llegaba. La web siguió sirviendo con el contenedor anterior todo ese rato. Conviene lanzar ese paso con la entrada cerrada (o `nohup … &`) y un `timeout`, y arreglar el desajuste del volumen en el compose para que la pregunta no aparezca.

## Cuarta ronda: rendimiento (16 de septiembre de 2026, 02:07 America/Santiago)

Commit `e8ba3c7`, `BUILD_ID 1PTTTP1crd6H07-Glnpac`. Parte de lo que marcaba PageSpeed: escritorio 67 con 800 ms de bloqueo y 4,4 s de hilo principal.

- **La página se queda quieta si no hay nadie.** Las demostraciones del hero esperan a la primera señal de presencia (mover el puntero, tocar, desplazar o teclear), igual que ya hacían en móvil; el fondo vivo se duerme tras 3,5 s sin interacción y despierta con ella; la flecha de «bajar» hace tres vaivenes en vez de mecerse para siempre. Comprobado en producción: sin tocar nada, dos capturas separadas 2,5 s son idénticas.
- **Menos JavaScript de arranque.** El fundido entre rutas pasa de framer-motion a CSS, con lo que esa biblioteca (42 KB, 30 sin usar) sale del paquete inicial de todas las rutas. El motor de movimiento se carga en el primer hueco libre del hilo principal en vez de justo al hidratar.
- **`experimental.inlineCss` probado y descartado**: con los 358 KB de CSS de la aplicación dentro de cada HTML, el móvil bajaba de 89 a 83 en Lighthouse 13. Queda en fichero, que se cachea.
- Medido en local con Lighthouse 13 sobre el paquete compilado, escritorio pasa de 89 a 98 y su Speed Index de 4,4 s a 0,76 s; el bloqueo total cae a 3 ms en escritorio y 82 ms en móvil.

### Lo que impide llegar a 100

- **Buenas prácticas 92**: las tres auditorías que restan son de Cloudflare, no del sitio. Las deprecaciones (peso 5) vienen de su script de detección de bots (`/cdn-cgi/challenge-platform/scripts/jsd/main.js`); los errores de consola y el panel de problemas (peso 1 cada uno), de su script de ofuscación de correo, que la CSP con `strict-dynamic` bloquea por no llevar nonce. Se quitan desde el panel de Cloudflare: Scrape Shield → Email Address Obfuscation en off, y Security → JavaScript Detections en off. Lo segundo baja un escalón la protección contra bots.
- **Móvil 90**: lo único que resta es el LCP simulado (3,5 s). El párrafo del hero se pinta de verdad a los 265 ms; Lighthouse imputa el JavaScript que empieza antes. Quedan dos piezas gordas: un chunk de 70 KB con 1,9 s de CPU y los 358 KB de CSS que comparten todas las rutas, incluido el panel de administración.

### La caché del contenedor, arreglada

El `EACCES: permission denied, mkdir '/app/.next/cache'` que salía en cada arranque desde hacía meses ya no aparece. La imagen copia como root y el proceso corre como `node`, así que esa carpeta no existía y no se podía crear: cada imagen optimizada se recodificaba en cada petición y la caché de prerenderizado no se escribía nunca. Se creó en caliente en el contenedor y se añadió al `Dockerfile.prod` del VPS (con copia previa) para que venga hecha en la próxima imagen. Confirmado: cero `EACCES` desde el reinicio y la caché de imágenes ya guarda entradas.

### Despliegues: el volumen que colgaba compose

`docker compose up -d` se colgaba en cada despliegue esperando respuesta a «Volume "docker_uploads_data" exists but doesn't match configuration in compose file. Recreate (data will be lost)?». La causa: el proyecto se movió a `~/portfolio` y el `device: ./volumes/uploads` del compose pasó a resolverse a una carpeta vacía, mientras los datos seguían en `/home/teguihd/docker/volumes/uploads`. En el VPS se dejó la ruta absoluta (con copia previa del fichero); ahora el despliegue pasa sin preguntar y el volumen conserva `cv/` y `cv-backups/`.

## Quinta ronda: tacto, marca viva y centinela con las manos (16 de septiembre de 2026, 14:19)

Commit `3ee4b87`, `BUILD_ID TszpRvQwHeOQQ4px-86QC`. Despliegue limpio: con el volumen del compose ya alineado, no hubo pregunta ni cuelgue.

- **El fondo sigue al dedo.** En pantalla táctil escucha `touchmove` aparte, con escuchador pasivo: reacciona también mientras se desplaza la página y no puede interrumpir el desplazamiento.
- **Menos malla en móvil.** El umbral de unión entre partículas va con el ancho de la pantalla (135 px fijos tejían en un móvil una red mucho más tupida que en un portátil), con menos trazos y algo menos de puntos.
- **La firma pierde su cartel**: se descubre sola.
- **La mesa del hero abre con el generador de QR.** El orden y los componentes van por id, no por posición, así que reordenar es una línea en `datos/instrumentos.ts`.
- **El centinela deja de recortarse.** Las etiquetas de los anillos se salían de la sección y la sección las cortaba: el radio se adapta, las dos columnas empiezan en 1100 px y en pantalla estrecha la etiqueta se centra sobre su punto. Verificado de 1600 a 390 px.
- **El centinela se toca.** El anillo y el núcleo se quedan; la petición pasa a ser una ficha que se coge y se empuja hacia dentro. Cada anillo cruzado se enciende y dice qué comprobó, y el que debe frenarla no la deja pasar de su borde: se pone rojo, sale una onda de escudo en SVG y el terminal escribe la respuesta real. La legítima llega al núcleo. La ficha late en reposo para descubrirse; el botón sigue haciendo lo mismo para quien use teclado. Dos pruebas nuevas cubren ambos caminos.
- **El icono de la pestaña, vivo** (`components/brand/FaviconVivo.tsx`): se dibuja en un lienzo, el punto respira y toma el color de la sección que se lee, y si la pestaña deja de verse el icono se apaga y el título pasa a «Aquí te espero · nicoholas.dev». Con movimiento reducido no anima.

## Pendiente y recomendaciones

- **LCP simulado en móvil**: el paquete inicial (React, runtime de Next, framer-motion por `template.tsx` y `MotionProvider`, dos fuentes) pesa 271 KB comprimidos más 88 KB de fuentes; Lighthouse lo imputa entero al LCP aunque el párrafo se pinte a los 0,3 s. Dos mejoras con recorrido: retirar JetBrains Mono de `next/font` (−48 KB; la pila del sistema basta para las etiquetas) y sacar framer-motion del paquete inicial (el fundido de `template.tsx` puede ser CSS), −43 KB.
- **Caché de imágenes en el contenedor**: `Dockerfile.prod` copia como root y ejecuta como `node`, así que `/app/.next/cache` no es escribible y cada imagen optimizada se recodifica en cada petición (error `EACCES` en los logs; las imágenes sirven bien). Arreglo en el VPS: `RUN mkdir -p /app/.next/cache && chown -R node:node /app/.next` antes de `USER node`. Venía de antes.
- **Speed Index en escritorio**: el fondo vivo anima sin parar y eso es lo único que separa un 82 de un 91. Candidato: dormir el fondo tras unos segundos sin interacción (puntero, scroll o tecla lo despiertan), igual que hace la firma. Se nota poco al usar la página y devuelve el Speed Index al rango de 1 s.
- La rama `ui/portada` (que contiene `ui/tools-overhaul` y `seo/overhaul`) no está fusionada en `main`: decidir merge o PR.
