# Portafolio útil, creíble y con motivos para volver

Revisión funcional inicial: 5 de septiembre de 2026. Continuidad de implementación: 6 de septiembre de 2026. Base: código local de `ui/tools-overhaul` y contexto de `mejoras portafolio.txt`. No se comprobó el estado desplegado ni se consultaron estadísticas reales de audiencia.

## Ajuste de dirección: proyectos y cierre de página

Esta revisión sustituye la ubicación anterior de «Ideas en movimiento» en el hero. La animación ahora cierra la portada, después del contacto: el desplazamiento reúne las partículas, forma «Nicoholas Dev» y abre las conexiones al entrar el footer. La primera vista muestra partículas, no el nombre ya formado. Se mantiene la paleta turquesa, azul y violeta y el navbar existente.

- **Infraestructura Privada:** contenido orientado a las tareas que resuelve cada módulo; descripciones visibles sin hover y distinción explícita entre demostraciones y sistemas privados. La acción invita a conversar sobre un sistema.
- **De la necesidad al producto:** tarjetas con capturas WebP reales de FloresDyD y del catálogo propio. OTEC usa un esquema del alcance, identificado como tal. Imágenes diferidas, proporción reservada y tamaños adaptables; información y enlaces con menos separación interna.
- **Footer:** se elimina el espacio exterior inferior, se sirve directamente en el HTML y se mantiene el espacio del control de pausa dentro de su fondo. Enlaces legales dirigidos a sus rutas definitivas.
- **Movimiento:** dibujo vinculado al scroll, sin reproducción automática del nombre ni bucle continuo. Cierre compacto y estático con movimiento reducido, ahorro de datos o JavaScript deshabilitado.

Validación del ajuste de cierre: siete pruebas específicas, TypeScript, lint y build aprobados. Las tres imágenes y las fases de la animación se comprobaron también en el servidor compilado, sin errores JavaScript observados y sin espacio exterior bajo el footer. Vista previa actualizada: `http://127.0.0.1:3100`.

## Continuidad: modernización visual

El plan ejecutable está en [PLAN-MODERNIZACION-PORTAFOLIO.md](docs/PLAN-MODERNIZACION-PORTAFOLIO.md). Recupera el hero elegido, «Llegada desde el fondo», y define el acabado de portada y herramientas, movimiento por sección, adaptación a dispositivos, fases y criterios de validación.

La revisión del 6 de septiembre confirmó y conservó el orden real: **Hero → Herramientas → Sistema privado → Proyectos → Tecnologías → Seguridad → Contacto → Footer**. Se corrigió la actividad de demos y temporizadores fuera de pantalla y se integró el hero elegido.

Estado: **base de movimiento y hero integrados; continuidad de navegación móvil, QR/AR y contenido SEO implementada**. El historial de `mejoras portafolio.txt` se conserva como referencia. Las escenas secundarias y el resto del acabado del plan siguen pendientes. La preparación conjunta para VPS se registra en [ENTREGA-MODERNIZACION-2026-09-06.md](docs/ENTREGA-MODERNIZACION-2026-09-06.md).

## Implementado el 6 de septiembre

- La coreografía «Llegada desde el fondo» de Claude se extrajo del prototipo a TypeScript versionado, conservando el muestreo de letras, estelas, frenada, paleta y conexiones. Ya se muestra en el hero del sitio.
- La llegada termina al formar el nombre; al hacer scroll se abre la constelación y el dibujo se detiene cuando deja de cambiar. La firma HTML permanece disponible sin JavaScript, con movimiento reducido, ahorro de datos o contexto canvas no disponible.
- Carga diferida del motor, DPR limitado a 1,5, menor densidad inicial en móvil y reducción de calidad según el coste de dibujo. Al abandonar el área visible se cancelan callbacks y se libera el canvas.
- Control «Pausar efectos / Activar efectos» con persistencia durante la sesión. Incluye partículas, demos, logs, fondo ambiental y cursor. El almacenamiento es opcional.
- Las demos conservan su estado al pausar y los duplicados ocultos del diseño móvil/escritorio permanecen inactivos. Se corrige también el temporizador de puntuación del CV, que antes ignoraba `isActive`.
- Las simulaciones del sistema privado y del monitor de seguridad se identifican como demostraciones. Se elimina la etiqueta «EN VIVO» de la demo financiera.
- El hero deja de cargar el dashboard flotante y de ejecutar escritura, glitch, pulsos y anillos simultáneos. Conserva los textos y CTA en servidor.
- Tipografía y controles ajustados para pantallas pequeñas; foco visible compartido con el espacio de herramientas. La barra de navegación permanece accesible cuando contiene el foco; las tarjetas del sistema privado permiten acceder a sus detalles con teclado.
- Se corrige el enlace de solicitud que contenía un botón anidado.

## Continuidad de herramientas, QR/AR y SEO

- Se conserva expresamente el navbar principal y sus animaciones.
- Navegación móvil de herramientas con foco contenido, cierre accesible, fondo inactivo y restauración al cambiar de pantalla.
- Vista AR que puede abrirse y cerrarse; visor 3D con cancelación, tiempos máximos de carga y reintento.
- Guía `/ar` con ejemplo GLB/USDZ, compatibilidad, pasos, seis respuestas visibles, autoría y documentación oficial. Metadatos de página y datos estructurados coherentes con ese contenido.
- Enlaces entre guía y generador; textos que explican qué aloja el QR y de qué depende su disponibilidad.
- Fechas editoriales reales en el sitemap; `llms.txt` tratado como complemento, sin presentarlo como requisito de posicionamiento en IA.
- Ruleta ajustada a 320 px: lienzo proporcional y mensaje inicial dentro del ancho disponible.
- Corrección de la entrada del hero: los textos y CTA no vuelven a ocultarse al reactivar efectos.

## Dirección

Convertir el sitio en un lugar donde desarrolladores, diseñadores y pequeños negocios resuelvan tareas, conozcan quién construyó la solución y puedan contratarlo. Las herramientas atraen por su utilidad; los proyectos documentados aportan confianza; guardar favoritas facilita volver.

## Implementado en la revisión del 5 de septiembre

- La acción principal de la portada abre las herramientas. Se mantienen el contacto y el acceso a la trayectoria.
- Se sustituyen los contadores del hero sin fuente visible (proyectos, uptime y tiempo de respuesta) por enlaces a contenido comprobable dentro del sitio.
- La sección de proyectos usa el alcance documentado en `/sobre-mi`: FloresDyD, la intranet/aula virtual OTEC y las herramientas propias. Distingue sitio público, sistema privado y demo interactiva. Se retiran de esta sección los porcentajes comerciales sin fuente y el enlace a `/projects`.
- Los proyectos se renderizan en servidor, sin depender de desplazamiento, hidratación ni animaciones para aparecer.
- Favoritas con almacenamiento local, filtro propio y sincronización entre pestañas. Se guardan solo identificadores de herramientas, no archivos ni datos introducidos. El sitio sigue funcionando si el almacenamiento está bloqueado o dañado; en ese caso informa de la limitación.
- Búsqueda tolerante a tildes y ampliada a nombres, descripciones, categorías y slugs.
- Tres recorridos con enlaces ordenados: preparar imágenes, crear un QR para un negocio y revisar datos/expresiones. Son instrucciones de uso; no transfieren archivos automáticamente entre herramientas.
- El buscador y las favoritas aparecen antes de los recorridos para facilitar el acceso recurrente, especialmente en móvil.
- El catálogo identifica al desarrollador y conecta la utilidad gratuita con el contacto para un proyecto a medida.

## Siguientes mejoras por prioridad

| Prioridad | Trabajo | Criterio para considerarlo terminado |
| --- | --- | --- |
| 1 | Preparar y publicar la rama existente tras revisar sus cambios de seguridad e infraestructura | Pruebas de producción, herramientas accesibles y posibilidad de volver a la versión anterior. Esta revisión no despliega ni fusiona ramas. |
| 2 | Documentar dos casos completos con material autorizado | Problema, participación personal, decisiones, capturas o demo y límites. Para cada cifra: fuente, periodo y cálculo. No presentar un sitio público como prueba de ventas. |
| 3 | Revisar el resto de afirmaciones comerciales | Revisar textos antiguos, demos del dashboard y datos de casos que aún viven en otros archivos. Una demo debe identificarse como tal; un testimonio debe tener autorización. |
| 4 | Elegir tres herramientas principales a partir del uso real | Comprobar qué tareas se completan, dónde aparecen errores y cuáles generan visitas recurrentes antes de ampliar el catálogo. |
| 5 | Crear una guía práctica por herramienta prioritaria | Ejemplo propio, entrada, resultado descargable, límites y enlace directo a probarlo. Por ejemplo: QR de WhatsApp para un negocio e imágenes optimizadas para una tienda. |
| 6 | Mejorar continuidad entre herramientas | Transferencia opcional de una imagen de recortar a redimensionar o comprimir, con controles de memoria y borrado. Hoy los recorridos solo enlazan herramientas independientes. |
| 7 | Distribuir donde la tarea ya se necesita | Preparar demostraciones y guías para comunidades relevantes y perfiles propios. Obtener menciones por utilidad real. La publicación de mensajes no está incluida en esta revisión. |

## Cómo comprobar si funciona

No hay una línea base de tráfico, uso o contactos verificada en este trabajo. No atribuir crecimiento a estos cambios sin medirlo.

Antes de añadir seguimiento, revisar la analítica existente y su configuración de privacidad. Comparar ventanas equivalentes y distinguir: visitas al catálogo, aperturas de herramientas, tareas completadas y contactos enviados. Una descarga válida o una conversión completada dice más sobre utilidad que una visita aislada. Los errores de procesamiento también deben ser visibles para quien mantiene el producto.

No enviar a analítica contraseñas, contenido de QR, tokens JWT, imágenes, archivos ni valores de formularios. Las favoritas locales no crean por sí mismas una medida de retención; no afirmar que aumentaron los usuarios recurrentes sin evidencia adicional.

## SEO, AEO y GEO

La base técnica existente es valiosa, pero no garantiza aparecer primero. Google mantiene las prácticas de SEO como base para sus funciones de IA; no exige un marcado especial para ellas. La prioridad editorial es ayudar a completar la tarea y explicar de dónde sale la información.

- [Google: contenido útil y fiable](https://developers.google.com/search/docs/fundamentals/creating-helpful-content): utilidad, autoría, fuentes y experiencia demostrable. No existe una longitud de texto preferida por Google; las ~500 palabras del contexto anterior son una decisión editorial, no una condición de posicionamiento.
- [Google: funciones de IA y sitios web](https://developers.google.com/search/docs/appearance/ai-features): indexación, contenido accesible, enlaces internos y datos estructurados coherentes con el contenido visible. La inclusión no está garantizada.

## Validación de la revisión del 5 de septiembre

- TypeScript y lint sin errores.
- Auditoría SEO estática: 29 herramientas, cero problemas.
- 23 pruebas de navegador aprobadas: favoritas, persistencia, sincronización, almacenamiento restringido/dañado, búsqueda sin tildes, proyectos en HTML inicial y regresiones de enlaces, encabezados y contenido para crawlers.
- Adaptación comprobada a 375, 768, 1024 y 1440 px, sin desbordamiento horizontal en el catálogo y con botones de favoritas de al menos 44 × 44 px.

Las pruebas locales no equivalen a mediciones de Core Web Vitals en producción, crecimiento de audiencia ni auditoría independiente de resultados comerciales.

## Validación del 6 de septiembre

- TypeScript y lint sin errores; auditoría SEO estática: 29 herramientas, cero problemas.
- 87 pruebas Chromium aprobadas: movimiento, favoritas, espacio de herramientas y las siete suites SEO. Tras incorporar fondo y cursor a la pausa, se repitieron las siete pruebas de movimiento: aprobadas.
- Las pruebas verifican llegada finita, respuesta al scroll, pausa persistente, canvas liberado fuera de pantalla, movimiento reducido en caliente, ahorro de datos, canvas no disponible, demos detenidas, duplicados ocultos, teclado y contenido sin JavaScript.
- Portada sin desbordamiento horizontal a 320, 375, 768, 1024 y 1440 px. Inspección de capturas en escritorio y móvil; sin errores JavaScript en esa comprobación.
- Compilación de producción aprobada y seis rutas principales con HTTP 200 en el servidor compilado. PostgreSQL y Redis locales no estaban disponibles: se utilizaron los respaldos existentes, con reintentos; esto no valida el rendimiento ni la integración de esos servicios en el VPS.
- El detalle está en el documento de entrega. No se han medido Core Web Vitals de campo ni se ha desplegado al VPS.

## Validación de la continuidad de herramientas y AR

- 123 pruebas Chromium aprobadas en el barrido conjunto; después se reforzó la medición adaptable y se comprobaron las correcciones del panel móvil y la ruleta.
- Las 29 herramientas se revisaron a 320, 375, 768 y 1440 px, incluyendo el ancho del cuerpo sin el ocultamiento horizontal global. Se corrigió el desbordamiento encontrado en la ruleta.
- Panel móvil: foco, cierre, scroll efectivamente bloqueado y cambio a escritorio. AR: cierre/reapertura de vista incrustada, cancelación y foco del visor, guía visible sin JavaScript y coherencia de sus seis respuestas con JSON-LD.
- TypeScript, lint y auditoría SEO aprobados. Las pruebas locales usan el respaldo existente sin Redis; no se cambió `.env`.
- Detalles y límites en [la entrega de modernización](docs/ENTREGA-MODERNIZACION-2026-09-06.md). La colocación AR en dispositivos físicos, los Core Web Vitals de campo y la integración Docker/VPS siguen pendientes.

Build final aprobado y servidor compilado comprobado en seis rutas, incluyendo la guía AR y la ruleta. Hero, menú móvil, cancelación del visor y adaptación de esas rutas funcionan sin errores JavaScript observados. Vista previa local de esta compilación: `http://127.0.0.1:3100`. PostgreSQL no está disponible en el entorno: el build utilizó los metadatos de respaldo.

## QR con realidad aumentada: recorrido nativo

Se prioriza «Ver en mi espacio» antes de la vista 3D. El QR abre la experiencia; Quick Look en iPhone/iPad o Scene Viewer en Android colocan el modelo en el entorno para verlo desde diferentes ángulos al mover la cámara. Se corrigió el enlace Quick Look, se contempló iPad en modo escritorio y se añadió elección manual de dispositivo. La previsualización se identifica como «Vista 3D sin cámara».

47 pruebas de navegador aprobadas, incluyendo lanzadores, QR, guía de siete respuestas, aislamiento CSP y adaptación. TypeScript y lint aprobados. La prueba física del anclaje necesita un móvil compatible y una dirección accesible desde él; `127.0.0.1` de la vista previa no sirve para escanear desde otro equipo. Instrucciones y fuentes en [la entrega](docs/ENTREGA-MODERNIZACION-2026-09-06.md).

Ajustes visuales menores conservados: título «Herramientas» sin «de Producción» y retirada de las tres etiquetas secundarias del hero.

Build del recorrido AR aprobado; comprobación del servidor compilado completada para Android/iOS, guía y generación del ejemplo. Vista previa: `http://127.0.0.1:3100/herramientas/qr?tipo=ar`. La cámara y el anclaje físico siguen pendientes de comprobar en un móvil real.

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
