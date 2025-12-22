export interface LabDemo {
  id: string;
  title: string;
  summary: string;
  stack: string[];
  cta: string;
  accent: string;
}

export const labDemos: LabDemo[] = [
  {
    id: "scroll-3d",
    title: "Scroll 3D + GSAP",
    summary: "Horizontal sticky con capas paralax y blur dinámico.",
    stack: ["Next.js", "GSAP", "ScrollTrigger"],
    cta: "Ver animación",
    accent: "from-accent-1/70 via-amber-400/40 to-orange-300/20",
  },
  {
    id: "live-dash",
    title: "Dashboards en vivo",
    summary: "Sockets + transiciones suaves, probado con alta concurrencia.",
    stack: ["React", "Socket.IO", "Framer Motion"],
    cta: "Probar demo",
    accent: "from-cyan-400/70 via-sky-500/40 to-blue-400/20",
  },
  {
    id: "ai-ops",
    title: "AI Ops Helper",
    summary: "Asistente que resume logs y propone acciones de tickets.",
    stack: ["Python", "FastAPI", "RAG"],
    cta: "Ver workflow",
    accent: "from-purple-400/70 via-fuchsia-400/40 to-pink-300/20",
  },
  {
    id: "micro-uikit",
    title: "Micro UI-Kit",
    summary: "Micro-interacciones magnéticas y sombras volumétricas.",
    stack: ["Tailwind", "Framer Motion"],
    cta: "Explorar kit",
    accent: "from-emerald-400/70 via-teal-400/40 to-green-300/20",
  },
];



