/**
 * Las fotos de Blogger (la mayoría de los titulares) llegan a 1600 px y 200–430 KB; el tambor las muestra a ~600 px.
 * Su servidor las escala y recodifica por la ruta: /s800-rj/ = 800 px en JPEG (una captura PNG de 338 KB queda en 45 KB).
 */
export function fotoLiviana(url: string): string {
    try {
        const u = new URL(url);
        if (u.hostname.endsWith(".googleusercontent.com")) u.pathname = u.pathname.replace(/\/[sw]\d+[^/]*\/(?=[^/]+$)/, "/s800-rj/");
        // El blog de Cloudflare escala con su propio /cdn-cgi/image/ (una portada PNG de 434 KB queda en ~17 KB, AVIF o WebP).
        else if (u.hostname === "blog.cloudflare.com" && !u.pathname.startsWith("/cdn-cgi/")) u.pathname = `/cdn-cgi/image/width=800,format=auto${u.pathname}`;
        return u.toString();
    } catch {
        return url;
    }
}
