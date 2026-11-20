"use client";

import { useState, useTransition } from "react";
import { Lock, Globe, Loader2, Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { copiarTexto } from "@/lib/tools/copiar";
import { BOTON, BOTON_ICONO, BOTON_MINI, BOTON_SEC, CAMPO, ETIQUETA, H1, OPCION, TITULO_SECCION } from "@/modules/quotations/estilos";
import { createQuotationAction } from "./[clientId]/actions";
import type { QuotationData, QuotationDraft } from "../../../modules/quotations/types";

/** Lo que manda el constructor: el borrador más sus listas de honorarios y costos. */
type DraftConstructor = QuotationDraft & Partial<Pick<QuotationData, "providerCosts" | "professionalFees">>;

interface Props {
    clientId: string;
    draft: DraftConstructor;
    onBack: () => void;
    onSuccess: () => void;
    onPublished?: () => void;
}

export default function QuotationFinalizer({ clientId, draft, onBack, onSuccess, onPublished }: Props) {
    const [accessMode, setAccessMode] = useState<"public" | "code">("code");
    const [codeDuration, setCodeDuration] = useState("15d");
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<{ link: string; code?: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [codigoCopiado, setCodigoCopiado] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // If result exists, show success view
    if (result) {
        return (
            <div className="py-6">
                <Check className="mb-3 text-emerald-400" size={28} aria-hidden="true" />
                <h2 className={H1}>Propuesta publicada</h2>
                <p className="mt-1 max-w-md text-[var(--mut)]">Comparte el enlace con tu cliente.</p>

                <div className="mt-8 max-w-md space-y-5">
                    <div>
                        <p className="mb-1.5 text-sm font-medium text-[var(--txt)]">Enlace</p>
                        <div className="flex items-center gap-2 rounded-lg border border-[var(--linea-2)] bg-[var(--fondo-2)] py-1 pl-3 pr-1">
                            <code className="min-w-0 flex-1 select-all break-all font-mono text-sm text-[var(--acento)]">{result.link}</code>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!(await copiarTexto(result.link))) { setError("No se pudo copiar: selecciónalo y cópialo a mano."); return; }
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                    toast.success("Enlace copiado");
                                }}
                                aria-label={copied ? "Enlace copiado" : "Copiar enlace"}
                                className={BOTON_ICONO}
                            >
                                {copied ? <Check size={16} aria-hidden="true" className="text-emerald-400" /> : <Copy size={16} aria-hidden="true" />}
                            </button>
                            <a href={result.link} target="_blank" rel="noreferrer" aria-label="Abrir la propuesta (se abre en otra pestaña)" className={BOTON_ICONO}>
                                <ExternalLink size={16} aria-hidden="true" />
                            </a>
                        </div>
                    </div>

                    {result.code && (
                        <div className="rounded-lg bg-amber-500/10 p-4 text-center">
                            <p className="text-sm text-[var(--txt)]">Código de acceso para el cliente</p>
                            <code className="mt-1 block select-all break-all font-mono text-3xl font-bold text-[var(--txt)]">{result.code}</code>
                            <p className="mt-1 text-xs text-[var(--mut)]">Se muestra una sola vez. Si lo pierdes, genera otro en «Acceso».</p>
                            <div className="mt-3 flex flex-wrap justify-center gap-2">
                                <button type="button" className={BOTON_MINI}
                                    onClick={async () => {
                                        if (!(await copiarTexto(result.code!))) { setError("No se pudo copiar: selecciónalo y cópialo a mano."); return; }
                                        setCodigoCopiado(true);
                                        toast.success("Código copiado");
                                    }}>
                                    {codigoCopiado ? <Check size={12} aria-hidden="true" className="text-emerald-400" /> : <Copy size={12} aria-hidden="true" />}
                                    {codigoCopiado ? "Código copiado" : "Copiar código"}
                                </button>
                                <button type="button" className={BOTON_MINI}
                                    onClick={async () => {
                                        if (!(await copiarTexto(`${result.link}\nCódigo de acceso: ${result.code}`))) { setError("No se pudo copiar: selecciónalo y cópialo a mano."); return; }
                                        toast.success("Enlace y código copiados para enviarlos");
                                    }}>
                                    <Copy size={12} aria-hidden="true" /> Copiar enlace y código
                                </button>
                            </div>
                        </div>
                    )}

                    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

                    <button type="button" onClick={onSuccess} className={`${BOTON_SEC} w-full`}>
                        Volver a Propuestas
                    </button>
                </div>
            </div>
        );
    }

    const handlePublish = () => {
        const formData = new FormData();
        formData.set("clientId", clientId);
        // «NUEVO» es el marcador del borrador, no un folio: el folio es único y la segunda propuesta fallaba.
        formData.set("folio", draft.folio && draft.folio !== "NUEVO" ? draft.folio : `QT-${Date.now().toString().slice(-6)}`);
        formData.set("projectName", draft.projectName);
        formData.set("total", draft.total.toString());
        formData.set("accessMode", accessMode);
        formData.set("codeDuration", codeDuration);

        // Generate HTML Content from Draft if not present
        // In a real app, this would be a proper template render.
        // For now, simple fallback if AI didn't generate full HTML.
        const htmlContent = draft.htmlContent || generateSimpleHtml(draft);
        formData.set("htmlContent", htmlContent);

        setError(null);
        startTransition(async () => {
            const res = await createQuotationAction(formData);
            if (res.success) {
                setResult({ link: res.link!, code: res.accessCode });
                onPublished?.();
                toast.success("Propuesta publicada");
            } else {
                setError(res.error || "No se pudo publicar la propuesta");
            }
        });
    };

    return (
        <div className="mx-auto flex max-w-2xl flex-col">
            <h2 className={H1}>Revisar y publicar</h2>
            <p className="mt-1 text-[var(--mut)]">Elige quién puede verla antes de compartirla.</p>

            <div className="mt-8 space-y-8">
                <section aria-labelledby="finalizar-resumen">
                    <h3 id="finalizar-resumen" className={`${TITULO_SECCION} mb-2`}>Resumen</h3>
                    <dl className="grid grid-cols-2 gap-4 border-y border-[var(--linea)] py-4">
                        <div>
                            <dt className="text-xs text-[var(--mut)]">Proyecto</dt>
                            <dd className="font-medium text-[var(--txt)]">{draft.projectName || "Sin nombre"}</dd>
                        </div>
                        <div className="text-right">
                            <dt className="text-xs text-[var(--mut)]">Total</dt>
                            <dd className="text-lg font-bold tabular-nums text-[var(--txt)]">${draft.total.toLocaleString("es-CL")}</dd>
                        </div>
                    </dl>
                </section>

                <section aria-labelledby="finalizar-acceso">
                    <h3 id="finalizar-acceso" className={`${TITULO_SECCION} mb-3`}>Acceso</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <button type="button" onClick={() => setAccessMode("public")} aria-pressed={accessMode === "public"} className={`${OPCION} p-4`}>
                            <Globe size={18} aria-hidden="true" className={`mb-2 ${accessMode === "public" ? "text-[var(--acento)]" : "text-[var(--mut)]"}`} />
                            <span className="block font-semibold text-[var(--txt)]">Pública</span>
                            <span className="mt-0.5 block text-xs text-[var(--mut)]">Cualquiera con el enlace puede verla.</span>
                        </button>
                        <button type="button" onClick={() => setAccessMode("code")} aria-pressed={accessMode === "code"} className={`${OPCION} p-4`}>
                            <Lock size={18} aria-hidden="true" className={`mb-2 ${accessMode === "code" ? "text-[var(--acento)]" : "text-[var(--mut)]"}`} />
                            <span className="block font-semibold text-[var(--txt)]">Privada</span>
                            <span className="mt-0.5 block text-xs text-[var(--mut)]">Pide un código de acceso único.</span>
                        </button>
                    </div>

                    {accessMode === "code" && (
                        <div className="mt-4">
                            <label htmlFor="finalizar-validez" className={ETIQUETA}>Vencimiento del código</label>
                            <select
                                id="finalizar-validez"
                                value={codeDuration}
                                onChange={(e) => setCodeDuration(e.target.value)}
                                className={CAMPO}
                            >
                                <option value="7d">1 semana (7 días)</option>
                                <option value="15d">15 días (recomendado)</option>
                                <option value="30d">1 mes (30 días)</option>
                                <option value="indefinite">Sin vencimiento</option>
                            </select>
                        </div>
                    )}
                </section>

                {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

                <div className="flex gap-2 border-t border-[var(--linea)] pt-4">
                    <button type="button" onClick={onBack} disabled={isPending} className={`${BOTON_SEC} flex-1`}>
                        Seguir editando
                    </button>
                    <button type="button" onClick={handlePublish} disabled={isPending} className={`${BOTON} flex-[2]`}>
                        {isPending ? (
                            <>
                                <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                Publicando…
                            </>
                        ) : (
                            "Publicar propuesta"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

/** Texto del usuario dentro del HTML: sin esto, un «<» en una descripción rompía la tabla. */
const html = (t: unknown) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clp = (n: number) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;

/**
 * HTML que se publica cuando la propuesta viene del constructor visual. Antes solo listaba `items` (que el formulario
 * no llena): los honorarios y los costos de terceros que se ven en la vista previa no llegaban al cliente.
 */
function generateSimpleHtml(draft: DraftConstructor): string {
    const fila = (descripcion: string, detalle: string, cantidad: number, unitario: number, total: number) => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${html(descripcion)}${detalle ? `<br><span style="color: #64748b; font-size: 13px;">${html(detalle)}</span>` : ""}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${cantidad}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${clp(unitario)}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${clp(total)}</td>
        </tr>`;
    const itemsRows = [
        ...(draft.professionalFees ?? []).map((f) => fila(f.title, f.description, 1, f.price, f.price)),
        ...(draft.providerCosts ?? []).map((c) => fila(c.name, [c.provider, c.isRecurring ? (c.period === "yearly" ? "anual" : "mensual") : ""].filter(Boolean).join(", "), 1, c.costMin, c.costMin)),
        ...draft.items.map((item) => {
            const cantidad = item.quantity ?? 1;
            const total = item.total || item.price || (item.unitPrice ?? 0) * cantidad;
            return fila(item.title || item.description, item.title ? item.description : "", cantidad, item.unitPrice ?? total, total);
        }),
    ].join("");

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    </head>
    <body style="font-family: 'Inter', sans-serif; background-color: #f8fafc; color: #1e293b; padding: 40px;">
        <div style="max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <div style="text-align: center; margin-bottom: 40px;">
                <h1 style="font-size: 24px; font-weight: bold; color: #0f172a; margin-bottom: 8px;">Presupuesto: ${html(draft.projectName)}</h1>
                <p style="color: #64748b;">${html(draft.clientName)}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
                <thead>
                    <tr style="background-color: #f1f5f9; text-align: left;">
                        <th style="padding: 12px; border-radius: 8px 0 0 8px;">Descripción</th>
                        <th style="padding: 12px; text-align: center;">Cant.</th>
                        <th style="padding: 12px; text-align: right;">Precio Unit.</th>
                        <th style="padding: 12px; border-radius: 0 8px 8px 0; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" style="padding: 20px 12px; text-align: right; font-weight: bold; color: #64748b;">Total Estimado:</td>
                        <td style="padding: 20px 12px; text-align: right; font-size: 20px; font-weight: bold; color: #0f172a;">${clp(draft.total)}</td>
                    </tr>
                </tfoot>
            </table>

            <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 14px;">
                <p>Este documento es una cotización preliminar sujeta a disponibilidad.</p>
            </div>
        </div>
    </body>
    </html>
    `;
}
