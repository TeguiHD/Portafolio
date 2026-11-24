# Separador de miles al escribir (diseño corto)

Aprobado por el dueño el 23-11-2026 («dale con ese orden»), sobre las reglas que se le mostraron.

## Para qué

Que todo campo donde se escribe un número muestre el número como se lee en Chile mientras se escribe: 1.234.567, no 1234567.
Un monto mal leído (un cero de más) es un error caro en una cotización o en un sueldo.

## Reglas (decididas)

- Montos y cantidades: punto en los miles, sin decimales (`1.234.567`).
- UF, porcentajes, monedas extranjeras y BTC: punto en los miles y coma decimal (`1.234,56`), con un tope de decimales por campo.
- Nunca llevan separador: códigos de acceso (OTP), años, puertos y prefijos de subred, coordenadas, RUT (tiene su propio formato), días del mes, cuotas, días de aviso, píxeles.
- El cursor no salta: escribir o borrar en medio del número deja el cursor junto al dígito que se tocó.
- Borrar sobre un punto borra el dígito de al lado (si no, el punto vuelve y parece que la tecla no hizo nada).
- Pegar «1234567», «1.234.567», «$ 1.234.567» o «1.234,56» da el mismo número. Un punto seguido de algo distinto de tres dígitos (por ejemplo «39512.34», copiado de una planilla en inglés) se lee como decimal, solo en los campos con decimales.

## Cómo (mi decisión)

- Funciones puras en `src/lib/numeros/campo.ts`: dar formato mientras se escribe (texto + posición del cursor) y leer el número. Sin dependencias.
- Un componente `CampoNumero` (`src/components/ui/CampoNumero.tsx`): `<input type="text" inputmode="numeric|decimal">` controlado por un valor canónico en texto (`"1234567"`, `"39512.34"`, `""`), que es lo que ya guardan casi todos los formularios. Pasa el resto de las propiedades al `<input>` (id, clase, aria, onFocus…).
- `type="number"` sale de los campos de montos: según la guía de formularios, agrega flechas y rompe al pegar.
- Se cambian las herramientas públicas (sueldo, honorarios, UF/UTM, IVA, aleatorio, subredes, QR-BTC, imágenes-KB) y los formularios del panel (cotizaciones, pagos, contratos, gastos, pipeline, finanzas).

## Pruebas

- Funciones puras: casos de escritura, borrado, pegado y decimales (Playwright sin navegador, como `indice.spec.ts`).
- En el navegador: la calculadora de sueldo y el conversor (escribir, borrar en medio, pegar).
- Una prueba de fuente: ningún `inputMode="numeric|decimal"` ni `type="number"` queda fuera de `CampoNumero`, salvo la lista explícita de campos que nunca llevan separador.

## Fuera

- No cambia cómo se muestran los números que no se escriben (resultados, tablas): ya usan `Intl.NumberFormat("es-CL")`.
- El panel no tiene pruebas en el navegador sin la base sembrada: lo cubren las funciones puras, la prueba de fuente y `tsc`.
