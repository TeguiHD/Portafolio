import type { PulseNewsItem } from "@/modules/pulse/types";
import { fetchArticlePreview } from "@/modules/pulse/lib/article-preview";
import {
  buildTimestampLabel,
  buildPulsePlaceholderImage,
  classifyNewsCategory,
  parseFeedItems,
  sortNewsItems,
  stripHtml,
  uniqueById,
} from "@/modules/pulse/lib/server-utils";

const THE_HACKER_NEWS_RSS = "https://feeds.feedburner.com/TheHackersNews";
const CISA_KEV_API = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const CISA_ADVISORIES_RSS = "https://www.cisa.gov/cybersecurity-advisories/all.xml";
const NIST_CYBERSECURITY_RSS = "https://www.nist.gov/news-events/cybersecurity/rss.xml";
const OWASP_RSS = "https://owasp.org/feed.xml";
const MITRE_CVE_RSS = "https://www.cve.org/NewsAndEvents/News?feed=rss";
const GITHUB_BLOG_RSS = "https://github.blog/feed/";
const STACK_OVERFLOW_BLOG_RSS = "https://stackoverflow.blog/feed/";
const CLOUDFLARE_BLOG_RSS = "https://blog.cloudflare.com/rss/";
const YCOMBINATOR_BLOG_RSS = "https://www.ycombinator.com/blog/rss/";
const YCOMBINATOR_HN_RSS = "https://news.ycombinator.com/rss";

const OPENAI_NEWS_RSS = "https://openai.com/news/rss.xml";
const CLAUDE_SIGNAL_RSS = "https://news.google.com/rss/search?q=site:anthropic.com%20Claude%20when:30d&hl=en-US&gl=US&ceid=US:en";
const GOOGLE_AI_RSS = "https://blog.google/technology/ai/rss/";
const QWEN_RELEASES_ATOM = "https://github.com/QwenLM/qwen-code/releases.atom";
const KIMI_RELEASES_ATOM = "https://github.com/MoonshotAI/kimi-cli/releases.atom";
const GLM_COMMITS_ATOM = "https://github.com/zai-org/GLM-4.5/commits/main.atom";
const BYTEDANCE_SEED_RELEASES_ATOM = "https://github.com/ByteDance-Seed/VeOmni/releases.atom";
const GAMMA_COMMITS_ATOM = "https://github.com/gamma-app/gamma-docs/commits/main.atom";
const SORA_SIGNAL_RSS = "https://news.google.com/rss/search?q=OpenAI%20Sora%20video%20model%20when:30d&hl=en-US&gl=US&ceid=US:en";

const MAX_NEWS_ITEMS = 18;
const MAX_ITEMS_PER_SOURCE = 3;
const MAX_EXCERPT_CHARS = 220;
const UNKNOWN_PUBLISHED_AT = "2000-01-01T00:00:00.000Z";

const CATEGORY_TARGETS: Partial<Record<PulseNewsItem["category"], number>> = {
  ai: 6,
  security: 6,
  dev: 4,
  startup: 2,
};

interface FeedSourceOptions {
  maxItems?: number;
  providerLabel?: string;
  revalidate?: number;
  forceCategory?: PulseNewsItem["category"];
  keywords?: string[];
  requiredKeywords?: string[];
  scoreBoost?: number;
}

interface FeedSourceDescriptor extends FeedSourceOptions {
  url: string;
  source: string;
  fallbackCategory: PulseNewsItem["category"];
}

const AI_FEED_SOURCES: FeedSourceDescriptor[] = [
  {
    url: OPENAI_NEWS_RSS,
    source: "OpenAI",
    fallbackCategory: "ai",
    maxItems: 3,
    providerLabel: "OpenAI News",
    scoreBoost: 4,
    keywords: ["openai", "chatgpt", "gpt", "sora"],
  },
  {
    url: CLAUDE_SIGNAL_RSS,
    source: "Claude",
    fallbackCategory: "ai",
    maxItems: 2,
    providerLabel: "Anthropic",
    requiredKeywords: ["claude", "anthropic"],
    scoreBoost: 3,
    keywords: ["claude", "anthropic", "model card", "safety"],
  },
  {
    url: GOOGLE_AI_RSS,
    source: "Gemini",
    fallbackCategory: "ai",
    maxItems: 3,
    providerLabel: "Google AI",
    scoreBoost: 3,
    keywords: ["gemini", "google ai", "veo", "imagen"],
  },
  {
    url: QWEN_RELEASES_ATOM,
    source: "Qwen",
    fallbackCategory: "ai",
    maxItems: 2,
    providerLabel: "Qwen Releases",
    scoreBoost: 3,
    keywords: ["qwen", "qwen3", "qwen-code"],
  },
  {
    url: KIMI_RELEASES_ATOM,
    source: "Kimi",
    fallbackCategory: "ai",
    maxItems: 2,
    providerLabel: "Kimi Releases",
    scoreBoost: 3,
    keywords: ["kimi", "moonshot"],
  },
  {
    url: GLM_COMMITS_ATOM,
    source: "GLM",
    fallbackCategory: "ai",
    maxItems: 2,
    providerLabel: "GLM Activity",
    scoreBoost: 2,
    keywords: ["glm", "chatglm", "zhipu"],
  },
  {
    url: BYTEDANCE_SEED_RELEASES_ATOM,
    source: "SeedDream",
    fallbackCategory: "ai",
    maxItems: 2,
    providerLabel: "ByteDance Seed",
    scoreBoost: 2,
    keywords: ["seed", "seedream", "seeddream", "veomni"],
  },
  {
    url: GAMMA_COMMITS_ATOM,
    source: "Gamma",
    fallbackCategory: "ai",
    maxItems: 2,
    providerLabel: "Gamma",
    scoreBoost: 1,
    keywords: ["gamma", "ai", "generation"],
  },
  {
    url: SORA_SIGNAL_RSS,
    source: "Sora",
    fallbackCategory: "ai",
    maxItems: 1,
    providerLabel: "Sora Watch",
    requiredKeywords: ["sora"],
    scoreBoost: 2,
    keywords: ["sora", "openai", "video model"],
  },
];

const SECURITY_FEED_SOURCES: FeedSourceDescriptor[] = [
  {
    url: THE_HACKER_NEWS_RSS,
    source: "The Hacker News",
    fallbackCategory: "security",
    maxItems: 4,
    providerLabel: "The Hacker News",
    scoreBoost: 4,
    keywords: ["cve", "exploit", "ransomware", "breach", "zero-day"],
  },
  {
    url: CISA_ADVISORIES_RSS,
    source: "CISA",
    fallbackCategory: "security",
    maxItems: 3,
    providerLabel: "CISA Advisories",
    scoreBoost: 4,
    keywords: ["cisa", "advisory", "cve", "vulnerability"],
  },
  {
    url: NIST_CYBERSECURITY_RSS,
    source: "NIST",
    fallbackCategory: "security",
    maxItems: 3,
    providerLabel: "NIST Cybersecurity",
    scoreBoost: 3,
    keywords: ["nist", "framework", "security", "crypto"],
  },
  {
    url: OWASP_RSS,
    source: "OWASP",
    fallbackCategory: "security",
    maxItems: 3,
    providerLabel: "OWASP",
    scoreBoost: 3,
    keywords: ["owasp", "appsec", "top 10", "vulnerability"],
  },
  {
    url: MITRE_CVE_RSS,
    source: "MITRE",
    fallbackCategory: "security",
    maxItems: 3,
    providerLabel: "MITRE / CVE",
    scoreBoost: 3,
    keywords: ["mitre", "cve", "attack", "adversary"],
  },
];

const DEV_FEED_SOURCES: FeedSourceDescriptor[] = [
  {
    url: GITHUB_BLOG_RSS,
    source: "GitHub Blog",
    fallbackCategory: "dev",
    maxItems: 4,
    providerLabel: "GitHub Blog",
    scoreBoost: 4,
    keywords: ["github", "copilot", "actions", "release"],
  },
  {
    url: STACK_OVERFLOW_BLOG_RSS,
    source: "Stack Overflow",
    fallbackCategory: "dev",
    maxItems: 3,
    providerLabel: "Stack Overflow Blog",
    scoreBoost: 2,
    keywords: ["developer", "engineering", "api", "product"],
  },
  {
    url: CLOUDFLARE_BLOG_RSS,
    source: "Cloudflare",
    fallbackCategory: "dev",
    maxItems: 3,
    providerLabel: "Cloudflare Blog",
    scoreBoost: 2,
    keywords: ["workers", "developer", "edge", "api"],
  },
];

const STARTUP_FEED_SOURCES: FeedSourceDescriptor[] = [
  {
    url: YCOMBINATOR_BLOG_RSS,
    source: "Y Combinator",
    fallbackCategory: "startup",
    maxItems: 4,
    providerLabel: "YC Blog",
    scoreBoost: 4,
    keywords: ["startup", "founder", "fundraising", "y combinator"],
  },
  {
    url: YCOMBINATOR_HN_RSS,
    source: "Hacker News (YC)",
    fallbackCategory: "startup",
    maxItems: 3,
    providerLabel: "Hacker News",
    scoreBoost: 2,
    keywords: ["startup", "launch", "hiring", "yc", "ycombinator"],
  },
];

function normalizeIsoDate(candidate?: string | null) {
  if (!candidate) return null;

  const parsed = new Date(candidate);
  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function extractDateFromUrl(url: string) {
  const match = url.match(/(20\d{2})[/_-](0?[1-9]|1[0-2])[/_-](0?[1-9]|[12]\d|3[01])/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function resolvePublishedAt(candidate: string | undefined, url: string) {
  const direct = normalizeIsoDate(candidate);
  if (direct) {
    return {
      publishedAt: direct,
      isReliable: true,
    };
  }

  const fromUrl = extractDateFromUrl(url);
  if (fromUrl) {
    return {
      publishedAt: fromUrl,
      isReliable: true,
    };
  }

  return {
    publishedAt: UNKNOWN_PUBLISHED_AT,
    isReliable: false,
  };
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function truncateExcerpt(input?: string | null, maxChars = MAX_EXCERPT_CHARS) {
  if (!input) {
    return undefined;
  }

  const clean = stripHtml(input).replace(/\s+/g, " ").trim();
  if (!clean) {
    return undefined;
  }

  if (clean.length <= maxChars) {
    return clean;
  }

  const cut = clean.slice(0, maxChars + 1);
  const lastSpace = cut.lastIndexOf(" ");
  const safe = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut.slice(0, maxChars)).trim();
  return `${safe}...`;
}

function uniqueByUrl(items: PulseNewsItem[]) {
  const seen = new Set<string>();
  const unique: PulseNewsItem[] = [];

  for (const item of items) {
    const key = (item.url || item.id).toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(item);
  }

  return unique;
}

function countKeywordHits(haystack: string, keywords?: string[]) {
  if (!keywords?.length) {
    return 0;
  }

  return keywords.reduce((score, keyword) => {
    if (!keyword) {
      return score;
    }

    return haystack.includes(keyword.toLowerCase()) ? score + 1 : score;
  }, 0);
}

function hasRequiredKeywords(haystack: string, requiredKeywords?: string[]) {
  if (!requiredKeywords?.length) {
    return true;
  }

  return requiredKeywords.some((keyword) => keyword && haystack.includes(keyword.toLowerCase()));
}

function calculateNewsScore(input: {
  title: string;
  excerpt?: string;
  scoreBoost?: number;
  keywords?: string[];
}) {
  const text = `${input.title} ${input.excerpt ?? ""}`.toLowerCase();
  const keywordHits = countKeywordHits(text, input.keywords);
  return Math.min(10, (input.scoreBoost ?? 0) + keywordHits);
}

function enforceBalancedSelection(items: PulseNewsItem[], maxItems: number, maxPerSource: number) {
  const selected: PulseNewsItem[] = [];
  const selectedIds = new Set<string>();
  const sourceCounter = new Map<string, number>();
  const categoryCounter = new Map<PulseNewsItem["category"], number>();

  const trySelect = (
    item: PulseNewsItem,
    options: {
      requireCategoryTarget: boolean;
      enforceSourceLimit: boolean;
    }
  ) => {
    if (selectedIds.has(item.id)) {
      return false;
    }

    const sourceCount = sourceCounter.get(item.source) ?? 0;
    if (options.enforceSourceLimit && sourceCount >= maxPerSource) {
      return false;
    }

    if (options.requireCategoryTarget) {
      const target = CATEGORY_TARGETS[item.category] ?? 0;
      const current = categoryCounter.get(item.category) ?? 0;

      if (target <= 0 || current >= target) {
        return false;
      }
    }

    selected.push(item);
    selectedIds.add(item.id);
    sourceCounter.set(item.source, sourceCount + 1);
    categoryCounter.set(item.category, (categoryCounter.get(item.category) ?? 0) + 1);
    return true;
  };

  for (const item of items) {
    if (selected.length >= maxItems) {
      return selected.slice(0, maxItems);
    }

    trySelect(item, { requireCategoryTarget: true, enforceSourceLimit: true });
  }

  for (const item of items) {
    if (selected.length >= maxItems) {
      return selected.slice(0, maxItems);
    }

    trySelect(item, { requireCategoryTarget: false, enforceSourceLimit: true });
  }

  for (const item of items) {
    if (selected.length >= maxItems) {
      break;
    }

    trySelect(item, { requireCategoryTarget: false, enforceSourceLimit: false });
  }

  return selected;
}

async function fetchJson<T>(url: string, revalidate: number) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "nicoholas-digital-pulse",
    },
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function fetchText(url: string, revalidate: number) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml, text/html",
      "User-Agent": "nicoholas-digital-pulse",
    },
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.text();
}

async function fetchCisaKevItems() {
  const payload = await fetchJson<{
    vulnerabilities?: Array<{
      cveID?: string;
      vendorProject?: string;
      product?: string;
      vulnerabilityName?: string;
      shortDescription?: string;
      dateAdded?: string;
      dueDate?: string;
      knownRansomwareCampaignUse?: string;
    }>;
  }>(CISA_KEV_API, 1800);

  return (payload.vulnerabilities ?? []).slice(0, 6).map((entry, index) => {
    const cveId = entry.cveID || `KEV-${index + 1}`;
    const publication = resolvePublishedAt(entry.dateAdded, `https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext=${encodeURIComponent(cveId)}`);
    const vendorLabel = [entry.vendorProject, entry.product].filter(Boolean).join(" ").trim();
    const ransomware = (entry.knownRansomwareCampaignUse || "").toLowerCase() === "known";

    return {
      id: `cisa-kev-${cveId}`,
      title: `${cveId}${vendorLabel ? ` · ${vendorLabel}` : ""}`,
      url: `https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext=${encodeURIComponent(cveId)}`,
      source: "CISA KEV",
      category: "security",
      publishedAt: publication.publishedAt,
      timestampLabel: publication.isReliable ? buildTimestampLabel(publication.publishedAt) : "Fecha no disponible",
      excerpt: truncateExcerpt(entry.shortDescription || entry.vulnerabilityName || "Vulnerabilidad conocida y explotada en catálogo CISA."),
      imageUrl: buildPulsePlaceholderImage("CISA", "security", cveId),
      imageAlt: cveId,
      sourceDomain: "cisa.gov",
      score: ransomware ? 10 : 7,
      metadata: entry.dueDate ? `Mitigar antes de ${entry.dueDate}` : "KEV activo",
    } satisfies PulseNewsItem;
  });
}

async function fetchFeedSource(
  url: string,
  source: string,
  fallbackCategory: PulseNewsItem["category"],
  options?: FeedSourceOptions
) {
  const xml = await fetchText(url, options?.revalidate ?? 1800);
  const feedItems = parseFeedItems(xml).filter((item) => item.title && item.url);
  const selected: PulseNewsItem[] = [];

  for (const [index, item] of feedItems.entries()) {
    if (selected.length >= (options?.maxItems ?? 4)) {
      break;
    }

    const rulesText = `${item.title} ${item.excerpt ?? ""}`.toLowerCase();
    if (!hasRequiredKeywords(rulesText, options?.requiredKeywords)) {
      continue;
    }

    const publication = resolvePublishedAt(item.publishedAt, item.url);
    const category = options?.forceCategory ?? classifyNewsCategory(rulesText, fallbackCategory);
    const score = calculateNewsScore({
      title: item.title,
      excerpt: item.excerpt,
      scoreBoost: options?.scoreBoost,
      keywords: options?.keywords,
    });

    selected.push({
      id: `${source.toLowerCase().replace(/\s+/g, "-")}-${index}-${item.url}`,
      title: item.title,
      url: item.url,
      source,
      category,
      publishedAt: publication.publishedAt,
      timestampLabel: publication.isReliable ? buildTimestampLabel(publication.publishedAt) : "Fecha no disponible",
      excerpt: truncateExcerpt(item.excerpt),
      imageUrl: item.imageUrl || buildPulsePlaceholderImage(source, category, item.title),
      imageAlt: item.title,
      sourceDomain: getHostname(item.url),
      score,
      metadata: options?.providerLabel ? `Origen ${options.providerLabel}` : undefined,
    } satisfies PulseNewsItem);
  }

  return selected;
}

async function fetchFeedCollection(sources: FeedSourceDescriptor[]) {
  const settled = await Promise.allSettled(
    sources.map((source) =>
      fetchFeedSource(source.url, source.source, source.fallbackCategory, {
        maxItems: source.maxItems,
        providerLabel: source.providerLabel,
        revalidate: source.revalidate,
        forceCategory: source.forceCategory,
        keywords: source.keywords,
        requiredKeywords: source.requiredKeywords,
        scoreBoost: source.scoreBoost,
      })
    )
  );

  const items: PulseNewsItem[] = [];

  for (const result of settled) {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    }
  }

  return items;
}

async function enrichNewsItems(items: PulseNewsItem[]) {
  const settled = await Promise.allSettled(
    items.map(async (item, index) => {
      if (index > 8 && item.excerpt && item.imageUrl && item.sourceDomain) {
        return {
          ...item,
          excerpt: truncateExcerpt(item.excerpt) || "Señal técnica capturada por el Command Center.",
        } satisfies PulseNewsItem;
      }

      const preview = await fetchArticlePreview(item.url);
      const mergedExcerpt = truncateExcerpt(item.excerpt || preview.excerpt) || "Señal técnica capturada por el Command Center.";

      return {
        ...item,
        excerpt: mergedExcerpt,
        imageUrl: item.imageUrl || preview.imageUrl || buildPulsePlaceholderImage(item.source, item.category, item.title),
        imageAlt: item.imageAlt || item.title,
        sourceDomain: item.sourceDomain || preview.sourceDomain || "",
      } satisfies PulseNewsItem;
    })
  );

  return settled.map((result, index) => {
    const original = items[index];
    if (result.status === "fulfilled") {
      return result.value;
    }

    return {
      ...original,
      excerpt: truncateExcerpt(original.excerpt) || "Señal técnica capturada por el Command Center.",
      imageUrl: original.imageUrl || buildPulsePlaceholderImage(original.source, original.category, original.title),
      imageAlt: original.imageAlt || original.title,
      sourceDomain: original.sourceDomain || "",
    } satisfies PulseNewsItem;
  });
}

export async function getPulseNews() {
  const settled = await Promise.allSettled([
    fetchFeedCollection(AI_FEED_SOURCES),
    fetchFeedCollection(SECURITY_FEED_SOURCES),
    fetchFeedCollection(DEV_FEED_SOURCES),
    fetchFeedCollection(STARTUP_FEED_SOURCES),
    fetchCisaKevItems(),
  ]);

  const items: PulseNewsItem[] = [];

  for (const result of settled) {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    }
  }

  const normalized = uniqueByUrl(sortNewsItems(uniqueById(items))).slice(0, 72);
  const enriched = await enrichNewsItems(normalized);
  const ranked = uniqueByUrl(sortNewsItems(uniqueById(enriched)));

  return enforceBalancedSelection(ranked, MAX_NEWS_ITEMS, MAX_ITEMS_PER_SOURCE);
}
