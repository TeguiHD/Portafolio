"use client";

import { motion } from "framer-motion";
import {
    Code2,
    FileType,
    Database,
    Server,
    Box,
    Globe,
    Layers,
    Cpu,
    GitBranch,
    Terminal,
    Cloud
} from "lucide-react";

// Safe Fallback: Lucide Icons with Brand Colors
// This avoids "NS_BINDING_ABORTED" from external CDNs.
const technologies = [
    { name: "Next.js", icon: Globe, color: "text-white" },
    { name: "React", icon: Code2, color: "text-blue-400" },
    { name: "TypeScript", icon: FileType, color: "text-blue-500" },
    { name: "Tailwind", icon: Layers, color: "text-cyan-400" },
    { name: "Node.js", icon: Server, color: "text-green-500" },
    { name: "PostgreSQL", icon: Database, color: "text-blue-300" },
    { name: "Docker", icon: Box, color: "text-blue-600" },
    { name: "AWS", icon: Cloud, color: "text-orange-500" },
    { name: "Redis", icon: Database, color: "text-red-500" },
    { name: "Python", icon: Terminal, color: "text-yellow-400" },
    { name: "Git", icon: GitBranch, color: "text-orange-600" },
    { name: "AI/ML", icon: Cpu, color: "text-purple-400" }
];

export function TechnologiesSection() {
    return (
        <section id="tecnologias" className="relative py-32 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto text-center">

                <h2 className="text-3xl md:text-5xl font-bold text-white mb-16">
                    Main <span className="text-gray-500">Stack</span>
                </h2>

                {/* Grid Clean with Icons */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-12 md:gap-16 items-center justify-center">
                    {technologies.map((tech, i) => (
                        <motion.div
                            key={tech.name}
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ scale: 1.1 }}
                            className="flex flex-col items-center gap-4 group cursor-default"
                        >
                            <div className="h-14 w-14 md:h-16 md:w-16 relative flex items-center justify-center bg-white/5 rounded-2xl group-hover:bg-white/10 transition-colors border border-white/5 group-hover:border-white/20">
                                {/* Glow on hover */}
                                <div className={`absolute inset-0 blur-xl opacity-0 group-hover:opacity-40 transition-opacity rounded-full bg-current ${tech.color}`} />

                                <tech.icon className={`w-8 h-8 md:w-10 md:h-10 ${tech.color} transition-all`} />
                            </div>
                            <span className="text-sm text-gray-500 group-hover:text-white transition-colors font-medium">
                                {tech.name}
                            </span>
                        </motion.div>
                    ))}
                </div>

            </div>
        </section>
    );
}
