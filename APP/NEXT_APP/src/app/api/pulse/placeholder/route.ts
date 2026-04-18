import { NextRequest, NextResponse } from "next/server";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(request: NextRequest) {
  const title = escapeXml(request.nextUrl.searchParams.get("title") || "Digital Pulse");
  const source = escapeXml(request.nextUrl.searchParams.get("source") || "Source");
  const category = escapeXml(request.nextUrl.searchParams.get("category") || "news");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
          <stop stop-color="#071019"/>
          <stop offset="0.55" stop-color="#0F2740"/>
          <stop offset="1" stop-color="#052F2A"/>
        </linearGradient>
        <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(970 120) rotate(133.29) scale(390 500)">
          <stop stop-color="#67E8F9" stop-opacity="0.6"/>
          <stop offset="1" stop-color="#67E8F9" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="630" rx="32" fill="url(#bg)"/>
      <rect width="1200" height="630" rx="32" fill="url(#glow)"/>
      <rect x="48" y="48" width="1104" height="534" rx="28" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)"/>
      <text x="84" y="118" fill="#A5F3FC" font-family="Arial, sans-serif" font-size="26" letter-spacing="6">${source.toUpperCase()}</text>
      <text x="84" y="174" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="64" font-weight="700">${title.slice(0, 60)}</text>
      <text x="84" y="530" fill="#D1FAE5" font-family="Arial, sans-serif" font-size="28">${category.toUpperCase()} · DIGITAL PULSE</text>
    </svg>
  `;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
