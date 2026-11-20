/**
 * Verificación de la firma de un JWT (JWS compacto) con WebCrypto, dentro del navegador.
 * La clave y el token no salen de la pestaña: aquí no hay ninguna llamada de red, y un JWKS
 * solo se acepta pegado (descargarlo por jku/x5u sería pedirle al navegador una URL ajena).
 */

export type ResultadoFirma =
    | { estado: "valida"; avisos: string[] }
    | { estado: "invalida"; detalle?: string; avisos: string[] }
    | { estado: "no-soportado"; alg: string }
    | { estado: "sin-firma"; detalle?: string }
    | { estado: "error"; mensaje: string };

export type EntradaClave =
    | { tipo: "secreto"; texto: string; codificacion: "utf8" | "base64" }
    | { tipo: "publica"; texto: string };

export type FamiliaAlg = "HS" | "RS" | "PS" | "ES";
type Hash = "SHA-256" | "SHA-384" | "SHA-512";

export interface InfoAlg {
    alg: string;
    familia: FamiliaAlg;
    hash: Hash;
    bits: 256 | 384 | 512;
}

const CURVAS: Record<InfoAlg["bits"], { nombre: string; bytesFirma: number }> = {
    256: { nombre: "P-256", bytesFirma: 64 },
    384: { nombre: "P-384", bytesFirma: 96 },
    512: { nombre: "P-521", bytesFirma: 132 },
};

/** Lee el `alg` de la cabecera: «none» (en cualquier mayúscula), un algoritmo soportado o null. */
export function infoAlg(alg: unknown): InfoAlg | "none" | null {
    if (typeof alg !== "string") return null;
    if (alg.toLowerCase() === "none") return "none";
    const m = /^(HS|RS|PS|ES)(256|384|512)$/.exec(alg);
    if (!m) return null;
    const bits = Number(m[2]) as InfoAlg["bits"];
    return { alg, familia: m[1] as FamiliaAlg, hash: `SHA-${bits}` as Hash, bits };
}

/** Base64 o base64url (con o sin relleno, con espacios o saltos de línea) a bytes. Lanza si no es válido. */
export function bytesDeBase64(texto: string): Uint8Array<ArrayBuffer> {
    const limpio = texto.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
    if (!/^[A-Za-z0-9+/]*$/.test(limpio) || limpio.length % 4 === 1) throw new Error("no es base64 válido");
    const binario = atob(limpio + "===".slice((limpio.length + 3) % 4));
    return Uint8Array.from(binario, (c) => c.charCodeAt(0));
}

function esObjeto(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parametrosImportacion(info: InfoAlg): RsaHashedImportParams | EcKeyImportParams {
    if (info.familia === "ES") return { name: "ECDSA", namedCurve: CURVAS[info.bits].nombre };
    return { name: info.familia === "PS" ? "RSA-PSS" : "RSASSA-PKCS1-v1_5", hash: info.hash };
}

function parametrosVerificacion(info: InfoAlg): AlgorithmIdentifier | RsaPssParams | EcdsaParams {
    if (info.familia === "HS") return "HMAC";
    if (info.familia === "ES") return { name: "ECDSA", hash: info.hash };
    // RFC 7518 §3.5: en PS256/384/512 la sal mide lo mismo que el hash.
    if (info.familia === "PS") return { name: "RSA-PSS", saltLength: info.bits / 8 };
    return { name: "RSASSA-PKCS1-v1_5" };
}

/** Elige del JWK o JWKS pegado la clave pública que sirve para este token. */
function jwkPublica(dato: unknown, info: InfoAlg, kid: string | undefined, avisos: string[]): JsonWebKey | string {
    const ktyEsperado = info.familia === "ES" ? "EC" : "RSA";
    let jwk = dato;
    if (esObjeto(dato) && Array.isArray(dato.keys)) {
        const candidatas = dato.keys.filter((k): k is Record<string, unknown> => esObjeto(k) && k.kty === ktyEsperado);
        let elegida = kid !== undefined ? candidatas.find((k) => k.kid === kid) : undefined;
        if (!elegida && candidatas.length === 1 && (kid === undefined || candidatas[0].kid === undefined)) elegida = candidatas[0];
        if (!elegida) {
            if (candidatas.length === 0) return `El JWKS no trae claves ${ktyEsperado}, que es lo que pide ${info.alg}.`;
            return kid !== undefined ? `Ninguna clave ${ktyEsperado} del JWKS tiene kid «${kid}».` : "El JWKS tiene varias claves y el token no trae kid: pega solo la que corresponde.";
        }
        jwk = elegida;
    }
    if (!esObjeto(jwk)) return "El JSON pegado no es un JWK ni un JWKS.";
    if (jwk.kty !== ktyEsperado) return `La clave es de tipo ${String(jwk.kty ?? "desconocido")} y ${info.alg} necesita una clave ${ktyEsperado}.`;
    if ("d" in jwk) avisos.push("Pegaste una clave privada: se usó solo su parte pública.");
    if (typeof jwk.alg === "string" && jwk.alg !== info.alg) avisos.push(`La clave declara alg ${jwk.alg} y el token ${info.alg}; un servidor estricto la rechazaría.`);
    // Solo los miembros públicos: así `alg`, `use` o `key_ops` del JWK no hacen fallar la importación.
    if (ktyEsperado === "RSA") return { kty: "RSA", n: String(jwk.n ?? ""), e: String(jwk.e ?? "") };
    const curva = CURVAS[info.bits].nombre;
    if (jwk.crv !== curva) return `${info.alg} usa la curva ${curva} y la clave es ${String(jwk.crv ?? "sin curva")}.`;
    return { kty: "EC", crv: curva, x: String(jwk.x ?? ""), y: String(jwk.y ?? "") };
}

async function importarPublica(texto: string, info: InfoAlg, kid: string | undefined, avisos: string[]): Promise<CryptoKey | string> {
    const limpio = texto.trim();
    if (!limpio) return "Pega la clave pública (PEM o JWK).";
    const params = parametrosImportacion(info);
    const familia = info.familia === "ES" ? `EC ${CURVAS[info.bits].nombre}` : "RSA";

    if (limpio.startsWith("{")) {
        let dato: unknown;
        try { dato = JSON.parse(limpio); } catch { return "El JWK no es JSON válido."; }
        const jwk = jwkPublica(dato, info, kid, avisos);
        if (typeof jwk === "string") return jwk;
        try {
            return await crypto.subtle.importKey("jwk", jwk, params, false, ["verify"]);
        } catch {
            return `No se pudo leer el JWK como clave ${familia}. Revisa n y e (RSA) o x e y (EC).`;
        }
    }

    if (/-----BEGIN (RSA |EC |ENCRYPTED )?PRIVATE KEY-----/.test(limpio)) return "Es una clave privada. Para verificar basta la pública (BEGIN PUBLIC KEY).";
    if (limpio.includes("-----BEGIN RSA PUBLIC KEY-----")) return "Está en formato PKCS#1 (BEGIN RSA PUBLIC KEY), que WebCrypto no lee. Conviértela con: openssl rsa -RSAPublicKey_in -in clave.pem -pubout";
    if (limpio.includes("-----BEGIN CERTIFICATE-----")) return "Es un certificado. Saca su clave pública con: openssl x509 -in cert.pem -pubkey -noout";

    const pem = /-----BEGIN PUBLIC KEY-----([\s\S]*?)-----END PUBLIC KEY-----/.exec(limpio);
    if (!pem && limpio.includes("-----BEGIN")) return "Solo se aceptan claves PEM «BEGIN PUBLIC KEY» (SPKI) o JWK.";
    let der: Uint8Array<ArrayBuffer>;
    try { der = bytesDeBase64(pem ? pem[1] : limpio); } catch { return pem ? "La clave PEM no tiene base64 válido." : "Pega la clave en PEM (BEGIN PUBLIC KEY) o como JWK."; }
    try {
        return await crypto.subtle.importKey("spki", der, params, false, ["verify"]);
    } catch {
        return `La clave no es una clave pública ${familia} válida para ${info.alg}.`;
    }
}

/**
 * Verifica la firma con la clave dada. `partes` son los tres segmentos del token tal como llegaron:
 * la firma se calcula sobre «cabecera.payload» en base64url original, no sobre el JSON reformateado.
 */
export async function verificarFirmaJwt(partes: readonly [string, string, string], cabecera: Record<string, unknown>, clave: EntradaClave): Promise<ResultadoFirma> {
    const info = infoAlg(cabecera.alg);
    if (info === "none") return { estado: "sin-firma", detalle: partes[2] ? "Trae una firma igual, pero con alg none un servidor no la revisaría." : undefined };
    if (!info) return { estado: "no-soportado", alg: typeof cabecera.alg === "string" ? cabecera.alg : "sin alg" };
    if (typeof crypto === "undefined" || !crypto.subtle) return { estado: "error", mensaje: "Este navegador no ofrece WebCrypto en esta página (hace falta https)." };

    const avisos: string[] = [];
    let firma: Uint8Array<ArrayBuffer>;
    try { firma = bytesDeBase64(partes[2]); } catch { return { estado: "invalida", detalle: "La firma no es base64url válido.", avisos }; }
    if (firma.length === 0) return { estado: "invalida", detalle: "El token no trae firma.", avisos };
    const datos = new TextEncoder().encode(`${partes[0]}.${partes[1]}`);

    let llave: CryptoKey;
    if (info.familia === "HS") {
        if (clave.tipo !== "secreto") return { estado: "error", mensaje: `${info.alg} se verifica con el secreto compartido.` };
        let bytes: Uint8Array<ArrayBuffer>;
        if (clave.codificacion === "utf8") bytes = new TextEncoder().encode(clave.texto);
        else {
            try { bytes = bytesDeBase64(clave.texto); } catch { return { estado: "error", mensaje: "El secreto no es base64 ni base64url válido." }; }
        }
        if (bytes.length === 0) return { estado: "error", mensaje: "Escribe el secreto." };
        // RFC 7518 §3.2: la clave HMAC debe medir al menos lo mismo que el hash.
        if (bytes.length < info.bits / 8) avisos.push(`El secreto mide ${bytes.length} bytes; ${info.alg} pide al menos ${info.bits / 8}.`);
        try {
            llave = await crypto.subtle.importKey("raw", bytes, { name: "HMAC", hash: info.hash }, false, ["verify"]);
        } catch {
            return { estado: "error", mensaje: "No se pudo usar el secreto." };
        }
    } else {
        if (clave.tipo !== "publica") return { estado: "error", mensaje: `${info.alg} se verifica con una clave pública.` };
        const kid = typeof cabecera.kid === "string" ? cabecera.kid : undefined;
        const importada = await importarPublica(clave.texto, info, kid, avisos);
        if (typeof importada === "string") return { estado: "error", mensaje: importada };
        llave = importada;
        if (info.familia === "ES" && firma.length !== CURVAS[info.bits].bytesFirma) {
            return { estado: "invalida", detalle: `La firma mide ${firma.length} bytes y ${info.alg} usa ${CURVAS[info.bits].bytesFirma} (r y s seguidos). Si viene en DER, no es una firma JWS válida.`, avisos };
        }
    }

    try {
        const ok = await crypto.subtle.verify(parametrosVerificacion(info), llave, firma, datos);
        return ok ? { estado: "valida", avisos } : { estado: "invalida", avisos };
    } catch {
        return { estado: "invalida", detalle: "WebCrypto rechazó la firma con esta clave.", avisos };
    }
}
