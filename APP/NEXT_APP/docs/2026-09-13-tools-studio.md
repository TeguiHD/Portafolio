# Mejora de portada y herramientas — 13 de septiembre de 2026

La interfaz ahora prioriza el instrumento y la descarga: los editores dejan de empezar con métricas, tarjetas explicativas y una copia de la imagen original. El procesamiento de imágenes continúa en el dispositivo del visitante. No se añadieron dependencias ni servicios de IA en el servidor.

## Cambios

- Portada: texto más breve, nueva composición de herramientas con ilustraciones SVG, comparador interactivo y transición ligada al desplazamiento. La interacción manual toma el control del comparador. Se respetan pausa y movimiento reducido.
- Catálogo: búsqueda más cerca del inicio, categorías con iconos, cuatro herramientas destacadas visualmente, favoritas y las cinco herramientas visitadas más recientemente. El historial solo guarda identificadores de herramientas en el navegador y se puede borrar; no guarda archivos ni contenido.
- Navegación común: encabezados compactos para las 29 herramientas, acceso a búsqueda, Ctrl/⌘ K y Enter para abrir un resultado. AR continúa disponible en QR.
- Carga de imágenes: soltar, seleccionar o pegar con el foco en el área de carga. Se comprueba también la firma WEBP de los contenedores RIFF.
- Quitar fondo: procesamiento automático en un Worker, progreso y tiempo transcurrido, cancelación, comparador, pincel para borrar/restaurar, historial de alfa limitado por memoria, fantasma de restauración, ampliación y fondos de salida. El PNG usa la máscara editada a resolución original; el fantasma solo forma parte de la vista previa. Hay reintento y editor manual si falla el modelo.
- Recortar: lienzo primero, barra de acciones compacta, proporciones, giro, cuadrícula, encaje al sujeto y PNG generado tras los ajustes. El resultado anterior deja de estar disponible al cambiar el encuadre.
- Convertir, comprimir y redimensionar: estudio compartido con controles laterales, original/resultado, información real del tamaño del archivo y exportación automática. Se descartan exportaciones obsoletas y se liberan URLs temporales.
- Favicon: ocho tamaños generados al subir, margen y transparencia ajustables, vista en pestaña y pantalla de inicio, PNG individuales y ZIP con manifest y etiquetas HTML.
- Paleta: extracción automática, selección de colores, HEX/RGB/HSL, armonías y descarga CSS. Imágenes muy estrechas conservan un lienzo de al menos un píxel.
- ICO: generación automática al subir o cambiar tamaños, proporción conservada y errores visibles. Se libera el ImageBitmap incluso si falla el proceso.
- Marca de agua: una vista previa principal, controles compactos de texto/logo, posición y composición; descarga arriba y bloqueo de exportación cuando falta la marca. El texto dibujado admite Unicode.
- JSON: controles SVG, abrir archivo, ejemplo, copiar y descargar, errores accesibles y tratamiento de documentos grandes sin generar miles de elementos para colorear cada token. El conteo de estructuras evita la recursión.
- Corrección compartida: `drawableWidth` y `drawableHeight` usaban una llamada recursiva para HTMLImageElement. Ahora consultan sus dimensiones naturales.

## Verificación

- `pnpm lint`, `pnpm typecheck`, `pnpm seo:audit` y `pnpm build`.
- 69 pruebas existentes de SEO.
- 11 pruebas existentes de navegación, favoritas, QR, AR y Base64.
- 8 pruebas existentes de portada y movimiento.
- 12 pruebas nuevas en `tests/e2e/tools-modern-workflows.spec.ts`: lectura del contenido descargado, dimensiones reales de PNG, estructura de ICO, archivos y manifest del ZIP, píxeles de pincel y marca de agua, persistencia tras redimensionar, recuperación ante error, recientes, pegado y CSS de paleta.
- Prueba adicional de inferencia real de IMG.LY en Chromium: resultado generado automáticamente y sin excepciones JavaScript. Las pruebas automatizadas del editor manual simulan un fallo de descarga del modelo para ser reproducibles.
- Revisión visual en escritorio y móvil; pruebas de adaptación de 375, 768, 1024 y 1440 píxeles.

## Alcance y límites

Los cambios están en el código local, sin despliegue. Se conservaron los cambios previos de administración, seguridad, configuración e infraestructura.

La base de datos local no estaba disponible: Next completó la compilación usando el catálogo público de respaldo existente. No se verificaron operaciones administrativas ni persistencia en la base de datos.

La primera inferencia requiere descargar los recursos del modelo existente. Su resultado y duración dependen de la imagen y del dispositivo. Los navegadores sin Worker/OffscreenCanvas usan el modo compatible; no se verificó en hardware móvil físico ni Safari. No se cambió el modelo ni su licencia.

Las ilustraciones de portada y catálogo son demostraciones visuales. El procesamiento de archivos ocurre dentro de cada herramienta.
