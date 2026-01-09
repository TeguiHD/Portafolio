"use client";

import Link from "next/link";
import { type ToolAccessType } from "@/hooks/useToolAccess";

interface ToolAccessBlockedProps {
    accessType: ToolAccessType;
    toolName?: string;
}

export function ToolAccessBlocked({ accessType, toolName = "Herramienta" }: ToolAccessBlockedProps) {
    // Determine content based on access type
    const getContent = () => {
        switch (accessType) {
            case "private":
                return {
                    title: "Herramienta en Mantenimiento",
                    description: `${toolName} no está disponible públicamente en este momento. Estamos realizando mejoras.`,
                    icon: (
                        <svg className="w-16 h-16 text-yellow-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    ),
                    action: null
                };
            case "admin_only":
                return {
                    title: "Acceso Restringido",
                    description: `Esta herramienta es solo para administradores. Por favor inicia sesión para continuar.`,
                    icon: (
                        <svg className="w-16 h-16 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    ),
                    action: (
                        <Link href={"/admin/login" as any} className="px-6 py-2.5 rounded-xl bg-accent-1 text-white font-medium hover:bg-opacity-90 transition-all">
                            Iniciar Sesión
                        </Link>
                    )
                };
            case "blocked":
                return {
                    title: "Acceso Bloqueado",
                    description: "Tu acceso a esta herramienta ha sido bloqueado temporalmente por seguridad.",
                    icon: (
                        <svg className="w-16 h-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                    ),
                    action: null
                };
            default: // error or unknown
                return {
                    title: "No Disponible",
                    description: "No se pudo verificar el acceso a la herramienta. Por favor intenta más tarde.",
                    icon: (
                        <svg className="w-16 h-16 text-neutral-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                    action: (
                        <button onClick={() => window.location.reload()} className="px-6 py-2.5 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-all">
                            Reintentar
                        </button>
                    )
                };
        }
    };

    const content = getContent();

    return (
        <div className="min-h-screen bg-[#0F1724] flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                <div className="flex justify-center">{content.icon}</div>
                <h1 className="text-2xl font-bold text-white mb-3">{content.title}</h1>
                <p className="text-neutral-400 mb-8 leading-relaxed">{content.description}</p>

                <div className="flex flex-col gap-3 justify-center items-center">
                    {content.action}

                    <Link href="/herramientas" className="text-sm text-neutral-500 hover:text-white transition-colors flex items-center gap-2 mt-4">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver a herramientas
                    </Link>
                </div>
            </div>
        </div>
    );
}
