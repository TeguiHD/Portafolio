"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import { v4 as uuidv4 } from "uuid";
import { Check, Circle, Lock, Maximize2, Minus, Plus, SendHorizontal, Sparkles, X } from "lucide-react";
import { BOTON, CAMPO, FOCO } from "./estilos";
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

// Mensaje de bienvenida de cada sección
const getWelcomeMessage = (section: SupportedSection): ChatMessage => {
    const messages: Record<SupportedSection, string> = {
        experience: "Hola. Te ayudo con tus experiencias laborales.\n\nCuéntame de tu trabajo y te ayudo a:\n• Redactar logros medibles\n• Pulir las descripciones\n• Usar verbos de acción\n\nTú pones la información; yo la ordeno. ¿Qué experiencia quieres agregar?",
        projects: "Hola. Te ayudo con tus proyectos.\n\nDescríbeme el proyecto y te ayudo a:\n• Mejorar la descripción\n• Sugerir tecnologías relacionadas\n• Destacar el impacto\n\nTú pones la información; yo la pulo. ¿Qué proyecto quieres agregar?",
    };

    return {
        id: "welcome",
        role: "assistant",
        content: messages[section],
    };
};

// Atajos para empezar la conversación
const getQuickActions = (section: SupportedSection) => {
    const actions: Record<SupportedSection, Array<{ label: string; prompt: string }>> = {
        experience: [
            { label: "Desarrollador full stack", prompt: "Trabajé como desarrollador full stack en una startup de tecnología" },
            { label: "Líder técnico", prompt: "Fui tech lead liderando un equipo de desarrollo de 5 personas" },
            { label: "Independiente", prompt: "Trabajo como desarrollador freelance con varios clientes" },
        ],
        projects: [
            { label: "Tienda en línea", prompt: "Construí un e-commerce con Next.js y pasarela de pagos" },
            { label: "Panel de datos", prompt: "Desarrollé un dashboard de analytics con gráficos interactivos" },
            { label: "App con IA", prompt: "Creé una aplicación que integra inteligencia artificial" },
        ],
    };

    return actions[section];
};

// Nombre de cada asistente
const getSectionLabel = (section: SupportedSection): string => {
    const labels: Record<SupportedSection, string> = {
        experience: "Experiencias",
        projects: "Proyectos",
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
    const base = useId();

    // Reset messages and draft when section changes
    useEffect(() => {
        setMessages([getWelcomeMessage(activeSection)]);
        setDraftExperience({});
        setDraftProject({});
    }, [activeSection]);

    useEffect(() => {
        const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        messagesEndRef.current?.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "nearest" });
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
                        content: "Enviaste muchas solicitudes seguidas. Espera un momento antes de seguir.",
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
            <div className="mt-3 rounded-lg border border-[var(--linea-2)] bg-[var(--sup)] p-3">
                {type === "add_experience" && (
                    <div className="text-sm">
                        <p className="font-semibold text-[var(--txt)]">{actionData.position as string}</p>
                        <p className="text-xs text-[var(--mut)]">{actionData.company as string}</p>
                    </div>
                )}

                {type === "add_project" && (
                    <div className="space-y-1 text-sm">
                        <p className="font-semibold text-[var(--txt)]">{actionData.name as string}</p>
                        <p className="line-clamp-2 text-xs text-[var(--mut)]">{actionData.description as string}</p>
                    </div>
                )}

                {!applied ? (
                    <button type="button" onClick={() => handleApplyAction(message.id)} className={`${BOTON} mt-3 w-full`}>
                        <Plus className="size-4" aria-hidden="true" />
                        Agregar al CV
                    </button>
                ) : (
                    <p className="mt-3 flex items-center justify-center gap-2 text-sm text-emerald-400">
                        <Check className="size-4" aria-hidden="true" />
                        Agregado al CV
                    </p>
                )}
            </div>
        );
    };

    const quickActions = getQuickActions(activeSection);

    const filaBorrador = (listo: boolean, texto: string, extra = "") => (
        <li className={`flex min-w-0 items-center gap-1.5 ${extra}`}>
            {listo ? (
                <Check className="size-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
            ) : (
                <Circle className="size-3.5 shrink-0 text-[var(--mut)]" aria-hidden="true" />
            )}
            <span className={`truncate ${listo ? "text-[var(--txt)]" : "text-[var(--mut)]"}`}>{texto}</span>
        </li>
    );

    return (
        <div className="flex h-full flex-col">
            {!hideHeader && (
                <div className="flex items-center gap-3 border-b border-[var(--linea)] px-4 py-3">
                    <Sparkles className="size-[18px] text-[var(--acento)]" aria-hidden="true" />
                    <div>
                        <p className="text-sm font-semibold text-[var(--txt)]">Asistente de CV</p>
                        <p className="text-xs text-[var(--mut)]">{getSectionLabel(activeSection)}</p>
                    </div>
                </div>
            )}

            {activeSection === "experience" && Object.keys(draftExperience).length > 0 && (
                <div className="border-b border-[var(--linea)] bg-[var(--fondo-2)] px-4 py-3">
                    <p className="mb-2 text-xs font-medium text-[var(--mut)]">Borrador en curso</p>
                    <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                        {filaBorrador(!!draftExperience.company, `Empresa: ${draftExperience.company || "pendiente"}`)}
                        {filaBorrador(!!draftExperience.position, `Cargo: ${draftExperience.position || "pendiente"}`)}
                        {filaBorrador(!!draftExperience.startDate, `Fechas: ${draftExperience.startDate || "pendiente"}`)}
                        {filaBorrador(
                            !!draftExperience.technologies?.length,
                            `Tecnologías: ${draftExperience.technologies?.join(", ") || "pendiente"}`
                        )}
                    </ul>
                </div>
            )}

            {activeSection === "projects" && Object.keys(draftProject).length > 0 && (
                <div className="border-b border-[var(--linea)] bg-[var(--fondo-2)] px-4 py-3">
                    <p className="mb-2 text-xs font-medium text-[var(--mut)]">Borrador en curso</p>
                    <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                        {filaBorrador(!!draftProject.name, `Nombre: ${draftProject.name || "pendiente"}`)}
                        {filaBorrador(!!draftProject.description, `Descripción: ${draftProject.description ? "lista" : "pendiente"}`)}
                        {filaBorrador(
                            !!draftProject.technologies?.length,
                            `Tecnologías: ${draftProject.technologies?.join(", ") || "pendiente"}`,
                            "col-span-2"
                        )}
                    </ul>
                </div>
            )}

            <div role="log" aria-live="polite" aria-label="Conversación con el asistente" className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
                {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[var(--txt)] ${
                                message.role === "user"
                                    ? "rounded-br-md bg-[color-mix(in_srgb,var(--acento)_16%,transparent)]"
                                    : "rounded-bl-md bg-[var(--fondo-2)]"
                            }`}
                        >
                            <p className="sr-only">{message.role === "user" ? "Tú:" : "Asistente:"}</p>
                            <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                            {message.action && renderActionPreview(message)}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="rounded-2xl rounded-bl-md bg-[var(--fondo-2)] px-3.5 py-3">
                            <span className="sr-only">El asistente está escribiendo…</span>
                            <span aria-hidden="true" className="flex gap-1">
                                <span className="size-1.5 animate-bounce rounded-full bg-[var(--mut)] motion-reduce:animate-none" style={{ animationDelay: "0ms" }} />
                                <span className="size-1.5 animate-bounce rounded-full bg-[var(--mut)] motion-reduce:animate-none" style={{ animationDelay: "150ms" }} />
                                <span className="size-1.5 animate-bounce rounded-full bg-[var(--mut)] motion-reduce:animate-none" style={{ animationDelay: "300ms" }} />
                            </span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {messages.length === 1 && quickActions && quickActions.length > 0 && (
                <div className="px-4 pb-2">
                    <p className="mb-2 text-xs text-[var(--mut)]">Para empezar</p>
                    <ul className="flex flex-wrap gap-1.5">
                        {quickActions.map((action, i) => (
                            <li key={i}>
                                <button
                                    type="button"
                                    onClick={() => handleSend(action.prompt)}
                                    className={`inline-flex min-h-11 items-center rounded-full border border-[var(--linea-2)] px-3 text-xs text-[var(--txt)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] sm:min-h-8 ${FOCO}`}
                                >
                                    {action.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                }}
                className="border-t border-[var(--linea)] p-3"
            >
                <div className="flex items-end gap-2">
                    <label htmlFor={`${base}-mensaje`} className="sr-only">Mensaje para el asistente</label>
                    <textarea
                        id={`${base}-mensaje`}
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Describe lo que quieres agregar…"
                        rows={1}
                        disabled={isLoading}
                        className={`${CAMPO} flex-1 resize-none`}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        aria-label="Enviar"
                        className={`inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-[var(--acento)] text-[var(--acento-tinta)] transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:size-10 ${FOCO}`}
                    >
                        <SendHorizontal className="size-4" aria-hidden="true" />
                    </button>
                </div>
                <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-[var(--mut)]">
                    <Lock className="size-3" aria-hidden="true" />
                    El asistente no puede cambiar tus datos personales.
                </p>
            </form>
        </div>
    );
}

// Botón flotante con el panel del asistente
interface FloatingCvChatProps {
    data: CvData;
    activeSection: SupportedSection;
    onAddExperience: (exp: Experience) => void;
    onAddProject: (project: Project) => void;
}

/**
 * Panel no modal: se puede seguir editando el CV con el asistente abierto. Por eso es un <dialog> abierto sin
 * showModal() (no bloquea la página) con botón de cerrar visible; Escape también lo cierra.
 */
export function FloatingCvChat({
    data,
    activeSection,
    onAddExperience,
    onAddProject,
}: FloatingCvChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const base = useId();
    const panelRef = useRef<HTMLDialogElement>(null);
    const abrirRef = useRef<HTMLButtonElement>(null);
    const estuvoAbierto = useRef(false);

    // Escape: primero restaura si está minimizado; si no, cierra
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

    // Al abrir, el foco va al campo del mensaje; al cerrar, vuelve al botón que lo abrió
    useEffect(() => {
        if (isOpen) {
            panelRef.current?.querySelector("textarea")?.focus();
            estuvoAbierto.current = true;
        } else if (estuvoAbierto.current) {
            abrirRef.current?.focus();
        }
    }, [isOpen]);

    return (
        <>
            <button
                ref={abrirRef}
                type="button"
                hidden={isOpen}
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-[calc(96px+env(safe-area-inset-bottom))] right-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-[var(--acento)] px-4 text-sm font-semibold text-[var(--acento-tinta)] shadow-lg transition-opacity duration-150 hover:opacity-90 lg:bottom-6 lg:right-6 ${FOCO}`}
            >
                <Sparkles className="size-[18px]" aria-hidden="true" />
                Asistente
                <span className="sr-only">de CV: {getSectionLabel(activeSection).toLowerCase()}</span>
            </button>

            {isOpen && (
                <dialog
                    ref={panelRef}
                    open
                    aria-labelledby={`${base}-t`}
                    className={`fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] top-auto z-50 m-0 open:flex w-auto max-w-none flex-col overflow-hidden rounded-2xl border border-[var(--linea-2)] bg-[var(--sup)] p-0 text-[var(--txt)] shadow-2xl lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[420px] ${
                        isMinimized ? "" : "h-[75dvh] lg:h-[580px]"
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 border-b border-[var(--linea)] px-4 py-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                            <Sparkles className="size-[18px] shrink-0 text-[var(--acento)]" aria-hidden="true" />
                            <div className="min-w-0">
                                <h2 id={`${base}-t`} className="text-sm font-semibold text-[var(--txt)]">Asistente de CV</h2>
                                <p className="text-xs text-[var(--mut)]">{getSectionLabel(activeSection)}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setIsMinimized(!isMinimized)}
                                aria-expanded={!isMinimized}
                                aria-controls={`${base}-cuerpo`}
                                aria-label={isMinimized ? "Mostrar la conversación" : "Minimizar"}
                                className={`inline-flex size-11 items-center justify-center rounded-lg text-[var(--mut)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] hover:text-[var(--txt)] sm:size-9 ${FOCO}`}
                            >
                                {isMinimized ? <Maximize2 className="size-4" aria-hidden="true" /> : <Minus className="size-4" aria-hidden="true" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                aria-label="Cerrar el asistente"
                                className={`inline-flex size-11 items-center justify-center rounded-lg text-[var(--mut)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] hover:text-[var(--txt)] sm:size-9 ${FOCO}`}
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </div>
                    </div>

                    <div id={`${base}-cuerpo`} hidden={isMinimized} className="min-h-0 flex-1">
                        <CvAIChat
                            data={data}
                            activeSection={activeSection}
                            onAddExperience={onAddExperience}
                            onAddProject={onAddProject}
                            hideHeader={true}
                        />
                    </div>
                </dialog>
            )}
        </>
    );
}
