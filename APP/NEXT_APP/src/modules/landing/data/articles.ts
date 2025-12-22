export interface Article {
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  slug: string;
}

export const articles: Article[] = [
  {
    title: "Next.js a escala: trazas, caché y edge",
    excerpt: "Server Components + edge caching sin perder observabilidad.",
    date: "Nov 2025",
    readTime: "6 min",
    slug: "nextjs-edge-tracing",
  },
  {
    title: "Automatizar ventas con n8n + IA",
    excerpt: "Bots que priorizan leads y sincronizan CRM sin romper compliance.",
    date: "Oct 2025",
    readTime: "7 min",
    slug: "bots-n8n-growth",
  },
  {
    title: "ML en producción sin sustos",
    excerpt: "Versionado, feature stores y alertas que no te despiertan tarde.",
    date: "Sep 2025",
    readTime: "5 min",
    slug: "mlops-pro",
  },
];



