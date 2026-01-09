"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Static mapping of skill categories to suggested technologies
 * Client-side only, no API calls = maximum security
 */
const SKILL_SUGGESTIONS: Record<string, string[]> = {
    // Development
    "desarrollo web": ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Vue.js", "Angular", "Node.js", "PHP", "MySQL", "PostgreSQL", "MongoDB", "Git", "REST API"],
    "frontend": ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Vue.js", "Angular", "Next.js", "Tailwind CSS", "SASS", "Webpack", "Responsive Design", "Web Components"],
    "backend": ["Node.js", "Python", "Java", "PHP", "C#", "Go", "Rust", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker", "REST API", "GraphQL", "Microservices"],
    "fullstack": ["React", "Node.js", "TypeScript", "PostgreSQL", "MongoDB", "Docker", "Git", "REST API", "GraphQL", "AWS", "CI/CD"],

    // Cloud & DevOps
    "devops": ["Docker", "Kubernetes", "AWS", "Azure", "GCP", "CI/CD", "Jenkins", "GitHub Actions", "Terraform", "Ansible", "Linux", "Nginx"],
    "cloud": ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Serverless", "Lambda", "S3", "EC2", "CloudFormation"],
    "infraestructura": ["Linux", "Windows Server", "Docker", "Kubernetes", "Nginx", "Apache", "Terraform", "Ansible", "VMware", "Networking"],

    // Data & AI
    "data science": ["Python", "Pandas", "NumPy", "Scikit-learn", "TensorFlow", "PyTorch", "SQL", "Jupyter", "Matplotlib", "R", "Statistics"],
    "machine learning": ["Python", "TensorFlow", "PyTorch", "Scikit-learn", "Keras", "OpenCV", "NLP", "Deep Learning", "Neural Networks"],
    "inteligencia artificial": ["Python", "TensorFlow", "PyTorch", "LLM", "OpenAI", "Langchain", "Computer Vision", "NLP", "Transformers"],
    "big data": ["Spark", "Hadoop", "Kafka", "Airflow", "Python", "SQL", "Databricks", "ETL", "Data Warehouse"],

    // Mobile
    "mobile": ["React Native", "Flutter", "Swift", "Kotlin", "iOS", "Android", "Firebase", "REST API", "SQLite", "Push Notifications"],
    "android": ["Kotlin", "Java", "Android SDK", "Jetpack Compose", "Firebase", "SQLite", "REST API", "Material Design"],
    "ios": ["Swift", "SwiftUI", "UIKit", "Xcode", "CoreData", "Firebase", "REST API", "App Store Connect"],

    // Security
    "ciberseguridad": ["Penetration Testing", "OWASP", "Kali Linux", "Nmap", "Burp Suite", "Python", "Network Security", "Cryptography"],
    "seguridad": ["OWASP", "SSL/TLS", "OAuth 2.0", "JWT", "Penetration Testing", "Security Audits", "Firewall", "SIEM"],

    // Design & UX
    "diseño": ["Figma", "Adobe XD", "Sketch", "Photoshop", "Illustrator", "UI Design", "UX Design", "Prototyping"],
    "ux": ["User Research", "Wireframing", "Prototyping", "Figma", "User Testing", "A/B Testing", "Design Systems", "Accessibility"],

    // Databases
    "bases de datos": ["PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "SQL", "NoSQL", "Data Modeling", "ORM"],
    "sql": ["PostgreSQL", "MySQL", "SQLite", "SQL Server", "Oracle", "Query Optimization", "Stored Procedures", "Indexing"],

    // Languages
    "python": ["Django", "Flask", "FastAPI", "Pandas", "NumPy", "Pytest", "Poetry", "Virtual Environments"],
    "javascript": ["React", "Vue.js", "Node.js", "TypeScript", "Express", "Next.js", "Jest", "Webpack", "npm/yarn"],
    "java": ["Spring Boot", "Hibernate", "Maven", "JUnit", "Microservices", "REST API", "JDBC"],

    // General
    "programación": ["JavaScript", "Python", "TypeScript", "Java", "C#", "Go", "Git", "Algorithms", "Data Structures"],
    "software": ["Git", "Agile", "Scrum", "JIRA", "CI/CD", "Testing", "Code Review", "Documentation"],

    // Soft skills (sugerencias técnicas relacionadas)
    "gestión de proyectos": ["JIRA", "Confluence", "Agile", "Scrum", "Kanban", "Trello", "Microsoft Project", "Risk Management"],
    "liderazgo": ["Team Management", "Code Review", "Mentoring", "Agile", "Scrum Master", "Technical Leadership"],
};

// Normalize input for matching
const normalizeText = (text: string): string => {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .trim();
};

// Find matching suggestions based on input
const findSuggestions = (input: string): string[] => {
    if (!input || input.length < 2) return [];

    const normalized = normalizeText(input);
    const matches: Set<string> = new Set();

    // Direct match
    if (SKILL_SUGGESTIONS[normalized]) {
        SKILL_SUGGESTIONS[normalized].forEach(s => matches.add(s));
    }

    // Partial match (category contains input or vice versa)
    Object.entries(SKILL_SUGGESTIONS).forEach(([category, skills]) => {
        if (category.includes(normalized) || normalized.includes(category)) {
            skills.forEach(s => matches.add(s));
        }
    });

    // If no matches, try word-based matching
    if (matches.size === 0) {
        const words = normalized.split(/\s+/);
        Object.entries(SKILL_SUGGESTIONS).forEach(([category, skills]) => {
            if (words.some(word => category.includes(word))) {
                skills.slice(0, 6).forEach(s => matches.add(s)); // Limit per category
            }
        });
    }

    return Array.from(matches).slice(0, 12); // Max 12 suggestions
};

interface SkillsSuggestionsProps {
    categoryName: string;
    onAddSkill: (skill: string) => void;
    existingSkills: string[];
}

export function SkillsSuggestions({
    categoryName,
    onAddSkill,
    existingSkills
}: SkillsSuggestionsProps) {
    const [isVisible, setIsVisible] = useState(true);

    const suggestions = useMemo(() => {
        const allSuggestions = findSuggestions(categoryName);
        // Filter out already added skills
        return allSuggestions.filter(
            s => !existingSkills.some(
                e => normalizeText(e) === normalizeText(s)
            )
        );
    }, [categoryName, existingSkills]);

    if (suggestions.length === 0 || !isVisible) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 p-3 rounded-xl bg-gradient-to-r from-teal-500/5 to-emerald-500/5 border border-teal-500/20"
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm">✨</span>
                    <span className="text-xs text-teal-300 font-medium">
                        Sugerencias para "{categoryName}"
                    </span>
                </div>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-neutral-500 hover:text-neutral-300 transition-colors"
                    title="Ocultar sugerencias"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                    {suggestions.map((skill, index) => (
                        <motion.button
                            key={skill}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ delay: index * 0.03 }}
                            onClick={() => onAddSkill(skill)}
                            className="px-3 py-1.5 rounded-full bg-teal-500/10 text-teal-300 text-xs 
                                     hover:bg-teal-500/20 hover:scale-105 transition-all
                                     border border-teal-500/20 hover:border-teal-500/40"
                        >
                            + {skill}
                        </motion.button>
                    ))}
                </AnimatePresence>
            </div>

            <p className="text-[10px] text-neutral-500 mt-2">
                Click para agregar • Sin llamadas a API
            </p>
        </motion.div>
    );
}
