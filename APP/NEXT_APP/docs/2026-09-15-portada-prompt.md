# Prompt de la portada de nicoholas.dev

Describe y reproduce la página principal de nicoholas.dev, el portafolio de un desarrollador full stack que construye herramientas web gratuitas, sistemas privados y proyectos a medida. La portada no es una lista de servicios: es una demostración en vivo de lo que el autor hace, con las herramientas reales del sitio funcionando dentro del hero, movimiento dirigido por el scroll y un fondo que responde a la persona que la visita. Debe sentirse viva, artesanal y rápida en cualquier dispositivo, sin parecer una plantilla ni un texto generado.

## Objetivo

- Captar la atención sin perder al visitante: cada sección cuenta una sola cosa y se revela al llegar a ella.
- Que la persona pruebe, no solo lea: las demostraciones se reproducen solas y, si las toca, toma el control.
- Mostrar profundidad real (tres planos de partículas, mesa 3D, abanico, perspectiva, órbita) sin sacrificar fluidez.
- Cumplir las métricas de Google (LCP, CLS, INP, TBT) en móvil y escritorio, con conexiones lentas y equipos modestos.

## Tecnologías

Next.js 16 (App Router, componentes de servidor para el texto crítico, secciones diferidas por IntersectionObserver), React 19, TypeScript, Tailwind 4 con CSS plano para la portada, GSAP 3 con ScrollTrigger (coreografías, fijado de secciones, revelados), Lenis (scroll suave solo en escritorio con presupuesto alto), lienzos 2D para el fondo, las demostraciones y el núcleo de seguridad (sin WebGL ni three.js), `next/font` con Inter y JetBrains Mono autoalojadas, `qrcode` para el generador de QR, Matrix Orb de rareui (MIT) adaptado a lienzo 2D, CSP estricta con nonce por petición (sin scripts en línea salvo uno de 3 líneas con nonce), Playwright para pruebas de extremo a extremo, Lighthouse 12 para medir.

## Estructura, de arriba abajo

1. **Barra de navegación** en píldora flotante con tres fases según el scroll: expandida arriba, compacta al bajar y oculta tras 300 px si sigues bajando; reaparece al subir o al enfocar un enlace con el teclado.
2. **Hero · mesa giratoria (V1, tocadiscos).** A la izquierda, la insignia «Desarrollador Full Stack», el titular «Desarrollo / SOLUCIONES.», el párrafo «Herramientas útiles, interfaces cuidadas y desarrollo web a medida. Explora lo que construyo y pruébalo por ti mismo.» y dos botones: «Usar herramientas» y «Hablemos de tu proyecto». A la derecha, cuatro tarjetas con la mesa de trabajo real de las herramientas (cabecera con nombre de archivo, escenario, carril de iconos con tooltips, tira de pasos Subir → Procesar → Listo): Quitar fondo, Generador de QR, Extractor de paleta y Recortar imagen. Giran sobre un eje vertical con radio 220 px (150 en móvil); la del frente queda nítida y corre su demostración; las otras se atenúan, se desenfocan y quedan inertes. Cada demostración se reproduce sola (el pincel borra el fondo, el QR se teclea y brota desde el centro y recorre cuatro estilos, la paleta extrae seis colores uno a uno, el recorte recorre las proporciones) y responde a la persona al primer toque; las descargas son reales. Avanza sola cada 11 s si el hero está en pantalla y el ratón no está encima; unos puntos con etiqueta permiten elegir tarjeta. El scroll añade giro a la mesa y la inclina.
3. **Cinta de herramientas.** «29 herramientas · sin registro», «Las herramientas que uso a diario. / Úsalas tú también.», un comparador antes/después con una planta (el deslizador sigue al scroll hasta que la persona lo toca), una tarjeta de recorte, dos miniaturas (QR, JSON), accesos rápidos y el botón «Explorar herramientas».
4. **Mazo · Infraestructura Privada.** Tres cartas en abanico guiado por el scroll con demostraciones reales de sistemas internos (Control Financiero, Optimizador CV, Auditoría de Seguridad). Cada carta gira 180° al pulsarla (o con Enter/Espacio) y muestra en el dorso qué hace el sistema; al pasar el ratón se eleva, se inclina y le cruza un brillo. Un aviso deja claro que los datos son simulados.
5. **Coverflow · De la necesidad al producto.** Tres proyectos reales (FloresDyD, Intranet y aula virtual OTEC, Herramientas de uso diario) con su captura real. La sección se fija durante 1200 px de scroll y el panel activo se desplaza en perspectiva; puntos y flechas eligen sin scroll; sin JavaScript los paneles quedan en rejilla con sus imágenes.
6. **Órbita · Una base para crecer.** Doce iconos de tecnologías (Next.js, React, TypeScript, Tailwind, Node.js, PostgreSQL, Docker, AWS, Redis, Python, Git, IA/ML) girando en un anillo 3D sin nombres. Al pasar o pulsar uno, su nombre sube por el centro con el color de la marca y un halo del mismo tono; el anillo se ralentiza mientras hay uno activo y el scroll lo empuja.
7. **Centinela · La seguridad no es un extra. Es parte del diseño.** Un lanzador con cuatro peticiones (visita normal, inyección SQL, ráfaga de 200 peticiones, sesión caducada) que se teclean como HTTP real; al lanzar, un punto de luz recorre cuatro anillos (Cliente, WAF, Auth, Datos) hasta donde llega y el núcleo (una rejilla de puntos que respira) pasa de «Vigilando» a «Bloqueando» o «Correcto»; el terminal escribe las cabeceras de seguridad reales del sitio o la respuesta 400/429/302. Los anillos se aplastan un poco más al bajar.
8. **Contacto · Hablemos de tu siguiente nivel.** Texto, chips «Respuesta rápida · Propuesta clara · Sin spam» y el formulario real, sin tarjetas de servicio.
9. **Firma de cierre** (el nombre se forma en partículas al bajar y termina en constelación) y **pie de página**.

## Fondo vivo y profundidades

Un lienzo fijo detrás de todo con partículas en tres planos (0,32 · 0,62 · 1): las cercanas son mayores, más brillantes y se mueven más con el scroll (paralaje por profundidad) y se estiran con la velocidad; las cercanas y medias se unen con líneas finas cuando están a menos de 135 px (rejilla espacial, tope de 420 trazos). Dos auroras suaves siguen al ratón y toman el color de la sección visible (verde agua en el hero, ámbar en los sistemas privados, violeta en tecnologías, rosa en seguridad). El ratón atrae las partículas a menos de 200 px; cada clic emite una onda que las empuja. Sobre ese fondo, cada sección aporta su propia profundidad: la mesa 3D con perspectiva de 1500 px, el abanico de cartas con origen de giro bajo, los paneles en coverflow con rotación y escala, la órbita inclinada 14°, los anillos del centinela con mitad trasera y mitad delantera alrededor del núcleo, y una barra de progreso de lectura de 2 px arriba.

## Efectos de ratón, clic y scroll

- **Cursor:** el DropCursor original del sitio, una gota con estela de diez puntos que crece y se vuelve naranja sobre enlaces y botones, solo en escritorio con puntero fino.
- **Hover:** botones magnéticos (se acercan 6–8 px al puntero) con destello diagonal; tarjetas y paneles con inclinación 3D y brillo que sigue al puntero; iconos del carril que se elevan; satélites que se encienden en su color.
- **Clic:** onda circular desde el punto pulsado en los botones; giro de cartas; tarjetas del hero que pasan al control manual; presets que lanzan una petición.
- **Scroll:** coreografía de entrada del hero (insignia, titular por máscara línea a línea, botones, mesa que entra inclinándose), revelado de cada cabecera al llegar, giro e inclinación de la mesa, abanico del mazo, fijado y desplazamiento del coverflow, empuje de la órbita, aplastamiento de los anillos, tinte del fondo por sección; scroll suave con Lenis y autoscroll con el botón central del ratón en escritorio.

## Optimización y accesibilidad

- El párrafo del hero es el elemento LCP: se renderiza en el servidor, se pinta desde el primer frame y nunca se anima ni se oculta; el titular y la mesa se retienen como mucho 700 ms para no destellar si la hidratación llega antes.
- Nada bloquea el render: fuentes autoalojadas con respaldo de métricas iguales (sin salto de maquetación), GSAP y Lenis en sus propios chunks, secciones bajo el pliegue cargadas al acercarse.
- Tres niveles de movimiento decididos solos: completo; medio en equipos con ≤ 4 núcleos, ≤ 4 GB, pantalla estrecha o puntero grueso (sin Lenis, fondo a 1× y 30 fps con 60 % de partículas, sin giro por scroll); estático con movimiento reducido, ahorro de datos, pestaña oculta o «Pausar efectos» (un botón fijo que persiste entre visitas).
- La aurora se pinta en un lienzo de 1/8 y se escala; la calidad baja un escalón sola si el frame medio supera 25 ms; las demostraciones paran cuando su sección sale de pantalla; nada anima con la pestaña oculta.
- Un solo h1, jerarquía h2 → h3, todo interactivo es enlace o botón con nombre, objetivos táctiles de 44 px, tarjetas laterales de la mesa inertes y ocultas al lector de pantalla, estados en `aria-pressed`, `aria-current` y `role="status"`, contraste mínimo 4,5:1, sin desbordamiento horizontal desde 320 px, y la página se lee completa sin JavaScript (proyectos con imágenes, lista de tecnologías, pie).
- Sin cifras comerciales sin fuente, sin texto de «IA», sin notas explicativas: solo el texto real del sitio.

## Resultado de laboratorio (Lighthouse 12, compilación de producción)

Sobre el paquete compilado servido en local: móvil 88 (LCP observado 0,24 s; TBT 50 ms; CLS 0; accesibilidad 100), escritorio 98. En producción con red real: móvil 76–77, escritorio 89. Detalle y lecturas en `docs/2026-09-15-portada-viva.md`.
