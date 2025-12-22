"use client";

import { Button } from "@/components/ui/Button";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { ArrowDown } from "lucide-react";

export function HeroSection() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section id="hero" className="relative min-h-[100vh] flex flex-col justify-center items-center overflow-hidden px-4 sm:px-6 pt-20">

      {/* Background Ambience (Specific to Hero) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-blue-600/10 rounded-full blur-[100px] -z-10 animate-pulse-slow" />

      <motion.div
        style={{ y, opacity }}
        className="w-full max-w-5xl mx-auto text-center z-10 space-y-8"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/5 bg-white/5 backdrop-blur-md mb-4 hover:bg-white/10 transition-colors cursor-default"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] sm:text-xs font-mono text-gray-400 tracking-[0.2em] uppercase">
            System Architect & Full Stack
          </span>
        </motion.div>

        {/* Headline - "Native" Typography */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-white leading-[0.9] sm:leading-[0.9]"
        >
          Sistemas que <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-white to-purple-400">
            escalan.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-lg sm:text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light"
        >
          Transformo el caos técnico en <span className="text-white font-medium">arquitectura predecible</span>.
          <br className="hidden sm:block" />
          Del código al negocio, sin intermediarios.
        </motion.p>

        {/* CTAs - Magnetic Feel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8"
        >
          <Link href="#tools-belt">
            <Button size="xl" className="rounded-full px-8 py-6 text-lg font-medium bg-white text-black hover:bg-gray-200 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
              Explorar Herramientas
            </Button>
          </Link>
          <Link href="#contact">
            <Button variant="ghost" size="xl" className="rounded-full px-8 py-6 text-lg font-medium text-white hover:bg-white/5 border border-white/10 hover:border-white/20">
              Agendar Reunión
            </Button>
          </Link>
        </motion.div>

        {/* Stats - Grid Minimalist */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="pt-16 sm:pt-24 flex justify-center gap-12 sm:gap-20 opacity-50 hover:opacity-100 transition-opacity duration-500"
        >
          {[
            { label: "Años Exp", val: "+5" },
            { label: "Uptime", val: "100%" },
            { label: "Clients", val: "Global" }
          ].map((stat) => (
            <div key={stat.label} className="text-center group">
              <div className="text-xl sm:text-2xl font-bold text-white group-hover:scale-110 transition-transform">{stat.val}</div>
              <div className="text-[10px] sm:text-xs font-mono text-gray-500 uppercase tracking-widest mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>

      </motion.div>

      {/* Abstract Interactive Elements (Network Nodes) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] border border-white/5 rounded-full animate-[spin_60s_linear_infinite]" />
        <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] border border-white/5 rounded-full animate-[spin_40s_linear_infinite_reverse]" />
        {/* Center Pulse */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full opacity-20" />
      </div>

    </section>
  );
}
