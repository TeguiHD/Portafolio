"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Terminal, QrCode, ArrowLeftRight, Lock,
    Image as ImageIcon, FileCode, ArrowUpRight
} from "lucide-react";

// Tools Data (Mock for now, would be fetched from DB)
const tools = [
    {
        id: "regex",
        title: "Regex Tester",
        desc: "Valida expresiones con IA.",
        icon: Terminal,
        gradient: "from-blue-500 to-indigo-600",
        href: "/herramientas/regex",
    },
    {
        id: "qr",
        title: "QR Generator",
        desc: "Personalizable y rápido.",
        icon: QrCode,
        gradient: "from-emerald-500 to-green-600",
        href: "/herramientas/qr",
    },
    {
        id: "units",
        title: "Conversor",
        desc: "Unidades técnicas.",
        icon: ArrowLeftRight,
        gradient: "from-orange-500 to-red-600",
        href: "/herramientas/unidades",
    },
    {
        id: "pass",
        title: "Passwords",
        desc: "Generador seguro.",
        icon: Lock,
        gradient: "from-purple-500 to-fuchsia-600",
        href: "/herramientas/claves",
    },
    {
        id: "ascii",
        title: "ASCII Art",
        desc: "Imagen a texto.",
        icon: ImageIcon,
        gradient: "from-pink-500 to-rose-600",
        href: "/herramientas/ascii",
    },
    {
        id: "base64",
        title: "Img to Base64",
        desc: "Codificador dev.",
        icon: FileCode,
        gradient: "from-cyan-500 to-blue-600",
        href: "/herramientas/base64",
    }
];

export function ToolsBeltSection() {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);
    return (
        <section id="tools-belt" className="relative py-32 px-4 sm:px-6">

            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                    <div>
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
                            Herramientas
                        </h2>
                        <p className="text-xl text-gray-400 max-w-lg">
                            Utilidades de producción. Sin registros, sin ruido.
                        </p>
                    </div>
                    <Link href="/herramientas" className="hidden md:flex items-center gap-2 text-white border-b border-white/20 pb-1 hover:border-white transition-all">
                        Ver Arsenal Completo <ArrowUpRight className="w-4 h-4" />
                    </Link>
                </div>

                {/* Premium Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {tools.map((tool, i) => (
                        <Link key={tool.id} href={tool.href as any} className="group relative block h-full">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: i * 0.05 }}
                                className="relative h-full bg-[#111] overflow-hidden rounded-3xl p-6 flex flex-col items-center justify-between text-center gap-4 border border-white/5 hover:border-white/20 transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-2xl"
                            >
                                {/* Background Glow on Hover */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

                                {/* Icon Container */}
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.gradient} p-[1px] shadow-lg`}>
                                    <div className="w-full h-full bg-[#151515] rounded-[15px] flex items-center justify-center relative overflow-hidden">
                                        <tool.icon className="w-6 h-6 text-white z-10" />
                                        {/* Inner Shine */}
                                        <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-20`} />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-bold text-white text-base mb-1">{tool.title}</h3>
                                    <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">{tool.desc}</p>
                                </div>

                                {/* Action Hint */}
                                <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 bg-white/5">
                                    <ArrowUpRight className="w-4 h-4 text-white" />
                                </div>

                            </motion.div>
                        </Link>
                    ))}
                </div>

                {/* Mobile Link */}
                <div className="mt-12 text-center md:hidden">
                    <Link href={"/herramientas" as any} className="inline-block text-sm font-medium text-white border border-white/20 px-6 py-3 rounded-full hover:bg-white hover:text-black transition-colors">
                        Explorar todas las herramientas
                    </Link>
                </div>

            </div>

        </section>
    );
}
