import { NextRequest, NextResponse } from "next/server";
import type { PulseContextData } from "@/modules/pulse/types";
import { buildWeatherMessage, getWeatherLabel } from "@/modules/pulse/lib/server-utils";

const DEFAULT_CITY = "Santiago";
const IP_API_BASE_URL = "http://ip-api.com/json";
const IP_CACHE_TTL_MS = 1000 * 60 * 20;

interface ResolvedLocation {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  source: "coordinates" | "city" | "ip";
}

interface IpCacheEntry {
  location: ResolvedLocation;
  expiresAt: number;
}

const ipLocationCache = new Map<string, IpCacheEntry>();

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

function normalizeIpCandidate(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.replace(/^::ffff:/, "").trim();
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0];
    const normalized = normalizeIpCandidate(first);
    if (normalized) {
      return normalized;
    }
  }

  const headersToCheck = [
    "x-real-ip",
    "cf-connecting-ip",
    "x-vercel-forwarded-for",
    "x-client-ip",
  ] as const;

  for (const header of headersToCheck) {
    const value = normalizeIpCandidate(request.headers.get(header));
    if (value) {
      return value;
    }
  }

  return "";
}

async function resolveCityLocation(city: string): Promise<ResolvedLocation> {
  const wantsDefaultCity = city.trim().toLowerCase() === DEFAULT_CITY.toLowerCase();

  const geocoding = await fetchJson<{
    results?: Array<{
      name: string;
      country: string;
      country_code?: string;
      latitude: number;
      longitude: number;
      timezone: string;
    }>;
  }>(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&language=es&count=10`,
    1800
  );

  const results = geocoding.results ?? [];
  const fallback =
    (wantsDefaultCity
      ? results.find(
          (entry) => entry.country_code?.toUpperCase() === "CL" || entry.country.trim().toLowerCase() === "chile"
        )
      : undefined) || results[0];

  if (!fallback) {
    throw new Error("Location not found");
  }

  return {
    name: fallback.name,
    country: fallback.country,
    latitude: fallback.latitude,
    longitude: fallback.longitude,
    timezone: fallback.timezone,
    source: "city",
  };
}

async function resolveLocationByIp(request: NextRequest): Promise<ResolvedLocation | null> {
  const clientIp = getClientIp(request);
  if (!clientIp) {
    return null;
  }

  const now = Date.now();
  const cached = ipLocationCache.get(clientIp);
  if (cached && cached.expiresAt > now) {
    return cached.location;
  }

  const payload = await fetchJson<{
    status?: "success" | "fail";
    message?: string;
    country?: string;
    city?: string;
    lat?: number;
    lon?: number;
    timezone?: string;
  }>(
    `${IP_API_BASE_URL}/${encodeURIComponent(clientIp)}?fields=status,message,country,city,lat,lon,timezone`,
    900
  );

  if (payload.status !== "success") {
    return null;
  }

  if (typeof payload.lat !== "number" || typeof payload.lon !== "number") {
    return null;
  }

  const location: ResolvedLocation = {
    name: payload.city || DEFAULT_CITY,
    country: payload.country || "",
    latitude: payload.lat,
    longitude: payload.lon,
    timezone: payload.timezone || "UTC",
    source: "ip",
  };

  ipLocationCache.set(clientIp, {
    location,
    expiresAt: now + IP_CACHE_TTL_MS,
  });

  if (ipLocationCache.size > 300) {
    for (const [ip, entry] of ipLocationCache.entries()) {
      if (entry.expiresAt <= now) {
        ipLocationCache.delete(ip);
      }
    }
  }

  return location;
}

async function resolveLocation(searchParams: URLSearchParams, request: NextRequest): Promise<ResolvedLocation> {
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const city = (searchParams.get("city") || DEFAULT_CITY).trim() || DEFAULT_CITY;
  const useAutoIp = searchParams.get("auto") === "1";

  if (lat && lon) {
    const geo = await fetchJson<{
      results?: Array<{ name: string; country: string; latitude: number; longitude: number; timezone: string }>;
    }>(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&language=es&count=1`,
      1800
    );

    const result = geo.results?.[0];
    if (result) {
      return {
        name: result.name,
        country: result.country,
        latitude: result.latitude,
        longitude: result.longitude,
        timezone: result.timezone,
        source: "coordinates",
      };
    }
  }

  if (useAutoIp) {
    try {
      const autoLocation = await resolveLocationByIp(request);
      if (autoLocation) {
        return autoLocation;
      }
    } catch (error) {
      console.error("[Pulse Context] ip-api fallback:", error);
    }
  }

  return resolveCityLocation(city);
}

function buildDayLabel(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "short",
  })
    .format(new Date(value))
    .replace(".", "");
}

export async function GET(request: NextRequest) {
  try {
    const location = await resolveLocation(request.nextUrl.searchParams, request);

    const weather = await fetchJson<{
      current?: {
        time: string;
        temperature_2m: number;
        weather_code: number;
        is_day: number;
        wind_speed_10m: number;
      };
      daily?: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        sunrise: string[];
        sunset: string[];
      };
    }>(
      `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,weather_code,is_day,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&forecast_days=3&timezone=auto`,
      600
    );

    if (!weather.current) {
      throw new Error("Weather unavailable");
    }

    const data: PulseContextData = {
      city: location.name,
      country: location.country,
      timezone: location.timezone,
      currentTime: weather.current.time,
      temperature: weather.current.temperature_2m,
      weatherCode: weather.current.weather_code,
      weatherLabel: getWeatherLabel(weather.current.weather_code),
      isDay: weather.current.is_day === 1,
      windSpeed: weather.current.wind_speed_10m,
      message: "",
      sunrise: weather.daily?.sunrise?.[0],
      sunset: weather.daily?.sunset?.[0],
      forecast: weather.daily?.time?.map((day, index) => ({
        dayLabel: buildDayLabel(day),
        tempMax: weather.daily?.temperature_2m_max?.[index] ?? 0,
        tempMin: weather.daily?.temperature_2m_min?.[index] ?? 0,
        weatherCode: weather.daily?.weather_code?.[index] ?? 0,
        weatherLabel: getWeatherLabel(weather.daily?.weather_code?.[index] ?? 0),
      })) ?? [],
      coordinates: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
    };

    data.message = buildWeatherMessage(data);

    const cacheControl =
      location.source === "ip"
        ? "private, no-store, max-age=0"
        : "public, s-maxage=600, stale-while-revalidate=1800";

    return NextResponse.json(
      {
        data,
        generatedAt: new Date().toISOString(),
        locationSource: location.source,
      },
      {
        headers: {
          "Cache-Control": cacheControl,
        },
      }
    );
  } catch (error) {
    console.error("[Pulse Context] Error:", error);
    return NextResponse.json({ error: "No fue posible cargar contexto local." }, { status: 500 });
  }
}
