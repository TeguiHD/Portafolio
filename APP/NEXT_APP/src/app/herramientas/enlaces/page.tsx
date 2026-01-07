"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useToolTracking } from "@/hooks/useDebounce";
import { useToolAccess } from "@/hooks/useToolAccess";
import { sanitizeInput } from "@/lib/security";

// Security: Input limits
const MAX_PHONE_LENGTH = 20;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_EMAIL_LENGTH = 254;
const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 2000;
const MAX_TITLE_LENGTH = 200;
const MAX_LOCATION_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1000;

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

// Security: Encode for URL (prevent header injection)
const encodeUrlParam = (text: string): string => {
    // First sanitize for XSS, then URL encode
    return encodeURIComponent(sanitizeInput(text.replace(/[\r\n]/g, " ")));
};

// Format datetime for calendar
const formatCalendarDate = (date: string, time: string): string => {
    if (!date) return "";
    const d = new Date(`${date}T${time || "00:00"}`);
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
};

// Generate ICS file content
const generateICS = (title: string, date: string, time: string, endTime: string, location: string, description: string): string => {
    const start = formatCalendarDate(date, time);
    const end = formatCalendarDate(date, endTime || time);

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Nicoholas.dev//Link Generator//ES
BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:${sanitizeInput(title)}
LOCATION:${sanitizeInput(location)}
DESCRIPTION:${sanitizeInput(description)}
END:VEVENT
END:VCALENDAR`;
};

export default function LinkGeneratorPage() {
    const { isLoading } = useToolAccess("enlaces");
    const { trackImmediate } = useToolTracking("enlaces", { trackViewOnMount: true, debounceMs: 2000 });

    const [activeTab, setActiveTab] = useState<TabType>("whatsapp");
    const [copied, setCopied] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
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
                let waUrl = `https://wa.me/${cleanedPhone.replace(/^\+/, "")}`;
                if (waMessage) {
                    waUrl += `?text=${encodeUrlParam(waMessage)}`;
                }
                result.whatsapp = waUrl;
            }
        }

        // Email
        if (emailTo && validateEmail(emailTo)) {
            let mailtoUrl = `mailto:${encodeURIComponent(emailTo)}`;
            const params: string[] = [];
            if (emailSubject) params.push(`subject=${encodeUrlParam(emailSubject)}`);
            if (emailBody) params.push(`body=${encodeUrlParam(emailBody)}`);
            if (params.length > 0) mailtoUrl += `?${params.join("&")}`;
            result.email = mailtoUrl;
        }

        // Calendar
        if (calTitle && calDate) {
            const start = formatCalendarDate(calDate, calTime || "00:00");
            const end = formatCalendarDate(calDate, calEndTime || calTime || "01:00");
            const encodedTitle = encodeUrlParam(calTitle);
            const encodedLocation = encodeUrlParam(calLocation);
            const encodedDescription = encodeUrlParam(calDescription);

            // Google Calendar
            result.googleCalendar = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodedTitle}&dates=${start}/${end}&location=${encodedLocation}&details=${encodedDescription}`;

            // Outlook Calendar
            result.outlookCalendar = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodedTitle}&startdt=${calDate}T${calTime || "00:00"}&enddt=${calDate}T${calEndTime || calTime || "01:00"}&location=${encodedLocation}&body=${encodedDescription}`;

            // ICS
            result.icsFile = generateICS(calTitle, calDate, calTime, calEndTime, calLocation, calDescription);
        }

        return result;
    }, [waPhone, waMessage, emailTo, emailSubject, emailBody, calTitle, calDate, calTime, calEndTime, calLocation, calDescription]);

    // Copy to clipboard with throttling
    const copyToClipboard = useCallback(async (text: string | null, type: string) => {
        if (!text || isCopying) return;

        // Anti-spam cooldown
        setIsCopying(true);
        setTimeout(() => setIsCopying(false), 300);

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);

            // Throttle tracking: max 1 request per 2 seconds
            const now = Date.now();
            if (now - lastTrackRef.current > 2000) {
                lastTrackRef.current = now;
                trackImmediate("use", { action: "copy", type });
            }

            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    }, [isCopying, trackImmediate]);

    // Download ICS file
    const downloadICS = useCallback(() => {
        if (!links.icsFile) return;
        const blob = new Blob([links.icsFile], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${sanitizeInput(calTitle).replace(/\s+/g, "_")}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        trackImmediate("download", { type: "ics" });
    }, [links.icsFile, calTitle, trackImmediate]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const inputClass = "w-full px-4 py-3 rounded-xl bg-[#0F1724] border border-white/10 text-white text-sm focus:outline-none focus:border-[#FF8A00]/50 placeholder-neutral-500";

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
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-12 sm:pt-28 sm:pb-16">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF8A00]/20 to-[#00B8A9]/10 border border-[#FF8A00]/30 flex items-center justify-center">
                            <svg className="w-6 h-6 text-[#FF8A00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Generador de Links</h1>
                            <p className="text-sm text-neutral-400">Crea links para WhatsApp, correo y calendario</p>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-6 p-1 rounded-xl bg-white/5 border border-white/10">
                    {(Object.keys(tabConfig) as TabType[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === tab
                                ? "bg-[#FF8A00]/20 text-white border border-[#FF8A00]/30"
                                : "text-neutral-400 hover:text-white"
                                }`}
                        >
                            <span>{tabConfig[tab].icon}</span>
                            <span className="hidden sm:inline">{tabConfig[tab].label}</span>
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
                                    <label className="text-sm text-neutral-400 mb-2 block">Número de teléfono</label>
                                    <input
                                        type="tel"
                                        value={waPhone}
                                        onChange={(e) => setWaPhone(e.target.value.slice(0, MAX_PHONE_LENGTH))}
                                        placeholder="+56 9 1234 5678"
                                        className={inputClass}
                                        maxLength={MAX_PHONE_LENGTH}
                                    />
                                    {waPhone && !validatePhone(waPhone) && (
                                        <p className="text-xs text-red-400 mt-1">Formato de teléfono inválido</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm text-neutral-400 mb-2 block">Mensaje predefinido (opcional)</label>
                                    <textarea
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
                                    <label className="text-sm text-neutral-400 mb-2 block">Destinatario</label>
                                    <input
                                        type="email"
                                        value={emailTo}
                                        onChange={(e) => setEmailTo(e.target.value.slice(0, MAX_EMAIL_LENGTH))}
                                        placeholder="correo@ejemplo.com"
                                        className={inputClass}
                                        maxLength={MAX_EMAIL_LENGTH}
                                    />
                                    {emailTo && !validateEmail(emailTo) && (
                                        <p className="text-xs text-red-400 mt-1">Formato de email inválido</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm text-neutral-400 mb-2 block">Asunto</label>
                                    <input
                                        type="text"
                                        value={emailSubject}
                                        onChange={(e) => setEmailSubject(e.target.value.slice(0, MAX_SUBJECT_LENGTH))}
                                        placeholder="Consulta sobre..."
                                        className={inputClass}
                                        maxLength={MAX_SUBJECT_LENGTH}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-neutral-400 mb-2 block">Cuerpo del mensaje</label>
                                    <textarea
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
                                    <label className="text-sm text-neutral-400 mb-2 block">Título del evento *</label>
                                    <input
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
                                        <label className="text-sm text-neutral-400 mb-2 block">Fecha *</label>
                                        <input
                                            type="date"
                                            value={calDate}
                                            onChange={(e) => setCalDate(e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-neutral-400 mb-2 block">Inicio</label>
                                        <input
                                            type="time"
                                            value={calTime}
                                            onChange={(e) => setCalTime(e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-neutral-400 mb-2 block">Fin</label>
                                        <input
                                            type="time"
                                            value={calEndTime}
                                            onChange={(e) => setCalEndTime(e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-neutral-400 mb-2 block">Ubicación</label>
                                    <input
                                        type="text"
                                        value={calLocation}
                                        onChange={(e) => setCalLocation(e.target.value.slice(0, MAX_LOCATION_LENGTH))}
                                        placeholder="Oficina central / Zoom"
                                        className={inputClass}
                                        maxLength={MAX_LOCATION_LENGTH}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-neutral-400 mb-2 block">Descripción</label>
                                    <textarea
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
                                    <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wide">
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
                                        onClick={() => copyToClipboard(getCurrentLink(), activeTab)}
                                        disabled={isCopying}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${copied
                                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                            : "bg-[#FF8A00] text-white hover:bg-[#FF8A00]/90 disabled:opacity-50"
                                            }`}
                                    >
                                        {copied ? (
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
                                                Copiar Link
                                            </>
                                        )}
                                    </button>
                                    <a
                                        href={getCurrentLink() || "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                </div>

                                {/* Calendar Extra Links */}
                                {activeTab === "calendar" && links.googleCalendar && (
                                    <div className="space-y-2 pt-4 border-t border-white/10">
                                        <p className="text-xs text-neutral-500 uppercase tracking-wide mb-3">Agregar a calendario</p>
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
