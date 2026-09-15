/** Datos del centinela de seguridad (#architecture): anillos, peticiones de prueba y cabeceras. */

export interface Capa {
  numero: string;
  nombre: string;
  detalle: string;
  tono: string;
  icono: "escudo" | "filtro" | "usuario" | "datos";
}

/** De fuera hacia dentro: cada petición atraviesa los anillos en este orden. */
export const capas: Capa[] = [
  { numero: "01", nombre: "Client / User", detalle: "HTTPS • TLS 1.3 • Secure Cookies", tono: "#5eead4", icono: "escudo" },
  { numero: "02", nombre: "Middleware & WAF", detalle: "Rate Limiting • CSRF Protection • Input Sanitization", tono: "#f59e0b", icono: "filtro" },
  { numero: "03", nombre: "RBAC & Auth", detalle: "User Roles • Permissions • Session Management", tono: "#a78bfa", icono: "usuario" },
  { numero: "04", nombre: "Isolated Database", detalle: "Encrypted Storage • Prepared Statements • Audit Logs", tono: "#fb7185", icono: "datos" },
];

/** [cabecera, valor, comentario]; "cmd" en la tercera posición marca una línea de comando. */
export type LineaTerminal = [string, string, string];

export interface Preset {
  id: "normal" | "sql" | "rafaga" | "sesion";
  titulo: string;
  subtitulo: string;
  tono: string;
  icono: "normal" | "sql" | "rafaga" | "sesion";
  peticion: string;
  /** Hasta qué anillo llega (1-4); si es menor que 4, el último la rechaza. */
  hasta: number;
  ok: string[];
  fin: string;
  /** Líneas del terminal; null = las cabeceras reales del sitio. */
  lineas: LineaTerminal[] | null;
}

export const presets: Preset[] = [
  {
    id: "normal",
    titulo: "Visita normal",
    subtitulo: "Alguien abre una herramienta",
    tono: "#5eead4",
    icono: "normal",
    peticion: "GET /herramientas/quitar-fondo HTTP/2\nHost: nicoholas.dev · Cookie: sesión firmada",
    hasta: 4,
    ok: ["TLS negociado", "Límite comprobado", "Sesión válida", "Consulta preparada"],
    fin: "200 OK · respuesta con cabeceras",
    lineas: null,
  },
  {
    id: "sql",
    titulo: "Inyección SQL",
    subtitulo: "Un parámetro con código dentro",
    tono: "#f59e0b",
    icono: "sql",
    peticion: "GET /api/tools/public/qr?slug=' OR 1=1 -- HTTP/2\nHost: nicoholas.dev",
    hasta: 2,
    ok: ["TLS negociado", "Entrada rechazada"],
    fin: "400 Bad Request · el parámetro no pasa la validación",
    lineas: [
      ["HTTP/2 400", "", "cmd"],
      ["content-type", "application/json", "respuesta mínima"],
      ["x-request-id", "hash de la IP, nunca la IP", "registro sin datos personales"],
    ],
  },
  {
    id: "rafaga",
    titulo: "Ráfaga de 200 peticiones",
    subtitulo: "Un script insistiendo",
    tono: "#fb7185",
    icono: "rafaga",
    peticion: "POST /api/contact HTTP/2 × 200 en 10 s\nHost: nicoholas.dev · misma IP",
    hasta: 2,
    ok: ["TLS negociado", "Límite superado"],
    fin: "429 Too Many Requests · la IP espera 60 s",
    lineas: [
      ["HTTP/2 429", "", "cmd"],
      ["retry-after", "60", "vuelve en un minuto"],
      ["x-ratelimit-remaining", "0", "límite por IP hasheada con HMAC"],
    ],
  },
  {
    id: "sesion",
    titulo: "Sesión caducada",
    subtitulo: "Un panel privado sin permiso",
    tono: "#a78bfa",
    icono: "sesion",
    peticion: "GET /admin/cotizaciones HTTP/2\nHost: nicoholas.dev · Cookie: sesión vencida",
    hasta: 3,
    ok: ["TLS negociado", "Límite comprobado", "Sesión no válida"],
    fin: "302 → /acceso · sin acceso al panel",
    lineas: [
      ["HTTP/2 302", "", "cmd"],
      ["location", "/acceso?next=/admin/cotizaciones", "de vuelta al acceso"],
      ["set-cookie", "session=; Max-Age=0; Secure; HttpOnly", "cookie eliminada"],
    ],
  },
];

/** Cabeceras que se leen del propio sitio con una petición HEAD a "/", con su lectura en una frase. */
export const cabecerasEsperadas: { nombre: string; lectura: string }[] = [
  { nombre: "strict-transport-security", lectura: "HSTS dos años, con preload" },
  { nombre: "content-security-policy", lectura: "CSP con nonce por petición" },
  { nombre: "x-frame-options", lectura: "sin marcos de terceros" },
  { nombre: "x-content-type-options", lectura: "sin adivinar tipos" },
  { nombre: "referrer-policy", lectura: "no filtra la ruta" },
  { nombre: "permissions-policy", lectura: "sensores apagados" },
  { nombre: "x-security-version", lectura: "versión de las reglas" },
];

/** Si el HEAD falla (o no expone cabeceras), se muestran estas, tomadas del sitio en producción. */
export const lineasFijas: LineaTerminal[] = [
  ["curl -I https://nicoholas.dev", "", "cmd"],
  ["strict-transport-security", "max-age=63072000; includeSubDomains; preload", "HSTS dos años, con preload"],
  ["content-security-policy", "default-src 'none'; script-src 'self' 'nonce-…' 'strict-dynamic'", "CSP con nonce por petición"],
  ["x-frame-options", "DENY", "sin marcos de terceros"],
  ["x-content-type-options", "nosniff", "sin adivinar tipos"],
  ["referrer-policy", "strict-origin-when-cross-origin", "no filtra la ruta"],
  ["permissions-policy", "camera=(), microphone=(), geolocation=(), …", "sensores apagados"],
];
