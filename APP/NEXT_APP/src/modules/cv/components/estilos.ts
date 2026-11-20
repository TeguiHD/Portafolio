/**
 * Clases compartidas del editor de Currículum. Usan los tokens del tema (src/app/tokens.css), así que valen en claro y
 * oscuro sin pasar por tema-panel.css. Mismo lenguaje que el armazón y «Hoy»: líneas, cifras sobrias, pocas cajas.
 */

export const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)]";

/** Botón principal (acento). */
export const BOTON = `inline-flex min-h-11 sm:min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--acento)] px-4 text-sm font-semibold text-[var(--acento-tinta)] transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCO}`;

/** Botón secundario (borde). */
export const BOTON_SEC = `inline-flex min-h-11 sm:min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--linea-2)] px-4 text-sm font-medium text-[var(--txt)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 ${FOCO}`;

/** Botón cuadrado de un ícono (lleva aria-label). */
export const BOTON_ICONO = `inline-flex size-11 sm:size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--linea-2)] text-[var(--mut)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] hover:text-[var(--txt)] disabled:cursor-not-allowed disabled:opacity-40 ${FOCO}`;

/** Acción destructiva, discreta. */
export const BOTON_PELIGRO = `inline-flex min-h-11 sm:min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-red-400 transition-colors duration-150 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCO}`;

/** Botón que se prende y apaga (con aria-pressed). */
export const INTERRUPTOR = `inline-flex min-h-11 sm:min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[var(--linea-2)] px-3 text-sm text-[var(--mut)] transition-colors duration-150 hover:text-[var(--txt)] aria-pressed:border-[var(--acento)] aria-pressed:bg-[color-mix(in_srgb,var(--acento)_13%,transparent)] aria-pressed:text-[var(--txt)] disabled:cursor-not-allowed disabled:opacity-50 ${FOCO}`;

/** Campo de texto, select o textarea. */
export const CAMPO = "w-full min-h-11 sm:min-h-10 rounded-lg border border-[var(--linea-2)] bg-[var(--fondo-2)] px-3 py-2 text-sm text-[var(--txt)] placeholder:text-[var(--mut)] [color-scheme:dark] [:root[data-tema=claro]_&]:[color-scheme:light] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--acento)] disabled:cursor-not-allowed disabled:opacity-50";

export const ETIQUETA = "mb-1.5 block text-sm text-[var(--mut)]";

/** Título pequeño de sección, como los h2 de «Hoy». */
export const TITULO = "text-[15px] font-semibold text-[var(--mut)]";

/** Etiqueta neutra (fuente, modalidad, tecnología). */
export const CHIP = "inline-flex items-center gap-1 rounded-md border border-[var(--linea)] px-2 py-0.5 text-xs text-[var(--mut)]";

/** Enlace de texto con acento. */
export const ENLACE = `inline-flex items-center gap-1 rounded text-[var(--acento)] underline-offset-2 hover:underline ${FOCO}`;

/** Fila de lista con línea divisoria y hover suave. */
export const FILA_HOVER = "transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)]";
