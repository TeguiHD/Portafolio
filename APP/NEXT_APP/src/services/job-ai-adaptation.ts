import type { CvSnapshot, VacancyAnalysisResult } from "@/services/job-matching";
import {
    getBalancedCvProviderOrder,
    markCvProviderFailure,
    markCvProviderSuccess,
    reserveCvProvider,
    tryAcquireCvProcessingSlot,
    type CvAiProviderName,
} from "@/lib/cv-load-balancer";

export type JobAiProviderPreference = "AUTO" | "GROQ" | "OPENROUTER";

export type JobAiModelOption = {
    id: string;
    label: string;
    provider: Exclude<JobAiProviderPreference, "AUTO">;
};

export const JOB_AI_MODEL_OPTIONS: JobAiModelOption[] = [
    { id: "qwen/qwen3-32b", label: "Groq: qwen/qwen3-32b", provider: "GROQ" },
    { id: "openai/gpt-oss-120b", label: "Groq: openai/gpt-oss-120b", provider: "GROQ" },
    { id: "nvidia/nemotron-3-super:free", label: "OpenRouter: NVIDIA Nemotron 3 Super", provider: "OPENROUTER" },
    { id: "z-ai/glm-4.5-air:free", label: "OpenRouter: Z.ai GLM 4.5 Air", provider: "OPENROUTER" },
    { id: "minimax/minimax-m2.5:free", label: "OpenRouter: MiniMax M2.5", provider: "OPENROUTER" },
    { id: "google/gemma-3-27b-it:free", label: "OpenRouter: Google Gemma family (free)", provider: "OPENROUTER" },
];

type AiProviderConfig = {
    name: CvAiProviderName;
    url: string;
    defaultModel: string;
    getApiKey: () => string | null;
    headers: (apiKey: string) => Record<string, string>;
};

type AiAdaptationInput = {
    userId?: string;
    providerPreference: JobAiProviderPreference;
    model?: string;
    cv: CvSnapshot;
    vacancy: {
        title: string;
        company: string;
        location: string | null;
        description: string;
    };
    deterministic: VacancyAnalysisResult;
};

export type AiExperiencePatch = {
    sortOrder: number;
    description?: string;
    achievements?: string[];
};

export type AiProjectPatch = {
    sortOrder: number;
    description?: string;
    technologies?: string[];
};

export type JobAiAdaptationPlan = {
    title?: string;
    summary?: string;
    experiencePatches: AiExperiencePatch[];
    projectPatches: AiProjectPatch[];
    keywordHighlights: string[];
    rationale: string[];
};

export type JobAiAdaptationResult = {
    used: boolean;
    provider?: "GROQ" | "OPENROUTER";
    model?: string;
    plan?: JobAiAdaptationPlan;
    error?: string;
};

const PROVIDERS: AiProviderConfig[] = [
    {
        name: "GROQ",
        url: "https://api.groq.com/openai/v1/chat/completions",
        defaultModel: process.env.JOBS_AI_GROQ_MODEL || "qwen/qwen3-32b",
        getApiKey: () => process.env.GROQ_API_KEY || null,
        headers: (apiKey: string) => ({
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        }),
    },
    {
        name: "OPENROUTER",
        url: "https://openrouter.ai/api/v1/chat/completions",
        defaultModel: process.env.JOBS_AI_OPENROUTER_MODEL || "google/gemma-3-27b-it:free",
        getApiKey: () => process.env.OPENROUTER_API_KEY || process.env.DEEPSEEK_OPENROUTER_API_KEY || null,
        headers: (apiKey: string) => ({
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://nicoholas.dev",
            "X-Title": "Jobs CV Adaptation",
        }),
    },
];

const OUTPUT_MAX = {
    title: 180,
    summary: 6000,
    description: 4000,
    achievement: 300,
    technology: 80,
    keyword: 80,
    rationale: 220,
};

function sanitizeText(value: string, max: number): string {
    const withoutControl = value
        .split("")
        .map((char) => {
            const code = char.charCodeAt(0);
            return code < 32 || code === 127 ? " " : char;
        })
        .join("");

    return withoutControl
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max);
}

function safeStringArray(value: unknown, maxItems: number, maxChars: number): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter((item) => typeof item === "string")
        .map((item) => sanitizeText(item, maxChars))
        .filter(Boolean)
        .slice(0, maxItems);
}

function buildSystemPrompt(): string {
    return [
        "You are an expert ATS-oriented CV adaptation assistant.",
        "Critical rules:",
        "1) Never invent new experience, years, companies, metrics, skills, certifications, or projects.",
        "2) You can only rephrase, reorder emphasis, and improve wording of facts that already exist in the CV.",
        "3) Missing skills from vacancy must be listed only as learning gaps, never inserted as existing skills.",
        "4) Output must be valid JSON only, no markdown and no extra commentary.",
        "5) Keep language concise and professional.",
        "JSON schema:",
        "{",
        '  "title": "optional string",',
        '  "summary": "optional string",',
        '  "experiencePatches": [{"sortOrder":0,"description":"optional","achievements":["optional"]}],',
        '  "projectPatches": [{"sortOrder":0,"description":"optional","technologies":["optional"]}],',
        '  "keywordHighlights": ["keyword1", "keyword2"],',
        '  "rationale": ["short reason 1", "short reason 2"]',
        "}",
    ].join("\n");
}

function buildUserPrompt(input: AiAdaptationInput): string {
    const cvPayload = {
        title: input.cv.title,
        summary: input.cv.summary,
        skills: input.cv.skills,
        experiences: input.cv.experiences.map((item, index) => ({
            sortOrder: index,
            description: item.description,
            achievements: item.achievements,
        })),
        projects: input.cv.projects.map((item, index) => ({
            sortOrder: index,
            description: item.description,
            technologies: item.technologies,
        })),
    };

    const vacancyPayload = {
        title: input.vacancy.title,
        company: input.vacancy.company,
        location: input.vacancy.location,
        description: input.vacancy.description,
    };

    const analysisPayload = {
        matchedSkills: input.deterministic.matchedSkills,
        missingSkills: input.deterministic.missingSkills,
        recommendedSkills: input.deterministic.recommendedSkills,
    };

    return [
        "Adapt this CV to better align with the vacancy while preserving truthfulness.",
        "Do not fabricate experience.",
        "Return JSON only.",
        `CV=${JSON.stringify(cvPayload)}`,
        `VACANCY=${JSON.stringify(vacancyPayload)}`,
        `ANALYSIS=${JSON.stringify(analysisPayload)}`,
    ].join("\n\n");
}

function parseJsonResponse(content: string): Record<string, unknown> | null {
    const cleaned = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/gi, "")
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .trim();

    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
        return null;
    }

    try {
        return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
        return null;
    }
}

function normalizePlan(parsed: Record<string, unknown>): JobAiAdaptationPlan {
    const rawTitle = typeof parsed.title === "string" ? sanitizeText(parsed.title, OUTPUT_MAX.title) : "";
    const rawSummary = typeof parsed.summary === "string" ? sanitizeText(parsed.summary, OUTPUT_MAX.summary) : "";

    const experiencePatches: AiExperiencePatch[] = [];
    if (Array.isArray(parsed.experiencePatches)) {
        for (const item of parsed.experiencePatches) {
            if (!item || typeof item !== "object") {
                continue;
            }

            const rec = item as Record<string, unknown>;
            const sortOrder = typeof rec.sortOrder === "number" ? rec.sortOrder : -1;
            if (sortOrder < 0) {
                continue;
            }

            const patch: AiExperiencePatch = {
                sortOrder,
            };

            if (typeof rec.description === "string") {
                const description = sanitizeText(rec.description, OUTPUT_MAX.description);
                if (description) {
                    patch.description = description;
                }
            }

            const achievements = safeStringArray(rec.achievements, 6, OUTPUT_MAX.achievement);
            if (achievements.length > 0) {
                patch.achievements = achievements;
            }

            experiencePatches.push(patch);
            if (experiencePatches.length >= 8) {
                break;
            }
        }
    }

    const projectPatches: AiProjectPatch[] = [];
    if (Array.isArray(parsed.projectPatches)) {
        for (const item of parsed.projectPatches) {
            if (!item || typeof item !== "object") {
                continue;
            }

            const rec = item as Record<string, unknown>;
            const sortOrder = typeof rec.sortOrder === "number" ? rec.sortOrder : -1;
            if (sortOrder < 0) {
                continue;
            }

            const patch: AiProjectPatch = {
                sortOrder,
            };

            if (typeof rec.description === "string") {
                const description = sanitizeText(rec.description, OUTPUT_MAX.description);
                if (description) {
                    patch.description = description;
                }
            }

            const technologies = safeStringArray(rec.technologies, 8, OUTPUT_MAX.technology);
            if (technologies.length > 0) {
                patch.technologies = technologies;
            }

            projectPatches.push(patch);
            if (projectPatches.length >= 8) {
                break;
            }
        }
    }

    return {
        title: rawTitle || undefined,
        summary: rawSummary || undefined,
        experiencePatches,
        projectPatches,
        keywordHighlights: safeStringArray(parsed.keywordHighlights, 14, OUTPUT_MAX.keyword),
        rationale: safeStringArray(parsed.rationale, 8, OUTPUT_MAX.rationale),
    };
}

async function callProvider(
    provider: AiProviderConfig,
    model: string,
    input: AiAdaptationInput
): Promise<JobAiAdaptationResult> {
    const apiKey = provider.getApiKey();
    if (!apiKey) {
        return { used: false, error: `${provider.name}_API_KEY_MISSING` };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    const releaseProvider = await reserveCvProvider(provider.name);

    try {
        const response = await fetch(provider.url, {
            method: "POST",
            headers: provider.headers(apiKey),
            signal: controller.signal,
            body: JSON.stringify({
                model,
                messages: [
                    { role: "system", content: buildSystemPrompt() },
                    { role: "user", content: buildUserPrompt(input) },
                ],
                temperature: 0.35,
                max_tokens: 1600,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            await markCvProviderFailure(provider.name);
            return {
                used: false,
                provider: provider.name,
                model,
                error: `${provider.name}_HTTP_${response.status}:${sanitizeText(errText, 200)}`,
            };
        }

        const data = await response.json() as {
            choices?: Array<{ message?: { content?: string } }>;
        };

        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            await markCvProviderFailure(provider.name);
            return {
                used: false,
                provider: provider.name,
                model,
                error: "EMPTY_AI_RESPONSE",
            };
        }

        const parsed = parseJsonResponse(content);
        if (!parsed) {
            await markCvProviderFailure(provider.name);
            return {
                used: false,
                provider: provider.name,
                model,
                error: "INVALID_AI_JSON",
            };
        }

        await markCvProviderSuccess(provider.name);

        return {
            used: true,
            provider: provider.name,
            model,
            plan: normalizePlan(parsed),
        };
    } catch (error) {
        await markCvProviderFailure(provider.name);

        if (error instanceof DOMException && error.name === "AbortError") {
            return {
                used: false,
                provider: provider.name,
                model,
                error: "AI_TIMEOUT",
            };
        }

        return {
            used: false,
            provider: provider.name,
            model,
            error: error instanceof Error ? sanitizeText(error.message, 180) : "AI_REQUEST_FAILED",
        };
    } finally {
        clearTimeout(timeout);
        await releaseProvider();
    }
}

async function resolveProviderOrder(preference: JobAiProviderPreference): Promise<AiProviderConfig[]> {
    const providerMap = new Map(PROVIDERS.map((provider) => [provider.name, provider]));
    const orderedNames = await getBalancedCvProviderOrder(
        preference,
        PROVIDERS.map((provider) => provider.name)
    );

    return orderedNames
        .map((name) => providerMap.get(name))
        .filter((provider): provider is AiProviderConfig => Boolean(provider));
}

function modelBelongsToProvider(provider: AiProviderConfig, model?: string): boolean {
    if (!model) {
        return false;
    }

    const option = JOB_AI_MODEL_OPTIONS.find((item) => item.id === model);
    if (!option) {
        return true;
    }

    return option.provider === provider.name;
}

export async function generateJobCvAiAdaptation(input: AiAdaptationInput): Promise<JobAiAdaptationResult> {
    const loadLease = await tryAcquireCvProcessingSlot(input.userId || "jobs-cv-adaptation");
    if (!loadLease.acquired) {
        return {
            used: false,
            error: `CV_LOAD_SHED_ACTIVE_${loadLease.snapshot.activeUsers}`,
        };
    }

    try {
        const providerOrder = await resolveProviderOrder(input.providerPreference);
        let lastError: string | undefined;

        for (const provider of providerOrder) {
            const requestedModel = modelBelongsToProvider(provider, input.model)
                ? (input.model || provider.defaultModel)
                : provider.defaultModel;

            const attemptModels = [requestedModel];
            if (requestedModel !== provider.defaultModel) {
                attemptModels.push(provider.defaultModel);
            }

            for (const model of attemptModels) {
                const result = await callProvider(provider, model, input);
                if (result.used) {
                    return result;
                }

                lastError = result.error || lastError;
            }
        }

        return {
            used: false,
            error: lastError || "NO_AI_PROVIDER_AVAILABLE",
        };
    } finally {
        await loadLease.release();
    }
}
