// Tipos de QR y formateadores simples (URL, correo, teléfono, SMS, WhatsApp, WiFi, mapas, RA).
// vCard, MeCard, evento y Bitcoin viven en src/lib/tools/qr-formatos.ts, que escapa el texto.

export type QRType =
    | "url" | "text"
    | "email" | "phone" | "sms" | "whatsapp"
    | "wifi"
    | "vcard" | "mecard"
    | "event"
    | "location"
    | "bitcoin"
    | "ar";

export type QRCategory = "basic" | "contact" | "communication" | "network" | "other";

export interface QRTypeConfig {
    id: QRType;
    label: string;
    icon: string;
    description: string;
    category: QRCategory;
}

export const QR_TYPES: QRTypeConfig[] = [
    // Basic
    { id: "url", label: "URL", icon: "🔗", description: "Enlace web", category: "basic" },
    { id: "text", label: "Texto", icon: "📝", description: "Texto libre", category: "basic" },
    // Contact
    { id: "vcard", label: "vCard", icon: "👤", description: "Tarjeta de contacto", category: "contact" },
    { id: "mecard", label: "MeCard", icon: "📇", description: "Contacto (formato japonés)", category: "contact" },
    // Communication
    { id: "email", label: "Email", icon: "📧", description: "Correo electrónico", category: "communication" },
    { id: "phone", label: "Teléfono", icon: "📱", description: "Llamada telefónica", category: "communication" },
    { id: "sms", label: "SMS", icon: "💬", description: "Mensaje de texto", category: "communication" },
    { id: "whatsapp", label: "WhatsApp", icon: "💚", description: "Mensaje WhatsApp", category: "communication" },
    // Network
    { id: "wifi", label: "WiFi", icon: "📶", description: "Red inalámbrica", category: "network" },
    // Other
    { id: "location", label: "Ubicación", icon: "📍", description: "Coordenadas GPS", category: "other" },
    { id: "event", label: "Evento", icon: "📅", description: "Evento de calendario", category: "other" },
    { id: "bitcoin", label: "Bitcoin", icon: "₿", description: "Dirección crypto", category: "other" },
    { id: "ar", label: "Realidad aumentada", icon: "🧊", description: "Modelo 3D en AR, sin app", category: "other" },
];

// Get types by category

// ============ FORMATTERS ============

// URL
export const formatURL = (url: string): string => {
    // Un enlace pegado suele traer espacios o un salto de línea al final: irían dentro del QR y lo romperían.
    const limpia = url.trim();
    if (!limpia) return "";
    if (!/^https?:\/\//i.test(limpia)) return `https://${limpia}`;
    return limpia;
};

// Email
export interface EmailData { to: string; subject?: string; body?: string; }
export const formatEmail = (data: EmailData): string => {
    const para = data.to.trim();
    if (!para) return "";
    let mailto = `mailto:${para}`;
    const params: string[] = [];
    if (data.subject) params.push(`subject=${encodeURIComponent(data.subject)}`);
    if (data.body) params.push(`body=${encodeURIComponent(data.body)}`);
    if (params.length) mailto += `?${params.join("&")}`;
    return mailto;
};

// Phone
export const formatPhone = (phone: string): string => {
    if (!phone) return "";
    return `tel:${phone.replace(/[^\d+]/g, "")}`;
};

// SMS
export interface SMSData { phone: string; message?: string; }
export const formatSMS = (data: SMSData): string => {
    if (!data.phone) return "";
    let sms = `sms:${data.phone.replace(/[^\d+]/g, "")}`;
    if (data.message) sms += `?body=${encodeURIComponent(data.message)}`;
    return sms;
};

// WhatsApp
export interface WhatsAppData { phone: string; message?: string; }
export const formatWhatsApp = (data: WhatsAppData): string => {
    if (!data.phone) return "";
    const phone = data.phone.replace(/[^\d]/g, "");
    let wa = `https://wa.me/${phone}`;
    if (data.message) wa += `?text=${encodeURIComponent(data.message)}`;
    return wa;
};

// WiFi
export interface WiFiData { ssid: string; password?: string; encryption: "WPA" | "WEP" | "nopass"; hidden?: boolean; }
export const formatWiFi = (data: WiFiData): string => {
    if (!data.ssid) return "";
    const escape = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");
    let wifi = `WIFI:S:${escape(data.ssid)};T:${data.encryption};`;
    if (data.password && data.encryption !== "nopass") wifi += `P:${escape(data.password)};`;
    if (data.hidden) wifi += `H:true;`;
    return wifi + ";";
};

// vCard (supports v2.1 and v3.0)
export interface VCardData {
    version?: "2.1" | "3.0";
    firstName: string;
    lastName?: string;
    phone?: string;
    cellPhone?: string;
    email?: string;
    organization?: string;
    title?: string;
    website?: string;
    address?: string;
}

// MeCard (Japanese format, widely supported)
export interface MeCardData {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    url?: string;
    note?: string;
}

// Location - supports multiple map formats
export type MapFormat = "google" | "apple" | "waze" | "geo";
export interface LocationData {
    query?: string; // Address or place name
    latitude?: number;
    longitude?: number;
    format: MapFormat;
}
export const formatLocation = (data: LocationData): string => {
    const hasCoords = Number.isFinite(data.latitude) && Number.isFinite(data.longitude);
    const hasQuery = data.query && data.query.trim();

    if (!hasCoords && !hasQuery) return "";

    switch (data.format) {
        case "google":
            // Google Maps - works on all platforms
            if (hasCoords) return `https://www.google.com/maps?q=${data.latitude},${data.longitude}`;
            return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.query!)}`;
        case "apple":
            // Apple Maps - opens in Apple Maps on iOS, web on others
            if (hasCoords) return `https://maps.apple.com/?ll=${data.latitude},${data.longitude}&q=${encodeURIComponent(data.query || "Ubicación")}`;
            return `https://maps.apple.com/?q=${encodeURIComponent(data.query!)}`;
        case "waze":
            // Waze - opens app if installed
            if (hasCoords) return `https://waze.com/ul?ll=${data.latitude},${data.longitude}&navigate=yes`;
            return `https://waze.com/ul?q=${encodeURIComponent(data.query!)}`;
        case "geo":
        default:
            // Universal geo: URI - opens default map app
            if (hasCoords) {
                let geo = `geo:${data.latitude},${data.longitude}`;
                if (hasQuery) geo += `?q=${encodeURIComponent(data.query!)}`;
                return geo;
            }
            return `geo:0,0?q=${encodeURIComponent(data.query!)}`;
    }
};

// Event (iCalendar)
export interface EventData { title: string; location?: string; startDate: string; endDate?: string; description?: string; }

// Bitcoin
export interface BitcoinData { address: string; amount?: number; label?: string; }

// ============ REALIDAD AUMENTADA ============
// El QR apunta a /ar de este mismo sitio con las URLs de los modelos en la query.
// Sin estado en servidor. window.location.origin: en desarrollo el QR apunta a
// localhost y en producción al dominio real, sin importar el registro SEO
// (pesado) en el bundle del generador.
export interface ARData {
    title: string;
    glb?: string;
    usdz?: string;
    poster?: string;
}

export const formatAR = (data: ARData): string => {
    const glb = data.glb?.trim();
    const usdz = data.usdz?.trim();
    if (!glb && !usdz) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://nicoholas.dev";
    const q = new URLSearchParams();
    const title = data.title?.trim().slice(0, 80);
    if (title) q.set("t", title);
    if (glb) q.set("glb", glb);
    if (usdz) q.set("usdz", usdz);
    const poster = data.poster?.trim();
    if (poster) q.set("p", poster);
    return `${origin}/ar?${q.toString()}`;
};
