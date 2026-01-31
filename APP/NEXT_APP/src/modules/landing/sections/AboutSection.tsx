"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useState, useEffect } from "react";

const defaultTechnologies = [
  { name: "Next.js", category: "Frontend" },
  { name: "React", category: "Frontend" },
  { name: "TypeScript", category: "Frontend" },
  { name: "Node.js", category: "Backend" },
  { name: "Python", category: "Backend" },
  { name: "PostgreSQL", category: "Database" },
  { name: "Docker", category: "DevOps" },
  { name: "n8n", category: "Automation" },
  { name: "GSAP", category: "Animation" },
  { name: "Prisma", category: "ORM" },
  { name: "FastAPI", category: "Backend" },
  { name: "Power BI", category: "BI" },
];

const timeline = [
  { year: "2019", event: "Inicio carrera Full-stack" },
  { year: "2021", event: "Primer proyecto gubernamental (SLEP)" },
  { year: "2023", event: "Especialización en automatizaciones" },
  { year: "2024", event: "ML Ops y pipelines de datos" },
];

export function AboutSection() {
  const [isMounted, setIsMounted] = useState(false);
  const [technologies, setTechnologies] = useState(defaultTechnologies);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("technologies");
    if (saved) {
      try {
        interface SavedTechnology {
          name: string;
          category: string;
          featured?: boolean;
        }
        const techs = JSON.parse(saved) as SavedTechnology[];
        const formatted = techs
          .filter((t) => t.featured !== false)
          .map((t) => ({ name: t.name, category: t.category }));
        if (formatted.length > 0) {
          setTechnologies(formatted);
        }
      } catch {
        // Fallback a default
      }
    }
  }, []);

  return (
    <section id="about" className="relative overflow-x-hidden overflow-y-visible px-5 py-32 sm:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(184,160,130,0.08),transparent_35%),radial-gradient(circle_at_80%_50%,rgba(0,212,170,0.1),transparent_35%)]" />

      <div className="relative mx-auto grid max-w-7xl gap-16 lg:grid-cols-2 lg:items-center">
        {/* Izquierda: Historia + Valores (Construcción de Autoridad) */}
        <motion.div
          initial={isMounted ? { opacity: 0, x: -20 } : false}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent-1 mb-4">Sobre mí</p>
            <h2 className="text-4xl font-bold text-white sm:text-5xl mb-6">
              No solo escribo código.
              <br />
              <span className="bg-gradient-to-r from-accent-1 to-accent-2 bg-clip-text text-transparent">
                Diseño sistemas que generan ingresos y ahorran costos.
              </span>
            </h2>
          </div>

          <div className="space-y-4 text-lg text-neutral-300 leading-relaxed">
            <p>
              Soy <strong className="text-white">Nicoholas Lopetegui</strong>, ingeniero en informática con{" "}
              <strong className="text-accent-2">5+ años</strong> de experiencia en desarrollo full-stack, BI y automatizaciones.
            </p>
            <p>
              Mi enfoque es simple: <strong className="text-white">resultados de negocio primero</strong>. No construyo por construir; cada línea de código tiene un propósito medible.
            </p>
            <p>
              He trabajado con <strong className="text-white">organizaciones públicas</strong> (SLEP - Gobierno de Chile),{" "}
              <strong className="text-white">retail</strong> (e-commerce con +150% ventas) y{" "}
              <strong className="text-white">startups</strong> que necesitan velocidad sin sacrificar calidad.
            </p>
          </div>

          {/* Credenciales rápidas */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="glass-panel rounded-full border border-accent-1/30 px-4 py-2">
              <span className="text-accent-1 font-semibold">5+ años</span>
              <span className="text-neutral-400 ml-2">| Full-stack</span>
            </div>
            <div className="glass-panel rounded-full border border-accent-2/30 px-4 py-2">
              <span className="text-accent-2 font-semibold">Enfoque</span>
              <span className="text-neutral-400 ml-2">| Resultados de negocio</span>
            </div>
          </div>

          <Link href="#contact" as={undefined}>
            <Button size="lg" className="w-full sm:w-auto">
              Hablemos de tu proyecto
            </Button>
          </Link>
        </motion.div>

        {/* Derecha: Credenciales Visuales */}
        <motion.div
          initial={isMounted ? { opacity: 0, x: 20 } : false}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-8"
        >
          {/* Timeline visual de experiencia */}
          <div className="glass-panel rounded-3xl border border-accent-1/20 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-accent-1 mb-6">Experiencia</p>
            <div className="space-y-4">
              {timeline.map((item, idx) => (
                <motion.div
                  key={item.year}
                  initial={isMounted ? { opacity: 0, x: -10 } : false}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-accent-2 border-2 border-primary" />
                    {idx < timeline.length - 1 && (
                      <div className="h-12 w-0.5 bg-gradient-to-b from-accent-2/50 to-transparent mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-semibold text-accent-1">{item.year}</p>
                    <p className="text-sm text-neutral-300 mt-1">{item.event}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Stack dominado (Grid interactivo) */}
          <div className="glass-panel rounded-3xl border border-accent-1/20 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-accent-1 mb-6">Stack dominado</p>
            <div className="grid grid-cols-3 gap-3">
              {technologies.map((tech, idx) => (
                <motion.div
                  key={tech.name}
                  initial={isMounted ? { opacity: 0, scale: 0.9 } : false}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.03 }}
                  whileHover={{ scale: 1.05 }}
                  className="rounded-xl border border-accent-1/20 bg-accent-1/5 p-3 text-center transition-all hover:border-accent-1/40 hover:bg-accent-1/10"
                >
                  <p className="text-xs font-semibold text-white">{tech.name}</p>
                  <p className="text-[10px] text-neutral-400 mt-1">{tech.category}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Valores */}
          <div className="glass-panel rounded-3xl border border-accent-2/20 p-6 bg-gradient-to-br from-accent-2/5 to-transparent">
            <p className="text-xs uppercase tracking-[0.3em] text-accent-2 mb-4">Valores</p>
            <div className="space-y-3">
              {[
                "Evidencia > Promesas",
                "Documentación completa",
                "Métricas desde el día 1",
                "Handoff ordenado",
              ].map((value, idx) => (
                <motion.div
                  key={value}
                  initial={isMounted ? { opacity: 0, x: -10 } : false}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <span className="h-2 w-2 rounded-full bg-accent-2" />
                  <span className="text-sm text-neutral-300">{value}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
