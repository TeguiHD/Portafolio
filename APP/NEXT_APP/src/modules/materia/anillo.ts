/** Corte de la barra del celular (el mismo de esqueleto.css): debajo, el anillo es un círculo. */
const CELULAR = 760;

/**
 * Radios del anillo del contacto. En el PC, una órbita ancha (más ancha que alta, a propósito). En el celular, con los
 * radios por separado salía un huevo de 179 × 346 px: ahí va un círculo más ancho que la pantalla, que se ve como un halo
 * cortado a los lados y pasa por arriba y por abajo del texto sin tocarlo. Nunca más alto que ancho.
 */
export function radiosAnillo(W: number, H: number): { rx: number; ry: number } {
    if (W < CELULAR) { const r = Math.round(W * 0.62); return { rx: r, ry: r }; }
    const rx = Math.min(W * 0.46, 640);
    return { rx, ry: Math.min(H * 0.41, 350, rx) };
}
