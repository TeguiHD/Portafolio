"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import SignatureCanvas, { type SignatureCanvasRef } from "@/components/ui/SignatureCanvas";

/**
 * Public Client Approval Page
 * 
 * Accessed via /aprobar?token=... — no auth required.
 * Client can view the document, sign (draw/typed), and submit.
 * 
 * Security: token is SHA-256 hashed on server, document integrity verified.
 */

interface ApprovalData {
    type: string;
    status: string;
    documentHash: string;
    clientName: string;
    clientCompany: string | null;
    quotation: { projectName: string; total: number; folio: string } | null;
    contract: { title: string; contractNumber: string; totalAmount: number } | null;
    sentAt: string;
    expiresAt: string | null;
}

export default function ApprovalClient() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [approval, setApproval] = useState<ApprovalData | null>(null);
    const [alreadyProcessed, setAlreadyProcessed] = useState(false);
    const [processedInfo, setProcessedInfo] = useState<{ status: string; signedAt: string | null } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Signing form states
    const [signerName, setSignerName] = useState("");
    const [signerRut, setSignerRut] = useState("");
    const [signerEmail, setSignerEmail] = useState("");
    const [comments, setComments] = useState("");
    const [signatureMethod, setSignatureMethod] = useState<"DRAWN" | "TYPED" | "BOTH">("DRAWN");
    const [submitting, setSubmitting] = useState(false);
    const [signResult, setSignResult] = useState<{ success: boolean; signedAt: string; documentIntegrity: string } | null>(null);

    const canvasRef = useRef<SignatureCanvasRef>(null);

    // Fetch approval data
    useEffect(() => {
        if (!token) {
            setError("Token de acceso no proporcionado");
            setLoading(false);
            return;
        }

        fetch(`/api/crm/approvals?token=${encodeURIComponent(token)}`)
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) {
                    setError(data.error || "Error al cargar la aprobación");
                    return;
                }
                if (data.alreadyProcessed) {
                    setAlreadyProcessed(true);
                    setProcessedInfo(data.approval);
                } else {
                    setApproval(data.approval);
                }
            })
            .catch(() => setError("Error de conexión"))
            .finally(() => setLoading(false));
    }, [token]);

    const handleSubmit = useCallback(async () => {
        if (!token || !approval) return;
        if (!signerName.trim()) return;

        if (signatureMethod === "DRAWN" || signatureMethod === "BOTH") {
            if (canvasRef.current?.isEmpty()) return;
        }

        setSubmitting(true);
        try {
            // Build document content for hash verification
            const docContent = JSON.stringify({
                type: approval.type,
                documentHash: approval.documentHash,
                quotation: approval.quotation,
                contract: approval.contract,
            });

            const res = await fetch("/api/crm/approvals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "sign",
                    token,
                    signerName: signerName.trim(),
                    signerRut: signerRut.trim() || undefined,
                    signerEmail: signerEmail.trim() || undefined,
                    signatureImage: canvasRef.current?.toDataURL() || undefined,
                    signatureMethod,
                    clientComments: comments.trim() || undefined,
                    documentContent: docContent,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Error al firmar");
                return;
            }
            setSignResult(data);
        } catch {
            setError("Error de conexión al firmar");
        } finally {
            setSubmitting(false);
        }
    }, [token, approval, signerName, signerRut, signerEmail, comments, signatureMethod]);

    // Format number as CLP
    const fmtCLP = (n: number) =>
        new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

    // ─── Loading ───────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050a15]">
                <div className="w-8 h-8 border-t-2 border-accent-1 border-solid rounded-full animate-spin" />
            </div>
        );
    }

    // ─── Error State ───────────────────────────────────────────────
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050a15] p-6">
                <div className="max-w-md w-full p-8 rounded-3xl bg-[#0c1224] border border-red-500/20 text-center">
                    <span className="text-5xl block mb-4">⚠️</span>
                    <h1 className="text-xl font-bold text-white mb-2">Error</h1>
                    <p className="text-neutral-400">{error}</p>
                </div>
            </div>
        );
    }

    // ─── Already Processed ─────────────────────────────────────────
    if (alreadyProcessed && processedInfo) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050a15] p-6">
                <div className="max-w-md w-full p-8 rounded-3xl bg-[#0c1224] border border-white/10 text-center space-y-4">
                    <span className="text-5xl block">
                        {processedInfo.status === "SIGNED" ? "✅" : processedInfo.status === "REJECTED" ? "❌" : "⏳"}
                    </span>
                    <h1 className="text-xl font-bold text-white">
                        {processedInfo.status === "SIGNED"
                            ? "Documento Firmado"
                            : processedInfo.status === "REJECTED"
                            ? "Documento Rechazado"
                            : "Documento Procesado"}
                    </h1>
                    {processedInfo.signedAt && (
                        <p className="text-sm text-neutral-400">
                            Firmado el {new Date(processedInfo.signedAt).toLocaleDateString("es-CL", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // ─── Success State ─────────────────────────────────────────────
    if (signResult) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050a15] p-6">
                <div className="max-w-md w-full p-8 rounded-3xl bg-[#0c1224] border border-emerald-500/20 text-center space-y-4">
                    <span className="text-5xl block">✅</span>
                    <h1 className="text-xl font-bold text-white">Firma Registrada Exitosamente</h1>
                    <p className="text-sm text-neutral-400">
                        Firmado el{" "}
                        {new Date(signResult.signedAt).toLocaleDateString("es-CL", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </p>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
                        signResult.documentIntegrity === "VERIFIED"
                            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                    }`}>
                        {signResult.documentIntegrity === "VERIFIED" ? "🔒" : "⚠️"}
                        Integridad: {signResult.documentIntegrity === "VERIFIED" ? "Verificada" : "Documento modificado"}
                    </div>
                    <p className="text-xs text-neutral-500 mt-4">
                        Puede cerrar esta página. Se ha guardado un registro completo de su firma.
                    </p>
                </div>
            </div>
        );
    }

    // ─── Signing Form ──────────────────────────────────────────────
    if (!approval) return null;

    const docTitle = approval.contract?.title || approval.quotation?.projectName || "Documento";
    const docNumber = approval.contract?.contractNumber || approval.quotation?.folio || "";
    const docAmount = approval.contract?.totalAmount || approval.quotation?.total || 0;

    return (
        <div className="min-h-screen bg-[#050a15] py-8 px-4">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-extrabold text-white">Aprobación de Documento</h1>
                    <p className="text-sm text-neutral-400">
                        {approval.clientName}
                        {approval.clientCompany && ` · ${approval.clientCompany}`}
                    </p>
                </div>

                {/* Document Summary */}
                <div className="p-6 rounded-2xl bg-[#0c1224] border border-white/10 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs text-neutral-500 uppercase tracking-wider font-bold mb-1">
                                {approval.type === "QUOTATION" ? "Propuesta Comercial" : approval.type === "CONTRACT" ? "Contrato" : "Documento"}
                            </p>
                            <h2 className="text-lg font-bold text-white">{docTitle}</h2>
                            {docNumber && <p className="text-xs text-neutral-500 font-mono mt-0.5">{docNumber}</p>}
                        </div>
                        {docAmount > 0 && (
                            <div className="text-right shrink-0">
                                <p className="text-xl font-extrabold text-white">{fmtCLP(docAmount)}</p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-neutral-500 pt-3 border-t border-white/5">
                        <span>📅 Enviado: {new Date(approval.sentAt).toLocaleDateString("es-CL")}</span>
                        {approval.expiresAt && (
                            <span>⏰ Expira: {new Date(approval.expiresAt).toLocaleDateString("es-CL")}</span>
                        )}
                    </div>
                </div>

                {/* Signer Info */}
                <div className="p-6 rounded-2xl bg-[#0c1224] border border-white/10 space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Datos del Firmante</h3>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1 font-medium">Nombre completo *</label>
                            <input
                                type="text"
                                value={signerName}
                                onChange={(e) => setSignerName(e.target.value)}
                                placeholder="Juan Pérez González"
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-neutral-600 focus:border-accent-1/50 focus:outline-none transition-colors"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-neutral-400 mb-1 font-medium">RUT</label>
                                <input
                                    type="text"
                                    value={signerRut}
                                    onChange={(e) => setSignerRut(e.target.value)}
                                    placeholder="12.345.678-9"
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-neutral-600 focus:border-accent-1/50 focus:outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-400 mb-1 font-medium">Email</label>
                                <input
                                    type="email"
                                    value={signerEmail}
                                    onChange={(e) => setSignerEmail(e.target.value)}
                                    placeholder="correo@ejemplo.cl"
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-neutral-600 focus:border-accent-1/50 focus:outline-none transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Signature */}
                <div className="p-6 rounded-2xl bg-[#0c1224] border border-white/10 space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Firma Digital</h3>

                    {/* Method selector */}
                    <div className="flex gap-2">
                        {(["DRAWN", "TYPED", "BOTH"] as const).map((method) => (
                            <button
                                key={method}
                                onClick={() => setSignatureMethod(method)}
                                className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                                    signatureMethod === method
                                        ? "bg-accent-1/10 border-accent-1/30 text-accent-1"
                                        : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10"
                                }`}
                            >
                                {method === "DRAWN" ? "✍️ Dibujar" : method === "TYPED" ? "⌨️ Escribir" : "🔏 Ambas"}
                            </button>
                        ))}
                    </div>

                    {/* Canvas for drawn signature */}
                    {(signatureMethod === "DRAWN" || signatureMethod === "BOTH") && (
                        <SignatureCanvas
                            ref={canvasRef}
                            height={180}
                            penColor="#ffffff"
                            penWidth={2}
                        />
                    )}

                    {/* Typed signature info */}
                    {(signatureMethod === "TYPED" || signatureMethod === "BOTH") && (
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                            <p className="text-sm text-neutral-400">
                                Al enviar, su nombre completo{signerRut ? " y RUT" : ""} serán registrados como firma electrónica
                            </p>
                            {signerName && (
                                <p className="text-xl font-bold text-white mt-3 italic font-serif">
                                    {signerName}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Comments */}
                <div className="p-6 rounded-2xl bg-[#0c1224] border border-white/10 space-y-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Comentarios (opcional)</h3>
                    <textarea
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        rows={3}
                        placeholder="Observaciones o comentarios adicionales..."
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-neutral-600 focus:border-accent-1/50 focus:outline-none transition-colors resize-none"
                    />
                </div>

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={submitting || !signerName.trim()}
                    className="w-full py-4 rounded-2xl bg-accent-1 text-white font-bold text-base transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-accent-1/20"
                >
                    {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-5 h-5 border-t-2 border-white border-solid rounded-full animate-spin" />
                            Procesando...
                        </span>
                    ) : (
                        "✍️ Firmar y Aprobar Documento"
                    )}
                </button>

                {/* Security Notice */}
                <div className="text-center space-y-1 pb-8">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-medium">
                        🔒 Firma electrónica segura
                    </p>
                    <p className="text-[10px] text-neutral-600">
                        Se registra IP, navegador y marca temporal para verificación de no repudio (NIST SP 800-53)
                    </p>
                </div>
            </div>
        </div>
    );
}
