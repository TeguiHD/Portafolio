/**
 * Núcleo puro del formateador JSON: lo usan el hilo principal (textos chicos) y json.worker.ts
 * (textos grandes, para que la página no se congele). Solo JSON.parse: nada de eval.
 */

export const MAX_JSON_CHARS = 5 * 1024 * 1024;
/** Sobre este tamaño el coloreado crearía demasiados elementos: se muestra texto plano. */
const MAX_COLOREADO = 100_000;
const MAX_SEGURO = "9007199254740991"; // Number.MAX_SAFE_INTEGER, comparado como texto
const MAX_EJEMPLOS = 3;

export type TipoToken = "key" | "string" | "number" | "boolean" | "null" | "bracket" | "other";
export interface JsonToken { text: string; type: TipoToken }

export interface JsonError {
    message: string;
    line?: number;
    column?: number;
}

export interface EjemploNumero { texto: string; linea: number; quedaria: string }
export interface EjemploClave { clave: string; linea: number }

export interface AvisosJson {
    /** Enteros mayores que Number.MAX_SAFE_INTEGER en el texto original. */
    enterosGrandes: { total: number; alterados: number; ejemplos: EjemploNumero[] };
    /** Números con decimales o exponente que JavaScript no puede representar (quedan como null). */
    fueraDeRango: { total: number; ejemplos: EjemploNumero[] };
    /** Claves repetidas en un mismo objeto: JSON.parse se queda con la última sin avisar. */
    duplicadas: { total: number; ejemplos: EjemploClave[] };
}

export interface EstadisticasJson { keys: number; objects: number; arrays: number; formattedChars: number; minifiedChars: number }

export type AnalisisJson =
    | { ok: false; error: JsonError }
    | { ok: true; data: unknown; formatted: string; minified: string; tokens: JsonToken[] | null; stats: EstadisticasJson; avisos: AvisosJson; bom: boolean };

function esEspacio(c: string | undefined): boolean {
    return c === " " || c === "\t" || c === "\n" || c === "\r";
}

function esDigito(c: string | undefined): boolean {
    return c !== undefined && c >= "0" && c <= "9";
}

function lineaColumna(texto: string, pos: number): { line: number; column: number } {
    let line = 1;
    let inicioLinea = 0;
    for (let i = 0; i < pos && i < texto.length; i++) {
        if (texto[i] === "\n") { line++; inicioLinea = i + 1; }
    }
    return { line, column: pos - inicioLinea + 1 };
}

/**
 * Busca el primer error de sintaxis y lo explica en español. Los navegadores no coinciden en el
 * mensaje de JSON.parse (Chrome da la posición, Safari no), así que la posición se calcula aquí.
 * Recorre el texto con una pila, sin recursión, para no desbordarse con anidamientos profundos.
 */
export function localizarErrorJson(t: string): { pos: number; mensaje: string } | null {
    const n = t.length;
    const pila: ("obj" | "arr")[] = [];
    let i = 0;
    let esperando: "valor" | "clave" = "valor";
    let trasComa = -1;

    const saltarEspacios = () => { while (i < n && esEspacio(t[i])) i++; };
    const malo = (mensaje: string, pos = i) => ({ pos, mensaje });
    const cierre = (tipo: "obj" | "arr") => (tipo === "obj" ? "«}»" : "«]»");
    const inesperado = (c: string, pos: number) => {
        if (c === "'") return malo("Las cadenas y claves van entre comillas dobles, no simples.", pos);
        if (c === "/") return malo("JSON no admite comentarios.", pos);
        if (c === "\uFEFF") return malo("Aquí hay una marca BOM invisible (U+FEFF) que JSON no admite: bórrala.", pos);
        return null;
    };

    const leerCadena = (): { pos: number; mensaje: string } | null => {
        const inicio = i;
        i++;
        while (i < n) {
            const c = t[i];
            if (c === '"') { i++; return null; }
            if (c === "\\") {
                const e = t[i + 1];
                if (e === "u") {
                    if (!/^[0-9a-fA-F]{4}$/.test(t.slice(i + 2, i + 6))) return malo("Escape \\u incompleto: lleva 4 dígitos hexadecimales.", i);
                    i += 6;
                    continue;
                }
                if (e === undefined || !'"\\/bfnrt'.includes(e)) return malo(`Escape no válido dentro de la cadena: \\${e ?? ""}.`, i);
                i += 2;
                continue;
            }
            if (c < " ") return malo(c === "\n" ? "Salto de línea dentro de una cadena: escríbelo como \\n o cierra las comillas." : "Carácter de control sin escapar dentro de una cadena.", i);
            i++;
        }
        return malo("Falta cerrar la cadena con comillas dobles.", inicio);
    };

    const numero = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

    for (;;) {
        saltarEspacios();
        if (esperando === "clave") {
            if (i >= n) return malo(`El texto termina antes de tiempo: falta cerrar ${cierre("obj")}.`);
            const c = t[i];
            if (c === "}" && trasComa >= 0) return malo("Sobra la coma antes de «}».", trasComa);
            if (c !== '"') {
                const especial = inesperado(c, i);
                if (especial) return especial;
                return malo(/[A-Za-z_$]/.test(c) ? "Las claves van entre comillas dobles." : "Se esperaba una clave entre comillas dobles.");
            }
            const e = leerCadena();
            if (e) return e;
            saltarEspacios();
            if (t[i] !== ":") return malo("Falta «:» después de la clave.");
            i++;
            esperando = "valor";
            trasComa = -1;
            continue;
        }

        // Se espera un valor.
        if (i >= n) return malo(pila.length ? "El texto termina antes de tiempo: falta un valor." : "No hay ningún valor JSON.");
        const c = t[i];
        if (c === "{" || c === "[") {
            i++;
            saltarEspacios();
            if (t[i] === (c === "{" ? "}" : "]")) { i++; }
            else {
                pila.push(c === "{" ? "obj" : "arr");
                esperando = c === "{" ? "clave" : "valor";
                trasComa = -1;
                continue;
            }
        } else if (c === '"') {
            const e = leerCadena();
            if (e) return e;
        } else if (c === "-" || esDigito(c)) {
            numero.lastIndex = i;
            const m = numero.exec(t);
            if (!m) return malo("Número no válido.");
            i += m[0].length;
            if (esDigito(t[i]) && /^-?0$/.test(m[0])) return malo("Un número no puede llevar ceros a la izquierda.", i - 1);
            if (t[i] === ".") return malo("Al número le falta la parte decimal.", i);
        } else if (t.startsWith("true", i)) i += 4;
        else if (t.startsWith("false", i)) i += 5;
        else if (t.startsWith("null", i)) i += 4;
        else {
            if ((c === "]" || c === "}") && trasComa >= 0) return malo(`Sobra la coma antes de «${c}».`, trasComa);
            const especial = inesperado(c, i);
            if (especial) return especial;
            if (c === "]" || c === "}") return malo("Falta un valor.");
            if (c === ",") return malo("Falta un valor antes de esta coma.");
            const palabra = /^[A-Za-z]+/.exec(t.slice(i, i + 20))?.[0];
            return malo(palabra ? `«${palabra}» no es un valor JSON (usa true, false, null, un número o una cadena entre comillas dobles).` : `Carácter inesperado «${c}».`);
        }

        // Tras un valor: coma, cierre o fin.
        trasComa = -1;
        for (;;) {
            saltarEspacios();
            const tope = pila[pila.length - 1];
            if (!tope) return i < n ? malo("Sobra texto después del JSON (¿falta envolverlo en [ ]?).") : null;
            if (i >= n) return malo(`El texto termina antes de tiempo: falta cerrar ${cierre(tope)}.`);
            const d = t[i];
            if (d === ",") {
                trasComa = i;
                i++;
                esperando = tope === "obj" ? "clave" : "valor";
                break;
            }
            if ((tope === "obj" && d === "}") || (tope === "arr" && d === "]")) { pila.pop(); i++; continue; }
            if (d === "}" || d === "]") return malo(`Se esperaba ${cierre(tope)} y llegó «${d}».`);
            const especial = inesperado(d, i);
            if (especial) return especial;
            return malo(tope === "obj" ? "Falta una coma o «}» antes de esto." : "Falta una coma o «]» antes de esto.");
        }
    }
}

/**
 * Recorre el texto ya validado buscando lo que JSON.parse cambia sin avisar: enteros fuera del rango
 * seguro, números que se vuelven Infinity y claves repetidas en un mismo objeto.
 */
export function revisarAvisos(t: string): AvisosJson {
    const avisos: AvisosJson = {
        enterosGrandes: { total: 0, alterados: 0, ejemplos: [] },
        fueraDeRango: { total: 0, ejemplos: [] },
        duplicadas: { total: 0, ejemplos: [] },
    };
    const pila: (Set<string> | null)[] = [];
    let linea = 1;
    for (let i = 0; i < t.length; i++) {
        const c = t[i];
        if (c === "\n") { linea++; continue; }
        if (c === "{") { pila.push(new Set()); continue; }
        if (c === "[") { pila.push(null); continue; }
        if (c === "}" || c === "]") { pila.pop(); continue; }
        if (c === '"') {
            const inicio = i;
            i++;
            while (i < t.length && t[i] !== '"') i += t[i] === "\\" ? 2 : 1;
            let j = i + 1;
            while (esEspacio(t[j])) j++;
            const claves = pila[pila.length - 1];
            if (t[j] === ":" && claves) {
                const crudo = t.slice(inicio, i + 1);
                const clave = crudo.includes("\\") ? (JSON.parse(crudo) as string) : crudo.slice(1, -1);
                if (claves.has(clave)) {
                    avisos.duplicadas.total++;
                    if (avisos.duplicadas.ejemplos.length < MAX_EJEMPLOS) avisos.duplicadas.ejemplos.push({ clave, linea });
                } else claves.add(clave);
            }
            continue;
        }
        if (c === "-" || esDigito(c)) {
            let j = c === "-" ? i + 1 : i;
            while (esDigito(t[j])) j++;
            let entero = true;
            if (t[j] === ".") { entero = false; j++; while (esDigito(t[j])) j++; }
            if (t[j] === "e" || t[j] === "E") {
                entero = false;
                j++;
                if (t[j] === "+" || t[j] === "-") j++;
                while (esDigito(t[j])) j++;
            }
            const texto = t.slice(i, j);
            if (entero) {
                const digitos = c === "-" ? texto.slice(1) : texto;
                if (digitos.length > MAX_SEGURO.length || (digitos.length === MAX_SEGURO.length && digitos > MAX_SEGURO)) {
                    const quedaria = JSON.stringify(Number(texto));
                    const grupo = avisos.enterosGrandes;
                    grupo.total++;
                    if (quedaria !== texto) grupo.alterados++;
                    // Primero los ejemplos que de verdad cambian: son los que muestran el problema.
                    const ejemplo = { texto, linea, quedaria };
                    if (grupo.ejemplos.length < MAX_EJEMPLOS) grupo.ejemplos.push(ejemplo);
                    else if (quedaria !== texto) {
                        const k = grupo.ejemplos.findIndex((e) => e.quedaria === e.texto);
                        if (k >= 0) grupo.ejemplos[k] = ejemplo;
                    }
                }
            } else if (!Number.isFinite(Number(texto))) {
                avisos.fueraDeRango.total++;
                if (avisos.fueraDeRango.ejemplos.length < MAX_EJEMPLOS) avisos.fueraDeRango.ejemplos.push({ texto, linea, quedaria: "null" });
            }
            i = j - 1;
        }
    }
    avisos.enterosGrandes.ejemplos.sort((a, b) => Number(a.quedaria === a.texto) - Number(b.quedaria === b.texto));
    return avisos;
}

/** Coloreado por tipo. Devuelve texto en piezas: nunca HTML. */
export function tokenizeJson(json: string): JsonToken[] {
    const tokens: JsonToken[] = [];
    const regex = /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}[\],:])|(\s+)/g;
    let match;
    while ((match = regex.exec(json)) !== null) {
        if (match[1]) { tokens.push({ text: match[1], type: "key" }); tokens.push({ text: ": ", type: "other" }); }
        else if (match[2]) tokens.push({ text: match[2], type: "string" });
        else if (match[3]) tokens.push({ text: match[3], type: "number" });
        else if (match[4]) tokens.push({ text: match[4], type: "boolean" });
        else if (match[5]) tokens.push({ text: match[5], type: "null" });
        else if (match[6]) tokens.push({ text: match[6], type: "bracket" });
        else if (match[7]) tokens.push({ text: match[7], type: "other" });
    }
    return tokens;
}

function contar(data: unknown): { keys: number; objects: number; arrays: number } {
    let keys = 0, arrays = 0, objects = 0;
    const cola: unknown[] = [data];
    while (cola.length) {
        const v = cola.pop();
        if (Array.isArray(v)) { arrays++; for (const item of v) cola.push(item); }
        else if (v && typeof v === "object") {
            objects++;
            const valores = Object.values(v as Record<string, unknown>);
            keys += valores.length;
            for (const valor of valores) cola.push(valor);
        }
    }
    return { keys, objects, arrays };
}

export function analizarJson(original: string, indentacion: number): AnalisisJson {
    if (original.length > MAX_JSON_CHARS) return { ok: false, error: { message: "Entrada demasiado grande (máx. 5 MB)." } };
    // Muchos editores de Windows guardan una marca BOM invisible al inicio. JSON.parse la rechaza, pero quien pega el
    // texto no la ve ni puede borrarla: se ignora y se avisa. Línea y columna de un error se cuentan sin ella.
    const bom = original.charCodeAt(0) === 0xfeff;
    const texto = bom ? original.slice(1) : original;
    let data: unknown;
    try {
        data = JSON.parse(texto);
    } catch (e) {
        const local = localizarErrorJson(texto);
        if (local) return { ok: false, error: { message: local.mensaje, ...lineaColumna(texto, local.pos) } };
        return { ok: false, error: { message: e instanceof Error ? e.message : "JSON no válido." } };
    }
    try {
        const formatted = JSON.stringify(data, null, indentacion);
        const minified = JSON.stringify(data);
        return {
            ok: true,
            data,
            formatted,
            minified,
            tokens: formatted.length <= MAX_COLOREADO ? tokenizeJson(formatted) : null,
            stats: { ...contar(data), formattedChars: formatted.length, minifiedChars: minified.length },
            avisos: revisarAvisos(texto),
            bom,
        };
    } catch {
        return { ok: false, error: { message: "El JSON tiene demasiados niveles para formatearlo. Reduce la profundidad del documento." } };
    }
}
