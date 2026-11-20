/**
 * Clases compartidas de Propuestas y Clientes en el panel. Solo tokens del tema (src/app/tokens.css): valen en claro y
 * oscuro sin depender de tema-panel.css. Tailwind lee estas cadenas tal cual: no armes nombres de clase por partes.
 */

export const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)]";

/** Fondo suave al pasar el puntero. */
export const SOBRE = "hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)]";

const BASE_BOTON = `inline-flex items-center justify-center gap-2 min-h-11 md:min-h-10 px-4 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${FOCO}`;

/** Acción principal de la vista. */
export const BOTON = `${BASE_BOTON} bg-[var(--acento)] text-[var(--acento-tinta)] font-semibold hover:bg-[color-mix(in_srgb,var(--acento)_86%,var(--txt))]`;

export const BOTON_SEC = `${BASE_BOTON} border border-[var(--linea-2)] text-[var(--txt)] ${SOBRE}`;

/** Sin borde, para acciones de menos peso (volver, cancelar dentro de una fila). */
export const BOTON_SUAVE = `${BASE_BOTON} text-[var(--mut)] hover:text-[var(--txt)] ${SOBRE}`;

export const BOTON_PELIGRO = `${BASE_BOTON} border border-red-400/40 text-red-400 hover:bg-red-500/10`;

/** Botón cuadrado con solo ícono: lleva siempre aria-label. */
export const BOTON_ICONO = `inline-grid place-items-center size-11 md:size-10 shrink-0 rounded-lg text-[var(--mut)] transition-colors duration-150 hover:text-[var(--txt)] hover:bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] disabled:opacity-40 disabled:cursor-not-allowed ${FOCO}`;

/** Botón pequeño dentro de una barra de herramientas (editor, vista previa). */
export const BOTON_MINI = `inline-flex items-center gap-1.5 min-h-9 px-2.5 rounded-md border border-[var(--linea-2)] text-xs font-medium text-[var(--mut)] transition-colors duration-150 hover:text-[var(--txt)] ${SOBRE} disabled:opacity-40 disabled:cursor-not-allowed ${FOCO}`;

const BASE_CAMPO = "w-full px-3 py-2 rounded-lg bg-[var(--fondo-2)] border border-[var(--linea-2)] text-sm text-[var(--txt)] placeholder:text-[var(--mut)] transition-colors duration-150 focus:outline-none focus:border-[var(--acento)] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--acento)] aria-[invalid=true]:border-red-400";

/** Campo de texto, número, fecha o lista. Para marcar error: aria-invalid. */
export const CAMPO = `${BASE_CAMPO} min-h-11 md:min-h-10`;

/** Área de texto libre (notas, alcance). */
export const AREA = `${BASE_CAMPO} resize-y`;

/** Área de código (HTML, LaTeX): monoespaciada, sin cambiar de tamaño. */
export const CODIGO = "w-full px-3 py-3 rounded-lg bg-[var(--fondo-2)] border border-[var(--linea-2)] font-mono text-xs leading-[18px] text-[var(--txt)] placeholder:text-[var(--mut)] resize-none focus:outline-none focus:border-[var(--acento)]";

export const ETIQUETA = "block mb-1.5 text-sm font-medium text-[var(--txt)]";
export const AYUDA = "mt-1 text-xs text-[var(--mut)]";
export const ERROR_CAMPO = "mt-1 text-xs text-red-400";

/** Agrupa algo de verdad (un cliente, el portal): nada de cajas decorativas. */
export const TARJETA = "rounded-xl border border-[var(--linea)] bg-[var(--sup)]";

export const H1 = "text-2xl sm:text-3xl font-bold tracking-tight text-[var(--txt)]";

/** Título de sección pequeño, como los de «Hoy». */
export const TITULO_SECCION = "text-[15px] font-semibold text-[var(--mut)]";

export const CHIP = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium";
export const CHIP_NEUTRO = `${CHIP} bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] text-[var(--mut)]`;
export const CHIP_ACENTO = `${CHIP} bg-[color-mix(in_srgb,var(--acento)_14%,transparent)] text-[var(--acento)]`;

export const ENLACE = `rounded-sm text-[var(--acento)] underline underline-offset-2 decoration-[color-mix(in_srgb,var(--acento)_45%,transparent)] hover:decoration-[var(--acento)] ${FOCO}`;

/** Iniciales del cliente en un cuadro con el acento. */
export const INICIALES = "grid place-items-center shrink-0 rounded-lg bg-[color-mix(in_srgb,var(--acento)_14%,transparent)] font-mono font-semibold text-[var(--acento)]";

/** Opción elegible (Pública / Privada, medio de pago): con aria-pressed. Sin relleno: lo pone quien la usa. */
export const OPCION = `rounded-xl border text-left transition-colors duration-150 ${FOCO} border-[var(--linea-2)] ${SOBRE} aria-pressed:border-[var(--acento)] aria-pressed:bg-[color-mix(in_srgb,var(--acento)_10%,transparent)]`;

/** Barra de avance (pagos, hitos). */
export const BARRA = "h-1.5 overflow-hidden rounded-full bg-[var(--linea-2)]";
