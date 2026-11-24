# Separador de miles al escribir — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada campo numérico del sitio muestre el número a la chilena mientras se escribe, según lo que es.

**Architecture:** Funciones puras (formatear al escribir, mapear el cursor, normalizar lo pegado) en `src/lib/tools/numeros.ts`, junto a `numeroCL`. Un componente `CampoNumero` controlado por un número (`number | null`) que guarda adentro el texto visible y repone el cursor. Cada campo de monto pasa a usarlo; los que nunca llevan separador quedan en una lista explícita que revisa una prueba de fuente.

**Tech Stack:** Next.js 16 (App Router, React 19), TypeScript, Playwright 1.57 (también para pruebas sin navegador).

**Spec:** `docs/superpowers/specs/2026-11-23-separador-miles-design.md`

## Global Constraints

- Formato chileno: punto en los miles, coma decimal. Montos sin decimales (`1.234.567`); UF, %, monedas, BTC con coma (`1.234,56`).
- Nunca separador: OTP, años, puertos/prefijo CIDR, coordenadas, RUT, día del mes, cuotas, días de aviso, píxeles, probabilidad (%).
- `<input type="text">` con `inputMode="numeric"` (sin decimales) o `"decimal"`; `autoComplete="off"`; nunca `type="number"` en montos.
- Pegar con o sin puntos da lo mismo; un único punto seguido de un número de dígitos distinto de 3 es decimal (solo en campos con decimales).
- Sin dependencias nuevas. Nada de `next dev`; compilar con la jaula de memoria (`NEXT_BUILD_CPUS=3`).

## Review Focus

1. Escribir un punto como decimal en un teclado que da «.» (39512 → «.» → 34): debe quedar 39.512,34, no 3.951.234.
2. Borrar con Retroceso justo después de un punto de miles: debe borrar el dígito anterior y el cursor quedar en su sitio.
3. Un valor que cambia desde afuera (botón «Todo lo que falta», reiniciar el formulario): el campo debe mostrar el nuevo valor formateado.
4. Escribir más de 13 dígitos enteros o más decimales que el tope: se ignora lo que sobra, sin saltos del cursor.
5. Campo vacío: `null` hacia el formulario, nunca `0` (un monto obligatorio vacío debe seguir marcándose como faltante).

---

### Task 1: Funciones puras

**Files:**
- Modify: `APP/NEXT_APP/src/lib/tools/numeros.ts`
- Test: `APP/NEXT_APP/tests/e2e/numeros-campo.spec.ts` (sin navegador)

**Interfaces:**
- Produces:
  - `interface OpcionesNumero { decimales: number; negativos?: boolean }` (decimales 0 = entero).
  - `textoDeNumero(n: number | null, o: OpcionesNumero): string` — `1234567 → "1.234.567"`, `39512.34 (2) → "39.512,34"`, `null → ""`, `-5 (negativos) → "-5"`.
  - `numeroDeTexto(texto: string): number | null` — lee el texto visible (puntos = miles, coma = decimal); `""`, `"-"`, `","` → `null`.
  - `alEscribir(anterior: string, nuevo: string, cursor: number, o: OpcionesNumero): { texto: string; cursor: number }` — detecta el tramo insertado (prefijo y sufijo comunes con `anterior`); si mide más de 1 carácter lo normaliza como pegado; si es «.» en un campo con decimales y no hay coma, lo toma como coma; luego deja solo dígitos (más signo y una coma si corresponde), quita ceros a la izquierda, corta a 13 enteros y a `decimales` decimales, agrupa de a tres y ubica el cursor después del mismo dígito significativo.

- [ ] **Step 1: Escribir las pruebas** (`test.describe("campo numérico: funciones")`), con estos casos exactos:
  - `alEscribir("", "1234567", 7, {decimales:0})` → `{ texto: "1.234.567", cursor: 9 }`
  - escribir «8» en medio: `alEscribir("1.234.567", "1.2384.567", 5, {decimales:0})` → `{ texto: "12.384.567", cursor: 5 }`
  - borrar un dígito: `alEscribir("1.234.567", "1.24.567", 3, {decimales:0})` → `{ texto: "124.567", cursor: 2 }`
  - pegar con puntos: `alEscribir("", "$ 1.234.567", 11, {decimales:0})` → texto `"1.234.567"`
  - pegar decimal inglés: `alEscribir("", "39512.34", 8, {decimales:2})` → `"39.512,34"`; el mismo en entero → `"3.951.234"`
  - pegar `"1.234"` con decimales 2 → `"1.234"` (miles, no decimal)
  - punto como coma: `alEscribir("39.512", "39.512.", 7, {decimales:2})` → `{ texto: "39.512,", cursor: 7 }`
  - tope de decimales: `alEscribir("1,25", "1,257", 5, {decimales:2})` → `"1,25"`
  - ceros: `alEscribir("0", "05", 2, {decimales:0})` → `{ texto: "5", cursor: 1 }`; `alEscribir("", "0,5", 3, {decimales:2})` → `"0,5"`
  - tope de 13 enteros: 14 dígitos → 13 dígitos agrupados
  - negativos: `alEscribir("", "-1500", 5, {decimales:0, negativos:true})` → `"-1.500"`; sin `negativos` → `"1.500"`
  - `numeroDeTexto("1.234.567,5") === 1234567.5`, `numeroDeTexto("") === null`, `numeroDeTexto("39.512,") === 39512`
  - ida y vuelta: para `[0, 7, 1000, 1234567.89, 0.00012345]` y sus decimales, `numeroDeTexto(textoDeNumero(n, o)) === n`

- [ ] **Step 2:** `npx playwright test tests/e2e/numeros-campo.spec.ts --project=chromium` → FALLA (las funciones no existen).
- [ ] **Step 3:** Implementar las tres funciones en `numeros.ts`.
- [ ] **Step 4:** Mismo comando → PASA. `npx tsc --noEmit` limpio.
- [ ] **Step 5:** Commit `feat(numeros): formato chileno al escribir, con el cursor en su sitio`.

### Task 2: `CampoNumero` y las calculadoras chilenas

**Files:**
- Create: `APP/NEXT_APP/src/components/ui/CampoNumero.tsx` (`"use client"`)
- Modify: `src/components/tools/chile/CalculadoraSueldo.tsx`, `CalculadoraHonorarios.tsx`, `ConversorIndicadores.tsx`, `CalculadoraIva.tsx`
- Test: `APP/NEXT_APP/tests/e2e/numeros-campo.spec.ts` (bloque con navegador)

**Interfaces:**
- Consumes: Task 1.
- Produces: `CampoNumero(props: Omit<InputHTMLAttributes<HTMLInputElement>, "value"|"defaultValue"|"onChange"|"type"|"inputMode"> & { valor: number | null; alCambiar: (n: number | null) => void; decimales?: number; negativos?: boolean; ref?: Ref<HTMLInputElement> })`.
  - Guarda el texto visible en estado; si `numeroDeTexto(texto) !== valor`, lo reemplaza por `textoDeNumero(valor)`.
  - `onChange` → `alEscribir`; el cursor se repone en `useLayoutEffect`.
  - `onKeyDown`: Retroceso con el cursor justo después de «.» (o Supr justo antes) mueve el cursor un lugar para borrar el dígito; después llama al `onKeyDown` recibido.
  - `inputMode` = `"decimal"` si `decimales > 0`, si no `"numeric"`; `autoComplete="off"` salvo que venga otro.

- [ ] **Step 1: Pruebas en el navegador** (`test.describe("campo numérico: en las herramientas")`):
  - sueldo: vaciar «Sueldo bruto mensual», `pressSequentially("1234567")` → valor `"1.234.567"`.
  - cursor: con `"1.234.567"`, poner el cursor tras el «2» (posición 3), escribir «9» → `"12.934.567"` y `selectionStart === 4`.
  - retroceso sobre el punto: con `"1.234.567"`, cursor en 6 (tras el segundo punto), Retroceso → `"123.567"`, `selectionStart === 3`.
  - pegar: `fill("1.500.000")` sigue dando el caso verificado (la prueba existente de `herramientas-chile.spec.ts` no cambia).
  - UF/UTM «Monto»: `pressSequentially("2.5")` → `"2,5"`.
- [ ] **Step 2:** contra la compilación actual (`prod-local.sh arriba` + `probar tests/e2e/numeros-campo.spec.ts`) → FALLAN las del navegador.
- [ ] **Step 3:** Crear `CampoNumero` y usarlo en las 4 calculadoras: montos en pesos `decimales={0}`; plan de Isapre (UF), montos del conversor, valores manuales UF/UTM/USD, monto e impuesto personalizado del IVA `decimales={2}`. El estado de cada una pasa de texto a `number | null` (valores iniciales iguales a los de hoy: 1.200.000, etc.), y `leerMonto` deja de usarse donde ya no haga falta.
- [ ] **Step 4:** Compilar en la jaula, `prod-local.sh arriba`, `probar tests/e2e/numeros-campo.spec.ts tests/e2e/herramientas-chile.spec.ts` → PASAN.
- [ ] **Step 5:** Commit `feat(herramientas): las calculadoras chilenas ponen los puntos mientras escribes`.

### Task 3: El resto de los campos, con la prueba de fuente

**Files:**
- Modify (públicas): `src/app/herramientas/aleatorio/page.tsx` (ganadores, 0), `src/app/herramientas/subredes/page.tsx` (hosts VLSM, 0), `src/app/herramientas/qr/page.tsx` (monto BTC, 8), `src/components/tools/ImageTransformStudio.tsx` (peso objetivo KB, 0).
- Modify (panel, todos `decimales={0}` salvo lo indicado): `admin/finance/accounts/client.tsx` (saldo, 2, negativos), `admin/finance/transactions/batch/page.tsx`, `admin/cotizaciones/[clientId]/edit-quotation-modal.tsx`, `admin/cotizaciones/[clientId]/PaymentModal.tsx`, `admin/cotizaciones/components/UnifiedQuotationCreation.tsx` (2 totales), `admin/cotizaciones/components/quotation-form.tsx` (costo y precio), `admin/gestion-comercial/contratos/contracts-list.tsx` (valor), `admin/gestion-comercial/pagos/registrar-pago.tsx` (monto), `admin/gestion-comercial/gastos/expenses-list.tsx`, `admin/gestion-comercial/pipeline/pipeline-board.tsx` (valor estimado), `modules/finance/components/{FinanceOnboarding (2, negativos), BudgetForm (2), RecurringForm (2), GoalForm ×2 (2), GoalList (2), TransactionForm (monto 2, cantidad 2), CurrencyConverter (2)}.tsx`.
- Test: `APP/NEXT_APP/tests/e2e/numeros-campo.spec.ts` (prueba de fuente)

**Interfaces:**
- Consumes: `CampoNumero` (Task 2).

- [ ] **Step 1: Prueba de fuente** «todo campo numérico usa CampoNumero, salvo los que nunca llevan separador»: recorre `src/**/*.tsx` (sin `CampoNumero.tsx`), cuenta por archivo `inputMode="numeric"`, `inputMode="decimal"` y `type="number"`, y compara con esta lista exacta de excepciones: `acceso/page.tsx` 1 (OTP), `admin/profile/client.tsx` 2 (OTP), `herramientas/subredes/page.tsx` 1 (prefijo CIDR), `herramientas/qr/page.tsx` 2 (latitud y longitud), `components/tools/ImageTransformStudio.tsx` según sus campos en píxeles, `gestion-comercial/contratos/contracts-list.tsx` 2 (días de aviso: `type` + `inputMode` en la misma etiqueta), `gestion-comercial/pagos/registrar-pago.tsx` 4 (cuota número y total), `gestion-comercial/pipeline/pipeline-board.tsx` 2 (probabilidad), `modules/finance/components/RecurringForm.tsx` 2 (día del mes). Cualquier otro archivo con esos atributos, o un conteo distinto, falla con el nombre del archivo.
- [ ] **Step 2:** `npx playwright test tests/e2e/numeros-campo.spec.ts -g "fuente" --project=chromium` → FALLA listando los archivos pendientes.
- [ ] **Step 3:** Pasar cada campo de la lista a `CampoNumero`. Donde el formulario guarda dígitos en texto (`form.monto = "1234567"`), convertir en el borde: `valor={form.monto ? Number(form.monto) : null}` y `alCambiar={(n) => set(n === null ? "" : String(n))}`; donde guarda texto visible y lo lee con `numeroCL`, pasar a guardar el número. El envío al servidor no cambia de forma.
- [ ] **Step 4:** Prueba de fuente → PASA; `npx tsc --noEmit` y `npx eslint . --max-warnings 0` limpios; compilar y `probar` las suites de herramientas (`numeros-campo`, `herramientas-chile`, `herramientas-*`, `qr-*`, `mesa-imagenes`, `tools-*`) → PASAN.
- [ ] **Step 5:** Commit `feat(panel): montos con separador de miles mientras escribes en cotizaciones, pagos, contratos y finanzas`.

### Task 4: Desplegar

- [ ] `construir-imagen.sh && desplegar.sh`; pruebas contra producción de `numeros-campo` y `herramientas-chile` → PASAN. Actualizar la memoria (producción = nuevo commit).
