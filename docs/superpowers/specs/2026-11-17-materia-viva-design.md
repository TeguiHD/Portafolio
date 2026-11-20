# «Materia viva»: llevar el diseño de la portada nueva a toda la plataforma

Fecha: 17-11-2026 · Estado: **alcance confirmado por el dueño el 17-11-2026**

## Intención

nicoholas.dev existe para que un cliente o un empleador confíe en Nicoholas y le escriba. La portada
nueva se diseñó como maqueta entre el 16 y el 17 de noviembre y el dueño la aprobó en lo esencial
(«me encantó bastante más la página»). Ahora hay que construirla en el sitio real y llevar ese mismo
lenguaje al resto de la plataforma.

La maqueta aprobada es la referencia visual y de comportamiento:
`.superpowers/brainstorm/maqueta/` (`base.html`, `partes/`, `fuentes/`; se arma con
`python3 armar.py local`). Ante cualquier duda de aspecto o movimiento, manda la maqueta.

## El lenguaje, en seis reglas

1. **La materia es la protagonista.** Un solo cuerpo de partículas en un lienzo fijo que cambia de
   forma por sección: dibuja lo que se construye, arma las capturas como mosaico, escribe el nombre
   de la herramienta elegida, orbita el llamado a contacto y termina en la firma «nicoholas.dev».
2. **Mostrar, no explicar.** Casi sin texto. Un título, a lo más una línea, y algo que se toca.
   Nada de párrafos de venta, procesos genéricos ni fichas explicativas.
3. **Profundidad por planos:** polvo lejano, cifra enorme en contorno detrás de cada sección, la
   materia, el contenido, y luces desenfocadas por delante. Las secciones se acercan al entrar y se
   alejan al salir. El tema claro logra la profundidad con color y sombras teñidas.
4. **Nada inventado.** Solo datos del código o del sitio en línea (regla que ya existe en
   `casos.ts`). El número real de herramientas es 29.
5. **Sin aspecto de plantilla:** sin rótulos en mayúsculas, sin cajas de aviso con borde lateral,
   sin todo-en-píldoras, sin tarjetas genéricas. Íconos SVG. Español de Chile natural.
6. **Patrones de la plataforma** (guía modern-web-guidance de Google Chrome) antes que JavaScript a
   mano, siempre con respaldo. Nada que se escale lleva `box-shadow` (deja costuras): el brillo va
   con degradados.

## Metas

- La portada real igual a la maqueta: barra fluida, hero con selector y tecnologías, Proyectos con
  mosaico, Herramientas en órbitas, Blog en tambor con fotos, «Conversemos», firma y pie con suelo.
- Un sistema de diseño compartido (variables, tipografía, botones, superficies, movimiento, motor
  de partículas) del que salgan todas las páginas, en tema oscuro y claro.
- Las demás páginas públicas con el mismo lenguaje: `/blog`, `/herramientas` y sus 29 herramientas (por dentro también), `/ar`,
  `/sobre-mi`, `/cotizacion` (portal de clientes), `/acceso`, `/cambiar-clave`, `/privacidad`,
  `/terminos` y las páginas de error.
- Rendimiento medido en cada entrega: el motor no lee el diseño de la página dentro del bucle,
  baja partículas solo si el equipo va lento, y cada página mantiene o mejora sus Core Web Vitals.
- Accesible: foco visible, teclado, contraste AA en ambos temas y `prefers-reduced-motion`.

## Fuera de alcance (por ahora)

- El panel de administración (`/admin`, 21 secciones): proyecto siguiente, con su propio diseño.
- La revisión de seguridad: proyecto aparte. Quedan anotados hallazgos de esta etapa (Cloudflare
  pisa dos cabeceras, la CSP sin `report-to`, los avisos push sin llaves tras la mudanza).
- Recuperar la base de datos de Azure y el respaldo fuera de casa de la base nueva.
- Cambiar la lógica de las herramientas, del blog o del portal: aquí solo cambia su presentación.

## Lo que haría fracasar el trabajo aunque «funcione»

- Que vuelva a llenarse de texto o de tarjetas.
- Que el movimiento se sienta pesado o entrecortado en un equipo normal.
- Que una página pública quede con el diseño viejo y se note el salto.
- Que se pierdan funciones que hoy están en producción (ver «Restricciones»).

## Restricciones

- Next.js 16 (App Router), React 19, TypeScript, Tailwind 4. La CSP usa nonce y `strict-dynamic`:
  nada de scripts en línea sin nonce ni dependencias nuevas sin justificar.
- Producción corre lo que hay en la rama `ui/portada` **más cambios sin commit** del dueño. Hay que
  trabajar encima de eso, sin descartarlo, y compilar como indica
  `~/Documentos/Paginas/portafolio-vm/README.md` (`construir-imagen.sh` + `desplegar.sh`).
- El repositorio es público: nada de secretos, capturas de clientes ni archivos sueltos en la raíz.
- SEO/AEO/GEO: se conservan metadatos, datos estructurados, `llms.txt` y el contenido para
  rastreadores sin JavaScript (`NoScriptLanding`).
- Commits solo cuando el dueño los pida. Desplegar solo con su visto bueno.

## Caminos considerados

1. **Por capas, página a página (elegido).** Primero el sistema de diseño y el esqueleto común
   (variables, motor, barra, pie); después la portada; después cada página pública, una por
   entrega, cada una revisada con capturas en computador y celular y medida antes de seguir.
   Permite desplegar por partes y volver atrás una sola página si algo falla.
2. **Todo de una vez en una rama.** Menos estados intermedios, pero semanas sin poder mostrar ni
   medir nada y un despliegue grande y riesgoso sobre un sitio en producción.
3. **Solo cambiar colores y estilos.** Rápido, pero no trae lo que el dueño aprobó: la materia, la
   profundidad y los componentes nuevos. Descartado.

## Decisiones del dueño (tal como las tomó)

- Dirección «Materia viva»; lo que más le gusta es la firma de partículas.
- El hero no lleva la «n.» grande (se lee «No»). La marca es «nicoholas.dev» con el punto en acento.
- «Cómo trabajo» y la sección de pruebas con terminal no van. El blog se llama «Blog».
- Proyectos: capturas reales armadas por la materia, y se vuelven a armar al regresar.
- Herramientas: sin capturas de su interior; íconos en color por categoría.
- Blog: sin gráficos ni tarjetas; el tambor de titulares le gusta, con la foto de cada uno.
- Barra limpia (marca, tres enlaces, tema, «Hablemos») y fluida. Pie creativo.
- Correo de contacto: `contacto@nicoholas.dev`.

## Decisiones mías (corregibles)

- Orden de las páginas: portada → blog → herramientas (catálogo y la carcasa común de las 29) →
  sobre mí → portal de clientes y acceso → legales y errores.
- El motor de partículas se porta a un módulo propio sin dependencias; GSAP y Lenis se retiran de
  la portada si nada más los usa.
- Los titulares del blog siguen en su idioma original; no se traducen.
- La franja de tecnologías muestra las diez de `tecnologias.ts`.

## Aclaraciones tras la revisión del documento (decisiones mías, corregibles)

- **Referencia aprobada:** la maqueta en su versión 17. El pie fue lo último que cambió y el dueño
  aún no lo comenta; si lo objeta, se ajusta antes de portarlo.
- **Sin producción a medio vestir:** la primera entrega lleva el esqueleto común (variables, barra,
  pie y fondo) a TODAS las páginas públicas a la vez, incluida `/ar`. Después se rehace el
  interior de cada página, una por entrega. Así nunca conviven la barra vieja y la nueva.
- **Cómo se compila:** desde el árbol de trabajo del dueño (rama `ui/portada` con sus cambios sin
  commit y con `APP/NEXT_APP/.env`), `pnpm build` con salida `standalone`; luego
  `construir-imagen.sh` y `desplegar.sh` de `~/Documentos/Paginas/portafolio-vm/`. La vuelta atrás
  es la imagen `portfolio_web:prev` en la VM.
- **Capturas de FloresDyD:** es un sitio público y ya hay una captura suya versionada; se pueden
  usar. La restricción de «capturas de clientes» se refiere a sistemas y documentos privados.

## Respuestas del dueño (17-11-2026)

1. **Contacto:** «sí, conservemos eso de contacto, pero mejorado». El formulario que envía a
   `/api/contact` se queda y se rediseña dentro de «Conversemos» (se abre desde su botón). La
   herramienta dentro del hero, las demos de sistemas privados, «Centinela» y la órbita de
   tecnologías salen de la portada.
2. **Alcance:** «el rediseño completo». Se rehace también el interior de las 29 herramientas, y el
   tema claro y el oscuro valen para todo el sitio público.

Decisión mía sobre el punto 2, corregible: el **documento de propuesta** que firman los clientes
conserva su diseño (el dueño lo aprobó el 22-10-2026 y las propuestas ya publicadas y firmadas no
pueden cambiar). Lo que se rediseña es el portal que lo rodea: acceso, listado, visor y firma.

## Etapas (cada una con su plan, sus maquetas y su despliegue)

1. **Cimientos y portada.** Sistema de diseño, motor de partículas, barra, pie y fondo en todas las
   páginas públicas; la portada completa, con el formulario de contacto mejorado.
2. **Blog.**
3. **Herramientas:** catálogo, carcasa común y el interior de las 29, por familias (imágenes,
   generación, conversión, productividad, seguridad, redes).
4. **Sobre mí, legales y páginas de error.**
5. **Portal de clientes y acceso.**

Después, como proyectos aparte: panel de administración y revisión de seguridad.

## Queda para quien construya

- Cómo se reparten los componentes entre servidor y cliente, y cómo se carga el motor sin afectar
  el LCP.
- El detalle de cada página interior: se propone con una maqueta corta por página antes de
  construirla, igual que se hizo con la portada.
- Las pruebas automáticas (las hay con Vitest y Playwright) que haya que actualizar.
