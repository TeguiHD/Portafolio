"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ListChecks, Loader2, Send, X } from "lucide-react";
import type { QuotationData, QuotationItem } from "../types";
import { v4 as uuidv4 } from "uuid";
import { projectTypes, type ProjectType } from "../templates/quotation-templates";
import { useToast } from "@/components/ui/Toast";
import Ventana from "./Ventana";
import { BARRA, BOTON, BOTON_ICONO, BOTON_PELIGRO, BOTON_SEC, CAMPO, FOCO, SOBRE } from "../estilos";

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

/** Desplazamiento suave, salvo que se pida menos movimiento. */
const suave = (): ScrollBehavior =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

const WELCOME_MESSAGE: ChatMessage = {
    id: "welcome",
    role: "assistant",
    content: "Hola. Te ayudo a armar la propuesta. ¿Qué tipo de proyecto es?",
    actions: [
        { type: "set_type", label: "Landing page", data: { projectType: "landing", priceRange: "$150-300k" } },
        { type: "set_type", label: "Sitio web", data: { projectType: "website", priceRange: "$300-600k" } },
        { type: "set_type", label: "E-commerce", data: { projectType: "ecommerce", priceRange: "$600k-1.5M" } },
        { type: "set_type", label: "Aplicación web", data: { projectType: "webapp", priceRange: "$400k-1M" } },
        { type: "set_type", label: "Mantenimiento", data: { projectType: "maintenance", priceRange: "$80-150k/mes" } },
        { type: "set_type", label: "Rediseño", data: { projectType: "redesign", priceRange: "$200-400k" } },
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
    const [_isLoadingSession, setIsLoadingSession] = useState(true);

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
        messagesEndRef.current?.scrollIntoView({ behavior: suave() });
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
                messagesEndRef.current?.scrollIntoView({ behavior: suave() });
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

    const campoEditado = editingField !== null ? progressFields[editingField] : null;
    const total = (data.items ?? []).reduce((sum, item) => sum + (item.price || 0), 0);
    // Las etiquetas que manda la IA pueden traer un emoji al inicio: se muestra solo el texto.
    const sinEmoji = (texto: string) => texto.replace(/^(?:\p{Extended_Pictographic}|\uFE0F|\u200D|\s)+/u, "");

    return (
        <div className="flex h-full flex-col">
            {/* Cabecera: avance de la propuesta */}
            <div className="border-b border-[var(--linea)] px-4 py-3">
                <div className="mb-1.5 flex items-center justify-between">
                    <p id="avance-asistente" className="text-xs text-[var(--mut)]">Avance</p>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium tabular-nums text-[var(--txt)]">{filledCount} de {progressFields.length} datos</span>
                        {onClose && (
                            <button type="button" onClick={onClose} aria-label="Cerrar el asistente" className={BOTON_ICONO}>
                                <X size={16} aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </div>
                <div className={BARRA} role="progressbar" aria-labelledby="avance-asistente" aria-valuenow={filledCount} aria-valuemin={0} aria-valuemax={progressFields.length}>
                    <div className="h-full rounded-full bg-[var(--acento)] transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${progressPercent}%` }} />
                </div>
                {/* Un botón por dato: muestra si está listo y permite editarlo */}
                <div className="mt-2 flex gap-1">
                    {progressFields.map((field, i) => (
                        <button
                            type="button"
                            key={field.key}
                            onClick={() => {
                                setEditingField(i);
                                setEditValue(field.value || "");
                            }}
                            aria-pressed={editingField === i}
                            title={`${field.name}${field.filled && field.value ? `: ${field.value.length > 30 ? field.value.slice(0, 30) + "…" : field.value}` : ": falta"}`}
                            className={`flex min-h-8 flex-1 items-center justify-center gap-1 rounded-md px-1 text-[11px] transition-colors duration-150 ${FOCO} ${field.filled
                                ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                : `bg-[color-mix(in_srgb,var(--txt)_5%,transparent)] text-[var(--mut)] ${SOBRE}`
                                }`}
                        >
                            {field.filled && <Check size={10} aria-hidden="true" className="shrink-0" />}
                            <span className="truncate">{field.name}</span>
                            <span className="sr-only">{field.filled ? ", listo" : ", falta"}. Editar</span>
                        </button>
                    ))}
                </div>

                {campoEditado && editingField !== null && (
                    <div className="mt-3 rounded-lg border border-[var(--linea-2)] p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-medium text-[var(--txt)]">{campoEditado.name}</p>
                            <button type="button" onClick={() => setEditingField(null)} aria-label="Cerrar la edición" className={BOTON_ICONO}>
                                <X size={16} aria-hidden="true" />
                            </button>
                        </div>
                        {campoEditado.key === "items" ? (
                            <div className="text-sm text-[var(--txt)]">
                                {(data.items ?? []).length > 0 ? (
                                    <ul className="space-y-1">
                                        {(data.items ?? []).map((item, idx) => (
                                            <li key={idx} className="flex justify-between gap-2">
                                                <span className="truncate">{item.title}</span>
                                                <span className="tabular-nums text-emerald-400">${item.price?.toLocaleString('es-CL')}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <span className="text-[var(--mut)]">Sin servicios: agrégalos en el chat.</span>
                                )}
                            </div>
                        ) : (
                            <>
                                <label htmlFor="dato-asistente" className="sr-only">{campoEditado.name}</label>
                                <input
                                    id="dato-asistente"
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && editValue.trim()) {
                                            updateData({ [campoEditado.key]: editValue.trim() });
                                            toast.success("Actualizado", `${campoEditado.name}: ${editValue.trim()}`);
                                            setEditingField(null);
                                        }
                                    }}
                                    placeholder={`Escribe ${campoEditado.name.toLowerCase()}`}
                                    className={CAMPO}
                                    autoFocus
                                />
                                <div className="mt-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (editValue.trim()) {
                                                updateData({ [campoEditado.key]: editValue.trim() });
                                                toast.success("Actualizado", `${campoEditado.name}: ${editValue.trim()}`);
                                            }
                                            setEditingField(null);
                                        }}
                                        className={`${BOTON} flex-1`}
                                    >
                                        Guardar
                                    </button>
                                    {campoEditado.filled && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                updateData({ [campoEditado.key]: "" });
                                                toast.info("Borrado", campoEditado.name);
                                                setEditingField(null);
                                            }}
                                            className={BOTON_PELIGRO}
                                        >
                                            Borrar
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Mensajes */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite" aria-busy={isLoading}>
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.role === "user"
                                ? "bg-[var(--acento)] text-[var(--acento-tinta)]"
                                : "bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] text-[var(--txt)]"
                                }`}
                        >
                            <p className="whitespace-pre-wrap text-sm">{msg.role === "assistant" ? sinEmoji(msg.content) : msg.content}</p>

                            {msg.actions && msg.actions.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {msg.actions
                                        .filter(action => action && (action.label || action.type)) // Filter out empty actions
                                        .map((action, i) => {
                                            const actionKey = `${msg.id}-${i}`;
                                            const isUsed = usedActions.has(actionKey);
                                            const displayLabel = sinEmoji(action.label || action.type || "Acción");

                                            return (
                                                <button
                                                    type="button"
                                                    key={i}
                                                    onClick={() => handleApplyAction(action, msg.id, i)}
                                                    disabled={isUsed}
                                                    aria-pressed={isUsed}
                                                    className={`flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors duration-150 ${FOCO} ${isUsed
                                                        ? "cursor-default border-transparent bg-emerald-500/10 text-emerald-400"
                                                        : `border-[var(--linea-2)] bg-[var(--sup)] text-[var(--txt)] hover:border-[var(--acento)]`
                                                        }`}
                                                >
                                                    {isUsed && <Check size={14} aria-hidden="true" />}
                                                    {displayLabel}
                                                </button>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div role="status" className="flex items-center gap-2 rounded-2xl bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] px-4 py-3 text-sm text-[var(--mut)]">
                            <Loader2 size={14} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                            Pensando…
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Sugerencias iniciales */}
            {messages.length === 1 && (
                <div className="px-4 pb-2">
                    <p className="mb-2 text-xs text-[var(--mut)]">Sugerencias:</p>
                    <div className="flex flex-wrap gap-2">
                        {[
                            "Necesito un e-commerce",
                            "Quiero una landing page",
                            "Una aplicación web",
                            "Rediseño de sitio",
                        ].map((suggestion) => (
                            <button
                                type="button"
                                key={suggestion}
                                onClick={() => setInput(suggestion)}
                                className={`min-h-9 rounded-full border border-[var(--linea-2)] px-3 text-xs text-[var(--mut)] transition-colors duration-150 hover:text-[var(--txt)] ${SOBRE} ${FOCO}`}
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Escribir */}
            <div className="border-t border-[var(--linea)] p-4">
                {selectedLabels.size > 0 && (
                    <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-[color-mix(in_srgb,var(--acento)_10%,transparent)] px-3 py-2">
                        <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-1 truncate text-xs text-[var(--txt)]">
                                <Check size={12} aria-hidden="true" className="shrink-0 text-emerald-400" /> {Array.from(selectedLabels.values()).join(", ")}
                            </p>
                            <p className="mt-0.5 text-[11px] text-[var(--mut)]">
                                Escribe algo más para precisar lo que elegiste
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedLabels(new Map());
                                setUsedActions(new Set());
                            }}
                            aria-label="Quitar lo seleccionado"
                            className={`${BOTON_ICONO} hover:text-red-400`}
                        >
                            <X size={14} aria-hidden="true" />
                        </button>
                    </div>
                )}
                <div className="flex gap-2">
                    <label htmlFor="mensaje-asistente" className="sr-only">Mensaje para el asistente</label>
                    <textarea
                        id="mensaje-asistente"
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe tu mensaje…"
                        rows={1}
                        className={`${CAMPO} min-w-0 flex-1 resize-none`}
                    />
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={(!input.trim() && selectedLabels.size === 0) || isLoading}
                        aria-label="Enviar"
                        className={BOTON}
                    >
                        <Send size={16} aria-hidden="true" />
                    </button>
                </div>

                {filledCount > 0 && (
                    <button
                        type="button"
                        onClick={() => setShowReviewModal(true)}
                        className={`${BOTON_SEC} mt-3 w-full`}
                    >
                        <ListChecks size={16} aria-hidden="true" />
                        Revisar lo que lleva ({filledCount} de {progressFields.length})
                    </button>
                )}
            </div>

            {showReviewModal && (
                <Ventana titulo="Resumen de la propuesta" alCerrar={() => setShowReviewModal(false)} ancho="max-w-md">
                    {(cerrar) => (
                        <>
                            <dl className="border-t border-[var(--linea)] text-sm">
                                {[
                                    { nombre: "Cliente", valor: data.clientName },
                                    { nombre: "Proyecto", valor: data.projectName },
                                    { nombre: "Alcance", valor: data.scope },
                                    { nombre: "Plazo", valor: data.timeline },
                                    { nombre: "Pago", valor: data.paymentTerms },
                                ].map((f) => (
                                    <div key={f.nombre} className="grid grid-cols-[96px_1fr] gap-3 border-b border-[var(--linea)] py-2.5">
                                        <dt className="flex items-center gap-1.5 text-[var(--mut)]">
                                            {f.valor ? <Check size={12} aria-hidden="true" className="text-emerald-400" /> : <span aria-hidden="true" className="inline-block w-3" />}
                                            {f.nombre}
                                        </dt>
                                        <dd className="min-w-0 break-words text-[var(--txt)]">{f.valor || <span className="text-[var(--mut)]">Falta</span>}</dd>
                                    </div>
                                ))}
                                <div className="grid grid-cols-[96px_1fr] gap-3 border-b border-[var(--linea)] py-2.5">
                                    <dt className="flex items-center gap-1.5 text-[var(--mut)]">
                                        {(data.items ?? []).length > 0 ? <Check size={12} aria-hidden="true" className="text-emerald-400" /> : <span aria-hidden="true" className="inline-block w-3" />}
                                        Servicios
                                    </dt>
                                    <dd className="min-w-0">
                                        {(data.items ?? []).length > 0 ? (
                                            <ul className="space-y-1">
                                                {(data.items ?? []).map((item, i) => (
                                                    <li key={i} className="flex justify-between gap-2">
                                                        <span className="truncate text-[var(--txt)]">{item.title}</span>
                                                        <span className="shrink-0 tabular-nums text-[var(--txt)]">${item.price?.toLocaleString('es-CL')}</span>
                                                    </li>
                                                ))}
                                                <li className="flex justify-between gap-2 border-t border-[var(--linea)] pt-1 font-semibold">
                                                    <span className="text-[var(--txt)]">Total</span>
                                                    <span className="tabular-nums text-[var(--txt)]">${total.toLocaleString('es-CL')}</span>
                                                </li>
                                            </ul>
                                        ) : (
                                            <span className="text-[var(--mut)]">Falta</span>
                                        )}
                                    </dd>
                                </div>
                            </dl>

                            <div className="mt-5 flex gap-2">
                                <button type="button" onClick={cerrar} className={`${BOTON_SEC} flex-1`} data-autofocus>
                                    Seguir editando
                                </button>
                                {filledCount === progressFields.length && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            cerrar();
                                            toast.success("Propuesta lista", "Puedes publicarla desde el formulario");
                                        }}
                                        className={`${BOTON} flex-1`}
                                    >
                                        Está completa
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </Ventana>
            )}
        </div>
    );
}
