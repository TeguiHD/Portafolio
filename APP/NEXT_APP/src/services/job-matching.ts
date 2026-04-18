type CvSkillCategorySnapshot = {
    category: string;
    items: string[];
};

type CvExperienceSnapshot = {
    description: string | null;
    achievements: string[];
};

type CvProjectSnapshot = {
    description: string | null;
    technologies: string[];
};

export type CvSnapshot = {
    title: string;
    summary: string | null;
    skills: CvSkillCategorySnapshot[];
    experiences: CvExperienceSnapshot[];
    projects: CvProjectSnapshot[];
};

export type VacancyAnalysisResult = {
    matchScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    recommendedSkills: string[];
    extractedKeywords: string[];
    summary: string;
    recommendations: string[];
    learningPlan: string[];
};

const SKILL_DICTIONARY = [
    "javascript", "typescript", "node", "node.js", "react", "next.js", "vue", "angular",
    "python", "java", "c#", "go", "rust", "php", "sql", "postgresql", "mysql", "mongodb",
    "redis", "docker", "kubernetes", "aws", "azure", "gcp", "linux", "git", "github",
    "ci/cd", "graphql", "rest", "api", "tailwind", "sass", "html", "css", "testing",
    "jest", "playwright", "cypress", "prisma", "figma", "scrum", "kanban", "etl", "data",
    "nlp", "machine learning", "ia", "ai", "devops", "oauth", "jwt", "cloudflare"
];

const STOPWORDS = new Set([
    "de", "la", "el", "en", "y", "con", "para", "por", "del", "las", "los", "que", "una", "un", "al",
    "se", "su", "sus", "como", "o", "a", "es", "your", "and", "the", "for", "with", "to", "of"
]);

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9+#./\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function uniqueSorted(values: string[]): string[] {
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function extractSkillHits(text: string): string[] {
    const normalized = ` ${normalizeText(text)} `;
    const hits: string[] = [];

    for (const skill of SKILL_DICTIONARY) {
        const needle = ` ${normalizeText(skill)} `;
        if (normalized.includes(needle)) {
            hits.push(skill);
        }
    }

    return uniqueSorted(hits);
}

function extractKeywords(text: string, maxItems = 12): string[] {
    const normalized = normalizeText(text);
    const words = normalized.split(" ").filter((word) => word.length >= 3 && !STOPWORDS.has(word));
    const freq = new Map<string, number>();

    for (const word of words) {
        freq.set(word, (freq.get(word) || 0) + 1);
    }

    return Array.from(freq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxItems)
        .map(([word]) => word);
}

function collectCvSkills(cv: CvSnapshot): string[] {
    const fromSkillSections = cv.skills.flatMap((section) => section.items);
    const fromProjects = cv.projects.flatMap((project) => project.technologies);
    const fromExperiences = cv.experiences.flatMap((experience) => [
        ...(experience.description ? [experience.description] : []),
        ...experience.achievements,
    ]);

    const implicitSkillHits = extractSkillHits([
        cv.title,
        cv.summary || "",
        ...fromExperiences,
    ].join(" "));

    return uniqueSorted([
        ...fromSkillSections.map((item) => normalizeText(item)),
        ...fromProjects.map((item) => normalizeText(item)),
        ...implicitSkillHits.map((item) => normalizeText(item)),
    ].filter(Boolean));
}

function denormalizeSkill(skill: string): string {
    const directMatch = SKILL_DICTIONARY.find((entry) => normalizeText(entry) === skill);
    return directMatch || skill;
}

export function buildVacancyAnalysis(cv: CvSnapshot, vacancyText: string): VacancyAnalysisResult {
    const vacancySkills = extractSkillHits(vacancyText).map((skill) => normalizeText(skill));
    const cvSkills = collectCvSkills(cv);

    const matchedSkills = vacancySkills.filter((skill) => cvSkills.includes(skill));
    const missingSkills = vacancySkills.filter((skill) => !cvSkills.includes(skill));

    const score = vacancySkills.length === 0
        ? 55
        : Math.max(0, Math.min(100, Math.round((matchedSkills.length / vacancySkills.length) * 100)));

    const recommendations: string[] = [];
    if (matchedSkills.length > 0) {
        recommendations.push("Prioriza tus logros vinculados a las habilidades que ya coinciden con la vacante.");
    }
    if (missingSkills.length > 0) {
        recommendations.push("Evita declarar experiencia no real: presenta las brechas como plan de aprendizaje en la postulacion.");
        recommendations.push("Ajusta el resumen profesional usando palabras clave de la vacante y resultados medibles.");
    }
    if (recommendations.length === 0) {
        recommendations.push("Tu perfil tiene alta afinidad. Refuerza metricas de impacto para aumentar probabilidad de entrevista.");
    }

    const learningPlan = missingSkills.slice(0, 8).map((skill) => `Aprender/fortalecer: ${denormalizeSkill(skill)}`);

    const extractedKeywords = uniqueSorted([
        ...extractKeywords(vacancyText),
        ...vacancySkills.slice(0, 8),
    ]).slice(0, 16);

    const summary = missingSkills.length === 0
        ? "El CV cubre la mayor parte de requisitos tecnicos detectados para esta vacante."
        : `Se detectaron ${missingSkills.length} brechas de habilidad frente a la vacante; se recomienda adaptacion del CV y plan de aprendizaje paralelo.`;

    return {
        matchScore: score,
        matchedSkills: matchedSkills.map(denormalizeSkill),
        missingSkills: missingSkills.map(denormalizeSkill),
        recommendedSkills: missingSkills.slice(0, 10).map(denormalizeSkill),
        extractedKeywords,
        summary,
        recommendations,
        learningPlan,
    };
}
