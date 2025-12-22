"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { cn } from "@/components/ui/Button";

const navItems = [
  { label: "Herramientas", href: "/#tools-belt" },
  { label: "Proyectos", href: "/#casos" },
  { label: "Stack", href: "/#tecnologias" },
  { label: "Contacto", href: "/#contact" },
];

export function Navbar() {
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const lastScrollY = useRef(0);
  const [bodyRef, setBodyRef] = useState<HTMLElement | null>(null);

  // Get body reference on mount (Lenis scrolls the body)
  useEffect(() => {
    setBodyRef(document.body);
  }, []);

  // Framer Motion scroll detection - read from body where Lenis scrolls
  const { scrollY } = useScroll({
    container: bodyRef ? { current: bodyRef } : undefined,
  });

  useMotionValueEvent(scrollY, "change", (latest) => {
    // Hide if scrolling down AND past threshold (100px)
    // Show if scrolling up
    if (latest > lastScrollY.current && latest > 100) {
      setHidden(true);
    } else if (latest < lastScrollY.current) {
      setHidden(false);
    }
    lastScrollY.current = latest;
  });

  // Mobile menu variants
  const menuVariants = {
    closed: {
      opacity: 0,
      scale: 0.95,
      y: -10,
      transition: { duration: 0.2 }
    },
    open: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.2 }
    }
  };

  return (
    <>
      {/* Using CSS transition classes instead of Framer Motion inline styles */}
      <header
        className={cn(
          "fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none",
          "transition-all duration-300 ease-in-out",
          hidden ? "-translate-y-24 opacity-0" : "translate-y-0 opacity-100"
        )}
      >
        <div
          className={cn(
            "pointer-events-auto relative flex items-center gap-4 pl-5 pr-2 py-2 rounded-full",
            "bg-[#09090b] border border-white/10",
            "shadow-[0_0_0_1px_rgba(0,0,0,1),0_8px_20px_-6px_rgba(0,0,0,0.6)]"
          )}
        >
          {/* Logo */}
          <Link href="/#hero" className="group font-mono font-bold tracking-tight text-white flex items-center gap-0.5 text-sm mr-2">
            <span className="text-white/40 group-hover:text-blue-400 transition-colors">&lt;</span>
            <span className="group-hover:text-white transition-colors">NicoholasDev</span>
            <span className="text-white/40 group-hover:text-blue-400 transition-colors">/&gt;</span>
          </Link>

          {/* Divider */}
          <div className="hidden md:block w-px h-4 bg-white/10 mx-1" />

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href as any}
                className="relative px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <Link
            href="/#contact"
            className="hidden md:flex items-center justify-center px-4 py-1.5 ml-1 text-xs font-bold text-black bg-white rounded-full hover:bg-gray-200 transition-colors"
          >
            Contactar
          </Link>

          {/* Mobile Toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden w-8 h-8 flex flex-col justify-center items-center gap-1.5 ml-auto bg-white/5 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Menu"
          >
            <motion.div animate={{ rotate: open ? 45 : 0, y: open ? 6 : 0 }} className="w-4 h-0.5 bg-white rounded-full origin-center" />
            <motion.div animate={{ opacity: open ? 0 : 1 }} className="w-4 h-0.5 bg-white rounded-full" />
            <motion.div animate={{ rotate: open ? -45 : 0, y: open ? -6 : 0 }} className="w-4 h-0.5 bg-white rounded-full origin-center" />
          </button>
        </div>
      </header>

      {/* Mobile Menu - Fixed positioning to prevent overflow */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={menuVariants}
            className="fixed top-24 left-4 right-4 z-40 bg-[#09090b] border border-white/10 rounded-3xl p-3 shadow-2xl md:hidden"
          >
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href as any}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-white/5 transition-colors group"
                >
                  <span className="text-sm font-medium text-zinc-400 group-hover:text-white transition-colors">{item.label}</span>
                  <span className="text-zinc-600 group-hover:text-white transition-colors">→</span>
                </Link>
              ))}
              <div className="h-px bg-white/5 my-1 mx-2" />
              <Link
                href="/#contact"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center px-4 py-3 rounded-2xl bg-white text-black font-bold text-sm hover:bg-gray-200 transition-colors"
              >
                Agendar Reunión
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

