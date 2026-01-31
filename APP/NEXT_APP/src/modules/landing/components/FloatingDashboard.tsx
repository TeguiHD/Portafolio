"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Shield, Server, Activity, AlertTriangle } from "lucide-react";

// Generate initial health data
function generateHealthData() {
    return Array.from({ length: 20 }, (_, i) => ({
        time: i,
        value: 30 + Math.random() * 40,
    }));
}

// Simulated threat data
const threatEvents = [
    { ip: "192.168.1.54", type: "SQL Injection", time: "hace 2m" },
    { ip: "10.0.0.123", type: "XSS Attempt", time: "hace 5m" },
    { ip: "172.16.0.88", type: "Brute Force", time: "hace 8m" },
];

// Microservices status
const microservices = [
    { name: "Auth Service", status: "online" },
    { name: "PDF Generator", status: "idle" },
    { name: "AI Rate Limit", status: "online" },
    { name: "Email Queue", status: "online" },
];

export function FloatingDashboard() {
    const [healthData, setHealthData] = useState(generateHealthData);
    const [currentCpu, setCurrentCpu] = useState(45);
    const [isMounted, setIsMounted] = useState(false);

    // Track client-side mount to prevent SSR animation mismatch
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Animate CPU chart
    useEffect(() => {
        const interval = setInterval(() => {
            setHealthData((prev) => {
                const newValue = Math.max(20, Math.min(80, prev[prev.length - 1].value + (Math.random() - 0.5) * 15));
                setCurrentCpu(Math.round(newValue));
                return [...prev.slice(1), { time: prev[prev.length - 1].time + 1, value: newValue }];
            });
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    return (
        <motion.div
            initial={isMounted ? { opacity: 0, x: 50, rotateY: -10 } : false}
            animate={{ opacity: 1, x: 0, rotateY: -5 }}
            transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
            className="relative hidden lg:block"
            style={{ perspective: "1000px" }}
        >
            {/* Main Panel - Glassmorphism */}
            <div
                className="relative w-[420px] rounded-2xl overflow-hidden"
                style={{
                    transform: "rotateY(-8deg) rotateX(2deg)",
                    transformStyle: "preserve-3d",
                }}
            >
                {/* Glass background */}
                <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl" />

                {/* Subtle glow */}
                <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 rounded-2xl blur-xl -z-10" />

                <div className="relative p-5 space-y-5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                                System Monitor
                            </span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-600">LIVE</span>
                    </div>

                    {/* Server Health */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Server className="w-4 h-4 text-blue-400" />
                                <span className="text-sm font-medium text-white">Server Health</span>
                            </div>
                            <span className="text-sm font-mono text-blue-400">{currentCpu}% CPU</span>
                        </div>
                        <div className="h-16 w-full" style={{ minWidth: 200, minHeight: 64 }}>
                            <ResponsiveContainer width="100%" height="100%">
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

                    {/* Threat Monitor */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-red-400" />
                            <span className="text-sm font-medium text-white">Threat Monitor</span>
                        </div>
                        <div className="space-y-1.5">
                            {threatEvents.slice(0, 2).map((threat, i) => (
                                <motion.div
                                    key={i}
                                    initial={isMounted ? { opacity: 0, x: -10 } : false}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.8 + i * 0.15 }}
                                    className="flex items-center justify-between text-xs bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-3 h-3 text-red-400" />
                                        <span className="text-gray-400">
                                            <span className="text-red-400 font-mono">{threat.ip}</span>
                                            {" - "}{threat.type}
                                        </span>
                                    </div>
                                    <span className="text-gray-600">{threat.time}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Active Microservices */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm font-medium text-white">Microservices</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {microservices.map((service, i) => (
                                <motion.div
                                    key={service.name}
                                    initial={isMounted ? { opacity: 0, scale: 0.9 } : false}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 1 + i * 0.1 }}
                                    className="flex items-center gap-2 text-xs bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2"
                                >
                                    <div
                                        className={`w-1.5 h-1.5 rounded-full ${service.status === "online"
                                            ? "bg-emerald-500 animate-pulse"
                                            : "bg-yellow-500"
                                            }`}
                                    />
                                    <span className="text-gray-400 truncate">{service.name}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Shadow/Reflection */}
            <div
                className="absolute -bottom-4 left-4 right-4 h-8 bg-gradient-to-t from-black/20 to-transparent blur-xl rounded-full"
                style={{ transform: "rotateY(-8deg)" }}
            />
        </motion.div>
    );
}
