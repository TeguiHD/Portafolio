# Auditoría técnica de las 29 herramientas (2026-09-02)

Objetivo: detectar herramientas que no usan tecnología actual según las prioridades del
proyecto: el trabajo corre en el navegador (VPS pequeño), APIs web modernas, sin librerías
legadas, sin bloquear el hilo principal, UI consistente.

## Resultado global

- 26 de 29 procesan íntegramente en el navegador. `dns` usa `/api/tools/dns` (node:dns) y
  `regex` usa `/api/tools/regex-ai` solo para la explicación con IA; ambos justificados.
- Librerías de las herramientas al día: qrcode 1.5, browser-image-compression 2.0 (Web Worker),
  @imgly/background-removal 1.7 (WASM), react-easy-crop 5.5, jszip 3.10.
- Fuera de las herramientas: `html2canvas` (admin/cotizaciones) sin mantenimiento desde 2022;
  candidato a `html-to-image`. `latex.js` y `jspdf` tampoco se usan en herramientas.

## Severidad ALTA (corregido en el commit que acompaña a este documento)

| slug | problema | corrección |
|---|---|---|
| esteganografia-imagen | bucle LSB bit a bit en el hilo principal con imágenes de hasta 20 MB; `new Image()` + data URL | Web Worker con `createImageBitmap` + `OffscreenCanvas` (`src/workers/stego.worker.ts`), núcleo puro `src/lib/stego-lsb.ts` con tests, respaldo en hilo principal |
| regex | el "timeout ReDoS" era un `setTimeout` que no puede interrumpir una regex síncrona; el resaltado volvía a ejecutar la regex por fragmento en el render | Worker con `terminate()` real (`src/lib/regex-client.ts`), rangos calculados en el worker para resaltar sin regex en el render |
| base64 | `btoa` lanza con texto fuera de Latin-1 (ñ, 中, emojis) | `TextEncoder` + `Uint8Array.prototype.toBase64` nativo cuando existe (`src/lib/base64-utf8.ts`) |
| ascii | re-decodificaba la imagen con `new Image()` + data URL en cada cambio de ajuste (la convolución corre sobre el lienzo reducido, no era el coste real) | `createImageBitmap` una vez, vista previa por object URL |
| ImageDropzone (compartido) | bug: `handleFiles` recibía el `FileList` vivo y `onChange` limpiaba `input.value` antes de terminar la validación; en la ruta "clic" los consumidores recibían `undefined` como `File` | instantánea con `Array.from(fileList)` |

## Severidad MEDIA (corregido en el segundo commit)

| slug | corrección |
|---|---|
| favicon | una decodificación (`imageBitmapFromSource`) para los 8 tamaños; el ZIP reutiliza los PNG ya generados |
| convertir-ico | una decodificación para todos los tamaños del ICO |
| convertir-imagen | conversión en vivo (sin botón) con bitmap único y cancelación de conversiones obsoletas |
| redimensionar | vista previa en vivo (sin botón) desde un bitmap cacheado; `drawImageToCanvas` acepta `ImageBitmap` |
| qr | PNG por `toBlob` + object URL en lugar de `toDataURL` |

## Severidad MEDIA (pendiente, requiere decisión)

1. `dns`: DNS-over-HTTPS desde el navegador (Cloudflare/Google JSON). Alivia el VPS, pero
   las consultas del usuario pasarían a un tercero: decisión de producto/privacidad.
2. Unificar UI con los primitivos de ImageStudio (StudioCard/Stage/Metric/Chip) en
   base64, convertir-imagen, convertir-ico, favicon, metadatos, comprimir-imagen. Trabajo
   de diseño de varias horas; conviene acordar el alcance.
3. Menores: `metadatos` con `createImageBitmap` en la limpieza no-JPEG; `unidades` con
   `Intl.NumberFormat`.

## Severidad BAJA

quitar-fondo, recortar-imagen, marca-agua, paleta-colores, comprimir-imagen, qr, claves,
aleatorio, subredes, jwt, json, binario, unidades, impuestos, enlaces, nginx, reverse-shell,
banner-ascii, esteganografia (emoji): ya usan la API nativa adecuada.
