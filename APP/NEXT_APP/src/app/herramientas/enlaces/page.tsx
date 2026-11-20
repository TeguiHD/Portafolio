"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

import { useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useToolTracking } from "@/hooks/useDebounce";
import { useToolAccess } from "@/hooks/useToolAccess";
import { useCopiar } from "@/lib/tools/copiar";
import { descargarTexto } from "@/lib/tools/descargar";

// Security: Input limits
const MAX_PHONE_LENGTH = 20;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_EMAIL_LENGTH = 254;
const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 2000;
const MAX_TITLE_LENGTH = 200;
const MAX_LOCATION_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1000;

import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";

type TabType = "whatsapp" | "email" | "calendar";

// Security: Validate phone number
const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/[\s\-()]/g, "");
    return /^\+?[0-9]{6,20}$/.test(cleaned);
};

// Security: Validate email
const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Security: Clean phone for URL
const cleanPhone = (phone: string): string => {
    return phone.replace(/[\s\-()]/g, "");
};

/** wa.me exige el código de país. Un celular chileno escrito sin él (9 dígitos que empiezan con 9) recibe el 56. */
const numeroWhatsApp = (phone: string): string => {
    const limpio = cleanPhone(phone);
    if (limpio.startsWith("+")) return limpio.slice(1);
    // «00» es el prefijo internacional al marcar (0056 9…): en wa.me va sin él.
    if (limpio.startsWith("00")) return limpio.slice(2);
    return /^9\d{8}$/.test(limpio) ? `56${limpio}` : limpio;
};

// Codificar para la URL. Antes se escapaba como HTML primero y «&», «/» o «'» llegaban como «&amp;», «&#x2F;»…
// encodeURIComponent ya hace seguro el valor. Los saltos de línea se conservan donde sirven (mensaje, cuerpo) y en
// asuntos y títulos se cambian por espacios.
const encodeUrlParam = (text: string, conSaltos = false): string =>
    encodeURIComponent(conSaltos ? text.replace(/\r\n?/g, "\n") : text.replace(/[\r\n]+/g, " "));

/** Texto de un campo iCalendar (RFC 5545 §3.3.11): se escapan \\ ; , y los saltos de línea. */
const textoIcs = (t: string): string => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n?|\n/g, "\\n");

/** Líneas de más de 75 octetos se pliegan con CRLF + espacio (RFC 5545 §3.1). */
const plegar = (linea: string): string => {
    const bytes = new TextEncoder().encode(linea);
    if (bytes.length <= 75) return linea;
    const partes: string[] = []; let actual = "";
    for (const c of linea) {
        if (new TextEncoder().encode(actual + c).length > (partes.length ? 74 : 75)) { partes.push(actual); actual = ""; }
        actual += c;
    }
    partes.push(actual);
    return partes.join("\r\n ");
};

/**
 * Cuándo es el evento. Sin hora de inicio es de día completo (antes salía de 00:00 a 01:00); sin término dura una hora
 * (antes duraba cero minutos); si termina antes de la hora de inicio, termina al día siguiente (22:00 a 02:00).
 */
interface Horario { todoElDia: boolean; inicio: Date; fin: Date; alDiaSiguiente: boolean }
const horarioEvento = (fecha: string, hora: string, horaFin: string): Horario | null => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
    if (!m) return null;
    const a = Number(m[1]), mes = Number(m[2]) - 1, d = Number(m[3]);
    if (!hora) return { todoElDia: true, inicio: new Date(a, mes, d), fin: new Date(a, mes, d + 1), alDiaSiguiente: false };
    const [h = 0, min = 0] = hora.split(":").map(Number);
    const inicio = new Date(a, mes, d, h, min);
    if (Number.isNaN(inicio.getTime())) return null;
    if (!horaFin) return { todoElDia: false, inicio, fin: new Date(inicio.getTime() + 3_600_000), alDiaSiguiente: false };
    const [hf = 0, mf = 0] = horaFin.split(":").map(Number);
    const fin = new Date(a, mes, d, hf, mf);
    return fin > inicio
        ? { todoElDia: false, inicio, fin, alDiaSiguiente: false }
        : { todoElDia: false, inicio, fin: new Date(a, mes, d + 1, hf, mf), alDiaSiguiente: true };
};

/** «20261120T173000Z»: hora UTC, así cada calendario la muestra en la zona de quien abre el enlace. */
const utcCompacta = (d: Date): string => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
/** «2026-11-20T17:30:00Z». */
const utcIso = (d: Date): string => d.toISOString().replace(/\.\d{3}/, "");
const dos = (n: number) => String(n).padStart(2, "0");
/** «20261120» (día local, para eventos de día completo). */
const diaCompacto = (d: Date): string => `${d.getFullYear()}${dos(d.getMonth() + 1)}${dos(d.getDate())}`;
/** «2026-11-20». */
const diaIso = (d: Date): string => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;

// Generate ICS file content
const generateICS = (title: string, horario: Horario, location: string, description: string): string => {
    const fechas = horario.todoElDia
        ? [`DTSTART;VALUE=DATE:${diaCompacto(horario.inicio)}`, `DTEND;VALUE=DATE:${diaCompacto(horario.fin)}`]
        : [`DTSTART:${utcCompacta(horario.inicio)}`, `DTEND:${utcCompacta(horario.fin)}`];

    // UID y DTSTAMP son obligatorios en un VEVENT; sin ellos varios calendarios rechazan o duplican el evento.
    const uid = `${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now().toString(36)}@nicoholas.dev`;
    const sello = utcCompacta(new Date());
    return [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nicoholas.dev//Link Generator//ES", "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${sello}`, ...fechas,
        `SUMMARY:${textoIcs(title)}`, ...(location ? [`LOCATION:${textoIcs(location)}`] : []), ...(description ? [`DESCRIPTION:${textoIcs(description)}`] : []),
        "END:VEVENT", "END:VCALENDAR",
    ].map(plegar).join("\r\n") + "\r\n";
};

export default function LinkGeneratorPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("enlaces");
    const { trackImmediate } = useToolTracking("enlaces", { trackViewOnMount: true, debounceMs: 2000 });

    const [activeTab, setActiveTab] = useState<TabType>("whatsapp");
    const { copiado, fallo, copiar } = useCopiar(2000);
    const lastTrackRef = useRef<number>(0);

    // WhatsApp state
    const [waPhone, setWaPhone] = useState("");
    const [waMessage, setWaMessage] = useState("");

    // Email state
    const [emailTo, setEmailTo] = useState("");
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");

    // Calendar state
    const [calTitle, setCalTitle] = useState("");
    const [calDate, setCalDate] = useState("");
    const [calTime, setCalTime] = useState("");
    const [calEndTime, setCalEndTime] = useState("");
    const [calLocation, setCalLocation] = useState("");
    const [calDescription, setCalDescription] = useState("");

    // Generate links
    const links = useMemo(() => {
        const result: Record<string, string | null> = {
            whatsapp: null,
            email: null,
            googleCalendar: null,
            outlookCalendar: null,
            icsFile: null,
        };

        // WhatsApp
        if (waPhone) {
            const cleanedPhone = cleanPhone(waPhone);
            if (validatePhone(waPhone)) {
                let waUrl = `https://wa.me/${numeroWhatsApp(cleanedPhone)}`;
                if (waMessage) {
                    waUrl += `?text=${encodeUrlParam(waMessage, true)}`;
                }
                result.whatsapp = waUrl;
            }
        }

        // Email («@» sin codificar: algunos clientes de correo no entienden «%40» en el destinatario)
        if (emailTo && validateEmail(emailTo)) {
            let mailtoUrl = `mailto:${encodeURIComponent(emailTo).replace(/%40/g, "@")}`;
            const params: string[] = [];
            if (emailSubject) params.push(`subject=${encodeUrlParam(emailSubject)}`);
            if (emailBody) params.push(`body=${encodeUrlParam(emailBody, true)}`);
            if (params.length > 0) mailtoUrl += `?${params.join("&")}`;
            result.email = mailtoUrl;
        }

        // Calendar
        const horario = calTitle.trim() ? horarioEvento(calDate, calTime, calEndTime) : null;
        if (horario) {
            const encodedTitle = encodeUrlParam(calTitle);
            const encodedLocation = encodeUrlParam(calLocation);
            const encodedDescription = encodeUrlParam(calDescription, true);
            const fechasGoogle = horario.todoElDia
                ? `${diaCompacto(horario.inicio)}/${diaCompacto(horario.fin)}`
                : `${utcCompacta(horario.inicio)}/${utcCompacta(horario.fin)}`;
            const fechasOutlook = horario.todoElDia
                ? `startdt=${diaIso(horario.inicio)}&enddt=${diaIso(horario.fin)}&allday=true`
                : `startdt=${utcIso(horario.inicio)}&enddt=${utcIso(horario.fin)}`;

            // Google Calendar
            result.googleCalendar = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodedTitle}&dates=${fechasGoogle}&location=${encodedLocation}&details=${encodedDescription}`;

            // Outlook Calendar
            result.outlookCalendar = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodedTitle}&${fechasOutlook}&location=${encodedLocation}&body=${encodedDescription}`;

            // ICS
            result.icsFile = generateICS(calTitle, horario, calLocation, calDescription);
        }

        return result;
    }, [waPhone, waMessage, emailTo, emailSubject, emailBody, calTitle, calDate, calTime, calEndTime, calLocation, calDescription]);

    // Copia (la clave es la pestaña: el «Copiado» de una no aparece en otra) y registra como mucho una vez cada 2 s.
    const copyToClipboard = useCallback(async (text: string | null, type: string) => {
        if (!text || !(await copiar(text, type))) return;
        const now = Date.now();
        if (now - lastTrackRef.current > 2000) {
            lastTrackRef.current = now;
            trackImmediate("use", { action: "copy", type });
        }
    }, [copiar, trackImmediate]);

    // Download ICS file
    const downloadICS = useCallback(() => {
        if (!links.icsFile) return;
        // Conserva tildes y ñ (antes se perdían); solo quita lo que no sirve en un nombre de archivo.
        const nombre = `${calTitle.normalize("NFC").replace(/[^\p{L}\p{N}_-]+/gu, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "evento"}.ics`;
        descargarTexto(links.icsFile, nombre, "text/calendar");
        trackImmediate("download", { type: "ics" });
    }, [links.icsFile, calTitle, trackImmediate]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Generador de Enlaces"} />;
    }

    const inputClass = "w-full px-4 py-3 rounded-xl bg-[#0F1724] border border-white/10 text-white text-sm focus:outline-none focus:border-[#FF8A00]/50 placeholder-neutral-500 disabled:opacity-50";
    const horarioVista = calDate ? horarioEvento(calDate, calTime, calEndTime) : null;

    const getCurrentLink = () => {
        switch (activeTab) {
            case "whatsapp": return links.whatsapp;
            case "email": return links.email;
            case "calendar": return links.googleCalendar;
        }
    };

    const tabConfig = {
        whatsapp: { icon: "💬", label: "WhatsApp", color: "green" },
        email: { icon: "📧", label: "Email", color: "blue" },
        calendar: { icon: "📅", label: "Calendario", color: "purple" },
    };

    return (
        <div className="tool-page">
            <main className="tool-main max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-12 sm:pt-28 sm:pb-16">
                {/* Header */}
                <ToolPageHeader slug="enlaces" title={<>Generador de Links</>} description={<>Crea links para WhatsApp, correo y calendario</>} />

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-6 p-1 rounded-xl bg-white/5 border border-white/10" role="group" aria-label="Tipo de enlace">
                    {(Object.keys(tabConfig) as TabType[]).map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            aria-pressed={activeTab === tab}
                            aria-label={tabConfig[tab].label}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === tab
                                ? "bg-[#FF8A00]/20 text-white border border-[#FF8A00]/30"
                                : "text-neutral-400 hover:text-white"
                                }`}
                        >
                            <span aria-hidden="true">{tabConfig[tab].icon}</span>
                            <span className="hidden sm:inline" aria-hidden="true">{tabConfig[tab].label}</span>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Input Form */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
                        {/* WhatsApp Form */}
                        {activeTab === "whatsapp" && (
                            <>
                                <div>
                                    <label htmlFor="enlaces-telefono" className="text-sm text-neutral-400 mb-2 block">Número de teléfono</label>
                                    <input
                                        id="enlaces-telefono"
                                        type="tel"
                                        value={waPhone}
                                        onChange={(e) => setWaPhone(e.target.value.slice(0, MAX_PHONE_LENGTH))}
                                        placeholder="+56 9 1234 5678"
                                        className={inputClass}
                                        maxLength={MAX_PHONE_LENGTH}
                                    />
                                    {waPhone && !validatePhone(waPhone) && (
                                        <p role="alert" className="text-xs text-red-400 mt-1">Formato de teléfono inválido: usa solo números, con o sin + y código de país.</p>
                                    )}
                                </div>
                                <div>
                                    <label htmlFor="enlaces-mensaje" className="text-sm text-neutral-400 mb-2 block">Mensaje predefinido (opcional)</label>
                                    <textarea
                                        id="enlaces-mensaje"
                                        value={waMessage}
                                        onChange={(e) => setWaMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                                        placeholder="Hola, me gustaría..."
                                        rows={3}
                                        maxLength={MAX_MESSAGE_LENGTH}
                                        className={`${inputClass} resize-none`}
                                    />
                                </div>
                            </>
                        )}

                        {/* Email Form */}
                        {activeTab === "email" && (
                            <>
                                <div>
                                    <label htmlFor="enlaces-correo" className="text-sm text-neutral-400 mb-2 block">Destinatario</label>
                                    <input
                                        id="enlaces-correo"
                                        type="email"
                                        value={emailTo}
                                        onChange={(e) => setEmailTo(e.target.value.slice(0, MAX_EMAIL_LENGTH))}
                                        placeholder="correo@ejemplo.com"
                                        className={inputClass}
                                        maxLength={MAX_EMAIL_LENGTH}
                                    />
                                    {emailTo && !validateEmail(emailTo) && (
                                        <p role="alert" className="text-xs text-red-400 mt-1">Formato de correo inválido</p>
                                    )}
                                </div>
                                <div>
                                    <label htmlFor="enlaces-asunto" className="text-sm text-neutral-400 mb-2 block">Asunto</label>
                                    <input
                                        id="enlaces-asunto"
                                        type="text"
                                        value={emailSubject}
                                        onChange={(e) => setEmailSubject(e.target.value.slice(0, MAX_SUBJECT_LENGTH))}
                                        placeholder="Consulta sobre..."
                                        className={inputClass}
                                        maxLength={MAX_SUBJECT_LENGTH}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="enlaces-cuerpo" className="text-sm text-neutral-400 mb-2 block">Cuerpo del mensaje</label>
                                    <textarea
                                        id="enlaces-cuerpo"
                                        value={emailBody}
                                        onChange={(e) => setEmailBody(e.target.value.slice(0, MAX_BODY_LENGTH))}
                                        placeholder="Estimado/a..."
                                        rows={4}
                                        maxLength={MAX_BODY_LENGTH}
                                        className={`${inputClass} resize-none`}
                                    />
                                </div>
                            </>
                        )}

                        {/* Calendar Form */}
                        {activeTab === "calendar" && (
                            <>
                                <div>
                                    <label htmlFor="enlaces-titulo" className="text-sm text-neutral-400 mb-2 block">Título del evento *</label>
                                    <input
                                        id="enlaces-titulo"
                                        type="text"
                                        value={calTitle}
                                        onChange={(e) => setCalTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
                                        placeholder="Reunión de proyecto"
                                        className={inputClass}
                                        maxLength={MAX_TITLE_LENGTH}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-1">
                                        <label htmlFor="enlaces-fecha" className="text-sm text-neutral-400 mb-2 block">Fecha *</label>
                                        <input
                                            id="enlaces-fecha"
                                            type="date"
                                            value={calDate}
                                            onChange={(e) => setCalDate(e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="enlaces-inicio" className="text-sm text-neutral-400 mb-2 block">Inicio</label>
                                        <input
                                            id="enlaces-inicio"
                                            type="time"
                                            value={calTime}
                                            onChange={(e) => setCalTime(e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="enlaces-fin" className="text-sm text-neutral-400 mb-2 block">Fin</label>
                                        <input
                                            id="enlaces-fin"
                                            type="time"
                                            disabled={!calTime}
                                            value={calEndTime}
                                            onChange={(e) => setCalEndTime(e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                                {horarioVista && (horarioVista.todoElDia || horarioVista.alDiaSiguiente) && (
                                    <p className="text-xs text-neutral-400" aria-live="polite">
                                        {horarioVista.todoElDia ? "Sin hora de inicio: evento de día completo." : "Termina al día siguiente (la hora de fin es anterior a la de inicio)."}
                                    </p>
                                )}
                                <div>
                                    <label htmlFor="enlaces-lugar" className="text-sm text-neutral-400 mb-2 block">Ubicación</label>
                                    <input
                                        id="enlaces-lugar"
                                        type="text"
                                        value={calLocation}
                                        onChange={(e) => setCalLocation(e.target.value.slice(0, MAX_LOCATION_LENGTH))}
                                        placeholder="Oficina central / Zoom"
                                        className={inputClass}
                                        maxLength={MAX_LOCATION_LENGTH}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="enlaces-descripcion" className="text-sm text-neutral-400 mb-2 block">Descripción</label>
                                    <textarea
                                        id="enlaces-descripcion"
                                        value={calDescription}
                                        onChange={(e) => setCalDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
                                        placeholder="Detalles del evento..."
                                        rows={2}
                                        maxLength={MAX_DESCRIPTION_LENGTH}
                                        className={`${inputClass} resize-none`}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Right: Generated Links */}
                    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-[#FF8A00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            Link generado
                        </h2>

                        {getCurrentLink() ? (
                            <div className="space-y-4">
                                {/* Main Link Display */}
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-xs text-neutral-500 mb-2">
                                        {activeTab === "whatsapp" && "Link de WhatsApp"}
                                        {activeTab === "email" && "Link Mailto"}
                                        {activeTab === "calendar" && "Link de Calendario"}
                                    </p>
                                    <p className="text-sm text-white font-mono break-all bg-[#0F1724] p-3 rounded-lg">
                                        {getCurrentLink()}
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { void copyToClipboard(getCurrentLink(), activeTab); }}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${copiado === activeTab
                                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                            : "bg-[#FF8A00] text-white hover:bg-[#FF8A00]/90 disabled:opacity-50"
                                            }`}
                                    >
                                        {copiado === activeTab ? (
                                            <>
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                ¡Copiado!
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                {fallo === activeTab ? "No se pudo copiar" : "Copiar Link"}
                                            </>
                                        )}
                                    </button>
                                    <a
                                        href={getCurrentLink() || "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Abrir el enlace (otra pestaña)"
                                        className="flex min-w-11 items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                </div>

                                {/* Calendar Extra Links */}
                                {activeTab === "calendar" && links.googleCalendar && (
                                    <div className="space-y-2 pt-4 border-t border-white/10">
                                        <p className="text-xs text-neutral-500 mb-3">Agregar a calendario</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <a
                                                href={links.googleCalendar}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm transition-all"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M19.5 22h-15A2.5 2.5 0 012 19.5v-15A2.5 2.5 0 014.5 2H8v2H4.5a.5.5 0 00-.5.5v15a.5.5 0 00.5.5h15a.5.5 0 00.5-.5V8h2v11.5a2.5 2.5 0 01-2.5 2.5z" />
                                                    <path d="M8 2h2v4H8zM14 2h2v4h-2zM4 8h16v2H4z" />
                                                </svg>
                                                Google
                                            </a>
                                            <a
                                                href={links.outlookCalendar || "#"}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-sm transition-all"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M21.5 12c0-5.247-4.253-9.5-9.5-9.5S2.5 6.753 2.5 12s4.253 9.5 9.5 9.5 9.5-4.253 9.5-9.5zm-9.5 7.5c-4.136 0-7.5-3.364-7.5-7.5S7.864 4.5 12 4.5s7.5 3.364 7.5 7.5-3.364 7.5-7.5 7.5z" />
                                                    <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
                                                </svg>
                                                Outlook
                                            </a>
                                            <button
                                                type="button"
                                                onClick={downloadICS}
                                                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 text-sm transition-all"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                .ics
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                    <span className="text-3xl">{tabConfig[activeTab].icon}</span>
                                </div>
                                <p className="text-neutral-400 text-sm">
                                    {activeTab === "whatsapp" && "Ingresa un número de teléfono"}
                                    {activeTab === "email" && "Ingresa un correo electrónico"}
                                    {activeTab === "calendar" && "Ingresa título y fecha del evento"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Back Link */}
                <div className="mt-8 text-center pb-8">
                    <Link
                        href="/herramientas"
                        className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver a herramientas
                    </Link>
                </div>
            </main>
        </div>
    );
}
