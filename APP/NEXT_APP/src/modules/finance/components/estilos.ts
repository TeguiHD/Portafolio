/**
 * Vocabulario visual del interior de Finanzas. Solo tokens del tema (src/app/tokens.css), así cada pantalla se ve
 * bien en claro y en oscuro sin depender de tema-panel.css. La referencia es «Hoy» (src/modules/admin/hoy/hoy.css):
 * filas con líneas, cifras sobrias, títulos de sección pequeños y pocas cajas.
 * Tailwind lee estas cadenas tal cual: no armes clases por partes (`bg-${x}`), escríbelas completas.
 */

/** Foco visible de teclado, igual en todo el panel. */
export const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)]";

/** Hover suave de filas y botones sin fondo. */
export const SOBRE = "hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)]";

// ---------------------------------------------------------------- textos

/** Título de la página (h1). */
export const TITULO = "text-[clamp(28px,3.4vw,40px)] font-extrabold leading-tight tracking-[-0.04em] text-[var(--txt)]";
/** Frase bajo el título. */
export const BAJADA = "mt-1.5 max-w-[60ch] text-[15px] text-[var(--mut)]";
/** Título de sección (h2), pequeño y en gris como `.hoy h2`. */
export const SECCION = "text-[15px] font-semibold text-[var(--mut)]";
/** Texto secundario. */
export const SUAVE = "text-sm text-[var(--mut)]";
/** Enlace dentro del texto o «Ver todo». */
export const ENLACE = `font-medium text-[var(--acento)] underline-offset-4 hover:underline ${FOCO}`;

// ---------------------------------------------------------------- botones (40 px; 44 px en celular)

const BASE_BOTON = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-[color,background-color,opacity] duration-150 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10 ${FOCO}`;
/** Acción principal (una por pantalla). */
export const BOTON = `${BASE_BOTON} bg-[var(--acento)] text-[var(--acento-tinta)] hover:opacity-90`;
/** Acción secundaria. */
export const BOTON_SEC = `${BASE_BOTON} border border-[var(--linea-2)] text-[var(--txt)] ${SOBRE}`;
/** Acción que borra o no se puede deshacer. */
export const BOTON_PELIGRO = `${BASE_BOTON} bg-red-600 text-white hover:bg-red-700`;
/** Botón de solo ícono: siempre con `aria-label`. */
export const ICONO = `inline-grid size-11 shrink-0 place-items-center rounded-lg text-[var(--mut)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] hover:text-[var(--txt)] disabled:opacity-50 sm:size-10 ${FOCO}`;
/** Botón de solo ícono que borra. */
export const ICONO_PELIGRO = `inline-grid size-11 shrink-0 place-items-center rounded-lg text-[var(--mut)] transition-colors duration-150 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 sm:size-10 ${FOCO}`;

// ---------------------------------------------------------------- formularios

/** Campo de texto, número, fecha o select. */
export const CAMPO = `block min-h-11 w-full rounded-lg border border-[var(--linea-2)] bg-[var(--fondo-2)] px-3 py-2 text-[15px] text-[var(--txt)] placeholder:text-[var(--mut)] [color-scheme:dark] [:root[data-tema=claro]_&]:[color-scheme:light] disabled:opacity-60 sm:min-h-10 ${FOCO}`;
/** Etiqueta de un campo. */
export const ETIQUETA = "mb-1.5 block text-sm font-medium text-[var(--txt)]";
/** Ayuda bajo un campo. */
export const AYUDA = "mt-1.5 text-xs text-[var(--mut)]";
/** Casilla o radio con el acento del tema. */
export const CASILLA = "size-5 shrink-0 rounded accent-[var(--acento)]";

/** Opción elegible (tipo de cuenta, periodo, ícono…): base + uno de los dos estados. */
export const OPCION = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm transition-colors duration-150 sm:min-h-10 ${FOCO}`;
export const OPCION_SI = "border-[var(--acento)] bg-[color-mix(in_srgb,var(--acento)_12%,transparent)] font-medium text-[var(--txt)]";
export const OPCION_NO = `border-[var(--linea-2)] text-[var(--mut)] hover:text-[var(--txt)] ${SOBRE}`;

// ---------------------------------------------------------------- superficies y listas

/** Tarjeta: solo cuando agrupa algo de verdad (un formulario, un bloque con su título). */
export const TARJETA = "rounded-xl border border-[var(--linea)] bg-[var(--sup)]";
/** Lista de filas: línea arriba y cada fila con su línea abajo. */
export const LISTA = "border-t border-[var(--linea)]";
export const FILA = `flex items-center gap-3 border-b border-[var(--linea)] px-1 py-3.5 transition-colors duration-150 sm:gap-4 ${SOBRE}`;
/** Ícono redondo al inicio de una fila (emoji de la categoría o ícono lucide). */
export const FICHA = "grid size-10 shrink-0 place-items-center rounded-full bg-[var(--fondo-2)] text-lg text-[var(--mut)]";
/** Estado vacío de una lista. */
export const VACIO = "border-y border-[var(--linea)] px-2 py-10 text-center text-[var(--mut)]";
/** Mensaje de error en línea (va con role="alert"). */
export const ERROR = "rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400";
/** Etiqueta pequeña de estado: base + color de estado (`bg-emerald-500/10 text-emerald-400`, etc.). */
export const MARCA = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium";
export const MARCA_NEUTRA = `${MARCA} bg-[var(--fondo-2)] text-[var(--mut)]`;

/** Riel de una barra de progreso; la parte llena va con `h-full rounded-full` y un color de estado. */
export const RIEL = "h-1.5 overflow-hidden rounded-full bg-[var(--linea-2)]";

/** Ruedita de «guardando…» (hereda el color del texto). */
export const GIRA = "size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none";

/** Montos: siempre con cifras tabulares. */
export const CIFRA = "tabular-nums";
/** Color de un monto según su signo, con las variables de sube/baja del tema. */
export const SUBE = "text-[var(--sube)]";
export const BAJA = "text-[var(--baja)]";

// ---------------------------------------------------------------- gráficos

/**
 * Colores de serie de los gráficos (ingresos y gastos), como variables para usar en `bg-[var(--serie-…)]` o `fill`.
 * Verde azulado frente a rosa: se distinguen también con daltonismo (ΔE ≥ 10 en deuteranopía y protanopía, validado
 * en claro y en oscuro contra el fondo y la superficie). El par verde/rojo de sube/baja no pasa esa prueba (ΔE 4–6).
 * Va en el contenedor del gráfico.
 */
export const SERIES = "[--serie-ingreso:#0d9488] [--serie-gasto:#f43f5e] [:root[data-tema=claro]_&]:[--serie-gasto:#be123c]";
