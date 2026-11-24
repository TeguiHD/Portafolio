/**
 * Texto para mostrar sin que «Wi-Fi» se parta entre dos líneas («Wi-» al final de una y «Fi» al comienzo de la otra):
 * cambia el guion por uno que no corta línea (U+2011). Solo al mostrar: los datos, la búsqueda y el SEO siguen con el
 * guion común.
 */
export function sinCortes(texto: string): string {
    return texto.replace(/\bWi-Fi\b/g, "Wi‑Fi");
}
