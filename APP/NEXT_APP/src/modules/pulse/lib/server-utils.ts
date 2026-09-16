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

/** Las entidades con nombre que de verdad aparecen en los feeds que leemos. */
const ENTIDADES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'",
  nbsp: " ", ensp: " ", emsp: " ", thinsp: " ", shy: "",
  hellip: "…", mdash: "—", ndash: "–", minus: "−", bull: "•", middot: "·", deg: "°",
  laquo: "«", raquo: "»", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", uuml: "ü",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ",
  euro: "€", pound: "£", copy: "©", reg: "®", trade: "™",
};

/**
 * Deja el texto del feed legible.
 *
 * Dos vueltas a propósito: muchos feeds mandan el resumen codificado dos veces y, al
 * traducir `&amp;` primero, lo que quedaba era un `&nbsp;` literal en mitad del titular.
 * Con una sola pasada por entidad y dos vueltas, `&amp;nbsp;` acaba siendo un espacio.
 */
export function decodeHtmlEntities(input: string) {
  let texto = input.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  for (let vuelta = 0; vuelta < 2 && /&(#x?[0-9a-fA-F]+|\w+);/.test(texto); vuelta++) {
    texto = texto.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (todo, cuerpo: string) => {
      if (cuerpo[0] !== "#") return ENTIDADES[cuerpo] ?? todo;
      const hex = cuerpo[1] === "x" || cuerpo[1] === "X";
      const n = parseInt(hex ? cuerpo.slice(2) : cuerpo.slice(1), hex ? 16 : 10);
      // Fuera del rango válido o en el de sustitutos, `fromCodePoint` lanza.
      if (!Number.isFinite(n) || n <= 0 || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) return todo;
      return String.fromCodePoint(n);
    });
  }
  return texto;
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

/** Media de un tramo del histórico; devuelve null si no hay datos suficientes. */
function media(valores: number[], desde = 0) {
  const tramo = valores.slice(desde).filter((v) => Number.isFinite(v));
  if (tramo.length === 0) return null;
  return tramo.reduce((a, b) => a + b, 0) / tramo.length;
}

/**
 * Lectura técnica de un valor a partir de lo que ya tenemos: su variación del día y su
 * posición respecto a su propia media reciente. Son reglas simples y explicables —nada
 * de predicciones—, pensadas para que el radar diga algo accionable en lugar de «X
 * retrocede»: qué postura sugiere el dato y en qué plazo.
 */
function leerValor(item: {
  id?: string;
  name: string;
  symbol: string;
  changePercent: number;
  sparkline: number[];
}): PulseInsight | null {
  const serie = item.sparkline.filter((v) => Number.isFinite(v) && v > 0);
  if (serie.length < 4) return null;
  const ultimo = serie[serie.length - 1];
  const largo = media(serie);
  const corto = media(serie, Math.floor(serie.length * 0.7));
  if (largo === null || corto === null || largo === 0) return null;

  const distancia = ((ultimo - largo) / largo) * 100; // % respecto a su media reciente
  const impulso = ((corto - largo) / largo) * 100; // hacia dónde se mueve la media corta
  const dia = item.changePercent;
  const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
  const base = `${pct(dia)} en el día · ${pct(distancia)} respecto a su media reciente`;

  if (dia <= -4 && distancia <= -2) {
    return {
      id: `lectura-${item.id ?? item.symbol}`,
      sujeto: item.name,
      title: `${item.symbol} en zona de sobreventa`,
      detail: `${base}. Caídas así son donde suele mirar quien acumula por tramos.`,
      postura: "acumular",
      plazo: "corto",
      tone: "warning",
    };
  }
  if (dia >= 4 && distancia >= 2) {
    return {
      id: `lectura-${item.id ?? item.symbol}`,
      sujeto: item.name,
      title: `${item.symbol} estirado al alza`,
      detail: `${base}. Tras subidas así es cuando se suelen asegurar ganancias parciales.`,
      postura: "tomar-ganancias",
      plazo: "corto",
      tone: "positive",
    };
  }
  if (impulso >= 1 && dia >= 0) {
    return {
      id: `lectura-${item.id ?? item.symbol}`,
      sujeto: item.name,
      title: `${item.symbol} sostiene la tendencia`,
      detail: `${base}. Su media corta va por encima de la larga.`,
      postura: "mantener",
      plazo: "largo",
      tone: "positive",
    };
  }
  if (impulso <= -1 && dia <= 0) {
    return {
      id: `lectura-${item.id ?? item.symbol}`,
      sujeto: item.name,
      title: `${item.symbol} pierde impulso`,
      detail: `${base}. Su media corta va por debajo de la larga.`,
      postura: "esperar",
      plazo: "largo",
      tone: "warning",
    };
  }
  return {
    id: `lectura-${item.id ?? item.symbol}`,
    sujeto: item.name,
    title: `${item.symbol} sin dirección clara`,
    detail: `${base}. Ni impulso ni corrección: rango.`,
    postura: "esperar",
    plazo: "corto",
    tone: "neutral",
  };
}

export function buildInsights(input: {
  news: PulseNewsItem[];
  finance: Array<{
    id?: string;
    name: string;
    symbol: string;
    changePercent: number;
    trend: "up" | "down" | "flat";
    sparkline: number[];
  }>;
  dev?: { recentEvents: PulseGitHubEvent[] };
}): PulseInsight[] {
  const insights: PulseInsight[] = [];

  // Los dos valores que más se han movido, con su lectura. Son los que dicen algo.
  const movidos = [...input.finance]
    .filter((i) => Array.isArray(i.sparkline) && i.sparkline.length >= 4)
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 2);
  for (const item of movidos) {
    const lectura = leerValor(item);
    if (lectura) insights.push(lectura);
  }

  // De seguridad y de IA, el titular concreto: contar señales no le sirve a nadie.
  for (const [categoria, etiqueta, materia, tono] of [
    ["security", "Seguridad", "seguridad", "warning"],
    ["ai", "IA", "IA", "positive"],
  ] as const) {
    const items = input.news.filter((n) => n.category === categoria);
    if (items.length === 0) continue;
    const primera = items[0];
    const otras = items.length - 1;
    const resto = otras === 0 ? "única señal reciente" : otras === 1 ? "y una señal más" : `y ${otras} señales más`;
    insights.push({
      id: `titular-${categoria}`,
      sujeto: etiqueta,
      title: primera.title.length > 72 ? `${primera.title.slice(0, 71)}…` : primera.title,
      detail: `${primera.source} · ${resto} en ${materia}.`,
      postura: "vigilar",
      tone: tono,
      enlace: primera.url,
    });
  }

  if (input.dev?.recentEvents?.length) {
    insights.push({
      id: "dev-activity",
      sujeto: "GitHub",
      title: input.dev.recentEvents[0]?.summary ?? "Actividad técnica reciente",
      detail: `${input.dev.recentEvents.length === 1 ? "Un evento público reciente" : `${input.dev.recentEvents.length} eventos públicos recientes`}.`,
      tone: "neutral",
    });
  }

  return insights.slice(0, 4);
}
