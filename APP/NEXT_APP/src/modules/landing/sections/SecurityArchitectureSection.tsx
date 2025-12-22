"use client";

import { motion } from "framer-motion";
import { Shield, Lock, Server, Globe, Database, FileKey, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

const securityFeatures = [
    "CSP con nonces dinámicos",
    "Rate limiting por endpoint",
    "Validaciones OWASP Top 10",
    "Logs de auditoría inmutables",
    "Separación de responsabilidades",
    "Encriptación en reposo (AES-256)"
];

const securityLogs = [
    { time: "12:34:01", msg: "SQL Injection blocked - IP 192.168.1.54 - Pattern: UNION SELECT", type: "error" },
    { time: "12:34:05", msg: "CSRF Token validation failed - Session terminated", type: "warning" },
    { time: "12:34:12", msg: "Auth success - User: admin_01 - 2FA Verified", type: "success" },
    { time: "12:34:15", msg: "Rate limit warning - 80/100 reqs - Bucket: API_V1", type: "info" },
    { time: "12:34:22", msg: "Middleware: Request sanitized [xss-filter]", type: "success" },
    { time: "12:34:28", msg: "Database connection pool: 45 active connections", type: "info" }
];

export function SecurityArchitectureSection() {
    const [logs, setLogs] = useState(securityLogs);

    useEffect(() => {
        const interval = setInterval(() => {
            setLogs(prev => {
                const nextLog = securityLogs[Math.floor(Math.random() * securityLogs.length)];
                // Update time to now
                const now = new Date();
                const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
                return [...prev.slice(1), { ...nextLog, time: timeStr }];
            });
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section id="architecture" className="relative py-24 px-4 sm:px-6 bg-bg-dark overflow-hidden">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="text-center mb-20">
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl lg:text-5xl font-bold text-white mb-6"
                    >
                        La seguridad no es un extra.
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
                            Es parte del diseño.
                        </span>
                    </motion.h2>
                    <p className="text-xl text-text-secondary">
                        Nada espectacular. Todo creíble.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-16 items-start">

                    {/* Left: Architecture Diagram */}
                    <div className="relative">
                        {/* Vertical Connectors */}
                        <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gradient-to-b from-blue-500/50 via-purple-500/50 to-green-500/50 hidden md:block" />

                        <div className="space-y-8 relative">
                            {/* Node 1: User */}
                            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 z-10 backdrop-blur-sm">
                                    <Globe className="w-8 h-8 text-blue-400" />
                                </div>
                                <div className="bg-bg-surface p-4 rounded-xl border border-white/5 flex-grow">
                                    <h4 className="font-bold text-white">Client / User</h4>
                                    <p className="text-sm text-text-secondary">HTTPS • TLS 1.3 • Secure Cookies</p>
                                </div>
                            </motion.div>

                            {/* Node 2: Middleware */}
                            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0 z-10 backdrop-blur-sm">
                                    <Shield className="w-8 h-8 text-purple-400" />
                                </div>
                                <div className="bg-bg-surface p-4 rounded-xl border border-white/5 flex-grow">
                                    <h4 className="font-bold text-white">Middleware & WAF</h4>
                                    <p className="text-sm text-text-secondary">Rate Limiting • CSRF Protection • Input Sanitization</p>
                                </div>
                            </motion.div>

                            {/* Node 3: RBAC */}
                            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0 z-10 backdrop-blur-sm">
                                    <FileKey className="w-8 h-8 text-orange-400" />
                                </div>
                                <div className="bg-bg-surface p-4 rounded-xl border border-white/5 flex-grow">
                                    <h4 className="font-bold text-white">RBAC & Auth</h4>
                                    <p className="text-sm text-text-secondary">User Roles • Permissions • Session Management</p>
                                </div>
                            </motion.div>

                            {/* Node 4: Database */}
                            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center shrink-0 z-10 backdrop-blur-sm">
                                    <Database className="w-8 h-8 text-green-400" />
                                </div>
                                <div className="bg-bg-surface p-4 rounded-xl border border-white/5 flex-grow">
                                    <h4 className="font-bold text-white">Isolated Database</h4>
                                    <p className="text-sm text-text-secondary">Encrypted Storage • Prepared Statements • Audit Logs</p>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Right: Practices & Logs */}
                    <div className="space-y-10">

                        {/* Practices List */}
                        <div>
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Lock className="w-5 h-5 text-emerald-400" />
                                Prácticas de Seguridad
                            </h3>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {securityFeatures.map((feat, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="flex items-center gap-3 text-sm text-gray-300"
                                    >
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                        {feat}
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Live Logs Terminal */}
                        <div className="bg-[#0D1117] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
                            <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex items-center justify-between">
                                <div className="text-xs font-mono text-gray-400">security-monitor — bash</div>
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                                </div>
                            </div>
                            <div className="p-4 font-mono text-xs h-64 overflow-y-auto space-y-2">
                                {logs.map((log, i) => (
                                    <div key={i} className="border-l-2 border-white/10 pl-2">
                                        <span className="text-gray-500">[{log.time}]</span>{" "}
                                        <span className={
                                            log.type === 'error' ? 'text-red-400 font-bold' :
                                                log.type === 'warning' ? 'text-yellow-400' :
                                                    log.type === 'success' ? 'text-green-400' : 'text-blue-400'
                                        }>
                                            {log.msg}
                                        </span>
                                    </div>
                                ))}
                                <div className="animate-pulse">_</div>
                            </div>
                        </div>

                    </div>

                </div>

            </div>
        </section>
    );
}
