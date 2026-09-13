# Mesa de trabajo en la familia de imágenes — 13 de septiembre de 2026

Las nueve herramientas de imagen adoptan la variante A del prototipo aprobado ("Mesa de trabajo"): el resultado en el centro, un carril de iconos siempre a mano, una tira de pasos que cuenta la verdad del proceso, un pie compacto y una cabecera común. Especificación en `docs/superpowers/specs/2026-09-13-mesa-de-trabajo-imagenes.md`; plan en `docs/superpowers/plans/2026-09-13-mesa-de-trabajo-imagenes.md`.

## Vocabulario compartido

`src/components/tools/mesa/` (CSS plano importado desde el layout de herramientas, sin dependencias nuevas):

- **Carril** (`MesaRail`, `MesaBoton`, `MesaGrupo`, `MesaSeparador`, `MesaMuestras`): columna de 64 px a la derecha del escenario desde 768 px, fila envolvente debajo por debajo. Solo iconos; el tooltip lateral es CSS e incluye el atajo. `MesaBoton` admite pulsar-y-mantener (puntero, Espacio o Enter) sin robar el foco al lienzo.
- **Pasos** (`MesaPasos`): nodos `pendiente / activo / listo / error` con anillo de progreso real, anillo punteado girando cuando el progreso es indeterminado y check dibujado al completar. Las pistas entre nodos se rellenan al completar el anterior.
- **Escenario** (`MesaEscenario`): fondo de salida por `data-fondo`, pista abajo a la izquierda, contador de cambios arriba a la derecha y pulso del color del modo.
- **Cabecera** (`MesaCabecera`): nombre del archivo, detalle y acciones.
- **Iconos vivos** (`MesaIcons`): SVG propios con ganchos de clase. La flecha de subir flota mientras se espera, la varita destella mientras trabaja, el pincel se agita al pasar, la flecha de descargar flota al pasar y se convierte en un check dibujado cuando la descarga corresponde al resultado actual. `prefers-reduced-motion: reduce` anula toda animación y transición dentro de `.mesa`.

## Cambios por herramienta

- **Quitar fondo**: carril con borrar (E), restaurar (R), deshacer, rehacer, volver al inicio, comparar manteniendo (C), ver máscara (M) y copiar PNG al portapapeles. Pasos Subir → Recorte con IA → Listo con el porcentaje real de descarga del modelo; el editor manual marca el paso de IA en error y el resultado en listo. Pie con tamaño, dureza, fondo de salida (seis muestras y color propio) y estado. Cursor de anillo con cruz, rojo al borrar y verde al restaurar. Se retiran las vistas Antes/después y el zoom: la variante A no los tiene y el escenario gana anchura al desaparecer el panel lateral. El lienzo se limita a 560 px o la mitad de la ventana para que el pie quede a la vista.
- **Recortar**: sin panel lateral. Carril con Recortar / Marcar sujeto, cuadrícula, girar 90°, restablecer, encajar al sujeto, limpiar trazos y cambiar imagen. Pie con las proporciones como chips y los rangos de zoom y rotación (tamaño del pincel y margen en modo sujeto). Pasos Subir → Encuadrar → Listo.
- **Convertir, comprimir, redimensionar** (`ImageTransformStudio`): escenario | carril | panel. El carril compara con el original manteniendo y cambia la imagen; el panel de parámetros se conserva. Se retira el conmutador Original/Resultado. El botón de descarga sigue llamándose "Descargar".
- **Favicon**: pasos Subir → Ocho tamaños → Listo; copiar etiquetas HTML pasa al carril.
- **ICO**: pasos Subir → Generar ICO → Listo; la pista indica cuántos tamaños lleva el archivo o pide elegir uno.
- **Marca de agua**: pasos Subir → Marcar → Listo; comparar con el original manteniendo.
- **Paleta**: pasos Subir → Extraer → Listo; la cantidad de colores va en la cabecera como chips; copiar CSS pasa al carril; la franja de colores queda bajo el escenario para que la pista no tape ninguna etiqueta.

## Verificación

- `pnpm typecheck`, `pnpm lint` y `pnpm seo:audit` en verde en cada commit.
- Suite completa: 170 pruebas, 161 verdes; las 9 de `autonomous-defense.spec.ts` necesitan Redis y no corren en local.
- 8 pruebas nuevas en `tests/e2e/mesa-imagenes.spec.ts`: carril a la derecha del escenario a 1440 y en fila debajo a 390; pasos con `data-estado` hasta `listo` (y `error` cuando el modelo falla); comparar manteniendo con ratón y con la tecla C medido por alfa del píxel central; máscara; contador de cambios; ninguna animación activa con movimiento reducido; chips de proporción y rangos por modo en recortar sin panel lateral; original mientras se mantiene en comprimir con el panel a la derecha del carril; descarga real y check en el icono en favicon, ICO, marca de agua y paleta; 375 px sin desbordamiento en todas.
- Las 9 pruebas anteriores de `tools-modern-workflows.spec.ts` siguen verdes sin cambios: los nombres accesibles se conservaron.
- Quitar fondo con inferencia real de IMG.LY en Chromium: capturas a 1440 (carril de 64 px a la derecha, tres pasos en verde, cursor por modo, tooltip lateral) y a 390 (carril en fila bajo el escenario, sin desbordamiento, sin errores JS). El pie con el pincel queda dentro de los 900 px de alto.
- Capturas de las otras ocho herramientas a 1440 y 390 con imagen cargada: último paso en verde, sin desbordamiento, sin errores JS.

## Lecciones que conviene conservar

- `fill()` de Playwright sobre un rango bajo el pliegue desplaza la página con `scroll-behavior: smooth`; una `boundingBox()` leída justo después queda desfasada. Usar `locator.hover()` antes de `mouse.down()`.
- Un botón de mantener que roba el foco al lienzo dispara el `blur` del lienzo y anula el estado. `preventDefault` en `pointerdown` lo evita; el `blur` solo suelta la comparación iniciada con teclado.
- Con `perl -pi 's|a|b|'`, un `|` literal dentro del patrón se convierte en alternancia y machaca líneas ajenas. Las ediciones de TSX se hacen con Python.

## Fuera de alcance

- Capacidades de IA nuevas (MODNet, escalado): exigen `huggingface.co` en `connect-src` y revisión de licencias.
- Las otras familias de herramientas reutilizarán este vocabulario en planes posteriores.
- Los cambios están en local, sin desplegar.
