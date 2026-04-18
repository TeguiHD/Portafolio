import type { PulseDevActivityData, PulseGitHubEvent, PulseGitHubRepo } from "@/modules/pulse/types";
import { PULSE_GITHUB_USERNAME, summarizeGitHubEvent } from "@/modules/pulse/lib/server-utils";

const GITHUB_API = "https://api.github.com";

async function fetchJson<T>(url: string, revalidate: number) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "nicoholas-digital-pulse",
    },
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getPulseDevActivity(): Promise<PulseDevActivityData> {
  const [profile, repos, events] = await Promise.all([
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
    profileUrl: profile.html_url,
    followers: profile.followers,
    publicRepos: profile.public_repos,
    totalStars: featuredRepos.reduce((total, repo) => total + repo.stars, 0),
    languages,
    featuredRepos,
    recentEvents,
    lastActiveAt: recentEvents[0]?.createdAt,
  };
}
