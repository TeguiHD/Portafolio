# Portada viva — entrega del 15 de septiembre de 2026

La página principal de nicoholas.dev pasa del diseño de secciones estáticas al diseño validado en el prototipo "Taller nicoholas.dev" (copia en `docs/superpowers/specs/2026-09-15-portada-prototipo.html`): hero con mesa giratoria de instrumentos reales, cinta de herramientas, mazo de sistemas privados, coverflow de proyectos, órbita de tecnologías, centinela de seguridad, contacto sin tarjetas, fondo vivo y el cursor original de producción. Especificación en `docs/superpowers/specs/2026-09-15-portada-design.md`, plan en `docs/superpowers/plans/2026-09-15-portada.md`, prompt descriptivo en `docs/2026-09-15-portada-prompt.md`. Rama `ui/portada`.

## Qué cambió

- **Nuevo módulo** `src/modules/landing/portada/`: `PortadaMotion` (proveedor; carga GSAP, ScrollTrigger y Lenis desde `motor.ts` en su propio chunk), `nivel.ts` (completo / medio / estático), `FondoVivo` (lienzo de partículas con tres profundidades, auroras por sección, atracción del ratón, ondas de clic, paralaje y uniones), `revelar.ts` e `interaccion.ts` (revelado de cabeceras, imán, inclinación, onda), `EntradaHero` (script con nonce que retiene título y mesa como mucho 700 ms), `hero/` (mesa giratoria V1 con Quitar fondo, Generador de QR, Extractor de paleta y Recortar imagen construidos con los componentes de la mesa de trabajo real, cargados en un chunk aparte), `secciones/` (Mazo, Coverflow, Orbita, Centinela con el Matrix Orb de rareui adaptado) y `datos/`.
- **Cinta de herramientas** con el texto real del sitio, revelado, inclinación y botón magnético; **contacto** sin "Velocidad de ejecución" ni "Calidad industrial".
- **Fuentes** Inter y JetBrains Mono autoalojadas con `next/font` (antes, pila del sistema).
- **Retirados**: HeroDashboard, FloatingDashboard, HeroContent, el HeroSection anterior, ForbiddenVaultSection (sus demos siguen en `sections/vault-demos.tsx`), SecurityArchitectureSection, TechnologiesSection, ShowcaseSection y BackgroundManager.
- **Accesibilidad**: tarjetas laterales de la mesa `inert` + `aria-hidden`, menú móvil inerte al cerrarse, contraste del pie a 4,5:1, un solo `h1`, todo lo interactivo con nombre.
- **Presupuesto por dispositivo**: en nivel medio (≤ 4 núcleos, ≤ 4 GB, ancho < 768 px o puntero grueso) el motor de movimiento y la mesa esperan a la primera interacción, el fondo va a 1× y 30 fps con menos partículas, el centinela pierde el desenfoque y el destello animado y el núcleo su sombra; nada anima en estático (movimiento reducido, ahorro de datos, pestaña oculta o «Pausar efectos»).

## Verificación

- `pnpm typecheck`, `pnpm lint` y `pnpm seo:audit` en verde en cada commit.
- Suite de extremo a extremo: **176 pruebas, 0 fallos** (8,3 min) con el contrato nuevo: `portada-base`, `portada-hero`, `portada-cinta`, `portada-mazo`, `portada-casos`, `portada-orbita`, `portada-centinela`, `portada-contacto` y `landing-motion` reescrito (firma, pausa persistente, movimiento reducido y ahorro de datos, lienzo no disponible, desbordamientos, foco de la barra, sin JavaScript). Las 9 de `autonomous-defense` necesitan Redis y no corren en local.
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

## Pendiente y recomendaciones

- **LCP simulado en móvil**: el paquete inicial (React, runtime de Next, framer-motion por `template.tsx` y `MotionProvider`, dos fuentes) pesa 271 KB comprimidos más 88 KB de fuentes; Lighthouse lo imputa entero al LCP aunque el párrafo se pinte a los 0,3 s. Dos mejoras con recorrido: retirar JetBrains Mono de `next/font` (−48 KB; la pila del sistema basta para las etiquetas) y sacar framer-motion del paquete inicial (el fundido de `template.tsx` puede ser CSS), −43 KB.
- **Caché de imágenes en el contenedor**: `Dockerfile.prod` copia como root y ejecuta como `node`, así que `/app/.next/cache` no es escribible y cada imagen optimizada se recodifica en cada petición (error `EACCES` en los logs; las imágenes sirven bien). Arreglo en el VPS: `RUN mkdir -p /app/.next/cache && chown -R node:node /app/.next` antes de `USER node`. Venía de antes.
- La rama `ui/portada` (que contiene `ui/tools-overhaul` y `seo/overhaul`) no está fusionada en `main`: decidir merge o PR.
