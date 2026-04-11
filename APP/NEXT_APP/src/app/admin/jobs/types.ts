export type CvVersionOption = {
    id: string;
    name: string;
    isDefault: boolean;
    updatedAt: string;
};

export type VacancyItem = {
    id: string;
    source: string;
    sourceUrl: string | null;
    title: string;
    company: string;
    location: string | null;
    isActive: boolean;
    updatedAt: string;
    analyses: Array<{
        id: string;
        matchScore: number;
        createdAt: string;
    }>;
    _count: {
        analyses: number;
        applications: number;
    };
};

export type ApplicationStatus =
    | "PENDING"
    | "CV_ADAPTED"
    | "CV_SENT"
    | "INTERVIEW"
    | "ACCEPTED"
    | "REJECTED"
    | "CLOSED";

export type ApplicationEvent = {
    id: string;
    toStatus: ApplicationStatus;
    fromStatus?: ApplicationStatus | null;
    note: string | null;
    createdAt: string;
};

export type ApplicationItem = {
    id: string;
    status: ApplicationStatus;
    company: string | null;
    roleTitle: string | null;
    notes: string | null;
    sourceUrl: string | null;
    lastStatusAt: string;
    appliedAt?: string | null;
    vacancy: {
        id: string;
        title: string;
        company: string;
        sourceUrl: string | null;
        source: string;
    };
    analysis: {
        id: string;
        matchScore: number;
        missingSkills: string[];
    } | null;
    adaptation?: {
        id: string;
        mode: "ASSISTED" | "AUTO";
    } | null;
    cvVersion?: {
        id: string;
        name: string;
    } | null;
    events: ApplicationEvent[];
};

export type AnalysisSnapshot = {
    analysisId: string;
    adaptationId: string | null;
    adaptedCvVersionId: string | null;
    matchScore: number;
    missingSkills: string[];
    summary: string | null;
};

export type AiProviderChoice = "AUTO" | "GROQ" | "OPENROUTER";

export type AiModelOption = {
    id: string;
    provider: Exclude<AiProviderChoice, "AUTO">;
    label: string;
};

export const AI_MODEL_OPTIONS: AiModelOption[] = [
    { id: "qwen/qwen3-32b", provider: "GROQ", label: "Groq · Qwen 3 32B" },
    { id: "openai/gpt-oss-120b", provider: "GROQ", label: "Groq · GPT-OSS 120B" },
    { id: "nvidia/nemotron-3-super:free", provider: "OPENROUTER", label: "OpenRouter · NVIDIA Nemotron 3 Super" },
    { id: "z-ai/glm-4.5-air:free", provider: "OPENROUTER", label: "OpenRouter · Z.ai GLM 4.5 Air" },
    { id: "minimax/minimax-m2.5:free", provider: "OPENROUTER", label: "OpenRouter · MiniMax M2.5" },
    { id: "google/gemma-3-27b-it:free", provider: "OPENROUTER", label: "OpenRouter · Google Gemma 3 27B" },
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
    PENDING: "Pendiente",
    CV_ADAPTED: "CV Adaptado",
    CV_SENT: "Enviado",
    INTERVIEW: "Entrevista",
    ACCEPTED: "Aceptado",
    REJECTED: "Rechazado",
    CLOSED: "Cerrado",
};

export const STATUS_NEXT: Record<ApplicationStatus, ApplicationStatus | null> = {
    PENDING: "CV_ADAPTED",
    CV_ADAPTED: "CV_SENT",
    CV_SENT: "INTERVIEW",
    INTERVIEW: "ACCEPTED",
    ACCEPTED: null,
    REJECTED: null,
    CLOSED: null,
};

export const STATUS_TERMINAL: Set<ApplicationStatus> = new Set([
    "ACCEPTED",
    "REJECTED",
    "CLOSED",
]);

export const SOURCE_LABELS: Record<string, string> = {
    MANUAL: "Manual",
    LINKEDIN: "LinkedIn",
    COMPUTRABAJO: "Computrabajo",
    LABORUM: "Laborum",
    FIRSTJOB: "FirstJob",
    CHILE_EMPLEOS: "Chile Empleos",
    INDEED: "Indeed",
    GETONBOARD: "Get on Board",
    TRABAJANDO: "Trabajando.com",
    CHILETRABAJOS: "Chiletrabajos",
    HIRELINE: "Hireline",
    TORRE: "Torre",
    WORKANA: "Workana",
    TRABAJA_ESTADO: "Trabaja en el Estado",
    BNE: "BNE",
    OTHER: "Otro",
};
