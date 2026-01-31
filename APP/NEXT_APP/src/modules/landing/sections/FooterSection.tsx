"use client";

import { ThrottledLink } from "@/components/ui/ThrottledLink";
import { ExternalLink } from "@/components/ui/ExternalLink";

export function FooterSection() {
  return (
    <footer className="border-t border-white/5 py-16 px-4 sm:px-6 bg-black">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">

        <div className="space-y-4">
          <ThrottledLink href="/" className="font-mono text-xl font-bold text-white block">
            &lt;NicoholasDev/&gt;
          </ThrottledLink>
          <p className="text-sm text-gray-500 leading-relaxed">
            Arquitectura de sistemas y desarrollo Full Stack de alto impacto.
          </p>
        </div>

        <div>
          <h3 className="font-bold text-white mb-4 text-sm tracking-wider">SITEMAP</h3>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><ThrottledLink href="/#hero" className="hover:text-white transition-colors">Inicio</ThrottledLink></li>
            <li><ThrottledLink href="/#casos" className="hover:text-white transition-colors">Proyectos</ThrottledLink></li>
            <li><ThrottledLink href="/#tools-belt" className="hover:text-white transition-colors">Herramientas</ThrottledLink></li>
            <li><ThrottledLink href="/#vault" className="hover:text-white transition-colors">Admin</ThrottledLink></li>
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-white mb-4 text-sm tracking-wider">LEGAL</h3>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><ThrottledLink href="/privacy" className="hover:text-white transition-colors">Privacidad</ThrottledLink></li>
            <li><ThrottledLink href="/terms" className="hover:text-white transition-colors">Términos</ThrottledLink></li>
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-white mb-4 text-sm tracking-wider">SOCIAL</h3>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><ExternalLink href="https://github.com/TeguiHD" className="hover:text-white transition-colors">GitHub</ExternalLink></li>
            <li><ExternalLink href="https://linkedin.com/in/nicoholas-lopetegui" className="hover:text-white transition-colors">LinkedIn</ExternalLink></li>
            <li><ExternalLink href="mailto:contact@nicoholas.dev" className="hover:text-white transition-colors">Email</ExternalLink></li>
          </ul>
        </div>

      </div>
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 text-center text-xs text-gray-600">
        Hecho con ❤️ y código por Nicoholas.
      </div>
    </footer>
  );
}

