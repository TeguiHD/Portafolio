# Herramientas más profesionales (ronda 2): diseño

Fecha: 2026-11-21 · El usuario delegó las decisiones («toma la decisión tú», «sí, continúa y deja todo desplegado»).
Objetivo del usuario: que la gente entre a usar las herramientas.

## Diagnóstico (producción, 21-11, medido en las 29)

- En el PC el título queda en 7 posiciones distintas (x = 170, 178, 234, 242, 298, 362, 426 a 1440 px): cada página
  usa su propio ancho (768, 896, 1024, 1152 o 1280 px). En el celular todas coinciden.
- En una misma página hay tres anchos: la herramienta, la guía (1280) y «También te puede servir» (1180).
- Los nombres van con mayúscula en cada palabra («Quitar Fondo», «Compresor de Imágenes»): en español es incorrecto.
- 18 herramientas mantienen un «← Volver a herramientas» al pie, que ya cubren las migas y «También te puede servir».
- IVA: la tasa de EE. UU. ocupa dos líneas.
- «Sin marca de agua» (quitar fondo) se había quitado como relleno; es cierto (no hay código que agregue marca) y es
  una diferencia frente a la competencia: vuelve.

Competencia de herramientas sueltas (Smallpdf, iLovePDF, TinyPNG, remove.bg, it-tools): título y descripción centrados
sobre la herramienta; la herramienta debajo con su ancho; nada cambia de lugar al pasar de una a otra.

## Decisiones

1. **Cabecera centrada**: ícono y título centrados, descripción y «dónde se procesa» centradas debajo. El título queda
   en el mismo lugar con cualquier ancho de herramienta.
2. **Dos anchos, definidos en el catálogo** (`ancho: "estrecha" | "ancha"` en el registro):
   - estrecha, 56rem (896 px): formularios de una columna o dos columnas cortas;
   - ancha, el ancho del sitio (el de la barra de arriba): estudios de imagen, QR, JSON, regex, ASCII, DNS, Nginx, Base64.
   La herramienta, la guía y «También te puede servir» usan el ancho de su herramienta; las migas y los botones
   Buscar/★ usan siempre el ancho del sitio.
3. **Nombres en español correcto**: mayúscula solo al inicio y en siglas (QR, IVA, JSON, JWT, DNS, EXIF, ASCII, ICO,
   Base64, Nginx). Una migración actualiza la base solo si el nombre sigue siendo el de fábrica (respeta lo editado
   en el panel). Los `<title>` de SEO no se tocan.
4. **Sin «Volver a herramientas»** al pie de las herramientas.
5. **IVA**: EE. UU. en una línea («EE. UU. (8 %, aprox.)»), con la aclaración en el `title`.
6. **Quitar fondo**: «Del original a un PNG transparente, sin marca de agua.»

## No objetivos

Rehacer por dentro cada herramienta (siguiente ronda), el panel de administración, los `<title>` de SEO.

## Anti-objetivos

Que una herramienta pierda su h1 o lo duplique; que una herramienta ancha quede apretada; desborde horizontal en el
celular; texto que prometa algo que el código no hace.
