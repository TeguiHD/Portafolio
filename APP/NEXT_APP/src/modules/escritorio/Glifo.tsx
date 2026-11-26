/** Un ícono de trazo de 24 × 24. Los dibujos son textos fijos del código (apps.ts y siglas.ts), nunca datos de afuera. */
export function Glifo({ d, className }: { d: string; className?: string }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: d }} />;
}

export const UI = {
    min: '<path d="M6 12h12"/>',
    max: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    restaurar: '<rect x="8" y="5" width="11" height="11" rx="2"/><path d="M5 9v8a2 2 0 0 0 2 2h8"/>',
    cerrar: '<path d="M7 7l10 10M17 7L7 17"/>',
    volver: '<path d="M15 5l-7 7 7 7"/>',
    aparte: '<path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>',
    lupa: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    sonido: '<path d="M4 10v4h3.5L12 18V6L7.5 10z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10"/>',
    mudo: '<path d="M4 10v4h3.5L12 18V6L7.5 10z"/><path d="M16 10l4 4M20 10l-4 4"/>',
    luna: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
    candado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    salir: '<path d="M10 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4M14 8l4 4-4 4M18 12H9"/>',
    teclado: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
} as const;
