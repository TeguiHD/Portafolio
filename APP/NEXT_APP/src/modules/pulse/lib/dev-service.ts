import type { PulseDevActivityData, PulseGitHubEvent, PulseGitHubRepo } from "@/modules/pulse/types";
import { PULSE_GITHUB_USERNAME, summarizeGitHubEvent } from "@/modules/pulse/lib/server-utils";
import { crearCache, pedirJson } from "@/modules/pulse/lib/red";

const GITHUB_API = "https://api.github.com";

function fetchJson<T>(url: string, revalidate: number) {
  return pedirJson<T>(url, {
    revalidate,
    plazo: 5000,
    cabeceras: { Accept: "application/vnd.github+json" },
  });
}

/**
 * Actividad en GitHub. La API va sin credenciales (60 peticiones por hora y por IP),
 * así que cada llamada puede volver con un 403: se piden por separado y la sección se
 * dibuja con lo que haya llegado en vez de caerse entera.
 */
export async function getPulseDevActivity(): Promise<PulseDevActivityData> {
  const [perfilRes, reposRes, eventosRes] = await Promise.allSettled([
    fetchJson<{
      html_url: string;
      followers: number;
      public_repos: number;
    }>(`${GITHUB_API}/users/${PULSE_GITHUB_USERNAME}`, 900),
    fetchJson<Array<{
      id: number;
      name: string;
      full_name: string;
      description: string | null;
      html_url: string;
      language: string | null;
      stargazers_count: number;
      forks_count: number;
      updated_at: string;
      fork: boolean;
    }>>(`${GITHUB_API}/users/${PULSE_GITHUB_USERNAME}/repos?sort=updated&per_page=8`, 900),
    fetchJson<Array<{
      id: string;
      type: string;
      repo: { name: string };
      payload?: { commits?: Array<unknown>; ref_type?: string; action?: string };
      created_at: string;
    }>>(`${GITHUB_API}/users/${PULSE_GITHUB_USERNAME}/events/public?per_page=8`, 300),
  ]);

  if (perfilRes.status === "rejected" && reposRes.status === "rejected" && eventosRes.status === "rejected") {
    throw new Error(String(perfilRes.reason?.message ?? "GitHub no responde"));
  }
  const profile = perfilRes.status === "fulfilled" ? perfilRes.value : null;
  const repos = reposRes.status === "fulfilled" ? reposRes.value : [];
  const events = eventosRes.status === "fulfilled" ? eventosRes.value : [];

  const featuredRepos = repos
    .filter((repo) => !repo.fork)
    .slice(0, 4)
    .map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description ?? "Repositorio actualizado recientemente.",
      url: repo.html_url,
      language: repo.language ?? "Texto plano",
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      updatedAt: repo.updated_at,
    })) satisfies PulseGitHubRepo[];

  const recentEvents = events.slice(0, 6).map((event) => ({
    id: event.id,
    type: event.type,
    repoName: event.repo.name,
    url: `https://github.com/${event.repo.name}`,
    createdAt: event.created_at,
    summary: summarizeGitHubEvent(event),
  })) satisfies PulseGitHubEvent[];

  const languageCounts = featuredRepos.reduce<Record<string, number>>((accumulator, repo) => {
    accumulator[repo.language] = (accumulator[repo.language] ?? 0) + 1;
    return accumulator;
  }, {});

  const languages = Object.entries(languageCounts)
    .map(([name, count]) => ({
      name,
      share: Math.round((count / Math.max(1, featuredRepos.length)) * 100),
    }))
    .sort((left, right) => right.share - left.share)
    .slice(0, 4);

  return {
    username: PULSE_GITHUB_USERNAME,
    profileUrl: profile?.html_url ?? `https://github.com/${PULSE_GITHUB_USERNAME}`,
    followers: profile?.followers ?? 0,
    publicRepos: profile?.public_repos ?? featuredRepos.length,
    totalStars: featuredRepos.reduce((total, repo) => total + repo.stars, 0),
    languages,
    featuredRepos,
    recentEvents,
    lastActiveAt: recentEvents[0]?.createdAt,
  };
}

const cache = crearCache<PulseDevActivityData>("dev", 5 * 60_000, 24 * 60 * 60_000);

/** Con memoria y respaldo: si GitHub limita la cuota, se sirve lo último bueno. */
export function getPulseDevActivityCached(forzar = false) {
  return cache.leer(getPulseDevActivity, forzar);
}
