# Panel, barra y migas: revisión del 24-11-2026

Aprobado por el dueño el 24-11 («si dale despliega todo»), con dos encargos nuevos: la barra con desplegables se ve mal y el botón se contrae; las migas se montan sobre el marco de partículas (visto en Herramientas).

## Por qué

El sitio tiene que destacar frente a otros portafolios por el detalle. Hoy hay tres errores que se ven en producción, un panel que rompe las reglas de diseño del dueño en varias secciones, y una barra y unas migas que se ven descuidadas en anchos medianos y al bajar.

## Qué se encontró (medido, no supuesto)

- **Barra recogida:** al bajar, la cápsula mide 680 px fijos y su contenido necesita unos 800. El navegador encoge «Hablemos» de 109 a 32 px (queda «Ha»), y el tema queda montado sobre él. Pasa en todos los anchos de 861 px para arriba.
- **Paneles de la barra:** el de Herramientas corta cada descripción a dos líneas a media palabra («descárgal…»). Los paneles se abren solos con solo pasar el cursor; al cruzar la barra se abren y cierran de golpe.
- **Migas y marco:** el marco de partículas pone puntos entre 14 y 83 px de cada borde. Las migas del catálogo están en y = 80, dentro de la franja de arriba. Entre 861 y unos 1300 px de ancho, el contenido empieza en x = 24 y las franjas de los lados pasan por encima de migas, títulos y tarjetas. Las migas además están a tres alturas distintas según la página (80, 96 y 108 px).
- **Panel:** convertidor de moneda siempre en error (su fuente, Frankfurter, no tiene peso chileno); bucle de recargas con avisos apilados en Mensajes (el proveedor de avisos entrega un objeto nuevo en cada render); error de hidratación #418 en Mi perfil (fechas y «hace 5 min» se calculan con la zona y la hora del servidor); «·» entre datos en 25 archivos; fichas con borde y fondo fuera de tablas y gráficos (Clientes, Propuestas, Configuración de Finanzas, Asistente, Contraseña y verificación en Mi perfil); íconos en las severidades de Seguridad; asistente de bienvenida de 4 pasos en Finanzas; el subtítulo de Usuarios con doble espacio.

## Objetivos

1. La cápsula recogida mide lo que su contenido; ningún elemento de la barra se encoge nunca.
2. Los paneles abren con intención (un instante de pausa) y no a cada roce; las descripciones caben en una línea, sin cortes.
3. El marco de partículas vive en los márgenes: no entra en la columna del contenido ni en la fila de las migas. Las migas quedan a la misma altura en las páginas que comparten estructura.
4. Los tres errores del panel, arreglados y con su prueba.
5. Sin «·» en el panel; sin fichas con borde y fondo fuera de tablas y gráficos en las secciones nombradas; Finanzas sin asistente de bienvenida.

## No objetivos

- No se rehacen secciones enteras ni se cambia el esquema de la base.
- No se toca la portada ni la estética «Materia viva» más allá del marco.
- Los emojis de las categorías de Finanzas son contenido: se quedan.

## Enfoques

- **A (elegido): una tanda de arreglos puntuales.** Cada problema se corrige donde está, con una prueba que falla antes. Rápido, con poco riesgo, y deja el panel coherente con «Mi perfil» y «Hoy».
- **B: rediseñar sección por sección como «Mi perfil».** Mejor resultado por sección, pero semanas de trabajo; el dueño eligió A.

## Cómo (decidido)

- **Barra:** la cápsula recogida toma el ancho de su contenido (`width: max-content` con `max-width` de la pantalla, animado con `interpolate-size` donde exista); los hijos de la barra no se encogen; en la cápsula, los enlaces van con menos relleno lateral.
- **Paneles:** se abren tras ~150 ms con el cursor encima y se cierran ~200 ms después de salir (el clic sigue abriendo al instante). Cada herramienta del menú lleva una frase corta propia (≤ 44 caracteres), escrita a mano y fiel a su descripción; la prueba del menú pasa a comprobar slug, nombre y largo, y la de la barra que ninguna descripción del panel pase de una línea.
- **Marco:** la posición de cada punto del marco sale de una función pura (`destinoMarco`) que limita la franja de los lados al margen libre junto a la columna de 1180 px y la de arriba a menos de 64 px. Las migas del catálogo bajan a la altura de las demás páginas con la misma estructura (96 px).
- **Convertidor:** para pares con CLP se usan el dólar y el euro del día de mindicador.cl (la misma fuente de la herramienta UF/UTM); los demás pares siguen con Frankfurter. El error se muestra como texto, no en una caja.
- **Avisos:** el valor del proveedor se memoriza (`useMemo`) y sus funciones son estables.
- **Mi perfil:** fechas con `timeZone: "America/Santiago"`; el tiempo relativo se calcula después de montar.
- **«·»:** comas o la preposición que corresponda («Propuesta 2026-801 para Empresa Ficticia»); los «·» decorativos se quitan y el espacio lo da el diseño. Una prueba sin navegador recorre el código del panel.
- **Fichas → filas:** Clientes y Propuestas en lista con líneas finas; Configuración y Asistente como secciones con título y una línea arriba; Contraseña y verificación en Mi perfil igual; severidades de Seguridad sin íconos.
- **Finanzas sin datos:** un estado vacío con una frase y el botón «Crea tu primera cuenta».

## Lo que queda al constructor

Textos exactos de las frases cortas del menú y de los estados vacíos (fieles a lo que hace cada cosa, sin inventar), y el detalle visual de cada lista, siguiendo `pruebas/reglas-panel.md`.
