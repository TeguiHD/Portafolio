# Modo escritorio, versión 2: estilo Windows 11

26-11-2026. Reemplaza la parte visual y de interacción de `2026-11-26-modo-escritorio-design.md` (la versión 1 sigue valiendo en
seguridad, ventanas como páginas del mismo origen, celular y entradas desde el sitio).

## Por qué

El dueño probó la versión 1 en producción y dijo: «no me gusta como integra las herramientas, no se parece por ejemplo a windows
que la gran cantidad de personas lo usan, las herramientas se abren como navegador y no integrado al SO; además los sonidos de
clic, fondos de pantalla y las secciones no lo siento tan pulido como un SO. Analiza y mejora todo. El sonido de clic me gusta el
que tiene bait.cl». Aprobó la propuesta «estilo Windows 11 con la marca n.» (opción recomendada, 26-11).

Éxito: alguien que usa Windows entra y sabe usarlo sin pensar; cada herramienta se siente una app instalada; el clic suena como
un mouse de verdad; los fondos y las apps se ven terminados.

## Diagnóstico de la versión 1

- Las herramientas abren la página completa en un marco: portada con título grande, texto de venta, preguntas frecuentes y la
  dirección en la barra de la ventana. bait.cl hace lo mismo (lo revisamos: iframe a /herramientas/ ocultando cabecera y pie).
- Barra flotante tipo cápsula, inicio propio, íconos con siglas: no se parece a Windows.
- Clic: el «Suave» es un golpe grave (ruido a 1,9 kHz más tono de 165 Hz). El de bait.cl (`sonidos/clic.mp3`, grabación de un
  mouse) es seco y agudo: golpe de ~8 ms con el centroide cerca de 8 kHz, energía entre 4 y 11 kHz, un golpe sordo bajo de
  75–150 Hz unos 15 dB abajo y dos o tres rebotes del resorte entre 10 y 30 ms; el de soltar es parecido, algo más agudo y más
  suave (bait lo toca a 0,6 contra 0,9). Su tecleo (`teclas.mp3`) es un teclado mecánico: golpe de 80–200 Hz, choque de
  1,2–3,6 kHz y chasquido de 5–10 kHz.
- Los cuatro fondos son la misma materia de partículas.
- Las secciones son páginas del sitio en ventanas, no apps.

## Lo que no es

- No copia el archivo de sonido de bait.cl (es su grabación, sin licencia): se mide y se fabrica uno propio con síntesis.
- No usa el logo, los fondos, los íconos ni la fuente de Windows: se copian las convenciones (dónde está cada cosa y cómo se
  usa), no la propiedad de Microsoft. La marca es «n.».
- Sin terminal (rechazada el 16-11). Sin papelera ni «Este equipo» de adorno: cada ícono abre algo real.

## Diseño

### Escritorio (Windows 11)

- **Barra de tareas** de 48 px, de borde a borde, acrílica (translúcida con desenfoque). Al centro: inicio «n.», buscar, las
  ancladas (Explorador, Herramientas, Correo, Noticias) y las abiertas, con la rayita de «abierta» y la más ancha de «activa».
  A la izquierda, el clima real de Santiago (abre Widgets). A la derecha: red (en línea o sin conexión, de verdad), volumen
  (abre la configuración rápida), hora y fecha (abre calendario y notificaciones) y la franja de «mostrar escritorio».
  Clic derecho en un botón: anclar o desanclar y cerrar. Opción en Configuración: íconos al centro o a la izquierda.
- **Inicio**: buscador arriba; «Anclado» (grilla de 6 columnas); «Todas las apps» (lista alfabética con letras); «Recomendado»
  (lo último que abrió la persona; si no hay, sugerencias). Abajo, «Visitante» y apagado: Bloquear, Reiniciar, Volver al sitio.
  Al escribir: «Mejor coincidencia» con su panel (abrir, abrir en el sitio, anclar), luego apps, herramientas, páginas y ajustes.
- **Ventanas**: barra de título con ícono y nombre (sin dirección), minimizar, maximizar y cerrar a la derecha (cerrar en rojo
  al pasar). Esquinas de 8 px, sombra, título atenuado si no está activa. Al pasar por maximizar aparece el menú de acople
  (mitades, tercios, cuartos y completa). Arrastrar a un borde acopla a la mitad, a una esquina a un cuarto, arriba maximiza.
  Doble clic en el título maximiza. Clic en el ícono de la ventana: su menú (restaurar, minimizar, maximizar, acoplar, abrir en
  una pestaña, acerca de, cerrar). Abrir y cerrar con la animación corta de Windows 11 (escala y transparencia).
- **Íconos del escritorio** en columnas desde arriba a la izquierda, con selección (también con rectángulo arrastrando en el
  fondo, Ctrl y Mayús), arrastre a otra celda, tres tamaños, menú contextual y teclado.
- **Bloqueo**: la primera vez de cada sesión, pantalla de bloqueo con la hora y la fecha de Santiago sobre el fondo; cualquier
  tecla, clic o deslizar la sube. La primera visita de todas muestra antes el encendido («n.» y los puntos girando, ~1,2 s,
  se salta). Al entrar suena el inicio de sesión (si el sonido está activo) y llega la notificación de bienvenida.
- **Notificaciones** abajo a la derecha (ícono y nombre de la app, título, texto, cerrar; se van a los 6 s) y en el panel de
  la hora, con «Borrar todo». Solo cuando hay algo real: bienvenida, mensaje enviado, sin conexión y conexión de vuelta.
- **Configuración rápida**: sonido, tema oscuro, animaciones y no molestar, más el volumen y un acceso a Configuración.

### Apps

- **Herramientas como apps**: cada una abre `/escritorio/app/<slug>` (nueva ruta, noindex, enmarcable solo por el sitio) que
  muestra solo la herramienta: sin cabecera de página, sin texto de venta, sin migas, sin preguntas frecuentes y sin el armazón
  de /herramientas. Llena la ventana y se acomoda a su ancho. Ventana con su ícono y nombre; tamaño según su `ancho` del
  catálogo. «Acerca de» (descripción, dónde se procesa y enlace a la página completa) en el menú de la ventana. Registra la
  visita y las recientes como hoy. Aparecen todas en «Todas las apps», en el buscador y en Explorador › Herramientas.
- **Explorador**: atrás, adelante, subir, dirección con migas, buscar; panel de navegación (Inicio, Escritorio, Proyectos,
  Servicios, Herramientas con sus familias, Documentos); vista de íconos o de detalles; panel de detalles con la vista previa;
  barra de estado. Proyectos: una carpeta por caso con sus capturas (abren en Fotos) y el acceso directo al sitio real.
  Servicios y Documentos (Sobre mí, Cómo se hizo, Índice web chilena, Privacidad, Términos) abren en el Lector.
- **Fotos**: visor de las capturas con anterior y siguiente, ajustar o tamaño real, tira de miniaturas y datos del proyecto.
- **Correo**: «Mensaje nuevo» para escribirme: De (nombre y correo), Para fijo, Mensaje, «¿Cómo llegaste?» y Enviar arriba.
  Usa el mismo envío que el formulario del sitio (mismo endpoint, mismos campos, trampa y tiempo mínimo); el envío se saca a un
  módulo compartido para no duplicar lógica. Al enviar: notificación «Mensaje enviado».
- **Noticias**: los titulares del blog (`/api/pulse/news`) por tema; cada uno abre la fuente en una pestaña nueva. Botón para
  abrir el blog completo en el Lector.
- **Widgets** (panel desde la izquierda): clima de Santiago, indicadores (UF, dólar, bitcoin) y cuatro titulares, con datos de
  las APIs del blog que ya existen.
- **Lector**: las páginas del sitio (servicios, sobre mí, etc.) en una ventana con su ícono y nombre, sin barra ni pie del sitio.
- **Configuración** como la de Windows: Personalización (fondo, modo claro u oscuro, barra de tareas, íconos del escritorio),
  Sonido (activar, volumen, tipo de clic con prueba, clic, teclado, notificaciones e inicio), Accesibilidad (animaciones y
  atajos de teclado) y Acerca de (qué es, con qué está hecho, este equipo: navegador, pantalla, núcleos).

### Íconos

Juego propio en SVG con degradados, estilo de objetos de Windows 11 pero original: carpetas (con emblema por carpeta), correo,
noticias, fotos, configuración, documento, gráfico, perfil, plano, explorador. Cada herramienta: su ícono del catálogo
(`TOOL_ICONS`) sobre una placa con el color de su familia (`COLOR_CATEGORIA`). Los accesos directos llevan su flechita.

### Fondos

Ocho fondos propios generados con un script (lienzo en Chromium, exportado a AVIF y WebP en 1280, 1920 y 2560 px), guardados en
`public/escritorio/fondos/` con el script en `scripts/escritorio/`: Pampa (dunas de Atacama al atardecer), Pacífico (mar de
noche), Cordillera (cerros al amanecer, claro), Austral (aurora), Curvas de nivel (topografía), Grafito (degradado oscuro con
grano), Papel (degradado claro con grano) y Materia (cuadro fijo de la materia). Más «Materia viva» (el motor animado de hoy) y
«Color sólido» (ocho colores). Sin elección, el fondo sigue al tema: Pampa en oscuro, Cordillera en claro. El motor de
partículas solo se carga con «Materia viva».

### Sonido

Síntesis propia, sin archivos, en un módulo puro (`sintesis.ts`, sin DOM, probado en Node):
- **Mouse** (por defecto): modelo de microinterruptor medido contra el de bait.cl: impulso + modos amortiguados entre 4 y
  11 kHz (1–3 ms) + golpe bajo + uno o dos rebotes; soltar más agudo y más suave. Cuatro variantes por golpe.
- **Silencioso** (mouse sin clic: apagado y grave) y **Retro** (mouse de bolita: más cuerpo, 3–5 kHz).
- **Teclado mecánico** al escribir (golpe, choque y chasquido; ocho variantes).
- **Notificación** e **inicio de sesión**: dos o tres notas suaves, propias.
- Sin sonidos de abrir, minimizar y cerrar (Windows no los tiene).
- Activo con mouse, apagado de fábrica en pantallas táctiles (como hoy). Preferencias validadas en `escritorio:sonido`.

### Celular

Igual que hoy en comportamiento (inicio en grilla, cada app a pantalla completa, Atrás cierra), con los íconos, fondos y apps
nuevos.

## Pruebas

Lógica (Node): acople con cuartos y tercios, rutas, árbol del Explorador, carácter del clic (centroide 6–10 kHz, golpe principal
corto, soltar más agudo que presionar), validación de preferencias. Navegador: herramienta como app (sin cabecera ni preguntas,
la herramienta funciona), Explorador hasta una captura en Fotos, buscador del inicio, fondo que se guarda, acople desde el
menú, barra a la izquierda, bloqueo, configuración rápida, Correo (envío interceptado, nunca real), celular con Atrás,
cabeceras de `/escritorio/app/*`. Suite completa y despliegue.

## Decisiones mías (el dueño delegó el cómo)

Windows 11 y no 10 (lo eligió); fuente del sitio y no Segoe; fondo por tema; sin sonidos de ventanas; bloqueo una vez por
sesión; ruta `/escritorio/app/<slug>` que importa la misma página de la herramienta (sin duplicar código); el envío del
formulario a un módulo compartido.
