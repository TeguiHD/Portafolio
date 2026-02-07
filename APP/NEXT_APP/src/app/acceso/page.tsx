"use client";

import { Suspense, useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function sanitizeCallbackUrl(raw: string | null): string {
    if (!raw) return "/admin";

    // Allow only internal relative paths (prevent open redirect)
    if (!raw.startsWith("/")) return "/admin";
    if (raw.startsWith("//")) return "/admin";
    if (raw.includes("://")) return "/admin";

    return raw;
}
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { ParticleBackground } from "@/components/ParticleBackground";
import { useToast } from "@/components/ui/Toast";

function LoginForm() {
    const searchParams = useSearchParams();
    const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const toast = useToast();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                // Log failed login attempt
                fetch("/api/audit/event", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "login.failed",
                        category: "auth",
                        metadata: { email, reason: result.error }
                    })
                }).catch(() => { }); // Fire and forget

                toast.error("Credenciales incorrectas", "Verifica tu email y contraseña");
                setLoading(false);
                return;
            }

            // Log successful login
            fetch("/api/audit/event", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "login.success",
                    category: "auth",
                    metadata: { email }
                })
            }).catch(() => { }); // Fire and forget

            toast.success("¡Bienvenido!", "Redirigiendo al panel...");

            // Hard redirect to ensure session is picked up by middleware
            setTimeout(() => {
                window.location.href = callbackUrl;
            }, 500);
        } catch {
            toast.error("Error", "No se pudo iniciar sesión");
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={isMounted ? { opacity: 0, y: 20, scale: 0.95 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 w-full max-w-md"
        >
            <div className="glass-panel rounded-3xl border border-accent-1/20 p-8 shadow-2xl">
                {/* Logo */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={isMounted ? { scale: 0 } : false}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.2 }}
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-1/20 to-accent-2/20 border border-accent-1/30 mb-4"
                    >
                        <span className="text-2xl font-bold text-accent-1">NL</span>
                    </motion.div>
                    <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                    <p className="text-sm text-neutral-400 mt-2">
                        Inicia sesión para acceder al panel
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-accent-1/20 text-white placeholder-neutral-500 focus:outline-none focus:border-accent-1/50 focus:ring-2 focus:ring-accent-1/20 transition-all"
                            placeholder="tu@email.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                            Contraseña
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-accent-1/20 text-white placeholder-neutral-500 focus:outline-none focus:border-accent-1/50 focus:ring-2 focus:ring-accent-1/20 transition-all"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-accent-1 transition-colors"
                                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            >
                                {showPassword ? (
                                    <EyeOff className="w-5 h-5" />
                                ) : (
                                    <Eye className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-accent-1 to-accent-2 text-black font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(124,242,212,0.3)] hover:shadow-[0_15px_40px_rgba(124,242,212,0.4)]"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Iniciando sesión...
                            </span>
                        ) : (
                            "Iniciar Sesión"
                        )}
                    </motion.button>
                </form>

                {/* Back link */}
                <div className="mt-6 text-center">
                    <a
                        href="/"
                        className="text-sm text-accent-1/70 hover:text-accent-1 transition-colors"
                    >
                        ← Volver al portafolio
                    </a>
                </div>
            </div>
        </motion.div>
    );
}

function LoginFallback() {
    return (
        <div className="relative z-10 w-full max-w-md">
            <div className="glass-panel rounded-3xl border border-accent-1/20 p-8 shadow-2xl animate-pulse">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4" />
                    <div className="h-6 bg-white/10 rounded w-48 mx-auto mb-2" />
                    <div className="h-4 bg-white/5 rounded w-64 mx-auto" />
                </div>
                <div className="space-y-6">
                    <div className="h-12 bg-white/5 rounded-xl" />
                    <div className="h-12 bg-white/5 rounded-xl" />
                    <div className="h-12 bg-white/10 rounded-xl" />
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="relative min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#050912] via-[#0c1224] to-[#050912]">
            <ParticleBackground particleCount={20} />
            <Suspense fallback={<LoginFallback />}>
                <LoginForm />
            </Suspense>
        </div>
    );
}
