/**
 * Revisión de SPF (RFC 7208) y DMARC (RFC 7489) de un dominio. Lógica pura: la lectura de TXT llega como
 * función, así la ruta usa resolvedores reales y se puede probar con datos fijos (aún no hay pruebas de esta parte).
 */

export type NivelObservacion = "bien" | "info" | "atencion" | "error";

export interface Observacion {
    nivel: NivelObservacion;
    texto: string;
}

export interface FilaExplicada {
    termino: string;
    explicacion: string;
}

/** Devuelve los TXT del nombre (cada uno ya unido), [] si no tiene, o null si la consulta falló. */
export type LectorTxt = (nombre: string) => Promise<string[] | null>;

type Calificador = "+" | "-" | "~" | "?";

export interface TerminoSpf {
    texto: string;
    nombre: string;
    calificador: Calificador | null;
    valor: string | null;
    consultas: number;
    explicacion: string;
}

export interface ResultadoSpf {
    estado: "ok" | "sin-registro" | "varios" | "error-consulta";
    registro: string | null;
    registros: string[];
    terminos: TerminoSpf[];
    consultas: { total: number; completo: boolean; incluidos: Array<{ dominio: string; consultas: number | null; nota?: string }> };
    observaciones: Observacion[];
}

export interface ResultadoDmarc {
    estado: "ok" | "sin-registro" | "varios" | "error-consulta";
    nombre: string;
    registro: string | null;
    registros: string[];
    filas: FilaExplicada[];
    observaciones: Observacion[];
}

export const LIMITE_CONSULTAS_SPF = 10;
const MAX_REGISTROS_SEGUIDOS = 10;
const MAX_PROFUNDIDAD = 5;

const VERBO: Record<Calificador, string> = {
    "+": "Autoriza",
    "-": "Rechaza",
    "~": "Marca como sospechosos",
    "?": "Deja en neutral",
};

export function esRegistroSpf(txt: string): boolean {
    return /^v=spf1(\s|$)/i.test(txt.trim());
}

function nombreSeguro(nombre: string): boolean {
    return nombre.length <= 253 && /^[a-z0-9_-]+(\.[a-z0-9_-]+)*\.?$/i.test(nombre);
}

function explicarMecanismo(nombre: string, calificador: Calificador, valor: string | null, dominio: string): string {
    const verbo = VERBO[calificador];
    switch (nombre) {
        case "all":
            return {
                "+": "Cualquier otro servidor pasa (+all)",
                "-": "Cualquier otro servidor falla (-all)",
                "~": "Cualquier otro servidor queda como sospechoso (~all, softfail)",
                "?": "Cualquier otro servidor queda neutral (?all)",
            }[calificador];
        case "include":
            return `${verbo} los servidores que autorice el SPF de ${valor ?? "?"}`;
        case "a":
            return `${verbo} las IP del registro A/AAAA de ${valor ?? dominio}`;
        case "mx":
            return `${verbo} los servidores MX de ${valor ?? dominio}`;
        case "ip4":
        case "ip6":
            return `${verbo} ${valor ?? "?"}`;
        case "ptr":
            return `${verbo} servidores cuyo nombre inverso termine en ${valor ?? dominio} (desaconsejado)`;
        case "exists":
            return `${verbo} si existe el nombre ${valor ?? "?"}`;
        default:
            return "";
    }
}

/** Separa un registro v=spf1 en mecanismos y modificadores, con cuántas consultas DNS gasta cada uno. */
export function analizarTerminosSpf(registro: string, dominio: string): { terminos: TerminoSpf[]; desconocidos: string[] } {
    const terminos: TerminoSpf[] = [];
    const desconocidos: string[] = [];
    const partes = registro.trim().split(/\s+/).slice(1);

    for (const texto of partes) {
        const modificador = /^([a-z][a-z0-9_.-]*)=(.*)$/i.exec(texto);
        if (modificador) {
            const nombre = modificador[1].toLowerCase();
            const valor = modificador[2];
            terminos.push({
                texto,
                nombre,
                calificador: null,
                valor,
                consultas: nombre === "redirect" ? 1 : 0,
                explicacion: nombre === "redirect"
                    ? `Usa la política del SPF de ${valor}`
                    : nombre === "exp" ? "Texto que se muestra al rechazar (no gasta consultas)" : "Modificador sin efecto conocido",
            });
            continue;
        }
        const mecanismo = /^([+\-~?]?)(all|include|a|mx|ptr|ip4|ip6|exists)(?:[:/](.*))?$/i.exec(texto);
        if (!mecanismo) {
            desconocidos.push(texto);
            continue;
        }
        const calificador = (mecanismo[1] || "+") as Calificador;
        const nombre = mecanismo[2].toLowerCase();
        // «a/24» y «mx/24» llevan solo la máscara; «a:dominio/24» lleva dominio y máscara.
        const resto = texto.includes(":") ? texto.slice(texto.indexOf(":") + 1) : null;
        const valor = nombre === "ip4" || nombre === "ip6" ? resto : resto?.replace(/\/\d+(\/\/\d+)?$/, "") ?? null;
        terminos.push({
            texto,
            nombre,
            calificador,
            valor: valor || null,
            consultas: ["include", "a", "mx", "ptr", "exists"].includes(nombre) ? 1 : 0,
            explicacion: explicarMecanismo(nombre, calificador, valor || null, dominio),
        });
    }

    // Con «all» presente, redirect se ignora (RFC 7208 §6.1): no se consulta.
    if (terminos.some(termino => termino.nombre === "all")) {
        for (const termino of terminos) {
            if (termino.nombre === "redirect") {
                termino.consultas = 0;
                termino.explicacion = `Se ignora porque el registro ya tiene all (apuntaba a ${termino.valor})`;
            }
        }
    }
    return { terminos, desconocidos };
}

interface Contexto {
    leer: LectorTxt;
    visitados: Set<string>;
    leidos: number;
    completo: boolean;
    incluidos: ResultadoSpf["consultas"]["incluidos"];
    observaciones: Observacion[];
}

/** Consultas que gasta un registro contando lo que traen sus include y redirect. Devuelve también su «all» efectivo. */
async function contarConsultas(registro: string, dominio: string, profundidad: number, ctx: Contexto): Promise<{ total: number; all: Calificador | null }> {
    const { terminos } = analizarTerminosSpf(registro, dominio);
    let total = terminos.reduce((suma, termino) => suma + termino.consultas, 0);
    const propio = terminos.find(termino => termino.nombre === "all")?.calificador ?? null;
    let allEfectivo: Calificador | null = propio;

    const aSeguir = terminos.filter(termino => termino.consultas > 0 && (termino.nombre === "include" || termino.nombre === "redirect") && termino.valor);
    const resultados = await Promise.all(aSeguir.map(async termino => {
        const destino = termino.valor!.toLowerCase().replace(/\.$/, "");
        if (destino.includes("%")) {
            ctx.completo = false;
            ctx.incluidos.push({ dominio: destino, consultas: null, nota: "usa macros: no se puede seguir sin un correo concreto" });
            return null;
        }
        if (!nombreSeguro(destino)) {
            ctx.observaciones.push({ nivel: "error", texto: `«${termino.texto}» no apunta a un nombre de dominio válido.` });
            return null;
        }
        if (ctx.visitados.has(destino)) {
            ctx.observaciones.push({ nivel: "error", texto: `${destino} se incluye más de una vez o en bucle; el receptor puede dar error permanente (permerror).` });
            return null;
        }
        if (profundidad >= MAX_PROFUNDIDAD || ctx.leidos >= MAX_REGISTROS_SEGUIDOS) {
            ctx.completo = false;
            return null;
        }
        ctx.visitados.add(destino);
        ctx.leidos++;

        const txts = await ctx.leer(destino);
        if (txts === null) {
            ctx.completo = false;
            ctx.incluidos.push({ dominio: destino, consultas: null, nota: "no se pudo leer" });
            return null;
        }
        const spf = txts.filter(esRegistroSpf);
        if (spf.length !== 1) {
            ctx.incluidos.push({ dominio: destino, consultas: null, nota: spf.length === 0 ? "sin SPF" : "varios SPF" });
            ctx.observaciones.push({
                nivel: "error",
                texto: spf.length === 0
                    ? `${termino.nombre === "redirect" ? "redirect" : "include"}:${destino} no tiene registro SPF; el receptor lo trata como error permanente (permerror).`
                    : `${destino} tiene ${spf.length} registros SPF; el receptor lo trata como error permanente (permerror).`,
            });
            return null;
        }
        const hijo = await contarConsultas(spf[0], destino, profundidad + 1, ctx);
        ctx.incluidos.push({ dominio: destino, consultas: hijo.total });
        return { termino, hijo };
    }));

    for (const resultado of resultados) {
        if (!resultado) continue;
        total += resultado.hijo.total;
        if (resultado.termino.nombre === "redirect" && propio === null) allEfectivo = resultado.hijo.all;
    }
    return { total, all: allEfectivo };
}

export async function analizarSpf(dominio: string, txts: string[] | null, leer: LectorTxt): Promise<ResultadoSpf> {
    const vacio: ResultadoSpf = {
        estado: "error-consulta",
        registro: null,
        registros: [],
        terminos: [],
        consultas: { total: 0, completo: false, incluidos: [] },
        observaciones: [],
    };
    if (txts === null) {
        return { ...vacio, observaciones: [{ nivel: "info", texto: "No se pudieron leer los TXT del dominio. Prueba de nuevo en un rato." }] };
    }
    const registros = txts.filter(esRegistroSpf);
    if (registros.length === 0) {
        return {
            ...vacio,
            estado: "sin-registro",
            observaciones: [
                { nivel: "atencion", texto: "No hay registro SPF. Los receptores no pueden comprobar qué servidores envían correo por este dominio." },
                { nivel: "info", texto: "Si el dominio no envía correo, basta con «v=spf1 -all»." },
            ],
        };
    }
    if (registros.length > 1) {
        return {
            ...vacio,
            estado: "varios",
            registros,
            observaciones: [{ nivel: "error", texto: `Hay ${registros.length} registros SPF. Debe haber uno solo: con varios, el receptor da error permanente (permerror) y el SPF no se aplica. Únelos en uno.` }],
        };
    }

    const registro = registros[0];
    const { terminos, desconocidos } = analizarTerminosSpf(registro, dominio);
    const ctx: Contexto = { leer, visitados: new Set([dominio]), leidos: 0, completo: true, incluidos: [], observaciones: [] };
    const conteo = await contarConsultas(registro, dominio, 0, ctx);
    const observaciones: Observacion[] = [];

    const tieneRedirect = terminos.some(termino => termino.nombre === "redirect" && termino.consultas > 0);
    switch (conteo.all) {
        case "-": observaciones.push({ nivel: "bien", texto: "Termina en -all: los servidores no listados fallan el SPF." }); break;
        case "~": observaciones.push({ nivel: "info", texto: "Termina en ~all (softfail): los servidores no listados se marcan como sospechosos, pero en general el correo se entrega. Es lo habitual cuando DMARC decide el resto." }); break;
        case "?": observaciones.push({ nivel: "atencion", texto: "Termina en ?all (neutral): no dice nada de los servidores no listados." }); break;
        case "+": observaciones.push({ nivel: "error", texto: "Termina en +all: cualquier servidor pasa el SPF, así que el registro no protege nada. Cámbialo por ~all o -all." }); break;
        default:
            observaciones.push(tieneRedirect && ctx.completo
                ? { nivel: "atencion", texto: "Ni el registro ni su redirect terminan en all: los servidores no listados quedan como neutral." }
                : tieneRedirect
                    ? { nivel: "info", texto: "La política final la define el redirect, que no se pudo leer completo." }
                    : { nivel: "atencion", texto: "No termina en all ni tiene redirect: los servidores no listados quedan como neutral." });
    }

    const cuantas = conteo.total === 1 ? "1 consulta DNS" : `${conteo.total} consultas DNS`;
    if (conteo.total > LIMITE_CONSULTAS_SPF) {
        observaciones.push({ nivel: "error", texto: `Unas ${cuantas}: pasa el límite de ${LIMITE_CONSULTAS_SPF} y el receptor da error permanente (permerror). Quita include que no uses o cambia algunos por ip4/ip6.` });
    } else if (!ctx.completo) {
        observaciones.push({ nivel: "info", texto: `Al menos ${cuantas} de ${LIMITE_CONSULTAS_SPF}. No se pudo seguir todo, así que el número real puede ser mayor.` });
    } else if (conteo.total >= LIMITE_CONSULTAS_SPF - 2) {
        observaciones.push({ nivel: "atencion", texto: `Unas ${cuantas} de ${LIMITE_CONSULTAS_SPF}: queda poco margen; un include más puede pasar el límite.` });
    } else {
        observaciones.push({ nivel: "bien", texto: conteo.total === 0
            ? `No gasta consultas DNS extra (el límite es ${LIMITE_CONSULTAS_SPF}).`
            : `${conteo.total === 1 ? "Una consulta DNS" : `Unas ${cuantas}`} de ${LIMITE_CONSULTAS_SPF} permitidas.` });
    }

    if (terminos.some(termino => termino.nombre === "ptr")) {
        observaciones.push({ nivel: "atencion", texto: "Usa ptr, que la RFC 7208 desaconseja: es lento y algunos receptores lo ignoran." });
    }
    for (const termino of desconocidos) {
        observaciones.push({ nivel: "error", texto: `Término no reconocido «${termino}»: el receptor da error permanente (permerror).` });
    }

    return {
        estado: "ok",
        registro,
        registros,
        terminos,
        consultas: { total: conteo.total, completo: ctx.completo, incluidos: ctx.incluidos },
        observaciones: [...observaciones, ...ctx.observaciones],
    };
}

const POLITICAS = ["none", "quarantine", "reject"] as const;
type Politica = (typeof POLITICAS)[number];
const RIGOR: Record<Politica, number> = { none: 0, quarantine: 1, reject: 2 };
const SIGNIFICADO: Record<Politica, string> = {
    none: "solo monitoreo; el correo que falla se entrega igual",
    quarantine: "el correo que falla va a spam",
    reject: "el correo que falla se rechaza",
};

function leerPolitica(valor: string | undefined): Politica | null {
    const v = valor?.toLowerCase();
    return v && (POLITICAS as readonly string[]).includes(v) ? (v as Politica) : null;
}

function dominioDeUri(uri: string): string | null {
    const coincidencia = /^mailto:[^@\s]+@([^!\s]+)/i.exec(uri.trim());
    return coincidencia ? coincidencia[1].toLowerCase() : null;
}

export function analizarDmarc(dominio: string, txts: string[] | null): ResultadoDmarc {
    const nombre = `_dmarc.${dominio}`;
    const base: ResultadoDmarc = { estado: "error-consulta", nombre, registro: null, registros: [], filas: [], observaciones: [] };
    if (txts === null) {
        return { ...base, observaciones: [{ nivel: "info", texto: `No se pudo leer ${nombre}. Prueba de nuevo en un rato.` }] };
    }
    const registros = txts.filter(txt => /^v\s*=\s*DMARC1\s*(;|$)/i.test(txt.trim()));
    if (registros.length === 0) {
        const observaciones: Observacion[] = [
            { nivel: "atencion", texto: `No hay registro DMARC en ${nombre}. Sin él, cada receptor decide solo qué hacer con correo que suplanta el dominio y no recibes informes.` },
            { nivel: "info", texto: "Para empezar sin afectar la entrega: «v=DMARC1; p=none; rua=mailto:» seguido de un buzón tuyo para los informes." },
        ];
        if (dominio.split(".").length > 2) {
            observaciones.push({ nivel: "info", texto: `Si ${dominio} es un subdominio, el receptor aplica el DMARC del dominio principal (su etiqueta sp). Revísalo aparte.` });
        }
        return { ...base, estado: "sin-registro", observaciones };
    }
    if (registros.length > 1) {
        return {
            ...base,
            estado: "varios",
            registros,
            observaciones: [{ nivel: "error", texto: `Hay ${registros.length} registros DMARC: con más de uno, los receptores no aplican DMARC. Deja uno solo.` }],
        };
    }

    const registro = registros[0];
    const etiquetas = new Map<string, string>();
    for (const parte of registro.split(";")) {
        const igual = parte.indexOf("=");
        if (igual < 0) continue;
        const clave = parte.slice(0, igual).trim().toLowerCase();
        if (clave && !etiquetas.has(clave)) etiquetas.set(clave, parte.slice(igual + 1).trim());
    }

    const observaciones: Observacion[] = [];
    const filas: FilaExplicada[] = [];
    const p = leerPolitica(etiquetas.get("p"));
    const spCruda = etiquetas.get("sp");
    const sp = leerPolitica(spCruda);
    const pctCruda = etiquetas.get("pct");
    const pct = pctCruda !== undefined && /^\d{1,3}$/.test(pctCruda) && Number(pctCruda) <= 100 ? Number(pctCruda) : null;
    const lista = (clave: string) => (etiquetas.get(clave) ?? "").split(",").map(uri => uri.trim()).filter(Boolean);
    const rua = lista("rua");
    const ruf = lista("ruf");
    const alineacion = (clave: string) => {
        const valor = etiquetas.get(clave)?.toLowerCase();
        return valor === "s" ? "s" : valor === "r" ? "r" : valor === undefined ? null : "invalida";
    };
    const adkim = alineacion("adkim");
    const aspf = alineacion("aspf");

    filas.push({ termino: `p=${etiquetas.get("p") ?? "(falta)"}`, explicacion: p ? `Política del dominio: ${SIGNIFICADO[p]}` : "Valor no válido: debe ser none, quarantine o reject" });
    filas.push({
        termino: spCruda === undefined ? "sp (sin definir)" : `sp=${spCruda}`,
        explicacion: spCruda === undefined ? "Los subdominios usan la misma política que p" : sp ? `Política de los subdominios: ${SIGNIFICADO[sp]}` : "Valor no válido: se usa la política de p",
    });
    filas.push({
        termino: pctCruda === undefined ? "pct (sin definir)" : `pct=${pctCruda}`,
        explicacion: pctCruda === undefined ? "La política se aplica al 100 % del correo que falla" : pct !== null ? `La política se aplica al ${pct} % del correo que falla` : "Valor no válido: debe ser un entero de 0 a 100",
    });
    filas.push({ termino: rua.length ? `rua=${rua.join(",")}` : "rua (sin definir)", explicacion: rua.length ? "Adónde llegan los informes agregados (diarios)" : "No se piden informes agregados" });
    filas.push({ termino: ruf.length ? `ruf=${ruf.join(",")}` : "ruf (sin definir)", explicacion: ruf.length ? "Adónde llegan los informes de cada fallo (pocos receptores los envían)" : "No se piden informes de cada fallo" });
    for (const [clave, valor, cual] of [["adkim", adkim, "DKIM"], ["aspf", aspf, "SPF"]] as const) {
        filas.push({
            termino: valor === null ? `${clave} (sin definir)` : `${clave}=${etiquetas.get(clave)}`,
            explicacion: valor === "s" ? `Alineación ${cual} estricta: el dominio debe coincidir exacto con el del remitente`
                : valor === "invalida" ? "Valor no válido: debe ser r o s; se usa r"
                    : `Alineación ${cual} relajada: vale un subdominio del mismo dominio${valor === null ? " (por defecto)" : ""}`,
        });
    }

    if (!p) {
        observaciones.push({ nivel: "error", texto: rua.length
            ? "Falta p o tiene un valor no válido. Con rua presente, los receptores lo tratan como p=none."
            : "Falta p o tiene un valor no válido, y es obligatoria: los receptores pueden ignorar el registro." });
    } else if (p === "none") {
        observaciones.push(rua.length
            ? { nivel: "info", texto: "p=none: solo monitoreo. Sirve para leer los informes y, cuando todo tu correo legítimo pase, subir a quarantine o reject." }
            : { nivel: "atencion", texto: "p=none sin rua no tiene efecto práctico: no aplica política ni te llegan informes." });
    } else {
        observaciones.push({ nivel: "bien", texto: `p=${p}: ${SIGNIFICADO[p]}.` });
    }
    if (p && sp && RIGOR[sp] < RIGOR[p]) {
        observaciones.push({ nivel: "atencion", texto: `sp=${sp} deja a los subdominios con una política más suave que la del dominio (p=${p}).` });
    }
    if (spCruda !== undefined && !sp) observaciones.push({ nivel: "atencion", texto: `sp=${spCruda} no es válido; se usa la política de p.` });
    if (pctCruda !== undefined && pct === null) {
        observaciones.push({ nivel: "atencion", texto: `pct=${pctCruda} no es válido; los receptores usan 100.` });
    } else if (pct !== null && pct < 100 && p && p !== "none") {
        observaciones.push({ nivel: "info", texto: `pct=${pct}: la política se aplica al ${pct} % del correo que falla; al resto se le aplica un nivel más suave.` });
    }
    if (rua.length === 0 && p && p !== "none") {
        observaciones.push({ nivel: "info", texto: "Sin rua: no te llegan informes, así que no sabrás si algún envío legítimo empieza a fallar." });
    }
    const uris = [...rua, ...ruf];
    if (uris.some(uri => !/^mailto:/i.test(uri))) {
        observaciones.push({ nivel: "atencion", texto: "rua y ruf deben ser direcciones mailto:." });
    }
    const externos = [...new Set(uris.map(dominioDeUri).filter((destino): destino is string =>
        destino !== null && destino !== dominio && !destino.endsWith(`.${dominio}`) && !dominio.endsWith(`.${destino}`)))];
    if (externos.length > 0) {
        observaciones.push({ nivel: "info", texto: `Los informes van a otro dominio (${externos.join(", ")}). Ese dominio debe aceptarlo con un TXT en ${dominio}._report._dmarc.<su dominio>; los servicios de informes lo publican solos.` });
    }
    if (adkim === "invalida" || aspf === "invalida") {
        observaciones.push({ nivel: "atencion", texto: "adkim y aspf solo aceptan r o s; con otro valor se usa r." });
    }
    const conocidas = new Set(["v", "p", "sp", "pct", "rua", "ruf", "adkim", "aspf", "fo", "rf", "ri", "np", "psd", "t"]);
    const extra = [...etiquetas.keys()].filter(clave => !conocidas.has(clave));
    if (extra.length > 0) observaciones.push({ nivel: "info", texto: `Etiquetas desconocidas (los receptores las ignoran): ${extra.join(", ")}.` });

    return { ...base, estado: "ok", registro, registros, filas, observaciones };
}
