import { decodeHtmlEntities, stripHtml } from "@/modules/pulse/lib/server-utils";

function extractMetaContent(html: string, selectors: string[]) {
  for (const selector of selectors) {
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name)=["']${selector}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    );
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }

  return "";
}

function extractJsonLdImage(html: string) {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];

  for (const script of scripts) {
    const raw = script.replace(/<\/?script[^>]*>/gi, "").trim();
    try {
      const parsed = JSON.parse(raw) as
        | { image?: string | string[] | { url?: string } | Array<{ url?: string }> }
        | Array<{ image?: string | string[] | { url?: string } | Array<{ url?: string }> }>;

      const candidates = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of candidates) {
        const image = item?.image;
        if (typeof image === "string") return image;
        if (Array.isArray(image) && typeof image[0] === "string") return image[0];
        if (Array.isArray(image) && image[0] && typeof image[0] === "object" && typeof image[0].url === "string") {
          return image[0].url;
        }
        if (!Array.isArray(image) && typeof image?.url === "string") return image.url;
      }
    } catch {
      continue;
    }
  }

  return "";
}

function absolutizeUrl(candidate: string, baseUrl: string) {
  if (!candidate) return "";

  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return "";
  }
}

function extractImageFromHtml(html: string, baseUrl: string) {
  const metaImage =
    extractMetaContent(html, ["og:image", "twitter:image", "twitter:image:src"]) ||
    extractJsonLdImage(html);

  if (metaImage) {
    return absolutizeUrl(metaImage, baseUrl);
  }

  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  return absolutizeUrl(imgMatch?.[1] ?? "", baseUrl);
}

function extractExcerptFromHtml(html: string) {
  const metaDescription = extractMetaContent(html, ["description", "og:description", "twitter:description"]);
  if (metaDescription) {
    return stripHtml(metaDescription);
  }

  const paragraphMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  return paragraphMatch?.[1] ? stripHtml(paragraphMatch[1]).slice(0, 220) : "";
}

export async function fetchArticlePreview(url: string) {
  if (!/^https?:\/\//i.test(url)) {
    return { imageUrl: "", excerpt: "", sourceDomain: "" };
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "nicoholas-digital-pulse",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`Preview failed: ${response.status}`);
    }

    const html = await response.text();
    const sourceDomain = new URL(url).hostname.replace(/^www\./, "");

    return {
      imageUrl: extractImageFromHtml(html, url),
      excerpt: extractExcerptFromHtml(html),
      sourceDomain,
    };
  } catch {
    try {
      return {
        imageUrl: "",
        excerpt: "",
        sourceDomain: new URL(url).hostname.replace(/^www\./, ""),
      };
    } catch {
      return { imageUrl: "", excerpt: "", sourceDomain: "" };
    }
  }
}
