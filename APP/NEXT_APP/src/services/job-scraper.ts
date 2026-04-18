import { JSDOM } from "jsdom";

const SOURCE_BY_DOMAIN = [
    { domain: "linkedin.com", source: "LINKEDIN" as const },
    { domain: "computrabajo.cl", source: "COMPUTRABAJO" as const },
    { domain: "computrabajo.com", source: "COMPUTRABAJO" as const },
    { domain: "laborum.cl", source: "LABORUM" as const },
    { domain: "laborum.com", source: "LABORUM" as const },
    { domain: "firstjob.me", source: "FIRSTJOB" as const },
    { domain: "chileempleos.cl", source: "CHILE_EMPLEOS" as const },
    { domain: "indeed.com", source: "INDEED" as const },
    { domain: "indeed.cl", source: "INDEED" as const },
    { domain: "getonbrd.com", source: "GETONBOARD" as const },
    { domain: "getonbrd.cl", source: "GETONBOARD" as const },
    { domain: "trabajando.com", source: "TRABAJANDO" as const },
    { domain: "chiletrabajos.cl", source: "CHILETRABAJOS" as const },
    { domain: "hireline.io", source: "HIRELINE" as const },
    { domain: "torre.ai", source: "TORRE" as const },
    { domain: "torre.co", source: "TORRE" as const },
    { domain: "workana.com", source: "WORKANA" as const },
    { domain: "trabajaenelestado.cl", source: "TRABAJA_ESTADO" as const },
    { domain: "bne.cl", source: "BNE" as const },
] as const;

const BLOCKED_HOST_EXACT = new Set([
    "localhost", "127.0.0.1", "0.0.0.0", "::1",
    "169.254.169.254", "metadata.google.internal", "100.100.100.200",
]);

const BLOCKED_HOST_PREFIX = [
    "10.", "172.16.", "172.17.", "172.18.", "172.19.", "172.20.", "172.21.", "172.22.",
    "172.23.", "172.24.", "172.25.", "172.26.", "172.27.", "172.28.", "172.29.",
    "172.30.", "172.31.", "192.168.", "fc00:", "fe80:",
];

const FETCH_TIMEOUT_MS = 20_000;
const MAX_HTML_SIZE = 2_000_000;

// Browser-like headers to reduce bot detection
const FETCH_HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "es-CL,es;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Upgrade-Insecure-Requests": "1",
};

export type SupportedJobSource =
    | "LINKEDIN" | "COMPUTRABAJO" | "LABORUM" | "FIRSTJOB" | "CHILE_EMPLEOS"
    | "INDEED" | "GETONBOARD" | "TRABAJANDO" | "CHILETRABAJOS" | "HIRELINE"
    | "TORRE" | "WORKANA" | "TRABAJA_ESTADO" | "BNE";

export type WorkMode = "ONSITE" | "HYBRID" | "REMOTE" | "UNSPECIFIED";

export type ScrapedVacancy = {
    source: SupportedJobSource;
    sourceUrl: string;
    sourceExternalId: string | null;
    title: string;
    company: string;
    location: string | null;
    workMode: WorkMode;
    description: string;
    metadata: Record<string, unknown>;
};

type SourceSelectors = {
    title: string[];
    company: string[];
    location: string[];
    description: string[];
    workMode?: string[];
};

const SOURCE_SELECTORS: Record<SupportedJobSource, SourceSelectors> = {
    LINKEDIN: {
        title: [
            "h1.top-card-layout__title",
            ".job-details-jobs-unified-top-card__job-title h1",
            "h1[data-testid='job-title']",
            "h1",
        ],
        company: [
            "a.topcard__org-name-link",
            ".job-details-jobs-unified-top-card__company-name a",
            ".job-details-jobs-unified-top-card__company-name",
            "[data-testid='job-details-top-card-company-name']",
        ],
        location: [
            "span.topcard__flavor--bullet",
            ".job-details-jobs-unified-top-card__bullet",
            ".job-details-jobs-unified-top-card__workplace-type",
        ],
        description: [
            ".show-more-less-html__markup",
            "#job-details",
            ".description__text",
            "[data-testid='job-details-show-more-less-button']",
        ],
        workMode: [".job-details-jobs-unified-top-card__workplace-type", ".topcard__flavor--bullet"],
    },
    COMPUTRABAJO: {
        title: ["h1.js-o-link", "h1", ".box_offer h1", "[itemprop='title']"],
        company: [
            "a.js-o-link.fc_base",
            "[itemprop='hiringOrganization'] [itemprop='name']",
            ".box_detail > p > a",
            ".box_offer h2",
        ],
        location: [
            "[itemprop='jobLocation'] [itemprop='name']",
            "p.mb10 span:first-child",
            ".i18n_location",
            ".box_offer p.fc_aux",
        ],
        description: [".box_detail", ".offer_description", "[itemprop='description']", "main"],
        workMode: [".js-tag-remote", ".tag-remote", "[data-testid='workMode']"],
    },
    LABORUM: {
        title: ["h1[data-testid='job-title']", "h1.job-title", "h1", "[itemprop='title']"],
        company: [
            "[data-testid='company-name']",
            "[itemprop='hiringOrganization'] [itemprop='name']",
            ".job-company",
            "h2",
        ],
        location: [
            "[data-testid='job-location']",
            "[itemprop='addressLocality']",
            ".job-location",
        ],
        description: [
            "[data-testid='job-description']",
            "[itemprop='description']",
            ".job-description",
            "main",
        ],
        workMode: ["[data-testid='work-mode']", ".work-modality", "[itemprop='employmentType']"],
    },
    FIRSTJOB: {
        title: ["h1.job-title", "h1", "[data-testid='job-title']", "[itemprop='title']"],
        company: [
            ".company-name",
            "[itemprop='hiringOrganization'] [itemprop='name']",
            "[data-testid='company-name']",
            "h2",
        ],
        location: [
            ".job-location",
            "[data-testid='job-location']",
            "[itemprop='addressLocality']",
            ".location",
        ],
        description: [".job-description", "[itemprop='description']", ".description", "main"],
        workMode: [".work-mode", ".modality", "[data-testid='work-mode']"],
    },
    CHILE_EMPLEOS: {
        title: [".aviso_titulo h1", "h1.titulo_oferta", "h1", ".titulo-cargo"],
        company: [
            ".empresa a",
            ".nombre_empresa",
            ".datos_empresa .empresa",
            ".empresa",
        ],
        location: [".ubicacion", ".ciudad", ".datos_oferta li:first-child", ".localidad"],
        description: [".detalle_oferta", ".descripcion_oferta", ".detalle-cargo", "main"],
        workMode: [".modalidad", ".tipo_trabajo"],
    },
    INDEED: {
        title: [
            "h1.jobsearch-JobInfoHeader-title",
            "[data-testid='jobsearch-JobInfoHeader-title'] span",
            "h1",
        ],
        company: [
            "[data-testid='inlineHeader-companyName'] a",
            "[data-testid='inlineHeader-companyName']",
            ".icl-u-lg-mr--sm a",
        ],
        location: [
            "[data-testid='job-location']",
            "[data-testid='inlineHeader-companyLocation']",
            ".jobsearch-JobInfoHeader-subtitle div:last-child",
        ],
        description: [
            "#jobDescriptionText",
            "[data-testid='jobsearch-jobDescriptionText']",
            ".jobsearch-jobDescriptionText",
        ],
        workMode: ["[data-testid='workplace-type']", ".remote-badge"],
    },
    GETONBOARD: {
        title: [
            "h1[data-ui='job-title']",
            "h1.job-card__title",
            "h1",
            "[itemprop='title']",
        ],
        company: [
            "[data-ui='company-name']",
            ".company-card__name",
            "a.company-card__name",
            "h2 a",
        ],
        location: [
            "[data-ui='job-location']",
            ".job-card__location",
            "[itemprop='addressLocality']",
        ],
        description: [
            "[data-ui='job-description']",
            ".job-card__description",
            "#job-description",
            "main",
        ],
        workMode: ["[data-ui='remote-modality']", ".job-card__remote", ".badge--remote"],
    },
    TRABAJANDO: {
        title: [".titulo-oferta h1", "h1.job-title", "h1", "[itemprop='title']"],
        company: [
            ".nombre-empresa a",
            ".company-name",
            "[itemprop='hiringOrganization'] [itemprop='name']",
            "h2",
        ],
        location: [
            ".ubicacion-oferta",
            ".job-location",
            "[itemprop='addressLocality']",
        ],
        description: [".descripcion-oferta", ".detalle-oferta", "[itemprop='description']", "main"],
        workMode: [".modalidad-trabajo", ".tipo-modalidad"],
    },
    CHILETRABAJOS: {
        title: [".titulo_aviso h1", "h1.job-title", "h1", "[itemprop='title']"],
        company: [
            ".nombre_empresa a",
            ".company-name",
            "[itemprop='hiringOrganization'] [itemprop='name']",
            "h2",
        ],
        location: [".ubicacion_aviso", ".ciudad", ".job-location"],
        description: [".descripcion_aviso", ".detalle-aviso", "[itemprop='description']", "main"],
        workMode: [".modalidad_trabajo", "[data-modalidad]"],
    },
    HIRELINE: {
        title: ["h1[data-testid='job-title']", "h1.job-title", "h1", "[itemprop='title']"],
        company: [
            "[data-testid='company-name']",
            "[itemprop='hiringOrganization'] [itemprop='name']",
            ".company-name",
            "h2",
        ],
        location: [
            "[data-testid='job-location']",
            "[itemprop='addressLocality']",
            ".job-location",
        ],
        description: ["[data-testid='job-description']", "[itemprop='description']", ".job-description", "main"],
        workMode: ["[data-testid='work-mode']", ".work-modality"],
    },
    TORRE: {
        title: [
            "h1.opportunity__title",
            "h1[data-qa='opportunity-title']",
            ".opportunity-header__title h1",
            "h1",
        ],
        company: [
            ".organization__name a",
            "[data-qa='organization-name']",
            ".opportunity-header__organization-name",
            "h2",
        ],
        location: [
            ".opportunity__location",
            "[data-qa='opportunity-location']",
            ".opportunity-header__location",
        ],
        description: [
            ".opportunity__description",
            "[data-qa='opportunity-description']",
            ".opportunity-body__description",
            "main",
        ],
        workMode: [".opportunity__remote-work", "[data-qa='remote-work']", ".badge--remote"],
    },
    WORKANA: {
        title: [
            "h1.project__title",
            "h1.job-title",
            "h1",
            "[itemprop='title']",
        ],
        company: [
            ".client__name",
            "[itemprop='hiringOrganization'] [itemprop='name']",
            ".company-name",
            "h2",
        ],
        location: [
            ".project__location",
            "[itemprop='addressLocality']",
            ".job-location",
        ],
        description: [
            ".project__description",
            "[itemprop='description']",
            "#project-description",
            "main",
        ],
        workMode: [".project__modality", ".modality-badge"],
    },
    TRABAJA_ESTADO: {
        title: [
            ".cargo-nombre h1",
            "h1.titulo-cargo",
            "h1",
            "[data-testid='job-title']",
        ],
        company: [
            ".nombre-servicio a",
            ".institution-name",
            ".organismo-nombre",
            "h2",
        ],
        location: [
            ".region-nombre",
            ".ciudad-nombre",
            "[itemprop='addressLocality']",
            ".job-location",
        ],
        description: [
            ".descripcion-cargo",
            ".detalle-concurso",
            ".job-description",
            "main",
        ],
        workMode: [".modalidad-trabajo"],
    },
    BNE: {
        title: [".oferta-titulo h1", "h1.job-title", "h1", "[itemprop='title']"],
        company: [
            ".empresa-nombre a",
            "[itemprop='hiringOrganization'] [itemprop='name']",
            ".company-name",
            "h2",
        ],
        location: [".oferta-ubicacion", ".ciudad", "[itemprop='addressLocality']"],
        description: [".oferta-descripcion", ".detalle-oferta", "[itemprop='description']", "main"],
        workMode: [".modalidad-trabajo"],
    },
};

// --- Torre public API ---
// Torre exposes a REST API for opportunities at torre.ai/api
type TorreOpportunity = {
    objective?: string;
    organizations?: Array<{ name?: string }>;
    locations?: Array<{ country?: string; city?: string; remote?: boolean }>;
    remote?: boolean;
    remote_any?: boolean;
    skills?: Array<{ name?: string }>;
};

async function fetchTorreApi(slug: string): Promise<TorreOpportunity | null> {
    const url = `https://torre.ai/api/opportunities/${slug}`;
    try {
        const res = await fetch(url, {
            headers: { ...FETCH_HEADERS, Accept: "application/json" },
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return null;
        return (await res.json()) as TorreOpportunity;
    } catch {
        return null;
    }
}

// --- workMode extraction ---
const REMOTE_KEYWORDS = [
    "100% remoto", "trabajo remoto", "remoto", "teletrabajo", "telecommute",
    "remote", "full remote", "100% remote", "work from home", "wfh",
    "trabajo desde casa", "desde tu casa",
];
const HYBRID_KEYWORDS = [
    "híbrido", "hibrido", "hybrid", "modalidad mixta", "modalidad híbrida",
    "presencial/remoto", "remoto/presencial", "parte remoto", "días remotos",
    "alternancia", "trabajo combinado",
];
const ONSITE_KEYWORDS = [
    "presencial", "100% presencial", "on-site", "onsite", "en oficina",
    "trabajo presencial", "in-office", "en el lugar",
];

function extractWorkMode(texts: (string | null | undefined)[]): WorkMode {
    const combined = texts
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    // Check hybrid first (before remote, to avoid "presencial/remoto" matching remote)
    if (HYBRID_KEYWORDS.some((k) =>
        combined.includes(k.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
    )) return "HYBRID";

    if (REMOTE_KEYWORDS.some((k) =>
        combined.includes(k.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
    )) return "REMOTE";

    if (ONSITE_KEYWORDS.some((k) =>
        combined.includes(k.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
    )) return "ONSITE";

    return "UNSPECIFIED";
}

function compactWhitespace(value: string, max = 25000): string {
    return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function isPrivateOrBlockedHostname(hostname: string): boolean {
    const host = hostname.toLowerCase();
    if (BLOCKED_HOST_EXACT.has(host)) return true;
    return BLOCKED_HOST_PREFIX.some((prefix) => host.startsWith(prefix));
}

function resolveSourceByHostname(hostname: string): SupportedJobSource | null {
    const host = hostname.toLowerCase();
    const match = SOURCE_BY_DOMAIN.find(
        ({ domain }) => host === domain || host.endsWith(`.${domain}`)
    );
    return match?.source || null;
}

function pickMeta(doc: Document, selector: string): string | null {
    const content = doc.querySelector(selector)?.getAttribute("content");
    if (!content) return null;
    const normalized = compactWhitespace(content, 2000);
    return normalized || null;
}

function extractTextFromNode(node: Element | null, max = 12000): string | null {
    if (!node) return null;
    const text = compactWhitespace(node.textContent || "", max);
    return text || null;
}

function pickFirstSelectorText(doc: Document, selectors: string[], max: number): string | null {
    for (const selector of selectors) {
        const value = extractTextFromNode(doc.querySelector(selector), max);
        if (value) return value;
    }
    return null;
}

function parseStructuredData(doc: Document): {
    title?: string;
    description?: string;
    company?: string;
    location?: string;
    workMode?: WorkMode;
} {
    const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));

    for (const script of scripts) {
        const raw = script.textContent?.trim();
        if (!raw) continue;

        try {
            const parsed = JSON.parse(raw) as unknown;
            const items = Array.isArray(parsed)
                ? parsed
                : typeof parsed === "object" && parsed !== null && "@graph" in parsed
                    ? ((parsed as { "@graph"?: unknown[] })["@graph"] || [])
                    : [parsed];

            for (const item of items) {
                if (!item || typeof item !== "object") continue;
                const data = item as Record<string, unknown>;
                const type = Array.isArray(data["@type"])
                    ? (data["@type"] as unknown[]).join(" ")
                    : String(data["@type"] || "");

                if (!type.toLowerCase().includes("jobposting")) continue;

                const hiringOrg = data.hiringOrganization as Record<string, unknown> | undefined;
                const jobLocation = data.jobLocation as Record<string, unknown> | Record<string, unknown>[] | undefined;
                const employerOverview = typeof data.jobLocationType === "string" ? data.jobLocationType : "";

                let location: string | undefined;
                if (Array.isArray(jobLocation)) {
                    const first = jobLocation[0] as Record<string, unknown> | undefined;
                    const address = first?.address as Record<string, unknown> | undefined;
                    location = address?.addressLocality ? String(address.addressLocality) : undefined;
                } else if (jobLocation) {
                    const address = jobLocation.address as Record<string, unknown> | undefined;
                    location = address?.addressLocality ? String(address.addressLocality) : undefined;
                }

                // jobLocationType: "TELECOMMUTE" = remote in schema.org
                let workMode: WorkMode | undefined;
                if (employerOverview.toUpperCase().includes("TELECOMMUTE")) {
                    workMode = "REMOTE";
                }

                return {
                    title: typeof data.title === "string" ? compactWhitespace(data.title, 260) : undefined,
                    description: typeof data.description === "string"
                        ? compactWhitespace(data.description, 20000)
                        : undefined,
                    company: hiringOrg?.name ? compactWhitespace(String(hiringOrg.name), 260) : undefined,
                    location: location ? compactWhitespace(location, 260) : undefined,
                    workMode,
                };
            }
        } catch {
            continue;
        }
    }

    return {};
}

function tryExtractCompanyFromTitle(title: string): string | null {
    const splitters = [" - ", " | ", " @ ", " en "];
    for (const splitter of splitters) {
        if (title.includes(splitter)) {
            const maybeCompany = title.split(splitter).slice(-1)[0]?.trim();
            if (maybeCompany && maybeCompany.length >= 2 && maybeCompany.length <= 120) {
                return maybeCompany;
            }
        }
    }
    return null;
}

function extractExternalId(url: URL): string | null {
    const pathSegments = url.pathname.split("/").filter(Boolean);
    if (pathSegments.length === 0) return null;

    const lastSegment = pathSegments[pathSegments.length - 1];
    const cleanSegment = lastSegment.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 180);
    if (cleanSegment.length >= 6) return cleanSegment;

    const queryId = url.searchParams.get("jk") || url.searchParams.get("id") || url.searchParams.get("jobId");
    if (queryId) return queryId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 180) || null;

    return null;
}

function parseHtml(html: string, source: SupportedJobSource): {
    title: string;
    company: string;
    location: string | null;
    workMode: WorkMode;
    description: string;
    metadata: Record<string, unknown>;
} {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const selectors = SOURCE_SELECTORS[source];

    const structured = parseStructuredData(doc);

    const rawTitle =
        structured.title ||
        pickFirstSelectorText(doc, selectors.title, 260) ||
        pickMeta(doc, 'meta[property="og:title"]') ||
        pickMeta(doc, 'meta[name="twitter:title"]') ||
        extractTextFromNode(doc.querySelector("h1"), 260) ||
        compactWhitespace(doc.title || "", 260);

    const rawDescription =
        structured.description ||
        pickFirstSelectorText(doc, selectors.description, 22000) ||
        pickMeta(doc, 'meta[property="og:description"]') ||
        pickMeta(doc, 'meta[name="description"]') ||
        extractTextFromNode(doc.querySelector("main"), 20000) ||
        extractTextFromNode(doc.querySelector("article"), 20000) ||
        extractTextFromNode(doc.body, 20000) ||
        "";

    const company =
        structured.company ||
        pickFirstSelectorText(doc, selectors.company, 260) ||
        pickMeta(doc, 'meta[property="og:site_name"]') ||
        tryExtractCompanyFromTitle(rawTitle) ||
        "Empresa no especificada";

    const location =
        structured.location ||
        pickFirstSelectorText(doc, selectors.location, 260) ||
        pickMeta(doc, 'meta[property="job:location"]') ||
        pickMeta(doc, 'meta[name="geo.placename"]') ||
        null;

    const title = compactWhitespace(rawTitle, 260);
    const description = compactWhitespace(rawDescription, 25000);

    if (!title || title.length < 3) throw new Error("INVALID_SCRAPED_TITLE");
    if (!description || description.length < 40) throw new Error("INVALID_SCRAPED_DESCRIPTION");

    // Extract workMode: structured data > DOM selectors > text analysis
    const workModeFromSelectors = selectors.workMode
        ? pickFirstSelectorText(doc, selectors.workMode, 100)
        : null;

    const workMode =
        structured.workMode ||
        extractWorkMode([workModeFromSelectors, title, location]) ||
        extractWorkMode([description]);

    return {
        title,
        company: compactWhitespace(company, 260),
        location: location ? compactWhitespace(location, 260) : null,
        workMode,
        description,
        metadata: {
            titleFromStructuredData: Boolean(structured.title),
            descriptionFromStructuredData: Boolean(structured.description),
            companyFromStructuredData: Boolean(structured.company),
            locationFromStructuredData: Boolean(structured.location),
            workModeFromStructuredData: Boolean(structured.workMode),
            sourceSelectorsApplied: source,
        },
    };
}

export function validateVacancyUrl(rawUrl: string): {
    valid: boolean;
    error?: string;
    source?: SupportedJobSource;
    url?: URL;
} {
    let parsed: URL;
    try {
        parsed = new URL(rawUrl);
    } catch {
        return { valid: false, error: "INVALID_URL" };
    }

    if (!["https:", "http:"].includes(parsed.protocol)) {
        return { valid: false, error: "INVALID_PROTOCOL" };
    }

    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
        return { valid: false, error: "HTTPS_REQUIRED" };
    }

    if (isPrivateOrBlockedHostname(parsed.hostname)) {
        return { valid: false, error: "BLOCKED_HOST" };
    }

    if (parsed.port && !["", "80", "443"].includes(parsed.port)) {
        return { valid: false, error: "NON_STANDARD_PORT" };
    }

    const source = resolveSourceByHostname(parsed.hostname);
    if (!source) return { valid: false, error: "UNSUPPORTED_SOURCE" };

    return { valid: true, source, url: parsed };
}

export async function scrapeVacancyFromUrl(rawUrl: string): Promise<ScrapedVacancy> {
    const validation = validateVacancyUrl(rawUrl);
    if (!validation.valid || !validation.url || !validation.source) {
        throw new Error(validation.error || "INVALID_URL");
    }

    const { url, source } = validation;
    const externalId = extractExternalId(url);

    // --- Torre: try official API first ---
    if (source === "TORRE" && externalId) {
        const api = await fetchTorreApi(externalId);
        if (api?.objective && api.objective.length >= 40) {
            const orgName = api.organizations?.[0]?.name || "Empresa no especificada";
            const locEntry = api.locations?.[0];
            const location = locEntry
                ? [locEntry.city, locEntry.country].filter(Boolean).join(", ")
                : null;

            let workMode: WorkMode = "UNSPECIFIED";
            if (api.remote === true || api.remote_any === true) workMode = "REMOTE";
            else if (locEntry?.remote === true) workMode = "REMOTE";
            else workMode = extractWorkMode([api.objective, location]);

            return {
                source,
                sourceUrl: url.toString(),
                sourceExternalId: externalId,
                title: compactWhitespace(api.objective || "", 260),
                company: compactWhitespace(orgName, 260),
                location: location ? compactWhitespace(location, 260) : null,
                workMode,
                description: compactWhitespace(api.objective || "", 25000),
                metadata: {
                    viaApi: true,
                    skills: api.skills?.map((s) => s.name).filter(Boolean).slice(0, 30),
                    scrapedAt: new Date().toISOString(),
                    hostname: url.hostname,
                },
            };
        }
    }

    // --- Generic HTML scraping ---
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(url.toString(), {
            method: "GET",
            redirect: "follow",
            signal: controller.signal,
            headers: FETCH_HEADERS,
        });

        if (!response.ok) throw new Error(`SCRAPE_HTTP_${response.status}`);

        const contentType = (response.headers.get("content-type") || "").toLowerCase();
        if (!contentType.includes("text/html")) throw new Error("SCRAPE_UNSUPPORTED_CONTENT_TYPE");

        const html = await response.text();
        if (html.length > MAX_HTML_SIZE) throw new Error("SCRAPE_HTML_TOO_LARGE");

        const parsed = parseHtml(html, source);

        return {
            source,
            sourceUrl: url.toString(),
            sourceExternalId: externalId,
            title: parsed.title,
            company: parsed.company,
            location: parsed.location,
            workMode: parsed.workMode,
            description: parsed.description,
            metadata: {
                ...parsed.metadata,
                scrapedAt: new Date().toISOString(),
                hostname: url.hostname,
            },
        };
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            throw new Error("SCRAPE_TIMEOUT");
        }
        if (error instanceof Error) throw error;
        throw new Error("SCRAPE_FAILED");
    } finally {
        clearTimeout(timeout);
    }
}
