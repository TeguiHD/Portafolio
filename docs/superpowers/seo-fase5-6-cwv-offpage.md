# SEO Fases 5 y 6 — Core Web Vitals y Off-Page

**Fecha:** 2026-08-05
**Rama:** `seo/overhaul`
**Estado:** Fase 5 evaluada y cerrada; Fase 6 es acción humana, aquí queda la guía.

---

## Fase 5 — Core Web Vitals, imágenes y móvil

### Conclusión

El sitio ya está sano para Core Web Vitals **por construcción**. La premisa del
plan original —migrar 29 `<img>` a `next/image`— no aplica a este código, y
forzarla habría empeorado las cosas. Lo que sigue es lo que se verificó y por qué
no hizo falta cambiar código.

### Lo verificado

| Aspecto | Estado | Evidencia |
|---|---|---|
| Viewport móvil | Correcto y con zoom permitido | HTML servido: `<meta name="viewport" content="width=device-width, initial-scale=1">`. Sin `maximum-scale` ni `user-scalable=no`, que serían anti-patrones de accesibilidad. |
| LCP | Texto, no imagen | El hero no carga ninguna imagen: el fondo es un gradiente CSS. El elemento más grande es texto, que pinta de inmediato. |
| Fuentes web | Ninguna | El sitio usa `font-sans` (stack de sistema). No hay descarga de fuentes que bloquee el render ni cause parpadeo. |
| Contenido nuevo en el bundle | Se queda en servidor | Las 1.500 líneas de `tools-copy.ts` y `ToolSeoContent` las consumen solo server components (los 29 `layout.tsx`, `schemas.ts`). Verificado por grafo de imports: ningún `"use client"` los importa. No se envían al navegador. |
| Build de producción | Compila | `pnpm run build` termina con éxito incluyendo todo el contenido de Fase 4. |

### Por qué no se migró a `next/image`

Los 12 `<img>` de las páginas públicas renderizan **contenido que el usuario
acaba de generar en su navegador**: `src={input}`, `src={convertedUrl}`,
`src={resultUrl}`, `src={sourceImage}`. Son URLs `blob:` y `data:`.

`next/image` optimiza imágenes que tú sirves: las redimensiona, las convierte a
AVIF/WebP y las cachea desde tu servidor. No puede hacer nada de eso con un blob
que existe solo en el navegador del usuario y que cambia en cada interacción.
Aplicarlo ahí exige marcar `unoptimized` o configurar patrones remotos, añade una
capa de complejidad y no aporta ni un milisegundo. Es la herramienta equivocada
para este caso.

De los 12, **11 ya tienen `alt`**. El único sin `alt` es un preview decorativo de
4×4 píxeles del logo en `qr/page.tsx:295`; tocarlo obligaría a modificar un
`page.tsx` de herramienta —lo que a lo largo de todas las fases se evitó para no
arriesgar los widgets— a cambio de accesibilidad casi nula. Queda anotado como
mejora opcional, no como deuda.

### Lo que sí conviene medir en producción

Estas métricas solo son reales sobre el sitio desplegado, con red y CPU reales.
No se pueden obtener fiablemente en este entorno de desarrollo sin Redis ni base
de datos:

1. **Lighthouse móvil** sobre `/`, `/herramientas` y 3 herramientas. Objetivo:
   Performance ≥90, LCP <2,5s, CLS <0,1, INP <200ms.
2. **INP en los widgets pesados** (`esteganografia-imagen`, `quitar-fondo`,
   `marca-agua`). `quitar-fondo` descarga un modelo de varios MB la primera vez;
   eso es coste de interacción, no de carga, y es inherente a lo que hace la
   herramienta.
3. **CLS al subir una imagen** en las herramientas de imagen: el preview aparece
   después de la interacción. Si salta el layout, la solución es reservar altura
   con un contenedor de proporción fija —pero eso vive en los `page.tsx`, que
   están fuera del alcance de este trabajo.

### Deuda registrada (de la revisión de Fase 1, sigue vigente)

- `not-found.tsx` es `"use client"` e importa el registro de herramientas, así que
  su bundle de cliente arrastra ~22 KB. Es la página 404, de tráfico bajo. La
  solución correcta es separar el botón interactivo en su propio componente
  cliente y dejar `not-found.tsx` como server component. No se hizo por ser
  invasivo para el retorno que da.

---

## Fase 6 — Off-Page

Los backlinks no se implementan en código: son gestión humana. Esto es la guía
para ejecutarla.

### 1. Configurar medición primero

Antes de buscar enlaces, instrumenta para saber si funcionan.

- **Google Search Console** — https://search.google.com/search-console
  - Verifica el dominio `nicoholas.dev`.
  - Envía el sitemap: `https://nicoholas.dev/sitemap.xml` (35 URLs).
  - Revisa Cobertura a los pocos días: confirma que las 29 herramientas quedan
    "Indexadas". Si alguna sale como "Rastreada, no indexada", suele ser señal de
    contenido aún percibido como fino —ya no debería pasar tras Fase 4.
- **Bing Webmaster Tools** — https://www.bing.com/webmasters
  - Bing alimenta también a ChatGPT en su búsqueda web. Envía el mismo sitemap.

### 2. Directorios de herramientas donde registrarse

El activo enlazable más fuerte que tienes son las 29 herramientas gratuitas y sin
registro. Los directorios que listan utilidades web dan enlaces reales y tráfico:

- Product Hunt (lanzar la colección de herramientas como un producto).
- AlternativeTo (registrar cada herramienta como alternativa a las de pago).
- Listas de "free dev tools" en GitHub (buscar `awesome` + la categoría y abrir
  un pull request añadiendo la herramienta correspondiente).
- Comunidades hispanohablantes de desarrollo: foros, canales de Discord y
  servidores de universidades chilenas y latinoamericanas.

Regla: registra la **herramienta específica** con su URL propia
(`/herramientas/qr`), no la home. Un enlace a la página exacta que resuelve el
problema del directorio vale más y convierte mejor.

### 3. Contenido enlazable

Cada herramienta con su contenido de Fase 4 (guía, casos de uso, FAQ) es ya una
página a la que otros pueden enlazar como referencia. El FAQ en formato
answer-first está escrito para que un motor de respuesta lo cite: esa cita, con
enlace, es un backlink de alta calidad que no se pidió.

### 4. Plantilla de outreach

Para pedir un enlace a un blog o recurso que trate el tema de una herramienta:

> Asunto: Herramienta gratuita de [tema] para tus lectores
>
> Hola [nombre],
>
> Vi tu artículo sobre [tema] en [URL]. Mantengo una herramienta gratuita y sin
> registro que hace [qué]: [URL de la herramienta]. Corre entera en el navegador,
> así que no sube los archivos de nadie a ningún servidor.
>
> Si te parece útil para quien lea ese artículo, un enlace sería bienvenido. Sin
> compromiso.
>
> [firma]

Lo que hace que funcione: mencionas su contenido concreto, ofreces algo
genuinamente útil y gratis, y no exiges nada. El outreach genérico se ignora; el
específico a veces no.

### 5. Lo que NO hacer

- No comprar enlaces ni usar redes de blogs privadas (PBN): Google las detecta y
  penaliza el dominio, y recuperarse cuesta meses.
- No intercambiar enlaces de forma masiva y artificial.
- No spamear comentarios ni foros con el enlace: daña la reputación y casi todos
  esos enlaces van marcados como `nofollow`, así que no aportan.

Los backlinks buenos son lentos y se ganan. Las 29 herramientas son el motor:
cada persona que encuentra una útil es un enlace potencial, y ese es el trabajo
que las fases 1 a 4 dejaron listo para que empiece a rendir.
