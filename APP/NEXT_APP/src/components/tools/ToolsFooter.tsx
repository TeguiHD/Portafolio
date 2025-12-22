"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ToolsFooter() {
    const pathname = usePathname();
    return (
        <footer className="border-t border-white/10 bg-[#0F1724]/80 backdrop-blur-sm px-5 py-8 sm:px-10">
            <div className="mx-auto max-w-4xl">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    {/* Brand + CTA */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                        <Link
                            href="/"
                            className="text-lg font-bold bg-gradient-to-r from-accent-1 to-accent-2 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
                        >
                            Nicoholas Lopetegui
                        </Link>
                        <span className="hidden sm:block text-neutral-600">•</span>
                        <p className="text-sm text-neutral-400">
                            ¿Necesitas una herramienta personalizada?{" "}
                            <Link href="/#contact" className="text-accent-1 hover:underline">
                                Contáctame
                            </Link>
                        </p>
                    </div>

                    {/* Links */}
                    <div className="flex items-center gap-6 text-xs text-neutral-500">
                        {pathname !== '/tools' && (
                            <Link href="/tools" className="hover:text-accent-1 transition-colors">
                                Más herramientas
                            </Link>
                        )}
                        <Link href="/" className="hover:text-accent-1 transition-colors">
                            Portfolio
                        </Link>
                        <span className="text-neutral-700">
                            © {new Date().getFullYear()}
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
