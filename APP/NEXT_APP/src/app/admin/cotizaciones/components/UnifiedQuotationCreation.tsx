"use client";

import { useState, useTransition } from "react";
import { Plus, Search, ArrowRight, X, Code, Globe, Lock, Loader2, Copy, Check, ExternalLink, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { createInitialQuotationData, QuotationData } from "../../../../modules/quotations/types";
import QuotationWorkspace from "../quotation-workspace";
import { createQuotationAction } from "../[clientId]/actions";
import { toast } from "sonner";

interface Client {
    id: string;
    name: string;
    email: string | null;
    slug: string;
}

interface Props {
    clients?: Client[]; // Optional if pre-selected client
    preSelectedClient?: Client; // If opened from client page
    onClose: () => void;
    onSuccess?: () => void;
}

type Step = "select-client" | "choose-mode" | "workspace" | "code-embed";

export default function UnifiedQuotationCreation({ clients = [], preSelectedClient, onClose, onSuccess }: Props) {
    const router = useRouter();
    const [step, setStep] = useState<Step>(preSelectedClient ? "choose-mode" : "select-client");
    const [selectedClient, setSelectedClient] = useState<Client | null>(preSelectedClient || null);

    // Search state for client selection
    const [searchTerm, setSearchTerm] = useState("");

    // Initial Data State for Workspace
    const [initialData, setInitialData] = useState<QuotationData>(createInitialQuotationData());

    // Filter clients
    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleClientSelect = (client: Client) => {
        setSelectedClient(client);
        setInitialData(prev => ({
            ...prev,
            clientName: client.name,
            clientEmail: client.email || ""
        }));
        setStep("choose-mode");
    };

    const handleCreateClient = () => {
        router.push("/admin/clientes");
    };

    // --- CODE EMBEDDER LOGIC (Ported from create-modal.tsx) ---
    const [accessMode, setAccessMode] = useState<"public" | "code">("code");
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<{ link: string; code?: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCodeSubmit = (formData: FormData) => {
        if (!selectedClient) return;

        formData.set("clientId", selectedClient.id);
        formData.set("accessMode", accessMode);

        startTransition(async () => {
            const res = await createQuotationAction(formData);
            if (res.success) {
                toast.success("¡Cotización creada!");
                setResult({ link: res.link!, code: res.accessCode });
                if (onSuccess) onSuccess();
            } else {
                toast.error(res.error || "Error al crear");
            }
        });
    };

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    // -------------------------------------------------------------

    // --- RENDERERS ---

    // 1. SELECT CLIENT STEP
    if (step === "select-client") {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl h-[600px]">
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white">Nueva Cotización</h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8">
                        <h3 className="text-2xl font-bold text-white mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Selecciona un Cliente</h3>

                        <div className="relative mb-6 group">
                            <Search className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-lg transition-all"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {filteredClients.map(client => (
                                <button
                                    key={client.id}
                                    onClick={() => handleClientSelect(client)}
                                    className="w-full text-left p-4 rounded-xl bg-slate-800/30 hover:bg-indigo-600/10 border border-transparent hover:border-indigo-500/30 transition-all group flex items-center justify-between"
                                >
                                    <div>
                                        <p className="font-semibold text-white group-hover:text-indigo-300 transition-colors text-lg">{client.name}</p>
                                        <p className="text-sm text-slate-500">{client.email || "Sin email registrado"}</p>
                                    </div>
                                    <div className="bg-slate-800 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
                                        <ArrowRight size={16} className="text-indigo-400" />
                                    </div>
                                </button>
                            ))}

                            {filteredClients.length === 0 && (
                                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
                                    <p className="text-slate-500 mb-4">No se encontraron clientes</p>
                                    <button
                                        onClick={handleCreateClient}
                                        className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center justify-center gap-2 mx-auto"
                                    >
                                        <Plus size={16} /> Crear nuevo cliente
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. CHOOSE MODE STEP
    if (step === "choose-mode" && selectedClient) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-8 shadow-2xl relative overflow-hidden">

                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-colors">
                        <X size={24} />
                    </button>

                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-white mb-2">Crear Nueva Cotización</h2>
                        <p className="text-slate-400 text-lg">Para: <span className="text-indigo-400 font-semibold">{selectedClient.name}</span></p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                        {/* Option 1: Builder */}
                        <button
                            onClick={() => setStep("workspace")}
                            className="group relative bg-slate-800/50 hover:bg-indigo-600/10 border border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col items-center text-center"
                        >
                            <div className="w-20 h-20 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Sparkles className="w-10 h-10 text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-300">Constructor Visual</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Usa nuestro editor inteligente con <strong>Asistencia IA</strong> para crear cotizaciones profesionales paso a paso. Ideal si no tienes el HTML listo.
                            </p>
                        </button>

                        {/* Option 2: Code Embedder */}
                        <button
                            onClick={() => setStep("code-embed")}
                            className="group relative bg-slate-800/50 hover:bg-emerald-600/10 border border-slate-700 hover:border-emerald-500 rounded-2xl p-8 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col items-center text-center"
                        >
                            <div className="w-20 h-20 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Code className="w-10 h-10 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-300">Incrustar Código HTML</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                ¿Ya tienes tu diseño listo? Pega directamente tu código <strong>HTML/Tailwind</strong> y publícalo al instante.
                            </p>
                        </button>
                    </div>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => preSelectedClient ? onClose() : setStep("select-client")}
                            className="text-slate-500 hover:text-white text-sm transition-colors"
                        >
                            Volver atrás
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 3A. WORKSPACE STEP (Builder)
    if (step === "workspace" && selectedClient) {
        return (
            <div className="fixed inset-0 bg-black z-50 animate-in fade-in duration-300">
                <QuotationWorkspace
                    initialData={initialData}
                    clientId={selectedClient.id}
                    clientName={selectedClient.name}
                    onClose={onClose}
                />
            </div>
        );
    }

    // 3B. CODE EMBED STEP (Only Embedder Form)
    if (step === "code-embed" && selectedClient) {

        // SUCCESS VIEW (Same as modal)
        if (result) {
            return (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-green-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">¡Cotización Publicada!</h2>
                            <p className="text-slate-400">Comparte el enlace con tu cliente</p>
                        </div>

                        {/* Link */}
                        <div className="bg-slate-800 rounded-xl p-4">
                            <p className="text-xs text-slate-500 mb-2">Enlace de acceso:</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-indigo-400 text-sm break-all">{result.link}</code>
                                <button
                                    onClick={() => copyToClipboard(result.link)}
                                    className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg transition-colors"
                                >
                                    {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                </button>
                                <a
                                    href={result.link}
                                    target="_blank"
                                    className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg transition-colors"
                                >
                                    <ExternalLink size={16} />
                                </a>
                            </div>
                        </div>

                        {/* Code (if private) */}
                        {result.code && (
                            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-center">
                                <p className="text-xs text-orange-400 mb-1">Código de acceso (compartir con cliente):</p>
                                <code className="text-2xl font-bold text-white">{result.code}</code>
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-medium transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-800">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Code className="text-emerald-400" />
                                Incrustar Código HTML
                            </h2>
                            <p className="text-sm text-slate-400">Para: {selectedClient.name}</p>
                        </div>
                        <button onClick={() => setStep("choose-mode")} className="text-slate-400 hover:text-white p-2 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Form */}
                    <form action={handleCodeSubmit} className="p-6 space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Folio (ID único)</label>
                                <input
                                    name="folio"
                                    required
                                    placeholder="WEB-2026-001"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Nombre del Proyecto</label>
                                <input
                                    name="projectName"
                                    required
                                    placeholder="Plataforma Web"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>



                        {/* Access Mode */}
                        <div>
                            <label className="block text-sm text-slate-400 mb-3">Modo de Acceso</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setAccessMode("public")}
                                    className={`p-4 rounded-xl border-2 transition-all text-left ${accessMode === "public"
                                        ? "border-green-500 bg-green-500/10"
                                        : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                                        }`}
                                >
                                    <Globe className={`w-5 h-5 mb-2 ${accessMode === "public" ? "text-green-400" : "text-slate-400"}`} />
                                    <p className="font-semibold text-white text-sm">Público</p>
                                    <p className="text-xs text-slate-400">Sin código requerido</p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAccessMode("code")}
                                    className={`p-4 rounded-xl border-2 transition-all text-left ${accessMode === "code"
                                        ? "border-indigo-500 bg-indigo-500/10"
                                        : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                                        }`}
                                >
                                    <Lock className={`w-5 h-5 mb-2 ${accessMode === "code" ? "text-indigo-400" : "text-slate-400"}`} />
                                    <p className="font-semibold text-white text-sm">Privado</p>
                                    <p className="text-xs text-slate-400">Requiere código</p>
                                </button>
                            </div>
                        </div>

                        {/* Code Duration (only for private) */}
                        {accessMode === "code" && (
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Validez del Código</label>
                                <select
                                    name="codeDuration"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="7d">1 Semana (7 días)</option>
                                    <option value="15d">15 Días</option>
                                    <option value="30d">1 Mes (30 días)</option>
                                    <option value="indefinite">Indefinido</option>
                                </select>
                            </div>
                        )}

                        {/* HTML Content */}
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Código HTML de la Cotización</label>
                            <textarea
                                name="htmlContent"
                                required
                                rows={12}
                                placeholder="<!DOCTYPE html>&#10;<html>&#10;  <head>...</head>&#10;  <body>...</body>&#10;</html>"
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs font-mono text-green-400 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                Pega el código HTML completo. CDNs como Tailwind CSS están permitidos.
                            </p>
                        </div>

                        {/* Submit */}
                        <div className="flex gap-3 pt-4 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => setStep("choose-mode")}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-medium transition-colors"
                            >
                                Volver
                            </button>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Creando...
                                    </>
                                ) : (
                                    "Publicar Cotización"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return null;
}
