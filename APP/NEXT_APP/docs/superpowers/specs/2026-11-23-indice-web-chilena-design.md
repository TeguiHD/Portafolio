# Índice de la Web Chilena (jugada 4 del informe GEO)

## Para qué

Que las IA y la prensa citen «según el Índice de la Web Chilena» y que eso lleve a nicoholas.dev. Copia el modelo del
WebAIM Million (medición anual, metodología pública, datos abiertos) y el del Website Grader de HubSpot (que cualquiera
revise su sitio y se compare). Fuente: `~/Documentos/Paginas/investigaciones/reports/GEO para marca personal en Chile.md`.

## Qué incluye (edición de noviembre de 2026)

- **Universo:** todas las municipalidades, ministerios, gobiernos regionales y universidades de Chile. Sin elegir ni
  privados con fines de lucro: son instituciones públicas o de interés público, así que una nota baja no es un ataque.
- **Medición:** la portada de cada una, con Lighthouse 13.4.1 (emulación de celular, la de PageSpeed Insights), una
  corrida, de a un sitio por vez desde Chile. Si no carga en dos intentos, queda «sin respuesta» (también es dato).
- **Doce controles propios** (src/lib/indice/revision.ts): 7 de seguridad (HTTPS, redirección a HTTPS, HSTS, CSP,
  marcos, nosniff, referrer) y 5 básicos del HTML (lang, título, descripción, viewport, alt), sobre lo que entrega el
  servidor sin ejecutar JavaScript. Lighthouse no sirve para esto: marca HSTS y marcos como «no aplica» y aprueba CSP
  ausente. La misma función mide el índice y el revisor público: la comparación es pareja.
- **Nota del índice:** promedio simple de las cuatro notas de Lighthouse. Ranking por nota, luego controles, luego nombre.
- **Páginas:** /indice-web-chilena (hallazgos calculados, buscador, histogramas por grupo, cumplimiento por control,
  cita, descargas), /[grupo] (ranking completo filtrable), /[grupo]/[slug] (ficha con anillos, métricas, controles con
  su arreglo, fallas de accesibilidad, vecinos de la región), /metodologia, /revisa-tu-sitio, /datos/AAAA-MM.csv|json.
- **Datos abiertos** CC BY 4.0 (decisión mía: la atribución obligatoria es lo que trae enlaces y citas).

## Revisor público y SSRF

POST /api/indice/revisar pide un sitio que escribe cualquiera. Defensas (src/lib/indice/pedir-seguro.server.ts): solo
http/https sin puerto, usuario ni IP literal; lookup DNS propio que rechaza si cualquier dirección no es pública y
conecta a esa misma (sin rebinding); cada redirección se revalida (máx. 5); 15 s y 3 MB de tope; 6 revisiones cada
10 min por IP, 3 a la vez en el servidor, caché de 10 min.

## Cómo repetirlo (cada edición)

1. Revisar la lista `~/Documentos/Paginas/investigaciones/indice-web-chilena/entidades.json`.
2. `LH_DIR=<node_modules con lighthouse@13.4.1> CHROME_PATH=<chrome> node scripts/indice/medir.mjs <entidades> <carpeta>`
   (en jaula de memoria, un sitio a la vez; ~20 s por sitio).
3. `node scripts/indice/compilar.mjs <entidades> <carpeta> AAAA-MM > src/data/indice/AAAA-MM.json` y apuntar
   `src/lib/indice/datos.ts` a la nueva edición.
4. Revisar a mano los extremos (las más altas, las más bajas, las sin respuesta) antes de publicar.

## Límites conocidos

Una corrida (el rendimiento varía unos puntos), solo la portada, revisión automática de accesibilidad (no certifica).
Están dichos en /metodologia.
