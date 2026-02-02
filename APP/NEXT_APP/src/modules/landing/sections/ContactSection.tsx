"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { AlertCircle, CheckCircle2, Send, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";

type FormStatus = "idle" | "sending" | "success" | "error";

export function ContactSection() {
  const [isMounted, setIsMounted] = useState(false);
  const [formStartTime, setFormStartTime] = useState<number>(0);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  // Honeypot field
  const [honeypot, setHoneypot] = useState("");

  useEffect(() => {
    setIsMounted(true);
    setFormStartTime(Date.now());
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;

    setStatus("sending");
    setErrorMessage("");

    // Timeout controller - 30 seconds max
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          message: message.trim(),
          website: honeypot,
          formStartTime,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus("success");
        setName("");
        setEmail("");
        setMessage("");
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Error al enviar el mensaje");
      }
    } catch (error) {
      clearTimeout(timeoutId);
      setStatus("error");
      if (error instanceof Error && error.name === "AbortError") {
        setErrorMessage("Tiempo de espera agotado. Intenta de nuevo.");
      } else {
        setErrorMessage("Error de conexión");
      }
    }
  }, [name, email, message, honeypot, formStartTime, status]);

  const isFormValid = email.trim().length > 0 && message.trim().length >= 10;

  const formContent = status === "success" ? (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 rounded-full bg-gradient-to-b from-white/10 to-transparent border border-white/10 flex items-center justify-center mb-6"
      >
        <CheckCircle2 className="w-10 h-10 text-white" />
      </motion.div>
      <h3 className="text-2xl font-bold text-white mb-3">Mensaje Enviado</h3>
      <p className="text-gray-400 mb-8 max-w-[280px] leading-relaxed">
        He recibido tu mensaje correctamente. Te contactaré en breve.
      </p>
      <button
        onClick={() => {
          setStatus("idle");
          setFormStartTime(Date.now());
        }}
        className="px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium text-white transition-colors border border-white/5"
      >
        Volver al inicio
      </button>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        className="sr-only"
        autoComplete="off"
      />

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 pl-1">Tu Nombre</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={status === "sending"}
          placeholder="Ej. John Doe"
          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-5 py-4 text-white placeholder:text-neutral-500 outline-none focus:border-white/20 focus:bg-white/[0.04] transition-all text-base hover:border-white/[0.12]"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 pl-1">Correo Electrónico</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={status === "sending"}
          placeholder="hola@ejemplo.com"
          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-5 py-4 text-white placeholder:text-neutral-500 outline-none focus:border-white/20 focus:bg-white/[0.04] transition-all text-base hover:border-white/[0.12]"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 pl-1">Describe tu proyecto</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={4}
          disabled={status === "sending"}
          placeholder="Busco desarrollar una plataforma que..."
          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-5 py-4 text-white placeholder:text-neutral-500 outline-none focus:border-white/20 focus:bg-white/[0.04] transition-all text-base resize-none hover:border-white/[0.12]"
        />
      </div>

      {status === "error" && (
        <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-xl text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        loading={status === "sending"}
        disabled={!isFormValid || status === "sending"}
        className="w-full rounded-xl flex items-center justify-center gap-3"
      >
        {status === "sending" ? (
          <>Enviando...</>
        ) : (
          <>
            Enviar Mensaje
            <Send className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </Button>
    </form>
  );

  return (
    <section id="contact" className="relative overflow-hidden px-5 py-32 sm:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(184,160,130,0.08),transparent_35%),radial-gradient(circle_at_80%_50%,rgba(0,212,170,0.1),transparent_35%)] [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">

          {/* Left Column: Copy */}
          <motion.div
            initial={isMounted ? { opacity: 0, x: -20 } : false}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex-1 lg:pt-8"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-accent-1 mb-4">Contacto</p>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">
              Hablemos de tu
              <br />
              <span className="bg-gradient-to-r from-accent-1 to-accent-2 bg-clip-text text-transparent">
                siguiente nivel.
              </span>
            </h2>

            <p className="mt-6 text-lg leading-relaxed text-neutral-300 max-w-xl">
              Transformemos ideas complejas en software de alto rendimiento.
              Sin intermediarios, sin burocracia. Ingeniería directa.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              <div className="glass-panel rounded-full border border-accent-1/30 px-4 py-2 text-neutral-300">
                Respuesta rápida
              </div>
              <div className="glass-panel rounded-full border border-accent-2/30 px-4 py-2 text-neutral-300">
                Propuesta clara
              </div>
              <div className="glass-panel rounded-full border border-white/10 px-4 py-2 text-neutral-400">
                Sin spam
              </div>
            </div>

            <div className="mt-10 space-y-6">
              <div className="glass-panel rounded-2xl border border-accent-1/20 bg-white/5 p-5">
                <div className="flex gap-4 items-start">
                  <div className="w-11 h-11 rounded-2xl bg-accent-1/10 border border-accent-1/20 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-accent-1" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-base">Velocidad de ejecución</h4>
                    <p className="text-sm text-neutral-300 mt-1 leading-relaxed">
                      Del concepto al despliegue con entregas iterativas, sin sacrificar calidad.
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-panel rounded-2xl border border-accent-2/20 bg-white/5 p-5">
                <div className="flex gap-4 items-start">
                  <div className="w-11 h-11 rounded-2xl bg-accent-2/10 border border-accent-2/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-accent-2" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-base">Calidad industrial</h4>
                    <p className="text-sm text-neutral-300 mt-1 leading-relaxed">
                      Seguridad, tipos estrictos y arquitectura escalable desde el día uno.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Premium Form */}
          <motion.div
            initial={isMounted ? { opacity: 0, x: 20 } : false}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex-1 w-full"
          >
            <div className="glass-panel relative overflow-hidden rounded-3xl border border-accent-1/20 bg-white/5 p-6 sm:p-8">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.3em] text-accent-1">Formulario</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Cuéntame qué necesitas</h3>
                <p className="mt-2 text-sm text-neutral-400">
                  Mientras más contexto, más precisa será mi propuesta.
                </p>
              </div>

              {formContent}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
