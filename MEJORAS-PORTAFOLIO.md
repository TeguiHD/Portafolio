# Portafolio útil, creíble y con motivos para volver

Revisión: 5 de septiembre de 2026. Base: código local de `ui/tools-overhaul` y contexto de `mejoras portafolio.txt`. No se comprobó el estado desplegado ni se consultaron estadísticas reales de audiencia.

## Dirección

Convertir el sitio en un lugar donde desarrolladores, diseñadores y pequeños negocios resuelvan tareas, conozcan quién construyó la solución y puedan contratarlo. Las herramientas atraen por su utilidad; los proyectos documentados aportan confianza; guardar favoritas facilita volver.

## Implementado en esta revisión

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

## Validación

- TypeScript y lint sin errores.
- Auditoría SEO estática: 29 herramientas, cero problemas.
- 23 pruebas de navegador aprobadas: favoritas, persistencia, sincronización, almacenamiento restringido/dañado, búsqueda sin tildes, proyectos en HTML inicial y regresiones de enlaces, encabezados y contenido para crawlers.
- Adaptación comprobada a 375, 768, 1024 y 1440 px, sin desbordamiento horizontal en el catálogo y con botones de favoritas de al menos 44 × 44 px.

Las pruebas locales no equivalen a mediciones de Core Web Vitals en producción, crecimiento de audiencia ni auditoría independiente de resultados comerciales.
