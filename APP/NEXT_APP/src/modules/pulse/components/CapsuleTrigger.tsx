"use client";

import { ArrowUpRight, CloudSun, Sparkles } from "lucide-react";
import { cn } from "@/components/ui/Button";
import type { PulseContextData } from "@/modules/pulse/types";

interface CapsuleTriggerProps {
  context?: PulseContextData | null;
  newsCount: number;
  onOpen: () => void;
  className?: string;
}

export function CapsuleTrigger({ context, newsCount, onOpen, className }: CapsuleTriggerProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative w-full overflow-hidden rounded-[28px] border border-cyan-300/20 bg-[#08131f]/85 p-5 text-left backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-300/35 hover:bg-[#0a1826]",
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.16),transparent_28%)]" />
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Digital Pulse
          </div>
          <ArrowUpRight className="h-5 w-5 text-white/45 transition group-hover:text-white" />
        </div>

        <div className="grid gap-4 sm:grid-cols-[1.4fr,1fr,1fr]">
          <div>
            <p className="mb-2 text-sm text-white/55">Live capsule</p>
            <h3 className="text-2xl font-semibold text-white sm:text-3xl">
              Command Center con señales vivas del mercado y del stack.
            </h3>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
            <div className="mb-2 flex items-center gap-2 text-white/65">
              <CloudSun className="h-4 w-4 text-cyan-300" />
              <span className="text-xs uppercase tracking-[0.22em]">Contexto</span>
            </div>
            <p className="text-xl font-semibold text-white">
              {context ? `${Math.round(context.temperature)}°` : "--°"}
            </p>
            <p className="text-sm text-white/55">
              {context ? `${context.city} · ${context.weatherLabel}` : "Clima listo para cargar"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
            <div className="mb-2 flex items-center gap-2 text-white/65">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span className="text-xs uppercase tracking-[0.22em]">Radar</span>
            </div>
            <p className="text-xl font-semibold text-white">{newsCount}+ señales</p>
            <p className="text-sm text-white/55">News, vulnerabilidades, mercado y actividad real.</p>
          </div>
        </div>
      </div>
    </button>
  );
}
