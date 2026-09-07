# Entrega local de modernización — 6 de septiembre de 2026

**Actualización de dirección:** la coreografía se trasladó del hero al cierre de la página. El detalle vigente está en «Ajuste de proyectos y cierre»; los resultados anteriores se conservan como historial de validación.

Se integró en el portafolio la coreografía elegida durante el trabajo con Claude y se corrigió el trabajo decorativo que seguía ejecutándose fuera de pantalla. El visitante ya puede ver el nombre formarse en partículas, abrir la constelación con scroll y pausar los efectos. La propuesta y los enlaces siguen disponibles sin la escena. Se mantiene el diseño y las animaciones del navbar principal, conforme a la preferencia explícita del usuario.

## Código de esta entrega

| Área | Archivos principales en `APP/NEXT_APP/src` |
| --- | --- |
| Coreografía original extraída y tipada | `modules/landing/motion/scenes/arrival.ts` |
| Preferencias, pausa y visibilidad | `modules/landing/motion/LandingMotionProvider.tsx` |
| Escena diferida y alternativas estáticas | `modules/landing/sections/HeroInteractive.tsx` |
| Composición del hero | `modules/landing/sections/HeroContent.tsx`, `HeroSection.tsx` |
| Demos, logs y tarjetas | `modules/landing/sections/ForbiddenVaultSection.tsx`, `SecurityArchitectureSection.tsx`, `ToolsBeltSection.tsx` |
| Teclado y efectos ambientales | `modules/landing/layout/Navbar.tsx`, `VisualEnhancements.tsx`, `BackgroundManager.tsx` |
| Navegación móvil de herramientas | `components/tools/ToolsWorkspace.tsx` |
| Ruleta en pantallas pequeñas | `app/herramientas/aleatorio/page.tsx` |
| QR y ciclo de vida del visor 3D | `components/qr/ArModelEditor.tsx`, `ModelPreview.tsx`, `lib/ar-demo.ts` |
| Guía AR, respuestas y descubrimiento | `app/ar/page.tsx`, `lib/seo/ar-guide.ts`, `lib/seo/tools-copy.ts`, `lib/seo/tools-content.ts`, `components/seo/ToolSeoContent.tsx`, `app/sitemap.ts`, `app/llms.txt/route.ts` |
| Integración y acabado acotado | `app/page.tsx`, `app/layout.tsx`, `app/globals.css` |

Las pruebas nuevas están en `APP/NEXT_APP/tests/e2e/landing-motion.spec.ts` y `tools-accessibility-ar.spec.ts`. La escena ya no depende del directorio temporal `.superpowers` ni de una sesión de Claude para ejecutarse.

No se añadieron dependencias, APIs, migraciones ni permisos CSP para esta mejora visual. La rama conserva cambios previos en seguridad, cotizaciones, administración y Docker: esta entrega no certifica por sí sola su despliegue conjunto.

## Continuidad de herramientas, AR y contenido

- El panel móvil de herramientas contiene el foco, bloquea el desplazamiento del fondo, permite cerrar con Escape o su botón y devuelve el foco al control de apertura. Al pasar a escritorio restaura la página. El atajo Ctrl/⌘ + K sigue abriendo la búsqueda.
- La vista AR incrustada se puede cerrar y volver a abrir. El visor 3D independiente permite cancelar la carga y desmontar el componente; incluye tiempos máximos para cargar la biblioteca y el modelo, además de reintento.
- `/ar` incorpora pasos, tabla de formatos, seis respuestas visibles, autoría, fuentes oficiales y un ejemplo común GLB/USDZ. El FAQ estructurado utiliza exactamente las mismas respuestas que el HTML. Los enlaces con modelos del usuario siguen excluidos de indexación.
- El generador QR enlaza a la guía y explica la dependencia del visor y del alojamiento. Se evita prometer que un QR de AR seguirá funcionando si esos destinos dejan de existir.
- El sitemap utiliza fechas editoriales conocidas: ya no declara una modificación nueva en cada ejecución. La guía tiene metadatos propios para compartirla. `llms.txt` se mantiene como recurso complementario.
- La ruleta adapta el lienzo y el mensaje inicial al mismo ancho, conservando su proporción; se corrigió un desbordamiento a 320 px que las reglas globales ocultaban.
- Los textos y botones del hero permanecen visibles al pausar y reanudar: se retiró una animación de entrada que podía volver a ocultarlos.

## Comprobaciones de la primera entrega

- `corepack pnpm lint`: aprobado.
- `corepack pnpm typecheck`: aprobado.
- `corepack pnpm seo:audit`: aprobado, 29 herramientas y cero problemas.
- 87 pruebas Chromium aprobadas, incluyendo las suites SEO y los flujos de herramientas/favoritas.
- Siete pruebas de movimiento repetidas tras el ajuste final de efectos ambientales: aprobadas.
- Capturas revisadas a 1440 px y 375 px; ausencia de desbordamiento horizontal verificada en cinco anchos entre 320 y 1440 px.
- `corepack pnpm build`: aprobado, compilación de producción y generación de páginas completadas. Durante la generación hubo avisos `ECONNREFUSED` de PostgreSQL; los metadatos de herramientas utilizaron el respaldo existente.
- Chunk diferido de la coreografía en este build: 11.238 bytes de JavaScript y 5.462 bytes gzip (aproximadamente 5,3 KiB). Es el motor de dibujo; no representa todo el JavaScript de la portada.
- Comprobación sobre el servidor compilado: HTTP 200 en `/`, `/herramientas`, `/herramientas/qr`, `/herramientas/json`, `/herramientas/recortar-imagen` y `/sobre-mi`. Llegada, pausa y reactivación del hero operativas; sin errores JavaScript observados y sin desbordamiento horizontal a 375 px.

Los comandos usan Corepack para respetar `pnpm@10.33.0` del proyecto; el `pnpm` global de esta máquina es anterior. Las suites funcionales se ejecutaron sobre el servidor de desarrollo. El arranque compilado se comprobó por separado en el puerto local 3100. PostgreSQL y Redis no están disponibles en este entorno: los reintentos y respaldos de esa comprobación no permiten extrapolar tiempos de respuesta al VPS.

## Validación de la continuidad

- Barrido de 123 pruebas Chromium aprobado: portada, movimiento, herramientas, favoritas, QR/AR, aislamiento CSP y las siete suites SEO.
- Revisión adicional de las 29 herramientas a 320, 375, 768 y 1440 px, midiendo también el ancho del cuerpo y neutralizando el ocultamiento horizontal global. La medición espera la aplicación de los nuevos media queries. Se corrigió el caso real de la ruleta; las dos comprobaciones finales de ruleta y panel móvil aprobaron.
- Las pruebas del panel comprueban el estilo efectivo del bloqueo de scroll, el foco contenido, Escape y la restauración al pasar a escritorio. La prioridad `!important` de las reglas globales se contempla al bloquear y restaurar ambos contenedores de desplazamiento.
- Cierre y reapertura de la vista incrustada, cancelación del visor independiente y devolución del foco al botón de carga comprobados. La guía conserva sus seis respuestas y el marcado correspondiente sin JavaScript.
- TypeScript y lint aprobados. Auditoría SEO: 29 herramientas, cero problemas.
- Capturas de hero en escritorio/móvil, panel móvil y guía AR inspeccionadas; los textos del hero quedan visibles inmediatamente al reactivar efectos.
- Build final aprobado: compilación en 12,8 s y generación de 113 páginas completadas; persiste el aviso local de PostgreSQL no disponible y se usa el respaldo de metadatos existente.
- Servidor final compilado comprobado en `http://127.0.0.1:3100`: HTTP 200 en `/`, `/herramientas`, `/herramientas/qr`, `/herramientas/aleatorio`, `/ar` y `/sobre-mi`. Sin errores JavaScript en los recorridos revisados. Hero, pausa/reactivación, menú móvil, cancelación del visor, metadatos de la guía y `noindex` para modelos comprobados. QR, ruleta y guía AR sin desbordamiento entre 320 y 1440 px. Resultado guardado en `.playwright-mcp/modernization-production-check.json`.

Este barrido se ejecutó con `REDIS_URL` vacío **solo en el proceso local de pruebas**, usando los respaldos existentes; no se modificó `.env`. Los registros de la continuidad están en `.playwright-mcp/modernization-*.log`. La validación visual cubre los estados revisados, no todas las combinaciones de archivos o datos de las 29 herramientas.

## Criterio SEO, GEO y AEO de esta continuidad

La implementación prioriza páginas rastreables, contenido útil servido en HTML, enlaces internos, autoría y respuestas cuyo marcado coincide con el texto visible. No se añaden valoraciones inventadas ni promesas de citación.

- [Google: funciones de IA](https://developers.google.com/search/docs/appearance/ai-features): las prácticas de SEO siguen siendo la base; no se exige un archivo ni un schema especial para aparecer en esas funciones.
- [Google: construcción del sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): `lastmod` debe reflejar una actualización significativa y verificable.
- [Bing: AI Performance](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview): permite observar citas en experiencias compatibles desde Webmaster Tools. No se ha accedido a una cuenta ni se presentan métricas del sitio.
- Compatibilidad AR contrastada con [Scene Viewer de Google](https://developers.google.com/ar/develop/scene-viewer) y [Quick Look de Apple](https://developer.apple.com/quick-look-gallery/). Las pruebas de escritorio no validan colocación espacial en un iPhone o Android físico.

## Preparación de la entrega conjunta al VPS

1. Revisar el diff acumulado con los cambios de seguridad/cotizaciones existentes; conservar un identificador de versión para el conjunto revisado.
2. Generar la imagen de la aplicación desde ese estado y comprobar sus rutas en un contenedor local. Un build de Next.js valida la aplicación, pero no sustituye la construcción y arranque de la imagen Docker.
3. Confirmar el compose que realmente utiliza el VPS antes de preparar comandos de publicación: `DOCKER/docker-compose.prod.yml` declara PostgreSQL 15/Redis 7, mientras `DOCKER/docker-compose.yml` declara PostgreSQL 18.1/Redis 8. Esa diferencia existe en el repositorio revisado y no se ha resuelto ni aplicado en este trabajo visual.
4. Seguir el frente de despliegue existente en [README-MEJORAS-SEGURIDAD-VPS.md](../README-MEJORAS-SEGURIDAD-VPS.md), verificando la imagen anterior para reversión y la salud de la aplicación tras el cambio.

La incorporación de esta UI no exige modificar los servicios de asistencia o Sicove. No se ha establecido conexión SSH ni publicado cambios durante esta entrega.

## Continuidad visual

Quedan por integrar la transición breve del sistema privado y la formación del diagrama de seguridad, con arbitraje de una sola escena activa. La adaptación inicial de las 29 herramientas está comprobada; queda el repaso detallado de sus estados con archivos y datos reales y la comparación de rendimiento sobre dispositivos reales. Se mantienen en [el plan](PLAN-MODERNIZACION-PORTAFOLIO.md), sin bloquear la revisión de las mejoras que ya funcionan.

No se presentan las pruebas de Chromium como mediciones de FPS en móviles reales, certificación de accesibilidad ni Core Web Vitals de producción.

## Ajuste de proyectos y cierre

Por petición del usuario, `ClosingSignature.tsx` sustituye a `HeroInteractive.tsx`: se retira el panel del hero y se coloca una escena amplia después del contacto, justo antes del footer. El desplazamiento controla toda la formación y la apertura de la constelación. No se requiere esperar una reproducción automática. La escena se mantiene visible con `position: sticky`; la portada usa el documento como contenedor de scroll para que las reglas globales no anulen ese comportamiento.

El footer se renderiza directamente, fuera del contenido principal, y no hay padding exterior debajo. Su espacio interno contempla el botón de pausa. Con movimiento reducido, ahorro de datos o sin JavaScript, el cierre es compacto y muestra una composición estática de puntos y líneas.

Las tarjetas de proyectos incluyen `next/image`, reserva de proporción, carga diferida y tamaños adaptables. `public/images/projects/` contiene tres WebP de 960 × 600: capturas reales de FloresDyD y del catálogo local y una ilustración de alcance OTEC (no una interfaz privada). En conjunto ocupan 76.144 bytes (74,4 KiB). El SVG editable del esquema queda en `scripts/assets/otec-flow.svg`.

Fuentes de las imágenes: portada pública de [FloresDyD](https://floresdyd.cl), capturada el 6 de septiembre de 2026; catálogo local `/herramientas`; esquema OTEC elaborado a partir del alcance ya documentado en `/sobre-mi`. No se ha accedido a la intranet ni se han utilizado datos privados en las imágenes.

Infraestructura Privada explica gestión financiera, revisión de CV y acceso por roles con textos visibles y una nota de demostración. Se conserva la interacción de las demos y se sustituye «Solicitar acceso» por «Conversar sobre un sistema».

Validación de este ajuste: TypeScript y lint aprobados; siete pruebas de movimiento/cierre aprobadas tras la adaptación al nuevo recorrido. También aprobaron las suites de encabezados, datos estructurados, enlaces, contenido sin JavaScript y favoritas ejecutadas durante la revisión. Capturas inspeccionadas en escritorio y móvil, con comprobación de anchos de 320 a 1440 px.

Build de producción aprobado (113 páginas). En el servidor compilado se comprobaron las tres imágenes cargadas, las fases formación → nombre → constelación, la presencia simultánea de escena y footer y la ausencia de espacio exterior bajo el pie (diferencia de redondeo inferior a 1 px). No hubo errores JavaScript en ese recorrido. La base de datos local sigue sin estar disponible y el build usa el respaldo de metadatos existente. Registros: `.playwright-mcp/closing-*.log` y `closing-production-check.json`.

Vista previa actualizada: `http://127.0.0.1:3100`. No se publicó en el VPS.

## QR con colocación y seguimiento del entorno

El recorrido vigente es: **escanear QR → abrir enlace → «Ver en mi espacio» → detectar superficie → colocar y explorar el objeto**. El modelo queda anclado en el entorno y cambia la perspectiva al mover el teléfono. El QR sirve para abrir la experiencia; no funciona como marcador que haya que mantener frente a la cámara.

- `ArLaunchPanel.tsx` prioriza la acción nativa antes de la previsualización, muestra instrucciones y ofrece selección manual del dispositivo cuando la detección no coincide.
- Android conserva Scene Viewer con `mode=ar_preferred` y su URL alternativa. Si el dispositivo no admite AR, el visor puede mostrar solo 3D; la UI lo explica.
- iPhone/iPad utiliza Quick Look con el USDZ. Se corrigió el marcado para que el enlace `rel="ar"` contenga un único `img`, como indica WebKit. La etiqueta visual y accesible dice «Ver en mi espacio».
- La detección cliente contempla iPadOS con agente Macintosh y pantalla multitáctil. Es una ayuda de detección, no una certificación de compatibilidad; queda disponible la elección manual.
- La vista del navegador se identifica como «Vista 3D sin cámara», sigue cargándose a solicitud y conserva su cierre/reintento. No se implementó un motor SLAM propio ni se añadieron permisos de cámara al iframe del editor: el seguimiento espacial lo realizan los visores nativos.
- El editor explica el recorrido y distingue los requisitos GLB/Android y USDZ/iOS. La guía añade una séptima respuesta sobre anclaje y movimiento, compartida con su JSON-LD.
- El QR de transferencia a móvil tiene fondo blanco y margen de cuatro módulos.

Fuentes: [Google Scene Viewer](https://developers.google.com/ar/develop/scene-viewer), [WebKit: integración de Quick Look](https://webkit.org/blog/8421/viewing-augmented-reality-assets-in-safari-for-ios/) y [model-viewer: modos AR](https://modelviewer.dev/examples/augmentedreality/). No hace falta contratar una plataforma WebAR para este recorrido nativo.

### Comprobación pendiente en un teléfono real

1. Servir la versión actual en una dirección HTTPS accesible desde el teléfono. Un QR con `localhost` o `127.0.0.1` apunta al propio dispositivo y no abre el servidor de este equipo. No se publicó al VPS durante esta revisión.
2. En el generador seleccionar Realidad aumentada y «Usar modelo de ejemplo»; incluye GLB y USDZ del mismo astronauta. Descargar o escanear el QR.
3. En Android compatible, abrir el enlace en Chrome y tocar «Ver en mi espacio». En iPhone/iPad, abrirlo en Safari y tocar el mismo botón; si Quick Look muestra Objeto, seleccionar RA.
4. Seguir las indicaciones para detectar una mesa o el suelo, colocar el objeto y mover el teléfono a ambos lados. Confirmar que permanece sobre la superficie y cambia la perspectiva. Ya no es necesario enfocar el QR.
5. Volver al navegador y probar un modelo propio. Su alojamiento debe servir los archivos públicos por HTTPS; para Quick Look, el tipo de contenido USDZ indicado por WebKit es `model/vnd.usdz+zip`. La vista incrustada necesita CORS.

Las pruebas de navegador verifican enlace, formato, instrucciones, detección y comportamiento de la página. No sustituyen la verificación física de cámara, detección de superficies y anclaje. No se invocó la cámara de ningún dispositivo en esta sesión.

Validación del recorrido nativo: 47 pruebas Chromium aprobadas; TypeScript, lint y build aprobados (113 páginas). En producción local se comprobaron los enlaces Android/iOS con sus agentes de usuario, la guía con siete respuestas y la generación del QR de ejemplo, sin errores JavaScript observados en los lanzadores. Esto comprueba la integración web, no la cámara ni el seguimiento físico. Las solicitudes HEAD a los modelos de ejemplo devolvieron 200: GLB de 2.869.044 bytes con `model/gltf-binary` y USDZ de 2.145.297 bytes con `model/vnd.usdz+zip`; ambos permiten CORS. El build conserva los avisos del PostgreSQL local no disponible y utiliza los respaldos existentes.

Vista previa compilada actualizada: `http://127.0.0.1:3100/herramientas/qr?tipo=ar`. La publicación en una dirección accesible al teléfono y la prueba física permanecen pendientes.

## Preferencias visuales vigentes: simplificación y panel del hero

Se eliminan los textos «Ideas en movimiento», «Forma. Código. Producto.» y «Cada idea encuentra su forma. La siguiente puede ser la tuya.» del cierre. La animación permanece justo antes del footer.

Se retiran las tres tarjetas estáticas de descripción de Infraestructura Privada. Se conservan las tarjetas animadas y sus detalles interactivos. Esta decisión sustituye la ampliación de tarjetas descriptivas registrada anteriormente.

El hero conserva únicamente sus dos CTA principales, sin las tres etiquetas secundarias. Se recupera el marco original `FloatingDashboard` en el lado derecho de escritorio mediante `HeroDashboard.tsx`: gráfica de CPU, eventos y servicios, identificado como demo. Su temporizador respeta la pausa, la visibilidad y las preferencias de movimiento; el gráfico no se carga en móvil. El navbar no cambia.

Validación de esta corrección: ocho pruebas específicas aprobadas, TypeScript y lint aprobados, capturas de escritorio revisadas y sin desbordamiento en 320, 375, 768, 1024 y 1440 px. Build nuevo aprobado y vista previa reiniciada en `http://127.0.0.1:3100`. Se comprobó en esa compilación el panel del hero, la ausencia de las etiquetas y tarjetas retiradas, y la constelación inmediatamente antes del footer, sin errores JavaScript observados en el navegador. El servidor local conserva avisos de configuración de autenticación y servicios privados; esta comprobación cubre la página pública.


## Simplificación de herramientas y editor QR

Se elimina la fila «Catálogo / categoría» del espacio de herramientas; queda una sola ruta de navegación por página. La acción de favoritas pasa a una estrella en la barra superior, con nombre accesible y estado seleccionado. Se retira la tarjeta «Quién mantiene esta herramienta» de las 29 herramientas; el footer conserva el enlace al portafolio e incorpora un icono SVG junto al contacto para herramientas personalizadas.

El editor QR muestra cuatro tipos habituales y permite desplegar el resto con «Más tipos», conservando visible la selección. Se retiran las cabeceras numeradas, textos redundantes, el distintivo «QR generado en tu navegador» y la fila de dimensiones/formato/margen. Las opciones de archivo, resolución y corrección se conservan en un desplegable cerrado inicialmente.

El QR y las dos descargas permanecen visibles durante la edición: panel lateral fijo al hacer scroll en escritorio y vista compacta sobre el formulario en móvil. Se corrige el ancestro de desplazamiento que impedía el comportamiento sticky. Las formas muestran muestras SVG con etiquetas y estado seleccionado; los colores tienen selector nativo y entrada hexadecimal editable. La guía queda centrada, con altura compacta al cerrarse y lectura de ancho limitado al abrirse. Se reduce también el texto del editor AR, conservando formatos, validación, atribución y ayuda desplegable.

Validación: 55 pruebas Chromium aprobadas (40,7 s), incluidos los 29 espacios de herramientas, anclaje visual del QR durante la edición a 320/375/768/1024/1440 px, navegación y favoritas, exportación PNG y decodificación, errores recuperables y lanzadores AR. Capturas de escritorio/móvil revisadas; lint y TypeScript aprobados. La verificación de cámara y anclaje AR en un móvil físico continúa pendiente.

Build aprobado y vista compilada reiniciada en `http://127.0.0.1:3100/herramientas/qr`. Se verificaron allí la ruta única, los textos retirados, el QR visible durante la personalización en los cinco anchos y la generación del ejemplo AR, sin errores JavaScript observados en el navegador. Se conservan los avisos locales de autenticación/servicios privados; no se modificó `.env` ni se desplegó al VPS.
