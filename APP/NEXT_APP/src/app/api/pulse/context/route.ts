import { pedirJson } from "@/modules/pulse/lib/red";
import { NextRequest, NextResponse } from "next/server";
import type { PulseContextData } from "@/modules/pulse/types";
import { buildWeatherMessage, getWeatherLabel } from "@/modules/pulse/lib/server-utils";

const DEFAULT_CITY = "Santiago";
/** Lo más largo que se acepta como nombre de ciudad. */
const MAX_CIUDAD = 60;

interface ResolvedLocation {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  source: "coordinates" | "city" | "ip";
}

function fetchJson<T>(url: string, revalidate: number) {
  return pedirJson<T>(url, { revalidate, plazo: 5000 });
}

/**
 * La ciudad la escribe quien visita y viaja dentro de una URL hacia el geocodificador:
 * se acota el largo y se dejan solo letras y los signos de un topónimo.
 */
function ciudadValida(valor: string | null): string {
  const limpio = (valor ?? "").trim().slice(0, MAX_CIUDAD);
  if (!limpio) return DEFAULT_CITY;
  return /^[\p{L}\p{M}][\p{L}\p{M} '.,-]*$/u.test(limpio) ? limpio : DEFAULT_CITY;
}

/** Coordenada dentro de su rango; cualquier otra cosa se descarta. */
function coordenadaValida(valor: string | null, tope: number): number | null {
  if (valor === null || valor.trim() === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) && Math.abs(n) <= tope ? n : null;
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

/**
 * De dónde es el tiempo que se muestra.
 *
 * Solo dos caminos: las coordenadas que entrega el navegador cuando la persona da
 * permiso, o la ciudad que escribe. Antes había un tercero que enviaba la IP de quien
 * visitaba, en claro y por HTTP, a un servicio externo, y que además obedecía a una
 * cabecera que cualquiera puede falsificar; se retiró.
 */
async function resolveLocation(searchParams: URLSearchParams): Promise<ResolvedLocation> {
  const lat = coordenadaValida(searchParams.get("lat"), 90);
  const lon = coordenadaValida(searchParams.get("lon"), 180);
  const city = ciudadValida(searchParams.get("city"));

  if (lat !== null && lon !== null) {
    try {
      const geo = await fetchJson<{
        results?: Array<{ name: string; country: string; latitude: number; longitude: number; timezone: string }>;
      }>(
        `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=es&count=1`,
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
    } catch {
      // sin geocodificación inversa se sigue con la ciudad escrita
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
    const location = await resolveLocation(request.nextUrl.searchParams);

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
