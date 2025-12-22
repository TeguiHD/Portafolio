"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Lock, CreditCard, Activity, ShieldCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

const modules = [
    {
        id: "finance",
        title: "Control Financiero",
        subtitle: "Dashboard & Proyecciones",
        description: "Gestión de ingresos, egresos y previsión de flujo de caja con reportes en tiempo real.",
        icon: CreditCard,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
        border: "group-hover:border-emerald-500/50"
    },
    {
        id: "cv",
        title: "Talent Manager",
        subtitle: "IA CV Optimizer",
        description: "Análisis automatizado de perfiles y optimización de CVs para maximizar conversión.",
        icon: Activity,
        color: "text-purple-500",
        bg: "bg-purple-500/10",
        border: "group-hover:border-purple-500/50"
    },
    {
        id: "audit",
        title: "Security Audit",
        subtitle: "Logs & RBAC",
        description: "Trazabilidad completa de acciones y control de acceso basado en roles granulares.",
        icon: ShieldCheck,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        border: "group-hover:border-blue-500/50"
    }
];

export function ForbiddenVaultSection() {
    return (
        <section id="vault" className="relative py-32 px-4 sm:px-6">

            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.05),transparent_50%)] -z-10" />

            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-950/30 border border-amber-500/20 text-amber-500 rounded-full text-xs font-bold tracking-wider uppercase">
                            <Lock className="w-3 h-3" />
                            Restricted Area
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                            Infraestructura <span className="text-amber-500">Privada</span>
                        </h2>
                        <p className="text-lg text-gray-400 max-w-xl">
                            Módulos de alto rendimiento para gestión crítica. Solo clientes activos.
                        </p>
                    </div>

                    <Link href="#contact">
                        <Button variant="outline" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
                            Solicitar Acceso <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                </div>

                {/* Visible Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                    {modules.map((mod, i) => (
                        <motion.div
                            key={mod.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            viewport={{ once: true }}
                            className={`group relative bg-[#0a0a0a] border border-white/5 rounded-2xl p-8 hover:bg-[#111] transition-all duration-300 ${mod.border}`}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className={`w-12 h-12 rounded-xl ${mod.bg} ${mod.color} flex items-center justify-center`}>
                                    <mod.icon className="w-6 h-6" />
                                </div>
                                <Lock className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">{mod.title}</h3>
                            <p className="text-sm text-gray-400 mb-4">{mod.subtitle}</p>
                            <p className="text-sm text-gray-500 leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity">
                                {mod.description}
                            </p>

                            {/* Lock Overlay Hint */}
                            <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[1px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-2xl cursor-not-allowed">
                                <div className="bg-black border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 text-xs font-mono text-white">
                                    <Lock className="w-3 h-3" />
                                    ACCESS DENIED
                                </div>
                            </div>

                        </motion.div>
                    ))}
                </div>

            </div>
        </section>
    );
}
