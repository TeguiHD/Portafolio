# Índice de la Web Chilena, edición de diciembre: más instituciones y más medidas (diseño)

Estado: aprobado por el dueño el 23-11-2026 («dale con tus recomendaciones»). Lo marcado «(propuesta)» fue propuesta mía y
quedó aprobado con el resto.

## Para qué

- El dueño pidió (23-11-2026) sumar «el resto, como los SLEP» y medir «no solo la calificación de ese analizador de
  Google, también SEO, GEO, AEO, LLMO y otros» relevantes para la industria, con el nivel «de Silicon Valley» y con
  «todo un estudio por detrás» visible.
- Por qué importa: el índice es la pieza de autoridad de la estrategia para que las IA y la gente lo encuentren
  (jugada 4 del informe GEO). Medir lo que él vende (buscadores, IA, seguridad) muestra su oficio con datos públicos.
- Contexto personal: hizo su práctica en el SLEP Santa Rosa (ene–jun 2025).

## Metas

1. Edición nueva «2026-12» (propuesta): mide de nuevo todo. La de noviembre queda como historial y la ficha muestra
   qué cambió entre ediciones.
2. Universo nuevo, de listas oficiales: las fichas del directorio de organismos del Portal de Transparencia del Estado
   (series AA a AZ, 462 organismos con ficha; 415 indican sitio). Se suman a las 442 actuales.
3. Siete dimensiones con nota propia y ranking propio; la nota general es el promedio de las dimensiones.
4. Una prueba con Claude: «¿cuál es el sitio web oficial de X?», de memoria y buscando en internet (propuesta).
5. Cada dimensión explica por qué se mide, cómo y con qué fuente, en la metodología (el «estudio» visible).

## No metas

- ChatGPT, Gemini y Perplexity en la prueba de IA: cuando el dueño tenga sus claves.
- llms.txt dentro de la nota: se informa, no suma (el informe GEO no encontró evidencia de que cambie las citas).
- Medir páginas interiores: solo la portada, como hoy.

## Antimetas (sería un fracaso aunque funcione)

- Culpar a una institución por algo que es de nuestra medición: un bloqueo a nuestro robot, una caída puntual o un
  sitio que no carga se informa como «sin nota» con su motivo, nunca como falla de la institución.
- Inventar: ninguna cifra, versión «obsoleta» ni dato de contexto sin fuente citable en la metodología.
- Tono de escarnio: el dato dice lo que dice (igual que hoy: sin «solo», «apenas», «vergonzoso»).
- Publicar datos personales: los registros de dominio (whois) y las fichas traen nombres y teléfonos; nada de eso sale.

## Universo (propuesta)

Del Portal de Transparencia, por tipo (conteo del 23-11-2026):

| Tipo | Organismos | Categoría en el índice |
|---|---|---|
| Otros servicios (SII, Registro Civil, FONASA…) | 206 | Servicios públicos |
| Subsecretarías | 34 | Servicios públicos (las que comparten sitio con su ministerio se fusionan con él) |
| Superintendencias | 11 | Servicios públicos |
| Delegaciones presidenciales | 56 | Delegaciones presidenciales |
| SLEP | 48 | Servicios locales de educación |
| Servicios de Salud | 28 | Salud |
| Hospitales | 63 | Salud |
| Gobiernos regionales | 16 | ya están |

Reglas:
- Un sitio cuenta una vez: si varios organismos comparten dominio, entra uno (el titular del sitio) y los demás quedan
  anotados como «comparte sitio con…».
- Cada sitio se verifica como en noviembre: la URL final, el título, vocabulario institucional, señales de dominio
  perdido o secuestrado, y revisión a mano de los dudosos. Los que no se confirman quedan fuera con su motivo.
- Los SLEP: los 48 de la lista; los que aún no administran colegios entran igual (tienen sitio y son servicios
  creados por ley) (propuesta).

## Dimensiones y controles

Cada control aprueba o no; la nota de la dimensión es el porcentaje de controles aprobados. La nota de Velocidad y
calidad es la de hoy (promedio de las cuatro de Lighthouse).

1. **Velocidad y calidad (Lighthouse):** rendimiento, accesibilidad, buenas prácticas y SEO en celular. Sin cambios.
2. **Buscadores:**
   - el robots.txt responde y no bloquea todo el sitio;
   - hay mapa del sitio (sitemap.xml o el declarado en robots.txt) que se puede leer;
   - la portada declara su dirección canónica;
   - hay un solo título principal (h1);
   - hay vista previa al compartir (og:title y og:image);
   - el título mide entre 10 y 70 caracteres.
   La descripción ya está en la revisión de hoy y se mueve aquí.
3. **IA (GEO, AEO y LLMO):**
   - el robots.txt deja entrar a los robots de búsqueda de IA (OAI-SearchBot, Claude-SearchBot, PerplexityBot);
   - el robots.txt deja entrar a los de entrenamiento (GPTBot, ClaudeBot, Google-Extended). Se informa aparte y no se
     castiga: es una decisión legítima de cada institución (propuesta);
   - la portada tiene al menos 150 palabras de texto en el HTML que entrega el servidor, sin ejecutar JavaScript;
   - trae datos estructurados de la institución (JSON-LD de Organization, GovernmentOrganization o
     EducationalOrganization, con nombre y url).
4. **Directorios al día:** si el Portal de Transparencia, el SINIM (municipios), el SIES (universidades) y Wikidata
   (P856) apuntan al sitio actual. Es lo que leen las IA para saber «cuál es el sitio de X». Ya hay casos documentados
   de directorios que apuntan a dominios muertos o secuestrados.
5. **Seguridad:** los siete controles de hoy (HTTPS, de HTTP a HTTPS, HSTS, CSP, marcos, nosniff, referencia), más el
   certificado vigente con más de 14 días por delante.
6. **Correo y suplantación:**
   - el dominio publica SPF;
   - publica DMARC con política quarantine o reject (none no aprueba);
   - tiene DNSSEC.
   Se mide por DNS, sin tocar el sitio.
7. **Privacidad:** cuántos rastreadores de terceros carga la portada antes de que la persona acepte algo. La lista y
   las categorías son las de third-party-web, que trae Lighthouse 13.4.1 (publicidad, analítica, redes sociales,
   marketing, gestor de etiquetas). Aprueba con cero; la nota baja por rastreador.

Se informan sin nota: software a la vista (meta generator o cabecera X-Powered-By con versión, y si esa versión ya no
tiene soporte según endoflife.date), huella de carbono por visita (modelo Sustainable Web Design v4, calculado del
peso) y llms.txt.

## Prueba con Claude (propuesta)

- Pregunta, igual para todas: «¿Cuál es el sitio web oficial de {nombre}? Responde solo con la dirección.»
- Dos pasadas con claude-opus-5-5: sin herramientas (lo que sabe de memoria) y con búsqueda web (web_search_20260209,
  como lo ve alguien en claude.ai).
- Acierta si el dominio registrable de la respuesta es el del sitio verificado (o uno que redirige a él).
- Costo estimado: unos USD 5 de memoria y unos USD 40 buscando, por edición. Se corre una vez, al final.
- La clave se lee de ~/.config/anthropic/api-key y nunca se imprime.
- Se publica como dimensión aparte, «Lo que responde la IA», sin sumar a la nota general en esta edición, porque
  depende de un solo proveedor (propuesta).

## Cómo se construye (decisión mía)

- Un medidor por dimensión, cada uno reanudable y repetible por separado, que escribe su resultado por sitio:
  Lighthouse y revisión (el de hoy, ampliado), DNS y correo, directorios, rastreadores (del informe de Lighthouse) y
  Claude. Un compilador los junta en `src/data/indice/2026-12.json`.
- Las listas y las mediciones viven fuera del repo (`~/Documentos/Paginas/investigaciones/indice-web-chilena/2026-12/`),
  como en noviembre.
- Lighthouse sigue en la jaula de memoria, un sitio a la vez. Unas 840 portadas a 16 s son cerca de 4 horas.
- Las páginas: ranking general y por dimensión (pestañas), ficha con las siete notas y el cambio respecto de
  noviembre, y una metodología que explica cada control con su fuente.

## Lo que queda al constructor

- El diseño visual de las pestañas y de la ficha (con capturas antes de cerrar, sin rótulos en mayúsculas ni cajas de
  aviso), dentro del lenguaje del índice actual.
- Los textos de cada control («por qué importa» y «cómo arreglarlo»), en el tono de los doce de hoy.

## Decisiones tras la revisión del constructor (23-11-2026, mías; el dueño delegó)

1. **Un sitio es un host** (sin «www.»). Los subdominios son sitios distintos (barrancas.educacionpublica.cl es el del
   SLEP Barrancas). «Comparte sitio» = mismo host. Correo y suplantación se mide solo si el host es el dominio propio
   de la institución (su dominio registrable, con gob.cl, gov.cl, mil.cl y co.cl como sufijos públicos); si el sitio
   cuelga del dominio de otro organismo, la dimensión es «no aplica» y no entra al promedio. En la prueba con Claude,
   acierta si el host de la respuesta es el host del sitio verificado (o uno que redirige a él).
2. **Nota general** = promedio de las dimensiones medidas, siempre que haya Lighthouse. Sin Lighthouse no hay nota
   general (queda «sin nota» con su motivo), aunque la ficha muestre las demás dimensiones medidas.
3. **Directorios** cuenta solo los que llena la propia institución: el Portal de Transparencia y, en municipios, el
   SINIM. Si la institución no está en uno, ese control no aplica. Aprueba si la dirección del directorio lleva al
   sitio actual, aunque sea redirigiendo. Wikidata (P856) se informa sin nota.
4. **Los doce controles de hoy siguen igual:** los siete de seguridad van a Seguridad y los cinco básicos (idioma,
   título, descripción, viewport, texto alternativo) a Buscadores. El revisor público «Revisa tu sitio» no cambia en
   esta edición y sigue comparando contra esos doce.
5. **Privacidad** tiene cuatro controles por tipo, sin escala inventada: sin publicidad de terceros, sin rastreo de
   redes sociales, sin analítica de terceros, sin herramientas de marketing o grabación de sesiones (categorías ad,
   social, analytics, y marketing o customer-success de third-party-web). El gestor de etiquetas no cuenta por sí solo:
   cuenta lo que carga.
6. **Noviembre** queda como historial: sus descargas (2026-11.csv y .json) siguen en la misma dirección. La ficha
   compara con noviembre solo Velocidad y calidad, lo único que se midió igual.
7. **robots.txt:** si no existe (404), aprueba (RFC 9309: sin robots.txt se puede rastrear todo); si da error de
   servidor o no responde, falla (el mismo RFC: se debe asumir que prohíbe todo).
