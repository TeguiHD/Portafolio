/**
 * Contenido de los QR de contacto, evento y Bitcoin, con los escapes que exige cada formato.
 * Reemplaza a los formateadores equivalentes de src/utils/qr-data-formats.ts, que no escapan el texto.
 */
import type { BitcoinData, EventData, MeCardData, VCardData } from "@/utils/qr-data-formats";

const CRLF = "\r\n";

/** Texto de iCalendar (RFC 5545 §3.3.11) y de vCard 3.0 (RFC 2426 §4): \ ; , y saltos de línea. */
export function escaparTextoIcs(texto: string): string {
    return texto.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
}

/** vCard 2.1 solo escapa ; y \ ; no admite \n, así que el salto de línea pasa a ser coma. */
function escaparVcard21(texto: string): string {
    return texto.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/\s*(\r\n|\r|\n)\s*/g, ", ");
}

/** MECARD (DoCoMo, como lo lee ZXing): \ : ; con barra inversa; sin saltos de línea. */
function escaparMecard(texto: string): string {
    return texto.replace(/([\\:;])/g, "\\$1").replace(/\s*(\r\n|\r|\n)\s*/g, " ");
}

/** Una URL sin esquema se toma como https; sin saltos de línea. */
function urlCompleta(url: string): string {
    const limpia = url.trim().replace(/\s+/g, "");
    if (!limpia) return "";
    return /^[a-z][a-z0-9+.-]*:/i.test(limpia) ? limpia : `https://${limpia}`;
}

const conTexto = (v?: string) => (v ?? "").trim();

/** vCard 2.1 o 3.0 con todos los campos de la interfaz: nombre, teléfonos, correo, empresa, cargo, web y dirección. */
export function vcardQr(data: VCardData): string {
    const nombre = conTexto(data.firstName);
    if (!nombre) return "";
    const v21 = data.version === "2.1";
    const esc = v21 ? escaparVcard21 : escaparTextoIcs;
    // En 2.1 el lector supone ASCII si no se declara el juego de caracteres: sin esto, «Muñoz» llega roto.
    const prop = (nombreProp: string, valor: string) =>
        v21 && /[^\x20-\x7e]/.test(valor) ? `${nombreProp};CHARSET=UTF-8` : nombreProp;
    const apellido = conTexto(data.lastName);
    const completo = apellido ? `${nombre} ${apellido}` : nombre;
    const lineas = ["BEGIN:VCARD", `VERSION:${v21 ? "2.1" : "3.0"}`];
    lineas.push(`${prop("N", completo)}:${esc(apellido)};${esc(nombre)};;;`);
    lineas.push(`${prop("FN", completo)}:${esc(completo)}`);
    const org = conTexto(data.organization);
    if (org) lineas.push(`${prop("ORG", org)}:${esc(org)}`);
    const cargo = conTexto(data.title);
    if (cargo) lineas.push(`${prop("TITLE", cargo)}:${esc(cargo)}`);
    const fono = conTexto(data.phone);
    if (fono) lineas.push(`${v21 ? "TEL;WORK;VOICE" : "TEL;TYPE=WORK,VOICE"}:${esc(fono)}`);
    const celular = conTexto(data.cellPhone);
    if (celular) lineas.push(`${v21 ? "TEL;CELL" : "TEL;TYPE=CELL"}:${esc(celular)}`);
    const correo = conTexto(data.email);
    if (correo) lineas.push(`${v21 ? "EMAIL;INTERNET" : "EMAIL;TYPE=INTERNET"}:${esc(correo)}`);
    const web = urlCompleta(data.website ?? "");
    if (web) lineas.push(`URL:${web}`);
    const direccion = conTexto(data.address);
    // La dirección va entera en el campo «calle» de ADR (casilla;extendida;calle;ciudad;región;código;país).
    if (direccion) lineas.push(`${prop("ADR", direccion)}:;;${esc(direccion)};;;;`);
    lineas.push("END:VCARD");
    return lineas.join(CRLF);
}

/** MECARD con nombre, teléfono, correo, web y dirección. */
export function mecardQr(data: MeCardData): string {
    const nombre = conTexto(data.name);
    if (!nombre) return "";
    let mecard = `MECARD:N:${escaparMecard(nombre)};`;
    const fono = conTexto(data.phone);
    if (fono) mecard += `TEL:${escaparMecard(fono)};`;
    const correo = conTexto(data.email);
    if (correo) mecard += `EMAIL:${escaparMecard(correo)};`;
    const direccion = conTexto(data.address);
    if (direccion) mecard += `ADR:${escaparMecard(direccion)};`;
    const web = urlCompleta(data.url ?? "");
    if (web) mecard += `URL:${escaparMecard(web)};`;
    const nota = conTexto(data.note);
    if (nota) mecard += `NOTE:${escaparMecard(nota)};`;
    return `${mecard};`;
}

/**
 * «2026-11-19T14:30» (lo que entrega <input type="datetime-local">, en la hora del equipo) → «20261119T173000Z».
 * Se guarda en UTC para que el evento caiga a la misma hora real en cualquier zona horaria. null si no es válida.
 */
export function fechaIcs(local: string): string | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(local.trim());
    if (!m) return null;
    const [, a, mes, d, h, min, s = "0"] = m;
    const fecha = new Date(Number(a), Number(mes) - 1, Number(d), Number(h), Number(min), Number(s));
    if (Number.isNaN(fecha.getTime())) return null;
    const dos = (n: number) => String(n).padStart(2, "0");
    return `${fecha.getUTCFullYear()}${dos(fecha.getUTCMonth() + 1)}${dos(fecha.getUTCDate())}T${dos(fecha.getUTCHours())}${dos(fecha.getUTCMinutes())}${dos(fecha.getUTCSeconds())}Z`;
}

/** Error legible del evento, o null si se puede generar. */
export function validarEvento(data: EventData): string | null {
    if (!conTexto(data.title) || !data.startDate) return null;
    const inicio = fechaIcs(data.startDate);
    if (!inicio) return "La fecha de inicio no es válida.";
    if (!data.endDate) return null;
    const fin = fechaIcs(data.endDate);
    if (!fin) return "La fecha de término no es válida.";
    if (fin < inicio) return "El evento termina antes de empezar. Revisa la fecha de término.";
    return null;
}

/** VEVENT (RFC 5545) con DTSTART/DTEND en UTC y el texto escapado. Vacío si falta título o inicio, o si las fechas no cuadran. */
export function eventoQr(data: EventData): string {
    const titulo = conTexto(data.title);
    if (!titulo || !data.startDate || validarEvento(data)) return "";
    const inicio = fechaIcs(data.startDate);
    const fin = data.endDate ? fechaIcs(data.endDate) : null;
    const lineas = ["BEGIN:VEVENT", `SUMMARY:${escaparTextoIcs(titulo)}`, `DTSTART:${inicio}`];
    if (fin) lineas.push(`DTEND:${fin}`);
    const lugar = conTexto(data.location);
    if (lugar) lineas.push(`LOCATION:${escaparTextoIcs(lugar)}`);
    const descripcion = conTexto(data.description);
    if (descripcion) lineas.push(`DESCRIPTION:${escaparTextoIcs(descripcion)}`);
    lineas.push("END:VEVENT");
    return lineas.join(CRLF);
}

/** Monto BIP-21 en BTC con punto decimal y sin notación científica («0.0000001», no «1e-7»). */
export function montoBitcoin(monto: number): string {
    return monto.toFixed(8).replace(/\.?0+$/, "");
}

/** URI bitcoin: con el monto bien escrito; montos ≤ 0 se omiten. */
export function bitcoinQr(data: BitcoinData): string {
    const direccion = data.address.trim();
    if (!direccion) return "";
    const params: string[] = [];
    if (data.amount !== undefined && Number.isFinite(data.amount) && data.amount > 0) params.push(`amount=${montoBitcoin(data.amount)}`);
    const etiqueta = conTexto(data.label);
    if (etiqueta) params.push(`label=${encodeURIComponent(etiqueta)}`);
    return params.length ? `bitcoin:${direccion}?${params.join("&")}` : `bitcoin:${direccion}`;
}
