import { NextRequest, NextResponse } from "next/server";
import { getPulseNews } from "@/modules/pulse/lib/news-service";
import type { PulseNewsItem } from "@/modules/pulse/types";

const NEWS_MEMORY_CACHE_TTL_MS = 1000 * 60 * 20;

interface PulseNewsCacheEntry {
  items: PulseNewsItem[];
  generatedAt: string;
  expiresAt: number;
}

let pulseNewsCache: PulseNewsCacheEntry | null = null;

function buildCacheHeaders() {
  return {
    "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
  };
}

export async function GET(request: NextRequest) {
  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";
  const now = Date.now();

  if (!forceRefresh && pulseNewsCache && pulseNewsCache.expiresAt > now) {
    return NextResponse.json(
      {
        items: pulseNewsCache.items,
        generatedAt: pulseNewsCache.generatedAt,
        cached: true,
      },
      {
        headers: buildCacheHeaders(),
      }
    );
  }

  try {
    const items = await getPulseNews();
    const generatedAt = new Date().toISOString();

    pulseNewsCache = {
      items,
      generatedAt,
      expiresAt: now + NEWS_MEMORY_CACHE_TTL_MS,
    };

    return NextResponse.json(
      {
        items,
        generatedAt,
        cached: false,
      },
      {
        headers: buildCacheHeaders(),
      }
    );
  } catch (error) {
    console.error("[Pulse News] Error:", error);

    if (pulseNewsCache) {
      return NextResponse.json(
        {
          items: pulseNewsCache.items,
          generatedAt: pulseNewsCache.generatedAt,
          cached: true,
          stale: true,
        },
        {
          headers: buildCacheHeaders(),
        }
      );
    }

    return NextResponse.json({ error: "No fue posible cargar noticias." }, { status: 500 });
  }
}
