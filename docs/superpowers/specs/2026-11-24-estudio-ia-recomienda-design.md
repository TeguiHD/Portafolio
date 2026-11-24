# «¿A quién recomienda la IA?»: el marcador mensual (diseño corto)

Trabajo 3 del orden aprobado el 23-11-2026 («dale con ese orden»; «sigue con el trabajo 3», 24-11). Parte de la jugada 1
del informe `investigaciones/reports/GEO para marca personal en Chile.md` (sección «Medir como porcentaje de corridas»).

## Para qué

Saber, con números y cada mes, si los asistentes de IA nombran al dueño cuando alguien busca lo que él ofrece en Chile,
y a quién nombran en su lugar. Es el panel de medición de toda la estrategia GEO y, más adelante, el material de un
estudio público.

## Decisiones (mías; el dueño delegó)

- **Solo Claude** por ahora (es la única clave de API disponible). ChatGPT, Gemini y Perplexity se suman con sus claves.
- **18 preguntas fijas** en español: 3 de marca, 10 de nicho (lo que vende: sitios, tiendas, sistemas internos, SEO,
  seguridad, IA, el índice) y 5 de herramientas (las calculadoras chilenas, QR, RUT). Fijas para poder comparar meses.
- **5 corridas por pregunta y por modo** (de memoria y con búsqueda web): 180 respuestas al mes, por la API de lotes
  (mitad de precio). Costo estimado: unos USD 5 al mes con Opus 5.5.
- **Por respuesta se guarda:** si lo nombra (nombre o nicoholas.dev), si cita nicoholas.dev (en el texto o en las
  fuentes de la búsqueda), y los dominios que aparecen (los «competidores»). La métrica es el porcentaje de corridas.
- **Privado al principio:** los resultados quedan fuera del repo (`investigaciones/estudio-ia/AAAA-MM/`) con un
  resumen en Markdown. Publicarlo como página es una decisión del dueño, porque muestra su propia visibilidad.
- **Mensual automático:** un temporizador de systemd del usuario, el día 1 de cada mes; si el PC estaba apagado, corre
  al encender (Persistent=true).

## Fuera

- Revisar a mano «si lo describe bien» (lo sugiere el informe): se hace leyendo las respuestas guardadas.
- Una página pública: siguiente paso, con el visto bueno del dueño.
