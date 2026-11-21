# Herramientas más profesionales (ronda 3): interiores

Fecha: 2026-11-21 · El usuario delegó las decisiones («si continua»).

## Diagnóstico (producción, medido con tests/e2e/herramientas-ronda3.spec.ts)

73 rótulos con emoji de adorno junto a palabras en 13 herramientas (pestañas «🎡 Ruleta», «📏 Longitud», títulos
«📚 Fuentes», avisos «⚠️ …») y 7 botones con degradado (morado-rosado, azul-cian). Contraseñas mezclaba naranja,
violeta, azul y cian; su clave de una línea ocupaba una caja de 144 px (tres botones apilados al lado). Sorteos,
unidades y reverse shells abrían vacíos.

## Decisiones

1. Sin emojis de adorno junto a palabras. Los que son contenido se quedan: portadores de esteganografía con emojis,
   texto de ejemplo para codificar, el script que se descarga; un emoji de ejemplo dentro de un texto va en `<kbd>`.
   Las marcas tipográficas (✓, ✗, ★) no son emojis.
2. Sin degradados en botones: la acción principal es el botón sólido del sitio (`--boton` / `--boton-tinta`); una
   pestaña elegida, el chip del sitio (acento al 14 % y borde al 55 %). Los colores de familia y el color propio de cada
   magnitud en unidades siguen (son coherentes dentro de cada herramienta); en unidades la pestaña elegida usa ese color,
   sólido.
3. Resultado de entrada: sorteos con seis nombres de ejemplo, unidades con 1 km → millas, reverse shells con la IP
   10.10.14.5. Se reemplazan al escribir; una URL compartida manda.
4. Contraseñas: botones en fila junto a la clave (la caja mide lo que su contenido) y un solo acento.

## No objetivos

Cambiar palabras o mayúsculas de los rótulos internos (las pruebas dependen de ellas), el panel de administración.
