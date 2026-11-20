/**
 * Clases comunes de Comercial. Solo tokens del tema (src/app/tokens.css): valen igual en claro y en oscuro sin pasar
 * por tema-panel.css. Foco visible con el acento y 44 px de alto en celular (40 px desde sm).
 */

const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)]";
const suave = "hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)]";
const boton = `inline-flex min-h-11 sm:min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${foco}`;

export const titulo = "text-[clamp(28px,3.2vw,40px)] font-extrabold leading-none tracking-[-0.04em] text-[var(--txt)]";
export const bajada = "mt-2 max-w-[62ch] text-[15px] text-[var(--mut)]";
/** Título de sección, pequeño y apagado (como `.hoy h2`). */
export const subtitulo = "mb-2 flex items-baseline gap-2 text-[15px] font-semibold text-[var(--mut)]";
export const vacio = "border-t border-[var(--linea)] px-0.5 py-5 text-[var(--mut)]";

export const campo = "w-full min-h-11 rounded-lg border border-[var(--linea-2)] bg-[var(--fondo-2)] px-3 py-2 text-sm text-[var(--txt)] placeholder:text-[var(--mut)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--acento)]";
export const etiqueta = "mb-1.5 block text-sm text-[var(--mut)]";

export const botonPrincipal = `${boton} font-semibold bg-[var(--acento)] text-[var(--acento-tinta)] hover:opacity-90`;
export const botonSecundario = `${boton} border border-[var(--linea-2)] font-medium text-[var(--txt)] ${suave}`;
export const botonPeligro = `${boton} border border-[var(--linea-2)] font-medium text-red-400 hover:bg-red-500/10`;
/** Botón cuadrado con solo un ícono: siempre con `aria-label`. */
export const botonIcono = `inline-grid size-11 sm:size-10 shrink-0 place-items-center rounded-lg text-[var(--mut)] transition-colors duration-150 hover:text-[var(--txt)] ${suave} ${foco}`;
export const botonIconoPeligro = `inline-grid size-11 sm:size-10 shrink-0 place-items-center rounded-lg text-[var(--mut)] transition-colors duration-150 hover:bg-red-500/10 hover:text-red-400 ${foco}`;

/** Botón de filtro o de elección (con `aria-pressed`): el elegido lleva el acento de fondo, no solo de color. */
export function chip(elegido: boolean): string {
    return `inline-flex min-h-11 sm:min-h-10 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors duration-150 ${foco} ${elegido
        ? "border-[var(--acento)] bg-[color-mix(in_srgb,var(--acento)_13%,transparent)] font-semibold text-[var(--txt)]"
        : `border-[var(--linea-2)] text-[var(--mut)] hover:text-[var(--txt)] ${suave}`}`;
}

/** Tablas: encabezados apagados, filas con línea divisoria, cifras a la derecha. */
export const cajaTabla = "overflow-x-auto overscroll-x-contain rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)]";
const thBase = "px-3 py-2.5 text-sm font-medium whitespace-nowrap text-[var(--mut)] first:pl-0.5 last:pr-0.5";
export const th = `${thBase} text-left`;
/** Encabezado de una columna de cifras (alineada a la derecha). */
export const thNum = `${thBase} text-right`;
export const td = "px-3 py-3 align-middle first:pl-0.5 last:pr-0.5";
export const cifra = "text-right tabular-nums whitespace-nowrap";

/** Aviso flotante mientras se guarda (por encima de la barra inferior en celular). */
export const guardando = "fixed right-4 bottom-[calc(96px_+_env(safe-area-inset-bottom))] lg:bottom-6 z-40 rounded-lg border border-[var(--linea-2)] bg-[var(--sup)] px-4 py-2 text-sm text-[var(--txt)] shadow-lg";

const formatoPesos = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
export const pesos = (n: number) => formatoPesos.format(n);
