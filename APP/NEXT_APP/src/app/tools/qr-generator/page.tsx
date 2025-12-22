"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { useToolTracking } from "@/hooks/useDebounce";
import { useToolAccess } from "@/hooks/useToolAccess";
import { renderQRToCanvas, QRStyle, EyeStyle } from "@/utils/qr-renderer";
import {
    QR_TYPES, QR_CATEGORIES, QRType, QRCategory, getTypesByCategory,
    formatURL, formatEmail, formatPhone, formatSMS, formatWhatsApp,
    formatWiFi, formatVCard, formatMeCard, formatLocation, formatEvent, formatBitcoin,
    EmailData, SMSData, WhatsAppData, WiFiData, VCardData, MeCardData, LocationData, EventData, BitcoinData, MapFormat
} from "@/utils/qr-data-formats";
import { getTypeIconDataURL } from "@/utils/qr-type-icons";
import { QR_TYPE_ICONS, QR_CATEGORY_ICONS, MAP_FORMAT_ICONS } from "@/components/qr/QRIcons";

type AccordionSection = "design" | null;

export default function QRGeneratorPage() {
    const { isLoading } = useToolAccess("qr-generator");
    const [qrType, setQrType] = useState<QRType>("url");
    const [activeCategory, setActiveCategory] = useState<QRCategory>("basic");

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

    const [size, setSize] = useState(1080);
    const [fgColor, setFgColor] = useState("#000000");
    const [bgColor, setBgColor] = useState("#ffffff");
    const [eyeColor, setEyeColor] = useState("#000000");
    const [errorLevel, setErrorLevel] = useState<"L" | "M" | "Q" | "H">("H");
    const [style, setStyle] = useState<QRStyle>("rounded");
    const [eyeStyle, setEyeStyle] = useState<EyeStyle>("rounded");
    const [logo, setLogo] = useState<string | null>(null);
    const [useTypeIcon, setUseTypeIcon] = useState(false);

    const [openSection, setOpenSection] = useState<AccordionSection>(null);
    const [isGenerated, setIsGenerated] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { trackImmediate } = useToolTracking("qr-generator", { trackViewOnMount: true, debounceMs: 2000 });

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
            default: return "";
        }
    }, [qrType, urlData, textData, emailData, phoneData, smsData, whatsappData, wifiData, vcardData, mecardData, locationData, eventData, bitcoinData]);

    const activeLogo = useMemo(() => {
        if (logo) return logo;
        if (useTypeIcon) return getTypeIconDataURL(qrType, fgColor, bgColor);
        return null;
    }, [logo, useTypeIcon, qrType, fgColor, bgColor]);

    const generateQR = useCallback(async () => {
        if (!qrContent || !canvasRef.current) return;
        setIsGenerating(true);
        await renderQRToCanvas(canvasRef.current, {
            text: qrContent, size, bg: bgColor, fg: fgColor, eyeColor, style, eyeStyle, logo: activeLogo, level: errorLevel
        });
        setIsGenerated(true);
        setIsGenerating(false);
        trackImmediate("generate", { type: qrType });
    }, [qrContent, size, fgColor, bgColor, eyeColor, style, eyeStyle, activeLogo, errorLevel, qrType]);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => { setLogo(ev.target?.result as string); setUseTypeIcon(false); setIsGenerated(false); };
            reader.readAsDataURL(file);
        }
    };

    const downloadQR = () => {
        if (!canvasRef.current || !isGenerated) return;
        const link = document.createElement("a");
        link.download = `qr-${qrType}-${Date.now()}.png`;
        link.href = canvasRef.current.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        trackImmediate("download", { type: qrType, format: "png" });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const onSettingChange = () => setIsGenerated(false);
    const presetColors = [
        { fg: "#000000", bg: "#ffffff" }, { fg: "#FFFFFF", bg: "#000000" },
        { fg: "#1e3a8a", bg: "#dbeafe" }, { fg: "#166534", bg: "#dcfce7" },
        { fg: "#9333ea", bg: "#faf5ff" }, { fg: "#FF8A00", bg: "#0F1724" },
    ];
    const inputClass = "w-full px-3 py-2.5 rounded-xl bg-[#0F1724] border border-white/10 text-white text-sm focus:outline-none focus:border-[#FF8A00]/50 placeholder-neutral-500";

    const TypeIcon = QR_TYPE_ICONS[qrType];
    const currentTypeConfig = QR_TYPES.find(t => t.id === qrType);

    const renderTypeForm = () => {
        switch (qrType) {
            case "url": return <input type="url" value={urlData} onChange={(e) => { setUrlData(e.target.value); onSettingChange(); }} placeholder="https://ejemplo.com" className={inputClass} />;
            case "text": return <textarea value={textData} onChange={(e) => { setTextData(e.target.value); onSettingChange(); }} placeholder="Escribe cualquier texto..." className={`${inputClass} h-24 resize-none`} />;
            case "email": return (<div className="space-y-2"><input type="email" placeholder="correo@ejemplo.com" className={inputClass} value={emailData.to} onChange={(e) => { setEmailData({ ...emailData, to: e.target.value }); onSettingChange(); }} /><input type="text" placeholder="Asunto" className={inputClass} value={emailData.subject || ""} onChange={(e) => { setEmailData({ ...emailData, subject: e.target.value }); onSettingChange(); }} /><textarea placeholder="Mensaje" className={`${inputClass} h-16 resize-none`} value={emailData.body || ""} onChange={(e) => { setEmailData({ ...emailData, body: e.target.value }); onSettingChange(); }} /></div>);
            case "phone": return <input type="tel" value={phoneData} onChange={(e) => { setPhoneData(e.target.value); onSettingChange(); }} placeholder="+56 9 1234 5678" className={inputClass} />;
            case "sms": return (<div className="space-y-2"><input type="tel" placeholder="+56 9 1234 5678" className={inputClass} value={smsData.phone} onChange={(e) => { setSmsData({ ...smsData, phone: e.target.value }); onSettingChange(); }} /><textarea placeholder="Mensaje" className={`${inputClass} h-16 resize-none`} value={smsData.message || ""} onChange={(e) => { setSmsData({ ...smsData, message: e.target.value }); onSettingChange(); }} /></div>);
            case "whatsapp": return (<div className="space-y-2"><input type="tel" placeholder="+56 9 1234 5678" className={inputClass} value={whatsappData.phone} onChange={(e) => { setWhatsappData({ ...whatsappData, phone: e.target.value }); onSettingChange(); }} /><textarea placeholder="Mensaje predefinido" className={`${inputClass} h-16 resize-none`} value={whatsappData.message || ""} onChange={(e) => { setWhatsappData({ ...whatsappData, message: e.target.value }); onSettingChange(); }} /></div>);
            case "wifi": return (<div className="space-y-2"><input type="text" placeholder="Nombre de red (SSID)" className={inputClass} value={wifiData.ssid} onChange={(e) => { setWifiData({ ...wifiData, ssid: e.target.value }); onSettingChange(); }} /><input type="password" placeholder="Contraseña" className={inputClass} value={wifiData.password || ""} onChange={(e) => { setWifiData({ ...wifiData, password: e.target.value }); onSettingChange(); }} /><select className={inputClass} value={wifiData.encryption} onChange={(e) => { setWifiData({ ...wifiData, encryption: e.target.value as any }); onSettingChange(); }}><option value="WPA">WPA/WPA2</option><option value="WEP">WEP</option><option value="nopass">Sin contraseña</option></select></div>);
            case "vcard": return (<div className="space-y-2"><select className={inputClass} value={vcardData.version} onChange={(e) => { setVcardData({ ...vcardData, version: e.target.value as any }); onSettingChange(); }}><option value="3.0">vCard 3.0 (Recomendado)</option><option value="2.1">vCard 2.1 (Legacy)</option></select><div className="grid grid-cols-2 gap-2"><input type="text" placeholder="Nombre *" className={inputClass} value={vcardData.firstName} onChange={(e) => { setVcardData({ ...vcardData, firstName: e.target.value }); onSettingChange(); }} /><input type="text" placeholder="Apellido" className={inputClass} value={vcardData.lastName || ""} onChange={(e) => { setVcardData({ ...vcardData, lastName: e.target.value }); onSettingChange(); }} /></div><div className="grid grid-cols-2 gap-2"><input type="tel" placeholder="Teléfono" className={inputClass} value={vcardData.phone || ""} onChange={(e) => { setVcardData({ ...vcardData, phone: e.target.value }); onSettingChange(); }} /><input type="tel" placeholder="Celular" className={inputClass} value={vcardData.cellPhone || ""} onChange={(e) => { setVcardData({ ...vcardData, cellPhone: e.target.value }); onSettingChange(); }} /></div><input type="email" placeholder="Email" className={inputClass} value={vcardData.email || ""} onChange={(e) => { setVcardData({ ...vcardData, email: e.target.value }); onSettingChange(); }} /><input type="text" placeholder="Empresa" className={inputClass} value={vcardData.organization || ""} onChange={(e) => { setVcardData({ ...vcardData, organization: e.target.value }); onSettingChange(); }} /></div>);
            case "mecard": return (<div className="space-y-2"><input type="text" placeholder="Nombre completo *" className={inputClass} value={mecardData.name} onChange={(e) => { setMecardData({ ...mecardData, name: e.target.value }); onSettingChange(); }} /><input type="tel" placeholder="Teléfono" className={inputClass} value={mecardData.phone || ""} onChange={(e) => { setMecardData({ ...mecardData, phone: e.target.value }); onSettingChange(); }} /><input type="email" placeholder="Email" className={inputClass} value={mecardData.email || ""} onChange={(e) => { setMecardData({ ...mecardData, email: e.target.value }); onSettingChange(); }} /></div>);
            case "location":
                return (
                    <div className="space-y-3">
                        <div className="flex gap-2 flex-wrap">
                            {(["google", "apple", "waze", "geo"] as MapFormat[]).map((f) => {
                                const Icon = MAP_FORMAT_ICONS[f];
                                const labels = { google: "Google Maps", apple: "Apple Maps", waze: "Waze", geo: "Universal" };
                                return (
                                    <button key={f} type="button" onClick={() => { setLocationData({ ...locationData, format: f }); onSettingChange(); }}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${locationData.format === f ? "bg-[#FF8A00]/20 border border-[#FF8A00] text-white" : "bg-white/5 border border-white/10 text-neutral-400"}`}>
                                        <Icon className="w-4 h-4" />
                                        <span>{labels[f]}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <input type="text" placeholder="Dirección o nombre del lugar" className={inputClass} value={locationData.query || ""} onChange={(e) => { setLocationData({ ...locationData, query: e.target.value }); onSettingChange(); }} />
                        <details className="text-xs">
                            <summary className="text-neutral-500 cursor-pointer hover:text-neutral-300">Coordenadas exactas (opcional)</summary>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <input type="number" step="any" placeholder="Latitud" className={inputClass} value={locationData.latitude || ""} onChange={(e) => { setLocationData({ ...locationData, latitude: parseFloat(e.target.value) || undefined }); onSettingChange(); }} />
                                <input type="number" step="any" placeholder="Longitud" className={inputClass} value={locationData.longitude || ""} onChange={(e) => { setLocationData({ ...locationData, longitude: parseFloat(e.target.value) || undefined }); onSettingChange(); }} />
                            </div>
                        </details>
                    </div>
                );
            case "event": return (<div className="space-y-2"><input type="text" placeholder="Título *" className={inputClass} value={eventData.title} onChange={(e) => { setEventData({ ...eventData, title: e.target.value }); onSettingChange(); }} /><input type="text" placeholder="Lugar" className={inputClass} value={eventData.location || ""} onChange={(e) => { setEventData({ ...eventData, location: e.target.value }); onSettingChange(); }} /><div className="grid grid-cols-2 gap-2"><div><label className="text-[10px] text-neutral-500">Inicio *</label><input type="datetime-local" className={inputClass} value={eventData.startDate} onChange={(e) => { setEventData({ ...eventData, startDate: e.target.value }); onSettingChange(); }} /></div><div><label className="text-[10px] text-neutral-500">Fin</label><input type="datetime-local" className={inputClass} value={eventData.endDate || ""} onChange={(e) => { setEventData({ ...eventData, endDate: e.target.value }); onSettingChange(); }} /></div></div></div>);
            case "bitcoin": return (<div className="space-y-2"><input type="text" placeholder="Dirección Bitcoin *" className={`${inputClass} font-mono text-xs`} value={bitcoinData.address} onChange={(e) => { setBitcoinData({ ...bitcoinData, address: e.target.value }); onSettingChange(); }} /><input type="number" step="0.00000001" placeholder="Cantidad (opcional)" className={inputClass} value={bitcoinData.amount || ""} onChange={(e) => { setBitcoinData({ ...bitcoinData, amount: e.target.value ? parseFloat(e.target.value) : undefined }); onSettingChange(); }} /></div>);
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <main className="max-w-7xl mx-auto px-4 py-6 pt-4">
                {/* Category Tabs */}
                <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
                    {QR_CATEGORIES.map((cat) => {
                        const CatIcon = QR_CATEGORY_ICONS[cat.id];
                        return (
                            <button key={cat.id} onClick={() => { setActiveCategory(cat.id); const types = getTypesByCategory(cat.id); if (types.length) setQrType(types[0].id); onSettingChange(); }}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeCategory === cat.id ? "bg-[#FF8A00] text-white" : "bg-white/5 text-neutral-400 hover:bg-white/10 border border-white/10"}`}>
                                <CatIcon className="w-4 h-4" />
                                <span>{cat.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Type Pills */}
                <div className="mb-6 flex gap-2 flex-wrap">
                    {getTypesByCategory(activeCategory).map((type) => {
                        const Icon = QR_TYPE_ICONS[type.id];
                        return (
                            <button key={type.id} onClick={() => { setQrType(type.id); onSettingChange(); }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${qrType === type.id ? "bg-white/20 text-white border border-white/30" : "bg-white/5 text-neutral-400 hover:bg-white/10"}`}>
                                <Icon className="w-3.5 h-3.5" />
                                <span>{type.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Preview */}
                    <div className="lg:col-span-4 order-1 lg:order-none">
                        <div className="lg:sticky lg:top-20 space-y-4">
                            <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                                <div className="flex items-center justify-center">
                                    <div className="w-full max-w-[280px] rounded-xl overflow-hidden shadow-2xl p-3" style={{ backgroundColor: bgColor }}>
                                        <canvas ref={canvasRef} style={{ width: "100%", height: "auto", display: isGenerated ? "block" : "none" }} />
                                        {!isGenerated && (
                                            <div className="aspect-square flex flex-col items-center justify-center bg-neutral-200 rounded-lg gap-3">
                                                {TypeIcon && <TypeIcon className="w-12 h-12 text-neutral-400" />}
                                                <span className="text-neutral-500 text-xs">Haz clic en "Generar QR"</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button onClick={generateQR} disabled={!qrContent || isGenerating}
                                className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all ${isGenerated ? "bg-white/10 text-white border border-white/20" : "bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white"} disabled:opacity-50`}>
                                {isGenerating ? (
                                    <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Generando</>
                                ) : isGenerated ? (
                                    <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Regenerar</>
                                ) : (
                                    <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="3" height="3" /><rect x="18" y="14" width="3" height="3" /><rect x="14" y="18" width="3" height="3" /><rect x="18" y="18" width="3" height="3" /></svg> Generar QR</>
                                )}
                            </button>

                            {isGenerated && (
                                <button onClick={downloadQR} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#00B8A9] to-[#00a89b] text-white font-semibold">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Descargar PNG HD
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right: Controls */}
                    <div className="lg:col-span-8 space-y-4">
                        {/* Content Card */}
                        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-[#FF8A00]/10 to-transparent flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-[#FF8A00]/20 border border-[#FF8A00]/30 flex items-center justify-center">
                                    {TypeIcon && <TypeIcon className="w-6 h-6 text-[#FF8A00]" />}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-white font-semibold">{currentTypeConfig?.label}</h2>
                                    <p className="text-xs text-neutral-400">{currentTypeConfig?.description}</p>
                                </div>
                            </div>
                            <div className="p-5">{renderTypeForm()}</div>
                        </div>

                        {/* Logo */}
                        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                            <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
                                <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="text-sm text-white font-medium">Logo Central</span>
                                <span className="text-xs text-neutral-500">(opcional)</span>
                            </div>
                            <div className="p-4 flex flex-wrap gap-2">
                                <button onClick={() => { setUseTypeIcon(!useTypeIcon); setLogo(null); onSettingChange(); }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm ${useTypeIcon && !logo ? "border-[#FF8A00] bg-[#FF8A00]/10 text-white" : "border-white/10 text-neutral-400"}`}>
                                    {TypeIcon && <TypeIcon className="w-4 h-4" />} Icono
                                </button>
                                <div className="relative">
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm ${logo ? "border-[#00B8A9] text-white" : "border-white/10 text-neutral-400"}`}>
                                        {logo ? <img src={logo} className="w-4 h-4 object-contain" /> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                                        {logo ? "Cambiar" : "Subir"}
                                    </div>
                                </div>
                                {(logo || useTypeIcon) && (
                                    <button onClick={() => { setLogo(null); setUseTypeIcon(false); onSettingChange(); }} className="px-3 py-2 rounded-xl text-red-400 text-sm border border-red-500/30">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Design Accordion */}
                        <button onClick={() => setOpenSection(openSection === "design" ? null : "design")}
                            className="w-full flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                                <span className="text-sm font-medium text-white">Personalizar Diseño</span>
                            </div>
                            <svg className={`w-4 h-4 text-neutral-400 transition-transform ${openSection === "design" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {openSection === "design" && (
                            <div className="p-5 rounded-2xl border border-white/10 bg-white/5 space-y-5">
                                <div>
                                    <label className="text-xs text-neutral-500 mb-2 block">Colores</label>
                                    <div className="flex gap-2 mb-3">
                                        {presetColors.map((p, i) => (
                                            <button key={i} onClick={() => { setFgColor(p.fg); setBgColor(p.bg); setEyeColor(p.fg); onSettingChange(); }}
                                                className={`w-8 h-8 rounded-lg border-2 ${fgColor === p.fg && bgColor === p.bg ? "border-[#FF8A00]" : "border-white/10"}`}
                                                style={{ background: `linear-gradient(135deg, ${p.fg} 50%, ${p.bg} 50%)` }} />
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 relative z-20">
                                        <ColorPicker label="Fondo" color={bgColor} onChange={(c) => { setBgColor(c); onSettingChange(); }} />
                                        <ColorPicker label="Cuerpo" color={fgColor} onChange={(c) => { setFgColor(c); onSettingChange(); }} />
                                        <ColorPicker label="Ojos" color={eyeColor} onChange={(c) => { setEyeColor(c); onSettingChange(); }} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-neutral-500 mb-2 block">Cuerpo</label>
                                        <div className="flex gap-1">
                                            {[{ id: "square", icon: "■" }, { id: "rounded", icon: "▢" }, { id: "dots", icon: "●" }, { id: "classy", icon: "◢" }, { id: "diamond", icon: "◆" }].map((s) => (
                                                <button key={s.id} onClick={() => { setStyle(s.id as QRStyle); onSettingChange(); }}
                                                    className={`w-8 h-8 rounded-lg border text-xs ${style === s.id ? "border-[#FF8A00] text-[#FF8A00]" : "border-white/10 text-neutral-400"}`}>{s.icon}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-neutral-500 mb-2 block">Ojos</label>
                                        <div className="flex gap-1">
                                            {[{ id: "square", icon: "■" }, { id: "rounded", icon: "▢" }, { id: "circle", icon: "●" }, { id: "leaf", icon: "◠" }, { id: "diamond", icon: "◆" }].map((s) => (
                                                <button key={s.id} onClick={() => { setEyeStyle(s.id as EyeStyle); onSettingChange(); }}
                                                    className={`w-8 h-8 rounded-lg border text-xs ${eyeStyle === s.id ? "border-[#00B8A9] text-[#00B8A9]" : "border-white/10 text-neutral-400"}`}>{s.icon}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
                                    <div>
                                        <label className="text-xs text-neutral-500 mb-1 block">Resolución: {size}px</label>
                                        <input type="range" min="256" max="2048" step="128" value={size} onChange={(e) => { setSize(Number(e.target.value)); onSettingChange(); }}
                                            className="w-full h-2 rounded-full appearance-none bg-white/10 accent-[#FF8A00]" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-neutral-500 mb-1 block">Corrección</label>
                                        <select value={errorLevel} onChange={(e) => { setErrorLevel(e.target.value as any); onSettingChange(); }}
                                            className="w-full px-2 py-1.5 rounded-lg bg-[#0F1724] border border-white/10 text-white text-xs">
                                            <option value="L">Bajo</option><option value="M">Medio</option><option value="Q">Alto</option><option value="H">Máximo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Back Link */}
                <div className="mt-8 text-center pb-8">
                    <Link
                        href="/tools"
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
