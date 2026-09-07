"use client";

import { motion } from "framer-motion";
import { useMotionActivity } from "../motion/LandingMotionProvider";
import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Shield, Server, Activity, AlertTriangle } from "lucide-react";

// Generate initial health data
function generateHealthData() {
    return Array.from({ length: 20 }, (_, i) => ({
        time: i,
        value: [38, 44, 41, 58, 52, 48, 61, 56, 45, 50, 62, 57, 53, 42, 48, 56, 51, 46, 49, 45][i],
    }));
}

// Simulated threat data
const threatEvents = [
    { ip: "192.168.1.54", type: "Inyección SQL", time: "hace 2 min" },
    { ip: "10.0.0.123", type: "Intento de XSS", time: "hace 5 min" },
    { ip: "172.16.0.88", type: "Fuerza bruta", time: "hace 8 min" },
];

// Microservices status
const microservices = [
    { name: "Autenticación", status: "online" },
    { name: "Generador PDF", status: "idle" },
    { name: "Control de uso IA", status: "online" },
    { name: "Envío de correos", status: "online" },
];

export function FloatingDashboard() {
    const [healthData, setHealthData] = useState(generateHealthData);
    const { ref, active } = useMotionActivity();
    const currentCpu = Math.round(healthData[healthData.length - 1].value);
    const [isMounted, setIsMounted] = useState(false);

    // Track client-side mount to prevent SSR animation mismatch
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Animate CPU chart
    useEffect(() => {
        if (!active) return;
        const interval = setInterval(() => {
            setHealthData((prev) => {
                const newValue = Math.max(20, Math.min(80, prev[prev.length - 1].value + (Math.random() - 0.5) * 15));
                return [...prev.slice(1), { time: prev[prev.length - 1].time + 1, value: newValue }];
            });
        }, 1500);
        return () => clearInterval(interval);
    }, [active]);

    return (
        <div
            ref={ref}
            data-motion-active={active}
            data-dashboard-demo
            className="relative w-full"
        >
            {/* Main Panel - Glassmorphism */}
            <div
                className="relative w-full overflow-hidden rounded-2xl border border-white/15 bg-[#111827]/95 shadow-2xl shadow-black/20"
            >
                <div className="relative p-5 space-y-5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                                Monitor del sistema
                            </span>
                        </div>
                    </div>

                    {/* Estado del servidor */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Server className="w-4 h-4 text-blue-400" />
                                <span className="text-sm font-medium text-white">Estado del servidor</span>
                            </div>
                            <span className="text-sm font-mono text-blue-400">{currentCpu}% CPU</span>
                        </div>
                        <div className="h-16 w-full" style={{ minWidth: 200, minHeight: 64 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                <LineChart data={healthData}>
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        dot={false}
                                        isAnimationActive={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Eventos de seguridad */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-red-400" />
                            <span className="text-sm font-medium text-white">Eventos de seguridad</span>
                        </div>
                        <div className="space-y-1.5">
                            {threatEvents.slice(0, 2).map((threat, i) => (
                                <motion.div
                                    key={i}
                                    initial={isMounted && active ? { opacity: 0, x: -10 } : false}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: active ? 0.3 : 0, delay: active ? 0.1 + i * 0.05 : 0 }}
                                    className="flex items-center justify-between text-xs gap-2 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2"
                                >
                                    <div className="flex min-w-0 items-center gap-2">
                                        <AlertTriangle className="w-3 h-3 shrink-0 text-red-400" />
                                        <span className="min-w-0"><span className="block text-slate-200">{threat.type}</span><span className="mt-0.5 block font-mono text-[11px] text-slate-400">{threat.ip}</span></span>
                                    </div>
                                    <span className="text-slate-400 whitespace-nowrap">{threat.time}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Active Microservices */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm font-medium text-white">Servicios</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {microservices.map((service, i) => (
                                <motion.div
                                    key={service.name}
                                    initial={isMounted && active ? { opacity: 0, scale: 0.9 } : false}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: active ? 0.3 : 0, delay: active ? 0.1 + i * 0.05 : 0 }}
                                    className="flex items-center gap-2 text-xs bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2"
                                >
                                    <div
                                        className={`w-1.5 h-1.5 rounded-full ${service.status === "online"
                                            ? "bg-emerald-500 animate-pulse"
                                            : "bg-yellow-500"
                                            }`}
                                    />
                                    <span className="text-slate-300 truncate">{service.name}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
