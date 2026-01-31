"use client";

import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
    Terminal, QrCode, ArrowLeftRight, Lock,
    FileCode, ArrowUpRight,
    Link2, Sparkles, Zap
} from "lucide-react";

// Tools Data - Ordered by expected usage (most popular first)
// Featured tools get bigger cards in the bento grid
const tools = [
    {
        id: "qr",
        title: "QR Generator",
        desc: "Códigos QR personalizables. Sin marcas de agua, descarga instantánea.",
        longDesc: "Genera códigos QR profesionales con colores personalizados, logos y múltiples formatos de exportación.",
        icon: QrCode,
        gradient: "from-emerald-400 via-emerald-500 to-teal-600",
        glowColor: "rgba(16, 185, 129, 0.4)",
        href: "/herramientas/qr",
        featured: true,
        tag: "Popular",
    },
    {
        id: "pass",
        title: "Generador de Contraseñas",
        desc: "Contraseñas seguras al instante. Configura longitud y complejidad.",
        longDesc: "Genera contraseñas criptográficamente seguras con control total sobre caracteres especiales, números y longitud.",
        icon: Lock,
        gradient: "from-violet-400 via-purple-500 to-fuchsia-600",
        glowColor: "rgba(139, 92, 246, 0.4)",
        href: "/herramientas/claves",
        featured: true,
        tag: "Seguridad",
    },
    {
        id: "units",
        title: "Conversor de Unidades",
        desc: "Longitud, peso, temperatura, datos y más.",
        longDesc: "Conversiones precisas entre sistemas métrico e imperial para desarrollo y cálculos técnicos.",
        icon: ArrowLeftRight,
        gradient: "from-orange-400 via-orange-500 to-red-500",
        glowColor: "rgba(249, 115, 22, 0.4)",
        href: "/herramientas/unidades",
        featured: false,
        tag: "Útil",
    },
    {
        id: "regex",
        title: "Regex Tester",
        desc: "Valida y depura expresiones regulares en tiempo real.",
        longDesc: "Editor de regex con resaltado de coincidencias, grupos de captura y explicación de patrones.",
        icon: Terminal,
        gradient: "from-blue-400 via-blue-500 to-indigo-600",
        glowColor: "rgba(59, 130, 246, 0.4)",
        href: "/herramientas/regex",
        featured: false,
        tag: "Dev",
    },
    {
        id: "base64",
        title: "Base64 Encoder",
        desc: "Codifica imágenes y texto para desarrollo web.",
        longDesc: "Convierte imágenes a data URIs y codifica/decodifica texto Base64 al instante.",
        icon: FileCode,
        gradient: "from-cyan-400 via-cyan-500 to-blue-600",
        glowColor: "rgba(6, 182, 212, 0.4)",
        href: "/herramientas/base64",
        featured: false,
        tag: "Dev",
    },
    {
        id: "enlaces",
        title: "Link Generator",
        desc: "WhatsApp, email, calendario en un clic.",
        longDesc: "Crea enlaces directos para WhatsApp, mailto y eventos de calendario con parámetros preconfigurados.",
        icon: Link2,
        gradient: "from-pink-400 via-pink-500 to-rose-600",
        glowColor: "rgba(236, 72, 153, 0.4)",
        href: "/herramientas/enlaces",
        featured: false,
        tag: "Marketing",
    },
];

// 3D Card tilt effect hook
function useTilt(_ref: React.RefObject<HTMLDivElement | null>) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
    const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["8deg", "-8deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-8deg", "8deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return { rotateX, rotateY, handleMouseMove, handleMouseLeave };
}

// Featured Tool Card Component
function FeaturedToolCard({ tool, index }: { tool: typeof tools[0]; index: number }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const { rotateX, rotateY, handleMouseMove, handleMouseLeave } = useTilt(cardRef);
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Link href={tool.href as never} className="block md:col-span-1">
            <motion.div
                ref={cardRef}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: index * 0.1, ease: [0.21, 1.11, 0.81, 0.99] }}
                style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                onMouseMove={handleMouseMove}
                onMouseLeave={(_e) => {
                    handleMouseLeave();
                    setIsHovered(false);
                }}
                onMouseEnter={() => setIsHovered(true)}
                className="group relative h-full min-h-[280px] rounded-2xl overflow-hidden cursor-pointer"
            >
                {/* Animated gradient border */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                {/* Inner card */}
                <div className="absolute inset-[1px] rounded-2xl bg-[#0A0A0F] overflow-hidden">
                    {/* Glow effect */}
                    <motion.div
                        className="absolute -inset-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                        animate={isHovered ? {
                            background: [
                                `radial-gradient(600px circle at 50% 50%, ${tool.glowColor}, transparent 40%)`,
                                `radial-gradient(600px circle at 30% 30%, ${tool.glowColor}, transparent 40%)`,
                                `radial-gradient(600px circle at 70% 70%, ${tool.glowColor}, transparent 40%)`,
                                `radial-gradient(600px circle at 50% 50%, ${tool.glowColor}, transparent 40%)`,
                            ]
                        } : {}}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    />

                    {/* Grid pattern overlay */}
                    <div
                        className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity"
                        style={{
                            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                            backgroundSize: "30px 30px",
                        }}
                    />

                    {/* Content */}
                    <div className="relative h-full p-6 flex flex-col justify-between z-10" style={{ transform: "translateZ(30px)" }}>
                        {/* Header */}
                        <div className="flex items-start justify-between">
                            {/* Icon with gradient background */}
                            <motion.div
                                className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.gradient} p-[1px] shadow-lg`}
                                animate={isHovered ? { scale: [1, 1.05, 1], rotate: [0, 5, 0] } : {}}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="w-full h-full bg-[#0A0A0F]/90 rounded-[11px] flex items-center justify-center backdrop-blur-sm">
                                    <tool.icon className="w-6 h-6 text-white" />
                                </div>
                            </motion.div>

                            {/* Tag */}
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-to-r ${tool.gradient} text-white shadow-lg`}>
                                {tool.tag}
                            </span>
                        </div>

                        {/* Text */}
                        <div className="mt-auto">
                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all duration-300">
                                {tool.title}
                            </h3>
                            <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors line-clamp-2">
                                {tool.longDesc}
                            </p>
                        </div>

                        {/* Action indicator */}
                        <motion.div
                            className="absolute bottom-6 right-6 w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-sm"
                            initial={{ opacity: 0, scale: 0.8, x: 10 }}
                            animate={isHovered ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.8, x: 10 }}
                            transition={{ duration: 0.3 }}
                        >
                            <ArrowUpRight className="w-5 h-5 text-white" />
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}

// Standard Tool Card Component
function ToolCard({ tool, index }: { tool: typeof tools[0]; index: number }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Link href={tool.href as never} className="block">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.08 }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="group relative h-full min-h-[180px] rounded-xl overflow-hidden cursor-pointer"
            >
                {/* Border gradient */}
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                {/* Inner card */}
                <div className="absolute inset-[1px] rounded-xl bg-[#0A0A0F]/95 backdrop-blur-sm overflow-hidden">
                    {/* Subtle glow */}
                    <motion.div
                        className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                        style={{
                            background: `radial-gradient(ellipse at center, ${tool.glowColor}, transparent 70%)`
                        }}
                    />

                    {/* Content */}
                    <div className="relative h-full p-5 flex flex-col z-10">
                        {/* Top row: icon + tag */}
                        <div className="flex items-center justify-between mb-4">
                            <motion.div
                                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tool.gradient} p-[1px]`}
                                animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="w-full h-full bg-[#0A0A0F] rounded-[7px] flex items-center justify-center">
                                    <tool.icon className="w-4 h-4 text-white" />
                                </div>
                            </motion.div>
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 group-hover:text-gray-400 transition-colors">
                                {tool.tag}
                            </span>
                        </div>

                        {/* Title & description */}
                        <div className="flex-1">
                            <h3 className="text-base font-bold text-white mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all">
                                {tool.title}
                            </h3>
                            <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors line-clamp-2">
                                {tool.desc}
                            </p>
                        </div>

                        {/* Arrow indicator */}
                        <motion.div
                            className="self-end mt-3"
                            initial={{ opacity: 0, x: -10 }}
                            animate={isHovered ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ArrowUpRight className="w-4 h-4 text-white/60" />
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}

export function ToolsBeltSection() {
    const [_isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const featuredTools = tools.filter(t => t.featured);
    const standardTools = tools.filter(t => !t.featured);

    return (
        <section id="tools-belt" className="relative py-24 md:py-32 px-4 sm:px-6 overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 -z-10">
                {/* Gradient orbs */}
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] animate-pulse-slow" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: "2s" }} />
            </div>

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-16 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        {/* Terminal-style badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg mb-4">
                            <Zap className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-xs font-mono text-emerald-400">Utilidades gratuitas</span>
                        </div>

                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-4">
                            Herramientas
                            <span className="block text-gray-500 text-3xl md:text-4xl lg:text-5xl font-light mt-1">de Producción</span>
                        </h2>
                        <p className="text-lg text-gray-400 max-w-xl">
                            Sin registro. Sin marcas de agua. Sin complicaciones.
                            <span className="text-white font-medium"> Solo resultados.</span>
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <Link
                            href="/herramientas"
                            className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/20 text-white hover:bg-white hover:text-black transition-all duration-300 group"
                        >
                            <span className="font-medium">Ver Arsenal Completo</span>
                            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </Link>
                    </motion.div>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
                    {/* Featured tools - larger cards */}
                    {featuredTools.map((tool, i) => (
                        <FeaturedToolCard key={tool.id} tool={tool} index={i} />
                    ))}
                </div>

                {/* Standard tools grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    {standardTools.map((tool, i) => (
                        <ToolCard key={tool.id} tool={tool} index={i} />
                    ))}
                </div>

                {/* Mobile CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="mt-10 text-center md:hidden"
                >
                    <Link
                        href="/herramientas"
                        className="inline-flex items-center justify-center gap-2 w-full max-w-sm px-6 py-3.5 rounded-full bg-white text-black font-semibold hover:bg-gray-100 transition-colors"
                    >
                        <Sparkles className="w-4 h-4" />
                        Explorar Todas las Herramientas
                    </Link>
                </motion.div>

                {/* Bottom decorative element */}
                <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    whileInView={{ opacity: 1, scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="hidden md:block mt-16 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
                />
            </div>
        </section>
    );
}
