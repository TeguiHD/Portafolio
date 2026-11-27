/**
 * Cuenta la visita a una herramienta una vez por herramienta y sesión de la pestaña, la abran en el sitio
 * (/herramientas/<slug>, CarcasaHerramientas) o como app del escritorio (AppHerramienta): las dos usan la misma llave,
 * así abrirla en ambos lados no cuenta doble. Con esto se ordenan «Las más usadas» del catálogo.
 */
export function contarVisita(slug: string): void {
    // Un navegador automatizado (pruebas, robots con Chrome) no cuenta: su agente no siempre dice «headless».
    if (navigator.webdriver) return;
    const clave = `visita:${slug}`;
    try { if (sessionStorage.getItem(clave)) return; sessionStorage.setItem(clave, "1"); } catch { /* sin almacenamiento: se registra igual */ }
    fetch(`/api/tools/public/${slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "view" }), keepalive: true }).catch(() => undefined);
}
