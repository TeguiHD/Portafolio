"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ArrowUpRight } from "lucide-react";

export function ContactSection() {
  return (
    <section id="contact" className="relative py-32 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-mono text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Open to work
          </div>

          <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tighter">
            Ready to <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-purple-500">Scale?</span>
          </h2>

          <p className="text-xl text-gray-400 max-w-xl mx-auto">
            Construyamos algo que tus usuarios (y tus inversores) amen.
          </p>

          <form className="mt-12 text-left space-y-4 max-w-md mx-auto">
            <div>
              <input
                type="email"
                placeholder="tu@email.com"
                className="w-full bg-[#0a0a0a] border border-white/5 rounded-2xl px-6 py-5 text-white focus:outline-none focus:border-white/20 transition-colors placeholder:text-gray-700 text-lg"
              />
            </div>
            <div>
              <textarea
                placeholder="Cuéntame sobre tu proyecto..."
                rows={4}
                className="w-full bg-[#0a0a0a] border border-white/5 rounded-2xl px-6 py-5 text-white focus:outline-none focus:border-white/20 transition-colors placeholder:text-gray-700 resize-none text-lg min-h-[160px]"
              />
            </div>
            <Button size="lg" className="w-full bg-white text-black hover:bg-gray-100 font-bold py-6 rounded-2xl text-lg group relative overflow-hidden flex items-center justify-center">
              <span className="relative z-10 mr-2">Iniciar Conversación</span>
              <ArrowUpRight className="w-5 h-5 relative z-10 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              <div className="absolute inset-0 bg-white z-0" />
            </Button>
          </form>

          <div className="pt-12 flex justify-center gap-8 text-sm text-gray-500">
            <span>contact@nicoholas.dev</span>
          </div>

        </motion.div>

      </div>
    </section>
  );
}
