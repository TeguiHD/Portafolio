"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/components/ui/Toast";
import type { Experience } from "./ExperienceSection";
import type { Project } from "./ProjectsSection";
import type { CvData } from "../utils/latex-templates-enhanced";

// Only experience and projects supported for AI chat
type SupportedSection = "experience" | "projects";

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    action?: {
        type: "add_experience" | "add_project" | "update_draft" | "improve_text" | "ask_details" | "conversation" | "error";
        data?: Record<string, unknown>;
        applied?: boolean;
    };
}

// Draft experience/project state
interface DraftExperience {
    company?: string;
    position?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    technologies?: string[];
    achievements?: string[];
}

interface DraftProject {
    name?: string;
    description?: string;
    technologies?: string[];
    url?: string;
    highlights?: string[];
}

interface CvAIChatProps {
    data: CvData;
    activeSection: SupportedSection;
    onAddExperience: (exp: Experience) => void;
    onAddProject: (project: Project) => void;
    hideHeader?: boolean;
}

// Welcome messages for supported sections
const getWelcomeMessage = (section: SupportedSection): ChatMessage => {
    const messages: Record<SupportedSection, string> = {
        experience: "¡Hola! 👋 Soy tu asistente para **experiencias laborales**.\n\nCuéntame sobre tu trabajo y yo te ayudaré a:\n• Redactar logros cuantificables\n• Pulir las descripciones\n• Usar verbos de acción efectivos\n\n**Tú pones la info, yo la mejoro.** ¿Qué experiencia quieres agregar?",
        projects: "¡Hola! 👋 Soy tu asistente para **proyectos**.\n\nDescríbeme tu proyecto y yo te ayudaré a:\n• Mejorar la descripción\n• Sugerir tecnologías relacionadas\n• Destacar el impacto\n\n**Tú pones la info, yo la pulo.** ¿Qué proyecto quieres agregar?",
    };

    return {
        id: "welcome",
        role: "assistant",
        content: messages[section],
    };
};

// Quick actions for supported sections
const getQuickActions = (section: SupportedSection) => {
    const actions: Record<SupportedSection, Array<{ label: string; prompt: string }>> = {
        experience: [
            { label: "💼 Full Stack Developer", prompt: "Trabajé como desarrollador full stack en una startup de tecnología" },
            { label: "👔 Tech Lead", prompt: "Fui tech lead liderando un equipo de desarrollo de 5 personas" },
            { label: "🚀 Freelance", prompt: "Trabajo como desarrollador freelance con varios clientes" },
        ],
        projects: [
            { label: "🛒 E-commerce", prompt: "Construí un e-commerce con Next.js y pasarela de pagos" },
            { label: "📊 Dashboard", prompt: "Desarrollé un dashboard de analytics con gráficos interactivos" },
            { label: "🤖 App con IA", prompt: "Creé una aplicación que integra inteligencia artificial" },
        ],
    };

    return actions[section];
};

// Section icons
const getSectionIcon = (section: SupportedSection): string => {
    const icons: Record<SupportedSection, string> = {
        experience: "💼",
        projects: "📁",
    };
    return icons[section];
};

// Section labels
const getSectionLabel = (section: SupportedSection): string => {
    const labels: Record<SupportedSection, string> = {
        experience: "Asistente de experiencias",
        projects: "Asistente de proyectos",
    };
    return labels[section];
};

export function CvAIChat({
    data,
    activeSection,
    onAddExperience,
    onAddProject,
    hideHeader = false,
}: CvAIChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([getWelcomeMessage(activeSection)]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [draftExperience, setDraftExperience] = useState<DraftExperience>({});
    const [draftProject, setDraftProject] = useState<DraftProject>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const toast = useToast();

    // Reset messages and draft when section changes
    useEffect(() => {
        setMessages([getWelcomeMessage(activeSection)]);
        setDraftExperience({});
        setDraftProject({});
    }, [activeSection]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = useCallback(async (text?: string) => {
        const message = text || input.trim();
        if (!message || isLoading) return;

        const userMessage: ChatMessage = {
            id: uuidv4(),
            role: "user",
            content: message,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const conversationHistory = messages
                .filter(m => m.id !== "welcome")
                .map(m => ({
                    role: m.role,
                    content: m.content,
                }));

            const response = await fetch("/api/cv/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message,
                    conversationHistory,
                    context: {
                        hasExperience: data.experience.length > 0,
                        hasEducation: data.education.length > 0,
                        hasSkills: data.skills.length > 0,
                        hasProjects: data.projects.length > 0,
                        hasCertifications: (data.certifications?.length || 0) > 0,
                        hasLanguages: (data.languages?.length || 0) > 0,
                        skillCategories: data.skills.map((s) => s.category),
                        activeSection,
                    },
                }),
            });

            const result = await response.json();

            if (response.status === 429) {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: uuidv4(),
                        role: "assistant",
                        content: "⏳ Has enviado muchas solicitudes. Espera un momento antes de continuar.",
                    },
                ]);
                return;
            }

            if (result.success) {
                if (result.action === "update_draft") {
                    // Update draft state with new fields
                    if (activeSection === "experience") {
                        setDraftExperience(prev => ({
                            ...prev,
                            ...(result.data?.company && { company: result.data.company as string }),
                            ...(result.data?.position && { position: result.data.position as string }),
                            ...(result.data?.description && { description: result.data.description as string }),
                            ...(result.data?.startDate && { startDate: result.data.startDate as string }),
                            ...(result.data?.endDate && { endDate: result.data.endDate as string }),
                            ...(result.data?.current !== undefined && { current: result.data.current as boolean }),
                            ...(result.data?.technologies && { technologies: result.data.technologies as string[] }),
                            ...(result.data?.achievements && { achievements: result.data.achievements as string[] }),
                        }));
                    } else {
                        setDraftProject(prev => ({
                            ...prev,
                            ...(result.data?.name && { name: result.data.name as string }),
                            ...(result.data?.description && { description: result.data.description as string }),
                            ...(result.data?.technologies && { technologies: result.data.technologies as string[] }),
                            ...(result.data?.url && { url: result.data.url as string }),
                            ...(result.data?.highlights && { highlights: result.data.highlights as string[] }),
                        }));
                    }
                    const assistantMessage: ChatMessage = {
                        id: uuidv4(),
                        role: "assistant",
                        content: result.message || "Guardado. ¿Qué más puedes contarme?",
                        action: {
                            type: "update_draft",
                            data: result.data,
                        },
                    };
                    setMessages((prev) => [...prev, assistantMessage]);
                } else if (result.action === "ask_details" || result.action === "conversation") {
                    const assistantMessage: ChatMessage = {
                        id: uuidv4(),
                        role: "assistant",
                        content: result.message || "Cuéntame más...",
                    };
                    setMessages((prev) => [...prev, assistantMessage]);
                } else if (
                    result.action === "add_experience" ||
                    result.action === "add_project"
                ) {
                    // Clear draft when adding final result
                    if (result.action === "add_experience") {
                        setDraftExperience({});
                    } else {
                        setDraftProject({});
                    }
                    const assistantMessage: ChatMessage = {
                        id: uuidv4(),
                        role: "assistant",
                        content: result.message || "¡Listo! Basándome en lo que me contaste, preparé esto:",
                        action: {
                            type: result.action,
                            data: result.data,
                            applied: false,
                        },
                    };
                    setMessages((prev) => [...prev, assistantMessage]);
                } else if (result.action === "error") {
                    const errorMessage: ChatMessage = {
                        id: uuidv4(),
                        role: "assistant",
                        content: result.message || result.data?.reason as string || "No puedo ayudar con eso.",
                    };
                    setMessages((prev) => [...prev, errorMessage]);
                } else {
                    const assistantMessage: ChatMessage = {
                        id: uuidv4(),
                        role: "assistant",
                        content: result.message || "Aquí está mi sugerencia:",
                        action: result.action ? {
                            type: result.action,
                            data: result.data,
                            applied: false,
                        } : undefined,
                    };
                    setMessages((prev) => [...prev, assistantMessage]);
                }
            } else {
                const errorMessage: ChatMessage = {
                    id: uuidv4(),
                    role: "assistant",
                    content: result.error || result.message || "Lo siento, no pude procesar tu solicitud.",
                };
                setMessages((prev) => [...prev, errorMessage]);
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [
                ...prev,
                {
                    id: uuidv4(),
                    role: "assistant",
                    content: "Error de conexión. Verifica tu internet e intenta de nuevo.",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, data, activeSection, messages]);

    const handleApplyAction = useCallback((messageId: string) => {
        const message = messages.find((m) => m.id === messageId);
        if (!message?.action?.data || message.action.applied) return;

        const { type, data: actionData } = message.action;

        try {
            if (type === "add_experience") {
                const exp: Experience = {
                    id: uuidv4(),
                    company: (actionData.company as string) || "",
                    position: (actionData.position as string) || "",
                    startDate: (actionData.startDate as string) || "",
                    endDate: (actionData.endDate as string) || "",
                    current: (actionData.current as boolean) || false,
                    description: (actionData.description as string) || "",
                    achievements: (actionData.achievements as string[]) || [],
                };
                onAddExperience(exp);
                toast.success("Experiencia agregada al CV");
            } else if (type === "add_project") {
                const proj: Project = {
                    id: uuidv4(),
                    name: (actionData.name as string) || "",
                    description: (actionData.description as string) || "",
                    technologies: (actionData.technologies as string[]) || [],
                    url: (actionData.url as string) || "",
                };
                onAddProject(proj);
                toast.success("Proyecto agregado al CV");
            }

            setMessages((prev) =>
                prev.map((m) =>
                    m.id === messageId
                        ? { ...m, action: { ...m.action!, applied: true } }
                        : m
                )
            );
        } catch (err) {
            console.error("Apply action error:", err);
            toast.error("Error al aplicar la sugerencia");
        }
    }, [messages, onAddExperience, onAddProject, toast]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const renderActionPreview = (message: ChatMessage) => {
        if (!message.action?.data) return null;

        const { type, data: actionData, applied } = message.action;

        return (
            <div className={`mt-3 p-3 rounded-xl border transition-all ${applied
                ? "bg-green-500/10 border-green-500/30"
                : "bg-white/5 border-purple-500/20 hover:border-purple-500/40"}`}>

                {type === "add_experience" && (
                    <div className="text-sm space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">💼</span>
                            <div>
                                <p className="font-semibold text-white">{actionData.position as string}</p>
                                <p className="text-neutral-400 text-xs">{actionData.company as string}</p>
                            </div>
                        </div>
                    </div>
                )}

                {type === "add_project" && (
                    <div className="text-sm space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">📁</span>
                            <p className="font-semibold text-white">{actionData.name as string}</p>
                        </div>
                        <p className="text-neutral-300 text-xs line-clamp-2">{actionData.description as string}</p>
                    </div>
                )}

                {!applied ? (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleApplyAction(message.id)}
                        className="mt-3 w-full px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium hover:from-purple-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Agregar al CV
                    </motion.button>
                ) : (
                    <div className="mt-3 text-center text-sm text-green-400 flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Agregado al CV
                    </div>
                )}
            </div>
        );
    };

    const quickActions = getQuickActions(activeSection);

    return (
        <div className="flex flex-col h-full">
            {/* Header with section indicator - conditionally hidden */}
            {!hideHeader && (
                <div className="relative flex flex-col bg-gradient-to-r from-slate-800/60 to-slate-900/60 border-b border-white/10">
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 via-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                                    <span className="text-lg">{getSectionIcon(activeSection)}</span>
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-neutral-900" />
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm">Asistente CV</p>
                                <p className="text-[10px] text-teal-300">
                                    {getSectionLabel(activeSection)}
                                </p>
                            </div>
                        </div>

                        {/* Section badge */}
                        <div className="px-2 py-1 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-medium uppercase">
                            {activeSection}
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
                </div>
            )}

            {/* Draft Preview - shows fields being filled in real-time */}
            {activeSection === "experience" && Object.keys(draftExperience).length > 0 && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border-b border-teal-500/20 p-3"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-teal-400 font-medium">📝 Borrador en progreso</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                            {draftExperience.company ? (
                                <span className="text-green-400">✓</span>
                            ) : (
                                <span className="text-neutral-500">○</span>
                            )}
                            <span className={draftExperience.company ? "text-white" : "text-neutral-500"}>
                                Empresa: {draftExperience.company || "Pendiente..."}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {draftExperience.position ? (
                                <span className="text-green-400">✓</span>
                            ) : (
                                <span className="text-neutral-500">○</span>
                            )}
                            <span className={draftExperience.position ? "text-white" : "text-neutral-500"}>
                                Cargo: {draftExperience.position || "Pendiente..."}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {draftExperience.startDate ? (
                                <span className="text-green-400">✓</span>
                            ) : (
                                <span className="text-neutral-500">○</span>
                            )}
                            <span className={draftExperience.startDate ? "text-white" : "text-neutral-500"}>
                                Fechas: {draftExperience.startDate || "Pendiente..."}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {draftExperience.technologies && draftExperience.technologies.length > 0 ? (
                                <span className="text-green-400">✓</span>
                            ) : (
                                <span className="text-neutral-500">○</span>
                            )}
                            <span className={draftExperience.technologies?.length ? "text-white" : "text-neutral-500"}>
                                Tech: {draftExperience.technologies?.join(", ") || "Pendiente..."}
                            </span>
                        </div>
                    </div>
                </motion.div>
            )}

            {activeSection === "projects" && Object.keys(draftProject).length > 0 && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border-b border-teal-500/20 p-3"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-teal-400 font-medium">📝 Borrador en progreso</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                            {draftProject.name ? (
                                <span className="text-green-400">✓</span>
                            ) : (
                                <span className="text-neutral-500">○</span>
                            )}
                            <span className={draftProject.name ? "text-white" : "text-neutral-500"}>
                                Nombre: {draftProject.name || "Pendiente..."}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {draftProject.description ? (
                                <span className="text-green-400">✓</span>
                            ) : (
                                <span className="text-neutral-500">○</span>
                            )}
                            <span className={draftProject.description ? "text-white" : "text-neutral-500"}>
                                Descripción: {draftProject.description ? "✓" : "Pendiente..."}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 col-span-2">
                            {draftProject.technologies && draftProject.technologies.length > 0 ? (
                                <span className="text-green-400">✓</span>
                            ) : (
                                <span className="text-neutral-500">○</span>
                            )}
                            <span className={draftProject.technologies?.length ? "text-white" : "text-neutral-500"}>
                                Tech: {draftProject.technologies?.join(", ") || "Pendiente..."}
                            </span>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`max-w-[85%] p-3 rounded-2xl ${message.role === "user"
                                ? "bg-teal-600 text-white"
                                : "bg-white/10 text-white"
                                }`}
                        >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            {message.action && renderActionPreview(message)}
                        </div>
                    </motion.div>
                ))}

                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                    >
                        <div className="bg-white/10 p-3 rounded-2xl">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick actions - only show at start */}
            {messages.length === 1 && quickActions && quickActions.length > 0 && (
                <div className="px-4 pb-2">
                    <p className="text-[10px] text-neutral-500 mb-2 uppercase tracking-wide">Sugerencias rápidas</p>
                    <div className="flex flex-wrap gap-2">
                        {quickActions.map((action, i) => (
                            <button
                                key={i}
                                onClick={() => handleSend(action.prompt)}
                                className="px-3 py-1.5 rounded-full bg-teal-500/10 text-teal-300 text-xs hover:bg-teal-500/20 transition-colors"
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-teal-500/20">
                <div className="flex gap-2">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Describe lo que quieres agregar...`}
                        rows={1}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-teal-500/20 text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500/50 resize-none text-sm disabled:opacity-50"
                    />
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSend()}
                        disabled={isLoading || !input.trim()}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </motion.button>
                </div>

                <p className="text-[9px] text-neutral-600 mt-2 text-center">
                    🔒 No puedo modificar tu información personal
                </p>
            </div>
        </div>
    );
}

// Inline chat wrapper - NOT floating, contained within editor section
interface InlineCvChatProps {
    data: CvData;
    activeSection: SupportedSection;
    onAddExperience: (exp: Experience) => void;
    onAddProject: (project: Project) => void;
}

export function InlineCvChat({
    data,
    activeSection,
    onAddExperience,
    onAddProject,
}: InlineCvChatProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="mt-6">
            {/* Collapsible trigger */}
            <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 rounded-xl border flex items-center justify-between transition-all ${isOpen
                    ? "bg-teal-500/10 border-teal-500/30"
                    : "bg-white/5 border-white/10 hover:border-teal-500/20"
                    }`}
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                        <span className="text-sm">{getSectionIcon(activeSection)}</span>
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-medium text-white">Asistente CV</p>
                        <p className="text-[10px] text-neutral-400">{getSectionLabel(activeSection)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-teal-400">
                        {isOpen ? "Cerrar" : "Abrir asistente"}
                    </span>
                    <svg
                        className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </motion.button>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ type: "spring", damping: 30, stiffness: 400 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-2 rounded-xl border border-teal-500/20 bg-gradient-to-b from-neutral-900/50 to-neutral-950/50 overflow-hidden h-[400px]">
                            <CvAIChat
                                data={data}
                                activeSection={activeSection}
                                onAddExperience={onAddExperience}
                                onAddProject={onAddProject}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Floating chat button with panel - Native feel, improved design
interface FloatingCvChatProps {
    data: CvData;
    activeSection: SupportedSection;
    onAddExperience: (exp: Experience) => void;
    onAddProject: (project: Project) => void;
}

// Section colors for the floating button
const getSectionColor = (section: SupportedSection) => {
    const colors: Record<SupportedSection, string> = {
        experience: "from-slate-600 via-slate-500 to-slate-600",
        projects: "from-teal-500 via-emerald-500 to-teal-600",
    };
    return colors[section];
};

const getSectionShadowColor = (section: SupportedSection) => {
    const shadows: Record<SupportedSection, string> = {
        experience: "shadow-slate-500/30",
        projects: "shadow-teal-500/30",
    };
    return shadows[section];
};

export function FloatingCvChat({
    data,
    activeSection,
    onAddExperience,
    onAddProject,
}: FloatingCvChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                if (isMinimized) {
                    setIsMinimized(false);
                } else {
                    setIsOpen(false);
                }
            }
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isOpen, isMinimized]);

    const sectionColor = getSectionColor(activeSection);
    const sectionShadow = getSectionShadowColor(activeSection);

    return (
        <>
            {/* FAB Button - Always visible when chat is closed */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.08, rotate: 3 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-6 right-6 z-40 group"
                        aria-label="Abrir CVBot"
                    >
                        {/* Pulse animation ring */}
                        <span className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${sectionColor} opacity-40 animate-ping`} />

                        {/* Main button */}
                        <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${sectionColor} text-white shadow-xl ${sectionShadow} flex items-center justify-center transform transition-all duration-200`}>
                            {/* Sparkles icon */}
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                            </svg>

                            {/* Online indicator */}
                            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-[2.5px] border-neutral-900 flex items-center justify-center">
                                <span className="w-1.5 h-1.5 bg-white rounded-full" />
                            </span>
                        </div>

                        {/* Tooltip */}
                        <div className="absolute bottom-full right-0 mb-3 px-3 py-2 rounded-xl bg-neutral-800/95 backdrop-blur-sm text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl border border-white/10">
                            <div className="flex items-center gap-2">
                                <span className="text-base">{getSectionIcon(activeSection)}</span>
                                <span>Asistente CV • {getSectionLabel(activeSection)}</span>
                            </div>
                            <div className="absolute top-full right-5 border-8 border-transparent border-t-neutral-800/95" />
                        </div>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop for mobile */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                        />

                        {/* Chat Window */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: 20 }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                                y: 0,
                                height: isMinimized ? "auto" : undefined
                            }}
                            exit={{ opacity: 0, scale: 0.92, y: 20 }}
                            transition={{ type: "spring", damping: 28, stiffness: 380 }}
                            className={`fixed z-50 
                                       inset-x-3 bottom-3 lg:inset-auto lg:bottom-6 lg:right-6
                                       lg:w-[420px] 
                                       rounded-2xl overflow-hidden 
                                       bg-neutral-900/98 backdrop-blur-2xl
                                       border border-white/10
                                       shadow-2xl shadow-black/50
                                       ${isMinimized ? "" : "h-[75vh] lg:h-[580px]"}`}
                        >
                            {/* Header */}
                            <div className={`relative flex items-center justify-between px-4 py-3 bg-gradient-to-r ${sectionColor} bg-opacity-20`}>
                                {/* Gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/90 via-neutral-900/80 to-neutral-900/90" />

                                <div className="relative flex items-center gap-3">
                                    <div className="relative">
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${sectionColor} flex items-center justify-center shadow-lg ${sectionShadow}`}>
                                            <span className="text-lg">{getSectionIcon(activeSection)}</span>
                                        </div>
                                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-neutral-900">
                                            <span className="absolute inset-0.5 bg-white/50 rounded-full animate-pulse" />
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-sm tracking-tight">Asistente CV</p>
                                        <p className="text-[11px] text-neutral-400 font-medium">
                                            {getSectionLabel(activeSection)}
                                        </p>
                                    </div>
                                </div>

                                <div className="relative flex items-center gap-1">
                                    {/* Section badge */}
                                    <span className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-neutral-300 font-medium mr-2`}>
                                        <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${sectionColor}`} />
                                        {activeSection.toUpperCase()}
                                    </span>

                                    {/* Minimize button */}
                                    <button
                                        onClick={() => setIsMinimized(!isMinimized)}
                                        className="w-8 h-8 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                                        aria-label={isMinimized ? "Maximizar" : "Minimizar"}
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            {isMinimized ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                                            )}
                                        </svg>
                                    </button>

                                    {/* Close button */}
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="w-8 h-8 rounded-lg text-neutral-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 transition-all flex items-center justify-center"
                                        aria-label="Cerrar"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Gradient line */}
                                <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-current to-transparent opacity-30`} style={{ color: activeSection === "experience" ? "#3b82f6" : activeSection === "projects" ? "#8b5cf6" : activeSection === "education" ? "#14b8a6" : activeSection === "skills" ? "#f59e0b" : activeSection === "certifications" ? "#f97316" : "#ec4899" }} />
                            </div>

                            {/* Chat content - Hidden when minimized */}
                            <AnimatePresence>
                                {!isMinimized && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="h-[calc(100%-60px)]"
                                    >
                                        <CvAIChat
                                            data={data}
                                            activeSection={activeSection}
                                            onAddExperience={onAddExperience}
                                            onAddProject={onAddProject}
                                            hideHeader={true}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
