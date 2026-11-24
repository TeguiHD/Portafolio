export type CvVersionOption = {
    id: string;
    name: string;
    isDefault: boolean;
    updatedAt: string;
};

export type WorkMode = "ONSITE" | "HYBRID" | "REMOTE" | "UNSPECIFIED";

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
    REMOTE: "Remoto",
    HYBRID: "Híbrido",
    ONSITE: "Presencial",
    UNSPECIFIED: "No especificado",
};

export type VacancyItem = {
    id: string;
    source: string;
    sourceUrl: string | null;
    title: string;
    company: string;
    location: string | null;
    workMode: WorkMode;
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
    { id: "qwen/qwen3-32b", provider: "GROQ", label: "Qwen 3 32B (Groq)" },
    { id: "openai/gpt-oss-120b", provider: "GROQ", label: "GPT-OSS 120B (Groq)" },
    { id: "nvidia/nemotron-3-super:free", provider: "OPENROUTER", label: "NVIDIA Nemotron 3 Super (OpenRouter)" },
    { id: "z-ai/glm-4.5-air:free", provider: "OPENROUTER", label: "Z.ai GLM 4.5 Air (OpenRouter)" },
    { id: "minimax/minimax-m2.5:free", provider: "OPENROUTER", label: "MiniMax M2.5 (OpenRouter)" },
    { id: "google/gemma-3-27b-it:free", provider: "OPENROUTER", label: "Google Gemma 3 27B (OpenRouter)" },
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
    PENDING: "Pendiente",
    CV_ADAPTED: "CV adaptado",
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
