// LaTeX → Styled HTML transpiler tuned for quotation / proposal documents.
// Supports tcolorbox, tcbraster, minipage, itemize/enumerate, tabular,
// \textcolor, \color, \textbf, \textit, \vspace, \rule, FontAwesome icons,
// font-size switches, paragraph breaks, escape sequences, etc.
//
// Not a full LaTeX engine. Focused subset, safe defaults, graceful degradation.
// Output is HTML that can be sanitized by `sanitizeQuotationHtml` and inserted
// into the quotation page.

export interface LatexTranspileOptions {
    // Render colors that are not declared via \definecolor (fallback palette).
    palette?: Record<string, string>;
    // Extra css injected inside <style>.
    extraCss?: string;
    // If true, returns a full HTML document. Otherwise just a body fragment.
    standalone?: boolean;
    // Document font family (defaults to system serif).
    fontFamily?: string;
}

export interface LatexTranspileResult {
    html: string;
    bodyHtml: string;
    warnings: string[];
    errors: Array<{ line: number; message: string }>;
    colors: Record<string, string>;
}

// ─────────────────────────────────────────────
// Palette
// ─────────────────────────────────────────────
const BASE_PALETTE: Record<string, string> = {
    black: "#000000",
    white: "#ffffff",
    red: "#ef4444",
    green: "#10b981",
    blue: "#3b82f6",
    yellow: "#eab308",
    orange: "#f97316",
    purple: "#8b5cf6",
    violet: "#7c3aed",
    indigo: "#4f46e5",
    pink: "#ec4899",
    teal: "#14b8a6",
    cyan: "#06b6d4",
    gray: "#6b7280",
    grey: "#6b7280",
    lightgray: "#d1d5db",
    darkgray: "#374151",
    // Brand defaults used by typical Nicoholas quotation templates.
    brandblue: "#4f46e5",
    brandblack: "#0f172a",
    brandaccent: "#a855f7",
    cardbg: "#0f172a",
    cardborder: "#334155",
    textlight: "#cbd5e1",
    textdim: "#94a3b8",
};

// ─────────────────────────────────────────────
// FontAwesome 5 icon mapping — uses <i> tags so the FA CDN can render them.
// Rendered inside a standalone iframe that loads FA5 Free via CDN.
// ─────────────────────────────────────────────
function fa(cls: string): string { return `<i class="${cls}" aria-hidden="true"></i>`; }

const ICONS: Record<string, string> = {
    faStar: fa("fas fa-star"),
    faStarHalf: fa("fas fa-star-half"),
    faStarO: fa("far fa-star"),
    faCheck: fa("fas fa-check"),
    faCheckCircle: fa("fas fa-check-circle"),
    faTimes: fa("fas fa-times"),
    faTimesCircle: fa("fas fa-times-circle"),
    faCircle: fa("fas fa-circle"),
    faCircleO: fa("far fa-circle"),
    faSquare: fa("fas fa-square"),
    faSquareO: fa("far fa-square"),
    faCalendar: fa("fas fa-calendar"),
    faCalendarAlt: fa("fas fa-calendar-alt"),
    faClock: fa("fas fa-clock"),
    faClockO: fa("far fa-clock"),
    faEnvelope: fa("fas fa-envelope"),
    faEnvelopeO: fa("far fa-envelope"),
    faPhone: fa("fas fa-phone"),
    faPhoneAlt: fa("fas fa-phone-alt"),
    faMobile: fa("fas fa-mobile"),
    faMobileAlt: fa("fas fa-mobile-alt"),
    faGlobe: fa("fas fa-globe"),
    faMapMarker: fa("fas fa-map-marker"),
    faMapMarkerAlt: fa("fas fa-map-marker-alt"),
    faHome: fa("fas fa-home"),
    faUser: fa("fas fa-user"),
    faUsers: fa("fas fa-users"),
    faBriefcase: fa("fas fa-briefcase"),
    faGraduationCap: fa("fas fa-graduation-cap"),
    faCode: fa("fas fa-code"),
    faLaptop: fa("fas fa-laptop"),
    faLaptopCode: fa("fas fa-laptop-code"),
    faCog: fa("fas fa-cog"),
    faGear: fa("fas fa-cog"),
    faWrench: fa("fas fa-wrench"),
    faHammer: fa("fas fa-hammer"),
    faLink: fa("fas fa-link"),
    faLock: fa("fas fa-lock"),
    faUnlock: fa("fas fa-unlock"),
    faShield: fa("fas fa-shield-alt"),
    faShieldAlt: fa("fas fa-shield-alt"),
    faBolt: fa("fas fa-bolt"),
    faRocket: fa("fas fa-rocket"),
    faFire: fa("fas fa-fire"),
    faHeart: fa("fas fa-heart"),
    faThumbsUp: fa("fas fa-thumbs-up"),
    faThumbsDown: fa("fas fa-thumbs-down"),
    faArrowRight: fa("fas fa-arrow-right"),
    faArrowLeft: fa("fas fa-arrow-left"),
    faArrowUp: fa("fas fa-arrow-up"),
    faArrowDown: fa("fas fa-arrow-down"),
    faChevronRight: fa("fas fa-chevron-right"),
    faChevronLeft: fa("fas fa-chevron-left"),
    faDollarSign: fa("fas fa-dollar-sign"),
    faEuroSign: fa("fas fa-euro-sign"),
    faMoneyBill: fa("fas fa-money-bill"),
    faMoneyBillAlt: fa("far fa-money-bill-alt"),
    faCreditCard: fa("fas fa-credit-card"),
    faReceipt: fa("fas fa-receipt"),
    faFileAlt: fa("fas fa-file-alt"),
    faFile: fa("fas fa-file"),
    faFilePdf: fa("fas fa-file-pdf"),
    faFolder: fa("fas fa-folder"),
    faPaperPlane: fa("fas fa-paper-plane"),
    faInfoCircle: fa("fas fa-info-circle"),
    faExclamationTriangle: fa("fas fa-exclamation-triangle"),
    faQuestionCircle: fa("fas fa-question-circle"),
    faGithub: fa("fab fa-github"),
    faLinkedin: fa("fab fa-linkedin"),
    faTwitter: fa("fab fa-twitter"),
    faInstagram: fa("fab fa-instagram"),
    faFacebook: fa("fab fa-facebook"),
    faWhatsapp: fa("fab fa-whatsapp"),
};

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────
function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function stripLatexComments(src: string): string {
    return src.split("\n").map(line => {
        let out = "";
        let i = 0;
        while (i < line.length) {
            if (line[i] === "\\" && i + 1 < line.length) {
                out += line[i] + line[i + 1];
                i += 2;
                continue;
            }
            if (line[i] === "%") break;
            out += line[i];
            i++;
        }
        return out;
    }).join("\n");
}

function matchClose(src: string, pos: number, open: string, close: string): number {
    if (src[pos] !== open) return -1;
    let depth = 1;
    let i = pos + 1;
    while (i < src.length && depth > 0) {
        const c = src[i];
        if (c === "\\") { i += 2; continue; }
        if (c === open) depth++;
        else if (c === close) { depth--; if (depth === 0) return i; }
        i++;
    }
    return -1;
}

function readCommand(src: string, pos: number): { name: string; end: number } | null {
    if (src[pos] !== "\\") return null;
    let i = pos + 1;
    // \\, \%, \$, etc. are single-char "commands" (escapes)
    if (i >= src.length) return null;
    if (!/[a-zA-Z@]/.test(src[i])) {
        return { name: src[i], end: i + 1 };
    }
    let name = "";
    while (i < src.length && /[a-zA-Z@]/.test(src[i])) { name += src[i]; i++; }
    // Skip trailing space after control word
    while (src[i] === " " || src[i] === "\t") i++;
    // starred form
    if (src[i] === "*") { name += "*"; i++; }
    return { name, end: i };
}

function readOptionalArg(src: string, pos: number): { content: string; end: number } | null {
    if (src[pos] !== "[") return null;
    const closeIdx = matchClose(src, pos, "[", "]");
    if (closeIdx === -1) return null;
    return { content: src.substring(pos + 1, closeIdx), end: closeIdx + 1 };
}

function readGroupArg(src: string, pos: number): { content: string; end: number } | null {
    // Skip whitespace
    let i = pos;
    while (src[i] === " " || src[i] === "\t" || src[i] === "\n") i++;
    if (src[i] !== "{") {
        // single-char arg? (e.g., \textbf X) — TeX allows single token
        if (i < src.length && src[i] !== "}" && src[i] !== "\\") {
            return { content: src[i], end: i + 1 };
        }
        return null;
    }
    const closeIdx = matchClose(src, i, "{", "}");
    if (closeIdx === -1) return null;
    return { content: src.substring(i + 1, closeIdx), end: closeIdx + 1 };
}

// Parse `key=value, key2=value2, flag` from an options string.
function parseKv(optStr: string): Record<string, string> {
    const out: Record<string, string> = {};
    let depth = 0;
    let buf = "";
    const parts: string[] = [];
    for (let i = 0; i < optStr.length; i++) {
        const c = optStr[i];
        if (c === "{") depth++;
        if (c === "}") depth--;
        if (c === "," && depth === 0) { parts.push(buf); buf = ""; continue; }
        buf += c;
    }
    if (buf) parts.push(buf);
    for (const p of parts) {
        const trimmed = p.trim();
        if (!trimmed) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) { out[trimmed] = "true"; continue; }
        const k = trimmed.substring(0, eq).trim();
        const v = trimmed.substring(eq + 1).trim();
        // Only strip surrounding braces when they form a balanced outer pair
        if (v.startsWith("{") && v.endsWith("}") && matchClose(v, 0, "{", "}") === v.length - 1) {
            out[k] = v.slice(1, -1).trim();
        } else {
            out[k] = v;
        }
    }
    return out;
}

// Convert LaTeX length expression to CSS length.
// Supports cm, mm, in, pt, em, px, %, \textwidth, \linewidth, \columnwidth.
function lengthToCss(expr: string): string {
    if (!expr) return "";
    expr = expr.trim();
    if (/^\\(?:textwidth|linewidth|columnwidth)$/.test(expr)) {
        return "100%";
    }
    // Fraction of \textwidth like 0.5\textwidth
    const textMatch = expr.match(/^(-?[\d.]+)\s*\\(?:textwidth|linewidth|columnwidth)$/);
    if (textMatch) {
        const n = parseFloat(textMatch[1]);
        return `${n * 100}%`;
    }
    // Numeric + unit
    const numMatch = expr.match(/^(-?[\d.]+)\s*(cm|mm|in|pt|em|ex|px|rem|%)?$/);
    if (numMatch) {
        const n = parseFloat(numMatch[1]);
        const unit = numMatch[2] || "em";
        // pt to px roughly
        if (unit === "pt") return `${(n * 1.333).toFixed(2)}px`;
        return `${n}${unit}`;
    }
    return expr;
}

function collectDefineColors(src: string, palette: Record<string, string>): Record<string, string> {
    const colors: Record<string, string> = { ...palette };
    // \definecolor{name}{model}{value}
    const regex = /\\definecolor\s*\{([^}]+)\}\s*\{([^}]+)\}\s*\{([^}]+)\}/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(src)) !== null) {
        const [, name, model, value] = m;
        const modelL = model.trim().toLowerCase();
        const v = value.trim();
        if (modelL === "html") {
            colors[name] = "#" + v;
        } else if (modelL === "rgb") {
            const parts = v.split(",").map(s => parseInt(s.trim(), 10));
            if (parts.length === 3 && parts.every(n => !isNaN(n))) {
                colors[name] = `rgb(${parts[0]},${parts[1]},${parts[2]})`;
            }
        } else if (modelL === "rgb1" || modelL === "rgb{1}" || modelL.includes("1")) {
            const parts = v.split(",").map(s => parseFloat(s.trim()));
            if (parts.length === 3 && parts.every(n => !isNaN(n))) {
                const [r, g, b] = parts.map(n => Math.round(n * 255));
                colors[name] = `rgb(${r},${g},${b})`;
            }
        } else if (modelL === "cmyk") {
            // Approximate CMYK → RGB
            const parts = v.split(",").map(s => parseFloat(s.trim()));
            if (parts.length === 4 && parts.every(n => !isNaN(n))) {
                const [c, m2, y, k] = parts;
                const r = Math.round(255 * (1 - c) * (1 - k));
                const g = Math.round(255 * (1 - m2) * (1 - k));
                const b = Math.round(255 * (1 - y) * (1 - k));
                colors[name] = `rgb(${r},${g},${b})`;
            }
        } else if (modelL === "gray") {
            const n = parseFloat(v);
            if (!isNaN(n)) {
                const g = Math.round(n * 255);
                colors[name] = `rgb(${g},${g},${g})`;
            }
        }
    }
    return colors;
}

function resolveColor(name: string, colors: Record<string, string>): string {
    if (!name) return "inherit";
    const trimmed = name.trim();
    if (trimmed.startsWith("#")) return trimmed;
    if (/^rgb/i.test(trimmed)) return trimmed;
    // Bangs like "red!50" — lighten approximation
    const bang = trimmed.match(/^([a-zA-Z]+)!(\d+)(?:!([a-zA-Z]+))?$/);
    if (bang) {
        const base = colors[bang[1]] || BASE_PALETTE[bang[1]] || "#888";
        const pct = parseInt(bang[2], 10);
        return mixColor(base, bang[3] ? (colors[bang[3]] || "#ffffff") : "#ffffff", pct);
    }
    return colors[trimmed] || BASE_PALETTE[trimmed] || "inherit";
}

function mixColor(a: string, b: string, pct: number): string {
    const parseRgb = (c: string): [number, number, number] => {
        if (c.startsWith("#")) {
            const hex = c.length === 4
                ? c.slice(1).split("").map(x => x + x).join("")
                : c.slice(1);
            return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
        }
        const m = c.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (m) return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
        return [128, 128, 128];
    };
    const [ar, ag, ab] = parseRgb(a);
    const [br, bg, bb] = parseRgb(b);
    const f = pct / 100;
    const r = Math.round(ar * f + br * (1 - f));
    const g = Math.round(ag * f + bg * (1 - f));
    const bl = Math.round(ab * f + bb * (1 - f));
    return `rgb(${r},${g},${bl})`;
}

// ─────────────────────────────────────────────
// Main transpiler
// ─────────────────────────────────────────────

interface Ctx {
    colors: Record<string, string>;
    warnings: string[];
    errors: Array<{ line: number; message: string }>;
    namedStyles: Record<string, string>;
    // Running color state (from \color{...})
    inlineColor?: string;
    // Running font-size class (from \scriptsize, etc.)
    inlineSize?: string;
    // Running weight (bold if under \bfseries)
    inlineBold?: boolean;
}

// Collect \tcbset{ name/.style={...} } definitions for use in tcolorbox rendering.
function collectTcbsetStyles(src: string): Record<string, string> {
    const result: Record<string, string> = {};
    let i = 0;
    while (i < src.length) {
        if (src[i] !== "\\") { i++; continue; }
        const cmd = readCommand(src, i);
        if (!cmd) { i++; continue; }
        if (cmd.name !== "tcbset") { i = cmd.end; continue; }
        const block = readGroupArg(src, cmd.end);
        if (!block) { i = cmd.end; continue; }
        const content = block.content;
        const styleRe = /(\w+)\s*\/\.style\s*=\s*\{/g;
        let m: RegExpExecArray | null;
        while ((m = styleRe.exec(content)) !== null) {
            const name = m[1];
            const openPos = m.index + m[0].length - 1;
            const closePos = matchClose(content, openPos, "{", "}");
            if (closePos !== -1) {
                result[name] = content.substring(openPos + 1, closePos);
            }
        }
        i = block.end;
    }
    return result;
}

function sizeClass(cmd: string): string | null {
    const map: Record<string, string> = {
        tiny: "text-[9px] leading-tight",
        scriptsize: "text-[10px] leading-snug",
        footnotesize: "text-xs",
        small: "text-sm",
        normalsize: "text-base",
        large: "text-lg",
        Large: "text-xl",
        LARGE: "text-2xl",
        huge: "text-3xl",
        Huge: "text-4xl",
    };
    return map[cmd] ?? null;
}

// Render content of a group, possibly with leading font/color switches.
function renderGroup(inner: string, ctx: Ctx): string {
    // Detect leading scoping commands and apply as wrapping.
    let cursor = 0;
    const classes: string[] = [];
    const styles: string[] = [];
    // Skip whitespace
    while (cursor < inner.length && /\s/.test(inner[cursor])) cursor++;
    // Try reading one or more scoping commands.
    let changed = true;
    while (changed && inner[cursor] === "\\") {
        changed = false;
        const cmd = readCommand(inner, cursor);
        if (!cmd) break;
        // Size switches
        const sz = sizeClass(cmd.name);
        if (sz) {
            classes.push(sz);
            cursor = cmd.end;
            changed = true;
            continue;
        }
        // Font switches
        if (cmd.name === "bfseries") { classes.push("font-bold"); cursor = cmd.end; changed = true; continue; }
        if (cmd.name === "itshape" || cmd.name === "em") { classes.push("italic"); cursor = cmd.end; changed = true; continue; }
        if (cmd.name === "sffamily") { classes.push("font-sans"); cursor = cmd.end; changed = true; continue; }
        if (cmd.name === "ttfamily") { classes.push("font-mono"); cursor = cmd.end; changed = true; continue; }
        if (cmd.name === "rmfamily") { classes.push("font-serif"); cursor = cmd.end; changed = true; continue; }
        if (cmd.name === "centering") { classes.push("text-center"); cursor = cmd.end; changed = true; continue; }
        if (cmd.name === "raggedright") { classes.push("text-left"); cursor = cmd.end; changed = true; continue; }
        if (cmd.name === "raggedleft") { classes.push("text-right"); cursor = cmd.end; changed = true; continue; }
        // \color{name}
        if (cmd.name === "color") {
            const arg = readGroupArg(inner, cmd.end);
            if (arg) {
                styles.push(`color:${resolveColor(arg.content, ctx.colors)}`);
                cursor = arg.end;
                changed = true;
                continue;
            }
        }
    }
    const body = transpile(inner.substring(cursor), ctx);
    const classAttr = classes.length ? ` class="${classes.join(" ")}"` : "";
    const styleAttr = styles.length ? ` style="${styles.join(";")}"` : "";
    if (!classAttr && !styleAttr) return body;
    return `<span${classAttr}${styleAttr}>${body}</span>`;
}

// Render one environment.
function renderEnvironment(
    env: string,
    optArg: string | null,
    args: string[],
    inner: string,
    ctx: Ctx
): string {
    switch (env) {
        case "document":
            return renderParagraphs(inner, ctx);

        case "center":
            return `<div class="text-center my-2">${renderParagraphs(inner, ctx)}</div>`;

        case "flushleft":
            return `<div class="text-left my-2">${renderParagraphs(inner, ctx)}</div>`;

        case "flushright":
            return `<div class="text-right my-2">${renderParagraphs(inner, ctx)}</div>`;

        case "quote":
        case "quotation":
            return `<blockquote class="border-l-4 border-slate-300 pl-4 italic my-3">${renderParagraphs(inner, ctx)}</blockquote>`;

        case "verbatim":
            return `<pre class="bg-slate-100 rounded-md p-3 text-xs font-mono overflow-x-auto my-3">${escapeHtml(inner)}</pre>`;

        case "itemize":
        case "enumerate": {
            const items = splitItems(inner);
            if (env === "enumerate") {
                return `<ol class="list-decimal pl-6 space-y-1 my-2">${items.map(it => `<li>${transpile(it, ctx)}</li>`).join("")}</ol>`;
            }
            // itemize: check for custom label
            if (optArg) {
                const kvs = parseKv(optArg);
                if (kvs.label) {
                    const labelHtml = transpile(kvs.label, ctx);
                    return `<ul style="list-style:none;padding-left:1.6rem" class="my-2">${
                        items.map(it => `<li class="flex gap-2 items-start my-1"><span class="shrink-0 mt-0.5">${labelHtml}</span><span>${transpile(it, ctx)}</span></li>`).join("")
                    }</ul>`;
                }
            }
            return `<ul class="list-disc pl-6 space-y-1 my-2">${items.map(it => `<li>${transpile(it, ctx)}</li>`).join("")}</ul>`;
        }

        case "description": {
            const items = splitItems(inner);
            return `<dl class="my-2 space-y-1">${items.map(it => {
                const m = it.match(/^\s*\[([^\]]*)\]([\s\S]*)$/);
                if (m) return `<div class="flex gap-2"><dt class="font-semibold">${transpile(m[1], ctx)}</dt><dd>${transpile(m[2], ctx)}</dd></div>`;
                return `<dd>${transpile(it, ctx)}</dd>`;
            }).join("")}</dl>`;
        }

        case "tabular":
        case "tabularx":
        case "tabulary":
            return renderTabular(args[args.length - 1] || "", inner, ctx);

        case "minipage": {
            const width = args[args.length - 1] || "50%";
            const cssW = lengthToCss(width) || "50%";
            return `<div class="inline-block align-top p-1" style="width:${cssW}">${renderParagraphs(inner, ctx)}</div>`;
        }

        case "tcolorbox": {
            // Collect all raw option text: explicit opts + any referenced named styles.
            // This is needed because parseKv can't handle multi-word keys like "borderline west".
            const rawParts: string[] = [];
            if (optArg) rawParts.push(optArg);
            const initialOpts = optArg ? parseKv(optArg) : {};
            for (const key of Object.keys(initialOpts)) {
                if (initialOpts[key] === "true" && ctx.namedStyles[key]) {
                    rawParts.push(ctx.namedStyles[key]);
                }
            }
            const rawAll = rawParts.join(",");

            // Merge named tcbset styles into parsed opts.
            const opts = parseKv(rawAll);

            const colback = resolveColor(opts.colback || "white", ctx.colors);
            const colframe = resolveColor(opts.colframe || opts.colback || "gray", ctx.colors);
            const coltext = resolveColor(opts.coltext || "black", ctx.colors);
            const titleRaw = opts.title || "";

            // blankest = no border, transparent bg; boxrule=0pt = no border but keep bg
            const isBlank = opts.blankest === "true" || opts.blanker === "true" || opts.frame === "hidden";
            const noFrame = isBlank || opts.boxrule === "0pt";

            const radius = opts.arc ? lengthToCss(opts.arc) : "8px";

            const hasExplicitPad = !!(opts.top || opts.right || opts.bottom || opts.left);
            const pad = hasExplicitPad
                ? `${lengthToCss(opts.top || "") || "0.75rem"} ${lengthToCss(opts.right || "") || "0.75rem"} ${lengthToCss(opts.bottom || "") || "0.75rem"} ${lengthToCss(opts.left || "") || "0.75rem"}`
                : (opts.boxsep ? lengthToCss(opts.boxsep) : "0.75rem");

            const boxruleWidth = opts.boxrule ? lengthToCss(opts.boxrule) : "0.5pt";
            const borderStr = noFrame ? "border:0;" : `border:${boxruleWidth} solid ${colframe};`;

            // drop fuzzy shadow — scan raw strings since parseKv can't parse this
            const hasShadow = /drop\s+(fuzzy\s+)?shadow/.test(rawAll);
            const shadowStr = hasShadow ? "box-shadow:0 2px 10px rgba(0,0,0,0.08);" : "";

            // borderline west={thickness}{offset}{color}
            let leftBorderStr = "";
            const blWest = rawAll.match(/borderline\s+west\s*=\s*\{([^}]+)\}\s*\{[^}]*\}\s*\{([^}]+)\}/);
            if (blWest) {
                const w = lengthToCss(blWest[1]) || "3px";
                const c = resolveColor(blWest[2], ctx.colors);
                leftBorderStr = `border-left:${w} solid ${c};border-radius:0 ${radius} ${radius} 0;`;
            }

            // borderline north={thickness}{offset}{color}
            let topBorderStr = "";
            const blNorth = rawAll.match(/borderline\s+north\s*=\s*\{([^}]+)\}\s*\{[^}]*\}\s*\{([^}]+)\}/);
            if (blNorth) {
                const w = lengthToCss(blNorth[1]) || "3px";
                const c = resolveColor(blNorth[2], ctx.colors);
                topBorderStr = `border-top:${w} solid ${c};`;
            }

            // width / height (for small boxes like logo)
            const widthStr = opts.width ? `width:${lengthToCss(opts.width)};` : "";
            const heightStr = opts.height ? `height:${lengthToCss(opts.height)};min-height:${lengthToCss(opts.height)};` : "";

            // halign / valign
            let alignStr = "";
            if (opts.halign === "center" || opts.valign === "center") {
                alignStr = "display:flex;align-items:center;justify-content:center;";
            }

            const style = `background:${colback};${borderStr}${leftBorderStr}${topBorderStr}border-radius:${radius};padding:${pad};color:${coltext};${shadowStr}${widthStr}${heightStr}${alignStr}box-sizing:border-box;`;

            const title = titleRaw
                ? `<div class="font-semibold mb-2" style="color:${resolveColor(opts.coltitle || colframe, ctx.colors)}">${transpile(titleRaw, ctx)}</div>`
                : "";
            return `<div class="my-3" style="${style}">${title}${renderParagraphs(inner, ctx)}</div>`;
        }

        case "tcbraster":
        case "tcbitemize": {
            const opts = optArg ? parseKv(optArg) : {};
            const cols = parseInt(opts["raster columns"] || opts.cols || "2", 10) || 2;
            return `<div class="grid gap-3 my-3" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${renderParagraphs(inner, ctx)}</div>`;
        }

        case "multicols": {
            const n = parseInt(args[0] || "2", 10) || 2;
            return `<div class="my-3" style="column-count:${n};column-gap:1.5rem">${renderParagraphs(inner, ctx)}</div>`;
        }

        case "figure":
        case "table":
            return `<figure class="my-3">${renderParagraphs(inner, ctx)}</figure>`;

        case "abstract":
            return `<div class="my-3 px-6 italic text-sm">${renderParagraphs(inner, ctx)}</div>`;

        case "equation":
        case "align":
        case "align*":
        case "gather":
        case "gather*":
        case "math":
        case "displaymath":
            return `<div class="my-2 font-serif text-center italic">${escapeHtml(inner.trim())}</div>`;

        default:
            ctx.warnings.push(`Entorno no soportado: ${env}`);
            return `<div class="my-2">${renderParagraphs(inner, ctx)}</div>`;
    }
}

function findEnvironmentEnd(src: string, searchFrom: number, env: string): number {
    let depth = 1;
    let i = searchFrom;

    while (i < src.length) {
        if (src[i] !== "\\") {
            i++;
            continue;
        }

        const cmd = readCommand(src, i);
        if (!cmd) {
            i++;
            continue;
        }

        if (cmd.name === "begin") {
            const envArg = readGroupArg(src, cmd.end);
            if (envArg) {
                if (envArg.content.trim() === env) depth++;
                i = envArg.end;
                continue;
            }
        }

        if (cmd.name === "end") {
            const envArg = readGroupArg(src, cmd.end);
            if (envArg) {
                if (envArg.content.trim() === env) {
                    depth--;
                    if (depth === 0) return i;
                }
                i = envArg.end;
                continue;
            }
        }

        i = cmd.end;
    }

    return -1;
}

function readEndCommandEnd(src: string, endCommandPos: number): number {
    const endCmd = readCommand(src, endCommandPos);
    if (!endCmd || endCmd.name !== "end") return endCommandPos;
    const endArg = readGroupArg(src, endCmd.end);
    return endArg ? endArg.end : endCmd.end;
}

function splitTopLevelParagraphs(src: string): string[] {
    const parts: string[] = [];
    let buf = "";
    let i = 0;
    let envDepth = 0;

    while (i < src.length) {
        if (src[i] === "\\") {
            const cmd = readCommand(src, i);
            if (cmd) {
                if (cmd.name === "begin") {
                    const envArg = readGroupArg(src, cmd.end);
                    if (envArg) {
                        envDepth++;
                        buf += src.substring(i, envArg.end);
                        i = envArg.end;
                        continue;
                    }
                }
                if (cmd.name === "end") {
                    const envArg = readGroupArg(src, cmd.end);
                    if (envArg) {
                        envDepth = Math.max(0, envDepth - 1);
                        buf += src.substring(i, envArg.end);
                        i = envArg.end;
                        continue;
                    }
                }
            }
        }

        if (envDepth === 0 && src[i] === "\n" && src[i + 1] === "\n") {
            let j = i + 2;
            while (src[j] === "\n") j++;
            if (buf.trim()) parts.push(buf.trim());
            buf = "";
            i = j;
            continue;
        }

        buf += src[i];
        i++;
    }

    if (buf.trim()) parts.push(buf.trim());
    return parts;
}

function splitItems(inner: string): string[] {
    // Splits list body on top-level \item.
    const items: string[] = [];
    let cur = "";
    let i = 0;
    let hadFirst = false;
    while (i < inner.length) {
        if (inner[i] === "\\") {
            const cmd = readCommand(inner, i);
            if (cmd && cmd.name === "item") {
                if (hadFirst) items.push(cur);
                cur = "";
                hadFirst = true;
                i = cmd.end;
                // Optional arg after \item
                continue;
            }
            // Skip nested \begin...\end blocks so inner \item do not split us.
            if (cmd && cmd.name === "begin") {
                const envArg = readGroupArg(inner, cmd.end);
                if (envArg) {
                    const endIdx = findEnvironmentEnd(inner, envArg.end, envArg.content.trim());
                    if (endIdx !== -1) {
                        const endPos = readEndCommandEnd(inner, endIdx);
                        cur += inner.substring(i, endPos);
                        i = endPos;
                        continue;
                    }
                }
            }
            cur += inner[i] + (inner[i + 1] || "");
            i += 2;
            continue;
        }
        cur += inner[i];
        i++;
    }
    if (hadFirst && cur.trim()) items.push(cur);
    else if (!hadFirst && cur.trim()) items.push(cur);
    return items;
}

function renderTabular(_colSpec: string, inner: string, ctx: Ctx): string {
    // Split into rows at top-level \\
    const rows: string[] = [];
    let cur = "";
    let i = 0;
    while (i < inner.length) {
        if (inner[i] === "\\" && inner[i + 1] === "\\") {
            rows.push(cur);
            cur = "";
            i += 2;
            // skip optional [spacing]
            while (inner[i] === " " || inner[i] === "\t" || inner[i] === "\n") i++;
            if (inner[i] === "[") {
                const end = matchClose(inner, i, "[", "]");
                if (end !== -1) i = end + 1;
            }
            continue;
        }
        if (inner[i] === "\\") {
            const cmd = readCommand(inner, i);
            if (cmd && (cmd.name === "hline" || cmd.name === "midrule" || cmd.name === "toprule" || cmd.name === "bottomrule")) {
                i = cmd.end;
                continue;
            }
            if (cmd && cmd.name === "addlinespace") {
                i = cmd.end;
                if (inner[i] === "[") {
                    const opt = readOptionalArg(inner, i);
                    if (opt) i = opt.end;
                }
                continue;
            }
            if (cmd && cmd.name === "cline") {
                const arg = readGroupArg(inner, cmd.end);
                if (arg) { i = arg.end; continue; }
            }
        }
        cur += inner[i];
        i++;
    }
    if (cur.trim()) rows.push(cur);
    const rowsHtml = rows.map(r => {
        // Split cells at top-level &
        const cells: string[] = [];
        let depth = 0;
        let buf = "";
        for (let k = 0; k < r.length; k++) {
            const c = r[k];
            if (c === "{") depth++;
            if (c === "}") depth--;
            if (c === "&" && depth === 0) { cells.push(buf); buf = ""; continue; }
            buf += c;
        }
        cells.push(buf);
        return `<tr>${cells.map(c => `<td class="px-2 py-1 align-top">${transpile(c, ctx)}</td>`).join("")}</tr>`;
    }).join("");
    return `<table class="my-3 border-collapse w-full text-sm"><tbody>${rowsHtml}</tbody></table>`;
}

// Render a sequence with paragraph-break handling (double newlines).
function renderParagraphs(src: string, ctx: Ctx): string {
    const paras = splitTopLevelParagraphs(src);
    if (paras.length <= 1) return transpile(src, ctx);
    return paras.map(p => {
        const rendered = transpile(p, ctx);
        // If the paragraph already starts with a block-level tag, do not wrap.
        if (/^\s*<(div|ul|ol|table|figure|blockquote|h[1-6]|p|hr|dl|pre)/i.test(rendered)) {
            return rendered;
        }
        return `<p class="my-2">${rendered}</p>`;
    }).join("");
}

// Core transpile: handles commands, groups, text.
function transpile(src: string, ctx: Ctx): string {
    let out = "";
    let i = 0;
    while (i < src.length) {
        const c = src[i];

        if (c === "\\") {
            const cmd = readCommand(src, i);
            if (!cmd) { out += escapeHtml(c); i++; continue; }

            // Line break
            if (cmd.name === "\\") {
                // Optional [length]
                let j = cmd.end;
                if (src[j] === "[") {
                    const opt = readOptionalArg(src, j);
                    if (opt) j = opt.end;
                }
                if (src[j] === "*") j++;
                out += "<br />";
                i = j;
                continue;
            }

            // Escapes
            if (cmd.name === "%") { out += "%"; i = cmd.end; continue; }
            if (cmd.name === "$") { out += "$"; i = cmd.end; continue; }
            if (cmd.name === "&") { out += "&amp;"; i = cmd.end; continue; }
            if (cmd.name === "#") { out += "#"; i = cmd.end; continue; }
            if (cmd.name === "_") { out += "_"; i = cmd.end; continue; }
            if (cmd.name === "{") { out += "{"; i = cmd.end; continue; }
            if (cmd.name === "}") { out += "}"; i = cmd.end; continue; }
            if (cmd.name === ",") { out += "&thinsp;"; i = cmd.end; continue; }
            if (cmd.name === " ") { out += " "; i = cmd.end; continue; }
            if (cmd.name === "~") { out += "~"; i = cmd.end; continue; }

            // Non-breaking space via ~ is handled as literal text

            // Environment
            if (cmd.name === "begin") {
                const envArg = readGroupArg(src, cmd.end);
                if (!envArg) { out += ""; i = cmd.end; continue; }
                const env = envArg.content.trim();
                let j = envArg.end;
                let optArg: string | null = null;
                const args: string[] = [];
                // Optional arg
                while (src[j] === "[") {
                    const opt = readOptionalArg(src, j);
                    if (!opt) break;
                    optArg = (optArg === null ? "" : optArg + ",") + opt.content;
                    j = opt.end;
                }
                // Required args (greedy: consume consecutive groups on same line)
                while (src[j] === " " || src[j] === "\t") j++;
                while (src[j] === "{") {
                    const grp = readGroupArg(src, j);
                    if (!grp) break;
                    args.push(grp.content);
                    j = grp.end;
                    // Stop if we hit newline so env body doesn't get consumed
                    if (src[j] === "\n") break;
                    while (src[j] === " " || src[j] === "\t") j++;
                }
                const endIdx = findEnvironmentEnd(src, j, env);
                if (endIdx === -1) {
                    ctx.errors.push({ line: lineOf(src, i), message: `Entorno ${env} sin \\end` });
                    i = j;
                    continue;
                }
                const inner = src.substring(j, endIdx);
                out += renderEnvironment(env, optArg, args, inner, ctx);
                i = readEndCommandEnd(src, endIdx);
                continue;
            }

            if (cmd.name === "end") {
                // Shouldn't be reached except for mismatched — skip the arg.
                const arg = readGroupArg(src, cmd.end);
                i = arg ? arg.end : cmd.end;
                continue;
            }

            // Preamble commands — skip
            if (["documentclass", "usepackage", "title", "author", "date",
                "newcommand", "renewcommand", "providecommand", "newenvironment",
                "definecolor", "pagestyle", "thispagestyle", "setlength",
                "renewenvironment", "DeclareOption", "ProcessOptions",
                "geometry", "hypersetup", "tcbset",
                "babelprovide", "babelfont"].includes(cmd.name)) {
                // Skip optional and one or two group args.
                let j = cmd.end;
                while (src[j] === "[") {
                    const opt = readOptionalArg(src, j);
                    if (!opt) break;
                    j = opt.end;
                }
                while (src[j] === "{") {
                    const grp = readGroupArg(src, j);
                    if (!grp) break;
                    j = grp.end;
                }
                i = j;
                continue;
            }

            if (cmd.name === "maketitle") {
                i = cmd.end;
                out += `<h1 class="text-2xl font-bold my-3 text-center">Cotización</h1>`;
                continue;
            }

            // Headings
            if (["chapter", "section", "subsection", "subsubsection", "paragraph", "subparagraph"].includes(cmd.name.replace(/\*$/, ""))) {
                const base = cmd.name.replace(/\*$/, "");
                const tag = { chapter: "h1", section: "h2", subsection: "h3", subsubsection: "h4", paragraph: "h5", subparagraph: "h6" }[base] || "h3";
                const cls = { chapter: "text-3xl font-bold my-4", section: "text-2xl font-bold my-3", subsection: "text-xl font-semibold my-2", subsubsection: "text-lg font-semibold my-2", paragraph: "text-base font-semibold my-1", subparagraph: "text-base font-semibold my-1" }[base] || "font-semibold my-2";
                // optional
                let j = cmd.end;
                if (src[j] === "[") { const o = readOptionalArg(src, j); if (o) j = o.end; }
                const arg = readGroupArg(src, j);
                if (arg) {
                    out += `<${tag} class="${cls}">${transpile(arg.content, ctx)}</${tag}>`;
                    i = arg.end;
                    continue;
                }
                i = j;
                continue;
            }

            // Text formatting commands with one group arg
            const oneArgInline: Record<string, (inner: string) => string> = {
                textbf: (x) => `<strong>${x}</strong>`,
                textit: (x) => `<em>${x}</em>`,
                emph: (x) => `<em>${x}</em>`,
                underline: (x) => `<u>${x}</u>`,
                texttt: (x) => `<code class="font-mono">${x}</code>`,
                textsf: (x) => `<span class="font-sans">${x}</span>`,
                textrm: (x) => `<span class="font-serif">${x}</span>`,
                textsc: (x) => `<span style="font-variant:small-caps">${x}</span>`,
                textsuperscript: (x) => `<sup>${x}</sup>`,
                textsubscript: (x) => `<sub>${x}</sub>`,
                mbox: (x) => `<span style="white-space:nowrap">${x}</span>`,
            };
            if (oneArgInline[cmd.name]) {
                const arg = readGroupArg(src, cmd.end);
                if (arg) {
                    out += oneArgInline[cmd.name](transpile(arg.content, ctx));
                    i = arg.end;
                    continue;
                }
            }

            // textcolor{color}{text}
            if (cmd.name === "textcolor") {
                const a1 = readGroupArg(src, cmd.end);
                if (a1) {
                    const a2 = readGroupArg(src, a1.end);
                    if (a2) {
                        const col = resolveColor(a1.content, ctx.colors);
                        out += `<span style="color:${col}">${transpile(a2.content, ctx)}</span>`;
                        i = a2.end;
                        continue;
                    }
                }
            }

            // colorbox{color}{text}  —  wrap with background
            if (cmd.name === "colorbox") {
                const a1 = readGroupArg(src, cmd.end);
                if (a1) {
                    const a2 = readGroupArg(src, a1.end);
                    if (a2) {
                        const bg = resolveColor(a1.content, ctx.colors);
                        out += `<span class="px-1 rounded" style="background:${bg}">${transpile(a2.content, ctx)}</span>`;
                        i = a2.end;
                        continue;
                    }
                }
            }

            // fcolorbox{frame}{bg}{text}
            if (cmd.name === "fcolorbox") {
                const a1 = readGroupArg(src, cmd.end);
                const a2 = a1 ? readGroupArg(src, a1.end) : null;
                const a3 = a2 ? readGroupArg(src, a2.end) : null;
                if (a1 && a2 && a3) {
                    const frame = resolveColor(a1.content, ctx.colors);
                    const bg = resolveColor(a2.content, ctx.colors);
                    out += `<span class="px-1 rounded border" style="border-color:${frame};background:${bg}">${transpile(a3.content, ctx)}</span>`;
                    i = a3.end;
                    continue;
                }
            }

            // href{url}{text}
            if (cmd.name === "href") {
                const a1 = readGroupArg(src, cmd.end);
                const a2 = a1 ? readGroupArg(src, a1.end) : null;
                if (a1 && a2) {
                    const url = a1.content.trim();
                    out += `<a class="text-indigo-600 underline" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer nofollow">${transpile(a2.content, ctx)}</a>`;
                    i = a2.end;
                    continue;
                }
            }

            // url{url}
            if (cmd.name === "url") {
                const a1 = readGroupArg(src, cmd.end);
                if (a1) {
                    const url = a1.content.trim();
                    out += `<a class="text-indigo-600 underline" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(url)}</a>`;
                    i = a1.end;
                    continue;
                }
            }

            // vspace{len} / hspace{len}
            if (cmd.name === "vspace" || cmd.name === "vspace*") {
                const a = readGroupArg(src, cmd.end);
                if (a) {
                    const h = lengthToCss(a.content);
                    out += `<div aria-hidden="true" style="height:${h}"></div>`;
                    i = a.end;
                    continue;
                }
            }
            if (cmd.name === "hspace" || cmd.name === "hspace*") {
                const a = readGroupArg(src, cmd.end);
                if (a) {
                    const w = lengthToCss(a.content);
                    out += `<span aria-hidden="true" style="display:inline-block;width:${w}"></span>`;
                    i = a.end;
                    continue;
                }
            }

            // rule{width}{height}
            if (cmd.name === "rule") {
                let j = cmd.end;
                if (src[j] === "[") { const o = readOptionalArg(src, j); if (o) j = o.end; }
                const a1 = readGroupArg(src, j);
                const a2 = a1 ? readGroupArg(src, a1.end) : null;
                if (a1 && a2) {
                    const w = lengthToCss(a1.content) || "100%";
                    const h = lengthToCss(a2.content) || "1px";
                    out += `<hr aria-hidden="true" style="width:${w};height:${h};background:currentColor;border:0;margin:0.5em 0" />`;
                    i = a2.end;
                    continue;
                }
            }

            // Single-token style switches (no arg): \bfseries, \itshape, \small, etc. → tag-less spans applied via group
            const sz = sizeClass(cmd.name);
            if (sz) {
                out += `<span class="${sz}">`;
                // Consume until end of enclosing group or paragraph — we can't know here.
                // Simple approach: close at the next blank line or end of string; but since we usually appear inside {},
                // the closing happens at the end of transpile(inner). So just open a span that will be closed at the end of this scope.
                // Instead, to keep it safe, emit span then wrap the rest of this transpile call.
                const rest = src.substring(cmd.end);
                out += transpile(rest, ctx);
                out += `</span>`;
                return out;
            }
            if (cmd.name === "bfseries") {
                const rest = src.substring(cmd.end);
                out += `<strong>${transpile(rest, ctx)}</strong>`;
                return out;
            }
            if (cmd.name === "itshape" || cmd.name === "em") {
                const rest = src.substring(cmd.end);
                out += `<em>${transpile(rest, ctx)}</em>`;
                return out;
            }
            if (cmd.name === "centering") {
                const rest = src.substring(cmd.end);
                out += `<span class="block text-center">${transpile(rest, ctx)}</span>`;
                return out;
            }
            if (cmd.name === "raggedleft") {
                const rest = src.substring(cmd.end);
                out += `<span class="block text-right">${transpile(rest, ctx)}</span>`;
                return out;
            }
            if (cmd.name === "raggedright") {
                const rest = src.substring(cmd.end);
                out += `<span class="block text-left">${transpile(rest, ctx)}</span>`;
                return out;
            }

            // multicolumn{n}{align}{content} -> keep content
            if (cmd.name === "multicolumn") {
                const a1 = readGroupArg(src, cmd.end);
                const a2 = a1 ? readGroupArg(src, a1.end) : null;
                const a3 = a2 ? readGroupArg(src, a2.end) : null;
                if (a1 && a2 && a3) {
                    out += transpile(a3.content, ctx);
                    i = a3.end;
                    continue;
                }
            }

            // \color{name} — inline color to rest of scope
            if (cmd.name === "color") {
                const a = readGroupArg(src, cmd.end);
                if (a) {
                    const col = resolveColor(a.content, ctx.colors);
                    const rest = src.substring(a.end);
                    out += `<span style="color:${col}">${transpile(rest, ctx)}</span>`;
                    return out;
                }
            }

            if (cmd.name === "addlinespace") {
                let j = cmd.end;
                if (src[j] === "[") {
                    const opt = readOptionalArg(src, j);
                    if (opt) j = opt.end;
                }
                i = j;
                continue;
            }

            // No-op commands
            if (["noindent", "indent", "par", "bigskip", "medskip", "smallskip",
                "newpage", "clearpage", "pagebreak", "nolinebreak", "linebreak",
                "sloppy", "fussy", "leavevmode", "ignorespaces",
                "centerline"].includes(cmd.name)) {
                i = cmd.end;
                continue;
            }

            // \today
            if (cmd.name === "today") {
                const d = new Date();
                out += d.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
                i = cmd.end;
                continue;
            }

            // FontAwesome icons
            if (ICONS[cmd.name]) {
                out += ICONS[cmd.name];
                i = cmd.end;
                continue;
            }

            // LaTeX/TeX logos
            if (cmd.name === "LaTeX") { out += "LaTeX"; i = cmd.end; continue; }
            if (cmd.name === "TeX") { out += "TeX"; i = cmd.end; continue; }
            if (cmd.name === "TeXmath") { out += "TeX"; i = cmd.end; continue; }
            if (cmd.name === "ldots" || cmd.name === "dots") { out += "…"; i = cmd.end; continue; }
            if (cmd.name === "textdegree") { out += "°"; i = cmd.end; continue; }
            if (cmd.name === "copyright") { out += "©"; i = cmd.end; continue; }
            if (cmd.name === "textregistered") { out += "®"; i = cmd.end; continue; }
            if (cmd.name === "texttrademark") { out += "™"; i = cmd.end; continue; }
            if (cmd.name === "pounds") { out += "£"; i = cmd.end; continue; }
            if (cmd.name === "S") { out += "§"; i = cmd.end; continue; }
            if (cmd.name === "P") { out += "¶"; i = cmd.end; continue; }
            if (cmd.name === "textbar") { out += "|"; i = cmd.end; continue; }
            if (cmd.name === "textbackslash") { out += "\\"; i = cmd.end; continue; }
            if (cmd.name === "textbullet") { out += "•"; i = cmd.end; continue; }
            if (cmd.name === "textasciitilde") { out += "~"; i = cmd.end; continue; }
            if (cmd.name === "textasciicircum") { out += "^"; i = cmd.end; continue; }
            if (cmd.name === "quad") { out += "\u2003"; i = cmd.end; continue; }
            if (cmd.name === "qquad") { out += "\u2003\u2003"; i = cmd.end; continue; }
            if (cmd.name === "enspace" || cmd.name === "thinspace") { out += "\u2009"; i = cmd.end; continue; }
            if (cmd.name === "hfill" || cmd.name === "vfill" || cmd.name === "hrulefill" || cmd.name === "dotfill") {
                i = cmd.end;
                continue;
            }

            // Graphic commands (best effort)
            if (cmd.name === "includegraphics") {
                // Skip optional
                let j = cmd.end;
                if (src[j] === "[") { const o = readOptionalArg(src, j); if (o) j = o.end; }
                const a = readGroupArg(src, j);
                if (a) {
                    const url = a.content.trim();
                    if (/^https?:|^data:/.test(url)) {
                        out += `<img src="${escapeHtml(url)}" class="max-w-full my-2" alt="" />`;
                    } else {
                        out += `<span class="text-slate-400 italic">[imagen: ${escapeHtml(url)}]</span>`;
                    }
                    i = a.end;
                    continue;
                }
            }

            // Unknown command — consume its optional/brace arg(s) silently.
            ctx.warnings.push(`Comando no soportado: \\${cmd.name}`);
            let j = cmd.end;
            while (src[j] === "[") {
                const o = readOptionalArg(src, j);
                if (!o) break;
                j = o.end;
            }
            // Consume at most 2 args to be safe
            let takenArgs = 0;
            while (takenArgs < 2 && src[j] === "{") {
                const g = readGroupArg(src, j);
                if (!g) break;
                j = g.end;
                takenArgs++;
            }
            i = j;
            continue;
        }

        if (c === "{") {
            const end = matchClose(src, i, "{", "}");
            if (end !== -1) {
                out += renderGroup(src.substring(i + 1, end), ctx);
                i = end + 1;
                continue;
            }
        }

        // Typographic ligatures
        if (c === "-" && src[i + 1] === "-" && src[i + 2] === "-") { out += "—"; i += 3; continue; }
        if (c === "-" && src[i + 1] === "-") { out += "–"; i += 2; continue; }
        if (c === "`" && src[i + 1] === "`") { out += "“"; i += 2; continue; }
        if (c === "'" && src[i + 1] === "'") { out += "”"; i += 2; continue; }
        if (c === "~") { out += "&nbsp;"; i++; continue; }

        // Inline math passthrough: $...$ — render as italic monospace for preview
        if (c === "$") {
            const end = src.indexOf("$", i + 1);
            if (end !== -1) {
                const math = src.substring(i + 1, end).trim();
                const normalizedMath = math.replace(/\s+/g, "");
                if (/^\^?\{?\\+circ\}?$/.test(normalizedMath)) {
                    out += "°";
                } else {
                    out += `<span class="italic font-serif">${escapeHtml(math)}</span>`;
                }
                i = end + 1;
                continue;
            }
        }

        out += escapeHtml(c);
        i++;
    }
    return out;
}

function lineOf(src: string, pos: number): number {
    let line = 1;
    for (let i = 0; i < pos && i < src.length; i++) {
        if (src[i] === "\n") line++;
    }
    return line;
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────
export function transpileLatexToHtml(
    rawSrc: string,
    opts: LatexTranspileOptions = {}
): LatexTranspileResult {
    const palette = { ...BASE_PALETTE, ...(opts.palette || {}) };
    const src = stripLatexComments(rawSrc);
    const colors = collectDefineColors(src, palette);
    const namedStyles = collectTcbsetStyles(src);
    const ctx: Ctx = { colors, namedStyles, warnings: [], errors: [] };

    let body = src;
    const docMatch = src.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
    if (docMatch) body = docMatch[1];

    const bodyHtml = renderParagraphs(body, ctx);

    const fontFamily = opts.fontFamily || '"Noto Sans","Helvetica Neue",Arial,sans-serif';
    const extraCss = opts.extraCss || "";

    const styles = `
        <style>
            .latex-doc { color:#0f172a; background:#fff; font-family:${fontFamily}; font-size:14px; line-height:1.55; }
            .latex-doc p { margin:0.6em 0; }
            .latex-doc h1,h2,h3,h4,h5,h6 { color:#0f172a; margin:0.8em 0 0.4em; }
            .latex-doc ul,ol { margin:0.4em 0; }
            .latex-doc table { border-collapse:collapse; }
            .latex-doc td,th { padding:0.3em 0.5em; vertical-align:top; }
            .latex-doc hr { opacity:0.35; }
            .latex-doc a { color:#4f46e5; text-decoration:underline; }
            .latex-doc code { background:rgba(15,23,42,0.06); padding:1px 4px; border-radius:3px; font-size:0.92em; }
            .latex-doc blockquote { color:#475569; }
            .latex-doc .text-left { text-align:left; }
            .latex-doc .text-center { text-align:center; }
            .latex-doc .text-right { text-align:right; }
            .latex-doc .text-xs { font-size:0.75rem; line-height:1rem; }
            .latex-doc .text-sm { font-size:0.875rem; line-height:1.25rem; }
            .latex-doc .text-base { font-size:1rem; line-height:1.5rem; }
            .latex-doc .text-lg { font-size:1.125rem; line-height:1.75rem; }
            .latex-doc .text-xl { font-size:1.25rem; line-height:1.75rem; }
            .latex-doc .text-2xl { font-size:1.5rem; line-height:2rem; }
            .latex-doc .text-3xl { font-size:1.875rem; line-height:2.25rem; }
            .latex-doc .text-4xl { font-size:2.25rem; line-height:2.5rem; }
            .latex-doc .text-\\[9px\\] { font-size:9px; }
            .latex-doc .text-\\[10px\\] { font-size:10px; }
            .latex-doc .leading-tight { line-height:1.25; }
            .latex-doc .leading-snug { line-height:1.375; }
            .latex-doc .font-sans { font-family:ui-sans-serif,system-ui,sans-serif; }
            .latex-doc .font-serif { font-family:ui-serif,Georgia,Cambria,"Times New Roman",Times,serif; }
            .latex-doc .font-mono { font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace; }
            .latex-doc .font-semibold { font-weight:600; }
            .latex-doc .font-bold { font-weight:700; }
            .latex-doc .italic { font-style:italic; }
            .latex-doc .underline { text-decoration:underline; }
            .latex-doc .text-indigo-600 { color:#4f46e5; }
            .latex-doc .text-slate-400 { color:#94a3b8; }
            .latex-doc .my-1 { margin-top:0.25rem; margin-bottom:0.25rem; }
            .latex-doc .my-2 { margin-top:0.5rem; margin-bottom:0.5rem; }
            .latex-doc .my-3 { margin-top:0.75rem; margin-bottom:0.75rem; }
            .latex-doc .my-4 { margin-top:1rem; margin-bottom:1rem; }
            .latex-doc .mb-2 { margin-bottom:0.5rem; }
            .latex-doc .p-1 { padding:0.25rem; }
            .latex-doc .p-3 { padding:0.75rem; }
            .latex-doc .px-1 { padding-left:0.25rem; padding-right:0.25rem; }
            .latex-doc .px-2 { padding-left:0.5rem; padding-right:0.5rem; }
            .latex-doc .px-6 { padding-left:1.5rem; padding-right:1.5rem; }
            .latex-doc .py-1 { padding-top:0.25rem; padding-bottom:0.25rem; }
            .latex-doc .pl-4 { padding-left:1rem; }
            .latex-doc .pl-6 { padding-left:1.5rem; }
            .latex-doc .block { display:block; }
            .latex-doc .inline-block { display:inline-block; }
            .latex-doc .flex { display:flex; }
            .latex-doc .grid { display:grid; }
            .latex-doc .gap-2 { gap:0.5rem; }
            .latex-doc .gap-3 { gap:0.75rem; }
            .latex-doc .w-full { width:100%; }
            .latex-doc .max-w-full { max-width:100%; }
            .latex-doc .border { border:1px solid #cbd5e1; }
            .latex-doc .border-collapse { border-collapse:collapse; }
            .latex-doc .border-l-4 { border-left-width:4px; border-left-style:solid; }
            .latex-doc .border-slate-300 { border-color:#cbd5e1; }
            .latex-doc .bg-slate-100 { background-color:#f1f5f9; }
            .latex-doc .rounded { border-radius:0.25rem; }
            .latex-doc .rounded-md { border-radius:0.375rem; }
            .latex-doc .overflow-x-auto { overflow-x:auto; }
            .latex-doc .align-top { vertical-align:top; }
            .latex-doc .list-disc { list-style-type:disc; }
            .latex-doc .list-decimal { list-style-type:decimal; }
            .latex-doc .space-y-1 > * + * { margin-top:0.25rem; }
            ${extraCss}
        </style>`.trim();

    const wrapper = `<div class="latex-doc" style="padding:2rem;max-width:920px;margin:0 auto">${bodyHtml}</div>`;

    if (opts.standalone) {
        const full = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" crossorigin="anonymous" />
${styles}
</head><body style="background:#e2e8f0;margin:0">
${wrapper}
</body></html>`;
        return { html: full, bodyHtml: wrapper, warnings: ctx.warnings, errors: ctx.errors, colors };
    }

    return {
        html: `${styles}${wrapper}`,
        bodyHtml: wrapper,
        warnings: ctx.warnings,
        errors: ctx.errors,
        colors,
    };
}
