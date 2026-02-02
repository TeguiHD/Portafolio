"use client";

import { services } from "@/modules/landing/data/services";
import { MagneticCard } from "@/modules/landing/components/MagneticCard";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";

export function ServicesSection() {
  const featuredService = services.find((s) => s.featured);
  const regularServices = services.filter((s) => !s.featured);
  const [_isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <section id="servicios" className="relative overflow-x-hidden overflow-y-visible px-5 py-32 sm:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_10%,rgba(184,160,130,0.08),transparent_30%),radial-gradient(circle_at_10%_40%,rgba(0,212,170,0.1),transparent_30%)] [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent-1 mb-2">Servicios</p>
            <h2 className="text-4xl font-bold text-white sm:text-5xl">
              Soluciones con{" "}
              <span className="bg-gradient-to-r from-accent-1 to-accent-2 bg-clip-text text-transparent">
                ROI medible
              </span>
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-neutral-400">
              Paquetes modulares pensados para empresas que buscan velocidad, calidad y resultados medibles. Cada servicio incluye tiempo de entrega, ROI estimado y caso de éxito relacionado.
            </p>
          </div>
          <div className="glass-panel rounded-full border border-accent-1/30 px-5 py-2.5 text-xs text-accent-1">
            SLA &lt; 24h · Roadmap compartido
          </div>
        </motion.div>

        {/* Servicio Premium primero (Sesgo: Anclaje) */}
        {featuredService && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <MagneticCard className="glass-panel relative overflow-hidden rounded-3xl border-2 border-accent-1/40 bg-gradient-to-br from-accent-1/10 via-transparent to-accent-2/10 p-8 shadow-2xl card-3d-enhanced">
              <div className="absolute top-6 right-6">
                <span className="rounded-full bg-accent-2/20 border border-accent-2/40 px-4 py-1.5 text-xs font-bold text-accent-2 uppercase tracking-wider">
                  Más solicitado
                </span>
              </div>

              <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="rounded-full bg-accent-1/20 border border-accent-1/40 px-3 py-1 text-xs font-semibold text-accent-1 uppercase">
                      {featuredService.badge}
                    </span>
                    {featuredService.caseStudy && (
                      <Link href="#casos" as={undefined} className="text-xs text-accent-2 hover:underline">
                        Ver caso: {featuredService.caseStudy}
                      </Link>
                    )}
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-3">{featuredService.title}</h3>
                  <p className="text-lg text-neutral-300 mb-6">{featuredService.description}</p>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                      <p className="text-xs text-neutral-400 mb-1">Tiempo</p>
                      <p className="text-lg font-semibold text-accent-1">{featuredService.timeline}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400 mb-1">Inversión</p>
                      <p className="text-lg font-semibold text-accent-1">{featuredService.price}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400 mb-1">Retorno</p>
                      <p className="text-lg font-semibold text-accent-2">{featuredService.roi}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {featuredService.deliverables.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-3 rounded-xl border border-accent-1/20 bg-accent-1/5 px-4 py-3 text-sm text-neutral-200"
                      >
                        <span className="h-2 w-2 rounded-full bg-accent-2" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </MagneticCard>
          </motion.div>
        )}

        {/* Servicios regulares */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {regularServices.map((service, idx) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: idx * 0.08, duration: 0.5, ease: "easeOut" }}
            >
              <MagneticCard className="glass-panel h-full rounded-3xl border border-accent-1/20 bg-white/5 p-6 shadow-xl card-3d-enhanced" intensity={1.1}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <span className="rounded-full bg-accent-1/10 border border-accent-1/30 px-3 py-1 text-xs font-semibold text-accent-1 uppercase">
                    {service.badge}
                  </span>
                  {service.caseStudy && (
                    <Link
                      href="#casos" as={undefined}
                      className="text-[10px] text-accent-2/70 hover:text-accent-2 hover:underline"
                    >
                      Ver caso
                    </Link>
                  )}
                </div>

                <h3 className="text-xl font-bold text-white mb-3">{service.title}</h3>
                <p className="text-sm text-neutral-300 mb-6 leading-relaxed">{service.description}</p>

                <div className="space-y-2 mb-6">
                  {service.deliverables.slice(0, 3).map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs text-neutral-300"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-accent-2" />
                      {item}
                    </div>
                  ))}
                </div>

                <div className="border-t border-accent-1/20 pt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Tiempo</span>
                    <span className="font-semibold text-accent-1">{service.timeline}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Inversión</span>
                    <span className="font-semibold text-accent-1">{service.price}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">ROI</span>
                    <span className="font-semibold text-accent-2">{service.roi}</span>
                  </div>
                </div>
              </MagneticCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
