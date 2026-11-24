# Herramientas más profesionales (ronda 1): diseño

Fecha: 2026-11-21 · El usuario delegó las decisiones («toma la decisión tú», «continúa y deja todo desplegado»).
Objetivo del usuario: que la gente entre a usar las herramientas.

## Diagnóstico (capturas de producción, 21-11)

Lo poco profesional no es una herramienta sola: cada una parece de un sitio distinto. Cabeceras con anchos, tamaños
e íconos distintos (QR y ascii con la suya propia); títulos y migas que no coinciden («Quitafondos con Inteligencia
Artificial» / «Quitar fondo»); subtítulos de relleno («Criptográficamente seguro • Análisis basado en benchmarks
reales», «Un buen recorte cambia todo.»); botones de verde neón con degradado (contraseñas) y naranjos (IVA);
IVA abre con «$ 0» y el resultado vacío.

Competencia revisada (QRCode Monkey, TQRCG, remove.bg, TinyPNG, Bitwarden, 1Password, JSON Formatter): entrada arriba,
resultado con valores por defecto antes de tocar nada, botón principal con verbo concreto, promesa de privacidad
concreta junto a la herramienta, confirmación al copiar o descargar.

## Decisiones

1. **Cabecera única** (`ToolPageHeader`, solo recibe `slug`): ícono de la familia, h1 = nombre del catálogo,
   la descripción de una línea del catálogo y una línea de dónde se procesa:
   - por defecto: «Funciona en tu navegador: lo que escribes o subes no sale de tu equipo.»
   - dns: «La consulta la hace nuestro servidor, contra seis resolvedores públicos.»
   - regex: «Funciona en tu navegador. Solo las funciones con IA envían tu texto a nuestro servidor, que usa Google Gemini.»
   (Verificado en el código: 27 corren en el navegador; el registro de uso no manda contenido.)
   QR, ascii y las 3 de transformar imágenes pasan a usarla. Las migas usan el mismo nombre.
2. **Sin relleno** en quitar-fondo, claves y regex (frases y emojis decorativos).
3. **Colores del sitio** en contraseñas e IVA: el botón principal con el acento, sin degradados neón.
4. **Resultado de entrada:** IVA abre con 10.000 y su cálculo; JSON ofrece «Probar con un ejemplo».

## No objetivos (rondas siguientes)

Rehacer el interior de cada herramienta, unificar anchos de todas, el panel de administración.

## Anti-objetivos

Texto que prometa algo que el código no hace; perder un h1 o duplicarlo; romper las pruebas de SEO.

## Corrección (24-11-2026)

La línea de regex decía «que usa Google Gemini»: el código manda la descripción o el patrón a OpenRouter, con el modelo
Mistral Small 24B (`src/services/gemini.ts`), nunca el texto de prueba. Se corrigió en el registro y en su prueba al
escribir el «Cómo se hizo» de cada herramienta (docs/superpowers/specs/2026-11-24-como-se-hizo-design.md).
