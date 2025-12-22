"use client";

import Link from "next/link";

export function FooterSection() {
  return (
    <footer className="border-t border-white/5 py-16 px-4 sm:px-6 bg-black">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">

        <div className="space-y-4">
          <Link href="/" className="font-mono text-xl font-bold text-white block">
            &lt;NicoholasDev/&gt;
          </Link>
          <p className="text-sm text-gray-500 leading-relaxed">
            Arquitectura de sistemas y desarrollo Full Stack de alto impacto.
          </p>
        </div>

        <div>
          <h3 className="font-bold text-white mb-4 text-sm tracking-wider">SITEMAP</h3>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><Link href="/#hero" className="hover:text-white transition-colors">Inicio</Link></li>
            <li><Link href="/#casos" className="hover:text-white transition-colors">Proyectos</Link></li>
            <li><Link href="/#tools-belt" className="hover:text-white transition-colors">Herramientas</Link></li>
            <li><Link href="/#vault" className="hover:text-white transition-colors">Admin</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-white mb-4 text-sm tracking-wider">LEGAL</h3>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacidad</Link></li>
            <li><Link href="/terms" className="hover:text-white transition-colors">Términos</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-white mb-4 text-sm tracking-wider">SOCIAL</h3>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><a href="https://github.com/TeguiHD" target="_blank" className="hover:text-white transition-colors">GitHub</a></li>
            <li><a href="https://linkedin.com/in/nicoholas-lopetegui" target="_blank" className="hover:text-white transition-colors">LinkedIn</a></li>
            <li><a href="mailto:contact@nicoholas.dev" className="hover:text-white transition-colors">Email</a></li>
          </ul>
        </div>

      </div>
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 text-center text-xs text-gray-600">
        Hecho con ❤️ y código por Nicoholas.
      </div>
    </footer>
  );
}
