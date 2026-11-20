"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { ArrowLeft, Printer, Share2, Mail, MessageSquare, Copy, Check, PenLine } from "lucide-react";
import PanelFirma from "./firma-panel";
import { salirPortalAction } from "../../actions";
import type { FormularioFirma } from "@/lib/formulario-firma";
import { copiarTexto } from "@/lib/tools/copiar";
import "@/modules/portal/portal.css";

export interface EstadoFirma {
    nombre: string;
    rut: string;
    fecha: string; // ISO
    documentoCambio: boolean;
}

function fechaLegible(iso: string): string {
    const fecha = new Date(iso);
    const dia = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Santiago" }).format(fecha);
    const hora = new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Santiago" }).format(fecha);
    return `${dia} a las ${hora}`;
}

interface QuotationViewerProps {
    quotation: {
        folio: string;
        projectName: string;
        client?: { name: string; slug: string } | null;
        clientName: string;
    };
    htmlContent: string;
    firma?: EstadoFirma | null;
    /** Lo que el documento pide al firmar y cómo se llama («propuesta», «acuerdo»…). */
    formulario: FormularioFirma;
    huella: string;
    puedeFirmar: boolean;
    clientSlug: string;
    quotationSlug: string;
    /** Con sesión del portal: vuelve a «Mis documentos» en vez de a la portada. */
    volverA?: string;
    /** El admin viendo como el cliente (nombre del cliente): franja de solo lectura. */
    vistaAdmin?: string;
}

export default function QuotationViewer({ quotation, htmlContent, firma = null, formulario, huella, puedeFirmar, clientSlug, quotationSlug, volverA, vistaAdmin }: QuotationViewerProps) {
    const firmadaVigente = Boolean(firma && !firma.documentoCambio);
    const mostrarFirmar = puedeFirmar && !firmadaVigente;
    const [showShareModal, setShowShareModal] = useState(false);
    const [firmando, setFirmando] = useState(false);
    const [copia, setCopia] = useState<"ok" | "fallo" | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handlePrint = useCallback(() => {
        iframeRef.current?.contentWindow?.focus();
        iframeRef.current?.contentWindow?.print();
    }, []);

    const copyToClipboard = async () => {
        // Sin permiso o fuera de HTTPS el portapapeles falla: antes no pasaba nada y el botón no decía nada.
        setCopia((await copiarTexto(window.location.href)) ? "ok" : "fallo");
        setTimeout(() => setCopia(null), 2000);
    };

    /** El marco mide lo que mide el documento. Se recalcula al cambiar el ancho (girar el celular) y con las fuentes ya
     *  cargadas: antes se medía una sola vez y, al girar, el documento quedaba cortado dentro de un marco con su propio scroll. */
    const anchoMedido = useRef(0);
    const ajustarAlto = useCallback(() => {
        const iframe = iframeRef.current;
        try {
            const alto = iframe?.contentWindow?.document?.body?.scrollHeight;
            if (iframe && alto) iframe.style.height = Math.max(alto, 800) + "px";
            anchoMedido.current = iframe?.clientWidth ?? 0;
        } catch { /* sin acceso al documento: se queda con el alto mínimo */ }
    }, []);

    useEffect(() => {
        let cuadro = 0;
        const alCambiar = () => {
            // En el celular `resize` salta también al esconderse la barra del navegador: solo importa el ancho.
            if ((iframeRef.current?.clientWidth ?? 0) === anchoMedido.current) return;
            cancelAnimationFrame(cuadro);
            cuadro = requestAnimationFrame(ajustarAlto);
        };
        window.addEventListener("resize", alCambiar);
        return () => {
            window.removeEventListener("resize", alCambiar);
            cancelAnimationFrame(cuadro);
        };
    }, [ajustarAlto]);

    /**
     * Ctrl/Cmd + P imprime el documento y no la página que lo rodea: impreso desde fuera, el marco no se parte en hojas y
     * salía solo la primera. Escape cierra el menú de compartir.
     */
    const alTeclear = useCallback((e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key === "p" || e.key === "P")) {
            e.preventDefault();
            handlePrint();
        } else if (e.key === "Escape") {
            setShowShareModal(false);
        }
    }, [handlePrint]);
    useEffect(() => {
        window.addEventListener("keydown", alTeclear);
        return () => window.removeEventListener("keydown", alTeclear);
    }, [alTeclear]);

    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareText = `Hola, revisa esta cotización: ${quotation.projectName} - ${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    const emailUrl = `mailto:?subject=Cotización: ${encodeURIComponent(quotation.projectName)}&body=${encodeURIComponent(shareText)}`;

    return (
        <div className="pv">
            <header className="pv-barra print:hidden">
                <div className="pv-lado">
                    <a href={volverA || "/"} className="pv-volver">
                        <ArrowLeft size={18} aria-hidden="true" />
                        <span>{volverA ? "Mis documentos" : "Inicio"}</span>
                    </a>
                    <div className="pv-quien">
                        <b>{quotation.client?.name || quotation.clientName}</b>
                        <small>{quotation.folio}</small>
                    </div>
                </div>

                <div className="pv-acciones">
                    <div className="pv-envoltura">
                        <button type="button" className="pv-boton" onClick={() => setShowShareModal(!showShareModal)} aria-expanded={showShareModal} aria-label="Compartir" title="Compartir">
                            <Share2 size={17} aria-hidden="true" />
                        </button>
                        {showShareModal && (
                            <>
                                <div className="pv-cubre" onClick={() => setShowShareModal(false)} />
                                <div className="pv-compartir">
                                    <p>Compartir el enlace</p>
                                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageSquare size={18} aria-hidden="true" />WhatsApp</a>
                                    <a href={emailUrl}><Mail size={18} aria-hidden="true" />Correo</a>
                                    <button type="button" onClick={copyToClipboard} className={copia === "ok" ? "hecho" : undefined}>
                                        {copia === "ok" ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
                                        <span aria-live="polite">{copia === "ok" ? "Enlace copiado" : copia === "fallo" ? "No se pudo copiar" : "Copiar enlace"}</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {mostrarFirmar && (
                        <button type="button" onClick={() => setFirmando(true)} className="pv-boton lleno">
                            <PenLine size={16} aria-hidden="true" />
                            <span>Firmar<span className="pv-solo-ancho">{firma ? " nueva versión" : ` ${formulario.documento}`}</span></span>
                        </button>
                    )}

                    <button type="button" onClick={handlePrint} className={`pv-boton${firmadaVigente || !mostrarFirmar ? " lleno" : ""}`}
                        title={firmadaVigente ? "Imprimir o guardar la versión firmada" : "Imprimir o guardar en PDF"} aria-label={firmadaVigente ? "Descargar firmada" : "Imprimir o guardar en PDF"}>
                        <Printer size={16} aria-hidden="true" />
                        <span className="pv-solo-ancho">{firmadaVigente ? "Descargar firmada" : "Imprimir / PDF"}</span>
                    </button>
                </div>
            </header>

            {vistaAdmin && (
                <div className="pv-vista print:hidden" role="status">
                    <span>Estás viendo como <strong>{vistaAdmin}</strong>. Solo lectura: en este modo no se firma.</span>
                    <form action={salirPortalAction}>
                        <button type="submit">Salir de la vista</button>
                    </form>
                </div>
            )}

            {firma && (
                <div className="pv-firma print:hidden" data-cambio={firma.documentoCambio ? "" : undefined} role="status">
                    <span>
                        {firma.documentoCambio
                            ? <>Firmada por <strong>{firma.nombre}</strong> el {fechaLegible(firma.fecha)}, pero el documento cambió después. {puedeFirmar ? "Puedes revisar y firmar la versión nueva." : ""}</>
                            : <>Firmada por <strong>{firma.nombre}</strong> (RUT {firma.rut}) el {fechaLegible(firma.fecha)}.</>}
                    </span>
                </div>
            )}

            {firmando && (
                <PanelFirma
                    clientSlug={clientSlug}
                    quotationSlug={quotationSlug}
                    folio={quotation.folio}
                    projectName={quotation.projectName}
                    huella={huella}
                    formulario={formulario}
                    onClose={() => setFirmando(false)}
                />
            )}

            {/* El documento: conserva su propio diseño (aprobado y firmado tal cual). */}
            <div className="pv-hoja" data-firma={firma ? "" : undefined}>
                <iframe
                    ref={iframeRef}
                    srcDoc={htmlContent}
                    title={quotation.projectName}
                    sandbox="allow-same-origin allow-modals"
                    onLoad={(e) => {
                        ajustarAlto();
                        try {
                            const doc = (e.target as HTMLIFrameElement).contentWindow?.document;
                            void doc?.fonts?.ready.then(ajustarAlto);
                            // Con el foco dentro del documento las teclas no llegan a la página: el atajo de imprimir también.
                            doc?.addEventListener("keydown", alTeclear);
                        } catch { /* sin acceso al documento */ }
                    }}
                />
            </div>
        </div>
    );
}
