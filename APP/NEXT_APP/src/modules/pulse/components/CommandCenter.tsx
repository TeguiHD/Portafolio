"use client";

import { useCallback, useDeferredValue, useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowUpRight,
  Calendar,
  ChevronRight,
  Clock3,
  CloudSun,
  Cpu,
  Github,
  GripHorizontal,
  LoaderCircle,
  MapPinned,
  Minus,
  Newspaper,
  RefreshCw,
  Search,
  ShieldAlert,
  Sun,
  Terminal,
  TrendingUp,
  TrendingDown,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { Button, cn } from "@/components/ui/Button";
import { ThrottledLink } from "@/components/ui/ThrottledLink";
import type {
  PulseContextData,
  PulseDevActivityData,
  PulseFinanceItem,
  PulseInsight,
  PulseNewsItem,
} from "@/modules/pulse/types";
import { buildInsights } from "@/modules/pulse/lib/server-utils";
import { CarouselSlider } from "@/modules/pulse/components/CarouselSlider";
import { PulseNotificationToggle } from "@/modules/pulse/components/PulseNotificationToggle";
import { WidgetCard } from "@/modules/pulse/components/WidgetCard";

type CommandCenterMode = "page" | "modal";
type SlideId = "context" | "news" | "finance" | "dev" | "insights";
type NewsFilter = "all" | "ai" | "security" | "dev" | "startup";
type NewsSort = "relevance" | "latest";

interface RemoteState<T> {
  status: "idle" | "loading" | "success" | "error";
  data: T | null;
  error: string | null;
  updatedAt?: string;
}

interface NewsBrowserCache {
  items: PulseNewsItem[];
  generatedAt: string;
  cachedAt: number;
}

interface CommandCenterProps {
  mode?: CommandCenterMode;
  visible?: boolean;
}

const slideConfig: Array<{ id: SlideId; label: string }> = [
  { id: "context", label: "Contexto" },
  { id: "news", label: "Radar" },
  { id: "finance", label: "Mercado" },
  { id: "dev", label: "Dev Activity" },
  { id: "insights", label: "Insights" },
];

const storageKey = "digital-pulse-preferences-v2";
const NEWS_BROWSER_CACHE_KEY = "digital-pulse-news-cache-v2";
const NEWS_BROWSER_CACHE_TTL_MS = 1000 * 60 * 15;

const slideMeta: Record<
  SlideId,
  {
    label: string;
    eyebrow: string;
    detail: string;
    icon: typeof CloudSun;
    tone: string;
  }
> = {
  context: {
    label: "Contexto",
    eyebrow: "Tiempo real",
    detail: "Clima, hora local y una base operativa para arrancar el día.",
    icon: CloudSun,
    tone: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
  },
  news: {
    label: "Radar",
    eyebrow: "Noticias",
    detail: "Titulares con imagen, resumen, fuente, categoría y prioridad.",
    icon: Newspaper,
    tone: "border-sky-300/25 bg-sky-300/10 text-sky-100",
  },
  finance: {
    label: "Mercado",
    eyebrow: "Finance Snapshot",
    detail: "Crypto e indicadores locales con variación y lectura rápida.",
    icon: TrendingUp,
    tone: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  },
  dev: {
    label: "Dev Activity",
    eyebrow: "GitHub",
    detail: "Repos, actividad reciente y lenguaje dominante sin salir del blog.",
    icon: Github,
    tone: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  },
  insights: {
    label: "Insights",
    eyebrow: "Señales",
    detail: "Cruces entre seguridad, mercado y desarrollo para contar una historia.",
    icon: ShieldAlert,
    tone: "border-violet-300/25 bg-violet-300/10 text-violet-100",
  },
};

const categoryLabels: Record<Exclude<NewsFilter, "all">, string> = {
  ai: "IA",
  security: "Ciberseguridad",
  dev: "Desarrollo",
  startup: "Startups",
};

const categoryTones: Record<PulseNewsItem["category"], string> = {
  ai: "text-sky-300 bg-sky-400/10 border-sky-400/20",
  security: "text-rose-300 bg-rose-400/10 border-rose-400/20",
  dev: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20",
  startup: "text-violet-300 bg-violet-400/10 border-violet-400/20",
  market: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
};

const presetSourceFilters = [
  "Todos",
  "IA",
  "Ciberseguridad",
  "Desarrollo",
  "Startups",
  "The Hacker News",
  "CISA",
  "NIST",
  "OWASP",
  "MITRE",
  "GitHub Blog",
  "Y Combinator",
] as const;

const presetSourceFilterSet = new Set<string>(presetSourceFilters);

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("No fue posible cargar datos.");
  }

  return response.json() as Promise<T>;
}

function readBrowserNewsCache() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(NEWS_BROWSER_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as NewsBrowserCache;
    if (!Array.isArray(parsed.items) || typeof parsed.generatedAt !== "string" || typeof parsed.cachedAt !== "number") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeBrowserNewsCache(payload: { items: PulseNewsItem[]; generatedAt: string }) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const entry: NewsBrowserCache = {
      items: payload.items,
      generatedAt: payload.generatedAt,
      cachedAt: Date.now(),
    };

    window.localStorage.setItem(NEWS_BROWSER_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore write failures (private mode/quota) and continue with network-only behavior.
  }
}

function formatPrice(value: number, currency: string) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CLP" ? 0 : 2,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatDate(dateIso?: string) {
  if (!dateIso) return "Sin actividad reciente";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateIso));
}

function formatClock(dateIso?: string) {
  if (!dateIso) return "--:--";
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateIso));
}

function formatArticleDate(dateIso?: string) {
  if (!dateIso) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateIso));
}

function getImageSourceLabel(imageUrl?: string) {
  if (!imageUrl) return "Sin imagen";

  if (imageUrl.includes("/api/pulse/placeholder")) {
    return "Placeholder";
  }

  try {
    const parsed = new URL(imageUrl, "https://digital-pulse.local");
    if (parsed.pathname.startsWith("/api/pulse/placeholder")) {
      return "Placeholder";
    }

    if (!parsed.hostname || parsed.hostname === "digital-pulse.local") {
      return "Local";
    }

    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "Desconocida";
  }
}

function matchesSourceFilter(item: PulseNewsItem, filter: string) {
  if (filter === "Todos") {
    return true;
  }

  const source = item.source.toLowerCase();
  const sourceDomain = (item.sourceDomain || "").toLowerCase();
  const title = item.title.toLowerCase();
  const excerpt = (item.excerpt || "").toLowerCase();
  const url = item.url.toLowerCase();
  const haystack = `${source} ${sourceDomain} ${title} ${excerpt} ${url}`;
  const hasToken = (...tokens: string[]) => tokens.some((token) => haystack.includes(token));

  if (filter === "IA") {
    return (
      item.category === "ai" ||
      hasToken(
        "openai",
        "anthropic",
        "claude",
        "qwen",
        "kimi",
        "glm",
        "chatglm",
        "zhipu",
        "seeddream",
        "seedream",
        "bytedance seed",
        "gemini",
        "gamma",
        "sora",
        "moonshot"
      )
    );
  }

  if (filter === "Ciberseguridad") {
    return item.category === "security" || hasToken("the hacker news", "cisa", "nist", "owasp", "mitre", "cve", "kev");
  }

  if (filter === "Desarrollo") {
    return item.category === "dev" || hasToken("github", "stack overflow", "cloudflare", "developer", "engineering");
  }

  if (filter === "Startups") {
    return item.category === "startup" || hasToken("y combinator", "ycombinator", "hacker news (yc)", "news.ycombinator.com", "startup", "founder", "yc");
  }

  if (filter === "The Hacker News") {
    return hasToken("the hacker news", "thehackernews", "feedburner", "thehackernews.com");
  }

  if (filter === "CISA") {
    return hasToken("cisa", "kev", "known exploited");
  }

  if (filter === "NIST") {
    return hasToken("nist", "nist.gov");
  }

  if (filter === "OWASP") {
    return hasToken("owasp", "owasp.org");
  }

  if (filter === "MITRE") {
    return hasToken("mitre", "cve.org", "attack");
  }

  if (filter === "GitHub Blog") {
    return hasToken("github.blog", "github blog");
  }

  if (filter === "Y Combinator") {
    return hasToken("y combinator", "ycombinator", "news.ycombinator.com", "hacker news (yc)", "yc");
  }

  return item.source === filter;
}

function isSourceCoveredByPreset(source: string) {
  const normalized = source.toLowerCase();
  return /(the hacker news|thehackernews|cisa|nist|owasp|mitre|github blog|stack overflow|cloudflare|y combinator|ycombinator|hacker news \(yc\)|\bia\b|openai|claude|qwen|kimi|chatglm|\bglm\b|zhipu|seeddream|seedream|gemini|gamma|sora)/.test(normalized);
}

function estimateReadTime(item: PulseNewsItem) {
  const content = `${item.title} ${item.excerpt ?? ""}`.trim();
  const words = content.split(/\s+/).filter(Boolean).length;
  return `Lectura ${Math.max(3, Math.ceil(words / 38))} min`;
}

function Sparkline({ values, trend }: { values: number[]; trend: "up" | "down" | "flat" }) {
  if (values.length < 2) {
    return <div className="h-14 rounded-2xl bg-white/[0.04]" />;
  }

  const width = 140;
  const height = 56;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  const stroke = trend === "down" ? "#fb7185" : trend === "up" ? "#34d399" : "#67e8f9";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full">
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

function RemoteStateBlock({
  state,
  emptyLabel,
  onRetry,
}: {
  state: RemoteState<unknown>;
  emptyLabel: string;
  onRetry: () => void;
}) {
  if (state.status === "loading") {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-[24px] border border-white/10 bg-white/[0.03]">
        <div className="flex items-center gap-3 text-white/70">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Cargando señal en vivo...
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[24px] border border-rose-400/25 bg-rose-500/10 px-6 text-center">
        <p className="mb-3 text-lg font-medium text-white">{emptyLabel}</p>
        <p className="mb-4 max-w-md text-sm text-white/65">{state.error}</p>
        <Button variant="secondary" size="sm" onClick={onRetry} className="bg-white text-black hover:bg-white/90">
          Reintentar
        </Button>
      </div>
    );
  }

  return null;
}

function CommandMetric({
  icon: Icon,
  title,
  value,
  detail,
  tone,
}: {
  icon: typeof CloudSun;
  title: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.035] p-4 transition-transform duration-300 ease-out motion-safe:hover:-translate-y-1">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_58%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">
        <div className={cn("mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border", tone)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="text-xs uppercase tracking-[0.22em] text-white/45">{title}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
        <p className="mt-2 text-sm leading-6 text-white/58">{detail}</p>
      </div>
    </div>
  );
}

export function CommandCenter({ mode = "page", visible = true }: CommandCenterProps) {
  const [isFilterPending, startTransition] = useTransition();
  const [contextState, setContextState] = useState<RemoteState<PulseContextData>>({
    status: "idle",
    data: null,
    error: null,
  });
  const [newsState, setNewsState] = useState<RemoteState<PulseNewsItem[]>>({
    status: "idle",
    data: null,
    error: null,
  });
  const [financeState, setFinanceState] = useState<RemoteState<PulseFinanceItem[]>>({
    status: "idle",
    data: null,
    error: null,
  });
  const [devState, setDevState] = useState<RemoteState<PulseDevActivityData>>({
    status: "idle",
    data: null,
    error: null,
  });
  const [city, setCity] = useState("Santiago");
  const [cityDraft, setCityDraft] = useState("Santiago");
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null);
  const [useAutoLocation, setUseAutoLocation] = useState(true);
  const [activeId, setActiveId] = useState<SlideId>("context");
  const [hiddenSlides, setHiddenSlides] = useState<SlideId[]>([]);
  const [orderedSlides, setOrderedSlides] = useState<SlideId[]>(slideConfig.map((slide) => slide.id));
  const [locationPending, setLocationPending] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentNow, setCurrentNow] = useState<number | null>(null);
  const [newsFilter, setNewsFilter] = useState<NewsFilter>("all");
  const [newsSort, setNewsSort] = useState<NewsSort>("relevance");
  const [sourceFilter, setSourceFilter] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isWeatherOpen, setIsWeatherOpen] = useState(false);
  const weatherPanelRef = useRef<HTMLDivElement | null>(null);
  const deferredNewsFilter = useDeferredValue(newsFilter);
  const deferredNewsSort = useDeferredValue(newsSort);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    setCurrentNow(Date.now());
    const interval = window.setInterval(() => setCurrentNow(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (weatherPanelRef.current && !weatherPanelRef.current.contains(event.target as Node)) {
        setIsWeatherOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as {
        city?: string;
        useAutoLocation?: boolean;
        hiddenSlides?: SlideId[];
        orderedSlides?: SlideId[];
      };

      if (parsed.city) {
        setCity(parsed.city);
        setCityDraft(parsed.city);

        if (typeof parsed.useAutoLocation !== "boolean") {
          setUseAutoLocation(parsed.city.trim().toLowerCase() === "santiago");
        }
      }

      if (typeof parsed.useAutoLocation === "boolean") {
        setUseAutoLocation(parsed.useAutoLocation);
      }

      if (parsed.hiddenSlides?.length) {
        setHiddenSlides(parsed.hiddenSlides);
      }

      if (parsed.orderedSlides?.length) {
        const unique = parsed.orderedSlides.filter((slide, index, list) => list.indexOf(slide) === index);
        setOrderedSlides(slideConfig.map((slide) => slide.id).sort((a, b) => unique.indexOf(a) - unique.indexOf(b)));
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        city,
        useAutoLocation,
        hiddenSlides,
        orderedSlides,
      })
    );
  }, [city, useAutoLocation, hiddenSlides, orderedSlides]);

  const visibleSlides = orderedSlides.filter((slide) => !hiddenSlides.includes(slide));

  useEffect(() => {
    if (visibleSlides.length && !visibleSlides.includes(activeId)) {
      setActiveId(visibleSlides[0]);
    }
  }, [activeId, visibleSlides]);

  const loadContext = useCallback(async (force = false) => {
    if (!force && contextState.status === "loading") return;

    setContextState((previous) => ({ ...previous, status: "loading", error: null }));

    try {
      const query = coordinates
        ? `lat=${coordinates.lat}&lon=${coordinates.lon}`
        : useAutoLocation
          ? `auto=1&city=${encodeURIComponent(city)}`
          : `city=${encodeURIComponent(city)}`;
      const payload = await readJson<{ data: PulseContextData; generatedAt: string }>(`/api/pulse/context?${query}`);
      setContextState({
        status: "success",
        data: payload.data,
        error: null,
        updatedAt: payload.generatedAt,
      });
    } catch (error) {
      setContextState({
        status: "error",
        data: null,
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }, [city, contextState.status, coordinates, useAutoLocation]);

  const loadNews = useCallback(async (force = false) => {
    if (!force && newsState.status === "loading") return;

    if (!force) {
      const cached = readBrowserNewsCache();
      const isFresh = cached && Date.now() - cached.cachedAt < NEWS_BROWSER_CACHE_TTL_MS;

      if (cached && isFresh) {
        setNewsState({
          status: "success",
          data: cached.items,
          error: null,
          updatedAt: cached.generatedAt,
        });
        return;
      }
    }

    setNewsState((previous) => ({ ...previous, status: "loading", error: null }));

    try {
      const endpoint = force ? "/api/pulse/news?refresh=1" : "/api/pulse/news";
      const payload = await readJson<{ items: PulseNewsItem[]; generatedAt: string }>(endpoint);

      writeBrowserNewsCache(payload);

      setNewsState({
        status: "success",
        data: payload.items,
        error: null,
        updatedAt: payload.generatedAt,
      });
    } catch (error) {
      const cached = !force ? readBrowserNewsCache() : null;

      if (cached) {
        setNewsState({
          status: "success",
          data: cached.items,
          error: null,
          updatedAt: cached.generatedAt,
        });
        return;
      }

      setNewsState({
        status: "error",
        data: null,
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }, [newsState.status]);

  const loadFinance = useCallback(async (force = false) => {
    if (!force && financeState.status === "loading") return;

    setFinanceState((previous) => ({ ...previous, status: "loading", error: null }));

    try {
      const payload = await readJson<{ items: PulseFinanceItem[]; generatedAt: string }>("/api/pulse/finance");
      setFinanceState({
        status: "success",
        data: payload.items,
        error: null,
        updatedAt: payload.generatedAt,
      });
    } catch (error) {
      setFinanceState({
        status: "error",
        data: null,
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }, [financeState.status]);

  const loadDev = useCallback(async (force = false) => {
    if (!force && devState.status === "loading") return;

    setDevState((previous) => ({ ...previous, status: "loading", error: null }));

    try {
      const payload = await readJson<{ data: PulseDevActivityData; generatedAt: string }>("/api/pulse/dev");
      setDevState({
        status: "success",
        data: payload.data,
        error: null,
        updatedAt: payload.generatedAt,
      });
    } catch (error) {
      setDevState({
        status: "error",
        data: null,
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }, [devState.status]);

  const loadAllSignals = useCallback(() => {
    void Promise.allSettled([
      loadContext(true),
      loadNews(true),
      loadFinance(true),
      loadDev(true),
    ]);
  }, [loadContext, loadNews, loadFinance, loadDev]);

  useEffect(() => {
    if (!visible) return;

    void loadContext();
    if (mode === "page") {
      void loadNews();
      void loadFinance();
      void loadDev();
    }
    // Lazy bootstrap: only re-run on visibility/location changes, not on fetch state transitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, city, coordinates, mode]);

  useEffect(() => {
    if (!visible) return;

    if (activeId === "news" && newsState.status === "idle") {
      void loadNews();
    }

    if (activeId === "finance" && financeState.status === "idle") {
      void loadFinance();
    }

    if (activeId === "dev" && devState.status === "idle") {
      void loadDev();
    }

    if (activeId === "insights") {
      if (newsState.status === "idle") void loadNews();
      if (financeState.status === "idle") void loadFinance();
      if (devState.status === "idle") void loadDev();
    }
    // Lazy slide loading depends on active tab and status gates above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, visible, newsState.status, financeState.status, devState.status]);

  const insights: PulseInsight[] =
    !newsState.data || !financeState.data
      ? []
      : buildInsights({
          news: newsState.data,
          finance: financeState.data,
          dev: devState.data ? { recentEvents: devState.data.recentEvents } : undefined,
        });

  const additionalSources = Array.from(new Set((newsState.data ?? []).map((item) => item.source)))
    .filter((source) => !presetSourceFilterSet.has(source))
    .filter((source) => !isSourceCoveredByPreset(source))
    .sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }));

  const sourceOptions = [...presetSourceFilters, ...additionalSources];

  const filteredNews = [...(newsState.data ?? [])]
    .filter((item) => (deferredNewsFilter === "all" ? true : item.category === deferredNewsFilter))
    .filter((item) => matchesSourceFilter(item, sourceFilter))
    .filter((item) => {
      const query = deferredSearchQuery.trim().toLowerCase();
      if (!query) {
        return true;
      }

      return `${item.title} ${item.excerpt ?? ""} ${item.source}`.toLowerCase().includes(query);
    })
    .sort((left, right) => {
      if (deferredNewsSort === "latest") {
        return new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
      }

      const rightValue = (right.score ?? 0) + new Date(right.publishedAt).getTime() / 1_000_000;
      const leftValue = (left.score ?? 0) + new Date(left.publishedAt).getTime() / 1_000_000;
      return rightValue - leftValue;
    });

  const featuredNews =
    filteredNews.length && !deferredSearchQuery && deferredNewsFilter === "all" && sourceFilter === "Todos"
      ? filteredNews[0]
      : null;

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Tu navegador no soporta geolocalización.");
      return;
    }

    setLocationPending(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUseAutoLocation(false);
        setCoordinates({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setLocationPending(false);
        void loadContext(true);
      },
      () => {
        setLocationPending(false);
        setLocationError("No se pudo acceder a tu ubicación. Puedes dejar una ciudad manual.");
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const reorderSlide = (slideId: SlideId, direction: -1 | 1) => {
    setOrderedSlides((previous) => {
      const index = previous.indexOf(slideId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= previous.length) {
        return previous;
      }

      const next = [...previous];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const toggleSlide = (slideId: SlideId) => {
    setHiddenSlides((previous) =>
      previous.includes(slideId)
        ? previous.filter((item) => item !== slideId)
        : previous.length >= slideConfig.length - 1
          ? previous
          : [...previous, slideId]
    );
  };

  const slideNodes = visibleSlides.map((slideId) => {
    if (slideId === "context") {
      return {
        id: slideId,
        label: "Contexto",
        content: (
          <WidgetCard
            title="Clima local, hora y contexto operativo"
            eyebrow="Slide 01"
            accent="cyan"
            actions={
              <button
                type="button"
                onClick={() => void loadContext(true)}
                className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-white/75 transition hover:bg-white/[0.08] hover:text-white"
                aria-label="Actualizar contexto"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            }
          >
            {contextState.status !== "success" || !contextState.data ? (
              <RemoteStateBlock state={contextState} emptyLabel="El contexto no está disponible todavía." onRetry={() => void loadContext(true)} />
            ) : (
              <div className="grid gap-4 lg:grid-cols-[1.3fr,1fr]">
                <div className="rounded-[24px] border border-white/10 bg-[#0b1622]/80 p-5">
                  <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-white/65">
                    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-cyan-100">
                      <MapPinned className="h-4 w-4" />
                      {contextState.data.city}, {contextState.data.country}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                      <Clock3 className="h-4 w-4" />
                      {formatClock(contextState.data.currentTime)}
                    </span>
                  </div>

                  <div className="mb-4 flex items-end gap-4">
                    <div>
                      <p className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                        {Math.round(contextState.data.temperature)}°
                      </p>
                      <p className="mt-2 text-lg text-white/75">{contextState.data.weatherLabel}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/65">
                      <p>Viento</p>
                      <p className="mt-1 text-base font-medium text-white">{Math.round(contextState.data.windSpeed)} km/h</p>
                    </div>
                  </div>

                  <p className="max-w-2xl text-base leading-7 text-white/72">{contextState.data.message}</p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                    <p className="mb-3 text-sm uppercase tracking-[0.26em] text-white/45">Ubicación</p>
                    <label htmlFor="pulse-city" className="mb-2 block text-sm text-white/60">
                      Ciudad base del radar
                    </label>
                    <form
                      className="flex gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        setCoordinates(null);
                        setUseAutoLocation(false);
                        setCity(cityDraft || "Santiago");
                        void loadContext(true);
                      }}
                    >
                      <input
                        id="pulse-city"
                        name="pulse-city"
                        value={cityDraft}
                        onChange={(event) => setCityDraft(event.target.value)}
                        placeholder="Escribe una ciudad"
                        autoComplete="address-level2"
                        className="flex-1 rounded-2xl border border-white/10 bg-[#071019] px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-cyan-300/35 focus-visible:ring-2 focus-visible:ring-cyan-300/55"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant="secondary"
                        className="bg-white text-black hover:bg-white/90"
                      >
                        Guardar
                      </Button>
                    </form>
                    <button
                      type="button"
                      onClick={requestLocation}
                      className="mt-3 inline-flex items-center gap-2 text-sm text-cyan-200 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                    >
                      <CloudSun className={cn("h-4 w-4", locationPending && "animate-pulse")} />
                      {locationPending ? "Buscando ubicación..." : "Usar mi ubicación"}
                    </button>
                    {locationError ? <p className="mt-2 text-sm text-rose-300">{locationError}</p> : null}
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                    <p className="mb-3 text-sm uppercase tracking-[0.26em] text-white/45">Cadencia</p>
                    <div className="space-y-3 text-sm text-white/65">
                      <p className="flex items-center justify-between gap-3">
                        <span>Última actualización</span>
                        <span className="text-white">{formatDate(contextState.updatedAt)}</span>
                      </p>
                      <p className="flex items-center justify-between gap-3">
                        <span>Modo</span>
                        <span className="text-white">{coordinates ? "Geolocalizado" : "Ciudad manual"}</span>
                      </p>
                      <p className="flex items-center justify-between gap-3">
                        <span>Reloj vivo</span>
                        <span className="text-white">{currentNow ? formatClock(new Date(currentNow).toISOString()) : "--:--"}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </WidgetCard>
        ),
      };
    }

    if (slideId === "news") {
      return {
        id: slideId,
        label: "News Hub",
        content: (
          <WidgetCard
            title="Noticias técnicas y señales de seguridad"
            eyebrow="Slide 02"
            accent="blue"
            actions={
              <button
                type="button"
                onClick={() => void loadNews(true)}
                className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-white/75 transition hover:bg-white/[0.08] hover:text-white"
                aria-label="Actualizar noticias"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            }
          >
            {newsState.status !== "success" || !newsState.data ? (
              <RemoteStateBlock state={newsState} emptyLabel="No hay news hub disponible." onRetry={() => void loadNews(true)} />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {(["all", "ai", "security", "dev", "startup"] as NewsFilter[]).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        startTransition(() => {
                          setNewsFilter(tag);
                        });
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em] transition [touch-action:manipulation] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08131f]",
                        newsFilter === tag
                          ? "border-cyan-300/35 bg-cyan-300/15 text-cyan-100"
                          : "border-white/10 bg-white/[0.04] text-white/55 hover:text-white"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                  <div className="ml-auto flex gap-2">
                    {(["relevance", "latest"] as NewsSort[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          startTransition(() => {
                            setNewsSort(option);
                          });
                        }}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em] transition [touch-action:manipulation] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08131f]",
                          newsSort === option
                            ? "border-white/20 bg-white text-black"
                            : "border-white/10 bg-white/[0.04] text-white/55 hover:text-white"
                        )}
                      >
                        {option === "relevance" ? "relevancia" : "reciente"}
                      </button>
                    ))}
                  </div>
                  <span aria-live="polite" className="text-xs text-white/45">
                    {isFilterPending ? "Actualizando feed…" : `${filteredNews.length} señales`}
                  </span>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {filteredNews.map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] transition hover:border-cyan-300/30 hover:bg-white/[0.06]"
                    >
                      <div className="relative aspect-[16/9] overflow-hidden border-b border-white/10 bg-[#071019]">
                        <img
                          src={item.imageUrl}
                          alt={item.imageAlt || item.title}
                          width={1200}
                          height={675}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] [content-visibility:auto]"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#071019] via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em] text-white/80">
                          <span className="rounded-full border border-white/15 bg-black/35 px-2.5 py-1 backdrop-blur">{item.source}</span>
                          <span className="rounded-full border border-white/15 bg-black/35 px-2.5 py-1 backdrop-blur">{item.category}</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="mb-3 flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-lg font-medium text-white transition group-hover:text-cyan-200">{item.title}</h4>
                            {item.excerpt ? <p className="mt-2 text-sm leading-6 text-white/62">{item.excerpt}</p> : null}
                          </div>
                          <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-white/35 transition group-hover:text-white" />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-white/45">
                          <span>{item.timestampLabel}</span>
                          {item.sourceDomain ? <span>{item.sourceDomain}</span> : null}
                          {item.metadata ? <span>{item.metadata}</span> : null}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </WidgetCard>
        ),
      };
    }

    if (slideId === "finance") {
      return {
        id: slideId,
        label: "Finance",
        content: (
          <WidgetCard
            title="Snapshot financiero en tiempo real"
            eyebrow="Slide 03"
            accent="amber"
            actions={
              <button
                type="button"
                onClick={() => void loadFinance(true)}
                className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-white/75 transition hover:bg-white/[0.08] hover:text-white"
                aria-label="Actualizar finanzas"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            }
          >
            {financeState.status !== "success" || !financeState.data ? (
              <RemoteStateBlock state={financeState} emptyLabel="No fue posible armar el snapshot financiero." onRetry={() => void loadFinance(true)} />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {financeState.data.map((item) => (
                  <div key={item.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-white/45">{item.symbol}</p>
                        <h4 className="mt-1 text-lg font-medium text-white">{item.name}</h4>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-sm font-medium",
                          item.trend === "up" && "bg-emerald-400/15 text-emerald-200",
                          item.trend === "down" && "bg-rose-400/15 text-rose-200",
                          item.trend === "flat" && "bg-cyan-300/15 text-cyan-100"
                        )}
                      >
                        {formatPercent(item.changePercent)}
                      </span>
                    </div>
                    <p className="text-3xl font-semibold tracking-tight text-white">{formatPrice(item.price, item.currency)}</p>
                    <p className="mt-1 text-xs text-white/45">{item.source}</p>
                    <div className="mt-4">
                      <Sparkline values={item.sparkline} trend={item.trend} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </WidgetCard>
        ),
      };
    }

    if (slideId === "dev") {
      return {
        id: slideId,
        label: "Dev Activity",
        content: (
          <WidgetCard
            title="Actividad viva de GitHub"
            eyebrow="Slide 04"
            accent="emerald"
            actions={
              <button
                type="button"
                onClick={() => void loadDev(true)}
                className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-white/75 transition hover:bg-white/[0.08] hover:text-white"
                aria-label="Actualizar actividad de desarrollo"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            }
          >
            {devState.status !== "success" || !devState.data ? (
              <RemoteStateBlock state={devState} emptyLabel="No se pudo leer actividad pública de GitHub." onRetry={() => void loadDev(true)} />
            ) : (
              <div className="grid gap-4 xl:grid-cols-[1.05fr,1.2fr]">
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
                        <Github className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-white/55">@{devState.data.username}</p>
                        <a href={devState.data.profileUrl} target="_blank" rel="noreferrer" className="text-lg font-medium text-white hover:text-cyan-200">
                          Perfil público
                        </a>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-[#071019] p-3">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Repos</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{devState.data.publicRepos}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-[#071019] p-3">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Followers</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{devState.data.followers}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-[#071019] p-3">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Stars</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{devState.data.totalStars}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {devState.data.languages.map((language) => (
                        <span key={language.name} className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/65">
                          {language.name} {language.share}%
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                    <p className="mb-3 text-xs uppercase tracking-[0.22em] text-white/45">Última actividad</p>
                    <p className="text-white">{formatDate(devState.data.lastActiveAt)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                    <p className="mb-4 text-xs uppercase tracking-[0.22em] text-white/45">Repositorios destacados</p>
                    <div className="grid gap-3">
                      {devState.data.featuredRepos.map((repo) => (
                        <a
                          key={repo.id}
                          href={repo.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-[20px] border border-white/10 bg-[#071019] p-4 transition hover:border-cyan-300/25"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="text-lg font-medium text-white">{repo.fullName}</h4>
                              <p className="mt-2 text-sm leading-6 text-white/62">{repo.description}</p>
                            </div>
                            <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-white/35" />
                          </div>
                          <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/55">
                            <span>{repo.language}</span>
                            <span>{repo.stars} stars</span>
                            <span>{repo.forks} forks</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                    <p className="mb-4 text-xs uppercase tracking-[0.22em] text-white/45">Eventos recientes</p>
                    <div className="space-y-3">
                      {devState.data.recentEvents.map((event) => (
                        <a
                          key={event.id}
                          href={event.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-[20px] border border-white/10 bg-[#071019] p-4 transition hover:border-emerald-300/25"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium text-white">{event.summary}</p>
                              <p className="mt-1 text-sm text-white/55">{event.repoName}</p>
                            </div>
                            <span className="text-xs uppercase tracking-[0.2em] text-white/35">
                              {formatClock(event.createdAt)}
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </WidgetCard>
        ),
      };
    }

    return {
      id: slideId,
      label: "Insights",
      content: (
        <WidgetCard
          title="Smart insights combinando señales"
          eyebrow="Slide 05"
          accent="violet"
          actions={
            <button
              type="button"
              onClick={() => {
                void loadNews(true);
                void loadFinance(true);
                void loadDev(true);
              }}
              className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-white/75 transition hover:bg-white/[0.08] hover:text-white"
              aria-label="Actualizar insights"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          }
        >
          {(!insights.length && (newsState.status === "loading" || financeState.status === "loading")) ? (
            <RemoteStateBlock state={{ status: "loading", data: null, error: null }} emptyLabel="" onRetry={() => undefined} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className={cn(
                    "rounded-[24px] border p-5",
                    insight.tone === "positive" && "border-emerald-300/20 bg-emerald-400/10",
                    insight.tone === "warning" && "border-amber-300/20 bg-amber-400/10",
                    insight.tone === "neutral" && "border-cyan-300/20 bg-cyan-300/10"
                  )}
                >
                  <p className="text-lg font-medium text-white">{insight.title}</p>
                  <p className="mt-3 text-sm leading-6 text-white/72">{insight.detail}</p>
                </div>
              ))}

              {!insights.length ? (
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 text-white/65 md:col-span-2">
                  Carga los otros widgets para generar combinaciones automáticas entre mercado, seguridad y actividad técnica.
                </div>
              ) : null}
            </div>
          )}
        </WidgetCard>
      ),
    };
  });

  const hasActiveFilters =
    Boolean(deferredSearchQuery.trim()) ||
    deferredNewsFilter !== "all" ||
    sourceFilter !== "Todos";
  const isNewsVisible = !hiddenSlides.includes("news");
  const isContextVisible = !hiddenSlides.includes("context");
  const isFinanceVisible = !hiddenSlides.includes("finance");
  const isDevVisible = !hiddenSlides.includes("dev");
  const isInsightsVisible = !hiddenSlides.includes("insights");
  const liveClock = currentNow ? formatClock(new Date(currentNow).toISOString()) : "--:--";

  if (mode === "page") {
    return (
      <div className="min-h-screen pb-16">
        <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          {isContextVisible ? (
            <div className="relative z-20 mb-6 mt-2 flex justify-end sm:mb-8">
              <div ref={weatherPanelRef} className="relative w-fit">
                <button
                  type="button"
                  onClick={() => setIsWeatherOpen((previous) => !previous)}
                  className={cn(
                    "flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm shadow-lg shadow-black/20 transition-all duration-300 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70",
                    isWeatherOpen && "pointer-events-none scale-95 opacity-0"
                  )}
                >
                  <div className="flex items-center gap-2 text-amber-300">
                    <Sun className="h-4 w-4" />
                    <span className="font-medium text-white">
                      {contextState.data ? `${Math.round(contextState.data.temperature)}°` : "--"}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-white/15" />
                  <span className="font-medium tracking-wide text-white/70">{liveClock}</span>
                </button>

                <div
                  className={cn(
                    "absolute right-0 top-0 z-50 w-[min(340px,calc(100vw-2rem))] origin-top-right rounded-[32px] border border-white/10 bg-[#0a0a10]/95 p-6 shadow-[0_0_40px_rgba(0,0,0,0.75)] backdrop-blur-2xl transition-all duration-300",
                    isWeatherOpen ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-3 scale-95 opacity-0"
                  )}
                >
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white/55">
                        {contextState.data ? `${contextState.data.city}, ${contextState.data.country}` : city}
                      </p>
                      <div className="mt-2 flex items-end gap-2">
                        <span className="text-5xl font-light tracking-tighter text-white">
                          {contextState.data ? `${Math.round(contextState.data.temperature)}°` : "--"}
                        </span>
                        <span className="mb-1 text-lg text-white/55">
                          {contextState.data?.weatherLabel ?? "Sin contexto"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsWeatherOpen(false)}
                      className="rounded-full bg-white/5 p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mb-6 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                      <div className="flex items-center gap-1 text-xs text-white/45">
                        <Wind className="h-3 w-3" />
                        Viento
                      </div>
                      <p className="mt-2 font-medium text-white">
                        {contextState.data ? `${Math.round(contextState.data.windSpeed)} km/h` : "--"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                      <div className="flex items-center gap-1 text-xs text-white/45">
                        <CloudSun className="h-3 w-3" />
                        Max/Mín
                      </div>
                      <p className="mt-2 font-medium text-white">
                        {contextState.data?.forecast?.[0]
                          ? `${Math.round(contextState.data.forecast[0].tempMax)}° / ${Math.round(contextState.data.forecast[0].tempMin)}°`
                          : "--"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                      <div className="flex items-center gap-1 text-xs text-white/45">
                        <Sun className="h-3 w-3 text-orange-300" />
                        Amanece
                      </div>
                      <p className="mt-2 font-medium text-white">{formatClock(contextState.data?.sunrise)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                      <div className="flex items-center gap-1 text-xs text-white/45">
                        <Clock3 className="h-3 w-3 text-violet-300" />
                        Oscurece
                      </div>
                      <p className="mt-2 font-medium text-white">{formatClock(contextState.data?.sunset)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-white/35">Próximos días</p>
                    <div className="space-y-3">
                      {(contextState.data?.forecast ?? []).map((day) => (
                        <div key={day.dayLabel} className="flex items-center justify-between gap-3">
                          <span className="w-8 text-sm text-white/55">{day.dayLabel}</span>
                          <span className="truncate text-sm text-white/45">{day.weatherLabel}</span>
                          <div className="flex w-20 justify-end gap-3 text-sm">
                            <span className="font-medium text-white">{Math.round(day.tempMax)}°</span>
                            <span className="text-white/35">{Math.round(day.tempMin)}°</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-8 lg:flex-row xl:gap-12">
            <div className="w-full space-y-8 sm:space-y-10 lg:w-[72%] xl:w-[75%]">
              <section className="relative z-10">
                <div className={cn("relative transition-all duration-500", isSearchFocused ? "scale-[1.01]" : "scale-100")}>
                  <div
                    className={cn(
                      "absolute -inset-1 rounded-[24px] bg-gradient-to-r from-cyan-500/25 via-sky-500/15 to-violet-500/20 blur",
                      isSearchFocused ? "opacity-50" : "opacity-20"
                    )}
                  />
                  <div className="relative flex items-center rounded-[24px] border border-white/10 bg-[#0a0a10] p-1.5 shadow-2xl shadow-black/40 sm:p-2">
                    <div className="pl-4 pr-3 text-white/40">
                      <Search className={cn("h-6 w-6 transition-colors", isSearchFocused ? "text-cyan-300" : "text-white/35")} />
                    </div>
                    <input
                      type="text"
                      placeholder="Explora análisis, vulnerabilidades, mercados..."
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setIsSearchFocused(false)}
                      className="w-full border-none bg-transparent py-3.5 text-base text-white placeholder:text-white/30 focus:outline-none sm:py-4 sm:text-lg"
                    />
                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="pr-4 text-white/35 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-8 space-y-5 sm:space-y-6">
                  <div className="space-y-3">
                    <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-white/40">
                      <Zap className="h-4 w-4" />
                      Categorias
                    </span>
                    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <button
                        type="button"
                        onClick={() => startTransition(() => setNewsFilter("all"))}
                        className={cn(
                          "relative shrink-0 overflow-hidden rounded-full px-5 py-2 text-sm font-medium transition-all",
                          newsFilter === "all" ? "text-white" : "bg-white/5 text-white/55 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        {newsFilter === "all" ? <span className="absolute inset-0 -z-10 bg-gradient-to-r from-cyan-500/80 to-violet-600/80" /> : null}
                        Todas
                      </button>
                      {(Object.entries(categoryLabels) as Array<[Exclude<NewsFilter, "all">, string]>).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => startTransition(() => setNewsFilter(value))}
                          className={cn(
                            "relative shrink-0 overflow-hidden rounded-full px-5 py-2 text-sm font-medium transition-all",
                            newsFilter === value ? "text-white" : "bg-white/5 text-white/55 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          {newsFilter === value ? <span className="absolute inset-0 -z-10 bg-gradient-to-r from-cyan-500/80 to-violet-600/80" /> : null}
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-white/40">
                        <Cpu className="h-4 w-4" />
                        Fuentes
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {(["relevance", "latest"] as NewsSort[]).map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => startTransition(() => setNewsSort(option))}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em] transition",
                              newsSort === option
                                ? "border-white/20 bg-white text-black"
                                : "border-white/10 bg-white/[0.04] text-white/55 hover:text-white"
                            )}
                          >
                            {option === "relevance" ? "relevancia" : "reciente"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {sourceOptions.map((source) => (
                        <button
                          key={source}
                          type="button"
                          onClick={() => setSourceFilter(source)}
                          className={cn(
                            "flex shrink-0 items-center gap-2 rounded-lg border px-4 py-1.5 text-xs font-medium transition-all",
                            sourceFilter === source
                              ? "border-violet-400/35 bg-violet-500/10 text-violet-200 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                              : "border-white/5 bg-transparent text-white/40 hover:border-white/15 hover:bg-white/5 hover:text-white/80"
                          )}
                        >
                          {source}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {isNewsVisible ? (
                <section>
                  {newsState.status !== "success" || !newsState.data ? (
                    <RemoteStateBlock state={newsState} emptyLabel="No hay señales en el radar todavía." onRetry={() => void loadNews(true)} />
                  ) : (
                    <>
                      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm text-white/50">
                          {isFilterPending ? "Actualizando radar..." : `${filteredNews.length} registros de inteligencia`}
                        </div>
                        {hasActiveFilters ? (
                          <button
                            type="button"
                            onClick={() => {
                              startTransition(() => {
                                setNewsFilter("all");
                                setNewsSort("relevance");
                              });
                              setSourceFilter("Todos");
                              setSearchQuery("");
                            }}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                          >
                            Restablecer terminal
                          </button>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {filteredNews.length > 0 ? (
                          filteredNews.map((article, index) => {
                            const isFeaturedCard = Boolean(featuredNews && article.id === featuredNews.id && index === 0);

                            return (
                              <a
                                key={article.id}
                                href={article.url}
                                target="_blank"
                                rel="noreferrer"
                                className={cn(
                                  "group relative flex min-h-[260px] cursor-pointer flex-col justify-between overflow-hidden rounded-[24px] border border-white/5 bg-[#0a0a0f]/85 p-5 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:border-white/10 hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] sm:min-h-[280px] sm:p-6",
                                  isFeaturedCard && "md:col-span-2 xl:col-span-2 xl:min-h-[340px]"
                                )}
                              >
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-transparent to-violet-500/0 transition-all duration-500 group-hover:from-cyan-500/10 group-hover:to-violet-500/10" />
                                <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-cyan-500/20 blur-[70px] transition-colors duration-500 group-hover:bg-cyan-400/25" />

                                <div className="relative z-10">
                                  <div className="mb-5 overflow-hidden rounded-[18px] border border-white/8 bg-[#05070d]">
                                    <img
                                      src={article.imageUrl}
                                      alt={article.imageAlt || article.title}
                                      width={1200}
                                      height={675}
                                      loading="lazy"
                                      referrerPolicy="no-referrer"
                                      className={cn(
                                        "h-40 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] sm:h-44",
                                        isFeaturedCard && "sm:h-56 xl:h-64"
                                      )}
                                    />
                                  </div>

                                  <div className="mb-5 flex items-start justify-between gap-4">
                                    <span className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em]", categoryTones[article.category])}>
                                      {article.category === "market" ? "Mercado" : article.category === "ai" ? "IA" : article.category === "dev" ? "Desarrollo" : article.category === "startup" ? "Startups" : "Ciberseguridad"}
                                    </span>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/5 bg-white/5 transition-all duration-300 group-hover:rotate-45 group-hover:border-white/20 group-hover:bg-white/10">
                                      <ChevronRight className="h-4 w-4 text-white/45 group-hover:text-white" />
                                    </span>
                                  </div>

                                  <h2 className={cn("font-bold leading-tight text-white transition-colors group-hover:text-cyan-100", isFeaturedCard ? "pr-0 text-2xl sm:pr-8 sm:text-3xl lg:text-4xl" : "text-xl")}>
                                    {article.title}
                                  </h2>
                                  <p className={cn("mt-4 leading-relaxed text-white/55", isFeaturedCard ? "max-w-2xl text-sm sm:text-base lg:text-lg" : "line-clamp-3 text-sm")}>
                                    {article.excerpt || "Señal capturada por el radar editorial del blog."}
                                  </p>
                                </div>

                                <div className="relative z-10 mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-5 text-xs font-medium text-white/35">
                                  <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-white/70">
                                      <Terminal className="h-3 w-3" />
                                      {article.source}
                                    </div>
                                    <div className="max-w-[220px] truncate rounded-md bg-white/5 px-2 py-1 text-white/60">
                                      {getImageSourceLabel(article.imageUrl)}
                                    </div>
                                    <div className="flex items-center gap-1.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                                      <Calendar className="h-3 w-3" />
                                      {formatArticleDate(article.publishedAt)}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-white/45">
                                    <Clock3 className="h-3 w-3" />
                                    {estimateReadTime(article)}
                                  </div>
                                </div>
                              </a>
                            );
                          })
                        ) : (
                          <div className="col-span-full flex flex-col items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] py-20">
                            <Newspaper className="mb-4 h-12 w-12 animate-pulse text-white/30" />
                            <p className="text-lg font-medium text-white/70">No se encontraron registros de inteligencia.</p>
                            <button
                              type="button"
                              onClick={() => {
                                startTransition(() => {
                                  setNewsFilter("all");
                                  setNewsSort("relevance");
                                });
                                setSourceFilter("Todos");
                                setSearchQuery("");
                              }}
                              className="mt-6 rounded-lg border border-white/10 bg-white/5 px-6 py-2 font-medium text-white transition hover:bg-white/10"
                            >
                              Restablecer terminal
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </section>
              ) : (
                <section className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-white/60">
                  El widget principal del blog esta oculto desde el Layout Lab.
                </section>
              )}
            </div>

            <aside className="relative w-full lg:w-[28%] xl:w-[25%]">
              <div className="space-y-6 xl:sticky xl:top-28">
                {isFinanceVisible ? (
                  <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0a0a0f]/85 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
                    <div className="absolute right-0 top-0 h-32 w-32 bg-emerald-500/10 blur-[50px]" />
                    <div className="mb-8 flex items-center justify-between">
                      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.28em] text-white">
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                        Markets
                      </h2>
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-emerald-400">Live</span>
                      </div>
                    </div>

                    {financeState.status !== "success" || !financeState.data ? (
                      <RemoteStateBlock state={financeState} emptyLabel="No hay mercado disponible." onRetry={() => void loadFinance(true)} />
                    ) : (
                      <div className="flex flex-col gap-4">
                        {financeState.data.map((item) => {
                          const isPositive = item.changePercent > 0;
                          const isNegative = item.changePercent < 0;

                          return (
                            <div
                              key={item.id}
                              className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-white/10 hover:bg-white/[0.05]"
                            >
                              <div
                                className={cn(
                                  "absolute bottom-0 left-0 h-[2px] w-full transition-all duration-500",
                                  isPositive && "bg-gradient-to-r from-emerald-500/60 to-transparent group-hover:shadow-[0_0_10px_rgba(16,185,129,0.5)]",
                                  isNegative && "bg-gradient-to-r from-rose-500/60 to-transparent group-hover:shadow-[0_0_10px_rgba(244,63,94,0.5)]",
                                  !isPositive && !isNegative && "bg-white/15"
                                )}
                              />

                              <div className="relative z-10 mb-3 flex items-start justify-between gap-4">
                                <div>
                                  <p className="text-lg font-bold tracking-tight text-white">{item.symbol}</p>
                                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">{item.name}</p>
                                </div>
                                <div
                                  className={cn(
                                    "flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold",
                                    isPositive && "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
                                    isNegative && "border-rose-400/20 bg-rose-400/10 text-rose-300",
                                    !isPositive && !isNegative && "border-white/10 bg-white/5 text-white/55"
                                  )}
                                >
                                  {isPositive ? <TrendingUp className="h-3 w-3" /> : isNegative ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                                  {formatPercent(item.changePercent)}
                                </div>
                              </div>

                              <div className="relative z-10 flex items-end justify-between gap-3">
                                <div>
                                  <p className="font-mono text-xl text-white/85 transition-colors group-hover:text-white">
                                    {formatPrice(item.price, item.currency)}
                                  </p>
                                  <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-white/25">{item.source}</p>
                                </div>
                                <div className="w-24">
                                  <Sparkline values={item.sparkline} trend={item.trend} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                ) : null}

                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.26em] text-white/28">
                  <div className="h-px flex-1 bg-white/8" />
                  Widget Stack
                  <div className="h-px flex-1 bg-white/8" />
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
                  {isDevVisible ? (
                    <section className="rounded-[28px] border border-white/10 bg-[#0a0a0f]/85 p-5 backdrop-blur-xl">
                      <div className="mb-5 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.28em] text-white">
                          <Github className="h-4 w-4 text-cyan-300" />
                          GitHub
                        </h2>
                        <span className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                          {devState.data?.username ?? "Live"}
                        </span>
                      </div>

                      {devState.status !== "success" || !devState.data ? (
                        <RemoteStateBlock state={devState} emptyLabel="No se pudo leer GitHub." onRetry={() => void loadDev(true)} />
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Repos</p>
                              <p className="mt-2 text-2xl font-semibold text-white">{devState.data.publicRepos}</p>
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Followers</p>
                              <p className="mt-2 text-2xl font-semibold text-white">{devState.data.followers}</p>
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Stars</p>
                              <p className="mt-2 text-2xl font-semibold text-white">{devState.data.totalStars}</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {devState.data.featuredRepos.slice(0, 3).map((repo) => (
                              <a
                                key={repo.id}
                                href={repo.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block rounded-[20px] border border-white/8 bg-white/[0.03] p-4 transition hover:border-cyan-300/20 hover:bg-white/[0.05]"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-white">{repo.fullName}</p>
                                    <p className="mt-2 text-sm leading-6 text-white/50">{repo.description}</p>
                                  </div>
                                  <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-white/30" />
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </section>
                  ) : null}

                  {isInsightsVisible ? (
                    <section className="rounded-[28px] border border-white/10 bg-[#0a0a0f]/85 p-5 backdrop-blur-xl">
                      <div className="mb-5 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.28em] text-white">
                          <ShieldAlert className="h-4 w-4 text-violet-300" />
                          Pulse Radar
                        </h2>
                        <span className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                          {insights.length} insights
                        </span>
                      </div>

                      <div className="space-y-3">
                        {insights.slice(0, 3).map((insight) => (
                          <div
                            key={insight.id}
                            className={cn(
                              "rounded-[20px] border p-4",
                              insight.tone === "positive" && "border-emerald-300/20 bg-emerald-400/10",
                              insight.tone === "warning" && "border-amber-300/20 bg-amber-400/10",
                              insight.tone === "neutral" && "border-cyan-300/20 bg-cyan-300/10"
                            )}
                          >
                            <p className="font-medium text-white">{insight.title}</p>
                            <p className="mt-2 text-sm leading-6 text-white/65">{insight.detail}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5">
                        <PulseNotificationToggle />
                      </div>
                    </section>
                  ) : null}

                  <section className="rounded-[28px] border border-white/10 bg-[#0a0a0f]/85 p-5 backdrop-blur-xl">
                    <div className="mb-4 flex items-center gap-2 text-white/65">
                      <GripHorizontal className="h-4 w-4" />
                      <p className="text-sm uppercase tracking-[0.24em]">Widget Lab</p>
                    </div>

                    <div className="space-y-3">
                      {slideConfig.map((slide) => {
                        const hidden = hiddenSlides.includes(slide.id);
                        return (
                          <div key={slide.id} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#071019] px-3 py-3">
                            <button
                              type="button"
                              onClick={() => toggleSlide(slide.id)}
                              className={cn(
                                "rounded-full px-3 py-1 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70",
                                hidden ? "bg-white/[0.04] text-white/45" : "bg-cyan-300/15 text-cyan-100"
                              )}
                            >
                              {hidden ? "Oculto" : "Activo"}
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-white">{slide.label}</p>
                              <p className="truncate text-[10px] uppercase tracking-[0.22em] text-white/30">
                                {slideMeta[slide.id].eyebrow}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => reorderSlide(slide.id, -1)}
                              className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/60 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                              aria-label={`Mover ${slide.label} a la izquierda`}
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              onClick={() => reorderSlide(slide.id, 1)}
                              className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/60 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                              aria-label={`Mover ${slide.label} a la derecha`}
                            >
                              →
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <ThrottledLink
                        href="/#hero"
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90"
                      >
                        Volver al inicio
                      </ThrottledLink>
                      <button
                        type="button"
                        onClick={loadAllSignals}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white transition hover:bg-white/[0.08]"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refrescar
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <CommandMetric
          icon={CloudSun}
          title="Contexto"
          value={contextState.data ? `${Math.round(contextState.data.temperature)}°` : "--"}
          detail={contextState.data ? contextState.data.city : "Esperando ubicación"}
          tone="border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
        />
        <CommandMetric
          icon={Newspaper}
          title="Radar"
          value={String(newsState.data?.length ?? 0)}
          detail="Señales activas en el feed"
          tone="border-sky-300/25 bg-sky-300/10 text-sky-100"
        />
      </div>

      <CarouselSlider slides={slideNodes} activeId={activeId} onActiveChange={(value) => setActiveId(value as SlideId)} />
    </div>
  );
}
