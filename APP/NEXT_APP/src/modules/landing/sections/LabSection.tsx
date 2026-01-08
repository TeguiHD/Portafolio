"use client";

import { labDemos } from "@/modules/landing/data/lab-demos";
import { MagneticCard } from "@/modules/landing/components/MagneticCard";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export function LabSection() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  return (
    <section
      id="lab"
      className="relative overflow-x-hidden overflow-y-visible bg-gradient-to-b from-[#050914] via-[#0a1328] to-[#050914] px-5 py-24 sm:px-10"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,184,169,0.12),transparent_30%),radial-gradient(circle_at_80%_60%,rgba(255,138,0,0.12),transparent_30%)]" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Lab</p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">Experimentos listos para mostrar</h2>
            <p className="mt-2 max-w-2xl text-neutral-300">
              Demos con scroll, parallax y animaciones 3D para enseñar dominio del stack visual.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-neutral-200">
            Efectos responsivos · Optimizado GPU · Micro-interacciones
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {labDemos.map((demo, idx) => (
            <MagneticCard
              key={demo.id}
              className="glass-panel relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 card-3d-enhanced"
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: idx * 0.05, duration: 0.45 }}
                className="relative"
              >
                <div className={`absolute inset-0 opacity-50 blur-2xl bg-gradient-to-br ${demo.accent}`} />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{demo.title}</h3>
                    <p className="mt-2 text-sm text-neutral-200">{demo.summary}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white">
                    Demo
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 text-xs text-neutral-200">
                  {demo.stack.map((tech) => (
                    <span key={tech} className="rounded-full bg-black/30 px-3 py-1">
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-sm text-white">
                  <span>{demo.cta}</span>
                  <span className="text-xs text-neutral-400">Hover para tilt</span>
                </div>
              </motion.div>
            </MagneticCard>
          ))}
        </div>
      </div>
    </section>
  );
}


