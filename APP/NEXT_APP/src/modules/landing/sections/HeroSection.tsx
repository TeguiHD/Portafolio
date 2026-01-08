"use client";

import { Button } from "@/components/ui/Button";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { ArrowDown, Terminal, Zap, Shield, Code2 } from "lucide-react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamic import with SSR disabled to prevent recharts hydration mismatch
const FloatingDashboard = dynamic(
  () => import("../components/FloatingDashboard").then((mod) => mod.FloatingDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="hidden lg:block w-[420px] h-[400px] rounded-2xl bg-white/[0.02] border border-white/10 animate-pulse" />
    )
  }
);

// Typing effect hook
function useTypingEffect(texts: string[], typingSpeed = 50, pauseDuration = 2000) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const currentText = texts[currentIndex];

    if (isTyping) {
      if (displayText.length < currentText.length) {
        const timeout = setTimeout(() => {
          setDisplayText(currentText.slice(0, displayText.length + 1));
        }, typingSpeed);
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => {
          setIsTyping(false);
        }, pauseDuration);
        return () => clearTimeout(timeout);
      }
    } else {
      if (displayText.length > 0) {
        const timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, typingSpeed / 2);
        return () => clearTimeout(timeout);
      } else {
        setCurrentIndex((prev) => (prev + 1) % texts.length);
        setIsTyping(true);
      }
    }
  }, [displayText, isTyping, currentIndex, texts, typingSpeed, pauseDuration]);

  return displayText;
}

// Animated counter hook
function useCounter(end: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(!startOnView);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration, hasStarted]);

  return { count, start: () => setHasStarted(true) };
}

// Terminal lines - professional value propositions
const terminalLines = [
  "Transformo ideas en productos",
  "Del problema a la solución",
  "Tu proyecto, listo para crecer",
  "Sin excusas, solo resultados",
];

export function HeroSection() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  const typedText = useTypingEffect(terminalLines, 60, 2500);
  const projectsCounter = useCounter(500, 2500);
  const uptimeCounter = useCounter(99, 2000);

  // Track client-side mount to prevent SSR animation mismatch
  const [isMounted, setIsMounted] = useState(false);

  // Start counters and enable animations when component mounts
  useEffect(() => {
    setIsMounted(true);
    const timer = setTimeout(() => {
      projectsCounter.start();
      uptimeCounter.start();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      id="hero"
      className="relative min-h-[100vh] flex flex-col justify-center items-center overflow-hidden px-4 sm:px-6 pt-20"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        {/* Primary glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[1000px] max-h-[1000px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse-slow" />
        {/* Secondary accent */}
        <div className="absolute top-[20%] right-[10%] w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] bg-purple-600/10 rounded-full blur-[80px] animate-pulse-slow" style={{ animationDelay: "1s" }} />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Main Content - Grid Layout */}
      <motion.div
        style={{ y, opacity }}
        className="w-full max-w-7xl mx-auto z-10 grid lg:grid-cols-[1fr,auto] gap-8 lg:gap-16 items-center"
      >
        {/* Left: Text Content */}
        <div>
          {/* Terminal Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 md:mb-12"
          >
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-black/40 border border-emerald-500/30 rounded-lg backdrop-blur-sm">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <div className="h-4 w-px bg-white/10" />
              <Terminal className="w-4 h-4 text-emerald-500" />
              <code className="text-xs sm:text-sm font-mono text-emerald-400">
                <span className="text-gray-500">$</span> {typedText}
                <span className="animate-blink text-emerald-500">▋</span>
              </code>
            </div>
          </motion.div>

          {/* Main Headline - Direct Professional Messaging */}
          <div className="space-y-2 md:space-y-4 mb-8 md:mb-12">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-left"
            >
              <span className="block text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-light text-gray-400 tracking-tight">
                Desarrollo
              </span>
              <span className="block text-5xl sm:text-7xl md:text-8xl lg:text-[120px] font-black tracking-tighter text-white animate-glitch leading-[0.9]">
                SOLUCIONES.
              </span>
            </motion.h1>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-left"
            >
              <span className="block text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-light italic text-gray-500 tracking-tight">
                Entrego
              </span>
              <span className="block text-5xl sm:text-7xl md:text-8xl lg:text-[120px] font-black tracking-tighter text-outline-white leading-[0.9] hover:text-white transition-all duration-500">
                RESULTADOS.
              </span>
            </motion.h2>
          </div>

          {/* Value Proposition - Clear and Direct */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="max-w-2xl mb-10 md:mb-14"
          >
            <p className="text-lg sm:text-xl md:text-2xl text-gray-400 leading-relaxed">
              <span className="text-white font-semibold">Desarrollador Full Stack</span> que transforma{" "}
              <span className="text-blue-400 font-medium">problemas complejos</span> en{" "}
              <span className="text-emerald-400 font-medium">productos funcionales</span>.{" "}
              Sin rodeos. Sin demoras.
            </p>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 mb-16 md:mb-20"
          >
            <Link href="#tools-belt">
              <Button
                size="lg"
                className="inline-flex flex-row items-center justify-center gap-2 rounded-full px-8 py-4 text-lg font-bold bg-white text-black hover:bg-gray-100 transition-all hover:scale-105 active:scale-95 animate-glow-pulse whitespace-nowrap"
              >
                <Zap className="w-5 h-5 flex-shrink-0" />
                <span>Explorar Herramientas</span>
              </Button>
            </Link>
            <Link href="#contact">
              <Button
                variant="ghost"
                size="lg"
                className="rounded-full px-8 py-6 text-lg font-medium text-white hover:bg-white/5 border border-white/20 hover:border-white/40"
              >
                Agendar Reunión
              </Button>
            </Link>
          </motion.div>

          {/* Stats with animated counters */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isMounted ? { opacity: 1 } : { opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="grid grid-cols-3 gap-6 sm:gap-12 max-w-xl"
          >
            {[
              { value: projectsCounter.count, suffix: "+", label: "Proyectos", icon: Code2 },
              { value: uptimeCounter.count, suffix: ".9%", label: "Uptime", icon: Shield },
              { value: "<24", suffix: "h", label: "Respuesta", icon: Zap },
            ].map((stat, i) => (
              <div key={stat.label} className="group text-left">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl md:text-5xl font-black text-white tabular-nums">
                    {typeof stat.value === "number" ? stat.value : stat.value}
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-blue-400">
                    {stat.suffix}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <stat.icon className="w-3 h-3 text-gray-600 group-hover:text-blue-400 transition-colors" />
                  <span className="text-xs font-mono text-gray-500 uppercase tracking-wider group-hover:text-gray-400 transition-colors">
                    {stat.label}
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: Floating Dashboard */}
        <FloatingDashboard />
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isMounted ? { opacity: 1 } : { opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-xs font-mono text-gray-600 tracking-widest uppercase">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown className="w-5 h-5 text-gray-600" />
        </motion.div>
      </motion.div>

      {/* Decorative elements - subtle geometric patterns */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Orbiting rings - subtle visual depth */}
        <div className="absolute top-[15%] right-[5%] w-[400px] h-[400px] border border-white/5 rounded-full animate-[spin_80s_linear_infinite]" />
        <div className="absolute top-[15%] right-[5%] w-[600px] h-[600px] border border-white/[0.03] rounded-full animate-[spin_60s_linear_infinite_reverse]" />
      </div>
    </section>
  );
}
