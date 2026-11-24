# «Cómo se hizo»: cada cosa muestra su estudio (diseño corto)

Trabajo 5 del orden aprobado el 23-11-2026 («dale con ese orden… que cada cosa muestre su estudio»; «sigue con el
trabajo 5», 24-11). Decisión ya tomada: no se rehace el sitio.

## Para qué

Que quien llega (cliente, empleador o una IA que resume la página) vea que detrás de cada parte hay investigación,
diseño y un propósito, como en Stripe o Linear: no con frases de venta, sino con lo que se midió, lo que se revisó, lo
que se decidió y cómo se comprueba.

## Decisiones (mías; el dueño delegó)

- **En cada herramienta (33), una sección «Cómo se hizo»** debajo de la herramienta y antes de la guía, visible (no
  plegada) y corta: una lista de definiciones con cuatro filas.
  - *Para qué*: el problema que resuelve y para quién.
  - *Qué se revisó*: fuentes primarias (SII, Superintendencia de Pensiones, RFC, W3C…) con fecha de verificación, y la
    competencia revisada cuando un diseño la nombra (remove.bg, TinyPNG, QRCode Monkey, Bitwarden… el 21-11-2026).
  - *Cómo funciona*: dónde corre, el método o la biblioteca y una decisión con su porqué.
  - *Cómo se comprueba*: qué revisan las pruebas automáticas, en concreto.
  Fuentes enlazadas debajo. Los datos, en `src/lib/como-se-hizo.ts`, uno por herramienta.
- **Una página que lo reúne, `/como-se-hizo`**: el método en cuatro pasos (medir lo que hay, revisar a los mejores,
  decidir por escrito con lo que haría fracasar el trabajo, comprobar con pruebas) con un ejemplo real de cada paso, y
  el estudio de cada producto: el Índice de la Web Chilena, las herramientas (con enlace al estudio de cada una), los
  servicios (casos medidos con Lighthouse) y el propio sitio. Enlazada desde el pie, desde cada «Cómo se hizo», desde
  /sobre-mi y en llms.txt y el sitemap. No va en la barra de arriba (ya tiene cinco entradas).
- **Servicios e índice** ya muestran su estudio (caso real medido; metodología con fuentes): no se tocan, solo se
  enlazan desde la página nueva.
- **Voz impersonal** («se revisó», «corre en tu navegador»), como la metodología del índice.

## Reglas

- Nada inventado: cada frase sale del código, de un diseño en `docs/superpowers/specs/` o de una investigación con
  fuentes (p. ej. `investigaciones/parametros-remuneraciones-cl-2026-11.md`). Sin prueba que lo cubra, no se dice que
  está probado.
- «Mostrar, no explicar» (regla 2 de Materia viva) manda arriba: el estudio va debajo de la herramienta y en su propia
  página, con datos (fechas, cifras, fuentes), no párrafos de venta.
- Sin rótulos en mayúsculas, sin cajas de aviso, sin «→», sin palabras de relleno (intuitivo, potente, optimizado,
  perfecto, ideal, control total…). Cifras en formato chileno y fechas DD-MM-AAAA.
- Enlaces solo a fuentes primarias o documentación oficial, comprobados con respuesta 200.

## Enfoques considerados

1. **Sección en cada cosa + una página que lo reúne (elegido).** El estudio queda donde se usa y, además, hay una
   página citable que explica el método.
2. Una página de estudio por herramienta (`/herramientas/x/estudio`): más páginas, pero delgadas, y separa el estudio
   de lo que estudia.
3. Solo la página general: se lee como una declaración, sin la prueba al lado de cada cosa.

## Fuera

- Un enlace al repositorio o a estos documentos de diseño: decisión del dueño.
- Publicar el marcador «¿A quién recomienda la IA?»: decisión del dueño (sigue privado).

## Pruebas

- Puras: cada herramienta del catálogo tiene sus cuatro campos; ninguno con palabras vetadas, mayúsculas sostenidas
  ni «→»; las fuentes son https.
- Con servidor: una herramienta muestra «Cómo se hizo» con sus cuatro filas; `/como-se-hizo` tiene su h1, los cuatro
  pasos y un enlace al estudio de cada herramienta; está en el sitemap y en llms.txt.
