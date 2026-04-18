import type {
  PulseCategory,
  PulseContextData,
  PulseGitHubEvent,
  PulseInsight,
  PulseNewsItem,
} from "@/modules/pulse/types";

export const PULSE_GITHUB_USERNAME = "TeguiHD";

export function buildTimestampLabel(dateIso: string) {
  const value = new Date(dateIso).getTime();

  if (!Number.isFinite(value)) {
    return "Sin fecha";
  }

  const diffMs = Date.now() - value;
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    return `Publicado hace ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Publicado hace ${diffHours} h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `Publicado hace ${diffDays} d`;
}

export function classifyNewsCategory(title: string, fallback: PulseCategory): PulseCategory {
  const normalized = title.toLowerCase();

  if (/(ai|llm|model|openai|anthropic|gemini|claude|qwen|deepseek|chatglm|\bglm\b|kimi|moonshot|seeddream|seedream|seed dream|gamma|sora|ml|machine learning)/.test(normalized)) {
    return "ai";
  }

  if (/(cve|vulnerability|vulnerab|owasp|nist|mitre|mittre|cisa|kev|security|ciberseguridad|seguridad|breach|brecha|exploit|phishing|malware|ransomware|zero-?day|rce|xss|supply chain)/.test(normalized)) {
    return "security";
  }

  if (/(yc|y combinator|ycombinator|hacker news|startup|funding|launch)/.test(normalized)) {
    return "startup";
  }

  if (/(github|repo|release|framework|typescript|react|node|docker|api|google cloud|gcp|cloudflare|kubernetes|devops)/.test(normalized)) {
    return "dev";
  }

  return fallback;
}

export function decodeHtmlEntities(input: string) {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

export function stripHtml(input: string) {
  return decodeHtmlEntities(input)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractFirstImageUrl(input: string) {
  const imageMatch = input.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  return imageMatch?.[1]?.trim() ?? "";
}

export function extractXmlTag(entry: string, tag: string) {
  const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.trim() ?? "";
}

export function extractXmlAttribute(entry: string, tag: string, attribute: string) {
  const match = entry.match(new RegExp(`<${tag}[^>]*${attribute}="([^"]+)"[^>]*\\/?>`, "i"));
  return match?.[1]?.trim() ?? "";
}

export function parseFeedItems(xml: string) {
  const itemMatches = xml.match(/<item\b[\s\S]*?<\/item>/gi);
  if (itemMatches?.length) {
    return itemMatches.map((entry) => ({
      title: stripHtml(extractXmlTag(entry, "title")),
      url: stripHtml(extractXmlTag(entry, "link")),
      publishedAt: stripHtml(extractXmlTag(entry, "pubDate")),
      excerpt: stripHtml(extractXmlTag(entry, "description")),
      imageUrl:
        extractXmlAttribute(entry, "media:content", "url") ||
        extractXmlAttribute(entry, "media:thumbnail", "url") ||
        extractXmlAttribute(entry, "enclosure", "url") ||
        extractFirstImageUrl(extractXmlTag(entry, "description")),
    }));
  }

  const entryMatches = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];
  return entryMatches.map((entry) => ({
    title: stripHtml(extractXmlTag(entry, "title")),
    url: stripHtml(extractXmlAttribute(entry, "link", "href") || extractXmlTag(entry, "id")),
    publishedAt: stripHtml(extractXmlTag(entry, "updated") || extractXmlTag(entry, "published")),
    excerpt: stripHtml(extractXmlTag(entry, "summary") || extractXmlTag(entry, "content")),
    imageUrl:
      extractXmlAttribute(entry, "media:content", "url") ||
      extractXmlAttribute(entry, "media:thumbnail", "url") ||
      extractFirstImageUrl(extractXmlTag(entry, "content")),
  }));
}

export function getWeatherLabel(code: number) {
  const map: Record<number, string> = {
    0: "Cielo despejado",
    1: "Mayormente despejado",
    2: "Parcialmente nublado",
    3: "Nublado",
    45: "Neblina",
    48: "Escarcha con niebla",
    51: "Llovizna ligera",
    53: "Llovizna moderada",
    55: "Llovizna intensa",
    61: "Lluvia ligera",
    63: "Lluvia moderada",
    65: "Lluvia intensa",
    71: "Nieve ligera",
    73: "Nieve moderada",
    75: "Nieve intensa",
    80: "Chubascos ligeros",
    81: "Chubascos moderados",
    82: "Chubascos intensos",
    95: "Tormenta eléctrica",
  };

  return map[code] ?? "Condición variable";
}

export function buildWeatherMessage(data: PulseContextData) {
  if (data.weatherCode >= 95) {
    return "Condiciones eléctricas activas. Buen momento para hablar de resiliencia y observabilidad.";
  }

  if (data.temperature >= 26) {
    return "Ambiente cálido y ritmo alto. Ideal para revisar mercado y shipping crítico.";
  }

  if (data.temperature <= 9) {
    return "Sesión fría, stack encendido. Buen contexto para foco profundo y hardening.";
  }

  if (!data.isDay) {
    return "Modo nocturno activo. El Command Center queda listo para seguimiento asíncrono.";
  }

  return "Contexto estable. Buen momento para revisar señales de producto, seguridad y mercado.";
}

export function summarizeGitHubEvent(event: {
  type: string;
  repo?: { name?: string };
  payload?: { commits?: Array<unknown>; ref_type?: string; action?: string };
}): string {
  switch (event.type) {
    case "PushEvent":
      return `${event.payload?.commits?.length ?? 0} commit(s) en ${event.repo?.name ?? "repo"}`;
    case "CreateEvent":
      return `Nuevo ${event.payload?.ref_type ?? "recurso"} en ${event.repo?.name ?? "repo"}`;
    case "PullRequestEvent":
      return `Actividad en pull request de ${event.repo?.name ?? "repo"}`;
    case "IssuesEvent":
      return `Issue ${event.payload?.action ?? "actualizado"} en ${event.repo?.name ?? "repo"}`;
    default:
      return `${event.type.replace(/Event$/, "")} en ${event.repo?.name ?? "repo"}`;
  }
}

export function uniqueById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

export function buildPulsePlaceholderImage(source: string, category: string, title: string) {
  return `/api/pulse/placeholder?source=${encodeURIComponent(source)}&category=${encodeURIComponent(category)}&title=${encodeURIComponent(title.slice(0, 90))}`;
}

export function sortNewsItems(items: PulseNewsItem[]) {
  return [...items].sort((left, right) => {
    const rightScore = (right.score ?? 0) + new Date(right.publishedAt).getTime();
    const leftScore = (left.score ?? 0) + new Date(left.publishedAt).getTime();
    return rightScore - leftScore;
  });
}

export function buildInsights(input: {
  news: PulseNewsItem[];
  finance: Array<{ name: string; changePercent: number; trend: "up" | "down" | "flat" }>;
  dev?: { recentEvents: PulseGitHubEvent[] };
}): PulseInsight[] {
  const securityItems = input.news.filter((item) => item.category === "security");
  const aiItems = input.news.filter((item) => item.category === "ai");
  const strongestMove = [...input.finance].sort(
    (left, right) => Math.abs(right.changePercent) - Math.abs(left.changePercent)
  )[0];

  const insights: PulseInsight[] = [];

  if (strongestMove) {
    insights.push({
      id: "market-move",
      title: `${strongestMove.name} ${strongestMove.trend === "down" ? "retrocede" : strongestMove.trend === "up" ? "acelera" : "se mantiene"}`,
      detail: `Movimiento de ${strongestMove.changePercent.toFixed(2)}% en la ventana reciente.`,
      tone: strongestMove.trend === "down" ? "warning" : "positive",
    });
  }

  if (securityItems.length > 0) {
    insights.push({
      id: "security-watch",
      title: "Radar de seguridad activo",
      detail: `${securityItems.length} señal(es) recientes entre NIST, OWASP o CVE Program.`,
      tone: "warning",
    });
  }

  if (aiItems.length > 0) {
    insights.push({
      id: "ai-watch",
      title: "Pulso AI con alta actividad",
      detail: `${aiItems.length} actualización(es) recientes en IA, producto o tooling.`,
      tone: "positive",
    });
  }

  if (input.dev?.recentEvents?.length) {
    insights.push({
      id: "dev-activity",
      title: "Actividad técnica reciente",
      detail: `${input.dev.recentEvents.length} evento(s) públicos recientes en GitHub para alimentar el portafolio vivo.`,
      tone: "neutral",
    });
  }

  return insights.slice(0, 4);
}
