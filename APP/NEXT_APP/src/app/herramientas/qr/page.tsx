"use client";

import { Suspense, useState, useRef, useMemo, useEffect, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { useSearchParams } from "next/navigation";
import { Box, QrCode, Download, Check, Upload, X, ArrowUpRight, ShieldCheck, LoaderCircle, AlertCircle, Palette, ScanLine } from "lucide-react";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { useToolTracking } from "@/hooks/useDebounce";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ArModelEditor, arValidation } from "@/components/qr/ArModelEditor";
import { renderQRToCanvas, renderQRToSVG, type QRStyle, type EyeStyle } from "@/utils/qr-renderer";
import {
    QR_TYPES, type QRType,
    formatURL, formatEmail, formatPhone, formatSMS, formatWhatsApp,
    formatWiFi, formatVCard, formatMeCard, formatLocation, formatEvent, formatBitcoin,
    type EmailData, type SMSData, type WhatsAppData, type WiFiData, type VCardData, type MeCardData, type LocationData, type EventData, type BitcoinData, type MapFormat,
    formatAR, type ARData,
} from "@/utils/qr-data-formats";
import { getTypeIconDataURL } from "@/utils/qr-type-icons";
import { QR_TYPE_ICONS, MAP_FORMAT_ICONS } from "@/components/qr/QRIcons";

const templates = [
    { name: "Esencial", fg: "#111827", bg: "#ffffff", style: "square" as QRStyle },
    { name: "Botánico", fg: "#14532d", bg: "#f0fdf4", style: "rounded" as QRStyle },
    { name: "Editorial", fg: "#312e81", bg: "#f5f3ff", style: "dots" as QRStyle },
    { name: "Terracota", fg: "#7c2d12", bg: "#fff7ed", style: "rounded" as QRStyle },
];
const shapeNames: Record<string, string> = { square: "Cuadrado", rounded: "Redondeado", dots: "Puntos", classy: "Esquinas", diamond: "Diamante", circle: "Círculo", leaf: "Hoja" };

function luminance(hex: string) {
    const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
}
function contrast(a: string, b: string) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
function saveFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
function QrInput({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
    return <label className="studio-field">{label ?? props.placeholder ?? "Valor"}<input {...props} /></label>;
}
function QrTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <label className="studio-field">{props.placeholder ?? "Contenido"}<textarea {...props} /></label>;
}

export default function QRGeneratorPage() {
    return <Suspense fallback={<div className="p-8 text-sm text-slate-400">Cargando editor QR…</div>}><QRStudio /></Suspense>;
}

function QRStudio() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("qr");
    const searchParams = useSearchParams();
    const [qrType, setQrType] = useState<QRType>("url");
    const [urlData, setUrlData] = useState("https://nicoholas.dev");
    const [textData, setTextData] = useState("");
    const [emailData, setEmailData] = useState<EmailData>({ to: "" });
    const [phoneData, setPhoneData] = useState("");
    const [smsData, setSmsData] = useState<SMSData>({ phone: "" });
    const [whatsappData, setWhatsappData] = useState<WhatsAppData>({ phone: "" });
    const [wifiData, setWifiData] = useState<WiFiData>({ ssid: "", encryption: "WPA" });
    const [vcardData, setVcardData] = useState<VCardData>({ firstName: "", version: "3.0" });
    const [mecardData, setMecardData] = useState<MeCardData>({ name: "" });
    const [locationData, setLocationData] = useState<LocationData>({ format: "google", query: "" });
    const [eventData, setEventData] = useState<EventData>({ title: "", startDate: "" });
    const [bitcoinData, setBitcoinData] = useState<BitcoinData>({ address: "" });
    const [arData, setArData] = useState<ARData>({ title: "", glb: "", usdz: "", poster: "" });

    const [size, setSize] = useState(1024);
    const [fgColor, setFgColor] = useState("#000000");
    const [bgColor, setBgColor] = useState("#ffffff");
    const [eyeColor, setEyeColor] = useState("#000000");
    const [errorLevel, setErrorLevel] = useState<"L" | "M" | "Q" | "H">("H");
    const [style, setStyle] = useState<QRStyle>("rounded");
    const [eyeStyle, setEyeStyle] = useState<EyeStyle>("rounded");
    const [logo, setLogo] = useState<string | null>(null);
    const [useTypeIcon, setUseTypeIcon] = useState(false);
    const [useGradient, setUseGradient] = useState(false);
    const [gradientTo, setGradientTo] = useState("#00B8A9");
    const [gradientAngle, setGradientAngle] = useState(135);


    const [renderedKey, setRenderedKey] = useState("");
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [logoError, setLogoError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [exportMessage, setExportMessage] = useState("");
    const [filename, setFilename] = useState("mi-codigo-qr");
    const [designTab, setDesignTab] = useState<"presets" | "custom">("presets");
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const logoRequest = useRef(0);
    const { trackImmediate } = useToolTracking("qr", { trackViewOnMount: true, debounceMs: 2000 });
    const trackRef = useRef(trackImmediate);
    useEffect(() => { trackRef.current = trackImmediate; }, [trackImmediate]);
    useEffect(() => {
        const type = searchParams.get("tipo");
        if (QR_TYPES.some((item) => item.id === type)) setQrType(type as QRType);
    }, [searchParams]);
    const qrContent = useMemo(() => {
        switch (qrType) {
            case "url": return formatURL(urlData);
            case "text": return textData;
            case "email": return formatEmail(emailData);
            case "phone": return formatPhone(phoneData);
            case "sms": return formatSMS(smsData);
            case "whatsapp": return formatWhatsApp(whatsappData);
            case "wifi": return formatWiFi(wifiData);
            case "vcard": return formatVCard(vcardData);
            case "mecard": return formatMeCard(mecardData);
            case "location": return formatLocation(locationData);
            case "event": return formatEvent(eventData);
            case "bitcoin": return formatBitcoin(bitcoinData);
            case "ar": return formatAR(arData);
            default: return "";
        }
    }, [qrType, urlData, textData, emailData, phoneData, smsData, whatsappData, wifiData, vcardData, mecardData, locationData, eventData, bitcoinData, arData]);

    const activeLogo = useMemo(() => {
        if (logo) return logo;
        if (useTypeIcon) return getTypeIconDataURL(qrType, fgColor, bgColor);
        return null;
    }, [logo, useTypeIcon, qrType, fgColor, bgColor]);

    const gradient = useMemo(
        () => (useGradient ? { from: fgColor, to: gradientTo, angle: gradientAngle } : null),
        [useGradient, fgColor, gradientTo, gradientAngle]
    );


    const arError = qrType === "ar" ? arValidation(arData) : null;
    const renderOptions = useMemo(() => ({ text: qrContent, size, bg: bgColor, fg: fgColor, eyeColor, style, eyeStyle, logo: activeLogo, level: errorLevel, gradient, margin: 4 }), [qrContent, size, bgColor, fgColor, eyeColor, style, eyeStyle, activeLogo, errorLevel, gradient]);
    const renderKey = JSON.stringify(renderOptions);
    const canDownload = !!qrContent && !arError && !generationError && renderedKey === renderKey;
    const updating = !!qrContent && !arError && renderedKey !== renderKey && !generationError;
    const minimumContrast = Math.min(contrast(fgColor, bgColor), contrast(eyeColor, bgColor), ...(useGradient ? [contrast(gradientTo, bgColor)] : []));
    const lowContrast = minimumContrast < 4.5 || luminance(fgColor) > luminance(bgColor);
    const lastGenerateTrack = useRef(0);

    useEffect(() => {
        setGenerationError(null);
        setExportMessage("");
        if (!qrContent || arError || isLoading || !isAuthorized) return;
        let cancelled = false;
        const timer = window.setTimeout(async () => {
            try {
                // Render aislado: un logo lento nunca puede sobreescribir un QR posterior.
                const draft = document.createElement("canvas");
                await renderQRToCanvas(draft, renderOptions);
                if (cancelled || !canvasRef.current) return;
                const canvas = canvasRef.current;
                const context = canvas.getContext("2d");
                if (!context) throw new Error("Canvas no disponible");
                canvas.width = draft.width; canvas.height = draft.height;
                context.drawImage(draft, 0, 0);
                setRenderedKey(renderKey);
                if (Date.now() - lastGenerateTrack.current > 5000) {
                    lastGenerateTrack.current = Date.now();
                    trackRef.current("generate", { type: qrType });
                }
            } catch {
                if (!cancelled) setGenerationError("No se pudo generar este QR. Reduce el contenido o cambia la corrección de errores e inténtalo de nuevo.");
            }
        }, 250);
        return () => { cancelled = true; window.clearTimeout(timer); };
    }, [renderKey, renderOptions, qrContent, arError, qrType, isLoading, isAuthorized]);

    function selectType(type: QRType) {
        setQrType(type);
        const url = new URL(window.location.href);
        url.searchParams.set("tipo", type);
        window.history.replaceState(null, "", url);
    }

    async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        const request = ++logoRequest.current;
        setLogoError(null);
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
            setLogoError("Elige una imagen PNG, JPG o WebP de hasta 2 MB."); return;
        }
        try {
            const bitmap = await createImageBitmap(file);
            const draft = document.createElement("canvas");
            const ratio = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
            draft.width = Math.max(1, Math.round(bitmap.width * ratio)); draft.height = Math.max(1, Math.round(bitmap.height * ratio));
            draft.getContext("2d")!.drawImage(bitmap, 0, 0, draft.width, draft.height);
            bitmap.close();
            if (request !== logoRequest.current) return;
            setLogo(draft.toDataURL("image/png")); setUseTypeIcon(false); setErrorLevel("H");
        } catch { if (request === logoRequest.current) setLogoError("No pudimos leer esa imagen. Prueba con otro archivo."); }
    }

    async function download(format: "png" | "svg") {
        if (!canDownload || exporting || !canvasRef.current) return;
        setExporting(true); setExportMessage("");
        try {
            const blob = format === "svg"
                ? new Blob([await renderQRToSVG(renderOptions)], { type: "image/svg+xml;charset=utf-8" })
                : await new Promise<Blob>((resolve, reject) => canvasRef.current!.toBlob((value) => value ? resolve(value) : reject(new Error("Export failed")), "image/png"));
            saveFile(blob, `${filename.trim().replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "mi-codigo-qr"}.${format}`);
            setExportMessage(`Descarga ${format.toUpperCase()} preparada.`);
            trackRef.current("download", { type: qrType, format });
        } catch { setExportMessage("No pudimos preparar la descarga. Inténtalo de nuevo."); }
        finally { setExporting(false); }
    }

    if (isLoading) return <div className="flex min-h-80 items-center justify-center gap-3 text-sm text-slate-400"><LoaderCircle className="animate-spin" size={20} />Cargando editor…</div>;
    if (!isAuthorized) return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Generador QR"} />;
    const inputClass = "w-full rounded-lg border border-white/10 bg-[#0b111a] px-3 py-3 text-sm text-white placeholder:text-slate-500";
    const currentTypeConfig = QR_TYPES.find((item) => item.id === qrType);
    const renderTypeForm = () => {
        switch (qrType) {
            case "url": return <QrInput type="url" value={urlData} onChange={(e) => { setUrlData(e.target.value); }} placeholder="https://ejemplo.com" className={inputClass} />;
            case "text": return <QrTextarea value={textData} onChange={(e) => { setTextData(e.target.value); }} placeholder="Escribe cualquier texto..." className={`${inputClass} h-24 resize-none`} />;
            case "email": return (<div className="space-y-2"><QrInput type="email" placeholder="correo@ejemplo.com" className={inputClass} value={emailData.to} onChange={(e) => { setEmailData({ ...emailData, to: e.target.value }); }} /><QrInput type="text" placeholder="Asunto" className={inputClass} value={emailData.subject || ""} onChange={(e) => { setEmailData({ ...emailData, subject: e.target.value }); }} /><QrTextarea placeholder="Mensaje" className={`${inputClass} h-16 resize-none`} value={emailData.body || ""} onChange={(e) => { setEmailData({ ...emailData, body: e.target.value }); }} /></div>);
            case "phone": return <QrInput type="tel" value={phoneData} onChange={(e) => { setPhoneData(e.target.value); }} placeholder="+56 9 1234 5678" className={inputClass} />;
            case "sms": return (<div className="space-y-2"><QrInput type="tel" placeholder="+56 9 1234 5678" className={inputClass} value={smsData.phone} onChange={(e) => { setSmsData({ ...smsData, phone: e.target.value }); }} /><QrTextarea placeholder="Mensaje" className={`${inputClass} h-16 resize-none`} value={smsData.message || ""} onChange={(e) => { setSmsData({ ...smsData, message: e.target.value }); }} /></div>);
            case "whatsapp": return (<div className="space-y-2"><QrInput type="tel" placeholder="+56 9 1234 5678" className={inputClass} value={whatsappData.phone} onChange={(e) => { setWhatsappData({ ...whatsappData, phone: e.target.value }); }} /><QrTextarea placeholder="Mensaje predefinido" className={`${inputClass} h-16 resize-none`} value={whatsappData.message || ""} onChange={(e) => { setWhatsappData({ ...whatsappData, message: e.target.value }); }} /></div>);
            case "wifi": return (<div className="space-y-2"><QrInput type="text" placeholder="Nombre de red (SSID)" className={inputClass} value={wifiData.ssid} onChange={(e) => { setWifiData({ ...wifiData, ssid: e.target.value }); }} /><QrInput type="password" placeholder="Contraseña" className={inputClass} value={wifiData.password || ""} onChange={(e) => { setWifiData({ ...wifiData, password: e.target.value }); }} /><select aria-label="Seguridad de la red WiFi" className={inputClass} value={wifiData.encryption} onChange={(e) => { setWifiData({ ...wifiData, encryption: e.target.value as WiFiData["encryption"] }); }}><option value="WPA">WPA/WPA2</option><option value="WEP">WEP</option><option value="nopass">Sin contraseña</option></select></div>);
            case "vcard": return (<div className="space-y-2"><select aria-label="Versión de vCard" className={inputClass} value={vcardData.version} onChange={(e) => { setVcardData({ ...vcardData, version: e.target.value as VCardData["version"] }); }}><option value="3.0">vCard 3.0 (Recomendado)</option><option value="2.1">vCard 2.1 (Legacy)</option></select><div className="grid grid-cols-2 gap-2"><QrInput type="text" placeholder="Nombre *" className={inputClass} value={vcardData.firstName} onChange={(e) => { setVcardData({ ...vcardData, firstName: e.target.value }); }} /><QrInput type="text" placeholder="Apellido" className={inputClass} value={vcardData.lastName || ""} onChange={(e) => { setVcardData({ ...vcardData, lastName: e.target.value }); }} /></div><div className="grid grid-cols-2 gap-2"><QrInput type="tel" placeholder="Teléfono" className={inputClass} value={vcardData.phone || ""} onChange={(e) => { setVcardData({ ...vcardData, phone: e.target.value }); }} /><QrInput type="tel" placeholder="Celular" className={inputClass} value={vcardData.cellPhone || ""} onChange={(e) => { setVcardData({ ...vcardData, cellPhone: e.target.value }); }} /></div><QrInput type="email" placeholder="Email" className={inputClass} value={vcardData.email || ""} onChange={(e) => { setVcardData({ ...vcardData, email: e.target.value }); }} /><QrInput type="text" placeholder="Empresa" className={inputClass} value={vcardData.organization || ""} onChange={(e) => { setVcardData({ ...vcardData, organization: e.target.value }); }} /></div>);
            case "mecard": return (<div className="space-y-2"><QrInput type="text" placeholder="Nombre completo *" className={inputClass} value={mecardData.name} onChange={(e) => { setMecardData({ ...mecardData, name: e.target.value }); }} /><QrInput type="tel" placeholder="Teléfono" className={inputClass} value={mecardData.phone || ""} onChange={(e) => { setMecardData({ ...mecardData, phone: e.target.value }); }} /><QrInput type="email" placeholder="Email" className={inputClass} value={mecardData.email || ""} onChange={(e) => { setMecardData({ ...mecardData, email: e.target.value }); }} /></div>);
            case "ar": return <ArModelEditor data={arData} onChange={setArData} />;
            case "location":
                return (
                    <div className="space-y-3">
                        <div className="flex gap-2 flex-wrap" role="group" aria-label="Aplicación de mapas">
                            {(["google", "apple", "waze", "geo"] as MapFormat[]).map((f) => {
                                const Icon = MAP_FORMAT_ICONS[f];
                                const labels = { google: "Google Maps", apple: "Apple Maps", waze: "Waze", geo: "Universal" };
                                return (
                                    <button key={f} type="button" aria-pressed={locationData.format === f} onClick={() => { setLocationData({ ...locationData, format: f }); }}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${locationData.format === f ? "bg-[#FF8A00]/20 border border-[#FF8A00] text-white" : "bg-white/5 border border-white/10 text-neutral-400"}`}>
                                        <Icon className="w-4 h-4" />
                                        <span>{labels[f]}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <QrInput type="text" placeholder="Dirección o nombre del lugar" className={inputClass} value={locationData.query || ""} onChange={(e) => { setLocationData({ ...locationData, query: e.target.value }); }} />
                        <details className="text-xs">
                            <summary className="text-neutral-500 cursor-pointer hover:text-neutral-300">Coordenadas exactas (opcional)</summary>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <QrInput type="number" step="any" placeholder="Latitud" className={inputClass} value={locationData.latitude ?? ""} onChange={(e) => { setLocationData({ ...locationData, latitude: e.target.value === "" ? undefined : Number(e.target.value) }); }} />
                                <QrInput type="number" step="any" placeholder="Longitud" className={inputClass} value={locationData.longitude ?? ""} onChange={(e) => { setLocationData({ ...locationData, longitude: e.target.value === "" ? undefined : Number(e.target.value) }); }} />
                            </div>
                        </details>
                    </div>
                );
            case "event": return (<div className="space-y-2"><QrInput type="text" placeholder="Título *" className={inputClass} value={eventData.title} onChange={(e) => { setEventData({ ...eventData, title: e.target.value }); }} /><QrInput type="text" placeholder="Lugar" className={inputClass} value={eventData.location || ""} onChange={(e) => { setEventData({ ...eventData, location: e.target.value }); }} /><div className="grid grid-cols-2 gap-2"><div><label className="text-[10px] text-neutral-500">Inicio *</label><QrInput type="datetime-local" label="Fecha y hora de inicio" className={inputClass} value={eventData.startDate} onChange={(e) => { setEventData({ ...eventData, startDate: e.target.value }); }} /></div><div><label className="text-[10px] text-neutral-500">Fin</label><QrInput type="datetime-local" label="Fecha y hora de fin" className={inputClass} value={eventData.endDate || ""} onChange={(e) => { setEventData({ ...eventData, endDate: e.target.value }); }} /></div></div></div>);
            case "bitcoin": return (<div className="space-y-2"><QrInput type="text" placeholder="Dirección Bitcoin *" className={`${inputClass} font-mono text-xs`} value={bitcoinData.address} onChange={(e) => { setBitcoinData({ ...bitcoinData, address: e.target.value }); }} /><QrInput type="number" step="0.00000001" placeholder="Cantidad (opcional)" className={inputClass} value={bitcoinData.amount || ""} onChange={(e) => { setBitcoinData({ ...bitcoinData, amount: e.target.value ? parseFloat(e.target.value) : undefined }); }} /></div>);
            default: return null;
        }
    };

    return (
        <div className="tool-page">
            <main className="tool-main mx-auto max-w-7xl px-4 sm:px-8">
                <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
                    <div><p className="studio-eyebrow mb-3 text-teal-300">QR STUDIO</p><h1 className="text-2xl font-semibold text-white sm:text-3xl">Generador de Códigos QR</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">De un enlace a una experiencia 3D. Configura, personaliza y descarga un QR que se sienta tuyo.</p></div>
                    <span className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[11px] text-slate-400"><ShieldCheck size={14} aria-hidden="true" />QR generado en tu navegador</span>
                </header>
                <nav aria-label="Secciones del editor QR" className="sticky top-16 z-20 mb-5 flex gap-2 rounded-xl border border-white/10 bg-[#0d131d] p-2 lg:hidden">
                    <a href="#qr-edit" className="studio-button flex-1">Editar contenido</a>
                    <a href="#qr-preview" className="studio-button studio-button-primary flex-1">Ver QR y descargar</a>
                </nav>
                <div className="qr-workbench">
                    <div id="qr-edit" className="min-w-0 scroll-mt-36 space-y-5">
                        <section className="studio-panel">
                            <div className="studio-panel-heading"><p className="studio-eyebrow mb-1">01 / EL DESTINO</p><h2 className="text-sm font-semibold text-white">¿Qué sucede al escanearlo?</h2></div>
                            <div className="p-4 sm:p-5">
                                <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Tipo de código QR">
                                    {[...QR_TYPES.filter((item) => item.id === "ar"), ...QR_TYPES.filter((item) => item.id !== "ar")].map((type) => {
                                        const Icon = QR_TYPE_ICONS[type.id];
                                        return <button key={type.id} type="button" onClick={() => selectType(type.id)} aria-pressed={qrType === type.id} className={`flex min-h-14 items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs transition-colors ${qrType === type.id ? "border-teal-300/40 bg-teal-300/10 text-teal-200" : type.id === "ar" ? "border-violet-300/20 bg-violet-300/5 text-violet-200 hover:bg-violet-300/10" : "border-white/[0.06] text-slate-400 hover:border-white/15 hover:bg-white/5"}`}><Icon className="h-5 w-5 shrink-0" aria-hidden="true" /><span>{type.label}</span>{qrType === type.id && <Check size={12} aria-hidden="true" className="ml-auto shrink-0" />}</button>;
                                    })}
                                </div>
                                <div className="mb-4 border-t border-white/[0.06] pt-4"><h3 className="text-sm font-medium text-white">{currentTypeConfig?.label === "URL" ? "El enlace que quieres compartir" : currentTypeConfig?.label}</h3><p className="mt-1 text-xs text-slate-500">{qrType === "ar" ? "Prepara los modelos y comprueba la experiencia antes de imprimir." : "El QR se actualiza mientras editas. No hace falta pulsar generar."}</p></div>
                                {renderTypeForm()}
                            </div>
                        </section>
                        <section className="studio-panel">
                            <div className="studio-panel-heading flex items-center justify-between gap-3"><div><p className="studio-eyebrow mb-1">02 / TU IDENTIDAD</p><h2 className="text-sm font-semibold text-white">Diseño y marca</h2></div><Palette size={18} aria-hidden="true" className="text-slate-500" /></div>
                            <div className="space-y-5 p-4 sm:p-5">
                                <div role="group" aria-label="Opciones de diseño" className="flex gap-1 rounded-xl bg-black/15 p-1"><button type="button" aria-pressed={designTab === "presets"} onClick={() => setDesignTab("presets")} className="studio-segment flex-1">Estilos listos</button><button type="button" aria-pressed={designTab === "custom"} onClick={() => setDesignTab("custom")} className="studio-segment flex-1">Personalizar</button></div>
                                {designTab === "presets" ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{templates.map((template) => <button key={template.name} type="button" aria-pressed={fgColor === template.fg && bgColor === template.bg && style === template.style && !useGradient} onClick={() => { setFgColor(template.fg); setBgColor(template.bg); setEyeColor(template.fg); setStyle(template.style); setEyeStyle("rounded"); setUseGradient(false); }} className="rounded-xl border border-white/10 p-2.5 text-xs text-slate-300 transition-colors hover:border-white/30"><span className="mb-2 flex h-16 items-center justify-center rounded-lg" style={{ background: template.bg, color: template.fg }}><QrCode size={38} strokeWidth={1.5} aria-hidden="true" /></span>{template.name}</button>)}</div> : <div className="space-y-5">
                                    <div className="grid grid-cols-3 gap-3"><ColorPicker label="Fondo" color={bgColor} onChange={setBgColor} /><ColorPicker label="Cuerpo" color={fgColor} onChange={setFgColor} /><ColorPicker label="Ojos" color={eyeColor} onChange={setEyeColor} /></div>
                                    <label className="flex min-h-11 items-center gap-3 text-xs text-slate-300"><input type="checkbox" checked={useGradient} onChange={(event) => setUseGradient(event.target.checked)} className="h-4 w-4 accent-teal-300" />Usar un degradado</label>
                                    {useGradient && <div className="grid grid-cols-2 items-center gap-4"><ColorPicker label="Segundo color" color={gradientTo} onChange={setGradientTo} /><label className="studio-field">Ángulo: {gradientAngle}°<input type="range" min="0" max="360" step="15" value={gradientAngle} onChange={(event) => setGradientAngle(Number(event.target.value))} /></label></div>}
                                    <div><p className="mb-2 text-xs text-slate-400">Forma del cuerpo</p><div className="flex flex-wrap gap-1" role="group" aria-label="Forma del cuerpo">{(["square", "rounded", "dots", "classy", "diamond"] as QRStyle[]).map((shape) => <button type="button" key={shape} aria-pressed={style === shape} onClick={() => setStyle(shape)} className="studio-segment">{shapeNames[shape]}</button>)}</div></div>
                                    <div><p className="mb-2 text-xs text-slate-400">Forma de los ojos</p><div className="flex flex-wrap gap-1" role="group" aria-label="Forma de los ojos">{(["square", "rounded", "circle", "leaf", "diamond"] as EyeStyle[]).map((shape) => <button type="button" key={shape} aria-pressed={eyeStyle === shape} onClick={() => setEyeStyle(shape)} className="studio-segment">{shapeNames[shape]}</button>)}</div></div>
                                </div>}
                                <div className="border-t border-white/[0.06] pt-5"><p className="mb-3 text-xs font-medium text-slate-300">Logo central <span className="font-normal text-slate-500">/ opcional</span></p><div className="flex flex-wrap gap-2">
                                    <label className="studio-button cursor-pointer focus-within:outline-2 focus-within:outline-teal-300"><Upload size={15} aria-hidden="true" />{logo ? "Cambiar logo" : "Subir logo"}<input type="file" aria-label="Subir logo" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} className="sr-only" /></label>
                                    <button type="button" aria-pressed={useTypeIcon && !logo} onClick={() => { logoRequest.current++; setUseTypeIcon(!useTypeIcon); setLogo(null); setErrorLevel("H"); }} className="studio-button"><QrCode size={15} aria-hidden="true" />Icono del contenido</button>
                                    {(logo || useTypeIcon) && <button type="button" onClick={() => { logoRequest.current++; setLogo(null); setUseTypeIcon(false); }} className="studio-button" aria-label="Quitar logo"><X size={15} />Quitar</button>}
                                </div><p className="mt-2 text-[11px] text-slate-500">PNG, JPG o WebP · hasta 2 MB. Al añadir un logo se activa la corrección H.</p>{logoError && <p role="alert" className="mt-2 text-xs text-amber-200">{logoError}</p>}</div>
                            </div>
                        </section>
                    </div>
                    <aside id="qr-preview" className="qr-preview min-w-0 scroll-mt-36 space-y-4" aria-label="Vista previa y descarga">
                        <section className="studio-panel overflow-hidden">
                            <div className="studio-panel-heading flex items-center justify-between gap-2"><h2 className="text-sm font-medium text-white">Tu código QR</h2><span role="status" className={`flex items-center gap-1.5 text-[11px] ${canDownload ? "text-teal-300" : "text-slate-400"}`}>{updating ? <LoaderCircle size={12} className="animate-spin" aria-hidden="true" /> : canDownload ? <span className="h-1.5 w-1.5 rounded-full bg-teal-300" /> : null}{updating ? "Actualizando…" : canDownload ? "Listo para descargar" : "Esperando contenido"}</span></div>
                            <div className="relative flex min-h-[300px] items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(94,234,212,0.05),transparent_75%)] p-6 sm:p-8">
                                <div className="aspect-square w-full max-w-[280px] overflow-hidden rounded-xl bg-white shadow-xl shadow-black/15">
                                    <canvas ref={canvasRef} role="img" aria-label="Vista previa del código QR" className={`h-full w-full ${!canDownload && !updating ? "hidden" : "block"}`} style={{ opacity: canDownload ? 1 : .35 }} />
                                    {!canDownload && !updating && <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center"><QrCode className="h-14 w-14 text-slate-300" strokeWidth={1} aria-hidden="true" /><p className="text-xs leading-relaxed text-slate-500">Completa el contenido para ver tu QR.</p></div>}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 py-3 text-center"><div><p className="text-[10px] text-slate-500">DIMENSIONES</p><p className="mt-1 text-xs text-white">{size} × {size}</p></div><div><p className="text-[10px] text-slate-500">FORMATO</p><p className="mt-1 text-xs text-white">PNG / SVG</p></div><div><p className="text-[10px] text-slate-500">MARGEN</p><p className="mt-1 text-xs text-white">4 módulos</p></div></div>
                        </section>
                        {(generationError || arError) && <p role="alert" className="flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-xs leading-relaxed text-amber-200"><AlertCircle size={16} className="shrink-0" aria-hidden="true" />{generationError || arError}</p>}
                        {lowContrast && <p role="status" className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-xs leading-relaxed text-amber-200">Estos colores pueden dificultar la lectura. Usa un cuerpo oscuro sobre fondo claro y prueba el QR con tu móvil antes de imprimir.</p>}
                        <section className="studio-panel">
                            <div className="studio-panel-heading"><p className="studio-eyebrow mb-1">03 / EL RESULTADO</p><h2 className="text-sm font-semibold text-white">Exportar tu QR</h2></div>
                            <div className="space-y-4 p-4 sm:p-5">
                                <label className="studio-field">Nombre del archivo<input value={filename} maxLength={80} onChange={(event) => setFilename(event.target.value)} /></label>
                                <div className="grid grid-cols-2 gap-3"><div className="studio-field"><label htmlFor="qr-size">Resolución PNG</label><select id="qr-size" value={size} onChange={(event) => setSize(Number(event.target.value))}>{[256, 512, 1024, 2048].map((resolution) => <option key={resolution} value={resolution}>{resolution} px</option>)}</select></div><div className="studio-field"><label htmlFor="qr-level">Corrección de errores</label><select id="qr-level" value={errorLevel} onChange={(event) => setErrorLevel(event.target.value as "L" | "M" | "Q" | "H")}><option value="L">L · mínima</option><option value="M">M · equilibrada</option><option value="Q">Q · alta</option><option value="H">H · máxima</option></select></div></div>
                                {qrType === "ar" && <p className="text-[11px] leading-relaxed text-slate-400">Las URLs 3D pueden generar un QR denso. Usa M para simplificarlo o H si incluyes un logo.</p>}
                                {activeLogo && errorLevel !== "H" && <p className="text-xs text-amber-200">Con logo, recomendamos corrección H. Comprueba la lectura antes de distribuirlo.</p>}
                                <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => download("png")} disabled={!canDownload || exporting} className="studio-button studio-button-primary"><Download size={15} aria-hidden="true" />Descargar PNG</button><button type="button" onClick={() => download("svg")} disabled={!canDownload || exporting} className="studio-button"><Download size={15} aria-hidden="true" />Descargar SVG</button></div>
                                <p className="text-[11px] leading-relaxed text-slate-500">PNG para compartir. SVG para imprimir y escalar sin perder definición.</p>
                                <p role="status" className="min-h-4 text-xs text-teal-200">{exportMessage}</p>
                            </div>
                        </section>
                        <div className="flex gap-3 px-1 text-xs leading-relaxed text-slate-400"><ScanLine size={20} className="shrink-0 text-slate-500" aria-hidden="true" /><p>Prueba el resultado con la cámara de tu móvil. El contraste, el tamaño de impresión y el logo influyen en la lectura.</p></div>
                        {qrType === "ar" && <a href="/ar" target="_blank" rel="noopener noreferrer" className="studio-button w-full"><Box size={15} aria-hidden="true" />Cómo funciona la realidad aumentada<ArrowUpRight size={14} aria-hidden="true" /></a>}
                    </aside>
                </div>
            </main>
        </div>
    );
}
