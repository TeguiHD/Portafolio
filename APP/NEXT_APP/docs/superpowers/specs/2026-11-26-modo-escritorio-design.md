# Modo escritorio (/escritorio)

> Reemplazado en lo visual y en la interacción por la versión 2, estilo Windows 11 (`2026-11-26-escritorio-windows-design.md`).
> Sigue valiendo aquí: ventanas como páginas del mismo origen, seguridad del enmarcado, celular y entradas desde el sitio.

26-11-2026. Pedido del dueño: «copiar y mejorar» el modo escritorio de bait.cl, con el clic que suena al presionar y al soltar,
«lo más profesional posible», y «que se sienta más interactivo» tomando mejoras de escritorios web de código abierto. Eligió la
opción B (modo opcional, el sitio normal sigue siendo la entrada) y delegó el resto de las decisiones («toma las decisiones tú»).

## Intención

Que un cliente o empleador recorra el trabajo de otra forma, jugando, sin perder nada del sitio: los proyectos, las herramientas
y las páginas reales, en ventanas. Es una demostración de oficio (gestor de ventanas, audio, accesibilidad) con la identidad
propia del sitio: la materia de partículas, la marca «n.» y los tokens de color.

## Lo que no es

- No copia el código, los sonidos, las imágenes ni el aspecto de bait.cl, ni el código de daedalOS o ryOS: de esos proyectos se
  tomaron ideas de interacción, nada más.
- No reemplaza al sitio ni se indexa (noindex): para buscadores e IA cuentan las páginas normales.
- Sin terminal (el dueño rechazó la terminal con curl el 16-11).

## Decisiones

- **Ventanas = páginas reales.** Cada página pública se abre en un iframe del mismo origen. `TemaInicial` marca `data-ventana`
  en `<html>` si el padre es del mismo origen; `esqueleto.css` esconde barra, pie, migas y botones de buscar; la materia no
  arranca. La página se presenta al escritorio (`window.parent.__escritorio.enlazar`) antes de pintar, para que sus clics suenen,
  Ctrl K abra el inicio y sus enlaces a otras partes del sitio abran su propia ventana.
- **Seguridad.** Las páginas públicas pasan de `frame-ancestors 'none'` a `'self'` (y `X-Frame-Options: SAMEORIGIN`); el panel, el
  portal, el acceso y la API siguen en `'none'`/DENY. La lista está en `src/lib/escritorio/enmarcable.ts` y en `next.config.mjs`.
  `/escritorio` permite la ubicación (`geolocation=(self)`) para que el QR la pueda pedir dentro de su ventana.
- **Vistas propias:** Proyectos (lista + captura real), Herramientas (carpeta por familia con buscador), Configuración (fondo,
  tema, sonido, ordenar íconos) y Atajos de teclado. «Conversemos» abre `/contacto`, la sección de contacto de la portada sola
  (noindex), con el mismo formulario y envío.
- **Barra:** una cápsula flotante abajo, como la barra del sitio al bajar (no la barra de Windows ni el muelle de macOS): «n.»
  (inicio), las ancladas (Proyectos, Herramientas, Conversemos) y las abiertas, y la bandeja (sonido, tema, hora de Santiago).
- **Sonido:** sintetizado con Web Audio, sin archivos. Tres tipos de clic (Suave por defecto, Nítido, Madera), volumen, y por
  separado el clic, las teclas y las ventanas que se abren y se cierran. Encendido con mouse; apagado de fábrica en pantallas
  táctiles. Se guarda en este navegador.
- **Interacción** (ideas de daedalOS y ryOS): ventanas que se arrastran, cambian de tamaño, se encajan al soltarlas en un borde
  (vista previa) y se maximizan arriba o con doble clic; sacudir una ventana minimiza las demás; al pasar por la barra se
  ilumina su ventana; íconos que se arrastran a otra celda y quedan guardados; la materia escribe el nombre de cada ventana
  donde va a aparecer y se sacude al tocar el fondo; recientes en el inicio; sesión de la pestaña y enlace directo
  (`/escritorio?abrir=herramientas/qr`).
- **Encendido** solo la primera vez (la materia firma ~1,7 s, se salta con cualquier tecla o clic), no en cada visita como
  bait.cl. Bloqueo solo si se pide, con la hora de Santiago.
- **Teclado y lectores de pantalla:** íconos como lista con flechas y Enter; Ctrl K; cada ventana es un diálogo no modal con su
  título; el ícono de la ventana se mueve con flechas (Mayúsculas: tamaño) y abre un menú para acoplar, maximizar o cerrar sin
  arrastrar; menús con flechas; los cambios se anuncian en una región viva.
- **Celular:** los íconos son una grilla de inicio, cada ventana ocupa la pantalla y Atrás la cierra (historial).
- **Entradas:** ícono «Modo escritorio» en la barra del sitio (con mouse y en ancho de escritorio) y enlace en el pie.

## Pruebas

`tests/e2e/escritorio-logica.spec.ts` (encaje, límites, rutas) y `tests/e2e/escritorio.spec.ts` (íconos, ventanas con la página
real sin barra, minimizar y restaurar, arrastrar y encajar, teclado y Ctrl K, sonido al presionar y al soltar, tema dentro de
las ventanas, enlaces que abren ventanas, menú del fondo, contacto, celular con Atrás, cabeceras, entradas desde el sitio).

## Queda para después

Las herramientas nuevas inspiradas en bait.cl (finiquito, días hábiles, contraseña filtrada, etc.) van con el rediseño de las
herramientas (proyecto 4) y aparecerán solas en el escritorio porque salen del catálogo.
