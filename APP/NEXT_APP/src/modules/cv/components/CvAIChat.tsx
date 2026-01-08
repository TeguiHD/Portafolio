"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/components/ui/Toast";
import type { Experience } from "./ExperienceSection";
import type { Education } from "./EducationSection";
import type { Project } from "./ProjectsSection";
import type { SkillCategory } from "./SkillsSection";
import type { Certification, Language, CvData } from "../utils/latex-templates-enhanced";

// Expanded section types
type SupportedSection = "experience" | "projects" | "education" | "skills" | "certifications" | "languages";

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    action?: {
        type: "add_experience" | "add_project" | "add_education" | "add_skills" | "add_certification" | "add_language" | "improve_text" | "error";
        data?: Record<string, unknown>;
        applied?: boolean;
    };
}

interface CvAIChatProps {
    data: CvData;
    activeSection: SupportedSection;
    onAddExperience: (exp: Experience) => void;
    onAddProject: (project: Project) => void;
    onAddEducation?: (edu: Education) => void;
    onAddSkillCategory?: (category: SkillCategory) => void;
    onAddCertification?: (cert: Certification) => void;
    onAddLanguage?: (lang: Language) => void;
}

// Welcome messages for each section
const getWelcomeMessage = (section: SupportedSection): ChatMessage => {
    const messages: Record<SupportedSection, string> = {
        experience: "¡Hola! 👋 Soy tu asistente para **experiencias laborales**.\n\nPuedo ayudarte a:\n• Redactar logros cuantificables\n• Describir responsabilidades de forma atractiva\n• Usar verbos de acción efectivos\n\n¿Qué experiencia quieres agregar?",
        projects: "¡Hola! 👋 Soy tu asistente para **proyectos**.\n\nPuedo ayudarte a:\n• Describir proyectos de forma impactante\n• Destacar tecnologías utilizadas\n• Comunicar el valor del proyecto\n\n¿Qué proyecto quieres agregar?",
        education: "¡Hola! 👋 Soy tu asistente para **educación**.\n\nPuedo ayudarte a:\n• Agregar títulos académicos\n• Destacar logros académicos\n• Formatear correctamente tu formación\n\n¿Qué formación académica quieres agregar?",
        skills: "¡Hola! 👋 Soy tu asistente para **habilidades**.\n\nPuedo ayudarte a:\n• Organizar habilidades por categorías\n• Sugerir skills relevantes para tu industria\n• Mejorar la presentación de tus competencias\n\n¿Qué habilidades necesitas agregar?",
        certifications: "¡Hola! 👋 Soy tu asistente para **certificaciones**.\n\nPuedo ayudarte a:\n• Agregar certificaciones profesionales\n• Incluir cursos relevantes\n• Destacar credenciales importantes\n\n¿Qué certificación quieres agregar?",
        languages: "¡Hola! 👋 Soy tu asistente para **idiomas**.\n\nPuedo ayudarte a:\n• Agregar idiomas con niveles apropiados\n• Recomendar cómo presentar tu competencia\n• Incluir certificaciones de idioma\n\n¿Qué idioma quieres agregar?",
    };

    return {
        id: "welcome",
        role: "assistant",
        content: messages[section],
    };
};

// Quick actions for each section
const getQuickActions = (section: SupportedSection) => {
    const actions: Record<SupportedSection, Array<{ label: string; prompt: string }>> = {
        experience: [
            { label: "💼 Full Stack Developer", prompt: "Agrega una experiencia como desarrollador full stack en una startup de tecnología, con logros cuantificables" },
            { label: "👔 Tech Lead", prompt: "Crea una experiencia como tech lead liderando un equipo de desarrollo" },
            { label: "🚀 Freelance", prompt: "Agrega experiencia como desarrollador freelance con varios clientes" },
        ],
        projects: [
            { label: "🛒 E-commerce", prompt: "Crea un proyecto de e-commerce con Next.js y pasarela de pagos" },
            { label: "📊 Dashboard", prompt: "Agrega un proyecto de dashboard de analytics con gráficos interactivos" },
            { label: "🤖 App con IA", prompt: "Crea un proyecto que integre inteligencia artificial" },
        ],
        education: [
            { label: "🎓 Ingeniería", prompt: "Agrega título de Ingeniería en Informática de una universidad" },
            { label: "📚 Maestría", prompt: "Crea entrada para maestría en ciencias de la computación" },
            { label: "💻 Bootcamp", prompt: "Agrega un bootcamp de desarrollo web" },
        ],
        skills: [
            { label: "🔧 Frontend", prompt: "Agrega categoría de habilidades frontend con React, TypeScript y CSS" },
            { label: "⚙️ Backend", prompt: "Crea categoría de habilidades backend con Node.js, Python y bases de datos" },
            { label: "☁️ DevOps", prompt: "Agrega habilidades de DevOps: Docker, Kubernetes, CI/CD" },
        ],
        certifications: [
            { label: "☁️ AWS", prompt: "Agrega certificación AWS Solutions Architect" },
            { label: "🔷 Azure", prompt: "Crea certificación Microsoft Azure Developer" },
            { label: "📱 Meta", prompt: "Agrega certificación de Meta para desarrollo móvil" },
        ],
        languages: [
            { label: "🇪🇸 Español Nativo", prompt: "Agrega español como idioma nativo" },
            { label: "🇺🇸 Inglés Avanzado", prompt: "Agrega inglés nivel avanzado o fluido" },
            { label: "🇧🇷 Portugués", prompt: "Agrega portugués nivel intermedio" },
        ],
    };

    return actions[section];
};

// Section icons
const getSectionIcon = (section: SupportedSection): string => {
    const icons: Record<SupportedSection, string> = {
        experience: "💼",
        projects: "📁",
        education: "🎓",
        skills: "💡",
        certifications: "📜",
        languages: "🌐",
    };
    return icons[section];
};

// Section labels
const getSectionLabel = (section: SupportedSection): string => {
    const labels: Record<SupportedSection, string> = {
        experience: "Asistente de experiencias",
        projects: "Asistente de proyectos",
        education: "Asistente de educación",
        skills: "Asistente de habilidades",
        certifications: "Asistente de certificaciones",
        languages: "Asistente de idiomas",
    };
    return labels[section];
};

export function CvAIChat({
    data,
    activeSection,
    onAddExperience,
    onAddProject,
    onAddEducation,
    onAddSkillCategory,
    onAddCertification,
    onAddLanguage,
}: CvAIChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([getWelcomeMessage(activeSection)]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const toast = useToast();

    // Reset messages when section changes
    useEffect(() => {
        setMessages([getWelcomeMessage(activeSection)]);
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
                if (result.action === "ask_details" || result.action === "conversation") {
                    const assistantMessage: ChatMessage = {
                        id: uuidv4(),
                        role: "assistant",
                        content: result.message || "Cuéntame más...",
                    };
                    setMessages((prev) => [...prev, assistantMessage]);
                } else if (
                    result.action === "add_experience" ||
                    result.action === "add_project" ||
                    result.action === "add_education" ||
                    result.action === "add_skills" ||
                    result.action === "add_certification" ||
                    result.action === "add_language"
                ) {
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
            } else if (type === "add_education" && onAddEducation) {
                const edu: Education = {
                    id: uuidv4(),
                    institution: (actionData.institution as string) || "",
                    degree: (actionData.degree as string) || "",
                    field: (actionData.field as string) || "",
                    startDate: (actionData.startDate as string) || "",
                    endDate: (actionData.endDate as string) || "",
                };
                onAddEducation(edu);
                toast.success("Educación agregada al CV");
            } else if (type === "add_skills" && onAddSkillCategory) {
                const category: SkillCategory = {
                    category: (actionData.category as string) || "",
                    items: (actionData.items as string[]) || [],
                };
                onAddSkillCategory(category);
                toast.success("Habilidades agregadas al CV");
            } else if (type === "add_certification" && onAddCertification) {
                const cert: Certification = {
                    id: uuidv4(),
                    name: (actionData.name as string) || "",
                    issuer: (actionData.issuer as string) || "",
                    date: (actionData.date as string) || "",
                    url: (actionData.url as string) || "",
                    credentialId: (actionData.credentialId as string) || "",
                };
                onAddCertification(cert);
                toast.success("Certificación agregada al CV");
            } else if (type === "add_language" && onAddLanguage) {
                const lang: Language = {
                    id: uuidv4(),
                    name: (actionData.name as string) || "",
                    level: (actionData.level as Language["level"]) || "intermediate",
                    certification: (actionData.certification as string) || "",
                };
                onAddLanguage(lang);
                toast.success("Idioma agregado al CV");
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
    }, [messages, onAddExperience, onAddProject, onAddEducation, onAddSkillCategory, onAddCertification, onAddLanguage, toast]);

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

                {type === "add_education" && (
                    <div className="text-sm space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🎓</span>
                            <div>
                                <p className="font-semibold text-white">{actionData.degree as string}</p>
                                <p className="text-neutral-400 text-xs">{actionData.institution as string}</p>
                            </div>
                        </div>
                    </div>
                )}

                {type === "add_skills" && (
                    <div className="text-sm space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">💡</span>
                            <p className="font-semibold text-white">{actionData.category as string}</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {(actionData.items as string[])?.map((skill, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-[10px]">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {type === "add_certification" && (
                    <div className="text-sm space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">📜</span>
                            <div>
                                <p className="font-semibold text-white">{actionData.name as string}</p>
                                <p className="text-neutral-400 text-xs">{actionData.issuer as string}</p>
                            </div>
                        </div>
                    </div>
                )}

                {type === "add_language" && (
                    <div className="text-sm space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🌐</span>
                            <p className="font-semibold text-white">{actionData.name as string}</p>
                            <span className="text-neutral-400 text-xs">({actionData.level as string})</span>
                        </div>
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
            {/* Header with section indicator */}
            <div className="relative flex flex-col bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-b border-white/10">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                                <span className="text-lg">{getSectionIcon(activeSection)}</span>
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-neutral-900" />
                        </div>
                        <div>
                            <p className="font-bold text-white text-sm">CVBot</p>
                            <p className="text-[10px] text-purple-300">
                                {getSectionLabel(activeSection)}
                            </p>
                        </div>
                    </div>

                    {/* Section badge */}
                    <div className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-medium uppercase">
                        {activeSection}
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
            </div>

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
                                ? "bg-purple-600 text-white"
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
                                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick actions - only show at start */}
            {messages.length === 1 && (
                <div className="px-4 pb-2">
                    <p className="text-[10px] text-neutral-500 mb-2 uppercase tracking-wide">Sugerencias rápidas</p>
                    <div className="flex flex-wrap gap-2">
                        {quickActions.map((action, i) => (
                            <button
                                key={i}
                                onClick={() => handleSend(action.prompt)}
                                className="px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-300 text-xs hover:bg-purple-500/20 transition-colors"
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-purple-500/20">
                <div className="flex gap-2">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Describe lo que quieres agregar...`}
                        rows={1}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-purple-500/20 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/50 resize-none text-sm disabled:opacity-50"
                    />
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSend()}
                        disabled={isLoading || !input.trim()}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
    onAddEducation?: (edu: Education) => void;
    onAddSkillCategory?: (category: SkillCategory) => void;
    onAddCertification?: (cert: Certification) => void;
    onAddLanguage?: (lang: Language) => void;
}

export function InlineCvChat({
    data,
    activeSection,
    onAddExperience,
    onAddProject,
    onAddEducation,
    onAddSkillCategory,
    onAddCertification,
    onAddLanguage,
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
                    ? "bg-purple-500/10 border-purple-500/30"
                    : "bg-white/5 border-white/10 hover:border-purple-500/20"
                    }`}
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                        <span className="text-sm">{getSectionIcon(activeSection)}</span>
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-medium text-white">CVBot</p>
                        <p className="text-[10px] text-neutral-400">{getSectionLabel(activeSection)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-purple-400">
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
                        <div className="mt-2 rounded-xl border border-purple-500/20 bg-gradient-to-b from-neutral-900/50 to-neutral-950/50 overflow-hidden h-[400px]">
                            <CvAIChat
                                data={data}
                                activeSection={activeSection}
                                onAddExperience={onAddExperience}
                                onAddProject={onAddProject}
                                onAddEducation={onAddEducation}
                                onAddSkillCategory={onAddSkillCategory}
                                onAddCertification={onAddCertification}
                                onAddLanguage={onAddLanguage}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Keep FloatingCvChat for backward compatibility but deprecated
interface FloatingCvChatProps {
    data: CvData;
    activeSection: "experience" | "projects";
    onAddExperience: (exp: Experience) => void;
    onAddProject: (project: Project) => void;
}

/** @deprecated Use InlineCvChat instead */
export function FloatingCvChat({ data, activeSection, onAddExperience, onAddProject }: FloatingCvChatProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* FAB Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 text-white shadow-xl shadow-purple-500/40 flex items-center justify-center ${isOpen ? "hidden" : ""}`}
                style={{
                    boxShadow: "0 8px 32px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)"
                }}
            >
                <span className="text-2xl">{activeSection === "experience" ? "💼" : "📁"}</span>
            </motion.button>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-md z-40"
                        />

                        {/* Panel */}
                        <motion.div
                            initial={{ opacity: 0, y: "100%" }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 400 }}
                            className="fixed inset-x-0 bottom-0 lg:inset-auto lg:bottom-6 lg:right-6 z-50 
                                       h-[90vh] lg:h-[600px] lg:w-[420px] 
                                       rounded-t-[28px] lg:rounded-2xl overflow-hidden 
                                       bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 
                                       border-t border-purple-500/30 lg:border lg:border-purple-500/20 
                                       shadow-2xl"
                        >
                            {/* Mobile drag handle */}
                            <div className="lg:hidden flex justify-center pt-3 pb-1">
                                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                            </div>

                            {/* Close button for desktop */}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-3 right-3 z-10 hidden lg:flex w-8 h-8 rounded-lg bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-all items-center justify-center"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <CvAIChat
                                data={data}
                                activeSection={activeSection}
                                onAddExperience={onAddExperience}
                                onAddProject={onAddProject}
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
