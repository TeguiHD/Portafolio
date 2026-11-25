/** Si la plataforma que informa el navegador es de Apple (macOS, iOS, iPadOS), donde los atajos van con ⌘. */
export function esApple(plataforma: string): boolean {
    return /mac|iphone|ipad|ipod/i.test(plataforma);
}

/** Cómo se escribe un atajo de Ctrl/⌘ + tecla: «⌘K» en Apple y «Ctrl K» en Windows, Linux y Android. */
export function textoAtajo(tecla: string, apple: boolean): string {
    return apple ? `⌘${tecla}` : `Ctrl ${tecla}`;
}
