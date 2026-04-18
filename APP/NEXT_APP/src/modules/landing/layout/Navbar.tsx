"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/components/ui/Button";
import { ThrottledLink } from "@/components/ui/ThrottledLink";

const navItems = [
  { label: "Blog", href: "/blog" },
  { label: "Herramientas", href: "/#tools-belt" },
  { label: "Proyectos", href: "/#casos" },
  { label: "Stack", href: "/#tecnologias" },
];

// Scroll thresholds
const COMPACT_THRESHOLD = 60;   // Start shrinking after 60px
const HIDE_THRESHOLD = 300;     // Allow hiding after 300px of total scroll

type ScrollPhase = "expanded" | "compact" | "hidden";

export function Navbar() {
  const [phase, setPhase] = useState<ScrollPhase>("expanded");
  const [open, setOpen] = useState(false);
  const lastScrollY = useRef(0);
  const compactSince = useRef<number>(0);
  const wasExpanded = useRef(true);
  const suppressHideRef = useRef(false);
  const suppressHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const COMPACT_MIN_VISIBLE = 400;

  const suppressHideFor = useCallback((ms = 1200) => {
    suppressHideRef.current = true;
    setPhase((prev) => (prev === "hidden" ? "compact" : prev));

    if (suppressHideTimeoutRef.current) {
      clearTimeout(suppressHideTimeoutRef.current);
    }

    suppressHideTimeoutRef.current = setTimeout(() => {
      suppressHideRef.current = false;
      suppressHideTimeoutRef.current = null;
    }, ms);
  }, []);

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Native scroll listener — replaces framer-motion useScroll + useMotionValueEvent
  useEffect(() => {
    const onScroll = () => {
      const latest = window.scrollY;
      const prev = lastScrollY.current;
      const delta = latest - prev;
      lastScrollY.current = latest;

      if (suppressHideRef.current) {
        setPhase(latest < COMPACT_THRESHOLD ? "expanded" : "compact");
        return;
      }

      if (latest < COMPACT_THRESHOLD) {
        setPhase("expanded");
        wasExpanded.current = true;
        compactSince.current = 0;
        return;
      }

      if (delta > 0) {
        if (wasExpanded.current) {
          setPhase("compact");
          wasExpanded.current = false;
          compactSince.current = Date.now();
          return;
        }
        const compactDuration = Date.now() - compactSince.current;
        if (latest > HIDE_THRESHOLD && compactDuration > COMPACT_MIN_VISIBLE) {
          setPhase("hidden");
        }
        return;
      }

      if (delta < 0) {
        wasExpanded.current = false;
        setPhase((prev) => {
          if (prev === "hidden") compactSince.current = Date.now();
          return "compact";
        });
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    return () => {
      if (suppressHideTimeoutRef.current) {
        clearTimeout(suppressHideTimeoutRef.current);
      }
    };
  }, []);

  const isExpanded = phase === "expanded";
  const isHidden = phase === "hidden";

  return (
    <>
      <header
        className={cn(
          "fixed left-0 right-0 z-50 flex justify-center px-4 pointer-events-none",
          "transition-all ease-[cubic-bezier(0.4,0,0.2,1)]",
          isExpanded ? "top-6 duration-500" : "top-4 duration-300",
          isHidden
            ? "-translate-y-[calc(100%+2rem)] opacity-0 duration-300"
            : "translate-y-0 opacity-100"
        )}
      >
        <div
          className={cn(
            "pointer-events-auto relative flex items-center rounded-full",
            "bg-[#09090b]/90 backdrop-blur-xl border border-white/[0.08]",
            "shadow-[0_0_0_1px_rgba(0,0,0,1),0_8px_20px_-6px_rgba(0,0,0,0.6)]",
            "transition-all ease-[cubic-bezier(0.4,0,0.2,1)]",
            isExpanded
              ? "gap-5 pl-7 pr-3 py-3 duration-500"
              : "gap-4 pl-5 pr-2 py-2 duration-300"
          )}
        >
          {/* Logo */}
          <ThrottledLink
            href="/#hero"
            className={cn(
              "group font-mono font-bold tracking-tight text-white flex items-center gap-0.5 transition-all",
              isExpanded
                ? "text-base mr-3 duration-500"
                : "text-sm mr-2 duration-300"
            )}
          >
            <span className="text-white/40 group-hover:text-blue-400 transition-colors">&lt;</span>
            <span className="group-hover:text-white transition-colors">NicoholasDev</span>
            <span className="text-white/40 group-hover:text-blue-400 transition-colors">/&gt;</span>
          </ThrottledLink>

          {/* Divider */}
          <div
            className={cn(
              "hidden md:block w-px bg-white/10 transition-all",
              isExpanded ? "h-5 mx-1.5 duration-500" : "h-4 mx-1 duration-300"
            )}
          />

          {/* Desktop Nav */}
          <nav aria-label="Navegación principal" className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => (
              <ThrottledLink
                key={item.href}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Hash links are valid but strict typed routes may complain
                href={item.href as any}
                onClick={() => suppressHideFor()}
                className={cn(
                  "relative font-medium text-zinc-400 hover:text-white transition-all rounded-full hover:bg-white/5",
                  isExpanded
                    ? "px-4 py-2 text-sm duration-500"
                    : "px-3.5 py-1.5 text-xs duration-300"
                )}
              >
                {item.label}
              </ThrottledLink>
            ))}
          </nav>

          {/* CTA */}
          <ThrottledLink
            href="/#contact"
            onClick={() => suppressHideFor()}
            className={cn(
              "hidden md:flex items-center justify-center font-bold text-black bg-white rounded-full hover:bg-gray-200 transition-all",
              isExpanded
                ? "px-5 py-2 ml-2 text-sm duration-500"
                : "px-4 py-1.5 ml-1 text-xs duration-300"
            )}
          >
            Contactar
          </ThrottledLink>

          {/* Mobile Toggle — CSS transitions instead of framer-motion */}
          <button
            onClick={() => setOpen(!open)}
            className={cn(
              "md:hidden flex flex-col justify-center items-center gap-1.5 ml-auto bg-white/5 rounded-full hover:bg-white/10 transition-all",
              isExpanded ? "w-9 h-9 duration-500" : "w-8 h-8 duration-300"
            )}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <div className="relative w-4 h-4">
              <span
                aria-hidden="true"
                className="absolute left-0 top-1/2 w-4 h-0.5 bg-white rounded-full transition-all duration-200 origin-center"
                style={{
                  transform: open ? "rotate(45deg) translateY(0)" : "rotate(0) translateY(-5px)",
                }}
              />
              <span
                aria-hidden="true"
                className="absolute left-0 top-1/2 w-4 h-0.5 bg-white rounded-full transition-opacity duration-150 origin-center"
                style={{ opacity: open ? 0 : 1 }}
              />
              <span
                aria-hidden="true"
                className="absolute left-0 top-1/2 w-4 h-0.5 bg-white rounded-full transition-all duration-200 origin-center"
                style={{
                  transform: open ? "rotate(-45deg) translateY(0)" : "rotate(0) translateY(5px)",
                }}
              />
            </div>
          </button>
        </div>
      </header>

      {/* Mobile Menu — CSS transitions instead of AnimatePresence */}
      <nav
        id="mobile-menu"
        role="dialog"
        aria-label="Menú de navegación móvil"
        aria-hidden={!open}
        className={cn(
          "fixed left-4 right-4 z-40 bg-[#09090b] border border-white/10 rounded-3xl p-3 shadow-2xl md:hidden",
          "transition-all duration-200 ease-out origin-top",
          isExpanded ? "top-[5.5rem]" : "top-[4.5rem]",
          open
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 -translate-y-2.5 pointer-events-none"
        )}
      >
        <div className="flex flex-col gap-1">
          {navItems.map((item) => (
            <ThrottledLink
              key={item.href}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Hash links are valid but strict typed routes may complain
              href={item.href as any}
              onClick={() => {
                suppressHideFor();
                setOpen(false);
              }}
              className="flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-white/5 transition-colors group"
            >
              <span className="text-sm font-medium text-zinc-400 group-hover:text-white transition-colors">{item.label}</span>
              <span className="text-zinc-600 group-hover:text-white transition-colors">→</span>
            </ThrottledLink>
          ))}
          <div className="h-px bg-white/5 my-1 mx-2" />
          <ThrottledLink
            href="/#contact"
            onClick={() => {
              suppressHideFor();
              setOpen(false);
            }}
            className="flex items-center justify-center px-4 py-3 rounded-2xl bg-white text-black font-bold text-sm hover:bg-gray-200 transition-colors"
          >
            Agendar Reunión
          </ThrottledLink>
        </div>
      </nav>
    </>
  );
}
