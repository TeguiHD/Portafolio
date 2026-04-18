import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";
import { transpileLatexToHtml } from "@/lib/latex-to-html";

const FORBIDDEN_TAGS = [
    "script",
    "iframe",
    "object",
    "embed",
    "applet",
    "frame",
    "frameset",
    "form",
    "input",
    "button",
    "select",
    "option",
    "textarea",
    "base",
];

const SAFE_URI_REGEX = /^(?:(?:https?|mailto|tel):|\/|#|data:image\/(?:png|jpeg|jpg|gif|webp);base64,)/i;
type DOMPurifyWindow = Parameters<typeof createDOMPurify>[0];

function decodeBasicHtmlEntities(value: string): string {
    return value
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

function maybeTranspileStoredLatex(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return input;

    let latexCandidate: string | null = null;

    if (/^(?:\\documentclass\b|\\begin\{document\})/.test(trimmed)) {
        latexCandidate = trimmed;
    } else {
        const bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
            const body = decodeBasicHtmlEntities(bodyMatch[1]).trim();
            if (/^(?:\\documentclass\b|\\begin\{document\})/.test(body)) {
                latexCandidate = body;
            }
        }
    }

    if (!latexCandidate) return input;

    try {
        const transpiled = transpileLatexToHtml(latexCandidate, { standalone: true });
        return transpiled.html?.trim() ? transpiled.html : input;
    } catch {
        return input;
    }
}

function normalizeLegacyQuotationHtml(html: string): string {
    if (!html) return html;

    let normalized = maybeTranspileStoredLatex(html);

    // Older renderer versions leaked TeX widths into inline styles.
    normalized = normalized.replace(/width:\s*\\(?:textwidth|linewidth|columnwidth)\b/gi, "width:100%");

    // Legacy inline math fallback rendered degree as literal ^\circ.
    normalized = normalized.replace(
        /<span class="(?=[^"]*\bitalic\b)(?=[^"]*\bfont-serif\b)[^"]*">\s*\^?\{?\\+circ\}?\s*<\/span>/gi,
        "°"
    );

    const legacyCompatCss = [
        "/* legacy-quotation-compat */",
        ".latex-doc .text-4xl { font-size:2.25rem; line-height:2.5rem; }",
        ".latex-doc .text-\\[9px\\] { font-size:9px; }",
        ".latex-doc .text-\\[10px\\] { font-size:10px; }",
        ".latex-doc .leading-tight { line-height:1.25; }",
        ".latex-doc .leading-snug { line-height:1.375; }",
        ".latex-doc div[style*=\"color:#ffffff\"][style*=\"padding:1rem\"]:not([style*=\"background\"]) { background:#5B4CFF; border-radius:4mm; }",
    ].join("\n");

    const shouldInjectCompatCss =
        /<style[\s>]/i.test(normalized) &&
        !normalized.includes("legacy-quotation-compat") &&
        (
            !normalized.includes(".latex-doc .text-4xl") ||
            !normalized.includes(".latex-doc .text-\\[9px\\]") ||
            !normalized.includes(".latex-doc .text-\\[10px\\]") ||
            !normalized.includes(".latex-doc .leading-tight") ||
            !normalized.includes(".latex-doc .leading-snug")
        );

    if (shouldInjectCompatCss) {
        normalized = normalized.replace(/<\/style>/i, `${legacyCompatCss}\n</style>`);
    }

    return normalized;
}

export function sanitizeQuotationHtml(html: string): string {
    try {
        const normalizedHtml = normalizeLegacyQuotationHtml(html);
        const window = new JSDOM("").window;
        const purify = createDOMPurify(window as unknown as DOMPurifyWindow);

        purify.addHook("uponSanitizeAttribute", (node: Element, data: { attrName: string; attrValue: string; keepAttr: boolean }) => {
            const attrName = data.attrName.toLowerCase();
            const attrValue = data.attrValue?.trim() ?? "";

            if (attrName.startsWith("on")) {
                data.keepAttr = false;
                return;
            }

            if (
                (attrName === "href" || attrName === "src" || attrName === "xlink:href") &&
                attrValue &&
                !SAFE_URI_REGEX.test(attrValue)
            ) {
                data.keepAttr = false;
                return;
            }

            if (node.tagName === "META" && attrName === "http-equiv") {
                data.keepAttr = false;
                return;
            }

            if (node.tagName === "LINK" && attrName === "rel" && attrValue.toLowerCase() !== "stylesheet") {
                data.keepAttr = false;
                return;
            }

            if (node.tagName === "A" && attrName === "target" && attrValue === "_blank") {
                node.setAttribute("rel", "noopener noreferrer nofollow");
            }
        });

        const sanitized = purify.sanitize(normalizedHtml, {
            WHOLE_DOCUMENT: true,
            USE_PROFILES: { html: true },
            FORBID_TAGS: FORBIDDEN_TAGS,
            FORBID_ATTR: ["srcdoc"],
            ADD_TAGS: ["html", "head", "body", "link", "style", "meta", "title"],
            ADD_ATTR: [
                "class",
                "id",
                "style",
                "title",
                "target",
                "rel",
                "aria-label",
                "aria-hidden",
                "role",
                "colspan",
                "rowspan",
                "cellpadding",
                "cellspacing",
                "width",
                "height",
            ],
            ALLOWED_URI_REGEXP: SAFE_URI_REGEX,
        });

        purify.removeAllHooks();
        return sanitized;
    } catch {
        let clean = normalizeLegacyQuotationHtml(html);
        clean = clean.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
        clean = clean.replace(/<(iframe|object|embed|form|input|button|textarea|select)\b[^>]*>[\s\S]*?<\/\1>/gim, "");
        clean = clean.replace(/<(iframe|object|embed|form|input|button|textarea|select)\b[^>]*\/?>/gim, "");
        clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gim, "");
        clean = clean.replace(/(?:href|src)\s*=\s*['"](?:javascript|vbscript|data:text\/html):[^'"]*['"]/gim, "");
        return clean;
    }
}
