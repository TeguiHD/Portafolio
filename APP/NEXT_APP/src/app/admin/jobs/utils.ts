export function normalizeTerm(value: string): string {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

export function matchSearch(query: string, values: Array<string | null | undefined>): boolean {
    if (!query) {
        return true;
    }

    const q = normalizeTerm(query);
    return values.some((value) => normalizeTerm(value || "").includes(q));
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text) {
        return {} as T;
    }

    try {
        return JSON.parse(text) as T;
    } catch {
        return {} as T;
    }
}

export function formatDate(value: string | null | undefined): string {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return new Intl.DateTimeFormat("es-CL", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

export function timeAgo(value: string | null | undefined): string {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return "hace segundos";
    if (minutes < 60) return `hace ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `hace ${days}d`;
    const months = Math.floor(days / 30);
    return `hace ${months}mes`;
}

export function scoreColor(score: number): {
    text: string;
    bg: string;
    border: string;
    label: string;
} {
    if (score >= 70) {
        return {
            text: "text-emerald-300",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/30",
            label: "Alto",
        };
    }
    if (score >= 40) {
        return {
            text: "text-amber-300",
            bg: "bg-amber-500/10",
            border: "border-amber-500/30",
            label: "Medio",
        };
    }
    return {
        text: "text-red-300",
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        label: "Bajo",
    };
}
