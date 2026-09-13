# Mesa de trabajo para la familia de imágenes

Fecha: 13 de septiembre de 2026. Variante elegida por el usuario: **A · Mesa de trabajo**, del prototipo `plantilla-imagenes-v7.html` (publicado como artefacto "Estudio de imagen v7"). Este documento destila esa variante en reglas que el código debe cumplir.

## Qué se construye

Las nueve herramientas de imagen (`quitar-fondo`, `recortar-imagen`, `convertir-imagen`, `comprimir-imagen`, `redimensionar`, `favicon`, `convertir-ico`, `marca-agua`, `paleta-colores`) comparten un mismo vocabulario visual e interactivo:

1. **Escenario** (`.mesa-escenario`): el resultado ocupa el centro. Fondo de salida seleccionable (transparente con damero, blanco, marfil, oscuro, degradado, color propio). Una **pista** en píldora abajo a la izquierda dice qué hace el puntero ahora; un **contador de cambios** arriba a la derecha cuando hay historial.
2. **Carril** (`.mesa-rail`): iconos siempre a mano. Columna de 64 px a la derecha del escenario desde 768 px; fila envolvente debajo del escenario por debajo. Solo iconos, con tooltip lateral que incluye el atajo (`Borrar · E`). Los estados pulsados usan el acento de la herramienta; borrar y restaurar usan rojo y verde.
3. **Pasos** (`.mesa-pasos`): tira de nodos bajo el escenario que cuenta la verdad del proceso: `Subir → Procesar → Listo`. Un nodo activo lleva un anillo de progreso real (descarga del modelo) o un anillo punteado girando cuando el progreso es indeterminado. Un nodo listo se rellena con el acento y dibuja el check. Un nodo en error se marca en rojo. Las pistas entre nodos se rellenan al completar el anterior.
4. **Pie** (`.mesa-pie`): parámetros compactos que dependen del modo (tamaño y dureza del pincel; proporciones del recorte; zoom y rotación), fondo de salida y estado en una línea. Menos texto: rangos con `output` monoespaciado.
5. **Iconos vivos**: SVG propios con ganchos de clase que animan con intención, nunca en bucle sin motivo: la flecha de subir "flota" mientras se espera; la varita destella mientras trabaja; el pincel se agita al pasar por encima; la flecha de descargar flota al pasar y se convierte en un check dibujado cuando la descarga ya se hizo. `prefers-reduced-motion: reduce` desactiva todas las animaciones y transiciones de la mesa.
6. **Comparar manteniendo**: el botón de ojo muestra el original mientras se mantiene pulsado (puntero, Espacio o Enter) y la tecla `C` hace lo mismo sobre el lienzo. Sustituye a las vistas "Antes / después" y "Original / Resultado".
7. **Cursor de retoque**: anillo con cruz, rojo al borrar y verde al restaurar. El escenario emite un pulso breve del color del modo al cambiarlo.

## Invariantes

- Nombres accesibles que las pruebas existentes ya usan y no cambian: `Seleccionar imagen`, `Descargar PNG`, `Descargar ZIP`, `Descargar ICO`, `Descargar PNG con marca de agua`, `CSS`, `Borrar`, `Restaurar`, `Deshacer pincelada`, `Rehacer pincelada`, `Abrir editor manual`, `Resultado editable`, `Dureza`, `Texto de la marca`, `Opacidad`, `Centro`, `256×256`, y los botones de proporción `${nombre}: ${etiqueta}` (por ejemplo `1:1: Cuadrado`).
- Todo el procesamiento sigue en el navegador. No se añaden dependencias ni modelos. La licencia del modelo de recorte (IMG.LY, AGPL) no cambia en este trabajo.
- Sin desbordamiento horizontal a 375 ni 390 px. Objetivos táctiles de 44 px en el carril (36 px dentro de un grupo, como el prototipo).
- Los atajos viven en el lienzo enfocado: `E` borrar, `R` restaurar, `[` `]` tamaño, `Ctrl/⌘ Z` deshacer, `Ctrl/⌘ ⇧ Z` rehacer, `C` mantener para comparar, `M` alternar máscara.
- Los estilos de la mesa viven en `src/components/tools/mesa/mesa.css`, importados desde el layout de herramientas después de `tools.css`. Ninguna herramienta redefine esas clases.

## Decisiones tomadas al pasar del prototipo al producto

- El fondo de salida va en el pie, no en el carril: seis muestras más el color propio no caben en una columna de 64 px junto a los ocho botones del carril sin superar la altura del escenario.
- Se retira el zoom del quitafondos: la variante A no lo tiene y el escenario gana anchura al desaparecer el panel lateral. Si hace falta, volverá como botón del carril.
- Copiar al portapapeles se añade donde el prototipo lo dibuja (quitafondos, favicon, paleta) usando `navigator.clipboard`; si el navegador no lo permite, el error lo dice y la descarga sigue disponible.
- En las herramientas con muchos parámetros (convertir, comprimir, redimensionar, favicon, ICO, marca de agua, paleta) el panel lateral se conserva a la derecha del carril: `escenario | carril | panel`. En recortar y quitafondos el panel desaparece y sus controles pasan al pie.

## Fuera de alcance

- Capacidades de IA nuevas (MODNet, escalado con Swin2SR): exigen `huggingface.co` en `connect-src` y revisión de licencias. Se planifican aparte.
- Catálogo y portada: ya tienen su tratamiento (commit `cac6a37`).
- El resto de familias (generación, conversión, productividad, seguridad, redes) reutilizarán este vocabulario en planes posteriores.
