"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { QuotationData, QuotationItem } from "../types";
import { v4 as uuidv4 } from "uuid";
import { projectTypes, type ProjectType } from "../templates/quotation-templates";
import { useToast } from "@/components/ui/Toast";

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    actions?: Array<{
        type: "fill_field" | "add_service" | "set_type";
        label: string;
        data: Record<string, unknown>;
    }>;
}

interface QuotationAIChatProps {
    data: QuotationData;
    updateData: (updates: Partial<QuotationData>) => void;
    onClose?: () => void;
    quotationId?: string; // If editing existing quotation, pass its ID
    // For controlled mode (persistence)
    messages?: ChatMessage[];
    setMessages?: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    usedActions?: Set<string>;
    setUsedActions?: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const WELCOME_MESSAGE: ChatMessage = {
    id: "welcome",
    role: "assistant",
    content: "¡Hola! 👋 Soy tu asistente para crear cotizaciones profesionales. ¿Qué tipo de proyecto necesitas?",
    actions: [
        { type: "set_type", label: "🌐 Landing Page", data: { projectType: "landing", priceRange: "$150-300k" } },
        { type: "set_type", label: "🏢 Sitio Web", data: { projectType: "website", priceRange: "$300-600k" } },
        { type: "set_type", label: "🛒 E-commerce", data: { projectType: "ecommerce", priceRange: "$600k-1.5M" } },
        { type: "set_type", label: "💻 Web App", data: { projectType: "webapp", priceRange: "$400k-1M" } },
        { type: "set_type", label: "🔧 Mantenimiento", data: { projectType: "maintenance", priceRange: "$80-150k/mes" } },
        { type: "set_type", label: "✨ Rediseño", data: { projectType: "redesign", priceRange: "$200-400k" } },
    ],
};

export function QuotationAIChat({
    data,
    updateData,
    onClose,
    quotationId,
    messages: externalMessages,
    setMessages: externalSetMessages,
    usedActions: externalUsedActions,
    setUsedActions: externalSetUsedActions,
}: QuotationAIChatProps) {
    // Use external state if provided, otherwise internal
    const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
    const [internalUsedActions, setInternalUsedActions] = useState<Set<string>>(new Set());
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const messages = externalMessages ?? internalMessages;
    const setMessages = externalSetMessages ?? setInternalMessages;
    const usedActions = externalUsedActions ?? internalUsedActions;
    const setUsedActions = externalSetUsedActions ?? setInternalUsedActions;

    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [selectedLabels, setSelectedLabels] = useState<Map<string, string>>(new Map());
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [editingField, setEditingField] = useState<number | null>(null);
    const [editValue, setEditValue] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Toast notifications
    const toast = useToast();

    // NEW: Session persistence
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isLoadingSession, setIsLoadingSession] = useState(true);

    // Load session from DB on mount
    useEffect(() => {
        const loadSession = async () => {
            try {
                // If no quotationId, this is a NEW quotation - always start fresh
                const url = quotationId
                    ? `/api/quotations/chat/session?quotationId=${quotationId}`
                    : "/api/quotations/chat/session"; // API now auto-creates fresh session for new

                const res = await fetch(url);
                if (res.ok) {
                    const sessionData = await res.json();
                    setSessionId(sessionData.sessionId);
                    if (sessionData.messages && sessionData.messages.length > 0) {
                        const loadedMessages: ChatMessage[] = sessionData.messages.map((m: { id: string; role: string; content: string; actions?: unknown[] }) => ({
                            id: m.id,
                            role: m.role as "user" | "assistant",
                            content: m.content,
                            actions: m.actions as ChatMessage["actions"],
                        }));
                        setMessages(loadedMessages);
                    }
                }
            } catch (error) {
                console.error("[Chat] Failed to load session:", error);
            } finally {
                setIsLoadingSession(false);
            }
        };
        loadSession();
    }, [quotationId, setMessages]);

    // Helper to save message to DB (async, doesn't block UI)
    const saveMessageToDB = async (message: { role: string; content: string; actions?: unknown }) => {
        if (!sessionId) return;
        try {
            await fetch("/api/quotations/chat/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, message }),
            });
        } catch (error) {
            console.error("[Chat] Failed to save message:", error);
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-detect project type from user message
    const detectProjectType = (text: string): ProjectType | null => {
        const lowerText = text.toLowerCase();
        if (lowerText.includes("e-commerce") || lowerText.includes("ecommerce") || lowerText.includes("tienda online") || lowerText.includes("tienda virtual")) {
            return "ecommerce";
        }
        if (lowerText.includes("landing") || lowerText.includes("página de aterrizaje")) {
            return "landing_page";
        }
        if (lowerText.includes("web app") || lowerText.includes("webapp") || lowerText.includes("aplicación web")) {
            return "webapp";
        }
        if (lowerText.includes("sitio web") || lowerText.includes("página web") || lowerText.includes("website")) {
            return "website";
        }
        if (lowerText.includes("mantenimiento") || lowerText.includes("soporte")) {
            return "maintenance";
        }
        if (lowerText.includes("rediseño") || lowerText.includes("redesign")) {
            return "redesign";
        }
        return null;
    };

    const handleSend = async () => {
        const hasSelections = selectedLabels.size > 0;
        const hasText = input.trim().length > 0;

        // Allow sending if there's text OR selections
        if ((!hasText && !hasSelections) || isLoading) return;

        // Build the message content
        let messageContent = "";

        if (hasSelections) {
            const selections = Array.from(selectedLabels.values()).join(", ");
            messageContent = `Seleccioné: ${selections}`;
            if (hasText) {
                messageContent += `. ${input.trim()}`;
            }
        } else {
            messageContent = input.trim();
        }

        // Auto-detect and apply project type from user message
        const detectedType = detectProjectType(messageContent);
        let updatedTimeline = data.timeline;
        let updatedPaymentTerms = data.paymentTerms;
        let projectTypeName = "";

        if (detectedType && !data.timeline) { // Only if not already set
            const pt = projectTypes.find((p) => p.id === detectedType);
            if (pt) {
                updatedTimeline = pt.defaultTimeline;
                updatedPaymentTerms = pt.defaultPaymentTerms;
                projectTypeName = pt.name;
                updateData({
                    timeline: pt.defaultTimeline,
                    paymentTerms: pt.defaultPaymentTerms,
                });
                toast.info("Tipo detectado", pt.name);
            }
        }

        const displayMessage: ChatMessage = {
            id: uuidv4(),
            role: "user",
            content: messageContent,
        };

        setMessages((prev) => [...prev, displayMessage]);
        setInput("");
        // Clear pending selections (banner) but keep usedActions to permanently disable used buttons
        setSelectedLabels(new Map());
        // DON'T clear usedActions - buttons should stay disabled after sending
        setIsLoading(true);

        try {
            const apiMessages = [...messages, displayMessage].map(m => ({
                role: m.role,
                content: m.content,
            }));

            // Use updated values if type was detected in this message
            const currentDataToSend = {
                clientName: data.clientName || "",
                projectName: data.projectName || "",
                scope: data.scope || "",
                timeline: updatedTimeline || data.timeline || "",
                paymentTerms: updatedPaymentTerms || data.paymentTerms || "",
                itemsCount: (data.items ?? []).length,
                items: (data.items ?? []).map(item => item.title),
                // Explicitly tell the AI what type was detected
                projectType: projectTypeName || (data.timeline ? "Ya configurado" : ""),
            };

            const res = await fetch("/api/quotations/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: apiMessages,
                    currentData: currentDataToSend,
                }),
            });

            const result = await res.json();

            if (res.ok) {
                const assistantMessage: ChatMessage = {
                    id: uuidv4(),
                    role: "assistant",
                    content: result.message,
                    actions: result.actions,
                };
                setMessages((prev) => [...prev, assistantMessage]);

                // Save both messages to DB (async, doesn't block UI)
                saveMessageToDB({ role: "user", content: displayMessage.content });
                saveMessageToDB({ role: "assistant", content: result.message, actions: result.actions });

                // Auto-apply suggestions if any
                if (result.autoApply) {
                    applyChanges(result.autoApply);
                }
            } else {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: uuidv4(),
                        role: "assistant",
                        content: "Lo siento, hubo un error. ¿Puedes intentar de nuevo?",
                    },
                ]);
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
    };

    const applyChanges = (changes: Record<string, unknown>) => {
        const updates: Partial<QuotationData> = {};

        if (changes.projectType) {
            const pt = projectTypes.find((p) => p.id === changes.projectType);
            if (pt) {
                updates.timeline = pt.defaultTimeline;
                updates.paymentTerms = pt.defaultPaymentTerms;
            }
        }

        if (changes.clientName) updates.clientName = changes.clientName as string;
        if (changes.projectName) updates.projectName = changes.projectName as string;
        if (changes.scope) updates.scope = changes.scope as string;
        if (changes.timeline) updates.timeline = changes.timeline as string;
        if (changes.paymentTerms) updates.paymentTerms = changes.paymentTerms as string;

        if (changes.services && Array.isArray(changes.services)) {
            const newItems: QuotationItem[] = changes.services.map(
                (s: { title: string; description: string; deliverables: string[]; price: number }) => ({
                    id: uuidv4(),
                    title: s.title,
                    description: s.description,
                    deliverables: s.deliverables || [],
                    price: s.price,
                })
            );
            updates.items = [...(data.items ?? []), ...newItems];
        }

        if (Object.keys(updates).length > 0) {
            updateData(updates);
        }
    };



    // Apply selected action (one-time - no toggle/deselect)
    const handleApplyAction = (action: NonNullable<ChatMessage["actions"]>[number], messageId: string, actionIndex: number) => {
        const actionKey = `${messageId}-${actionIndex}`;

        // Prevent re-selecting already used buttons
        if (usedActions.has(actionKey)) return;

        // Handle missing label gracefully
        const rawLabel = action.label || action.type || "Acción";
        const cleanLabel = rawLabel.replace(/^[^\w\s]+\s*/, ''); // Remove emoji prefix

        // SELECT: Mark as used and track label
        setUsedActions(prev => new Set(prev).add(actionKey));

        // Auto-scroll only on first selection (when banner appears)
        const isFirstSelection = selectedLabels.size === 0;
        setSelectedLabels(prev => new Map(prev).set(actionKey, cleanLabel));

        if (isFirstSelection) {
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        }

        // Apply action and show toast notification only if there's useful data
        if (action.type === "fill_field" && action.data && Object.keys(action.data).length > 0) {
            const fieldData = action.data as Partial<QuotationData>;
            updateData(fieldData);

            // Show what was actually saved
            const savedValue = Object.entries(fieldData)
                .map(([key, val]) => {
                    const fieldNames: Record<string, string> = {
                        clientName: "Cliente",
                        projectName: "Proyecto",
                        scope: "Alcance",
                        timeline: "Plazo",
                        paymentTerms: "Pago"
                    };
                    return `${fieldNames[key] || key}: ${val}`;
                })
                .join(", ");
            if (savedValue) {
                toast.success("Guardado", savedValue);
            }
        } else if (action.type === "add_service") {
            const service = action.data as {
                title: string;
                description: string;
                deliverables: string[];
                price: number;
            };
            // Only add if there's actual data
            if (service.title) {
                updateData({
                    items: [
                        ...(data.items ?? []),
                        {
                            id: uuidv4(),
                            ...service,
                        },
                    ],
                });
                const priceFormatted = service.price ? ` - $${service.price.toLocaleString("es-CL")}` : "";
                toast.success("Servicio agregado", `${service.title}${priceFormatted}`);
            }
        } else if (action.type === "set_type") {
            const type = action.data.projectType as ProjectType;
            const pt = projectTypes.find((p) => p.id === type);
            if (pt) {
                updateData({
                    timeline: pt.defaultTimeline,
                    paymentTerms: pt.defaultPaymentTerms,
                });
                toast.success("Tipo seleccionado", pt.name);
            }
        }

        // Reset auto-send timer on each selection (debounce)
        if (autoSendTimerRef.current) {
            clearTimeout(autoSendTimerRef.current);
        }

        // Auto-send after 2 seconds of inactivity
        autoSendTimerRef.current = setTimeout(() => {
            // Only auto-send if there are pending selections
            if (selectedLabels.size > 0 || (action && !usedActions.has(actionKey))) {
                handleSend();
            }
        }, 2000);
    };

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (autoSendTimerRef.current) {
                clearTimeout(autoSendTimerRef.current);
            }
        };
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Calculate progress
    const progressFields = [
        { name: "Cliente", key: "clientName", filled: !!data.clientName, value: data.clientName },
        { name: "Proyecto", key: "projectName", filled: !!data.projectName, value: data.projectName },
        { name: "Servicios", key: "items", filled: (data.items ?? []).length > 0, value: (data.items ?? []).length > 0 ? `${(data.items ?? []).length} servicios` : "" },
        { name: "Alcance", key: "scope", filled: !!data.scope, value: data.scope },
        { name: "Plazo", key: "timeline", filled: !!data.timeline, value: data.timeline },
        { name: "Pago", key: "paymentTerms", filled: !!data.paymentTerms, value: data.paymentTerms },
    ];
    const filledCount = progressFields.filter(f => f.filled).length;
    const progressPercent = (filledCount / progressFields.length) * 100;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="relative flex flex-col bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-b border-white/10">
                {/* Top row */}
                <div className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                                <span className="text-lg">✨</span>
                            </div>
                            {/* Online indicator */}
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-neutral-900" />
                        </div>
                        <div>
                            <p className="font-bold text-white text-sm">Asistente IA</p>
                            <p className="text-[10px] text-purple-300">Creando cotización</p>
                        </div>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Progress bar */}
                <div className="px-5 pb-3">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-neutral-400">Progreso</span>
                        <span className="text-[10px] text-purple-300 font-medium">{filledCount}/{progressFields.length} campos</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            initial={isMounted ? { width: 0 } : false}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                        />
                    </div>
                    {/* Field indicators - clickable and editable */}
                    <div className="flex gap-1 mt-2">
                        {progressFields.map((field, i) => (
                            <div
                                key={i}
                                onClick={() => {
                                    setEditingField(i);
                                    setEditValue(field.value || "");
                                }}
                                className={`group relative flex-1 h-5 rounded-md transition-all cursor-pointer ${field.filled
                                    ? "bg-green-500/20 hover:bg-green-500/40"
                                    : "bg-white/5 hover:bg-white/20"
                                    }`}
                            >
                                {/* Tooltip on hover */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-neutral-800 rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-white/10">
                                    <span className={field.filled ? "text-green-400" : "text-neutral-400"}>
                                        {field.filled ? "✓" : "○"} {field.name}
                                        {field.filled && field.value && `: ${field.value.length > 15 ? field.value.slice(0, 15) + "..." : field.value}`}
                                    </span>
                                    <span className="text-neutral-500 ml-1">(click para editar)</span>
                                </div>
                                {/* Mini indicator */}
                                <div className="h-full flex items-center justify-center">
                                    {field.filled ? (
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                    ) : (
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Edit drawer - appears below progress bar */}
                    <AnimatePresence>
                        {editingField !== null && (
                            <motion.div
                                initial={isMounted ? { opacity: 0, height: 0 } : false}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-3 p-3 bg-neutral-800/80 rounded-xl border border-purple-500/30">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-medium text-white">{progressFields[editingField].name}</span>
                                        <button
                                            onClick={() => setEditingField(null)}
                                            className="text-neutral-400 hover:text-white p-1"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    {progressFields[editingField].key === "items" ? (
                                        <div className="text-xs text-neutral-300">
                                            {(data.items ?? []).length > 0 ? (
                                                <ul className="space-y-1">
                                                    {(data.items ?? []).map((item, idx) => (
                                                        <li key={idx} className="flex justify-between">
                                                            <span className="truncate">{item.title}</span>
                                                            <span className="text-green-400">${item.price?.toLocaleString('es-CL')}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <span className="text-neutral-500">Sin servicios - agrega servicios en el chat</span>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <input
                                                type="text"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && editValue.trim()) {
                                                        updateData({ [progressFields[editingField].key]: editValue.trim() });
                                                        toast.success("Actualizado", `${progressFields[editingField].name}: ${editValue.trim()}`);
                                                        setEditingField(null);
                                                    }
                                                }}
                                                placeholder={`Ingresa ${progressFields[editingField].name.toLowerCase()}`}
                                                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-purple-500/50"
                                                autoFocus
                                            />
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    onClick={() => {
                                                        if (editValue.trim()) {
                                                            updateData({ [progressFields[editingField].key]: editValue.trim() });
                                                            toast.success("Actualizado", `${progressFields[editingField].name}: ${editValue.trim()}`);
                                                        }
                                                        setEditingField(null);
                                                    }}
                                                    className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-500 transition-colors"
                                                >
                                                    Guardar
                                                </button>
                                                {progressFields[editingField].filled && (
                                                    <button
                                                        onClick={() => {
                                                            updateData({ [progressFields[editingField].key]: "" });
                                                            toast.info("Borrado", progressFields[editingField].name);
                                                            setEditingField(null);
                                                        }}
                                                        className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-colors"
                                                    >
                                                        Borrar
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Animated gradient line */}
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <motion.div
                        key={msg.id}
                        initial={isMounted ? { opacity: 0, y: 10 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.role === "user"
                                ? "bg-accent-1 text-black"
                                : "bg-white/10 text-white"
                                }`}
                        >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                            {/* Actions */}
                            {msg.actions && msg.actions.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {msg.actions
                                        .filter(action => action && (action.label || action.type)) // Filter out empty actions
                                        .map((action, i) => {
                                            const actionKey = `${msg.id}-${i}`;
                                            const isUsed = usedActions.has(actionKey);
                                            const displayLabel = action.label || action.type || "Acción";

                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => handleApplyAction(action, msg.id, i)}
                                                    disabled={isUsed}
                                                    title={isUsed ? "Ya seleccionado" : "Click para seleccionar"}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${isUsed
                                                        ? "bg-green-500/20 text-green-400 cursor-default opacity-75"
                                                        : "bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 hover:scale-105"
                                                        }`}
                                                >
                                                    {isUsed ? (
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    ) : null}
                                                    {displayLabel}
                                                </button>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))
                }

                {
                    isLoading && (
                        <motion.div
                            initial={isMounted ? { opacity: 0 } : false}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                        >
                            <div className="bg-white/10 rounded-2xl px-4 py-3">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        </motion.div>
                    )
                }

                <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {
                messages.length === 1 && (
                    <div className="px-4 pb-2">
                        <p className="text-xs text-neutral-500 mb-2">Sugerencias:</p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                "Necesito un e-commerce",
                                "Quiero una landing page",
                                "Una aplicación web",
                                "Rediseño de sitio",
                            ].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => setInput(suggestion)}
                                    className="px-3 py-1.5 rounded-full bg-white/5 text-neutral-400 text-xs hover:bg-white/10 hover:text-white transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Input */}
            <div className="p-4 border-t border-purple-500/20">
                {/* Selection feedback banner */}
                <AnimatePresence>
                    {selectedLabels.size > 0 && (
                        <motion.div
                            initial={isMounted ? { opacity: 0, y: 10, height: 0 } : false}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: 10, height: 0 }}
                            className="mb-3 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-purple-300 truncate">
                                        <span className="text-green-400">✓</span> {Array.from(selectedLabels.values()).join(", ")}
                                    </p>
                                    <p className="text-[10px] text-neutral-500 mt-0.5">
                                        Escribe para ser más específico sobre tus selecciones
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedLabels(new Map());
                                        setUsedActions(new Set());
                                    }}
                                    className="text-neutral-500 hover:text-red-400 transition-colors p-1"
                                    title="Limpiar selecciones"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="flex gap-2">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe tu mensaje..."
                        rows={1}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-purple-500/20 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/50 resize-none text-sm"
                    />
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSend}
                        disabled={(!input.trim() && selectedLabels.size === 0) || isLoading}
                        className="p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </motion.button>
                </div>

                {/* Review button - appears when there's progress */}
                {filledCount > 0 && (
                    <motion.button
                        initial={isMounted ? { opacity: 0, scale: 0.9 } : false}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => setShowReviewModal(true)}
                        className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium hover:from-green-500 hover:to-emerald-500 transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Revisar cotización ({filledCount}/{progressFields.length})
                    </motion.button>
                )}
            </div>

            {/* Review Modal */}
            <AnimatePresence>
                {showReviewModal && (
                    <motion.div
                        initial={isMounted ? { opacity: 0 } : false}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowReviewModal(false)}
                    >
                        <motion.div
                            initial={isMounted ? { opacity: 0, scale: 0.9, y: 20 } : false}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-neutral-900 border border-purple-500/30 rounded-2xl p-5 max-w-md w-full max-h-[80vh] overflow-y-auto"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-white">Resumen de Cotización</h3>
                                <button
                                    onClick={() => setShowReviewModal(false)}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-3">
                                {/* Client & Project */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className={`p-3 rounded-xl ${data.clientName ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/5 border border-white/10'}`}>
                                        <p className="text-[10px] text-neutral-400 uppercase">Cliente</p>
                                        <p className="text-sm text-white font-medium truncate">{data.clientName || '—'}</p>
                                    </div>
                                    <div className={`p-3 rounded-xl ${data.projectName ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/5 border border-white/10'}`}>
                                        <p className="text-[10px] text-neutral-400 uppercase">Proyecto</p>
                                        <p className="text-sm text-white font-medium truncate">{data.projectName || '—'}</p>
                                    </div>
                                </div>

                                {/* Services */}
                                <div className={`p-3 rounded-xl ${(data.items ?? []).length > 0 ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/5 border border-white/10'}`}>
                                    <p className="text-[10px] text-neutral-400 uppercase mb-2">Servicios ({(data.items ?? []).length})</p>
                                    {(data.items ?? []).length > 0 ? (
                                        <div className="space-y-1">
                                            {(data.items ?? []).map((item, i) => (
                                                <div key={i} className="flex justify-between text-sm">
                                                    <span className="text-white truncate">{item.title}</span>
                                                    <span className="text-green-400 font-medium">${item.price?.toLocaleString('es-CL')}</span>
                                                </div>
                                            ))}
                                            <div className="border-t border-white/10 pt-1 mt-2 flex justify-between text-sm font-bold">
                                                <span className="text-white">Total</span>
                                                <span className="text-green-400">${(data.items ?? []).reduce((sum, item) => sum + (item.price || 0), 0).toLocaleString('es-CL')}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-neutral-500">Sin servicios agregados</p>
                                    )}
                                </div>

                                {/* Scope & Timeline */}
                                <div className={`p-3 rounded-xl ${data.scope ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/5 border border-white/10'}`}>
                                    <p className="text-[10px] text-neutral-400 uppercase">Alcance</p>
                                    <p className="text-sm text-white">{data.scope || '—'}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className={`p-3 rounded-xl ${data.timeline ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/5 border border-white/10'}`}>
                                        <p className="text-[10px] text-neutral-400 uppercase">Plazo</p>
                                        <p className="text-sm text-white">{data.timeline || '—'}</p>
                                    </div>
                                    <div className={`p-3 rounded-xl ${data.paymentTerms ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/5 border border-white/10'}`}>
                                        <p className="text-[10px] text-neutral-400 uppercase">Pago</p>
                                        <p className="text-sm text-white">{data.paymentTerms || '—'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="mt-5 flex gap-2">
                                <button
                                    onClick={() => setShowReviewModal(false)}
                                    className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
                                >
                                    Seguir editando
                                </button>
                                {filledCount === progressFields.length && (
                                    <button
                                        onClick={() => {
                                            setShowReviewModal(false);
                                            toast.success('Cotización lista', 'Puedes guardarla desde el formulario');
                                        }}
                                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium hover:from-green-500 hover:to-emerald-500 transition-all"
                                    >
                                        ¡Está completa!
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Floating button wrapper
interface FloatingAIChatProps {
    data: QuotationData;
    updateData: (updates: Partial<QuotationData>) => void;
    // For persistence
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    usedActions: Set<string>;
    setUsedActions: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function FloatingAIChat({
    data,
    updateData,
    messages,
    setMessages,
    usedActions,
    setUsedActions,
}: FloatingAIChatProps) {
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
                <span className="text-2xl">✨</span>
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

                        {/* Panel - Mobile: Bottom sheet, Desktop: Side panel */}
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

                            {/* Gradient glow effect */}
                            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-purple-600/10 to-transparent pointer-events-none" />

                            <QuotationAIChat
                                data={data}
                                updateData={updateData}
                                onClose={() => setIsOpen(false)}
                                messages={messages}
                                setMessages={setMessages}
                                usedActions={usedActions}
                                setUsedActions={setUsedActions}
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

// Export the welcome message for initialization
export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
    {
        id: "welcome",
        role: "assistant",
        content: "¡Hola! 👋 Soy tu asistente para crear cotizaciones profesionales. Cuéntame sobre el proyecto que necesitas cotizar.",
    },
];
