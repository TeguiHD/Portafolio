# Catálogo de /herramientas: diseño

Fecha: 2026-11-21 · Estado: aprobado en conversación («si me parece, pero en QR, no agregues texto IA»).

## Intención

/herramientas repetía la esfera giratoria de la portada: para quien viene a usar una herramienta es un obstáculo, y
se ve menos profesional. El catálogo debe parecerse al de los sitios grandes de utilidades: directo a las
herramientas, las más usadas primero y el resto siempre a mano, sin perder las que se usan poco.

Referencias revisadas el 21-11-2026: Smallpdf (lista plana «All Smallpdf Tools»), iLovePDF (pestañas por familia,
etiqueta «New!»), Adobe Express (carruseles por tipo con «View All»), TinyWow (buscador arriba, «Our Most Popular
Tools»). Patrón común: sin animación de entrada, familias como eje, nombre + una línea, sin contadores de uso.

## Objetivos

- Quitar la esfera (`<Herramientas pagina />`) de /herramientas. En la portada se queda.
- Cabecera sobria: h1 «Herramientas.», una línea y el buscador.
- Bloque de 6 destacadas con más peso visual que la lista, ordenado por uso real cuando haya datos.
- Debajo, familias como pestañas y la lista completa en filas.
- Las poco usadas siguen visibles: lista completa por familia, etiqueta «Nueva» cuando corresponda y, dentro de cada
  herramienta, «También te puede servir» con 3 relacionadas por flujo de trabajo.
- Reescribir las 29 descripciones de una línea en lenguaje llano y comprobable, sin relleno.

## No objetivos

- Rediseñar la interfaz de cada herramienta: es el proyecto siguiente («profesionalizar las herramientas»).
- El panel de administración: va después.
- Mostrar cifras de uso al público.

## Anti-objetivos (fallaría aunque funcione)

- Rotular «Las más usadas» con un orden que no sale de datos.
- Texto con tono de IA: «intuitivo», «control total», «perfecto para», «ideal para SEO», «optimizado», «privacidad
  total», «sin marcas de agua, descarga gratuita». En QR en particular, nada de eso.
- Rótulos en mayúsculas, cajas de aviso, bordes laterales de color, aspecto de kit.
- Que el título de arriba tarde en pintarse (LCP): nada de opacidad 0 en la primera pantalla.

## Enfoques considerados

1. **Ranking por uso real, con orden editorial de respaldo** (elegido). Aprende solo; mientras no haya datos
   suficientes usa el orden del dueño y el rótulo dice «Destacadas», no «Las más usadas».
2. Orden fijo desde el panel (`Tool.sortOrder`). Predecible pero no aprende; queda como respaldo del 1.
3. Orden por visitante (recientes y favoritas). Ya existe en parte y se conserva, pero no sirve al que llega por
   primera vez, que es la mayoría.

## Decisiones

- **Destacadas:** 6 tarjetas (ícono, nombre, una línea). 3 por fila en escritorio, 2 en celular.
- **Fuente del ranking:** `ToolUsage` de los últimos 30 días, contando sesiones distintas por herramienta
  (no eventos), sin tráfico automatizado (agente de usuario con HeadlessChrome, Playwright, bot, crawler, spider).
- **Umbral:** una herramienta entra por datos si tiene al menos 5 sesiones distintas en 30 días. Si las 6 entran por
  datos, el rótulo es «Las más usadas»; si no, los huecos se llenan con el orden editorial y el rótulo es «Destacadas».
- **Orden editorial de respaldo:** el de la portada: qr, quitar-fondo, comprimir-imagen, claves, json, impuestos.
- **«Nueva»:** solo para herramientas publicadas en los últimos 60 días, con la fecha sacada del historial de git
  (primer commit de su carpeta), guardada en el registro. Si ninguna califica, no aparece.
- **Relacionadas:** lista manual de 3 por herramienta en el registro, por flujo (p. ej. quitar fondo → recortar →
  comprimir). Se muestra al final de cada herramienta.
- **Se conservan:** buscador actual (con sinónimos), favoritas, recientes, migas y su JSON-LD, metadatos y conteo.
- **Descripciones:** registro y tabla `Tool` (la base manda sobre el registro); se actualizan las dos.

## Restricciones

- Diseño del sitio: marca «n.», sin kit de IA, poco texto, nada inventado (toda cifra con fuente).
- Patrones de modern-web-guidance de Chrome; reglas de LCP de `feedback_lcp_y_css` (`data-al-cargar` arriba).
- Memoria del PC: compilar y probar en jaula, una tarea pesada a la vez, nunca `next dev`.

## Queda para quien construya

- La consulta del ranking y su caché (la página se regenera cada 10 s; el ranking puede durar más).
- La ubicación de «También te puede servir» (layout común de /herramientas/[slug] o cada página).
- El texto exacto de cada descripción, verificado contra lo que la herramienta hace hoy.
- Pruebas e2e: sin esfera, 6 destacadas, regla del rótulo, filtros por familia, relacionadas en una herramienta y
  descripciones sin las frases vetadas.
