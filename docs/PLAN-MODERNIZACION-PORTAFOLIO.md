# Plan de modernización del portafolio

Fecha: 6 de septiembre de 2026. Estado: planificación completada; primera implementación de actividad y hero realizada en local. Base revisada: rama `ui/tools-overhaul`, HEAD `4e3a40b` y cambios locales existentes. Este documento continúa las decisiones de `mejoras portafolio.txt` y complementa [MEJORAS-PORTAFOLIO.md](../MEJORAS-PORTAFOLIO.md). El avance comprobado se registra en [la entrega de implementación](ENTREGA-MODERNIZACION-2026-09-06.md); los criterios siguientes siguen siendo la referencia del trabajo restante.

## 1. Resultado que buscamos

Modernizar el acabado de la portada, el catálogo y las herramientas, manteniendo reconocibles la identidad, los contenidos y los recorridos actuales. La firma visual será el hero «Llegada desde el fondo»: partículas que forman **Nicoholas Dev** y se abren en constelación. El resto del movimiento acompañará tareas concretas y dejará espacio para leer, explorar proyectos y contactar.

El resultado se juzgará por composición, claridad, respuesta de los controles y funcionamiento en equipos modestos. Las mejoras de tráfico, retención o contratación requieren datos posteriores; no son resultados de esta planificación.

### Decisiones recuperadas del encargo

- Partículas generadas en el navegador, sin vídeos ni secuencias de imágenes descargadas.
- Modernización del acabado y un momento visual protagonista; conservar estructura y orden.
- Alcance confirmado en las respuestas: portada y herramientas. `/sobre-mi` aparece añadido por el asistente anterior: se contempla únicamente para extender los estilos compartidos, sin rediseño editorial independiente.
- Hero elegido: primera coreografía, «Llegada desde el fondo».
- «Viaje en profundidad» se usará como transición breve.
- Reutilizar los prototipos que gustaron al usuario y preparar primero un plan ejecutable.
- Máximo una simulación de partículas activa; detener efectos fuera de pantalla y respetar movimiento reducido.

## 2. Estado comprobado y correcciones al historial

El orden real de [page.tsx](../APP/NEXT_APP/src/app/page.tsx) es:

**Hero → Herramientas → Sistema privado → Proyectos → Tecnologías → Seguridad → Contacto → Footer.**

El historial situaba Proyectos inmediatamente después del hero. Esta planificación utiliza el orden del código y lo conserva.

| Evidencia local | Implicación para el trabajo |
| --- | --- |
| `HeroContent.tsx` renderiza el contenido principal en servidor. | Mantener texto, enlaces y acciones visibles aunque falle la escena. |
| `HeroInteractive.tsx` carga un dashboard y ejecuta escritura animada. `HeroSection.tsx` añade resplandores y anillos. | Sustituir la competencia visual del hero al integrar su nueva firma; no sumar todas las animaciones. |
| `ToolsBeltSection.tsx` muestra seis herramientas; el catálogo contiene 29. | No diseñar una constelación con 29 posiciones supuestamente correspondientes a las tarjetas de portada. |
| `ForbiddenVaultSection.tsx` pasa `isActive={true}` a las tres demos. `RestrictedOverlay` actualiza una línea cada 180 ms. | Las guardias internas de las demos no bastan: necesitan visibilidad real y una política de pausa. |
| `SecurityArchitectureSection.tsx` rota logs cada dos segundos sin comprobar visibilidad. | Detener este trabajo cuando la sección no se ve y etiquetar los datos como demostración. |
| `DeferredLandingSection.tsx` carga secciones progresivamente. | Su altura de placeholder no es una medición de la sección final. Medir saltos y anclas tras cargar. |
| `MotionProvider.tsx` ya usa `reducedMotion="user"`. | Ampliar la política a CSS, canvas y temporizadores; revisar también animaciones de opacidad. |
| `ToolsWorkspace.tsx`, `ImageStudio.tsx` y `ToolPageHeader.tsx` ya existen. | Extender estos componentes antes de crear otra estructura de herramientas. |
| Hay cambios locales de seguridad, administración, cotizaciones e infraestructura. | Mantener trazabilidad del diff de modernización y de sus pruebas. La preparación del despliegue es un frente separado. |

Los prototipos se recuperaron en `.superpowers/brainstorm/1007438-1788658125/content/`: `hero-coreografias.html` y `campos-vivos.html`. La llegada ya se extrajo a `src/modules/landing/motion/scenes/arrival.ts`; el resto continúa como referencia local. Extraer únicamente las escenas elegidas a módulos versionados y conservar su procedencia; no importar el HTML completo, controles de demostración ni variables globales.

### Resultado recuperado del panel anterior

El `journal.jsonl` del workflow `wf_8adca9d0-d8e` contiene cuatro propuestas y once evaluaciones. El archivo está en el directorio local de conversaciones de Claude indicado en el historial. No se ejecutó un panel nuevo en esta revisión.

| Propuesta | Notas recuperadas | Evaluaciones |
| --- | --- | --- |
| Restricción severa | 8; 7,5; 6 | 3 de 3 |
| Rendimiento primero | 7,5; 7; 7 | 3 de 3 |
| Metáfora literal | 7; 7; 7 | 3 de 3 |
| Narrativa continua | 6,5; 6 | 2 de 3 |

Estas notas son opiniones del panel, no mediciones de usuarios o rendimiento. Varias propuestas partían del orden incorrecto. La dirección que sigue es una síntesis nueva: recoge la contención visual y corrige bandas de scroll añadidas, efectos sobre formularios y trabajo que continúa fuera de pantalla.

## 3. Dirección visual y reparto de movimiento

Conservar el fondo oscuro, la tipografía existente y los acentos del proyecto. Usar turquesa para la firma y estados interactivos; reservar naranja para énfasis puntual. Mantener colores de estado con su significado actual. Los fondos luminosos deben quedar detrás de áreas decorativas y permitir que textos y controles mantengan contraste.

| Orden y sección | Tratamiento propuesto | Propósito y límite |
| --- | --- | --- |
| 1. Hero | **A: Llegada desde el fondo.** Escena en el espacio visual derecho; debajo del texto en móvil. | La materia dispersa toma una identidad legible. Reemplaza el dashboard flotante en ese espacio y elimina anillos/glitch/pulsos competidores del hero. H1, propuesta y CTA conservan su jerarquía. |
| 2. Herramientas | Tarjetas con profundidad leve al apuntar, borde y foco claros. Sin escena de partículas. | Facilitar elegir una tarea. Iconos, etiquetas y acciones visibles sin hover; controles utilizables con toque y teclado. |
| 3. Sistema privado | **B: Viaje en profundidad**, limitado al espacio decorativo del encabezado. | Señalar la entrada a la demostración del sistema. Progreso acotado al scroll, sin bandas adicionales de 50–100 vh ni partículas sobre paneles. La transición termina antes de activar las demos. |
| 4. Proyectos | Composición estática con bordes, espaciado y enlaces consistentes. | Las pruebas del trabajo deben dominar. Mantener renderizado en servidor y distinguir sitio público, sistema privado y demo. |
| 5. Tecnologías | Retícula estable; color, borde y breve respuesta al hover/foco. | Mostrar el stack con claridad. No inventar dependencias entre tecnologías para justificar una red animada. |
| 6. Seguridad | **G: Formación**, adaptada a una composición que se ordena una vez y permanece estable. | Representar capas que se organizan. Ubicarla en el diagrama, separada de logs y textos; omitir la dispersión final del prototipo. |
| 7. Contacto | Fondo estático y estados de formulario cuidados. | Concentrar la atención en escribir y enviar. La confirmación de envío aporta la respuesta visual necesaria. |
| 8. Footer | Estático; enlaces y foco legibles. | Cierre claro y navegación secundaria accesible. |

El hero es el único momento dominante. B y G son acentos breves y subordinados. **C: Constelación viva, D: Enjambre orbital, E: Campo de flujo y F: Malla ondulante** quedan como referencias para usos futuros con una necesidad concreta. No se descartan los prototipos ni se añaden escenas por obligación de utilizarlos todos.

### Coreografía del hero

1. El HTML presenta inmediatamente la propuesta, los CTA y una firma estática en el espacio reservado.
2. Cuando el navegador puede mejorar la presentación, la llegada anima durante aproximadamente 1,6 segundos. Se conserva el carácter del prototipo elegido y se comprueba la lectura en el espacio real disponible.
3. El nombre permanece formado y el bucle se detiene. Leer o quedarse quieto no mantiene una simulación activa.
4. Al salir del hero mediante scroll, el progreso abre la constelación. Al parar el scroll, se dibuja el estado final pendiente y se cancela el bucle. Al volver, el progreso se reconstruye sin repetir automáticamente la llegada.
5. Con movimiento reducido, ahorro de datos o efectos pausados, se muestra la composición estática. La identidad también existe como texto HTML.

Conservar scroll nativo, sin fijar la página ni alargar el hero para obligar a ver una animación. Los tiempos son parámetros iniciales de diseño, sujetos a la comparación visual con el prototipo.

## 4. Acabado por componente

| Elemento | Trabajo concreto | Comprobación |
| --- | --- | --- |
| Navegación | Conservar destinos y comportamiento compacto; mantener visible la barra cuando contiene el foco. Revisar cierre del menú con Escape y devolución del foco. | Recorrer todos los enlaces con teclado después de hacer scroll; abrir/cerrar menú móvil sin perder contexto. |
| Botón principal | Unificar altura, padding, icono y respuesta. Elevación máxima de 2 px solo con puntero fino y movimiento permitido. | Estados normal, hover, foco, pulsado, ocupado y deshabilitado; área táctil mínima de 44 × 44 px como criterio del proyecto. |
| Botones secundarios y enlaces | Jerarquía menor, foco visible y texto inequívoco. Evitar `transition-all` cuando basta color, borde u opacidad. | Acciones identificables sin animación; no desplazar contenido al cambiar estados. |
| Tipografía | Mantener fuentes actuales; ajustar escala y longitud de línea. Retirar glitch recurrente del titular. | H1 visible en HTML inicial, sin recortes a 320 px ni con zoom del 200 %. |
| Tarjetas | Bordes y radios consistentes; hover sutil, sin depender de superposiciones para leer contenido necesario. | Ratón, toque y teclado ofrecen las mismas acciones; ningún icono aparece solo al hover. |
| Líneas y separadores | Grosor y contraste estables; animar únicamente el diagrama de seguridad cuando corresponde. | Separación comprensible en estado estático. |
| Entradas y formularios | Etiquetas persistentes, ayuda asociada y mensajes de error próximos al campo. Conservar valores tras un fallo recuperable. | Enviar, corregir, reintentar y navegar sin ratón; estado de envío anunciado sin depender del color. |
| Herramientas | Afinar `ToolsWorkspace`, `ToolPageHeader`, `ImageStudio` y cargas de archivos antes de excepciones por página. | Búsqueda, favoritas, apertura, procesamiento y descarga mantienen su comportamiento. |
| Transiciones | Reutilizar `src/lib/motion.ts`: 150/220/400 ms y curva existente. Entradas breves solo para contenido no crítico. | Sin bloqueos de navegación, sin ocultar contenido útil mientras llega JS y sin movimiento de desplazamiento en modo reducido. |
| Estados vacíos y fallos | Explicar qué ocurrió y ofrecer una acción útil: elegir archivo, limpiar filtro o reintentar. | Probar archivo inválido, almacenamiento bloqueado, error de procesamiento y red interrumpida cuando la herramienta la necesita. |

Los tokens compartidos se aplicarán inicialmente bajo un ámbito público de modernización. El componente `Button` también sirve a administración: evitar cambios globales que alteren sus flujos sin revisión de sus consumidores.

## 5. Arquitectura de movimiento

Extender la infraestructura existente con un controlador de portada. Los nombres siguientes son módulos propuestos, todavía no creados:

- `useMotionActivity`: visibilidad del elemento, pestaña visible, preferencia de movimiento, ahorro de datos y pausa del usuario. Estado inicial conservador durante SSR/hidratación; suscripciones con limpieza completa.
- `LandingMotionController`: registro de escenas, selección de una sola escena activa y un único planificador de frames para partículas. Cambia de escena solo cuando la nueva domina el área visible durante 150 ms; conserva las coordenadas al pausar.
- `scenes/arrival`, `scenes/depth` y `scenes/formation`: módulos independientes con `resize`, `draw` y `dispose`. Se importan bajo demanda; no realizan consultas a API ni necesitan nuevas librerías.
- Un control «Pausar efectos / Activar efectos» accesible. El ajuste explícito de pausa prevalece; la preferencia del sistema por movimiento reducido no se anula silenciosamente. Su aplicación incluye demos y animaciones decorativas de la portada.

El controlador se limita a la portada. Canvas posicionados dentro de su sección evitan problemas de apilamiento con formularios y navegación. Solo se conserva el buffer de la escena activa; al abandonar una sección se libera su memoria gráfica y se utiliza la composición estática. No hace falta mantener tres superficies de pantalla completa para fundirlas.

Las demos existentes participan en la política: `isActive` deriva de visibilidad real y permisos de movimiento. Mientras B ocupa el encabezado del sistema privado, sus demos permanecen estáticas. CSS, `repeat: Infinity`, intervalos y escritura del terminal necesitan guardias explícitas; ocultar con CSS no equivale a detener JavaScript.

La configuración de Motion reduce animaciones de transformación y layout, pero mantiene otras como opacidad. Por eso el proveedor actual no garantiza por sí solo que toda la portada quede quieta. [Documentación de MotionConfig](https://motion.dev/docs/react-motion-config).

`requestIdleCallback` sirve para programar trabajo de baja prioridad y necesita detección de disponibilidad. No es una señal de que el LCP definitivo haya ocurrido; un timeout puede ejecutar trabajo aunque el hilo esté ocupado. Cargar las escenas progresivamente y medir su efecto, sin afirmar que usar idle garantiza el LCP. [MDN: requestIdleCallback](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback).

## 6. Presupuesto y adaptación

Los siguientes valores son **criterios propuestos de aceptación**, no resultados medidos:

| Área | Límite inicial y respuesta |
| --- | --- |
| Simulación | Máximo una escena de partículas activa, cero frames pendientes cuando no hay animación ni scroll por resolver. |
| CPU | Objetivo de coste de actualización y dibujo p95 ≤ 8 ms en el equipo de referencia; evitar tareas nuevas de más de 50 ms atribuibles al efecto. Medir inicialización además de animación. |
| Calidad | DPR máximo 1,5. Reducir densidad y conexiones antes de bajar frecuencia. Si la media del trabajo propio supera 8 ms en dos ventanas consecutivas de 30 muestras, bajar calidad; si supera 16 ms en calidad mínima, pasar a estático. Recuperación al navegar de nuevo, sin oscilación continua. |
| Dispositivos modestos | Empezar con densidad baja en pantallas pequeñas; señales de memoria/CPU, si existen, solo orientan. Ninguna API opcional es requisito de acceso. |
| Memoria gráfica | Presupuesto total inicial de buffers propios: 24 MiB en escritorio y 8 MiB en móvil. Contar canvas visible, buffers y sprites: ancho × alto × DPR² × 4 por superficie RGBA. |
| Transferencia nueva | Objetivo ≤ 35 KiB gzip sumados para controlador y escenas nuevas. Medir chunks de producción; las partículas sí descargan código aunque no descarguen vídeo. |
| Red limitada | Ahorro de datos informado por el navegador: composición estática y sin precarga de escenas. Si esa señal no existe, mantener carga diferida y presupuesto de bytes. |
| Accesibilidad | Movimiento reducido o pausa manual: cero simulaciones y cero temporizadores decorativos; texto y acciones disponibles. |
| Página oculta | Cancelar frames, intervalos decorativos y tareas idle pendientes; reanudar sin saltos de tiempo al regresar. |
| Navegación | Al desmontar: cancelar frames, desconectar observadores, retirar listeners y liberar buffers. |

No usar los «852 fps» del prototipo como frecuencia visible: la frecuencia de `requestAnimationFrame` normalmente sigue la pantalla. Registrar por separado coste de cálculo, frames presentados y condiciones del equipo. [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).

Como objetivos de experiencia real: LCP ≤ 2,5 s, INP ≤ 200 ms y CLS ≤ 0,1 en el percentil 75, separados por móvil y escritorio. Solo datos de campo suficientes permiten declarar su cumplimiento; las pruebas locales detectan regresiones. [Web Vitals](https://web.dev/articles/vitals).

## 7. Ejecución por entregas

Cada entrega termina con un diff revisable, evidencia de los criterios aplicables y actualización del estado. Corregir fallos de la entrega antes de ampliar el alcance.

| Fase | Implementación | Criterio de cierre |
| --- | --- | --- |
| 0. Referencia | Registrar diff previo, capturas de portada completa y herramientas representativas; medir carga y scroll en compilación de producción. Extraer y versionar las escenas elegidas al comenzar su integración. | Comparaciones reproducibles con navegador, viewport, CPU/red, commit y cantidad de ejecuciones. Pruebas previas diferenciadas de las actuales. |
| 1. Base de rendimiento | Crear `useMotionActivity`; aplicarlo a demos, overlays, logs, escritura del hero y bucles decorativos. Incorporar control de pausa. Establecer tokens de interacción acotados a páginas públicas. | Al salir de pantalla o pausar no cambian contadores/logs ni corren animaciones decorativas. Al volver se reanuda una sola vez. Movimiento reducido activo desde carga y durante sesión. |
| 2. Hero | Extraer A y adaptarla al espacio reservado, integrando controlador y carga diferida. Sustituir dashboard y efectos competidores; conservar contenido SSR. | Nombre legible en móvil/escritorio; CTA utilizable durante llegada; llegada finita, progreso por scroll y fallback probados. Presupuestos medidos. |
| 3. Portada | Integrar B en encabezado del sistema y G en diagrama. Afinar seis tarjetas de herramientas, proyectos, tecnologías y contacto. Etiquetar simulaciones visibles como demostraciones. | Máximo una escena; sin competir con demos; orden/anclas iguales; contenido y formulario legibles sin efectos. |
| 4. Herramientas | Aplicar acabado en componentes comunes; después revisar las 29 páginas por familias: imágenes, texto/datos, generadores y cálculos. | Sin desbordamientos; estados de entrada/proceso/salida consistentes; búsqueda, favoritas y descargas sin regresiones. Ninguna escena de portada cargada en estas rutas. |
| 5. Cierre | Ejecutar regresiones completas pertinentes, build y comparación visual/de rendimiento. Actualizar documentación con cifras verificadas y limitaciones. | Entrega local lista para revisar; problemas previos y nuevos distinguidos. Preparación de publicación separada según el frente de seguridad/infraestructura. |

### Primera fase de código, lista para ejecutar

1. Revisar los bucles de `ForbiddenVaultSection.tsx`, `SecurityArchitectureSection.tsx` y `HeroInteractive.tsx`; identificar timers, animaciones CSS y Motion, incluidos overlays y badges.
2. Crear la política compartida y conectar su estado a las tres demos que hoy reciben `isActive={true}`. Cambiar también `RestrictedOverlay` y los efectos infinitos; no basta modificar ese prop.
3. Integrar el control de pausa en la interfaz pública y aplicar cambios de `prefers-reduced-motion` en caliente.
4. Mantener montados los datos de las demos al pausar para evitar reinicios/parpadeos. La pausa debe detener actualizaciones y conservar una composición legible.
5. Probar ciclo visible → fuera de pantalla → visible, pestaña oculta → visible, navegación fuera → regreso y pausa manual. Instrumentar solo los temporizadores del módulo para no confundirlos con tareas de Next.js.
6. Ejecutar TypeScript, lint y regresiones de portada; guardar resultados antes de integrar partículas.

## 8. Validación de la modernización

| Escenario | Evidencia requerida |
| --- | --- |
| Responsive | Capturas de 320, 375, 768, 1024 y 1440 px; móvil horizontal; zoom 200 %. Sin recortes ni scroll horizontal accidental. |
| Teclado y tacto | Foco visible, menú con Escape, navbar accesible tras scroll, acceso a herramientas, pausa y formulario. Objetivos táctiles de 44 × 44 px. |
| Movimiento reducido | Activarlo antes de cargar y cambiarlo en sesión. Cero trabajo decorativo continuo y contenido completo. |
| SSR y fallos | HTML inicial con H1, CTA y proyectos. Bloquear chunk de escena/contexto canvas: el sitio mantiene contenido y enlaces. Comprobar el respaldo sin JS existente. |
| Actividad | Instrumentación del controlador para demostrar máximo una simulación y liberación tras navegar; demos y logs inmóviles al pausar o salir de pantalla. |
| Rendimiento | Al menos tres ejecuciones comparables por condición en build de producción; registrar mediana, dispersión y p95 de trabajo por frame. Escritorio normal y emulación CPU 6×/red limitada; no presentarla como prueba física de Android. |
| Navegadores | Chromium automatizado; Firefox y WebKit si están disponibles. Verificación real posterior en Safari/iOS y un Android de gama media; declarar los entornos no comprobados. |
| Herramientas | Apertura de las 29 rutas y flujos representativos: QR descargado y decodificado, imagen procesada con dimensiones correctas, JSON inválido/válido, regex con límite, favoritas y almacenamiento restringido. Reutilizar pruebas existentes y ampliar solo por riesgos nuevos. |
| SEO | Conservar canonical, metadatos, JSON-LD, enlaces y contenido inicial. Ejecutar auditoría estática y suites SEO al cerrar la integración. |
| Contacto | Validación, fallo recuperable y confirmación con backend simulado en pruebas; no enviar mensajes reales para verificar la interfaz. |

Comandos disponibles, desde `APP/NEXT_APP`, para las fases de implementación:

```sh
pnpm typecheck
pnpm lint
pnpm seo:audit
pnpm exec playwright test tests/e2e/tools-return-visits.spec.ts tests/e2e/tools-studio.spec.ts --workers=2
pnpm seo:e2e
pnpm build
```

Agregar pruebas específicas de actividad de movimiento cuando exista el controlador. La configuración actual de Playwright usa `pnpm dev` o reutiliza un servidor en el puerto 3000: sus resultados funcionales no sustituyen mediciones sobre `pnpm build` y `pnpm start` en un entorno local preparado.

## 9. Frentes que mantienen su propia prioridad

Los casos completos, revisión de afirmaciones comerciales, medición de herramientas y continuidad entre procesadores de imágenes siguen en [MEJORAS-PORTAFOLIO.md](../MEJORAS-PORTAFOLIO.md). Esta modernización no introduce porcentajes de negocio sin fuente ni interpreta datos simulados como resultados reales.

La analítica de utilidad se aborda después de revisar la implementación existente: catálogo → apertura → tarea completada → contacto, sin recoger archivos ni contenido introducido. La publicación y las modificaciones de VPS/seguridad requieren su propia validación del estado acumulado; no son una dependencia para diseñar y probar localmente el acabado.

## 10. Estado de esta entrega

- [x] Recuperar decisiones, prototipos y resultados disponibles del panel.
- [x] Contrastar el historial con la estructura y los bucles del código actual.
- [x] Definir reparto, comportamiento, presupuesto, fases y criterios de cierre.
- [ ] Capturar línea base de navegador y rendimiento de producción.
- [x] Implementar actividad, pausa y acabado compartido inicial.
- [x] Integrar el hero elegido y sus alternativas estáticas.
- [ ] Integrar escenas secundarias y arbitraje entre varias escenas.
- [x] Extender navegación móvil, ciclo de vida AR y comprobar la adaptación inicial de las 29 herramientas.
- [ ] Revisar estados de procesamiento y resultados con archivos reales en todas las herramientas.
- [x] Validar y registrar esta entrega: 123 pruebas, correcciones posteriores comprobadas, build y recorridos de producción.
- [ ] Completar mediciones físicas de AR/rendimiento y preparación conjunta Docker/VPS.

La primera entrega fue de planificación; la continuidad posterior incorporó código y pruebas de aplicación. Se conservan por separado los resultados del 5 y del 6 de septiembre en el documento general. Siguen pendientes las escenas secundarias, mediciones comparativas completas y publicación; no se atribuyen resultados de tráfico ni Core Web Vitals de campo a estas pruebas.

La evidencia de código, pruebas, fuentes SEO/AR y límites de la entrega está en [ENTREGA-MODERNIZACION-2026-09-06.md](ENTREGA-MODERNIZACION-2026-09-06.md). El navbar principal conserva su diseño y animaciones.

## Cambio de ubicación aprobado por el usuario

La propuesta de hero animado queda sustituida por un cierre antes del footer: formación del nombre por scroll y constelación al llegar al pie. `ClosingSignature.tsx` es el componente vigente. El navbar mantiene sus animaciones. Las tarjetas ya incorporan WebP y el contenido de Infraestructura Privada se amplió. La preparación Docker/VPS mantiene los límites descritos en la entrega.
