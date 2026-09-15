import { NextRequest, NextResponse } from "next/server";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Recorta primero y escapa después: al revés, el corte parte una entidad («&amp;» →
 *  «&am») y el SVG deja de ser válido, que en la página es una tarjeta rota. */
function recortado(valor: string | null, respaldo: string, largo: number) {
  return (valor || respaldo).slice(0, largo);
}

/** Parte el título en líneas de ancho parecido; sin esto el texto se salía del lienzo. */
function enLineas(texto: string, porLinea: number, maximo: number) {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    if (!actual) actual = palabra;
    else if (`${actual} ${palabra}`.length <= porLinea) actual += ` ${palabra}`;
    else {
      lineas.push(actual);
      actual = palabra;
      if (lineas.length === maximo) break;
    }
  }
  if (actual && lineas.length < maximo) lineas.push(actual);
  if (lineas.length === maximo && palabras.join(" ").length > lineas.join(" ").length) {
    lineas[maximo - 1] = `${lineas[maximo - 1].replace(/[\s,.;:]+$/, "")}…`;
  }
  return lineas;
}

const TONOS: Record<string, string> = {
  ai: "#a78bfa",
  security: "#ef4444",
  dev: "#5eead4",
  startup: "#f59e0b",
  market: "#60a5fa",
};

export async function GET(request: NextRequest) {
  const titulo = recortado(request.nextUrl.searchParams.get("title"), "Pulso digital", 120);
  const fuente = recortado(request.nextUrl.searchParams.get("source"), "nicoholas.dev", 40);
  const categoria = recortado(request.nextUrl.searchParams.get("category"), "news", 24).toLowerCase();
  const tono = TONOS[categoria] ?? "#5eead4";
  const lineas = enLineas(titulo, 26, 3);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <defs>
    <linearGradient id="f" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0d1219"/><stop offset="1" stop-color="#070a10"/>
    </linearGradient>
    <radialGradient id="g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1010 90) rotate(140) scale(520 620)">
      <stop stop-color="${tono}" stop-opacity="0.34"/><stop offset="1" stop-color="${tono}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#f)"/>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect x="1" y="1" width="1198" height="628" fill="none" stroke="#ffffff" stroke-opacity="0.08"/>
  <rect x="72" y="86" width="16" height="16" rx="8" fill="${tono}"/>
  <text x="104" y="99" fill="${tono}" font-family="ui-monospace, monospace" font-size="24" letter-spacing="5">${escapeXml(fuente.toUpperCase())}</text>
  ${lineas
    .map(
      (linea, i) =>
        `<text x="72" y="${226 + i * 84}" fill="#ffffff" font-family="Inter, Helvetica, Arial, sans-serif" font-size="66" font-weight="700" letter-spacing="-1.5">${escapeXml(linea)}</text>`
    )
    .join("\n  ")}
  <g transform="translate(72 486) scale(0.9)" fill="none" stroke="#f5f8fa" stroke-width="8.5" stroke-linecap="round">
    <path d="M16 43.5V25.5"/><path d="M16 32.5C16 25.4 21.5 22 26.8 22 32.4 22 37 26.1 37 33v10.5"/>
  </g>
  <circle cx="117" cy="525" r="4.2" fill="${tono}"/>
  <text x="140" y="530" fill="#7d8ea3" font-family="ui-monospace, monospace" font-size="20" letter-spacing="3">nicoholas.dev</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
