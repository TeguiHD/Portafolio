"use client";

import { motion } from "framer-motion";
import Link from "next/link";

// Blog posts data (will be replaced with MDX file reading)
const blogPosts = [
    {
        slug: "automatizaciones-n8n-guia-completa",
        title: "Automatizaciones con n8n: Guía Completa para No-Code",
        excerpt: "Aprende a crear workflows automatizados sin código. Desde lead nurturing hasta integraciones con CRM y WhatsApp.",
        date: "2024-12-01",
        readTime: "8 min",
        tags: ["n8n", "Automatización", "No-Code"],
        featured: true,
    },
    {
        slug: "docker-para-desarrolladores",
        title: "Docker para Desarrolladores: De Zero a Production",
        excerpt: "Todo lo que necesitas saber sobre contenedores, docker-compose, y despliegue en producción con buenas prácticas.",
        date: "2024-11-15",
        readTime: "12 min",
        tags: ["Docker", "DevOps", "CI/CD"],
        featured: true,
    },
    {
        slug: "prisma-postgresql-next-js",
        title: "Prisma + PostgreSQL + Next.js: El Stack Perfecto",
        excerpt: "Cómo configurar un backend type-safe con Prisma ORM, migrations, y mejores patrones de acceso a datos.",
        date: "2024-11-01",
        readTime: "10 min",
        tags: ["Prisma", "PostgreSQL", "Next.js"],
        featured: false,
    },
    {
        slug: "machine-learning-retail-prediccion",
        title: "ML Aplicado en Retail: Predicción de Demanda",
        excerpt: "Caso práctico de cómo implementar un pipeline de ML para predecir demanda con 92% de precisión.",
        date: "2024-10-20",
        readTime: "15 min",
        tags: ["Machine Learning", "Python", "Retail"],
        featured: false,
    },
    {
        slug: "nextjs-app-router-patrones",
        title: "Next.js App Router: Patrones y Mejores Prácticas",
        excerpt: "Server Components, streaming, Suspense, y cómo estructurar aplicaciones modernas con el nuevo App Router.",
        date: "2024-10-05",
        readTime: "11 min",
        tags: ["Next.js", "React", "TypeScript"],
        featured: false,
    },
    {
        slug: "integracion-apis-webhook-arquitectura",
        title: "Integración de APIs: Webhooks y Arquitectura Event-Driven",
        excerpt: "Diseño de sistemas desacoplados con webhooks, eventos, y patrones para integraciones robustas.",
        date: "2024-09-15",
        readTime: "9 min",
        tags: ["APIs", "Webhooks", "Arquitectura"],
        featured: false,
    },
];

export default function BlogPage() {
    const featuredPosts = blogPosts.filter((p) => p.featured);
    const regularPosts = blogPosts.filter((p) => !p.featured);

    return (
        <main className="min-h-screen bg-primary px-5 py-24 sm:px-10">
            <div className="mx-auto max-w-6xl space-y-16">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <p className="text-xs uppercase tracking-[0.3em] text-accent-1">Blog Técnico</p>
                    <h1 className="text-4xl font-bold text-white sm:text-5xl">
                        Artículos y{" "}
                        <span className="bg-gradient-to-r from-accent-1 to-accent-2 bg-clip-text text-transparent">
                            tutoriales
                        </span>
                    </h1>
                    <p className="max-w-2xl text-lg text-neutral-400">
                        Guías técnicas, casos de estudio, y mejores prácticas sobre desarrollo web,
                        automatización, y machine learning.
                    </p>
                </motion.div>

                {/* Featured Posts */}
                <section>
                    <h2 className="text-xl font-semibold text-white mb-6">Destacados</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {featuredPosts.map((post, idx) => (
                            <motion.article
                                key={post.slug}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <Link
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    href={`/blog/${post.slug}` as any}
                                    className="group block glass-panel rounded-2xl border-2 border-accent-1/30 p-8 transition-all hover:border-accent-1 hover:bg-accent-1/5"
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="px-3 py-1 rounded-full bg-accent-1/20 text-accent-1 text-xs font-semibold">
                                            Destacado
                                        </span>
                                        <span className="text-xs text-neutral-500">{post.readTime} lectura</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white group-hover:text-accent-1 transition-colors mb-3">
                                        {post.title}
                                    </h3>
                                    <p className="text-neutral-400 mb-4">{post.excerpt}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {post.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-2 py-1 rounded-full bg-white/5 text-xs text-neutral-300"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </Link>
                            </motion.article>
                        ))}
                    </div>
                </section>

                {/* All Posts */}
                <section>
                    <h2 className="text-xl font-semibold text-white mb-6">Todos los artículos</h2>
                    <div className="space-y-4">
                        {regularPosts.map((post, idx) => (
                            <motion.article
                                key={post.slug}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + idx * 0.05 }}
                            >
                                <Link
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    href={`/blog/${post.slug}` as any}
                                    className="group flex items-center gap-6 glass-panel rounded-xl border border-accent-1/20 p-6 transition-all hover:border-accent-1/40 hover:bg-white/5"
                                >
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-white group-hover:text-accent-1 transition-colors mb-2">
                                            {post.title}
                                        </h3>
                                        <p className="text-sm text-neutral-400 line-clamp-1">{post.excerpt}</p>
                                    </div>
                                    <div className="hidden sm:flex flex-wrap gap-2">
                                        {post.tags.slice(0, 2).map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-2 py-1 rounded-full bg-white/5 text-xs text-neutral-400"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <span className="text-xs text-neutral-500 whitespace-nowrap">{post.readTime}</span>
                                </Link>
                            </motion.article>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}
