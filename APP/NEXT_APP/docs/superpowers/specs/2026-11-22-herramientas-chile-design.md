# Herramientas chilenas y botón «Insertar» — diseño corto

Jugada 2 del informe «GEO para marca personal en Chile» (22-11-2026). El usuario la aprobó y pidió dejarla desplegada.

## Por qué
Las páginas de herramienta se llevan cerca del 28 % de las citas de IA (proveedor) y las herramientas gratis son el imán de
enlaces mejor documentado (generador de firmas de HubSpot). Una respuesta única para Chile tiene menos competencia que otro
generador de QR. El botón «Insertar» lleva la herramienta a sitios de terceros con un enlace de vuelta visible.

## Qué se hace
- Familia nueva del catálogo: **Chile** (la Calculadora de IVA pasa a ella).
- Cuatro herramientas nuevas, todo el cálculo en el navegador:
  - `rut` — Validador de RUT: valida y formatea, calcula el dígito verificador, revisa una lista y genera RUT de prueba.
  - `uf-utm` — Conversor UF, UTM y dólar: valores del día desde mindicador.cl (servidor, con caché), convierte en los dos
    sentidos. Los valores van en el HTML del servidor (lo leen las IA).
  - `sueldo-liquido` — Calculadora de sueldo líquido: de bruto a líquido y al revés, con AFP, salud, seguro de cesantía e
    impuesto único. Parámetros oficiales con fuente (archivo de investigación del 22-11-2026), UF y UTM del día.
  - `boleta-honorarios` — Calculadora de boleta de honorarios: bruto ↔ líquido con la retención vigente del año.
- **Insertar**: `/insertar/<slug>` muestra la herramienta sola, sin barra ni pie, con «Hecho con nicoholas.dev» enlazado.
  CSP `frame-ancestors *` y sin `X-Frame-Options` solo en esas rutas; `noindex` y canónica a la herramienta.
  En la página de cada herramienta, «Insertar en tu sitio» muestra el código del iframe más un enlace visible de vuelta.

## Decisiones propias (corregibles)
- «Insertar» va en las 5 calculadoras chilenas (IVA, RUT, UF/UTM, sueldo, honorarios), no en las 5 más usadas: quien
  inserta una calculadora es un sitio chileno (contador, pyme, blog de finanzas), que es el enlace que suma. Las de
  imágenes pesan demasiado para un iframe.
- Nada de valores inventados: cada parámetro tributario o previsional cita su fuente y su vigencia en el código y en la
  página; si la fuente de indicadores no responde, se dice y se puede escribir el valor a mano.

## Fuera de alcance
Gratificación, horas extra, APV, Isapre con GES detallado, trabajadores independientes que cotizan por honorarios en la
renta anual (se explica, no se calcula).
