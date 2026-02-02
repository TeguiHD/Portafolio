"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/components/ui/Button";

const projects = [
  {
    id: "slep",
    title: "SLEP Gobierno",
    category: "High Traffic / EdTech",
    metric: "-65%",
    metricLabel: "Load Time Reduction",
    desc: "Plataforma crítica con 500+ usuarios concurrentes. Migración a Next.js y optimización de base de datos.",
    colSpan: "md:col-span-2",
    bg: "bg-blue-950",
    gradient: "from-blue-900 to-slate-900"
  },
  {
    id: "dracamila",
    title: "Dracamila",
    category: "E-commerce",
    metric: "+150%",
    metricLabel: "Ventas Trimestrales",
    desc: "Checkout optimizado (SPA) y validación en tiempo real para reducir abandono.",
    colSpan: "md:col-span-1",
    bg: "bg-emerald-950",
    gradient: "from-emerald-900 to-teal-950"
  },
  {
    id: "ml-forecast",
    title: "Retail Forecast",
    category: "AI / Python",
    metric: "92%",
    metricLabel: "Precisión Stock",
    desc: "Modelo predictivo para evitar quiebres de stock usando Prophet y XGBoost.",
    colSpan: "md:col-span-1",
    bg: "bg-purple-950",
    gradient: "from-purple-900 to-fuchsia-950"
  },
  {
    id: "n8n-crm",
    title: "Auto CRM",
    category: "Automation",
    metric: "Zero",
    metricLabel: "Manual Data Entry",
    desc: "Flujo n8n completo: Webhook -> WhatsApp API -> Email. Respuesta < 2 min.",
    colSpan: "md:col-span-2",
    bg: "bg-orange-950",
    gradient: "from-orange-900 to-amber-950"
  }
];

export function ShowcaseSection() {
  const [_isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <section id="casos" className="relative py-32 px-4 sm:px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0F1724]/0 via-[#0F1724]/50 to-[#0F1724]/0 -z-10 [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]" />
      <div className="max-w-7xl mx-auto">

        <div className="mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Impacto <span className="text-gray-500">Auditado</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl">
            Casos de estudio donde la ingeniería generó valor comercial directo.
            Sin métricas de vanidad.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {projects.map((proj, i) => (
            <motion.div
              key={proj.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              className={cn(
                "group relative overflow-hidden rounded-3xl p-8 min-h-[300px] flex flex-col justify-between border border-white/5 hover:border-white/20 transition-all duration-500",
                proj.colSpan,
                proj.bg
              )}
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${proj.gradient} opacity-50 group-hover:opacity-70 transition-opacity duration-500`} />

              {/* Content */}
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-mono uppercase tracking-widest text-white/60 border border-white/10 px-2 py-1 rounded-full">
                    {proj.category}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>

                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
                  {proj.title}
                </h3>
                <p className="text-sm text-gray-300 max-w-md">
                  {proj.desc}
                </p>
              </div>

              {/* Metric */}
              <div className="relative z-10 pt-8 mt-auto border-t border-white/10">
                <div className="text-4xl md:text-5xl font-bold text-white mb-1 tracking-tighter">
                  {proj.metric}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">
                  {proj.metricLabel}
                </div>
              </div>

            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Route /projects does not exist yet so typed routes fail */}
          <Link href={"/projects" as any}>
            <span className="text-gray-500 hover:text-white transition-colors border-b border-transparent hover:border-white pb-0.5 cursor-pointer">
              Ver archivo completo de casos
            </span>
          </Link>
        </div>

      </div>
    </section>
  );
}
