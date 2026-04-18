export type PulseCategory = "ai" | "security" | "dev" | "startup" | "market";

export interface PulseNewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  category: PulseCategory;
  publishedAt: string;
  timestampLabel: string;
  excerpt?: string;
  imageUrl?: string;
  imageAlt?: string;
  sourceDomain?: string;
  score?: number;
  metadata?: string;
}

export interface PulseContextData {
  city: string;
  country: string;
  timezone: string;
  currentTime: string;
  temperature: number;
  weatherCode: number;
  weatherLabel: string;
  isDay: boolean;
  windSpeed: number;
  message: string;
  sunrise?: string;
  sunset?: string;
  forecast: Array<{
    dayLabel: string;
    tempMax: number;
    tempMin: number;
    weatherCode: number;
    weatherLabel: string;
  }>;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface PulseFinanceItem {
  id: string;
  symbol: string;
  name: string;
  source: string;
  price: number;
  currency: string;
  changePercent: number;
  trend: "up" | "down" | "flat";
  sparkline: number[];
  lastUpdated: string;
}

export interface PulseGitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string;
  url: string;
  language: string;
  stars: number;
  forks: number;
  updatedAt: string;
}

export interface PulseGitHubEvent {
  id: string;
  type: string;
  repoName: string;
  url: string;
  createdAt: string;
  summary: string;
}

export interface PulseDevActivityData {
  username: string;
  profileUrl: string;
  followers: number;
  publicRepos: number;
  totalStars: number;
  languages: Array<{ name: string; share: number }>;
  featuredRepos: PulseGitHubRepo[];
  recentEvents: PulseGitHubEvent[];
  lastActiveAt?: string;
}

export interface PulseInsight {
  id: string;
  title: string;
  detail: string;
  tone: "neutral" | "positive" | "warning";
}
