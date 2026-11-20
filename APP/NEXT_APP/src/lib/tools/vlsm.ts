/**
 * Planificador VLSM para IPv4. Funciones puras (sin DOM ni red) para poder probarlas con node.
 * Las direcciones se manejan como números normales (0 … 2^32 − 1) y no con operadores de bits,
 * porque en JavaScript los operadores de bits trabajan con 32 bits con signo.
 */

const TOTAL_IPV4 = 2 ** 32;
/** Una subred con red y broadcast necesita al menos 4 direcciones (/30) para tener hosts útiles. */
const PREFIJO_MAXIMO = 30;
export const MAX_SUBREDES_VLSM = 100;

export interface PedidoVlsm {
    nombre: string;
    hosts: number;
}

export interface SubredVlsm {
    nombre: string;
    pedidos: number;
    red: string;
    prefijo: number;
    mascara: string;
    primerHost: string;
    ultimoHost: string;
    broadcast: string;
    tamano: number;
    hostsUtiles: number;
    desperdicio: number;
}

export interface BloqueLibre {
    red: string;
    prefijo: number;
    tamano: number;
}

export interface BaseVlsm {
    red: string;
    prefijo: number;
    tamano: number;
    /** true si se escribió una dirección de dentro de la red y no la dirección de red. */
    ajustada: boolean;
}

export type PlanVlsm =
    | { ok: true; base: BaseVlsm; subredes: SubredVlsm[]; libres: BloqueLibre[]; usadas: number; libresTotal: number }
    | { ok: false; error: string };

export function leerIPv4(texto: string): number | null {
    const partes = texto.trim().split(".");
    if (partes.length !== 4) return null;
    let valor = 0;
    for (const parte of partes) {
        if (!/^\d{1,3}$/.test(parte) || (parte.length > 1 && parte.startsWith("0"))) return null;
        const octeto = Number(parte);
        if (octeto > 255) return null;
        valor = valor * 256 + octeto;
    }
    return valor;
}

export function escribirIPv4(valor: number): string {
    return [24, 16, 8, 0].map(desplazamiento => Math.floor(valor / 2 ** desplazamiento) % 256).join(".");
}

export function mascaraDePrefijo(prefijo: number): string {
    return escribirIPv4(TOTAL_IPV4 - 2 ** (32 - prefijo));
}

/** «192.168.10.0/24» → red alineada y prefijo. Acepta una dirección interna y la ajusta a su red. */
export function leerCidrIPv4(texto: string): { red: number; prefijo: number; ajustada: boolean } | null {
    const coincidencia = /^\s*([0-9.]+)\s*\/\s*(\d{1,2})\s*$/.exec(texto);
    if (!coincidencia) return null;
    const ip = leerIPv4(coincidencia[1]!);
    const prefijo = Number(coincidencia[2]);
    if (ip === null || prefijo > 32) return null;
    const tamano = 2 ** (32 - prefijo);
    const red = Math.floor(ip / tamano) * tamano;
    return { red, prefijo, ajustada: red !== ip };
}

/** Prefijo más largo cuyo bloque deja `hosts` direcciones útiles (descontando red y broadcast). */
export function prefijoParaHosts(hosts: number): number | null {
    if (!Number.isInteger(hosts) || hosts < 1 || hosts > TOTAL_IPV4 - 2) return null;
    for (let bits = 2; bits <= 32; bits++) {
        if (2 ** bits - 2 >= hosts) return 32 - bits;
    }
    return null;
}

/** Cubre el rango [inicio, fin] con la menor cantidad de bloques CIDR alineados. */
export function rangoACidr(inicio: number, fin: number): BloqueLibre[] {
    const bloques: BloqueLibre[] = [];
    let actual = inicio;
    while (actual <= fin) {
        const restantes = fin - actual + 1;
        let tamano = 1;
        while (tamano * 2 <= restantes && actual % (tamano * 2) === 0 && tamano * 2 <= TOTAL_IPV4) tamano *= 2;
        bloques.push({ red: escribirIPv4(actual), prefijo: 32 - Math.log2(tamano), tamano });
        actual += tamano;
    }
    return bloques;
}

const formato = new Intl.NumberFormat("es-CL");

export function planificarVlsm(baseTexto: string, pedidos: PedidoVlsm[]): PlanVlsm {
    const base = leerCidrIPv4(baseTexto);
    if (!base) return { ok: false, error: "Escribe la red base en formato CIDR, por ejemplo 192.168.10.0/24." };
    if (base.prefijo > PREFIJO_MAXIMO) {
        return { ok: false, error: `Una red /${base.prefijo} no deja espacio para subredes con hosts. Usa una base de /${PREFIJO_MAXIMO} o más grande.` };
    }
    if (pedidos.length === 0) return { ok: false, error: "Agrega al menos una subred con los hosts que necesita." };
    if (pedidos.length > MAX_SUBREDES_VLSM) return { ok: false, error: `Como máximo ${MAX_SUBREDES_VLSM} subredes por plan.` };

    const tamanoBase = 2 ** (32 - base.prefijo);
    const conBloque: Array<PedidoVlsm & { prefijo: number; tamano: number; orden: number }> = [];
    for (const [orden, pedido] of pedidos.entries()) {
        const prefijo = prefijoParaHosts(pedido.hosts);
        if (prefijo === null) {
            return { ok: false, error: `«${pedido.nombre}» necesita una cantidad de hosts entera entre 1 y ${formato.format(TOTAL_IPV4 - 2)}.` };
        }
        const tamano = 2 ** (32 - prefijo);
        if (tamano > tamanoBase) {
            return { ok: false, error: `«${pedido.nombre}» por sí sola necesita un /${prefijo} (${formato.format(tamano)} direcciones) y la red base es /${base.prefijo}.` };
        }
        conBloque.push({ ...pedido, prefijo, tamano, orden });
    }

    // Bloques potencia de 2 asignados de mayor a menor desde una base alineada: caben todos si y solo si
    // la suma no supera la base, y no quedan huecos entre ellos.
    const total = conBloque.reduce((suma, pedido) => suma + pedido.tamano, 0);
    if (total > tamanoBase) {
        const prefijoMinimo = 32 - Math.ceil(Math.log2(total));
        return {
            ok: false,
            error: `No caben: los bloques suman ${formato.format(total)} direcciones y ${escribirIPv4(base.red)}/${base.prefijo} tiene ${formato.format(tamanoBase)}. Necesitas una base de al menos /${prefijoMinimo}, o pedir menos hosts.`,
        };
    }

    const ordenados = conBloque.slice().sort((a, b) => b.tamano - a.tamano || b.hosts - a.hosts || a.orden - b.orden);
    let cursor = base.red;
    const subredes: SubredVlsm[] = ordenados.map(pedido => {
        const red = Math.ceil(cursor / pedido.tamano) * pedido.tamano;
        cursor = red + pedido.tamano;
        const broadcast = red + pedido.tamano - 1;
        const hostsUtiles = pedido.tamano - 2;
        return {
            nombre: pedido.nombre,
            pedidos: pedido.hosts,
            red: escribirIPv4(red),
            prefijo: pedido.prefijo,
            mascara: mascaraDePrefijo(pedido.prefijo),
            primerHost: escribirIPv4(red + 1),
            ultimoHost: escribirIPv4(broadcast - 1),
            broadcast: escribirIPv4(broadcast),
            tamano: pedido.tamano,
            hostsUtiles,
            desperdicio: hostsUtiles - pedido.hosts,
        };
    });

    const finBase = base.red + tamanoBase - 1;
    const libres = cursor <= finBase ? rangoACidr(cursor, finBase) : [];
    return {
        ok: true,
        base: { red: escribirIPv4(base.red), prefijo: base.prefijo, tamano: tamanoBase, ajustada: base.ajustada },
        subredes,
        libres,
        usadas: total,
        libresTotal: tamanoBase - total,
    };
}

const COLUMNAS = ["Subred", "Red", "Máscara", "Primer host", "Último host", "Broadcast", "Hosts útiles", "Pedidos", "Desperdicio"] as const;

function filaDeSubred(subred: SubredVlsm): string[] {
    return [
        subred.nombre,
        `${subred.red}/${subred.prefijo}`,
        subred.mascara,
        subred.primerHost,
        subred.ultimoHost,
        subred.broadcast,
        String(subred.hostsUtiles),
        String(subred.pedidos),
        String(subred.desperdicio),
    ];
}

function resumenLibre(plan: Extract<PlanVlsm, { ok: true }>): string {
    const base = `${plan.base.red}/${plan.base.prefijo}`;
    const libres = plan.libres.length > 0 ? plan.libres.map(bloque => `${bloque.red}/${bloque.prefijo}`).join(", ") : "ninguno";
    return `Base ${base}: ${formato.format(plan.usadas)} de ${formato.format(plan.base.tamano)} direcciones asignadas. Libre (${formato.format(plan.libresTotal)}): ${libres}`;
}

/** Tabla en texto plano con columnas alineadas (para pegar en un ticket o en notas). */
export function planComoTexto(plan: Extract<PlanVlsm, { ok: true }>): string {
    const filas = [Array.from(COLUMNAS), ...plan.subredes.map(filaDeSubred)];
    const anchos = COLUMNAS.map((_, columna) => Math.max(...filas.map(fila => fila[columna]!.length)));
    const numericas = new Set([6, 7, 8]);
    const lineas = filas.map(fila => fila
        .map((celda, columna) => numericas.has(columna) ? celda.padStart(anchos[columna]!) : celda.padEnd(anchos[columna]!))
        .join("  ")
        .trimEnd());
    lineas.splice(1, 0, anchos.map(ancho => "-".repeat(ancho)).join("  "));
    return `${lineas.join("\n")}\n\n${resumenLibre(plan)}\n`;
}

function celdaCsv(valor: string): string {
    // Un nombre que empieza con = + - @ se abriría como fórmula en una planilla.
    const seguro = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
    return /[",;\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

/**
 * CSV con punto y coma (el separador de listas de Excel en español: con coma, Excel en Chile abre todo en una
 * columna) y BOM para que lea bien las tildes. Las comillas siguen RFC 4180.
 */
export function planComoCsv(plan: Extract<PlanVlsm, { ok: true }>): string {
    const filas = [Array.from(COLUMNAS), ...plan.subredes.map(filaDeSubred)];
    return `\uFEFF${filas.map(fila => fila.map(celdaCsv).join(";")).join("\r\n")}\r\n`;
}
